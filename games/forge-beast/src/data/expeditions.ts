import type { Stats } from '../creatures/Creature';
import type { PersonalityId } from './personalities';
import type { ItemId } from './items';
export const ZONE_IDS = ['greenfield', 'scrap-yard', 'dark-grove'] as const;
export type ZoneId = typeof ZONE_IDS[number];
export const OUTCOME_IDS = ['common-item', 'food', 'joy', 'training', 'fatigue', 'injury', 'rare-item', 'unusual', 'wild-encounter', 'rare-encounter', 'optional-battle', 'hostile-encounter', 'nothing'] as const;
export type OutcomeId = typeof OUTCOME_IDS[number];
export interface ExpeditionZone {
  name: string;
  risk: 'Low risk' | 'Medium risk' | 'Higher risk';
  energy: number;
  duration: number;
  hunger: number;
  description: string;
  weights: Record<OutcomeId, number>;
}
/** Development timings, in active seconds. Production durations can change here. */
export const ZONES: Record<ZoneId, ExpeditionZone> = {
  greenfield: { name: 'Greenfield', risk: 'Low risk', energy: 8, duration: 20, hunger: 3, description: 'Soft paths. Simple little finds.', weights: { 'common-item': 20, food: 35, joy: 20, training: 8, fatigue: 5, injury: 0, 'rare-item': 1, unusual: 2, 'wild-encounter': 12, 'rare-encounter': 1, 'optional-battle': 6, 'hostile-encounter': 1, nothing: 9 } },
  'scrap-yard': { name: 'Scrap Yard', risk: 'Medium risk', energy: 16, duration: 30, hunger: 5, description: 'Old machines. Useful surprises.', weights: { 'common-item': 32, food: 12, joy: 10, training: 20, fatigue: 8, injury: 6, 'rare-item': 3, unusual: 4, 'wild-encounter': 14, 'rare-encounter': 3, 'optional-battle': 8, 'hostile-encounter': 5, nothing: 5 } },
  'dark-grove': { name: 'Dark Grove', risk: 'Higher risk', energy: 25, duration: 40, hunger: 8, description: 'Deep shade. Strange little sparks.', weights: { 'common-item': 10, food: 8, joy: 7, training: 10, fatigue: 17, injury: 12, 'rare-item': 12, unusual: 18, 'wild-encounter': 10, 'rare-encounter': 8, 'optional-battle': 6, 'hostile-encounter': 10, nothing: 6 } },
};
export interface ExpeditionOutcome {
  message: string;
  effects: Partial<Stats>;
  items?: readonly ItemId[];
  rare?: boolean;
  unusual?: boolean;
  failed?: boolean;
}
export const OUTCOMES: Record<OutcomeId, ExpeditionOutcome> = {
  'common-item': { message: '{name} spotted something useful.', effects: { mood: 4 }, items: ['toy', 'training-chip', 'medicine'] },
  food: { message: '{name} found a treat for later.', effects: { mood: 3 }, items: ['snack', 'energy-berry'] },
  joy: { message: '{name} chased sunflecks. A happy little outing!', effects: { mood: 14 } },
  training: { message: '{name} mastered a tricky path.', effects: { training: 7, discipline: 3, mood: 3 } },
  fatigue: { message: '{name} returned tired. A little rest?', effects: { energy: -10, mood: -2 }, failed: true },
  injury: { message: '{name} got a small scrape. Gentle care helps.', effects: { health: -10, energy: -5, mood: -4 }, failed: true },
  'rare-item': { message: '{name} found a softly glowing fragment!', effects: { mood: 8 }, items: ['strange-fragment'], rare: true },
  unusual: { message: 'Something strange happened around {name}. The leaves hummed!', effects: { mood: 10, training: 3 }, unusual: true },
  'wild-encounter': { message: '{name} met a wild creature on the trail.', effects: {} },
  'rare-encounter': { message: '{name} noticed a rare wild spark.', effects: {}, rare: true },
  'optional-battle': { message: 'A curious wild creature invited {name} to spar.', effects: {} },
  'hostile-encounter': { message: 'A restless wild creature crossed {name}’s path.', effects: {} },
  nothing: { message: '{name} found nothing this time. Every path has a story.', effects: { mood: 1 } },
};
export interface ExpeditionTemperament {
  energy: number;
  mood: number;
  riskySuccess: number;
  riskyFailure: number;
  discovery: number;
  detourChance: number;
}
export const EXPEDITION_PERSONALITIES: Record<PersonalityId, ExpeditionTemperament> = {
  bold: { energy: 1, mood: 1, riskySuccess: 1.35, riskyFailure: .55, discovery: 1, detourChance: 0 },
  calm: { energy: .75, mood: 1, riskySuccess: 1, riskyFailure: 1, discovery: 1, detourChance: 0 },
  curious: { energy: 1, mood: 1, riskySuccess: 1, riskyFailure: 1, discovery: 2, detourChance: 0 },
  stubborn: { energy: 1, mood: 1, riskySuccess: 1, riskyFailure: 1, discovery: 1, detourChance: .22 },
  playful: { energy: 1, mood: 1.5, riskySuccess: 1, riskyFailure: 1, discovery: 1, detourChance: 0 },
};
export const EXPEDITION_LIMITS = { history: 24, minHealth: 35, minHunger: 25, energyReserve: 10 } as const;
