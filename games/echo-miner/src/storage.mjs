import { STORAGE_KEY } from './config.mjs';

export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

/** Feature-detects a real, writable localStorage; falls back to an in-memory stand-in. */
export function detectStorage() {
  try {
    const probe = '__echoMinerProbe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
}

export function safeLoad(key, fallback, storage) {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function safeSave(key, value, storage) {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function defaultRecords() {
  return {
    version: 1,
    settings: { sound: true, vibration: true },
    byDifficulty: {
      survey: { bestTimeSeconds: null, highestHaul: 0 },
      descent: { bestTimeSeconds: null, highestHaul: 0 },
      abyss: { bestTimeSeconds: null, highestHaul: 0 },
    },
  };
}

export function loadRecords(storage) {
  const loaded = safeLoad(STORAGE_KEY, null, storage);
  const base = defaultRecords();
  if (!loaded || typeof loaded !== 'object') return base;
  return {
    ...base,
    ...loaded,
    settings: { ...base.settings, ...(loaded.settings ?? {}) },
    byDifficulty: {
      survey: { ...base.byDifficulty.survey, ...(loaded.byDifficulty?.survey ?? {}) },
      descent: { ...base.byDifficulty.descent, ...(loaded.byDifficulty?.descent ?? {}) },
      abyss: { ...base.byDifficulty.abyss, ...(loaded.byDifficulty?.abyss ?? {}) },
    },
  };
}

/** Only replaces a difficulty's best time with a faster one, and its haul with a larger one. */
export function recordResult(result, storage) {
  const current = loadRecords(storage);
  const bucket = current.byDifficulty[result.difficulty] ?? { bestTimeSeconds: null, highestHaul: 0 };

  const bestTimeSeconds =
    bucket.bestTimeSeconds === null || result.timeSeconds < bucket.bestTimeSeconds
      ? result.timeSeconds
      : bucket.bestTimeSeconds;
  const highestHaul = Math.max(bucket.highestHaul, result.crystals);

  const updated = {
    ...current,
    byDifficulty: { ...current.byDifficulty, [result.difficulty]: { bestTimeSeconds, highestHaul } },
  };
  safeSave(STORAGE_KEY, updated, storage);
  return updated;
}

export function saveSettings(settings, storage) {
  const current = loadRecords(storage);
  const updated = { ...current, settings: { ...current.settings, ...settings } };
  safeSave(STORAGE_KEY, updated, storage);
  return updated;
}

