import { SPECIES, type GameState, type SpeciesId, type Stage } from '../creatures/Creature';
import { careAlert } from '../systems/Stats';
export interface ForgeBeastSummary {
  readonly gameId: 'forge-beast';
  readonly displayName: 'Forge Beast';
  readonly hasSave: boolean;
  readonly creatureName: string | null;
  readonly species: SpeciesId | null;
  readonly lifeStage: Stage | null;
  readonly hungerState: string;
  readonly moodState: string;
  readonly energyState: string;
  readonly healthState: string;
  readonly sleeping: boolean;
  readonly attentionNeeded: boolean;
  readonly activeExpedition: boolean;
  readonly activeBattle: boolean;
  readonly pendingEncounter: boolean;
  readonly lastPlayedAt: number | null;
}
const word = (value: number, words: readonly string[]) => words[value < 35 ? 0 : value < 70 ? 1 : 2];
/** Detached qualitative data only; no hidden stats, temperament, formulas or histories. */
export function stateSummary(state: GameState | null, hasSave: boolean): ForgeBeastSummary {
  return Object.freeze({
    gameId: 'forge-beast', displayName: 'Forge Beast', hasSave,
    creatureName: state ? SPECIES[state.species].name : null,
    species: state?.species ?? null, lifeStage: state?.stage ?? null,
    hungerState: state ? word(state.stats.hunger, ['Hungry', 'Peckish', 'Content']) : 'Unknown',
    moodState: state ? word(state.stats.mood, ['Lonely', 'Okay', 'Happy']) : 'Unknown',
    energyState: state ? word(state.stats.energy, ['Spent', 'Sleepy', 'Ready']) : 'Unknown',
    healthState: state ? word(state.stats.health, ['Poorly', 'Worn', 'Well']) : 'Unknown',
    sleeping: state?.sleeping ?? false,
    attentionNeeded: state ? !!careAlert(state) : false,
    activeExpedition: !!state?.exploration.active,
    activeBattle: state?.combat.active?.status === 'ongoing',
    pendingEncounter: !!state?.combat.encounter,
    lastPlayedAt: hasSave ? state?.savedAt ?? null : null,
  });
}
