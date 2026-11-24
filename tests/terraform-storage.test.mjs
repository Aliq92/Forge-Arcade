import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, applyTool } from '../games/terraform/simulation.mjs';
import { startMission } from '../games/terraform/campaign.mjs';
import {
  savePlanet, loadPlanet, listPlanets, deletePlanet, saveSession, loadSession, markComplete, completedMissions
} from '../games/terraform/storage.mjs';

const settings = { speed: 2, selected: 34, overlay: 'temperature' };
const prefix = 'forge-arcade.terraform.';
let raw;
let store;
beforeEach(() => {
  raw = new Map();
  store = {
    get length() { return raw.size; },
    key(index) { return [...raw.keys()][index] ?? null; },
    getItem(key) { return raw.get(key) ?? null; },
    setItem(key, value) { raw.set(key, String(value)); },
    removeItem(key) { raw.delete(key); }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true });
});

test('snapshots preserve every region exactly and continue the same deterministic simulation', () => {
  const world = createWorld('Solis', 'survival');
  applyTool(world, 'grass', 91);
  for (let i = 0; i < 10; i++) step(world);
  const id = savePlanet(world, settings);
  const restored = loadPlanet(id);
  assert.deepEqual(restored, { world, settings });
  step(world);
  step(restored.world);
  assert.deepEqual(restored.world, world);
});

test('every explicit save gets a separate slot, including after a mode switch', () => {
  assert.equal(loadSession(), null);
  const sandbox = createWorld('Gemini', 'sandbox');
  const campaign = startMission(0, 'Gemini');
  const id = savePlanet(sandbox, settings);
  const second = savePlanet(sandbox, settings);
  assert.notEqual(id, second);
  saveSession(sandbox, settings);
  saveSession(campaign, { ...settings, speed: 0 });
  assert.deepEqual(loadSession().world, campaign);
  assert.deepEqual(loadPlanet(id).world, sandbox);
  assert.deepEqual(new Set(listPlanets().map(p => p.id)), new Set([id, second]));
  assert.throws(() => loadPlanet('unknown'), /no longer available/);
});

test('removing a snapshot preserves the active world and other saved planets', () => {
  const world = createWorld('Archive', 'sandbox');
  const first = savePlanet(world, settings);
  const second = savePlanet(world, settings);
  saveSession(world, settings);
  deletePlanet(first);
  assert.throws(() => loadPlanet(first), /no longer available/);
  assert.deepEqual(loadPlanet(second).world, world);
  assert.deepEqual(loadSession().world, world);
});

test('unreadable or incompatible snapshots do not hide healthy planets', () => {
  const world = createWorld('Damaged file test', 'sandbox');
  const id = savePlanet(world, settings);
  const good = raw.get(prefix + 'planet.' + id);
  const key = prefix + 'planet.broken';
  raw.set(key, 'unreadable');
  assert.throws(() => loadPlanet('broken'), /damaged|unreadable/i);
  assert.equal(listPlanets().find(p => p.id === id).mode, 'sandbox');
  assert.ok(listPlanets().find(p => p.id === 'broken').error);
  raw.set(key, good.replace('"version":1', '"version":72'));
  assert.throws(() => loadPlanet('broken'), /incompatible/i);
  raw.set(prefix + 'session', '{');
  assert.throws(() => loadSession(), /damaged|unreadable/i);
  assert.equal(raw.get(key).includes('"version":72'), true);
});

test('rejects invalid dimensions, regional data, settings and clock before saving or loading', () => {
  const world = createWorld('Validation', 'survival');
  assert.throws(() => savePlanet(world, { ...settings, speed: 10 }), /settings/);
  const id = savePlanet(world, settings);
  const key = prefix + 'planet.' + id;
  const [header, data] = raw.get(key).split('\n');
  const malformed = change => {
    const body = JSON.parse(data);
    change(body);
    raw.set(key, header + '\n' + JSON.stringify(body));
    assert.throws(() => loadPlanet(id), /damaged|unreadable/i);
  };
  malformed(body => { body.state.width = 1e15; });
  malformed(body => { body.state.nextEvent = '42'; });
  malformed(body => { body.columns.moisture = 1.5; });
  malformed(body => { body.columns.grass = 'broken'; });
  malformed(body => { delete body.columns.aquatic; });
  malformed(body => { body.settings.selected = 1e10; });
  world.cells[0].predators = NaN;
  assert.throws(() => savePlanet(world, settings), /damaged/i);
  assert.equal(raw.size, 1);
});

test('failed autosave writes preserve the previous valid session', () => {
  const world = createWorld('Replay', 'sandbox');
  saveSession(world, settings);
  store.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  step(world);
  assert.throws(() => saveSession(world, settings), /storage is full/i);
  assert.equal(loadSession().world.tick, 0);
});

test('campaign awards persist independently of worlds, and repeats never duplicate them', () => {
  raw.set('unrelated-game', 'preserved');
  markComplete(3);
  markComplete(0);
  markComplete(3);
  saveSession(startMission(0, 'New career'), settings);
  assert.deepEqual(completedMissions(), [0, 3]);
  assert.throws(() => markComplete(15), /unknown/i);
  assert.equal(raw.get('unrelated-game'), 'preserved');
});

test('campaign saves preserve objective holds and reject unsupported tool unlocks', () => {
  const world = startMission(0, 'First Rain');
  world.tick = 4;
  world.mission.hold = 2;
  world.mission.lastTick = 4;
  const id = savePlanet(world, settings);
  assert.deepEqual(loadPlanet(id).world.mission, world.mission);
  world.mission.allowed.push('mountain');
  assert.throws(() => saveSession(world, settings), /mission progress/);
});
