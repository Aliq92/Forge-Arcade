import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../renderer.js';

function fixture(width = 1280, height = 800) {
  const calls = [];
  const styles = [];
  const context = new Proxy({}, { get(object, key) {
    if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return object[key] ?? ((...args) => calls.push([key, ...args]));
  }, set(object, key, value) { object[key] = value; if (key === 'fillStyle' || key === 'strokeStyle') styles.push(value); return true; } });
  const canvas = { width, height, getBoundingClientRect: () => ({ width, height }), getContext: () => context };
  canvas.ownerDocument = { createElement: () => ({ getContext: () => context }) };
  const renderer = new Renderer(canvas);
  const game = { time: 0, stage: 1, player: { angle: .4, shields: 3, maxShields: 3, recovery: 0, attack: null }, targets: [], boss: null };
  return { renderer, game, calls, styles, canvas };
}

test('projection round trips and clearviewport fitting across desktop/portrait/landscape', () => {
  for (const [w, h] of [[1280, 800], [390, 844], [360, 640], [844, 390], [1920, 1080]]) {
    const { renderer: r } = fixture(w, h);
    for (const angle of [-2.7, -1, 0, 1.8, 3]) {
      const point = r.screen(angle, 200);
      assert.ok(Math.abs(r.angle(point.x, point.y) - angle) < 1e-10);
    }
    assert.ok(r.center.x - 280 * r.scale >= 0);
    assert.ok(r.center.x + 280 * r.scale <= w);
    assert.ok(r.center.y - 280 * r.scale >= r.metrics.safeTop);
    assert.ok(r.center.y + 280 * r.scale <= h - r.metrics.safeBottom);
  }
});

test('draw and feedback preserve frozen Game and events', () => {
  const { renderer, game } = fixture();
  game.targets = ['spark', 'drifter', 'bulwark', 'splinter'].map((type, id) => Object.freeze({ id, type, angle: id, r: 90 + id * 30, speed: 40, hp: 1, maxHp: 2, cracked: true, child: id === 3 }));
  game.boss = Object.freeze({ hp: 9, maxHp: 18, phase: 2, angle: 1, r: 104, vulnerable: true, telegraph: false });
  Object.freeze(game.targets); Object.freeze(game.player); Object.freeze(game);
  const before = JSON.stringify(game), events = Object.freeze([Object.freeze({ type: 'perfect', angle: 1, r: 86 })]);
  renderer.feedback(events); renderer.draw(game, { time: 1 });
  assert.equal(JSON.stringify(game), before); assert.equal(renderer.metrics.drawnTargets, 4);
});

test('particle pool and pending event queue remain capped; low/reduced trim immediately', () => {
  const { renderer, game } = fixture();
  const pool = renderer.pool;
  renderer.feedback(Array.from({ length: 10000 }, () => ({ type: 'perfect' })));
  assert.equal(renderer.pending.length, 128);
  renderer.draw(game, { time: 0 });
  assert.equal(renderer.metrics.particles, 320);
  renderer.draw(game, { time: .01, quality: 'low' });
  assert.equal(renderer.metrics.particles, 80);
  renderer.draw(game, { time: .02, reduced: true });
  assert.equal(renderer.metrics.particles, 0); assert.equal(renderer.labels.length, 0);
  assert.equal(renderer.pool, pool); assert.equal(pool.length, 320);
});

test('five distinct cache evolutions only rebuild on changes', () => {
  const { renderer, game, calls } = fixture();
  const counts = [];
  for (let stage = 1; stage <= 5; stage++) {
    game.stage = stage; calls.length = 0;
    renderer.draw(game, { time: 0, reduced: true }); counts.push(calls.length);
  }
  assert.equal(renderer.metrics.cacheBuilds, 5);
  assert.equal(new Set(counts).size, 5);
  renderer.draw(game, { time: 1 }); assert.equal(renderer.metrics.cacheBuilds, 5);
  renderer.resize(); renderer.draw(game); assert.equal(renderer.metrics.cacheBuilds, 6);
});

test('attack uses supplied arc/reach and phase/telegraph/core presentation follows boss', () => {
  const { renderer, game, calls } = fixture();
  game.player.attack = { angle: .8, remaining: .1, arc: 1.1, reach: 147 };
  renderer.draw(game);
  assert.ok(calls.some(([method, , , radius, a, b]) => method === 'arc' && radius === 147 && a === -.55 && b === .55));
  for (const [phase, vulnerable, telegraph, r, label] of [[1, false, false, 240, 'SEALED'], [2, false, true, 240, 'INCOMING'], [3, true, false, 104, 'OPEN']]) {
    calls.length = 0; game.boss = { hp: 12, maxHp: 18, phase, angle: 0, r, vulnerable, telegraph };
    renderer.draw(game, { time: 2, reduced: true });
    assert.ok(calls.some(([method, text]) => method === 'fillText' && text === `P${phase} ${label}`));
    assert.ok(calls.some(([method, x, y]) => method === 'translate' && x === r && y === 0));
  }
});

test('hit fragments carry multiple hues and Perfect, combo and boss defeat are larger celebrations', () => {
  const burst = type => {
    const { renderer, game } = fixture();
    renderer.feedback([{ type, angle: .5, r: 86, targetType: 'spark', value: 10 }]);
    renderer.draw(game, { time: 0 });
    return renderer.pool.filter(p => p.life > 0);
  };
  const hit = burst('hit');
  assert.ok(new Set(hit.map(p => p.color)).size >= 4);
  for (const type of ['perfect', 'combo', 'bossDefeat']) {
    const particles = burst(type);
    assert.ok(particles.length > hit.length, type);
    assert.ok(Math.max(...particles.map(p => Math.hypot(p.vx, p.vy))) > Math.max(...hit.map(p => Math.hypot(p.vx, p.vy))), type);
  }
});

test('shockwaves are pooled, bounded and immediately cleared by reduced motion', () => {
  const { renderer, game } = fixture();
  renderer.feedback(Array.from({ length: 128 }, () => ({ type: 'perfect', r: 86 })));
  renderer.draw(game, { time: 0 });
  assert.equal(renderer.metrics.shockwaves, 8);
  const pool = renderer.shockwaves, identities = [...pool];
  renderer.draw(game, { time: .01, quality: 'low' });
  assert.equal(renderer.metrics.shockwaves, 3);
  renderer.feedback([{ type: 'bossDefeat' }, { type: 'level', value: 10 }]);
  renderer.draw(game, { time: .02, reduced: true });
  assert.equal(renderer.metrics.shockwaves, 0);
  assert.equal(renderer.metrics.particles, 0);
  assert.equal(renderer.labels.length, 0);
  for (let frame = 1; frame <= 30; frame++) renderer.draw(game, { time: 1 + frame / 60 });
  renderer.feedback([{ type: 'bossDefeat' }]); renderer.draw(game, { time: 2 });
  assert.ok(renderer.metrics.shockwaves > 0);
  assert.equal(renderer.shockwaves, pool);
  renderer.shockwaves.forEach((ring, index) => assert.equal(ring, identities[index]));
});

test('endless level tint changes slowly and reuses a single static canvas', () => {
  const { renderer, game, styles } = fixture();
  game.stage = 5; game.waveNumber = 1;
  renderer.draw(game, { time: 0 });
  const firstStyles = new Set(styles);
  const canvas = renderer._arenaCanvas, firstTint = renderer.metrics.tint;
  for (let i = 1; i <= 100; i++) renderer.draw(game, { time: i / 60 });
  game.waveNumber = 2; renderer.draw(game);
  assert.equal(renderer.metrics.cacheBuilds, 1);
  styles.length = 0; game.waveNumber = 4; renderer.draw(game);
  assert.notEqual(renderer.metrics.tint, firstTint);
  assert.ok(styles.some(style => !firstStyles.has(style)));
  assert.equal(renderer.metrics.cacheBuilds, 2);
  game.waveNumber = 403; renderer.draw(game);
  assert.equal(renderer._arenaCanvas, canvas);
  assert.equal(renderer.metrics.cacheBuilds, 3);
});

test('maximum colour effects draw behind all sixteen targets on desktop and phone', () => {
  for (const [w, h] of [[2560, 1440], [390, 844]]) {
    const { renderer, game } = fixture(w, h);
    game.waveNumber = 100; game.stage = 5;
    game.targets = Array.from({ length: 16 }, (_, id) => Object.freeze({ type: 'spark', angle: id, r: 150, speed: 60, hp: 1, maxHp: 1 }));
    Object.freeze(game.targets); Object.freeze(game.player); Object.freeze(game);
    const order = [], effects = renderer._effects.bind(renderer), target = renderer._target.bind(renderer);
    renderer._effects = (...args) => { order.push('effects'); effects(...args); };
    renderer._target = (...args) => { order.push('target'); target(...args); };
    renderer.feedback(Array.from({ length: 128 }, () => Object.freeze({ type: 'bossDefeat', r: 104 })));
    renderer.draw(game);
    assert.equal(renderer.metrics.particles, 320);
    assert.equal(renderer.metrics.shockwaves, 8);
    assert.equal(renderer.metrics.drawnTargets, 16);
    assert.deepEqual(order, ['effects', ...Array(16).fill('target')]);
    assert.ok(renderer.center.y - 280 * renderer.scale >= renderer.metrics.safeTop);
    assert.ok(renderer.center.y + 280 * renderer.scale <= h - renderer.metrics.safeBottom);
  }
});
