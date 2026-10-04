import type { GameState } from '../creatures/Creature';
import { OPPONENT_IDS, OPPONENTS, type OpponentId } from '../data/opponents';
import type { ZoneId } from '../data/expeditions';
import { randomUnit, type RandomSource } from '../systems/PersonalitySystem';
import { recordMoment } from '../systems/EventHistory';
export const ENCOUNTER_TYPES = ['wild-encounter','rare-encounter','optional-battle','hostile-encounter'] as const;
export const ENCOUNTER_POOLS: Record<ZoneId, readonly OpponentId[]> = {
  greenfield:['flinthop','gloamfin'],'scrap-yard':['tinspindle','flinthop'],'dark-grove':['thornmote','gloamfin'],
};
export function createEncounter(state: GameState, id: OpponentId, rare=false, zone: ZoneId|null=null, type: string='wild-encounter') {
  if(!OPPONENT_IDS.includes(id)||state.stage==='egg'||state.sleeping||state.combat.active||state.combat.encounter||state.combat.result||state.exploration.active)return false;
  state.combat.encounter={opponent:id,rare,hostile:type==='hostile-encounter',optional:type==='optional-battle',zone,age:state.age,timestamp:Date.now()};
  const record=state.combat.discoveries[id]??{encountered:0,defeated:0};record.encountered++;state.combat.discoveries[id]=record;
  recordMoment(state,`encounter:${id}`,'life',`{name} encountered ${rare?'a rare ':''}${OPPONENTS[id].name}.`);
  return true;
}
export function expeditionEncounter(state: GameState, type: string, zone: ZoneId, random: RandomSource) {
  if(!ENCOUNTER_TYPES.includes(type as never))return false;
  const pool=ENCOUNTER_POOLS[zone], id=pool[Math.floor(randomUnit(random)*pool.length)];
  return createEncounter(state,id,type==='rare-encounter',zone,type);
}
export function declineEncounter(state: GameState) {
  if(!state.combat.encounter)return false;
  recordMoment(state,'encounter:retreat','life','{name} took a quiet path around the encounter.');
  state.combat.encounter=null;state.combat.statistics.declined++;return true;
}
