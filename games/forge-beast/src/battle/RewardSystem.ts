import { SPECIES, type GameState } from '../creatures/Creature';
import type { ActiveBattle, BattleOutcome, BattleSummary } from './BattleState';
import { BATTLE } from '../data/battleBalance';
import { OPPONENTS } from '../data/opponents';
import { ITEMS, type ItemId } from '../data/items';
import { randomUnit, type RandomSource } from '../systems/PersonalitySystem';
import { changeStats } from '../systems/StatValues';
import { addItem } from '../systems/InventorySystem';
import { recordMoment } from '../systems/EventHistory';
export function battleReward(battle: ActiveBattle, random: RandomSource): ItemId|null {
  const definition=OPPONENTS[battle.opponent];
  if(randomUnit(random)>Math.min(1,definition.rewardChance+(battle.rare?BATTLE.rewardRareBonus:0)))return null;
  const table=[...definition.rewards,...(battle.rare?[{item:'strange-fragment' as const,weight:2}]:[])];
  let draw=randomUnit(random)*table.reduce((sum,r)=>sum+r.weight,0);
  for(const row of table){draw-=row.weight;if(draw<0)return row.item;}
  return table[0].item;
}
/** Called only on the ongoing -> terminal boundary; rewards/statistics commit together. */
export function settleBattle(state: GameState, battle: ActiveBattle, outcome: BattleOutcome, random: RandomSource): BattleSummary {
  const stats=state.combat.statistics;
  const changes={victory:BATTLE.victory,defeat:BATTLE.defeat,escape:BATTLE.escape};
  changeStats(state,changes[outcome]);
  if(outcome==='victory'){
    stats.wins++;
    const discovered=state.combat.discoveries[battle.opponent];if(discovered)discovered.defeated++;
  }else if(outcome==='defeat')stats.losses++;else stats.escapes++;
  const item=outcome==='victory'?battleReward(battle,random):null, stored=!!item&&addItem(state,item)>0;
  const name=SPECIES[battle.playerSpecies].name;
  let message=outcome==='victory'?`Victory! ${name} learned a little.`:outcome==='defeat'?`${name} needs rest. A setback, a new day.`:'Escaped safely. Back to little adventures.';
  if(item)message+=` ${ITEMS[item].name}${stored?' tucked into Items.':' found; stack full.'}`;
  const summary:BattleSummary={opponent:battle.opponent,playerSpecies:battle.playerSpecies,rare:battle.rare,outcome,turns:battle.turn,startedAt:battle.startedAt,endedAt:Date.now(),age:state.age,item,stored,message};
  state.combat.result=summary;state.combat.history.push(summary);state.combat.history=state.combat.history.slice(-BATTLE.historyLimit);
  state.life.lastInteractionAge=state.age;
  recordMoment(state,`battle:${outcome}`,'life',message);
  return summary;
}
