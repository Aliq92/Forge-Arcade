/** All durations are active-play seconds. No offline decay; expedition timings live in expeditions.ts. */
export const TIMING = {
  hatch: 45,
  evolution: 240,
  tickMs: 250,
  hungerDecay: 0.16,
  energyDecay: 0.08,
  moodDecay: 0.1,
  sleepRecovery: 1.4,
  mistakeInterval: 25,
  actionCooldown: 1.5,
  feedbackDuration: 3,
} as const;
export const SAVE_VERSION = 2;
// Retain the V0.1 key; Persistence migrates the payload and keeps an original backup.
export const DEFAULT_SAVE_KEY = 'forge-arcade:forge-beast:v1';

