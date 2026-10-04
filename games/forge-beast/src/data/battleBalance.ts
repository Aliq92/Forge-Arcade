import type { PersonalityId } from './personalities';
import type { SpeciesId } from '../creatures/Creature';
export const BATTLE = {
  damageScale: 1.1, defenseScale: .55, minDamage: 3, maxHitFraction: .4,
  variance: .06, criticalChance: .06, criticalMultiplier: 1.35,
  guardReduction: .55, guardRecovery: 3, skillCost: 5, pressureDrain: 2,
  escapeBase: .65, escapeSpeed: .02, escapeMin: .4, escapeMax: .95, escapeRetry: .1,
  minHealth: 20, minEnergy: 12, minHunger: 10, historyLimit: 24,
  trainingAttack: .03, sessionsAttack: .1, maxSessionBonus: 2,
  healthHPBase: .78, healthHPScale: .22, energyAttackBase: .84, energyAttackScale: .16,
  energyStaminaBase: .5, energyStaminaScale: .5, hungryPenalty: .85, hungryThreshold: 20,
  moodBase: .95, moodScale: .1, playfulMoodBase: .9, playfulMoodScale: .2,
  babyEnemyHP: .84, babyEnemyAttack: .9, rareEnemyBoost: 1.08,
  enemySkillPower: 1.25, maxTurns: 16, lowHPThreshold: .35, unpredictableBoost: 1.08, fastEvasion: .03, escapeHPBonus: .05, curiousPower: .08,
  victory: { training: 4, mood: 5, energy: -5 },
  defeat: { health: -8, energy: -10, mood: -5 },
  escape: { energy: -3 },
  rewardRareBonus: .15,
  beatSeconds: { entry: .65, attack: .4, guard: .55, skill: .55, hit: .4, critical: .55, dodge: .5, victory: .9, defeat: .9, escape: .75 },
} as const;
export const COMBAT_SPECIES: Record<Exclude<SpeciesId, 'cinder-egg'>, { hp: number; attack: number; defense: number; speed: number; stamina: number }> = {
  pipkin: { hp: 34, attack: 8, defense: 3, speed: 8, stamina: 12 },
  cragox: { hp: 44, attack: 11, defense: 6, speed: 7, stamina: 16 },
  zephlet: { hp: 38, attack: 10, defense: 4, speed: 13, stamina: 16 },
  runewisp: { hp: 40, attack: 9, defense: 6, speed: 9, stamina: 18 },
  bramblejaw: { hp: 42, attack: 11, defense: 4, speed: 10, stamina: 16 },
};
export const COMBAT_PERSONALITIES: Record<PersonalityId, { attack: number; speed: number; guard: number; evasion: number; escape: number; resistance: number; skillSpark: number; unpredictable: number; lowHP: number }> = {
  bold: { attack: 1.06, speed: 1, guard: 0, evasion: 0, escape: 0, resistance: 1, skillSpark: 0, unpredictable: 0, lowHP: 1.08 },
  calm: { attack: 1, speed: 1, guard: .08, evasion: 0, escape: .03, resistance: 1, skillSpark: 0, unpredictable: 0, lowHP: 1 },
  curious: { attack: 1, speed: 1, guard: 0, evasion: 0, escape: .02, resistance: 1, skillSpark: .18, unpredictable: 0, lowHP: 1 },
  stubborn: { attack: 1, speed: 1, guard: 0, evasion: 0, escape: -.02, resistance: .5, skillSpark: 0, unpredictable: .12, lowHP: 1 },
  playful: { attack: 1, speed: 1.08, guard: 0, evasion: .04, escape: .05, resistance: 1, skillSpark: 0, unpredictable: 0, lowHP: 1 },
};
