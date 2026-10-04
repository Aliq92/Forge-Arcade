import { SPECIES, type Behavior, type GameState } from '../creatures/Creature';
import { EVENT_TIMING, LIFE_EVENTS, type LifeEventDefinition } from '../data/events';
import { personalityProfile, randomUnit, type RandomSource } from './PersonalitySystem';
import { changeStats } from './StatValues';
import { recordMoment } from './EventHistory';
export interface EventResult { id: string; message: string; behavior: Behavior }
export function wakeCreature(state: GameState, refreshed = false) {
  state.sleeping = false; state.life.sleepStartedAge = null; state.life.sleepUntilAge = 0;
  if (refreshed) changeStats(state, { mood: 4, health: 2 });
}
function applyEvent(state: GameState, event: LifeEventDefinition): EventResult {
  changeStats(state, event.effects);
  if (event.sleep === 'wake') wakeCreature(state);
  if (event.sleep === 'extend') state.life.sleepUntilAge = state.age + EVENT_TIMING.extraSleep;
  state.life.cooldowns[event.id] = state.age + event.cooldown;
  recordMoment(state, event.id, 'life', event.text);
  return { id: event.id, message: event.text.replace('{name}', SPECIES[state.species].name), behavior: event.behavior };
}
function available(state: GameState, event: LifeEventDefinition) {
  return state.stage !== 'egg' && state.age >= (state.life.cooldowns[event.id] ?? 0) && event.eligible(state);
}
export function tryTrainingRefusal(state: GameState, random: RandomSource): EventResult | null {
  const event = LIFE_EVENTS.find(e => e.id === 'refuses-training')!;
  return available(state, event) && randomUnit(random) < personalityProfile(state).refusalChance ? applyEvent(state, event) : null;
}
export function updateLifeEvents(state: GameState, random: RandomSource): EventResult | null {
  if (state.stage === 'egg') return null;
  let result: EventResult | null = null;
  if (state.age >= state.life.nextEventAge) {
    state.life.nextEventAge = state.age + EVENT_TIMING.minInterval + randomUnit(random) * EVENT_TIMING.intervalJitter;
    const profile = personalityProfile(state);
    const events = LIFE_EVENTS.filter(e => e.trigger === 'ambient' && available(state, e));
    if (events.length && randomUnit(random) < profile.eventChance) {
      const weight = (event: LifeEventDefinition) => event.weight * (profile.eventWeights[event.id] ?? 1);
      let cursor = randomUnit(random) * events.reduce((sum, e) => sum + weight(e), 0);
      const selected = events.find(e => { cursor -= weight(e); return cursor < 0; }) ?? events.at(-1)!;
      result = applyEvent(state, selected);
    }
  }
  const sleepAge = state.life.sleepStartedAge === null ? 0 : state.age - state.life.sleepStartedAge;
  if (!result && state.sleeping && state.stats.energy >= 98 && sleepAge >= EVENT_TIMING.minimumSleep && state.age >= state.life.sleepUntilAge) {
    wakeCreature(state, true);
    recordMoment(state, 'woke-refreshed', 'life', '{name} woke up refreshed.');
    result = { id: 'woke-refreshed', message: `${SPECIES[state.species].name} woke up refreshed.`, behavior: 'happy' };
  }
  return result;
}
export function triggerLifeEvent(state: GameState, id: string, force = false): EventResult | null {
  const event = LIFE_EVENTS.find(e => e.id === id);
  if (!event || state.stage === 'egg' || (!force && !available(state, event))) return null;
  if (force && event.sleep) {
    state.sleeping = true;
    state.life.sleepStartedAge = Math.max(0, state.age - EVENT_TIMING.minimumSleep);
  }
  return applyEvent(state, event);
}
