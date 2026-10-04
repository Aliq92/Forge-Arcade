import { createCombat } from '../battle/BattleState';
import { validCombat } from '../battle/BattleValidation';
import { recoverBattle } from '../battle/BattleSystem';
import { createExploration } from '../creatures/Exploration';
import { validExploration } from './ExplorationValidation';
import { createCreature, type GameState, SPECIES } from '../creatures/Creature';
import { DEFAULT_SAVE_KEY, SAVE_VERSION } from '../data/config';
import { PERSONALITY_IDS } from '../data/personalities';
import { EVENT_TIMING, LIFE_EVENTS } from '../data/events';
import { assignPersonality, type RandomSource } from './PersonalitySystem';
import { HISTORY_LIMIT } from './EventHistory';
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numeric = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const bounded = (v: unknown) => numeric(v) && v <= 100;
const legacyStats = ['hunger', 'energy', 'mood', 'training'];
const legacyCounters = ['careMistakes', 'overfeeding', 'trainingSessions', 'missedSleep', 'successfulInteractions', 'neglectTime', 'playSessions', 'consistencyTime', 'lastMistakeAge'];
function validBase(value: unknown): value is Record<string, unknown> {
  if (!object(value)) return false;
  const s = value;
  return typeof s.species === 'string' && Object.hasOwn(SPECIES, s.species) &&
    ((s.stage === 'egg' && s.species === 'cinder-egg') || (s.stage === 'baby' && s.species === 'pipkin') ||
      (s.stage === 'evolved' && !['pipkin', 'cinder-egg'].includes(s.species))) &&
    numeric(s.age) && numeric(s.stageAge) && s.stageAge <= s.age &&
    typeof s.sleeping === 'boolean' && typeof s.muted === 'boolean' &&
    numeric(s.createdAt) && numeric(s.savedAt) && typeof s.lastActionAge === 'number' && Number.isFinite(s.lastActionAge) &&
    object(s.stats) && legacyStats.every(k => bounded((s.stats as Record<string, unknown>)[k])) &&
    object(s.development) && legacyCounters.every(k => numeric((s.development as Record<string, unknown>)[k])) &&
    Array.isArray(s.careHistory) && s.careHistory.length <= 100 &&
    s.careHistory.every(h => object(h) && typeof h.action === 'string' && h.action.length < 80 && numeric(h.age));
}
export function validState(value: unknown): value is GameState {
  if (!validBase(value) || value.version !== SAVE_VERSION || typeof value.hapticsEnabled !== 'boolean') return false;
  const s = value as unknown as GameState;
  const initial = createCreature();
  return validExploration(s) && validCombat(s) && Object.keys(initial.stats).every(k => bounded(s.stats[k as keyof typeof s.stats])) &&
    Object.keys(initial.development).every(k => numeric(s.development[k as keyof typeof s.development])) &&
    (s.stage === 'egg' ? s.personality === null : PERSONALITY_IDS.includes(s.personality!)) &&
    Array.isArray(s.eventHistory) && s.eventHistory.length <= HISTORY_LIMIT &&
    s.eventHistory.every(e => object(e) && typeof e.eventId === 'string' && e.eventId.length <= 80 &&
      ['action', 'life', 'care', 'lifecycle'].includes(e.kind as string) &&
      typeof e.message === 'string' && e.message.length <= 240 && numeric(e.age) && e.age <= s.age && numeric(e.timestamp)) &&
    object(s.life) && numeric(s.life.nextEventAge) && numeric(s.life.sleepUntilAge) && numeric(s.life.lastInteractionAge) &&
    (s.life.sleepStartedAge === null || (numeric(s.life.sleepStartedAge) && s.life.sleepStartedAge <= s.age)) &&
    (!s.sleeping || s.life.sleepStartedAge !== null) &&
    object(s.life.needTimers) && ['hunger', 'energy', 'mood'].every(k => numeric(s.life.needTimers[k as keyof typeof s.life.needTimers])) &&
    object(s.life.cooldowns) && Object.entries(s.life.cooldowns).every(([k, v]) => LIFE_EVENTS.some(e => e.id === k) && numeric(v));
}
/** Adds only missing compatible fields; existing species, stats, histories and timestamps survive. */
export function migrateSave(value: unknown, random: RandomSource = Math.random): GameState | null {
  if (object(value) && value.version === SAVE_VERSION) {
    const fresh = createCreature(numeric(value.createdAt) ? value.createdAt : Date.now());
    // Only absence is defaulted. Present-but-invalid fields must still fail validation.
    const mergeMissing = (defaults: Record<string, unknown>, input: unknown) =>
      input === undefined ? defaults : object(input) ? { ...defaults, ...input } : input;
    const life = mergeMissing(fresh.life as unknown as Record<string, unknown>, value.life);
    const ready = {
      ...value,
      hapticsEnabled: value.hapticsEnabled === undefined ? false : value.hapticsEnabled,
      stats: mergeMissing(fresh.stats as unknown as Record<string, unknown>, value.stats),
      development: mergeMissing(fresh.development as unknown as Record<string, unknown>, value.development),
      careHistory: value.careHistory === undefined ? [] : value.careHistory,
      eventHistory: value.eventHistory === undefined ? [] : value.eventHistory,
      lastActionAge: value.lastActionAge === undefined ? -100 : value.lastActionAge,
      savedAt: value.savedAt === undefined ? value.createdAt : value.savedAt,
      exploration: value.exploration === undefined ? createExploration() : value.exploration,
      combat: value.combat === undefined ? createCombat() : value.combat,
      life: object(life) ? {
        ...life,
        needTimers: mergeMissing(fresh.life.needTimers, life.needTimers),
      } : life,
      personality: value.personality === undefined ? null : value.personality,
    };
    // Old compatible saves can omit newly introduced personality/life fields.
    if (ready.personality === null && value.personality === undefined && value.stage !== 'egg') {
      assignPersonality(ready as unknown as GameState, random);
    }
    if (value.life === undefined && object(ready.life) && value.sleeping === true) {
      ready.life.sleepStartedAge = value.age;
      ready.life.lastInteractionAge = value.age;
    }
    return validState(ready) ? structuredClone(ready) : null;
  }
  if (!validBase(value) || value.version !== 1) return null;
  const old = value as unknown as GameState;
  const fresh = createCreature(old.createdAt);
  const migrated: GameState = {
    ...fresh, ...structuredClone(old), version: SAVE_VERSION,
    stats: { ...fresh.stats, ...old.stats },
    development: { ...fresh.development, ...old.development },
    personality: null, eventHistory: [],
    life: {
      ...fresh.life, nextEventAge: old.age + EVENT_TIMING.initialDelay,
      sleepStartedAge: old.sleeping ? old.age : null,
      lastInteractionAge: old.age,
    },
  };
  assignPersonality(migrated, random);
  return validState(migrated) ? migrated : null;
}
export type SaveLoadStatus = 'empty' | 'loaded' | 'recovered' | 'invalid' | 'unavailable';
export class Persistence {
  available = true;
  hasSave = false;
  loadStatus: SaveLoadStatus = 'empty';
  error: string | null = null;
  private protectedRaw: string | null = null;
  private pendingLegacyBackup: string | null = null;
  constructor(private storage: SaveStorage | null, private key = DEFAULT_SAVE_KEY, private random: RandomSource = Math.random) {
    this.available = !!storage;
  }
  load(): GameState | null {
    this.error = null; this.hasSave = false; this.protectedRaw = null; this.loadStatus = 'empty';
    let raw: string | null;
    try { raw = this.storage?.getItem(this.key) ?? null; }
    catch { this.available = false; this.loadStatus = 'unavailable'; this.error = 'Storage could not be read.'; return null; }
    if (!raw) return null;
    let state: GameState | null = null;
    try {
      const data: unknown = JSON.parse(raw);
      state = migrateSave(data, this.random);
      if (state && object(data) && data.version === 1) this.pendingLegacyBackup = raw;
    } catch { /* Preserve the original bytes below; never overwrite a bad/future save automatically. */ }
    if (!state) {
      this.protectedRaw = raw; this.available = false; this.loadStatus = 'invalid';
      this.error = 'Saved data could not be loaded. It is preserved; reset explicitly to start again.';
      try {
        const backup = this.storage?.getItem(`${this.key}:backup:v1`);
        if (backup) state = migrateSave(JSON.parse(backup), this.random);
      } catch { /* A broken backup must not overwrite the primary save. */ }
      if (!state) return null;
      this.loadStatus = 'recovered';
    } else this.loadStatus = 'loaded';
    this.hasSave = true; recoverBattle(state); return state;
  }
  save(state: GameState, options: { replaceInvalid?: boolean } = {}) {
    try {
      if (!validState(state)) throw new Error('Refusing to write an invalid game state.');
      if (!this.storage) throw new Error('No storage');
      if (this.protectedRaw !== null) {
        if (!options.replaceInvalid) throw new Error('Original save is protected. Reset explicitly to replace it.');
        // A confirmed reset can replace protected data only after preserving its original bytes.
        this.storage.setItem(`${this.key}:backup:invalid`, this.protectedRaw);
      }
      if (this.pendingLegacyBackup !== null) {
        if (!this.storage.getItem(`${this.key}:backup:v1`)) this.storage.setItem(`${this.key}:backup:v1`, this.pendingLegacyBackup);
      }
      const savedAt = Date.now();
      this.storage.setItem(this.key, JSON.stringify({ ...state, savedAt }));
      state.savedAt = savedAt; this.pendingLegacyBackup = null; this.protectedRaw = null;
      this.available = true; this.hasSave = true; this.error = null; return true;
    } catch (error) {
      this.available = false;
      this.error = error instanceof Error ? error.message : 'Save failed.';
      return false;
    }
  }
  get enabled() { return this.storage !== null; }
  clearResetBackup() {
    this.pendingLegacyBackup = null;
    try { this.storage?.removeItem(`${this.key}:backup:v1`); } catch { /* Primary new egg is already safely saved. */ }
  }
  reset() {
    this.pendingLegacyBackup = null; this.protectedRaw = null; this.hasSave = false;
    try { this.storage?.removeItem(this.key); this.storage?.removeItem(`${this.key}:backup:v1`); }
    catch { this.available = false; }
  }
  dispose() { this.storage = null; this.pendingLegacyBackup = null; this.protectedRaw = null; }
}
