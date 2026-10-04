import { expeditionEncounter } from '../battle/EncounterSystem';
import { SPECIES, type GameState } from '../creatures/Creature';
import { EXPEDITION_LIMITS, EXPEDITION_PERSONALITIES, ZONES, ZONE_IDS, OUTCOMES, OUTCOME_IDS, type ZoneId, type OutcomeId } from '../data/expeditions';
import { randomUnit, type RandomSource } from './PersonalitySystem';
import { changeStats } from './StatValues';
import { recordMoment } from './EventHistory';
import { discover } from './DiscoverySystem';
import { TIMING } from '../data/config';
export function expeditionEnergy(state: GameState, zone: ZoneId) {
  return Math.ceil(ZONES[zone].energy * EXPEDITION_PERSONALITIES[state.personality ?? 'calm'].energy);
}
export function expeditionBlock(state: GameState, zone: ZoneId): string | null {
  if (!ZONE_IDS.includes(zone)) return 'That path is not available.';
  if (state.combat.encounter || state.combat.active || state.combat.result) return 'Finish the wild encounter first.';
  if (state.stage === 'egg') return 'Hatch first. A whole world is waiting.';
  if (state.sleeping) return 'Shhh… your beast is resting.';
  if (state.exploration.active) return 'Already on an adventure. Wait for their return.';
  if (state.exploration.result) return 'Meet your returning beast before the next trip.';
  if (state.stats.health < EXPEDITION_LIMITS.minHealth) return 'Feeling poorly. Gentle care before exploring.';
  if (state.stats.hunger < EXPEDITION_LIMITS.minHunger) return 'A hungry belly needs food before a journey.';
  if (state.stats.energy < expeditionEnergy(state, zone) + EXPEDITION_LIMITS.energyReserve) return 'Too sleepy for this path. Rest first.';
  if (state.age - state.lastActionAge < TIMING.actionCooldown) return 'One little moment…';
  return null;
}
export function startExpedition(state: GameState, zone: ZoneId, random: RandomSource = Math.random) {
  const blocked = expeditionBlock(state, zone);
  if (blocked) return { success: false, message: blocked };
  const temperament = EXPEDITION_PERSONALITIES[state.personality ?? 'calm'];
  const detoured = zone !== 'greenfield' && temperament.detourChance > 0 && randomUnit(random) < temperament.detourChance;
  const actual = detoured ? 'greenfield' : zone;
  const energyCost = expeditionEnergy(state, actual);
  state.exploration.active = { zone: actual, requestedZone: zone, startedAge: state.age, endsAge: state.age + ZONES[actual].duration, startedAt: Date.now(), energyCost, detoured };
  state.exploration.statistics.started++;
  changeStats(state, { energy: -energyCost });
  state.lastActionAge = state.age; state.life.lastInteractionAge = state.age;
  const message = detoured ? `${SPECIES[state.species].name} chose their own path to Greenfield.` : `${SPECIES[state.species].name} explored ${ZONES[zone].name}.`;
  recordMoment(state, 'expedition:depart', 'life', message);
  return { success: true, message };
}
export function outcomeWeights(state: GameState, zone: ZoneId) {
  const p = EXPEDITION_PERSONALITIES[state.personality ?? 'calm'];
  return OUTCOME_IDS.map(id => {
    const outcome = OUTCOMES[id];
    let weight = ZONES[zone].weights[id];
    if (zone !== 'greenfield') weight *= outcome.failed ? p.riskyFailure : p.riskySuccess;
    if (outcome.rare || outcome.unusual) weight *= p.discovery;
    if (state.stats.energy < 25 && id === 'fatigue') weight *= 1.5;
    return { id, weight };
  });
}
export function selectExpeditionOutcome(state: GameState, zone: ZoneId, random: RandomSource = Math.random): OutcomeId {
  const weights = outcomeWeights(state, zone);
  let draw = randomUnit(random) * weights.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of weights) { draw -= entry.weight; if (draw < 0) return entry.id; }
  return 'nothing';
}
export function completeExpedition(state: GameState, random: RandomSource = Math.random, forced?: OutcomeId, instant = false) {
  const trip = state.exploration.active;
  if (!trip || (!forced && !instant && state.age < trip.endsAge)) return null;
  if (forced && !OUTCOME_IDS.includes(forced)) return null;
  const outcome = forced ?? selectExpeditionOutcome(state, trip.zone, random);
  const result = discover(state, trip, outcome, random);
  state.exploration.active = null;
  state.exploration.result = result;
  expeditionEncounter(state, result.outcome, trip.zone, random);
  return result;
}
