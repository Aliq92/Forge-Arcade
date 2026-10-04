import { SKILLS } from '../data/skills';
import { BATTLE, COMBAT_PERSONALITIES } from '../data/battleBalance';
import type { ActiveBattle } from './BattleState';
import { randomUnit, type RandomSource } from '../systems/PersonalitySystem';
export function useBattleSkill(battle: ActiveBattle, random: RandomSource) {
  const skill=SKILLS[battle.playerSpecies];
  if(battle.player.stamina<skill.cost)return null;
  battle.player.stamina-=skill.cost;
  battle.player.shield=skill.shield;battle.player.dodgeBoost=skill.dodge;
  const spark=randomUnit(random)<COMBAT_PERSONALITIES[battle.personality].skillSpark;
  if(spark)battle.player.stamina=Math.min(battle.player.maxStamina,battle.player.stamina+1);
  return {name:skill.name,power:skill.power+(skill.powerRange??0)*randomUnit(random)+(spark?BATTLE.curiousPower:0),spark};
}
