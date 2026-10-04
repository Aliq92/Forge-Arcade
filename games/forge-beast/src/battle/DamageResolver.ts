import { BATTLE } from '../data/battleBalance';
import type { Combatant } from './BattleState';
import { randomUnit, type RandomSource } from '../systems/PersonalitySystem';
export interface DamageOptions { power?: number; guard?: number; evasion?: number; critical?: boolean; attackBoost?: number }
/** Controlled variance, bounded criticals, and a per-hit ceiling prevent one-hit knockouts. */
export function resolveDamage(attacker: Combatant, defender: Combatant, random: RandomSource, options: DamageOptions = {}) {
  const dodge=randomUnit(random)<(options.evasion??0)+defender.dodgeBoost;
  defender.dodgeBoost=0;
  if(dodge)return {damage:0,critical:false,dodged:true};
  const critical=options.critical??(randomUnit(random)<BATTLE.criticalChance);
  const variance=1-BATTLE.variance+randomUnit(random)*BATTLE.variance*2;
  const base=attacker.attack*(options.attackBoost??1)*BATTLE.damageScale*(options.power??1)-defender.defense*BATTLE.defenseScale;
  const guarded=1-(options.guard??0), shielded=1-defender.shield;
  defender.shield=0;
  const damage=Math.max(1,Math.min(Math.floor(defender.maxHP*BATTLE.maxHitFraction),Math.round(Math.max(BATTLE.minDamage,base)*variance*(critical?BATTLE.criticalMultiplier:1)*guarded*shielded)));
  return {damage,critical,dodged:false};
}
