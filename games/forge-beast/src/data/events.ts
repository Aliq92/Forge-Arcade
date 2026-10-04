import type { Behavior, GameState, Stats } from '../creatures/Creature';
export interface LifeEventDefinition {
  id: string;
  label: string;
  trigger: 'ambient' | 'training';
  weight: number;
  cooldown: number;
  eligible: (state: GameState) => boolean;
  effects: Partial<Stats>;
  behavior: Behavior;
  text: string;
  sleep?: 'wake' | 'extend';
}
const asleepFor = (s: GameState) => s.sleeping && s.life.sleepStartedAge !== null ? s.age - s.life.sleepStartedAge : 0;
/** Original small moments; no objects become inventory or affect a later item system. */
export const LIFE_EVENTS: readonly LifeEventDefinition[] = [
  { id: 'refuses-training', label: 'Refuses training', trigger: 'training', weight: 1, cooldown: 30,
    eligible: s => !s.sleeping && (s.stats.discipline < 40 || s.stats.mood < 35),
    effects: { mood: -2 }, behavior: 'upset', text: '{name} refused training. Some company first?' },
  { id: 'asks-food', label: 'Asks for food', trigger: 'ambient', weight: 3, cooldown: 45,
    eligible: s => !s.sleeping && s.stats.hunger < 55,
    effects: {}, behavior: 'hungry', text: '{name} asked for an emberberry.' },
  { id: 'wakes-early', label: 'Wakes early', trigger: 'ambient', weight: 1, cooldown: 75,
    eligible: s => asleepFor(s) >= 15 && s.stats.energy >= 45 && s.stats.energy < 92,
    effects: { mood: 3 }, behavior: 'tired', sleep: 'wake', text: '{name} woke early to watch the little lights.' },
  { id: 'oversleeps', label: 'Oversleeps', trigger: 'ambient', weight: 1, cooldown: 90,
    eligible: s => asleepFor(s) >= 20 && s.stats.energy >= 80,
    effects: { hunger: -3, mood: 2 }, behavior: 'sleep', sleep: 'extend', text: '{name} slept in. One more tiny dream.' },
  { id: 'excited', label: 'Becomes excited', trigger: 'ambient', weight: 2, cooldown: 50,
    eligible: s => !s.sleeping && s.stats.mood >= 55 && s.stats.energy >= 35 && s.stats.health >= 35,
    effects: { mood: 6, energy: -2 }, behavior: 'excited', text: '{name} burst into a little victory dance.' },
  { id: 'found-object', label: 'Finds a shiny pebble', trigger: 'ambient', weight: 1, cooldown: 90,
    eligible: s => !s.sleeping && s.stats.energy >= 35 && s.stats.health >= 35,
    effects: { mood: 7 }, behavior: 'excited', text: '{name} found a shiny pebble, then left it for the stars.' },
  { id: 'lonely', label: 'Feels lonely', trigger: 'ambient', weight: 2, cooldown: 60,
    eligible: s => !s.sleeping && s.stats.mood < 65 && s.age - s.life.lastInteractionAge >= 35,
    effects: { mood: -4 }, behavior: 'upset', text: '{name} looked around for a familiar friend.' },
  { id: 'restless', label: 'Becomes restless', trigger: 'ambient', weight: 1, cooldown: 60,
    eligible: s => !s.sleeping && s.stats.energy >= 40 && (s.stats.discipline < 45 || s.age - s.life.lastInteractionAge >= 60),
    effects: { mood: -2, discipline: -2 }, behavior: 'restless', text: '{name} paced in circles. Time for something new?' },
];
export const EVENT_TIMING = { minInterval: 18, intervalJitter: 12, initialDelay: 15, minimumSleep: 20, extraSleep: 20 } as const;
