import { createAudio } from './audio.js';
import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { advanceBolt } from './physics.js';
import { render } from './render.js';
import { advanceRun, applyShotEvents, chooseUpgrade, createRun } from './run.js';
import { loadProfile, saveProfile } from './storage.js';
import { createUI } from './ui.js';
import { createWarden, updateWarden } from './warden.js';

const MAX_SHOT_TIME = 6;
const LASER_THICKNESS = 12;

export function createFixedStepper(fixedStep, maxSteps) {
  let accumulator = 0;
  return (elapsed, callback) => {
    accumulator += Math.max(0, Math.min(0.25, Number.isFinite(elapsed) ? elapsed : 0));
    let steps = 0;
    while (accumulator >= fixedStep && steps < maxSteps) {
      callback(fixedStep);
      accumulator -= fixedStep;
      steps += 1;
    }
    if (steps === maxSteps) accumulator %= fixedStep;
    return steps;
  };
}

export function adaptWardenImpacts(events, shotSequence) {
  return (events ?? [])
    .filter((event) => event?.type === 'weak-point' && typeof event.id === 'string')
    .map((event) => ({
      type: 'weak-point', id: `shot-${shotSequence}:${event.id}`, damage: 1
    }));
}

export function laserHitsBolt(laser, bolt) {
  if (laser?.type !== 'laser' || !bolt?.position) return false;
  const { x, y } = bolt.position;
  const progress = Math.max(0, Math.min(1, laser.progress));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (laser.orientation === 'horizontal') {
    const beamX = 16 + progress * 358;
    return Math.abs(x - beamX) <= LASER_THICKNESS;
  }
  if (laser.direction === 'top-left-to-bottom-right') {
    const offset = (progress * 2 - 1) * 390;
    return Math.abs((y - x) - offset) / Math.SQRT2 <= LASER_THICKNESS;
  }
  const offset = progress * 780;
  return Math.abs((x + y) - offset) / Math.SQRT2 <= LASER_THICKNESS;
}

function movingBarrier(barrier, time) {
  const phase = Number.isFinite(barrier.phase) ? barrier.phase * Math.PI * 2 : 0;
  const offset = Math.sin(time * (barrier.speed ?? 0) / 30 + phase) * (barrier.travel ?? 0);
  return barrier.axis === 'x' ? { ...barrier, x: barrier.x + offset } : { ...barrier, y: barrier.y + offset };
}

function chamberColliders(run, time) {
  const chamber = run.chamber;
  if (!chamber) return [];
  const remaining = new Set(run.remainingTargetIds ?? []);
  return [
    ...chamber.walls.map((item) => ({ ...item, type: 'wall' })),
    ...chamber.nodes.filter((item) => remaining.has(item.id)),
    ...chamber.shards,
    ...chamber.shields,
    ...chamber.lasers.filter((item) => item.active !== false),
    ...chamber.barriers.map((item) => movingBarrier(item, time))
  ];
}

function wardenColliders(frame) {
  const center = { x: 195, y: 375 };
  const colliders = [
    { id: 'wall-top', type: 'wall', x: 0, y: 72, w: 390, h: 16 },
    { id: 'wall-right', type: 'wall', x: 374, y: 72, w: 16, h: 756 },
    { id: 'wall-bottom', type: 'wall', x: 0, y: 812, w: 390, h: 16 },
    { id: 'wall-left', type: 'wall', x: 0, y: 72, w: 16, h: 756 }
  ];
  for (const shield of frame?.shields ?? []) {
    const x = center.x + Math.cos(shield.angle) * shield.orbitRadius;
    const y = center.y + Math.sin(shield.angle) * shield.orbitRadius;
    colliders.push({ id: shield.id, type: 'wall', x: x - 22, y: y - 5, w: 44, h: 10 });
  }
  for (const weak of frame?.weakPoints ?? []) {
    const x = center.x + Math.cos(weak.angle) * 54;
    const y = center.y + Math.sin(weak.angle) * 54;
    colliders.push({ id: weak.id, type: weak.open ? 'weak-point' : 'wall', x: x - weak.radius, y: y - weak.radius, w: weak.radius * 2, h: weak.radius * 2 });
  }
  return colliders;
}

export function createGame(doc = document, host = globalThis) {
  const canvas = doc.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const storage = host.localStorage;
  let profile = loadProfile(storage);
  let run = createRun(Date.now());
  let wardenState = null;
  let wardenFrame = null;
  let bolt = null;
  let aim = null;
  let shotTime = 0;
  let shotSequence = 0;
  let shotEvents = [];
  let hitSweepIds = new Set();
  let paused = false;
  let worldTime = 0;
  let lastTimestamp = null;
  const audio = createAudio(profile);

  const ui = createUI(doc, {
    togglePause() { paused = !paused; sync(); },
    restart() { restart(); },
    toggleMusic() { profile.musicMuted = !profile.musicMuted; audio.setMusicMuted(profile.musicMuted); persist(); sync(); },
    toggleEffects() { profile.effectsMuted = !profile.effectsMuted; audio.setEffectsMuted(profile.effectsMuted); persist(); sync(); },
    chooseUpgrade(id) {
      run = chooseUpgrade(run, id);
      if (run.phase === 'warden') enterWarden();
      sync();
    }
  });

  const input = createInput(canvas, (action) => {
    if (action.type === 'aim') aim = action.aim;
    if (action.type === 'fire' && action.aim) launch(action.aim);
  });

  function persist() {
    profile.bestScore = Math.max(profile.bestScore, run.score);
    saveProfile(storage, profile);
  }

  function enterWarden() {
    wardenState ??= createWarden();
    wardenFrame = updateWarden(wardenState, [], 0);
    wardenState = wardenFrame.state;
  }

  function launch(nextAim) {
    if (bolt || paused || (run.phase !== 'aim' && run.phase !== 'warden')) return;
    const spawn = run.chamber?.spawn ?? { x: 195, y: 770 };
    bolt = { position: { ...spawn }, velocity: { ...nextAim.velocity } };
    aim = null;
    shotTime = 0;
    shotEvents = [];
    hitSweepIds = new Set();
    shotSequence += 1;
    audio.play('launch');
    sync();
  }

  function finishShot() {
    const weakImpacts = adaptWardenImpacts(shotEvents, shotSequence);
    const runEvents = shotEvents
      .filter((event) => event.type !== 'weak-point' && event.type !== 'shield');
    if (weakImpacts.length) {
      runEvents.push(...weakImpacts.map((event) => ({ type: 'switch', id: event.id })));
      wardenFrame = updateWarden(wardenState, weakImpacts, 0);
      wardenState = wardenFrame.state;
      if (wardenFrame.victory) run = { ...run, wardenDefeated: true };
    }
    run = applyShotEvents(run, runEvents);
    if (run.wardenDefeated) run = advanceRun(run);
    if (run.phase === 'chamber-cleared') run = advanceRun(run);
    if (run.phase === 'warden') enterWarden();
    bolt = null;
    shotEvents = [];
    persist();
    sync();
  }

  function simulate(dt) {
    if (paused || ui.isBlocking()) return;
    worldTime += dt;
    if (run.phase === 'warden') {
      enterWarden();
      wardenFrame = updateWarden(wardenState, [], dt);
      wardenState = wardenFrame.state;
    }
    if (!bolt) return;

    const colliders = run.phase === 'warden'
      ? wardenColliders(wardenFrame)
      : chamberColliders(run, worldTime);
    const frame = advanceBolt(bolt, colliders, dt);
    if (frame.invalid) {
      bolt = null;
      shotEvents = [];
      sync();
      return;
    }
    bolt = frame.bolt;
    shotEvents.push(...frame.events);
    if (run.phase !== 'warden' && frame.events.some((event) => event.type === 'shield')
        && !run.upgrades.includes('pierce')) {
      finishShot();
      return;
    }
    for (const laser of wardenFrame?.lasers ?? []) {
      if (laserHitsBolt(laser, bolt) && !hitSweepIds.has(laser.sweepId)) {
        hitSweepIds.add(laser.sweepId);
        shotEvents.push({ type: 'laser', id: laser.sweepId });
        audio.play('damage');
      }
    }
    shotTime += dt;
    if (shotTime >= MAX_SHOT_TIME) finishShot();
  }

  function sync() {
    const inputPhase = bolt ? 'shot' : run.phase === 'warden' ? 'aim' : run.phase;
    input.setPhase(inputPhase);
    input.setBlocked(paused || ui.isBlocking());
    ui.update(run, profile, paused);
  }

  function restart() {
    run = createRun(Date.now());
    wardenState = null;
    wardenFrame = null;
    bolt = null;
    aim = null;
    paused = false;
    sync();
  }

  const stepper = createFixedStepper(CONFIG.fixedStep, 8);
  function loop(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    stepper((timestamp - lastTimestamp) / 1000, simulate);
    lastTimestamp = timestamp;
    render(ctx, { run, bolt, aim, warden: wardenFrame }, {
      reducedEffects: profile.reducedEffects,
      cosmetic: profile.cosmetics?.includes('gold') ? 'gold' : 'cyan'
    });
    host.requestAnimationFrame(loop);
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) { paused = true; sync(); }
  });
  sync();
  host.requestAnimationFrame(loop);
  return { get state() { return { run, bolt, paused, warden: wardenFrame }; }, restart };
}

if (typeof document !== 'undefined' && document.getElementById('game-canvas')) {
  createGame(document, globalThis);
}
