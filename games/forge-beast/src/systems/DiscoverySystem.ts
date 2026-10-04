import { SPECIES, type GameState } from '../creatures/Creature';
import type { ActiveExpedition, ExpeditionResult } from '../creatures/Exploration';
import { OUTCOMES, ZONES, EXPEDITION_LIMITS, EXPEDITION_PERSONALITIES, type OutcomeId } from '../data/expeditions';
import { ITEMS } from '../data/items';
import { addItem } from './InventorySystem';
import { changeStats } from './StatValues';
import { randomUnit, type RandomSource } from './PersonalitySystem';
import { recordMoment } from './EventHistory';
/** Resolve a trip once; ExpeditionSystem owns the active -> completed boundary. */
export function discover(state: GameState, trip: ActiveExpedition, id: OutcomeId, random: RandomSource): ExpeditionResult {
  const outcome = OUTCOMES[id];
  const temperament = EXPEDITION_PERSONALITIES[state.personality ?? 'calm'];
  const effects = { ...outcome.effects };
  if (effects.mood && effects.mood > 0) effects.mood *= temperament.mood;
  if (effects.energy && effects.energy < 0) effects.energy *= temperament.energy;
  changeStats(state, { hunger: -ZONES[trip.zone].hunger, mood: 3 * temperament.mood });
  changeStats(state, effects);
  const item = outcome.items ? outcome.items[Math.floor(randomUnit(random) * outcome.items.length)] : null;
  const stored = item !== null && addItem(state, item) > 0;
  let message = outcome.message.replace('{name}', SPECIES[state.species].name);
  if (item) message = `${SPECIES[state.species].name} found ${ITEMS[item].name === 'Medicine' ? 'some' : 'a'} ${ITEMS[item].name}.${stored ? '' : ' Stack full; left it safely on the trail.'}`;
  recordMoment(state, `expedition:${id}`, 'life', message);
  const result: ExpeditionResult = {
    zone: trip.zone, outcome: id, startedAt: trip.startedAt, returnedAt: Date.now(), returnedAge: state.age,
    message, item, stored, rare: !!outcome.rare, failed: !!outcome.failed,
  };
  state.exploration.discoveries.push(result);
  state.exploration.discoveries = state.exploration.discoveries.slice(-EXPEDITION_LIMITS.history);
  const stats = state.exploration.statistics;
  stats.completed++; stats.zones[trip.zone]++;
  if (result.rare) stats.rare++;
  if (result.failed) stats.failed++;
  return result;
}
