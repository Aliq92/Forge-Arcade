const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./harness.cjs');

function arena() {
  const { sandbox } = harness();
  const art = new sandbox.MoltPresentation();
  const player = { x: 50, y: 50, vx: 0, vy: 0, mass: 22 };
  return { art, player, npcs: [], state: 'playing', moltRemaining: 0 };
}

test('molt reveal follows the gameplay countdown, emits once and resets cleanly', () => {
  const world = arena();
  const { art, player } = world;
  art.molt(player, 16, 0);
  world.state = 'molting';
  world.moltRemaining = 1.7;
  art.advance(1 / 60, world);
  assert.equal(art.moltProgress(world), 0);
  assert.equal(art.pool.active.length, 0);
  world.moltRemaining = .55;
  art.advance(1 / 60, world);
  assert.ok(art.moltProgress(world) > .6);
  const count = art.pool.active.length;
  assert.ok(count > 0 && count <= 12);
  art.advance(1 / 60, world);
  assert.equal(art.pool.active.length, count);
  art.clear();
  assert.equal(art.pool.active.length, 0);
  assert.equal(art.shells.length, 0);
  art.molt(player, 20, 1);
  world.moltRemaining = .55;
  art.advance(1 / 60, world);
  assert.equal(art.pool.active.length, count);
});

test('visual steering is comparable at 30 and 120 Hz and wall compression releases', () => {
  function simulate(hz) {
    const { art, player } = arena();
    const step = 1 / hz;
    art.pose(player, step);
    player.vx = 96;
    for (let i = 0; i < hz / 2; i++) {
      player.x += player.vx * step;
      art.pose(player, step);
    }
    const moving = art.poses.get(player);
    assert.ok(moving.move > .9);
    assert.ok(moving.bump < .01);
    for (let i = 0; i < hz / 2; i++) art.pose(player, step);
    assert.ok(moving.bump > .9);
    player.vx = 0;
    for (let i = 0; i < hz / 2; i++) art.pose(player, step);
    assert.ok(moving.bump < .04);
    return moving.lookX;
  }
  assert.ok(Math.abs(simulate(30) - simulate(120)) < .01);
});

test('reduced motion keeps the reveal and suppresses moving completion accents', () => {
  const world = arena();
  const { art, player } = world;
  art.reduced = true;
  art.molt(player, 16, 0);
  world.state = 'molting';
  world.moltRemaining = .55;
  art.advance(1 / 60, world);
  assert.ok(art.moltProgress(world) > .6);
  assert.equal(art.pool.active.length, 0);
  assert.equal(art.shells.length, 1);
});


test('overlapping threshold checks shed one outer layer and reveal the newest form', () => {
  const world = arena();
  const { art, player } = world;
  const drawn = [];
  art.creature = (...args) => drawn.push({ stage: args[4], mood: args[8] });
  art.molt(player, 16, 0);
  art.molt(player, 20, 1);
  assert.equal(art.shells.length, 1);

  world.state = 'molting';
  world.moltRemaining = 1.4;
  art.advance(1 / 60, world);
  art.drawPlayer(null, player, 24, 2, 0, world, art.poses.get(player));
  world.state = 'paused';
  art.drawPlayer(null, player, 24, 2, 0, world, art.poses.get(player));
  world.state = 'molting';
  world.moltRemaining = .7;
  art.advance(1 / 60, world);
  art.drawPlayer(null, player, 24, 2, 0, world, art.poses.get(player));

  assert.deepEqual(drawn, [
    { stage: 0, mood: 'focus' },
    { stage: 0, mood: 'focus' },
    { stage: 2, mood: 'happy' },
  ]);
});

test('a fatal encounter during a pending molt clears its banner before retry', () => {
  const { api, elements } = harness(false, 42);
  api.start();
  api.get().player.mass = 42;
  api.checkMolt();
  const banner = elements.get('moltBanner');
  assert.ok(banner.classList.contains('show'));
  api.get().player.hasSecondWind = false;
  api.die('eaten');
  api.frame(1000 / 60);
  assert.equal(api.get().state, 'dead');
  assert.equal(banner.classList.contains('show'), false);
  api.next();
  assert.equal(banner.classList.contains('show'), false);
});

test('the existing 1.7-second molt expires without a delayed screen shake', () => {
  const { api, sandbox } = harness(false, 42);
  api.start();
  api.get().player.mass = 42;
  api.checkMolt();
  for (let frame = 1; frame <= 100; frame++) api.frame(frame * 1000 / 60);
  assert.equal(api.get().state, 'molting');
  for (let frame = 101; frame <= 103; frame++) api.frame(frame * 1000 / 60);
  assert.equal(api.get().state, 'playing');
  assert.equal(sandbox.moltDebug.inspect().shakeMag, 0);
});
