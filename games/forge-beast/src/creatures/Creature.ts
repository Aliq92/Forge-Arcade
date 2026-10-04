import { SAVE_VERSION } from '../data/config';
import { createCombat, type CombatState } from '../battle/BattleState';
import { createExploration, type ExplorationState } from './Exploration';
import type { PersonalityId } from '../data/personalities';
export type Stage = 'egg' | 'baby' | 'evolved';
export type SpeciesId = 'cinder-egg' | 'pipkin' | 'cragox' | 'zephlet' | 'runewisp' | 'bramblejaw';
export type Behavior = 'idle' | 'feed' | 'train' | 'play' | 'sleep' | 'celebrate' | 'upset' | 'hungry' | 'tired' | 'happy' | 'sick' | 'excited' | 'restless';
export interface Stats {
  hunger: number; energy: number; mood: number; training: number;
  discipline: number; health: number;
}
export interface Development {
  careMistakes: number; overfeeding: number; trainingSessions: number;
  missedSleep: number; successfulInteractions: number; neglectTime: number;
  playSessions: number; consistencyTime: number; lastMistakeAge: number;
  ignoredHunger: number; exhaustedTraining: number; neglectedMood: number;
}
export interface LifeEntry {
  eventId: string;
  kind: 'action' | 'life' | 'care' | 'lifecycle';
  message: string;
  age: number;
  timestamp: number;
}
export interface LifeState {
  nextEventAge: number;
  cooldowns: Record<string, number>;
  sleepStartedAge: number | null;
  sleepUntilAge: number;
  lastInteractionAge: number;
  needTimers: { hunger: number; energy: number; mood: number };
}
export interface GameState {
  version: number; species: SpeciesId; stage: Stage; age: number; stageAge: number;
  stats: Stats; development: Development; sleeping: boolean; muted: boolean; hapticsEnabled: boolean;
  createdAt: number; savedAt: number; lastActionAge: number;
  careHistory: { action: string; age: number }[];
  personality: PersonalityId | null;
  eventHistory: LifeEntry[];
  life: LifeState;
  exploration: ExplorationState;
  combat: CombatState;
}
export const SPECIES: Record<SpeciesId, { name: string; type: string; description: string }> = {
  'cinder-egg': { name: 'Cinder egg', type: 'Unhatched', description: 'A warm little shell. Something inside is finding its spark.' },
  pipkin: { name: 'Pipkin', type: 'Baby', description: 'A curious little spark with oversized ears and a lot to learn.' },
  cragox: { name: 'Cragox', type: 'Brute', description: 'A steadfast stonehorn. Every small effort built something strong.' },
  zephlet: { name: 'Zephlet', type: 'Agile', description: 'Quick feet, bright eyes. A restless little wind with a playful heart.' },
  runewisp: { name: 'Runewisp', type: 'Mystic', description: 'A quiet keeper of emberlight. Trust has a magic all its own.' },
  bramblejaw: { name: 'Bramblejaw', type: 'Wild', description: 'An untamed thicket spirit. There is beauty in the unexpected.' },
};
export function createCreature(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION, species: 'cinder-egg', stage: 'egg', age: 0, stageAge: 0,
    stats: { hunger: 78, energy: 85, mood: 75, training: 0, discipline: 55, health: 100 },
    development: {
      careMistakes: 0, overfeeding: 0, trainingSessions: 0, missedSleep: 0,
      successfulInteractions: 0, neglectTime: 0, playSessions: 0, consistencyTime: 0,
      lastMistakeAge: 0, ignoredHunger: 0, exhaustedTraining: 0, neglectedMood: 0,
    },
    sleeping: false, muted: false, hapticsEnabled: false, createdAt: now, savedAt: now, lastActionAge: -100,
    careHistory: [], personality: null, eventHistory: [], exploration: createExploration(), combat: createCombat(),
    life: {
      nextEventAge: 0, cooldowns: {}, sleepStartedAge: null, sleepUntilAge: 0,
      lastInteractionAge: 0, needTimers: { hunger: 0, energy: 0, mood: 0 },
    },
  };
}
