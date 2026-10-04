import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/systems/Engine';
import { createCreature } from '../src/creatures/Creature';
import { Persistence, type SaveStorage } from '../src/systems/Persistence';
import { TIMING } from '../src/data/config';
import type { CareAction } from '../src/systems/Actions';
function baby() { const e = new Engine(null, () => 0.99); e.advance(TIMING.hatch); return e; }
function action(e: Engine, a: CareAction) { e.advance(2); return e.action(a); }
function finish(e: Engine) {
  while (e.state.stage === 'baby') {
    if (e.state.sleeping && e.state.stats.energy > 90) action(e, 'sleep');
    else if (!e.state.sleeping && e.state.stats.energy < 35) action(e, 'sleep');
    else if (!e.state.sleeping && e.state.stats.hunger < 45) action(e, 'feed');
    e.advance(1);
  }
}
test('egg hatches after configured active time; baby evolves at its own threshold', () => {
  const e = new Engine(null, () => 0.99); e.advance(TIMING.hatch - 1); assert.equal(e.state.stage, 'egg');
  e.advance(1); assert.equal(e.state.species, 'pipkin'); assert.equal(e.state.stageAge, 0);
  e.advance(TIMING.evolution - 1); assert.equal(e.state.stage, 'baby');
  e.advance(1); assert.equal(e.state.stage, 'evolved');
});
test('egg care does not alter stats; cooldown blocks repeated actions', () => {
  const e = new Engine(null, () => 0.99); const stats = { ...e.state.stats };
  assert.equal(e.action('feed').success, false); assert.deepEqual(e.state.stats, stats);
  e.debugHatch(); assert.equal(e.action('train').success, true);
  assert.equal(e.action('train').success, false); assert.equal(e.state.development.trainingSessions, 1);
});
test('feed, train, play and sleep have appropriate effects; sleeping gates actions', () => {
  const e = baby(); e.state.stats.hunger = 50;
  action(e, 'feed'); assert.ok(e.state.stats.hunger > 70);
  const energy = e.state.stats.energy; action(e, 'train'); assert.equal(e.state.stats.training, 10); assert.ok(e.state.stats.energy < energy - 10);
  e.state.stats.mood = 40; action(e, 'play'); assert.ok(e.state.stats.mood > 55);
  action(e, 'sleep'); assert.equal(e.state.sleeping, true); const before = e.state.stats.energy;
  assert.equal(action(e, 'feed').success, false); e.advance(20); assert.ok(e.state.stats.energy > before);
  action(e, 'sleep'); assert.equal(e.state.sleeping, false);
});
test('real care patterns can reach all four original evolved forms', () => {
  const brute = baby(); for (let i = 0; i < 5; i++) action(brute, 'train'); finish(brute); assert.equal(brute.state.species, 'cragox');
  const agile = baby(); for (let i = 0; i < 2; i++) action(agile, 'train'); for (let i = 0; i < 5; i++) action(agile, 'play'); finish(agile); assert.equal(agile.state.species, 'zephlet');
  const mystic = baby(); for (let i = 0; i < 4; i++) action(mystic, 'play'); finish(mystic); assert.equal(mystic.state.species, 'runewisp');
  const wild = baby(); for (let i = 0; i < 5; i++) action(wild, 'feed'); finish(wild); assert.equal(wild.state.species, 'bramblejaw');
});
test('neglect records care mistakes and missed sleep without negative stats', () => {
  const e = baby(); e.state.stats = { ...e.state.stats, hunger: 2, energy: 2, mood: 2, training: 0 }; e.advance(80);
  assert.ok(e.state.development.careMistakes >= 3); assert.ok(e.state.development.missedSleep >= 3);
  assert.ok(e.state.development.neglectTime >= 80); assert.ok(Object.values(e.state.stats).every(n => n >= 0 && n <= 100));
});
test('save round-trips every lifecycle field; invalid and unavailable storage fail safely', () => {
  const data = new Map<string, string>();
  const storage: SaveStorage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => { data.set(k,v); }, removeItem: k => { data.delete(k); } };
  const p = new Persistence(storage, 'test'); const e = baby(); action(e, 'play'); action(e, 'train'); action(e, 'sleep');
  p.save(e.state); assert.deepEqual(p.load(), e.state);
  const savedAge = e.state.age; const loaded = new Engine(p.load()); assert.equal(loaded.state.age, savedAge); assert.equal(loaded.state.sleeping, true);
  p.reset(); assert.equal(p.load(), null);
  storage.setItem('test', '{bad'); assert.equal(p.load(), null);
  storage.setItem('test', JSON.stringify({ ...createCreature(), stats: { hunger: 200 } })); assert.equal(p.load(), null);
  const unavailable = new Persistence(null); assert.equal(unavailable.save(e.state), false); assert.equal(unavailable.available, false);
});
test('debug controls hatch, advance, naturally evolve and force every form', () => {
  for (const species of ['cragox', 'zephlet', 'runewisp', 'bramblejaw'] as const) {
    const e = new Engine(null, () => 0.99); e.debugEvolve(species); assert.equal(e.state.species, species); assert.equal(e.state.stage, 'evolved');
    e.reset(); assert.equal(e.state.stage, 'egg'); assert.equal(e.state.age, 0);
  }
});
