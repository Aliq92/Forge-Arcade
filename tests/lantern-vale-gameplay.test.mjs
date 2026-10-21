import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../games/lantern-vale/js/game.js';
import { ShrineManager } from '../games/lantern-vale/js/shrines.js';
import { World } from '../games/lantern-vale/js/world.js';
import { Player } from '../games/lantern-vale/js/player.js';
import { ParticleSystem } from '../games/lantern-vale/js/particles.js';
import { PlantManager } from '../games/lantern-vale/js/plants.js';
import { UI } from '../games/lantern-vale/js/ui.js';

function shrines() {
  const world = new World(42);
  const particles = new ParticleSystem();
  return new ShrineManager(world, particles, new PlantManager(world, particles));
}

test('compass selects the closest unlit shrine and gates the Heart', () => {
  const manager = shrines();
  const nearest = manager.shrines[3];
  assert.equal(manager.nearestUnactivated(nearest, Infinity), nearest);
  assert.notEqual(manager.nearestUnactivated(manager.heart, Infinity), manager.heart);
});

test('shrine activation cannot count twice or open the Heart early', () => {
  const manager = shrines();
  assert.equal(manager.activate(manager.heart), null);
  manager.activate(manager.shrines[0]);
  manager.activate(manager.shrines[0]);
  assert.equal(manager.activatedCount, 1);
  for (const shrine of manager.shrines.slice(1)) manager.activate(shrine);
  assert.equal(manager.world.gateOpen, true);
  assert.equal(manager.activate(manager.heart), 'heart');
});

test('a newly activated shrine restores lantern energy', () => {
  const manager = shrines();
  const game = Object.create(Game.prototype);
  game.player = new Player(0, 0);
  game.player.lantern.energy = 1;
  game.shrines = manager;
  game.stats = {};
  game.progress = {};
  game.input = { reset() {} };
  game.audio = { shrineActivate() {} };
  game.rng = () => 0.5;
  game._unlockAchievement = () => {};
  game.ui = { showUpgradeChoice() {} };
  game._activateShrine(manager.shrines[0]);
  assert.equal(game.player.lantern.energy, game.player.lantern.maxEnergy);
});

test('Escape resumes a paused journey', () => {
  const game = Object.create(Game.prototype);
  game.state = 'paused';
  game.settings = {};
  game._updateFps = () => {};
  game.input = { wantsPause: () => true, clearFrame() {}, reset() {} };
  game.ui = { showHUD() {} };
  game.update(0.016);
  assert.equal(game.state, 'playing');
});

test('pause help returns to the pause screen', () => {
  const ui = Object.create(UI.prototype);
  ui.game = { state: 'paused' };
  ui.screenStack = ['screen-pause'];
  let previous = false;
  let title = false;
  ui.showPrevious = () => { previous = true; };
  ui.show = () => { title = true; };
  ui._handleAction('back-title');
  assert.equal(previous, true);
  assert.equal(title, false);
});

test('Endless Wander has no shrine objective or compass target', () => {
  const game = Object.create(Game.prototype);
  game.mode = 'endless';
  game.shrines = shrines();
  game.player = new Player(0, 0);
  assert.equal(game._compassTarget(), null);
  assert.match(game._objectiveText(), /wander|explore/i);
});

test('particle density changes the number of emitted particles', () => {
  for (const [density, expected] of [[0.5, 5], [1, 10], [1.5, 15]]) {
    const particles = new ParticleSystem(30);
    particles.density = density;
    for (let i = 0; i < 10; i++) particles.spawn({ x: 1, y: 2 });
    assert.equal(particles.pool.filter(p => p.active).length, expected);
  }
});

test('reduced motion suppresses camera shake', () => {
  const game = Object.create(Game.prototype);
  game.settings = { screenShake: true, reducedMotion: true };
  game.shake = { time: 0, mag: 0 };
  game._triggerShake(1, 10);
  assert.equal(game.shake.time, 0);
});

test('Guiding Light increases hidden path detection distance', () => {
  const world = { objects: { moonflowers: [], lumenTrees: [], starMoss: [], emberReeds: [], hiddenPaths: [{ points: [{ x: 110, y: 0 }], discovered: false }] } };
  const plants = new PlantManager(world, new ParticleSystem());
  const player = new Player(0, 0);
  player.lantern.radius = 100;
  plants.update(0.01, player);
  assert.equal(plants.hiddenPathsFound, 0);
  player.guidingLight = 1;
  plants.update(0.01, player);
  assert.equal(plants.hiddenPathsFound, 1);
});
