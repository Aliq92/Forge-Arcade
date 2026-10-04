import type { SpeciesId } from '../creatures/Creature';
import type { PersonalityId } from '../data/personalities';
import type { OpponentId } from '../data/opponents';
import type { ZoneId } from '../data/expeditions';
import type { ItemId } from '../data/items';
export const BATTLE_ACTIONS = ['attack', 'guard', 'skill', 'run'] as const;
export type BattleAction = typeof BATTLE_ACTIONS[number];
export type BattleOutcome = 'victory' | 'defeat' | 'escape';
export type BattleAnimation = 'entry' | 'attack' | 'guard' | 'skill' | 'hit' | 'critical' | 'dodge' | 'victory' | 'defeat' | 'escape';
export interface Combatant {
  hp: number; maxHP: number; attack: number; defense: number; speed: number;
  stamina: number; maxStamina: number; shield: number; dodgeBoost: number;
}
export interface Encounter {
  opponent: OpponentId; rare: boolean; hostile: boolean; optional: boolean;
  zone: ZoneId | null; age: number; timestamp: number;
}
export interface BattleBeat {
  actor: 'player' | 'enemy' | 'system'; animation: BattleAnimation; text: string;
  playerHP: number; enemyHP: number; playerStamina: number; enemyStamina: number;
}
export interface ActiveBattle {
  opponent: OpponentId; playerSpecies: Exclude<SpeciesId, 'cinder-egg'>; personality: PersonalityId;
  rare: boolean; player: Combatant; enemy: Combatant;
  turn: number; failedRuns: number; startedAge: number; startedAt: number;
  status: 'ongoing' | BattleOutcome; beats: BattleBeat[]; beatStartedAge: number;
}
export interface BattleSummary {
  opponent: OpponentId; playerSpecies: Exclude<SpeciesId, 'cinder-egg'>; rare: boolean;
  outcome: BattleOutcome; turns: number; startedAt: number; endedAt: number; age: number;
  item: ItemId | null; stored: boolean; message: string;
}
export interface CombatState {
  encounter: Encounter | null; active: ActiveBattle | null; result: BattleSummary | null;
  statistics: { started: number; wins: number; losses: number; escapes: number; declined: number };
  discoveries: Partial<Record<OpponentId, { encountered: number; defeated: number }>>;
  history: BattleSummary[];
}
export function createCombat(): CombatState {
  return {encounter:null,active:null,result:null,statistics:{started:0,wins:0,losses:0,escapes:0,declined:0},discoveries:{},history:[]};
}
