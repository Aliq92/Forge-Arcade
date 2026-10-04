import { AI_WEIGHTS, AI_BALANCE, OPPONENTS } from '../data/opponents';
import { BATTLE } from '../data/battleBalance';
import type { ActiveBattle, BattleAction } from './BattleState';
import { randomUnit, type RandomSource } from '../systems/PersonalitySystem';
export function chooseEnemyAction(battle: ActiveBattle, random: RandomSource): Exclude<BattleAction,'run'> {
  const behavior=OPPONENTS[battle.opponent].behavior, weights={...AI_WEIGHTS[behavior]};
  if(battle.enemy.stamina<BATTLE.skillCost){weights.skill=0;weights.guard+=AI_BALANCE.emptyStaminaGuardBonus;}
  if(behavior==='defensive' && battle.enemy.hp/battle.enemy.maxHP<AI_BALANCE.lowHP)weights.guard+=AI_BALANCE.defensiveGuardBonus;
  let draw=randomUnit(random)*(weights.attack+weights.guard+weights.skill);
  for(const action of ['attack','guard','skill'] as const){draw-=weights[action];if(draw<0)return action;}
  return 'attack';
}
