import type { GameState } from '../creatures/Creature';
import { PERSONALITIES, PERSONALITY_IDS, type PersonalityId } from '../data/personalities';
export type RandomSource = () => number;
export function randomUnit(random: RandomSource): number {
  const value = random();
  return Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0.5;
}
/** Assign exactly once on hatch (or when migrating an already-hatched save). */
export function assignPersonality(state: GameState, random: RandomSource = Math.random): PersonalityId | null {
  if (state.stage === 'egg') return null;
  if (!state.personality) state.personality = PERSONALITY_IDS[Math.floor(randomUnit(random) * PERSONALITY_IDS.length)];
  return state.personality;
}
export function personalityProfile(state: GameState) {
  return PERSONALITIES[state.personality ?? 'calm'];
}
