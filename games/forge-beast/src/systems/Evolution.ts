import type { GameState, SpeciesId } from '../creatures/Creature';
import { TIMING } from '../data/config';
import { EVENT_TIMING } from '../data/events';
import { assignPersonality, personalityProfile, type RandomSource } from './PersonalitySystem';
/** Existing care signatures are retained; temperament and wellbeing resolve softer branches. */
export const EVOLUTION_BRANCHES: { species: SpeciesId; matches: (s: GameState) => boolean }[] = [
  { species: 'bramblejaw', matches: s => s.development.careMistakes >= 3 || s.development.overfeeding >= 4 || s.development.neglectTime > 55 || s.stats.health < 30 },
  { species: 'cragox', matches: s => s.development.trainingSessions >= 5 && s.stats.training >= 45 && s.development.careMistakes < 3 },
  { species: 'zephlet', matches: s => s.development.playSessions >= 5 && s.development.trainingSessions >= 2 && s.stats.hunger > 30 },
  { species: 'runewisp', matches: s => s.stats.mood >= 60 && s.development.successfulInteractions >= 4 && s.development.careMistakes <= 1 },
];
export function evolutionScores(state: GameState): Record<string, number> {
  const d = state.development;
  const scores = {
    cragox: d.trainingSessions * 2 + state.stats.discipline / 25,
    zephlet: d.playSessions * 2 + state.stats.energy / 40,
    runewisp: state.stats.mood / 25 + d.consistencyTime / 90 - d.careMistakes * 2,
    bramblejaw: d.careMistakes * 3 + d.exhaustedTraining * 2 + (100 - state.stats.health) / 20,
  };
  const affinity = { brute: 'cragox', agile: 'zephlet', mystic: 'runewisp', wild: 'bramblejaw' } as const;
  scores[affinity[personalityProfile(state).affinity]] += 2;
  return scores;
}
export function chooseEvolution(state: GameState): SpeciesId {
  const branch = EVOLUTION_BRANCHES.find(b => b.matches(state));
  if (branch) return branch.species;
  const scores = evolutionScores(state);
  return (Object.keys(scores) as SpeciesId[]).sort((a, b) => scores[b] - scores[a])[0];
}
export function hatch(state: GameState, random: RandomSource = Math.random) {
  if (state.stage !== 'egg') return false;
  state.stage = 'baby'; state.species = 'pipkin'; state.stageAge = 0;
  assignPersonality(state, random);
  state.life.nextEventAge = state.age + EVENT_TIMING.initialDelay;
  state.life.lastInteractionAge = state.age;
  return true;
}
export function evolve(state: GameState, forced?: SpeciesId) {
  if (state.stage !== 'baby') return false;
  if (forced && ['cinder-egg', 'pipkin'].includes(forced)) return false;
  state.species = forced ?? chooseEvolution(state); state.stage = 'evolved'; state.stageAge = 0; state.sleeping = false;
  state.life.sleepStartedAge = null; state.life.sleepUntilAge = 0;
  return true;
}
export function progressLifecycle(state: GameState, random: RandomSource = Math.random): 'hatch' | 'evolution' | null {
  if (state.stage === 'egg' && state.stageAge >= TIMING.hatch) { hatch(state, random); return 'hatch'; }
  if (state.stage === 'baby' && state.stageAge >= TIMING.evolution) { evolve(state); return 'evolution'; }
  return null;
}
