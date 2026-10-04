import type { ItemId } from './items';
export const OPPONENT_IDS = ['flinthop', 'tinspindle', 'gloamfin', 'thornmote'] as const;
export type OpponentId = typeof OPPONENT_IDS[number];
export type EnemyBehavior = 'aggressive' | 'defensive' | 'fast' | 'unpredictable';
export interface OpponentDefinition {
  name: string;
  hp: number; attack: number; defense: number; speed: number; stamina: number;
  behavior: EnemyBehavior;
  rewards: { item: ItemId; weight: number }[];
  rewardChance: number;
  pixels: readonly string[];
}
export const OPPONENTS: Record<OpponentId, OpponentDefinition> = {
  flinthop: { name: 'Flinthop', hp: 32, attack: 8, defense: 3, speed: 7, stamina: 12, behavior: 'aggressive', rewardChance: .75,
    rewards: [{item:'snack',weight:3},{item:'energy-berry',weight:1}],
    pixels: ['....11....11....','...1221..1221...','....12211221....','...1222222221...','..122122122221..','..122222222221..','...1221112221...','....12222221....','..112211112211..','.1221......1221.','1111........1111'] },
  tinspindle: { name: 'Tinspindle', hp: 36, attack: 8, defense: 5, speed: 6, stamina: 14, behavior: 'defensive', rewardChance: .8,
    rewards: [{item:'training-chip',weight:3},{item:'medicine',weight:2}],
    pixels: ['......11......','...11122111...','..1222222221..','.122112211221.','11222222222211','.122211112221.','..1222222221..','...11122111...','..11..11..11..','.11...11...11.'] },
  gloamfin: { name: 'Gloamfin', hp: 30, attack: 9, defense: 3, speed: 12, stamina: 14, behavior: 'fast', rewardChance: .75,
    rewards: [{item:'toy',weight:3},{item:'energy-berry',weight:2}],
    pixels: ['.......11.......','......1221......','...1112222111...','..122222222221..','.12221122211221.','1222222222222221','.11222211222211.','...1122222211...','.....122221.....','....11.11.11....','...11......11...'] },
  thornmote: { name: 'Thornmote', hp: 34, attack: 9, defense: 4, speed: 9, stamina: 14, behavior: 'unpredictable', rewardChance: .85,
    rewards: [{item:'medicine',weight:2},{item:'training-chip',weight:2},{item:'strange-fragment',weight:1}],
    pixels: ['..1....11....1..','..11..1221..11..','...1112222111...','..122222222221..','1122112222112211','.12222211222221.','..122222222221..','...1112222111...','...1..1221..1...','......1111......'] },
};
export const AI_WEIGHTS: Record<EnemyBehavior, { attack: number; guard: number; skill: number }> = {
  aggressive: {attack:7,guard:1,skill:2}, defensive: {attack:5,guard:2,skill:2},
  fast: {attack:6,guard:1,skill:3}, unpredictable: {attack:4,guard:3,skill:3},
};
export const AI_BALANCE = { lowHP: .4, defensiveGuardBonus: 5, emptyStaminaGuardBonus: 4 } as const;
