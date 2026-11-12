import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, angleDistance } from '../game.js';
import { UPGRADES } from '../upgrades.js';

// Adversarial component fixtures only: these isolate real Game combat and upgrade
// methods. They do not claim to play or complete the authored campaign.
const DT = 1 / 120;
let fixtureId = 10000;
function tick(game, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) game.advance(DT);
}
function arena() {
  const game = new Game({ seed: 431 });
  assert.equal(game.start(), true);
  game.wave = { ...game.wave, spawns: [{ at: 1e6, type: 'spark', angle: 0, speed: 40 }] };
  return game;
}
function target(game, extra = {}) {
  const t = { id: ++fixtureId, type: 'spark', angle: 0,
    baseAngle: 0, r: 100, speed: 40, hp: 1, maxHp: 1,
    radius: 9, cracked: false, age: 0, ...extra };
  game.targets.push(t);
  return t;
}
function grant(game, id) {
  // Supply an eligible choice at a real selection boundary; chooseUpgrade owns
  // both the application and the next-wave refresh behavior under test.
  game.state = 'upgrade';
  game.choices = [UPGRADES.find(u => u.id === id)];
  assert.equal(game.chooseUpgrade(id), true);
  game.wave = { ...game.wave, spawns: [{ at: 1e6, type: 'spark', angle: 0, speed: 40 }] };
}
const near = (actual, expected, tolerance = 1e-8) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('Chain uses a global two-target budget even across multiple primary victims', () => {
  const g = arena(); grant(g, 'chain'); grant(g, 'chain');
  // Three ordinary arc victims must not spend the extra-target budget.
  for (const angle of [-.4, 0, .4, .8, 1, 1.2, -1]) target(g, { angle });
  g.strike(); tick(g, .1);
  assert.equal(g.stats.hits, 5);
  assert.equal(g.targets.length, 2);
  assert.equal(g.drainEvents().filter(e => e.type === 'chain').length, 2);
  assert.equal(g.stats.successfulStrikes, 1);
});

test('Chain range is 90 world units and secondary victims cannot propagate it', () => {
  const g = arena(); grant(g, 'chain'); grant(g, 'chain');
  target(g, { r: 40 });
  // Across the center: distances from primary are 89, 90.5 and 130.
  const inRange = target(g, { angle: Math.PI, r: 49 });
  const justOutside = target(g, { angle: Math.PI, r: 50.5 });
  const recursiveOnly = target(g, { angle: Math.PI, r: 90 });
  g.strike();
  assert.ok(!g.targets.includes(inRange));
  assert.ok(g.targets.includes(justOutside));
  assert.ok(g.targets.includes(recursiveOnly));
  assert.equal(g.stats.hits, 2);
});

for (const [level, duration] of [[1, .8], [2, 1.1]]) {
  test(`Time Bend level ${level} slows approaches to .6 for ${duration}s, with real-time input and timers`, () => {
    const g = arena(); for (let i = 0; i < level; i++) grant(g, 'time');
    target(g, { r: 86 });
    const approach = target(g, { angle: Math.PI, r: 230 });
    g.player.invulnerable = .7;
    g.strike(); g.setRotation(1);
    near(g.slowRemaining, duration); near(g.slowCooldown, 3);
    tick(g, .25);
    near(approach.r, 224); near(g.player.angle, .875);
    near(g.player.invulnerable, .45); near(g.player.recovery, .07);
    tick(g, duration - .25);
    near(g.slowRemaining, 0);
    // At most the last simulation slice may use normal movement at expiry.
    near(approach.r, 230 - 40 * .6 * duration, 40 * DT);
    const before = approach.r; tick(g, .25); near(before - approach.r, 10);
    // Perfect hits during the cooldown cannot start another slow.
    g.setRotation(0); g.aim(0); target(g, { r: 86 }); g.strike();
    near(g.slowRemaining, 0); assert.ok(g.slowCooldown > 1);
    // Allow one fixed simulation slice at the exact cooldown boundary.
    tick(g, 3 - duration - .25 + DT);
    g.aim(0); target(g, { r: 86 }); g.strike();
    near(g.slowRemaining, duration); near(g.slowCooldown, 3);
  });
}

test('Wide Arc expands from 50 to 60 to 70 degrees and remains directional', () => {
  for (const level of [0, 1, 2]) {
    const g = arena(); for (let i = 0; i < level; i++) grant(g, 'wide');
    const boundary = (25 + level * 5) * Math.PI / 180;
    const inside = target(g, { angle: boundary - .001 });
    const outside = target(g, { angle: boundary + .001 });
    const behind = target(g, { angle: Math.PI });
    g.strike(); near(g.player.attack.arc, (50 + level * 10) * Math.PI / 180);
    assert.ok(!g.targets.includes(inside)); assert.ok(g.targets.includes(outside));
    assert.ok(g.targets.includes(behind));
  }
});

test('Echo waits .16s, freezes upgraded geometry, deals half damage and triggers no abilities', () => {
  const g = arena(); for (const id of ['echo', 'wide', 'wide', 'chain', 'chain', 'time']) grant(g, id);
  const primary = target(g, { r: 86, hp: 2, maxHp: 2, type: 'bulwark' });
  g.strike(); g.aim(Math.PI); tick(g, .1);
  const edge = target(g, { angle: .59, r: 120, hp: 2, maxHp: 2, type: 'bulwark' });
  const outOfArc = target(g, { angle: .64, r: 120 });
  const outOfReach = target(g, { r: 150 });
  // These arrivals occur after the primary attack expires, before its echo.
  const hpBefore = edge.hp;
  tick(g, .05); assert.equal(primary.hp, 1); assert.equal(edge.hp, hpBefore);
  tick(g, DT * 2);
  assert.equal(primary.hp, .5); assert.equal(edge.hp, hpBefore - .5);
  assert.ok(g.targets.includes(outOfArc)); assert.ok(g.targets.includes(outOfReach));
  assert.equal(g.echoes.length, 0); assert.equal(g.stats.perfects, 1);
  assert.equal(g.stats.successfulStrikes, 1); assert.equal(g.stats.attempts, 1);
  assert.equal(g.drainEvents().filter(e => e.type === 'echo').length, 1);
  tick(g, .4); assert.equal(g.echoes.length, 0);
});

test('queued echoes freeze in every inactive state and resume only in playing', () => {
  for (const state of ['paused', 'upgrade', 'gameover']) {
    const g = arena(); grant(g, 'echo');
    const t = target(g, { r: 86, hp: 2, maxHp: 2, type: 'bulwark' }); g.strike();
    if (state === 'paused') g.pause(); else g.state = state;
    const before = structuredClone({ time: g.time, echoes: g.echoes, hp: t.hp, r: t.r });
    tick(g, 1);
    assert.deepEqual({ time: g.time, echoes: g.echoes, hp: t.hp, r: t.r }, before);
    if (state === 'paused') { g.resume(); tick(g, .175); assert.equal(t.hp, .5); }
  }
});

test('an echo crossing the perfect ring cannot trigger Time Bend, another echo or Chain', () => {
  const g = arena(); for (const id of ['echo', 'time', 'chain']) grant(g, id);
  target(g, { r: 86 }); g.strike(); tick(g, .1);
  // Deliberately clear the first slow so it cannot mask an erroneous secondary
  // retrigger. The echo will meet this new target inside the perfect ring.
  g.slowRemaining = 0; g.slowCooldown = 0;
  const echoVictim = target(g, { r: 88.5, hp: 2, maxHp: 2, type: 'bulwark' });
  const chainOnly = target(g, { r: 88.5, angle: .7 });
  tick(g, .075);
  assert.equal(echoVictim.hp, 1.5); assert.ok(g.targets.includes(chainOnly));
  assert.equal(g.stats.perfects, 1); assert.equal(g.echoes.length, 0);
  near(g.slowRemaining, 0); near(g.slowCooldown, 0);
  assert.equal(g.stats.attempts, 1); assert.equal(g.stats.successfulStrikes, 1);
});

test('Keeper consumes one charge per mistake, never on cooldown or pause, and refreshes at wave start', () => {
  const g = arena(); grant(g, 'keeper'); grant(g, 'keeper'); g.stats.combo = 10;
  g.strike(); assert.equal(g.strike(), false); tick(g, .1);
  assert.equal(g.player.keeperCharges, 1); assert.equal(g.stats.combo, 10);
  tick(g, .25); g.strike(); tick(g, .1);
  assert.equal(g.player.keeperCharges, 0); assert.equal(g.stats.combo, 10);
  g.pause(); tick(g, 5); g.resume(); tick(g, .25);
  assert.equal(g.player.keeperCharges, 0);
  g.strike(); tick(g, .1); assert.equal(g.stats.combo, 0);
  g.state = 'intermission'; g.waveNumber = 2;
  assert.equal(g.nextWave(), true); assert.equal(g.player.keeperCharges, 2);
});

test('Pulse selection heals one and grows capacity once per level, with capped choices rejected by Game', () => {
  const g = arena(); g.player.shields = 1; grant(g, 'pulse');
  assert.equal(g.player.shields, 2); assert.equal(g.player.maxShields, 4);
  grant(g, 'pulse'); assert.equal(g.player.shields, 3); assert.equal(g.player.maxShields, 5);
  g.state = 'upgrade'; g.choices = [UPGRADES.find(u => u.id === 'pulse')];
  assert.equal(g.chooseUpgrade('pulse'), false); assert.equal(g.player.shields, 3);
  assert.equal(g.player.maxShields, 5); assert.equal(g.upgrades.pulse, 2);
});

test('restart resets all six upgrades, queued effects, attack identity and accuracy bookkeeping', () => {
  const g = arena(); for (const id of ['chain', 'pulse', 'time', 'wide', 'echo', 'keeper']) grant(g, id);
  target(g, { r: 86 }); target(g, { r: 86, angle: .2 }); g.strike();
  const firstId = g.player.attack.id;
  assert.equal(g.stats.attempts, 1); assert.equal(g.stats.successfulStrikes, 1);
  tick(g, .4); g.aim(Math.PI); g.strike();
  assert.notEqual(g.player.attack.id, firstId); tick(g, .1);
  assert.equal(g.stats.attempts, 2); assert.equal(g.stats.successfulStrikes, 1);
  assert.ok(g.stats.successfulStrikes / g.stats.attempts <= 1);
  assert.equal(g.restart(), true);
  assert.ok(Object.values(g.upgrades).every(level => level === 0));
  assert.equal(g.player.shields, 3); assert.equal(g.player.maxShields, 3);
  assert.equal(g.player.keeperCharges, 0); assert.equal(g.echoes.length, 0);
  assert.equal(g.slowRemaining, 0); assert.equal(g.slowCooldown, 0);
  assert.equal(g.stats.attempts, 0); assert.equal(g.stats.successfulStrikes, 0);
  g.strike(); assert.equal(g.player.attack.id, firstId);
  assert.equal(angleDistance(g.player.attack.angle, 0), 0);
});
