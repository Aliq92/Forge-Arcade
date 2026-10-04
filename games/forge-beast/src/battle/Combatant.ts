import type { GameState } from '../creatures/Creature';
import type { Combatant } from './BattleState';
import { BATTLE, COMBAT_SPECIES, COMBAT_PERSONALITIES } from '../data/battleBalance';
import { OPPONENTS, type OpponentId } from '../data/opponents';
export function playerCombatant(state: GameState): Combatant | null {
  if (state.stage === 'egg' || state.species === 'cinder-egg') return null;
  const base=COMBAT_SPECIES[state.species], p=COMBAT_PERSONALITIES[state.personality ?? 'calm'];
  const hp=Math.round(base.hp * (BATTLE.healthHPBase+BATTLE.healthHPScale*state.stats.health/100));
  const stamina=Math.round(base.stamina*(BATTLE.energyStaminaBase+BATTLE.energyStaminaScale*state.stats.energy/100));
  const mood=state.personality==='playful' ? BATTLE.playfulMoodBase+BATTLE.playfulMoodScale*state.stats.mood/100 : BATTLE.moodBase+BATTLE.moodScale*state.stats.mood/100;
  const energy=BATTLE.energyAttackBase+BATTLE.energyAttackScale*state.stats.energy/100;
  const hunger=state.stats.hunger<BATTLE.hungryThreshold ? BATTLE.hungryPenalty : 1;
  const training=state.stats.training*BATTLE.trainingAttack+Math.min(BATTLE.maxSessionBonus,state.development.trainingSessions*BATTLE.sessionsAttack);
  return {hp,maxHP:hp,attack:(base.attack+training)*energy*mood*hunger*p.attack,
    defense:base.defense*(BATTLE.healthHPBase+BATTLE.healthHPScale*state.stats.health/100),speed:base.speed*p.speed,
    stamina,maxStamina:stamina,shield:0,dodgeBoost:0};
}
export function enemyCombatant(id: OpponentId, stage: GameState['stage'], rare: boolean): Combatant {
  const base=OPPONENTS[id], boost=rare?BATTLE.rareEnemyBoost:1;
  const hp=Math.round(base.hp*boost*(stage==='baby'?BATTLE.babyEnemyHP:1));
  return {hp,maxHP:hp,attack:base.attack*boost*(stage==='baby'?BATTLE.babyEnemyAttack:1),defense:base.defense,speed:base.speed,
    stamina:base.stamina,maxStamina:base.stamina,shield:0,dodgeBoost:0};
}
