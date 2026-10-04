import { BATTLE } from '../data/battleBalance';
import type { ActiveBattle, BattleBeat } from './BattleState';
export function battleBeatDuration(battle: ActiveBattle) {
  return battle.beats.reduce((sum,beat)=>sum+BATTLE.beatSeconds[beat.animation],0);
}
export function battleFrame(battle: ActiveBattle, age: number): { beat: BattleBeat; index: number }|null {
  let elapsed=Math.max(0,age-battle.beatStartedAge);
  for(let index=0;index<battle.beats.length;index++){
    const beat=battle.beats[index];
    if(elapsed<BATTLE.beatSeconds[beat.animation])return {beat,index};
    elapsed-=BATTLE.beatSeconds[beat.animation];
  }
  return null;
}
export function battleReady(battle: ActiveBattle, age: number) {
  return battle.status==='ongoing'&&age-battle.beatStartedAge>=battleBeatDuration(battle);
}
