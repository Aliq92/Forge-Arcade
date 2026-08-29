// Orbital Bloom - core constants and shared mutable state/settings

export const CONSTANTS = {
  MAX_PARTICLES: 6000,
  SOFTENING: 24,               // gravity softening radius (world units)
  MAX_PARTICLE_SPEED: 2600,    // hard velocity cap for particles
  MAX_ATTRACTOR_SPEED: 900,    // hard velocity cap for dynamic attractors
  MAX_MASS: 400000,
  MIN_MASS: 40,
  BASE_DT: 1 / 60,             // fixed physics timestep at 1x speed
  G_DEFAULT: 2600,             // base gravitational constant (scaled, not real units)
  MAX_ZOOM: 6,
  MIN_ZOOM: 0.08,
  GENTLE_INFLUENCE_RADIUS: 180,
  GENTLE_INFLUENCE_MAX_DELTA: 12,
  PULSE_MAX_DELTA: 40,
  CRADLE_HOLD_MS: 350,
  CRADLE_DRIFT_PIXELS: 8,
};

export const SYSTEM_SCHEMA_VERSION = 2;

export const TRAIL_FADE = {
  off: 1,
  short: 0.32,
  medium: 0.13,
  long: 0.055,
  extreme: 0.022,
};

export const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4, 8];

export const PALETTE = {
  ivory: '#f4f0dc', white: '#f4f0dc',
  jade: '#6eae94', cyan: '#6eae94',
  amber: '#e9b567', gold: '#e9b567',
  coral: '#dc7662', violet: '#8b749b',
  blue: '#557f8a', ocean: '#07151a', bg: '#07151a',
};

// Central mutable application state (settings + tool state)
export const state = {
  // simulation control
  running: true,
  speedMultiplier: 1,
  gravityStrength: 1,

  // visuals
  trailLength: 'medium',
  trailStyle: 'soft',
  colorMode: 'uniform',
  particleBrightness: 0.75,
  particleSize: 0.9,
  backgroundDensity: 1,
  motionBlur: false,
  renderQuality: 'auto', // 'low' | 'medium' | 'high' | 'auto'
  particleDensityPref: 'medium', // 'low' | 'medium' | 'high'

  // physics behavior
  absorbMode: 'absorb', // 'absorb' | 'passthrough'
  collisionMode: 'merge', // 'ignore' | 'merge' | 'bounce' | 'destroy'

  // camera / view
  followBody: false,
  cinematicMode: false,
  gravityOverlay: false,

  // random system generator
  lastSeed: null,

  // accessibility / prefs
  reducedMotion: false,
  showFPS: false,
  screenFlash: true,

  // tools
  currentTool: 'select',
  gardenVariant: null,
  cradleArmed: false,
  attractorType: 'star',
  attractorFixed: false,

  // spawn panel
  spawnMode: 'rotating', // static | rotating | jet | ring | disc
  spawnAmount: 500,
  spawnRadius: 120,
  spawnSpread: 0.35,
  spawnSpeed: 40,
  spawnSpin: 18,
  continuousStream: false,

  // selection
  selectedAttractorId: null,
  selectedKind: null, // 'attractor'

  // overlay
  classificationOverlay: false,
};

export const stats = {
  absorbedCount: 0,
  simTime: 0,
  fps: 0,
};

const SETTINGS_KEY = 'orbitalBloom.settings.v1';
const PRESET_KEY = 'orbitalBloom.lastPreset.v1';
const FAVORITES_KEY = 'orbitalBloom.favorites.v1';

const PERSISTED_KEYS = [
  'trailLength', 'trailStyle', 'colorMode', 'particleBrightness', 'particleSize',
  'backgroundDensity', 'motionBlur', 'reducedMotion', 'showFPS', 'screenFlash',
  'absorbMode', 'gravityStrength', 'renderQuality', 'particleDensityPref', 'collisionMode',
];

export function saveSettings() {
  try {
    const out = {};
    for (const k of PERSISTED_KEYS) out[k] = state[k];
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(out));
  } catch (e) { /* storage unavailable */ }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const k of PERSISTED_KEYS) {
      if (data[k] !== undefined) state[k] = data[k];
    }
  } catch (e) { /* ignore */ }
}

export function saveLastPreset(id) {
  try { localStorage.setItem(PRESET_KEY, id); } catch (e) {}
}
export function loadLastPreset() {
  try { return localStorage.getItem(PRESET_KEY); } catch (e) { return null; }
}

const SEED_KEY = 'orbitalBloom.lastSeed.v1';
export function saveLastSeed(seed) {
  try { localStorage.setItem(SEED_KEY, seed); } catch (e) {}
}
export function loadLastSeed() {
  try { return localStorage.getItem(SEED_KEY); } catch (e) { return null; }
}

const SYSTEM_KEY = 'orbitalBloom.savedSystem.v1';
const GARDEN_PROGRESS_KEY = 'orbitalBloom.gardenProgress.v1';
const DEFAULT_GARDEN_PROGRESS = {
  stardust: 0,
  unlocks: ['star', 'planet', 'moon'],
  discoveries: [],
  rewardedIntentions: {},
};
const COLOR_MODES = new Set(['uniform', 'bybody', 'speed', 'energy', 'distance', 'age', 'orbital', 'gravity']);
const COLLISION_MODES = new Set(['ignore', 'merge', 'bounce', 'destroy']);

export function decodeSystemSnapshot(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || !Array.isArray(parsed.attractors)) return { status: 'invalid', error: 'Invalid system data' };
    if (parsed.camera !== undefined) {
      const numericCameraFields = ['x', 'y', 'zoom'];
      if (!parsed.camera || numericCameraFields.some(key => !Number.isFinite(parsed.camera[key]))) {
        throw new Error('Invalid camera data');
      }
    }
    if (parsed.gravityStrength !== undefined && (!Number.isFinite(parsed.gravityStrength) || parsed.gravityStrength < 0.1 || parsed.gravityStrength > 3)) {
      throw new Error('Invalid gravity strength');
    }
    if (parsed.colorMode !== undefined && !COLOR_MODES.has(parsed.colorMode)) throw new Error('Invalid color mode');
    if (parsed.collisionMode !== undefined && !COLLISION_MODES.has(parsed.collisionMode)) throw new Error('Invalid collision mode');
    const attractors = parsed.attractors.map((body, index) => {
      const numeric = ['x', 'y', 'vx', 'vy', 'mass'];
      if (!body || numeric.some(key => !Number.isFinite(body[key]))) throw new Error(`Invalid body ${index + 1}`);
      return {
        ...body,
        gardenStage: body.gardenStage || 'young',
        stageAge: Number.isFinite(body.stageAge) ? body.stageAge : 0,
        stableFor: Number.isFinite(body.stableFor) ? body.stableFor : 0,
        appearanceSeed: Number.isFinite(body.appearanceSeed) ? body.appearanceSeed : ((body.id || index + 1) * 2654435761) >>> 0,
        ringStrength: Number.isFinite(body.ringStrength) ? body.ringStrength : 0,
      };
    });
    return { status: 'ok', value: { ...parsed, version: SYSTEM_SCHEMA_VERSION, attractors } };
  } catch (error) {
    return { status: 'invalid', error: error.message || 'Invalid system data' };
  }
}

export function saveSystemSnapshot(snapshot) {
  try { localStorage.setItem(SYSTEM_KEY, JSON.stringify({ ...snapshot, version: SYSTEM_SCHEMA_VERSION })); return true; }
  catch (e) { return false; }
}

export function loadSystemSnapshotResult() {
  try {
    const raw = localStorage.getItem(SYSTEM_KEY);
    return raw === null ? { status: 'missing' } : decodeSystemSnapshot(raw);
  } catch (error) {
    return { status: 'invalid', error: error.message || 'Invalid system data' };
  }
}

export function loadSystemSnapshot() {
  const result = loadSystemSnapshotResult();
  return result.status === 'ok' ? result.value : null;
}

function sanitizeGardenProgress(progress) {
  const source = progress && typeof progress === 'object' && !Array.isArray(progress) ? progress : {};
  const rewarded = source.rewardedIntentions && typeof source.rewardedIntentions === 'object' && !Array.isArray(source.rewardedIntentions)
    ? Object.fromEntries(Object.entries(source.rewardedIntentions)
      .filter(([key]) => typeof key === 'string')
      .map(([key, value]) => [key, value === true ? 1 : (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)])
      .filter(([, value]) => value > 0))
    : {};
  const savedUnlocks = Array.isArray(source.unlocks)
    ? source.unlocks.filter(value => typeof value === 'string')
    : [];
  return {
    stardust: Number.isFinite(source.stardust) && source.stardust >= 0 ? source.stardust : DEFAULT_GARDEN_PROGRESS.stardust,
    unlocks: [...new Set([...DEFAULT_GARDEN_PROGRESS.unlocks, ...savedUnlocks])],
    discoveries: Array.isArray(source.discoveries) ? source.discoveries.filter(value => typeof value === 'string') : [],
    rewardedIntentions: rewarded,
  };
}

export function saveGardenProgress(progress) {
  try { localStorage.setItem(GARDEN_PROGRESS_KEY, JSON.stringify(sanitizeGardenProgress(progress))); return true; }
  catch (e) { return false; }
}

export function loadGardenProgress() {
  try {
    const raw = localStorage.getItem(GARDEN_PROGRESS_KEY);
    return sanitizeGardenProgress(raw ? JSON.parse(raw) : DEFAULT_GARDEN_PROGRESS);
  } catch (e) {
    return sanitizeGardenProgress(DEFAULT_GARDEN_PROGRESS);
  }
}

export function saveFavorite(name, config) {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ name, config, ts: Date.now() });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch (e) {}
}
export function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
