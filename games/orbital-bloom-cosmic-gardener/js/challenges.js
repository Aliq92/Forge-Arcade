// Orbital Bloom - lightweight optional challenge mode (heuristic, no accounts/scores)
import { loadGardenProgress, saveGardenProgress, state, stats } from './config.js';
import { attractors } from './attractors.js';
import * as P from './particles.js';

export const CHALLENGES = {
  stableRing: {
    label: 'Stable Ring',
    description: 'Keep at least 55% of particles bound in orbit for 60 seconds.',
    duration: 60,
  },
  slingshot: {
    label: 'Slingshot',
    description: 'Guide a particle stream around the massive attractor and through the gold target zone.',
    duration: 0,
  },
  binaryBalance: {
    label: 'Binary Balance',
    description: 'Keep two attractors orbiting without merging for 45 seconds.',
    duration: 45,
  },
  discMaker: {
    label: 'Disc Maker',
    description: 'Reach 70% bound particles in a rotating disc.',
    duration: 0,
  },
};

// Garden Intentions are optional, low-pressure goals layered on top of the
// existing challenge mode.  They intentionally share no state with a running
// legacy challenge so either style of play can be used independently.
export const INTENTIONS = Object.freeze({
  stableOrbit: { label: 'Settle a wandering world', reward: 40 },
  moonGarden: { label: 'Give a world a moon', reward: 55 },
  temperateGlow: { label: 'Nurture a temperate world', reward: 70 },
  harmony: { label: 'Keep a peaceful garden', reward: 85 },
  transformation: { label: 'Make change into beauty', reward: 50 },
});

const INTENTION_TARGETS = Object.freeze({
  stableOrbit: summary => summary.stablePlanets,
  moonGarden: summary => summary.stableMoons,
  temperateGlow: summary => summary.temperatePlanets,
  harmony: summary => summary.harmoniousSeconds / 20,
  transformation: summary => summary.transformations,
});

const UNLOCK_THRESHOLDS = Object.freeze([
  { stardust: 80, unlock: 'oceanSeed' },
  { stardust: 160, unlock: 'ringSeed' },
  { stardust: 260, unlock: 'fineInfluence' },
]);
const REQUIRED_SEED_UNLOCKS = Object.freeze(['star', 'planet', 'moon']);

function finiteNonNegative(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeIntentionProgress(progress = {}) {
  const rewarded = progress.rewardedIntentions && typeof progress.rewardedIntentions === 'object'
    ? progress.rewardedIntentions
    : {};
  return {
    stardust: finiteNonNegative(progress.stardust),
    unlocks: [...new Set([
      ...REQUIRED_SEED_UNLOCKS,
      ...(Array.isArray(progress.unlocks) ? progress.unlocks.filter(key => typeof key === 'string') : []),
    ])],
    discoveries: Array.isArray(progress.discoveries) ? [...new Set(progress.discoveries.filter(key => typeof key === 'string'))] : [],
    rewardedIntentions: Object.fromEntries(
      Object.entries(rewarded)
        .filter(([key]) => Object.hasOwn(INTENTIONS, key))
        .map(([key, value]) => [key, value === true ? 1 : Math.floor(finiteNonNegative(value))])
        .filter(([, value]) => value > 0),
    ),
  };
}

function intentionProgress(id, summary) {
  const target = INTENTION_TARGETS[id];
  const value = target ? target(summary || {}) : 0;
  return Math.min(1, Math.max(0, finiteNonNegative(value)));
}

export function createIntentionController(initialProgress = {}) {
  const progress = normalizeIntentionProgress(initialProgress);
  const state = Object.fromEntries(Object.keys(INTENTIONS).map(id => [id, {
    progress: 0,
    status: 'open',
    // A persisted completion stays disarmed after a reload until the player
    // has moved the underlying condition back below the rearm threshold.
    armed: !progress.rewardedIntentions[id],
  }]));

  function update(summary, _dt) {
    for (const id of Object.keys(INTENTIONS)) {
      const record = state[id];
      record.progress = intentionProgress(id, summary);
      if (record.progress < 0.25) record.armed = true;
      record.status = record.progress >= 1 ? 'complete' : 'open';
    }
    return state;
  }

  function claim(id) {
    const record = state[id];
    const definition = INTENTIONS[id];
    if (!record || !definition || record.status !== 'complete' || !record.armed) return { reward: 0 };

    const reward = definition.reward;
    progress.stardust += reward;
    record.armed = false;
    progress.rewardedIntentions[id] = (progress.rewardedIntentions[id] || 0) + 1;
    return { reward };
  }

  return { state, progress, update, claim };
}

const intentionController = createIntentionController(loadGardenProgress());
export const intentionState = intentionController.state;

function unlockGardenProgress() {
  const newlyUnlocked = [];
  for (const { stardust, unlock } of UNLOCK_THRESHOLDS) {
    if (intentionController.progress.stardust >= stardust && !intentionController.progress.unlocks.includes(unlock)) {
      intentionController.progress.unlocks.push(unlock);
      newlyUnlocked.push(unlock);
    }
  }
  return newlyUnlocked;
}

export function evaluateIntentions(summary, dt) {
  return intentionController.update(summary, dt);
}

function persistRewardProgress(reward) {
  const newlyUnlocked = unlockGardenProgress();
  saveGardenProgress(intentionController.progress);
  return { reward, newlyUnlocked };
}

// Transformation outcomes use this narrow progression boundary instead of
// reaching into controller or storage state. Invalid awards are deliberately
// inert so observation code cannot create accidental writes.
export function awardGardenStardust(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return { reward: 0, newlyUnlocked: [] };
  intentionController.progress.stardust += amount;
  return persistRewardProgress(amount);
}

export function claimIntentionReward(id) {
  const result = intentionController.claim(id);
  if (result.reward <= 0) return result;
  return persistRewardProgress(result.reward);
}

export function getGardenProgress() {
  const progress = intentionController.progress;
  return {
    ...progress,
    unlocks: [...progress.unlocks],
    discoveries: [...progress.discoveries],
    rewardedIntentions: { ...progress.rewardedIntentions },
  };
}

export function recordDiscovery(key) {
  if (typeof key !== 'string' || !key || intentionController.progress.discoveries.includes(key)) return false;
  intentionController.progress.discoveries.push(key);
  saveGardenProgress(intentionController.progress);
  return true;
}

export const challengeState = {
  active: null, startTime: 0, elapsed: 0, progress: 0, status: 'idle',
  targetZone: null, initialDynamicCount: 0,
};

export function startChallenge(id) {
  if (!CHALLENGES[id]) return;
  challengeState.active = id;
  challengeState.startTime = stats.simTime;
  challengeState.elapsed = 0;
  challengeState.progress = 0;
  challengeState.status = 'running';
  challengeState.targetZone = id === 'slingshot' ? { x: 520, y: 90, r: 75 } : null;
  challengeState.initialDynamicCount = attractors.filter(a => !a.fixed).length;
  state.classificationOverlay = true;
}

export function stopChallenge() {
  challengeState.active = null;
  challengeState.status = 'idle';
}

export function updateChallenge() {
  if (!challengeState.active) return;
  const id = challengeState.active;
  const def = CHALLENGES[id];
  challengeState.elapsed = Math.max(0, stats.simTime - challengeState.startTime);

  if (id === 'stableRing') {
    let bound = 0;
    for (let i = 0; i < P.count; i++) if (P.pclass[i] === 0) bound++;
    const frac = P.count > 0 ? bound / P.count : 0;
    challengeState.progress = Math.min(challengeState.elapsed / def.duration, 1);
    if (frac < 0.55 && challengeState.elapsed > 4) challengeState.status = 'failed';
    else if (challengeState.elapsed >= def.duration) challengeState.status = 'success';
  } else if (id === 'binaryBalance') {
    challengeState.progress = Math.min(challengeState.elapsed / def.duration, 1);
    const dynCount = attractors.filter(a => !a.fixed).length;
    if (dynCount < Math.max(challengeState.initialDynamicCount - 1, 1)) challengeState.status = 'failed';
    else if (challengeState.elapsed >= def.duration) challengeState.status = 'success';
  } else if (id === 'slingshot') {
    const zone = challengeState.targetZone;
    let hit = false;
    for (let i = 0; i < P.count; i++) {
      const dx = P.px[i] - zone.x, dy = P.py[i] - zone.y;
      if (dx * dx + dy * dy < zone.r * zone.r) { hit = true; break; }
    }
    if (hit) { challengeState.progress = 1; challengeState.status = 'success'; }
  } else if (id === 'discMaker') {
    let bound = 0;
    for (let i = 0; i < P.count; i++) if (P.pclass[i] === 0) bound++;
    const frac = P.count > 0 ? bound / P.count : 0;
    challengeState.progress = Math.min(frac / 0.7, 1);
    if (frac >= 0.7) challengeState.status = 'success';
  }
}
