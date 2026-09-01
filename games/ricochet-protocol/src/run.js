import { generateChamber, mulberry32 } from './chambers.js';
import { CONFIG } from './config.js';
import { UPGRADES } from './upgrades.js';

const SCORE_VALUES = Object.freeze({
  target: 100,
  shard: 150,
  switch: 100,
  guard: 200,
  destructible: 125
});

const HAZARD_TYPES = new Set(['hazard', 'guard', 'laser', 'barrier']);
const MEANINGFUL_TYPES = new Set(Object.keys(SCORE_VALUES));
const UPGRADE_IDS = Object.freeze(Object.keys(UPGRADES));
const CHAMBER_SEED_STEP = 0x9E3779B1;

function normalizeSeed(seed) {
  return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
}

function chamberSeed(seed, chamberNumber) {
  return (seed + Math.imul(chamberNumber - 1, CHAMBER_SEED_STEP)) >>> 0;
}

function difficultyFor(chamberNumber) {
  return Math.min(6, Math.max(1, Math.trunc(chamberNumber)));
}

function requiredTargetIds(chamber) {
  return chamber.nodes
    .filter((node) => node.required !== false)
    .map((node) => node.id);
}

function ownedUpgrades(state) {
  return Array.isArray(state.upgrades) ? state.upgrades : [];
}

function makeChamber(state, chamberNumber, upgrades = ownedUpgrades(state)) {
  return generateChamber(
    chamberSeed(state.seed, chamberNumber),
    difficultyFor(chamberNumber),
    upgrades
  );
}

function choicesFor(state) {
  const owned = new Set(ownedUpgrades(state));
  const candidates = UPGRADE_IDS.filter((id) => {
    if (UPGRADES[id].kind === 'instant') return true;
    return !owned.has(id);
  });
  const random = mulberry32((state.seed ^ Math.imul(state.chamberNumber, CHAMBER_SEED_STEP)) >>> 0);

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }

  return candidates.slice(0, 3);
}

function startNextChamber(state, upgrades = ownedUpgrades(state)) {
  const chamberNumber = state.chamberNumber + 1;
  if (chamberNumber >= CONFIG.wardenChamber) {
    return {
      ...state,
      phase: 'warden',
      chamberNumber: CONFIG.wardenChamber,
      upgrades: [...upgrades],
      upgradeChoices: [],
      shotHitIds: [],
      hazardActivations: [],
      phaseReturnAvailable: upgrades.includes('return')
    };
  }

  const chamber = makeChamber({ ...state, upgrades }, chamberNumber, upgrades);
  return {
    ...state,
    phase: 'aim',
    chamberNumber,
    chamber,
    remainingTargetIds: requiredTargetIds(chamber),
    upgrades: [...upgrades],
    upgradeChoices: [],
    shotHitIds: [],
    hazardActivations: [],
    phaseReturnAvailable: upgrades.includes('return')
  };
}

export function createRun(seed) {
  const normalizedSeed = normalizeSeed(seed);
  const initial = { seed: normalizedSeed, upgrades: [] };
  const chamber = makeChamber(initial, 1, []);

  return {
    seed: normalizedSeed,
    phase: 'aim',
    score: 0,
    combo: 0,
    integrity: CONFIG.maxIntegrity,
    energy: CONFIG.startingEnergy,
    chamberNumber: 1,
    chambersCleared: 0,
    chamber,
    remainingTargetIds: requiredTargetIds(chamber),
    upgrades: [],
    upgradeChoices: [],
    shotHitIds: [],
    hazardActivations: [],
    phaseReturnAvailable: false
  };
}

export function applyShotEvents(state, events) {
  if (state.phase === 'victory' || state.phase === 'defeat') return state;

  const eventList = Array.isArray(events) ? events : [];
  const hitIds = new Set();
  const hazardKeys = new Set();
  const remainingTargets = new Set(
    Array.isArray(state.remainingTargetIds)
      ? state.remainingTargetIds
      : requiredTargetIds(state.chamber)
  );
  const overchargeMultiplier = ownedUpgrades(state).includes('overcharge') ? 1.5 : 1;
  const orderedTargetIds = state.chamber?.ordered
    ? requiredTargetIds(state.chamber)
      .filter((id) => remainingTargets.has(id))
    : [];
  let expectedOrderedTarget = orderedTargetIds[0];
  let combo = 0;
  let score = state.score;
  let meaningful = false;

  for (const event of eventList) {
    if (!event || typeof event.id !== 'string' || event.id.length === 0 || hitIds.has(event.id)) {
      continue;
    }

    const acceptedTarget = event.type !== 'target'
      || remainingTargets.has(event.id)
        && (!state.chamber?.ordered || event.id === expectedOrderedTarget);
    if (!acceptedTarget) continue;

    hitIds.add(event.id);

    const meaningfulEvent = event.type === 'target'
      ? remainingTargets.has(event.id)
      : MEANINGFUL_TYPES.has(event.type);
    if (meaningfulEvent) meaningful = true;
    if (Object.hasOwn(SCORE_VALUES, event.type) && meaningfulEvent) {
      combo += 1;
      score += Math.round(SCORE_VALUES[event.type] * combo * overchargeMultiplier);
    }
    if (event.type === 'target') {
      remainingTargets.delete(event.id);
      if (state.chamber?.ordered) {
        expectedOrderedTarget = orderedTargetIds.find((id) => remainingTargets.has(id));
      }
    }
    if (HAZARD_TYPES.has(event.type)) hazardKeys.add(`${event.type}:${event.id}`);
  }

  let energy = state.energy;
  let phaseReturnAvailable = state.phaseReturnAvailable === true;
  if (!meaningful) {
    if (ownedUpgrades(state).includes('return') && phaseReturnAvailable) {
      phaseReturnAvailable = false;
    } else {
      energy = Math.max(0, energy - 1);
    }
  }

  const integrity = Math.max(0, state.integrity - hazardKeys.size);
  const cleared = remainingTargets.size === 0 && state.phase !== 'warden';
  const defeated = integrity === 0 || energy === 0;

  return {
    ...state,
    phase: defeated ? 'defeat' : cleared ? 'chamber-cleared' : state.phase === 'warden' ? 'warden' : 'aim',
    score,
    combo,
    integrity,
    energy,
    chambersCleared: cleared && state.phase !== 'chamber-cleared'
      ? state.chambersCleared + 1
      : state.chambersCleared,
    remainingTargetIds: [...remainingTargets],
    shotHitIds: [...hitIds],
    hazardActivations: [...hazardKeys],
    phaseReturnAvailable
  };
}

export function chooseUpgrade(state, id) {
  if (state.phase !== 'upgrade'
      || !Array.isArray(state.upgradeChoices)
      || !state.upgradeChoices.includes(id)
      || !Object.hasOwn(UPGRADES, id)) {
    return state;
  }

  const upgrade = UPGRADES[id];
  const upgrades = ownedUpgrades(state);
  if (upgrade.kind !== 'instant' && upgrades.includes(id)) return state;

  const nextUpgrades = upgrade.kind === 'instant' ? [...upgrades] : [...upgrades, id];
  const selected = {
    ...state,
    integrity: id === 'repair'
      ? Math.min(CONFIG.maxIntegrity, state.integrity + 1)
      : state.integrity,
    energy: id === 'overcharge' ? Math.max(1, state.energy - 1) : state.energy,
    upgrades: nextUpgrades
  };

  return startNextChamber(selected, nextUpgrades);
}

export function advanceRun(state) {
  if (state.phase === 'warden' && state.wardenDefeated === true) {
    return { ...state, phase: 'victory' };
  }
  if (state.phase !== 'chamber-cleared') return state;

  if (state.chamberNumber % CONFIG.upgradeInterval === 0) {
    return {
      ...state,
      phase: 'upgrade',
      upgradeChoices: choicesFor(state),
      shotHitIds: [],
      hazardActivations: []
    };
  }

  return startNextChamber(state);
}
