import {
  DIFFICULTIES,
  TILE_SIZE,
  SOUND,
  CRYSTAL_PICKUP_RADIUS,
  LIFT_INTERACT_RADIUS,
  HUNTER_CONTACT_RADIUS,
  SPRINT_SOUND_INTERVAL_SECONDS,
} from './config.mjs';
import { generateCave } from './cave.mjs';
import { createPlayer, updatePlayer, collectCrystal } from './player.mjs';
import { createHunter, updateHunter, HUNTER_STATES } from './hunter.mjs';
import { createPulse, updatePulses, applyPulseReveal } from './sonar.mjs';
import { createSoundEvent } from './sound-events.mjs';
import { findPath } from './pathfinding.mjs';

const VALID_SCREENS = new Set(['title', 'tutorial', 'playing', 'paused', 'victory', 'defeat']);

export function createGameState() {
  return {
    screen: 'title',
    difficulty: 'descent',
    runId: 0,
    seed: null,
    lastResult: null,
  };
}

export function transition(state, event) {
  switch (event.type) {
    case 'START_TUTORIAL':
      if (state.screen !== 'title') return state;
      return { ...state, screen: 'tutorial' };

    case 'START':
      if (state.screen !== 'title' && state.screen !== 'tutorial') return state;
      return {
        ...state,
        screen: 'playing',
        difficulty: event.difficulty ?? state.difficulty,
        seed: event.seed ?? state.seed,
        runId: state.runId + 1,
      };

    case 'PAUSE':
      if (state.screen !== 'playing') return state;
      return { ...state, screen: 'paused' };

    case 'RESUME':
      if (state.screen !== 'paused') return state;
      return { ...state, screen: 'playing' };

    case 'WIN':
      if (state.screen !== 'playing') return state;
      return { ...state, screen: 'victory', lastResult: event.result ?? state.lastResult };

    case 'LOSE':
      if (state.screen !== 'playing') return state;
      return { ...state, screen: 'defeat', lastResult: event.result ?? state.lastResult };

    case 'RESTART':
      if (state.screen !== 'victory' && state.screen !== 'defeat') return state;
      return {
        ...state,
        screen: 'playing',
        seed: event.seed ?? null,
        runId: state.runId + 1,
      };

    case 'QUIT_TO_TITLE':
      if (state.screen === 'playing') return state;
      return { ...state, screen: 'title' };

    default:
      return state;
  }
}

export function isValidScreen(screen) {
  return VALID_SCREENS.has(screen);
}

function tileToWorld(tile) {
  return { x: (tile.x + 0.5) * TILE_SIZE, y: (tile.y + 0.5) * TILE_SIZE };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createRun({ difficulty, seed, cave: caveOverride }) {
  const preset = DIFFICULTIES[difficulty];
  if (!preset) throw new Error(`Unknown difficulty: ${difficulty}`);

  const cave = caveOverride ?? generateCave({ seed, difficulty });
  const player = createPlayer(tileToWorld(cave.lift));
  const hunter = createHunter(tileToWorld(cave.hunterSpawn));

  return {
    difficulty,
    preset,
    seed,
    cave,
    player,
    hunter,
    pulses: [],
    soundEvents: [],
    particles: [],
    revealMap: new Map(),
    remainingCrystals: cave.crystals.map((c, i) => ({ id: `crystal-${i}`, ...c })),
    quota: caveOverride ? cave.crystals.length : preset.quota,
    liftActive: false,
    sonarCooldownRemaining: 0,
    sprintSoundTimer: 0,
    elapsed: 0,
    outcome: null,
  };
}

function pruneSoundEvents(events, now) {
  return events.filter((e) => now - e.time <= SOUND.lifetimeSeconds);
}

export function updateRun(run, input, dt) {
  if (run.outcome) return run;

  const elapsed = run.elapsed + dt;
  let player = updatePlayer(run.player, input, run.cave, dt);

  const remainingCrystals = [];
  let soundEvents = run.soundEvents;
  for (const crystal of run.remainingCrystals) {
    const crystalWorld = tileToWorld(crystal);
    if (distance(player, crystalWorld) <= CRYSTAL_PICKUP_RADIUS) {
      player = collectCrystal(player);
      soundEvents = [...soundEvents, createSoundEvent(crystalWorld, SOUND.strengths.crystal, elapsed, 'crystal')];
    } else {
      remainingCrystals.push(crystal);
    }
  }

  let sonarCooldownRemaining = Math.max(0, run.sonarCooldownRemaining - dt);
  let pulses = run.pulses;
  if (input.sonarPressed && sonarCooldownRemaining <= 0) {
    pulses = [...pulses, createPulse({ x: player.x, y: player.y }, elapsed, run.preset.sonarMaxRadius)];
    soundEvents = [...soundEvents, createSoundEvent({ x: player.x, y: player.y }, SOUND.strengths.sonar, elapsed, 'sonar')];
    sonarCooldownRemaining = run.preset.sonarCooldownSeconds;
  }

  let sprintSoundTimer = run.sprintSoundTimer;
  if (player.sprinting && player.moving) {
    sprintSoundTimer -= dt;
    if (sprintSoundTimer <= 0) {
      soundEvents = [...soundEvents, createSoundEvent({ x: player.x, y: player.y }, SOUND.strengths.sprint, elapsed, 'sprint')];
      sprintSoundTimer = SPRINT_SOUND_INTERVAL_SECONDS;
    }
  } else {
    sprintSoundTimer = 0;
  }

  soundEvents = pruneSoundEvents(soundEvents, elapsed);
  pulses = updatePulses(pulses, dt);

  const revealMap = run.revealMap;
  const revealEntities = [
    { id: 'lift', ...tileToWorld(run.cave.lift) },
    { id: 'hunter', x: run.hunter.x, y: run.hunter.y },
    ...remainingCrystals.map((c) => ({ id: c.id, ...tileToWorld(c) })),
  ];
  for (const pulse of pulses) {
    applyPulseReveal(pulse, { cave: run.cave, revealMap, now: elapsed, entities: revealEntities });
  }

  const hunter = updateHunter(
    run.hunter,
    { cave: run.cave, player, soundEvents, now: elapsed, difficulty: run.preset, findPath },
    dt,
  );

  const liftActive = player.crystals >= run.quota;
  let outcome = null;
  let result = null;

  if (liftActive && distance(player, tileToWorld(run.cave.lift)) <= LIFT_INTERACT_RADIUS) {
    outcome = 'victory';
    result = { difficulty: run.difficulty, timeSeconds: elapsed, crystals: player.crystals };
  } else if (hunter.state === HUNTER_STATES.HUNTING && distance(player, hunter) <= HUNTER_CONTACT_RADIUS) {
    outcome = 'defeat';
    result = { difficulty: run.difficulty, timeSeconds: elapsed, crystals: player.crystals };
  }

  return {
    ...run,
    player,
    hunter,
    pulses,
    soundEvents,
    remainingCrystals,
    revealMap,
    liftActive,
    sonarCooldownRemaining,
    sprintSoundTimer,
    elapsed,
    outcome,
    result: result ?? run.result ?? null,
  };
}

export function disposeRun(run) {
  if (!run) return;
  run.revealMap?.clear();
  run.pulses.length = 0;
  run.soundEvents.length = 0;
  run.remainingCrystals.length = 0;
  run.particles.length = 0;
}

