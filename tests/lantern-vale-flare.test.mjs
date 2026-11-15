import test from 'node:test';
import assert from 'node:assert/strict';
import { Lantern } from '../games/lantern-vale/js/lantern.js';
import { Player } from '../games/lantern-vale/js/player.js';
import { Shadow, ShadowManager } from '../games/lantern-vale/js/shadows.js';
import { ParticleSystem } from '../games/lantern-vale/js/particles.js';
import { PlantManager } from '../games/lantern-vale/js/plants.js';
import { UPGRADE_POOL } from '../games/lantern-vale/js/config.js';
import { Game } from '../games/lantern-vale/js/game.js';
import { InputSystem } from '../games/lantern-vale/js/input.js';
import { loadProgress, saveProgress } from '../games/lantern-vale/js/storage.js';

const options = { inSafeZone: false, flickerEnabled: false, lastEmber: 0 };
const advance = (lantern, dt) => lantern.update(dt, options);

test('flare starts ready and activates without consuming shared lantern energy', () => {
  const lantern = new Lantern();
  assert.equal(lantern.flareState, 'READY');
  assert.equal(lantern.tryFlare(), true);
  assert.equal(lantern.flareState, 'ACTIVE');
  assert.equal(lantern.energy, 100);
  assert.equal(lantern.flareTimer, 0.55);
});

test('ten cooldown cycles succeed even with zero energy and obsolete zero charges', () => {
  const lantern = new Lantern();
  Object.assign(lantern, { energy: 0, flareCharges: 0, flareEnergy: 0 });
  for (let use = 1; use <= 10; use++) {
    assert.equal(lantern.tryFlare(), true, `activation ${use}`);
    assert.equal(lantern.tryFlare(), false);
    advance(lantern, lantern.flareDuration);
    assert.equal(lantern.flareState, 'COOLDOWN');
    assert.equal(lantern.flareCooldown, 5);
    advance(lantern, 4.9);
    assert.equal(lantern.tryFlare(), false);
    advance(lantern, 0.1);
    assert.equal(lantern.flareState, 'READY');
    assert.equal(lantern.flareCooldown, 0);
  }
});

test('rapid input cannot duplicate or extend an active flare or its cooldown', () => {
  const lantern = new Lantern();
  lantern.tryFlare();
  for (let n = 0; n < 100; n++) assert.equal(lantern.tryFlare(), false);
  assert.equal(lantern.flareTimer, 0.55);
  advance(lantern, 1.55);
  for (let n = 0; n < 100; n++) assert.equal(lantern.tryFlare(), false);
  assert.ok(Math.abs(lantern.flareCooldown - 4) < 1e-9);
  advance(lantern, 4);
  assert.equal(lantern.tryFlare(), true);
});

test('elapsed time crosses active and cooldown boundaries independently of frame rate', () => {
  for (const fps of [10, 20, 30, 60, 144]) {
    const lantern = new Lantern();
    lantern.tryFlare();
    for (let frame = 0; frame < fps * 5; frame++) advance(lantern, 1 / fps);
    assert.equal(lantern.flareState, 'COOLDOWN');
    assert.ok(Math.abs(lantern.flareCooldown - 0.55) < 1e-9, `${fps} FPS`);
    advance(lantern, 0.55);
    assert.equal(lantern.flareState, 'READY');
  }
});

test('flare retains illumination and radius upgrades at zero energy', () => {
  const player = new Player(500, 500);
  player.lantern.energy = 0;
  UPGRADE_POOL.find(u => u.id === 'bright_flare').apply(player);
  UPGRADE_POOL.find(u => u.id === 'quick_spark').apply(player);
  assert.equal(player.lantern.flareRadius, 320);
  assert.equal(player.lantern.flareCooldownMax, 4);
  player.lantern.tryFlare();
  advance(player.lantern, 0.01);
  assert.ok(player.lantern.radius > 300);
  advance(player.lantern, 0.54);
  assert.equal(player.lantern.flareCooldown, 4);
  advance(player.lantern, 4);
  assert.equal(player.lantern.flareState, 'READY');
});

test('flare still knocks back and stuns shadows inside its existing radius', () => {
  const world = { depthAt: () => 0, isSolid: () => false, pixelW: 1000, pixelH: 1000 };
  const particles = new ParticleSystem();
  const manager = new ShadowManager(world, particles, () => 0.5);
  manager.respawnTimer = 100;
  const player = new Player(500, 500);
  player.lantern.energy = 0;
  const near = new Shadow('shade', 700, 500);
  const far = new Shadow('shade', 800, 500);
  manager.list = [near, far];
  player.lantern.tryFlare();
  advance(player.lantern, 0.01);
  manager.update(0.01, player, [], true);
  assert.equal(near.stunTimer, 1.4);
  assert.equal(near.vx, 340);
  assert.equal(far.stunTimer, 0);
  assert.ok(particles.pool.some(p => p.active));
});

test('flare illumination still awakens plants and discovers paths without repeated particle bursts', () => {
  const world = { objects: {
    moonflowers: [{ x: 200, y: 0, awake: false }],
    lumenTrees: [{ x: 220, y: 0, discovered: false }],
    starMoss: [{ x: 200, y: 0, discovered: false }],
    hiddenPaths: [{ points: [{ x: 190, y: 0 }], discovered: false }],
    emberReeds: []
  } };
  const particles = new ParticleSystem();
  const plants = new PlantManager(world, particles);
  const player = new Player(0, 0);
  plants.update(0.01, player);
  assert.equal(plants.hiddenPathsFound, 0);
  player.lantern.tryFlare();
  advance(player.lantern, 0.01);
  plants.update(0.01, player);
  assert.equal(world.objects.moonflowers[0].awake, true);
  assert.equal(world.objects.lumenTrees[0].discovered, true);
  assert.equal(world.objects.starMoss[0].discovered, true);
  assert.equal(plants.hiddenPathsFound, 1);
  const emitted = particles.pool.filter(p => p.active).length;
  for (let n = 0; n < 10; n++) plants.update(0.01, player);
  assert.equal(particles.pool.filter(p => p.active).length, emitted);
  assert.equal(plants.hiddenPathsFound, 1);
});

// Keep simulation, input and lifecycle real; only replace browser rendering/audio.
function session(run) {
  const previous = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage };
  globalThis.window = new EventTarget();
  globalThis.document = {
    body: { classList: { contains: () => false } },
    createElement: () => ({ getContext: () => ({}) }),
    getElementById: () => ({ replaceChildren() {} })
  };
  const saves = new Map();
  globalThis.localStorage = { getItem: key => saves.get(key) ?? null, setItem: (key, value) => saves.set(key, value) };
  try {
    const game = Object.create(Game.prototype);
    game.settings = { particleDensity: 1, lanternFlicker: false, screenShake: false };
    game.progress = {};
    game.achievements = {};
    game.input = new InputSystem(null);
    game.audio = { flare() {}, fireflyPickup() {}, hurt() {} };
    game.ui = { stopTitleBg() {}, showHUD() {}, show() {}, setInteractPrompt() {}, showGameOver() {}, setBestJourney() {}, startTitleBg() {} };
    game.shake = { time: 0, mag: 0 };
    game._fpsAccum = game._fpsFrames = 0;
    game.startJourney('journey');
    run(game);
  } finally { Object.assign(globalThis, previous); }
}

test('pause freezes active and cooldown time; resume continues without duplicate activations', () => session(game => {
  game.input.pressedOnce.add(' ');
  game.update(0.01);
  assert.equal(game.stats.flares, 1);
  game.pauseToggle();
  for (let n = 0; n < 100; n++) game.update(0.1);
  assert.equal(game.player.lantern.flareTimer, 0.55);
  game.resume();
  game.update(0.55);
  assert.equal(game.player.lantern.flareCooldown, 5);
  game.pauseToggle();
  for (let n = 0; n < 100; n++) game.update(0.1);
  assert.equal(game.player.lantern.flareCooldown, 5);
  game.resume();
  game.update(5);
  assert.equal(game.player.lantern.flareState, 'READY');
  assert.equal(game.stats.flares, 1);
}));

test('real game loop keeps cooldown elapsed time at 10, 30, 60 and 144 FPS', () => session(game => {
  for (const fps of [10, 30, 60, 144]) {
    game.restartJourney();
    game.player.lantern.tryFlare();
    for (let n = 0; n < fps * 5; n++) game.update(1 / fps);
    assert.ok(Math.abs(game.player.lantern.flareCooldown - 0.55) < 1e-9, `${fps} FPS`);
    game.update(0.55);
    assert.equal(game.player.lantern.flareState, 'READY');
  }
}));

test('restart and new game reset active or cooling flare and discard queued input', () => session(game => {
  for (const start of [() => game.restartJourney(), () => game.startJourney('peaceful')]) {
    game.player.lantern.tryFlare();
    game.update(1);
    game.input.touch.flare = true;
    start();
    assert.equal(game.player.lantern.flareState, 'READY');
    assert.equal(game.player.lantern.flareTimer, 0);
    assert.equal(game.player.lantern.flareCooldown, 0);
    assert.equal(game.input.wantsFlare(), false);
    assert.equal(game.stats.flares, 0);
    game.update(0.01);
    assert.equal(game.player.lantern.flareState, 'READY');
  }
}));

test('game over and title freeze flare; retry and a subsequent journey are ready', () => session(game => {
  game.player.lantern.tryFlare();
  game.update(1);
  const cooldown = game.player.lantern.flareCooldown;
  game._triggerGameOver();
  game.input.touch.flare = true;
  game.update(20);
  assert.equal(game.player.lantern.flareCooldown, cooldown);
  game.restartJourney();
  assert.equal(game.player.lantern.flareState, 'READY');
  assert.equal(game.input.wantsFlare(), false);
  game.player.lantern.tryFlare();
  game.returnToTitle();
  game.update(20);
  assert.equal(game.player.lantern.flareTimer, 0.55);
  game.startJourney('deepnight');
  assert.equal(game.player.lantern.flareState, 'READY');
}));

test('old depleted-energy save fields cannot disable flare or erase unrelated records', () => session(game => {
  const old = { bestShrines: 4, victories: 2, totalFireflies: 123, energy: 0, flareEnergy: 0, flareCharges: 0 };
  localStorage.setItem('lv_progress', JSON.stringify(old));
  game.progress = loadProgress();
  game.startJourney('journey');
  assert.equal(game.player.lantern.flareState, 'READY');
  game.player.lantern.energy = 0;
  assert.equal(game.player.lantern.tryFlare(), true);
  saveProgress(game.progress);
  assert.deepEqual(JSON.parse(localStorage.getItem('lv_progress')), old);
}));
