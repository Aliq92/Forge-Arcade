import type { GameState } from '../creatures/Creature';
import { TIMING } from '../data/config';
import { personalityProfile } from './PersonalitySystem';
import { changeStats } from './StatValues';
import { recordMoment } from './EventHistory';
export type CareMistake = 'ignoredHunger' | 'overfeeding' | 'exhaustedTraining' | 'missedSleep' | 'neglectedMood';
const MISTAKE_TEXT: Record<CareMistake, string> = {
  ignoredHunger: '{name} waited too long for food.',
  overfeeding: '{name} had more than their belly wanted.',
  exhaustedTraining: '{name} was pushed to train while exhausted.',
  missedSleep: '{name} needed rest for too long.',
  neglectedMood: '{name} felt forgotten for a while.',
};
export function recordCareMistake(state: GameState, kind: CareMistake) {
  state.development[kind]++;
  state.development.careMistakes++;
  state.development.lastMistakeAge = state.age;
  recordMoment(state, kind, 'care', MISTAKE_TEXT[kind]);
}
/** Continuous unmet-need timers survive saves; a recovered need clears its timer. */
export function updateNeeds(state: GameState, seconds: number) {
  if (state.stage === 'egg') return;
  const p = personalityProfile(state);
  changeStats(state, {
    hunger: -TIMING.hungerDecay * p.decay.hunger * seconds,
    energy: (state.sleeping ? TIMING.sleepRecovery * p.sleepRecovery : -TIMING.energyDecay * p.decay.energy) * seconds,
    mood: -TIMING.moodDecay * p.decay.mood * seconds * (state.sleeping ? 0.3 : 1),
    discipline: -0.025 * p.decay.discipline * seconds,
  });
  const neglected = {
    hunger: state.stats.hunger < 25,
    energy: state.stats.energy < 20 && !state.sleeping,
    mood: state.stats.mood < 25,
  };
  const mistakes = { hunger: 'ignoredHunger', energy: 'missedSleep', mood: 'neglectedMood' } as const;
  for (const need of ['hunger', 'energy', 'mood'] as const) {
    state.life.needTimers[need] = neglected[need] ? state.life.needTimers[need] + seconds : 0;
    while (state.life.needTimers[need] >= TIMING.mistakeInterval) {
      state.life.needTimers[need] -= TIMING.mistakeInterval;
      recordCareMistake(state, mistakes[need]);
    }
  }
  if (Object.values(neglected).some(Boolean)) {
    state.development.neglectTime += seconds;
    changeStats(state, { health: -0.2 * seconds });
  } else {
    state.development.consistencyTime += seconds;
    if (state.stats.hunger > 40 && state.stats.mood > 40 && (state.sleeping || state.stats.energy > 40)) {
      changeStats(state, { health: 0.12 * seconds });
    }
  }
}
export function careAlert(state: GameState): string | null {
  if (state.stage === 'egg') return null;
  if (state.stats.health < 35) return state.sleeping ? 'Rest, food and company help healing.' : 'Feeling poorly. Gentle care and rest?';
  if (state.sleeping) return null;
  if (state.stats.hunger < 35) return 'A little snack, please?';
  if (state.stats.energy < 30) return 'Time for a little rest.';
  if (state.stats.mood < 35) return 'Could use some company.';
  if (state.stats.discipline < 30) return 'Feeling restless. A gentle routine?';
  if (state.stage === 'baby' && state.stats.training < 15 && state.stageAge > 65) return 'Ready to try something new!';
  return null;
}
