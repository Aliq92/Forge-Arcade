import test from 'node:test';
import assert from 'node:assert/strict';
import { readForgeBeastSummary, FORGE_BEAST_METADATA } from '../src/launcher';
import { stateSummary } from '../src/integration/StateSummary';
import { resolveStorage } from '../src/integration/StorageAdapter';
import { HostObserver } from '../src/integration/HostObserver';
import type { ForgeBeastEvent } from '../src/integration/HostEvents';
import { Persistence, migrateSave, validState } from '../src/systems/Persistence';
import { SAVE_VERSION } from '../src/data/config';
import { Engine } from '../src/systems/Engine';
import { DeviceAudio } from '../src/systems/Audio';
import { DeviceHaptics } from '../src/systems/HapticsSystem';
import { GameClock } from '../src/systems/GameClock';
function memory() {
  const data = new Map<string, string>();
  return { data, adapter: { get: (key: string) => data.get(key) ?? null, set: (key: string, value: string) => { data.set(key, value); }, remove: (key: string) => { data.delete(key); } } };
}
function baby() { const e = new Engine(null, () => .99); e.debugHatch(); return e; }
test('metadata declares V0.5.1 independently of the central compatible save schema', () => {
  assert.equal(FORGE_BEAST_METADATA.version, '0.5.1'); assert.equal(FORGE_BEAST_METADATA.orientation, 'portrait');
  assert.equal(new Engine().state.version, SAVE_VERSION); assert.equal(SAVE_VERSION, 2);
  assert.ok(Object.isFrozen(FORGE_BEAST_METADATA));
});
test('launcher summary is read-only, qualitative and has no hidden game state', () => {
  const e = baby(); e.state.stats.hunger = 10; e.state.stats.health = 10; e.state.sleeping = true;
  const s = stateSummary(e.state, true);
  assert.equal(s.creatureName, 'Pipkin'); assert.equal(s.hungerState, 'Hungry'); assert.equal(s.healthState, 'Poorly'); assert.equal(s.sleeping, true); assert.equal(s.attentionNeeded, true);
  for (const key of ['stats', 'development', 'personality', 'inventory', 'eventHistory']) assert.equal(key in s, false);
  assert.ok(Object.isFrozen(s)); assert.equal(stateSummary(null, false).lastPlayedAt, null);
});
test('UI-free launcher reader and synchronous host adapter round trip without writing or requiring browser globals', () => {
  const { data, adapter } = memory(), storage = resolveStorage(adapter)!;
  const p = new Persistence(storage, 'host-slot'); const e = baby(); assert.equal(p.save(e.state), true);
  const before = new Map(data); const summary = readForgeBeastSummary({ storage: adapter, saveKey: 'host-slot' });
  assert.equal(summary.hasSave, true); assert.equal(summary.creatureName, 'Pipkin'); assert.deepEqual(data, before);
  assert.equal(readForgeBeastSummary({ storage: null }).hasSave, false);
  assert.equal(resolveStorage(storage), storage); storage.removeItem('host-slot'); assert.equal(data.size, 0);
});
test('V0.5 saves remain unchanged and missing compatible fields migrate without losing progress', () => {
  const e = baby(); e.state.stats.training = 42; e.state.development.trainingSessions = 3;
  assert.deepEqual(migrateSave(e.state), e.state);
  const partial: any = structuredClone(e.state); delete partial.stats.health; delete partial.development.neglectedMood; delete partial.life.needTimers.mood; delete partial.hapticsEnabled;
  const recovered = migrateSave(partial)!; assert.ok(validState(recovered)); assert.equal(recovered.stats.health, 100);
  assert.equal(recovered.stats.training, 42); assert.equal(recovered.development.trainingSessions, 3); assert.equal(recovered.personality, e.state.personality);
  assert.equal(migrateSave({ ...partial, hapticsEnabled: null }), null);
  assert.equal(migrateSave({ ...partial, stats: { ...partial.stats, mood: 'broken' } }), null);
});
test('malformed and future saves are preserved until explicit reset, which backs up their original bytes', () => {
  for (const raw of ['{broken', JSON.stringify({ ...baby().state, version: 999 }), JSON.stringify({ ...baby().state, combat: { active: {} } })]) {
    const { data, adapter } = memory(); data.set('slot', raw);
    const p = new Persistence(resolveStorage(adapter), 'slot'); assert.equal(p.load(), null); assert.equal(p.loadStatus, 'invalid');
    assert.equal(p.save(new Engine().state), false); assert.equal(data.get('slot'), raw);
    assert.equal(p.save(new Engine().state, { replaceInvalid: true }), true); assert.equal(data.get('slot:backup:invalid'), raw);
    assert.equal(p.load()!.stage, 'egg');
  }
});
test('last valid V1 backup can be recovered without overwriting a damaged primary save', () => {
  const old: any = structuredClone(baby().state); old.version = 1;
  const { data, adapter } = memory(); data.set('slot', '{broken'); data.set('slot:backup:v1', JSON.stringify(old));
  const p = new Persistence(resolveStorage(adapter), 'slot'); assert.equal(p.load()!.species, 'pipkin'); assert.equal(p.loadStatus, 'recovered');
  assert.equal(p.save(baby().state), false); assert.equal(data.get('slot'), '{broken');
});
test('invalid live state and failed writes never replace a valid save or claim a successful timestamp', () => {
  const { data, adapter } = memory(), p = new Persistence(resolveStorage(adapter), 'slot'), e = baby();
  assert.equal(p.save(e.state), true); const raw = data.get('slot'); e.state.stats.health = NaN;
  assert.equal(p.save(e.state), false); assert.equal(data.get('slot'), raw);
  const failing = new Persistence({ getItem: () => null, setItem: () => { throw new Error('full'); }, removeItem: () => {} });
  const state = baby().state; state.savedAt = 123; assert.equal(failing.save(state), false); assert.equal(state.savedAt, 123);
});
test('host observer emits transitions once and does not replay stored victories or discoveries on remount', () => {
  const e = baby(), observer = new HostObserver(), events: ForgeBeastEvent[] = []; observer.initialize(e.state);
  e.debugEvolve('cragox'); observer.observe(e.state, ev => events.push(ev)); observer.observe(e.state, ev => events.push(ev));
  assert.equal(events.filter(ev => ev.type === 'creature-evolved').length, 1);
  e.debugBattle('flinthop', true); e.debugBattleResult('victory'); observer.observe(e.state, ev => events.push(ev));
  assert.equal(events.filter(ev => ev.type === 'battle-won').length, 1);
  observer.initialize(e.state); observer.observe(e.state, ev => events.push(ev)); assert.equal(events.filter(ev => ev.type === 'battle-won').length, 1);
});
test('expeditions retain active-time remainder across repeated persistence cycles and reward only once', () => {
  const { adapter } = memory(), p = new Persistence(resolveStorage(adapter), 'slot'); let e = baby();
  e.explore('greenfield'); e.advance(5); const started = e.state.exploration.active!.startedAt, energy = e.state.stats.energy;
  for (let i = 0; i < 10; i++) { p.save(e.state); e = new Engine(p.load(), () => .01); assert.equal(e.state.exploration.active!.startedAt, started); assert.equal(e.state.stats.energy, energy); }
  e.advance(16); const stats = structuredClone(e.state.exploration.statistics), items = { ...e.state.exploration.inventory };
  for (let i = 0; i < 10; i++) { p.save(e.state); e = new Engine(p.load(), () => .01); e.advance(.25); }
  assert.deepEqual(e.state.exploration.statistics, stats); assert.deepEqual(e.state.exploration.inventory, items);
});
test('battle reloads retain resolved combatants and terminal rewards across repeated exits', () => {
  const { adapter } = memory(), p = new Persistence(resolveStorage(adapter), 'slot'); let e = baby();
  e.debugBattle('flinthop'); e.advance(1); e.battleAction('skill'); const active = structuredClone(e.state.combat.active!);
  for (let i = 0; i < 10; i++) { p.save(e.state); e = new Engine(p.load(), () => .01); assert.deepEqual(e.state.combat.active!.player, active.player); assert.deepEqual(e.state.combat.active!.enemy, active.enemy); assert.deepEqual(e.state.combat.active!.beats, []); }
  e.debugBattleResult('victory'); const items = { ...e.state.exploration.inventory };
  for (let i = 0; i < 10; i++) { p.save(e.state); e = new Engine(p.load(), () => .01); assert.equal(e.state.combat.statistics.wins, 1); assert.deepEqual(e.state.exploration.inventory, items); }
});
test('audio requires opt-in unlock, pause stops scheduled tones, resume is silent and contexts are reused then closed', () => {
  let created = 0, starts = 0, stops = 0, suspends = 0, closes = 0;
  const context = { currentTime: 0, destination: {}, resume: async () => {}, suspend: async () => { suspends++; }, close: async () => { closes++; },
    createOscillator: () => ({ type: '', frequency: { value: 0 }, connect: () => {}, disconnect: () => {}, start: () => { starts++; }, stop: () => { stops++; } }),
    createGain: () => ({ gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, disconnect: () => {} }) } as unknown as AudioContext;
  const audio = new DeviceAudio(() => { created++; return context; }, false);
  audio.play('alert'); assert.equal(created, 0); audio.unlock(); audio.play('confirm'); assert.equal(created, 1);
  audio.pause(); assert.ok(stops > 0); assert.equal(suspends, 1); const before = starts;
  audio.play('victory'); audio.resume(); assert.equal(starts, before); audio.play('attack'); assert.equal(created, 1);
  audio.destroy(); audio.destroy(); assert.equal(closes, 1);
});
test('paused haptics cancel feedback and cannot fire until resumed', () => {
  const patterns: (number | number[])[] = [], h = new DeviceHaptics(p => { patterns.push(p); return true; }, () => false);
  h.enabled = true; h.play('victory'); h.pause(); const before = patterns.length;
  assert.equal(patterns.at(-1), 0); assert.equal(h.play('attack'), false); assert.equal(patterns.length, before);
  h.resume(); assert.equal(h.play('attack'), true); h.destroy();
});
test('central clock has one interval, cancels on pause/destroy and drops paused wall time', t => {
  let timers = 0, cleared = 0;
  t.mock.method(globalThis, 'setInterval', () => ++timers as any);
  t.mock.method(globalThis, 'clearInterval', () => { cleared++; });
  const clock = new GameClock(() => {}); clock.resume(); clock.resume(); assert.equal(timers, 1);
  clock.pause(); clock.pause(); assert.equal(cleared, 1); clock.resume(); assert.equal(timers, 2);
  clock.destroy(); clock.destroy(); assert.equal(cleared, 2);
});
