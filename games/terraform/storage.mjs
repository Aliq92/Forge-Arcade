import { DISASTERS, WIDTH, HEIGHT } from './simulation.mjs';
import { MISSIONS } from './campaign.mjs';

const PREFIX = 'forge-arcade.terraform.';
const SNAPSHOT = PREFIX + 'planet.';
const SESSION = PREFIX + 'session';
const AWARD = PREFIX + 'mission.';
const VERSION = 1;
const MODES = ['campaign', 'sandbox', 'survival'];
const OVERLAYS = ['surface', 'temperature', 'moisture', 'elevation', 'habitability'];
const FRACTIONS = ['elevation', 'moisture', 'water', 'ice', 'grass', 'forest', 'herbivores',
  'predators', 'aquatic', 'cloud', 'rain', 'heat', 'fire', 'rainZone', 'flow'];

function storage() {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch { /* Browser privacy settings can make the getter itself throw. */ }
  throw new Error('Browser storage is unavailable. Allow local storage to save this planet.');
}

function write(key, value) {
  try {
    storage().setItem(key, value);
  } catch (error) {
    if (error.name !== 'QuotaExceededError') throw error;
    throw new Error('Browser storage is full. Your existing saves are safe.');
  }
}

function requireValid(condition, subject) {
  if (!condition) throw new Error('Damaged planet save (' + subject + ').');
}

const inRange = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
const whole = (value, low, high) => Number.isSafeInteger(value) && inRange(value, low, high);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateWorld(world, settings) {
  requireValid(record(world) && MODES.includes(world.mode), 'game mode');
  requireValid(typeof world.seed === 'string' && world.seed.length > 0, 'seed');
  requireValid(world.width === WIDTH && world.height === HEIGHT && Array.isArray(world.cells) &&
    world.cells.length === world.width * world.height, 'planet dimensions');
  const lastCell = world.cells.length - 1;
  requireValid(whole(world.tick, 0, Number.MAX_SAFE_INTEGER) &&
    whole(world.nextEvent, 0, Number.MAX_SAFE_INTEGER) && whole(world.stableTicks, 0, Number.MAX_SAFE_INTEGER) &&
    whole(world.rng, 0, 0xffffffff), 'simulation clock');
  requireValid(inRange(world.energy, 0, 1e6) && inRange(world.solar, -60, 60) &&
    inRange(world.pressure, 0.1, 2) && inRange(world.oxygen, .1, 32) && inRange(world.co2, .015, 4), 'planet conditions');
  requireValid(['normal', 'wet', 'dry', 'cold', 'hot'].includes(world.weather), 'weather');
  requireValid(world.survivalComplete === undefined || typeof world.survivalComplete === 'boolean', 'survival progress');
  requireValid(world.warning === null || typeof world.warning === 'string', 'disaster warning');
  requireValid(world.event === null || (record(world.event) && DISASTERS.includes(world.event.type) &&
    whole(world.event.index, 0, lastCell) && whole(world.event.tick, 0, world.tick)), 'disaster');
  for (const cell of world.cells) {
    requireValid(record(cell) && FRACTIONS.every(field => inRange(cell[field], 0, 1)) &&
      inRange(cell.temperature, -100, 100) && inRange(cell.anomaly, -60, 60) &&
      whole(cell.downstream, -1, lastCell), 'surface region');
  }
  if (world.mode === 'campaign') {
    const mission = world.mission;
    requireValid(record(mission) && whole(mission.index, 0, MISSIONS.length - 1), 'mission index');
    const definition = MISSIONS[mission.index];
    requireValid(whole(mission.target, 0, lastCell) &&
      whole(mission.hold, 0, definition.duration) && mission.complete === (mission.hold === definition.duration) &&
      whole(mission.lastTick, 0, world.tick) && whole(mission.weatherPhase, 0, 3) &&
      Array.isArray(mission.allowed) && mission.allowed.length === definition.tools.length &&
      definition.tools.every(id => mission.allowed.includes(id)), 'mission progress');
  }
  requireValid(record(settings) && [0, 1, 2, 4].includes(settings.speed) &&
    whole(settings.selected, 0, lastCell) && OVERLAYS.includes(settings.overlay), 'view settings');
}

// Each regional field is stored once if homogeneous, otherwise as exact little-endian
// doubles. This keeps multiple full-resolution planets within the browser quota.
function packColumn(cells, field) {
  const first = cells[0][field];
  if (cells.every(cell => cell[field] === first)) return first;
  const bytes = new Uint8Array(cells.length * 8);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < cells.length; i++) {
    requireValid(Number.isFinite(cells[i][field]), 'regional field ' + field);
    view.setFloat64(i * 8, cells[i][field], true);
  }
  return btoa(String.fromCharCode(...bytes));
}

function encode(world, settings) {
  validateWorld(world, settings);
  const { cells, ...state } = world;
  const columns = Object.fromEntries(Object.keys(cells[0]).map(key => [key, packColumn(cells, key)]));
  const header = { version: VERSION, savedAt: Date.now(), seed: world.seed, mode: world.mode, tick: world.tick };
  return JSON.stringify(header) + '\n' + JSON.stringify({ state, columns, settings });
}

function headerOf(value) {
  const end = value.indexOf('\n');
  requireValid(end > 0, 'file header');
  let header;
  try { header = JSON.parse(value.slice(0, end)); } catch { throw new Error('Unreadable planet save header.'); }
  requireValid(record(header), 'file header');
  if (header.version !== VERSION) throw new Error('This planet uses an incompatible save version.');
  requireValid(whole(header.savedAt, 0, Number.MAX_SAFE_INTEGER) && typeof header.seed === 'string' &&
    MODES.includes(header.mode) && whole(header.tick, 0, Number.MAX_SAFE_INTEGER), 'save details');
  return header;
}

function decode(value) {
  const header = headerOf(value);
  let payload;
  try { payload = JSON.parse(value.slice(value.indexOf('\n') + 1)); }
  catch { throw new Error('Unreadable planet save data.'); }
  requireValid(record(payload) && record(payload.state) && record(payload.columns), 'planet data');
  const { state, columns, settings } = payload;
  requireValid(state.width === WIDTH && state.height === HEIGHT, 'planet dimensions');
  const count = state.width * state.height;
  const cells = Array.from({length: count}, () => ({}));
  for (const [field, column] of Object.entries(columns)) {
    requireValid(/^[a-zA-Z][a-zA-Z0-9]*$/.test(field) && !Object.hasOwn(Object.prototype, field), 'regional field');
    if (typeof column === 'number') {
      requireValid(Number.isFinite(column), 'regional value');
      for (const cell of cells) cell[field] = column;
      continue;
    }
    requireValid(typeof column === 'string' && column.length === Math.ceil(count * 8 / 3) * 4, 'regional data size');
    let binary;
    try { binary = atob(column); } catch { throw new Error('Unreadable regional data.'); }
    requireValid(binary.length === count * 8, 'regional data size');
    const view = new DataView(Uint8Array.from(binary, char => char.charCodeAt(0)).buffer);
    for (let i = 0; i < count; i++) cells[i][field] = view.getFloat64(i * 8, true);
  }
  const world = { ...state, cells };
  validateWorld(world, settings);
  requireValid(header.mode === world.mode && header.tick === world.tick && header.seed === world.seed, 'mismatched save details');
  return { world, settings };
}

export function savePlanet(world, settings) {
  const value = encode(world, settings);
  const store = storage();
  let id;
  do {
    const random = new Uint32Array(2);
    globalThis.crypto.getRandomValues(random);
    id = Date.now().toString(36) + '-' + Array.from(random, n => n.toString(36)).join('-');
  } while (store.getItem(SNAPSHOT + id) !== null);
  write(SNAPSHOT + id, value);
  return id;
}

export function listPlanets() {
  const store = storage();
  const saves = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key?.startsWith(SNAPSHOT)) continue;
    const value = store.getItem(key);
    if (value === null) continue;
    const id = key.slice(SNAPSHOT.length);
    try { saves.push({ ...headerOf(value), id }); }
    catch (error) {
      saves.push({ id, savedAt: 0, seed: 'Unreadable planet', mode: '', tick: 0, error: error.message });
    }
  }
  return saves.sort((a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id));
}

export function loadPlanet(id) {
  const value = storage().getItem(SNAPSHOT + id);
  if (value === null) throw new Error('That saved planet is no longer available.');
  return decode(value);
}

export function deletePlanet(id) {
  storage().removeItem(SNAPSHOT + id);
}

export function saveSession(world, settings) { write(SESSION, encode(world, settings)); }

export function loadSession() {
  const value = storage().getItem(SESSION);
  return value === null ? null : decode(value);
}

// Independent award keys prevent two open tabs from losing each other's milestones.
export function markComplete(index) {
  if (!whole(index, 0, MISSIONS.length - 1)) throw new Error('Unknown campaign mission.');
  write(AWARD + index, String(VERSION));
}

export function completedMissions() {
  const store = storage();
  return MISSIONS.flatMap((_, i) => store.getItem(AWARD + i) === String(VERSION) ? [i] : []);
}
