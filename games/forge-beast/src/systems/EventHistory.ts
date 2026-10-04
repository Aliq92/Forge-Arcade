import { SPECIES, type GameState, type LifeEntry } from '../creatures/Creature';
export const HISTORY_LIMIT = 24;
export function recordMoment(state: GameState, eventId: string, kind: LifeEntry['kind'], text: string) {
  state.eventHistory.push({
    eventId, kind, message: text.replace('{name}', SPECIES[state.species].name),
    age: state.age, timestamp: Date.now(),
  });
  state.eventHistory = state.eventHistory.slice(-HISTORY_LIMIT);
}
