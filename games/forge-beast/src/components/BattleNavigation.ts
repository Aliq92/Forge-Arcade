import type { GameState } from '../creatures/Creature';
import { BATTLE_ACTIONS, type BattleAction } from '../battle/BattleState';
import { battleFrame, battleReady } from '../battle/BattlePresentation';
import type { ButtonInput } from './DeviceNavigation';
export class BattleNavigation {
  actionIndex=0;
  encounterChoice=0;
  press(state:GameState,input:ButtonInput): { enter?:boolean; retreat?:boolean; action?:BattleAction; acknowledge?:boolean } {
    if(state.combat.encounter){
      if(input==='select')this.encounterChoice=1-this.encounterChoice;
      if(input==='back')return {retreat:true};
      if(input==='confirm')return this.encounterChoice?{retreat:true}:{enter:true};
      return {};
    }
    const active=state.combat.active;if(!active)return {};
    if(active.status!=='ongoing')return {acknowledge:input!=='select'&&!battleFrame(active,state.age)};
    if(!battleReady(active,state.age))return {};
    if(input==='select')this.actionIndex=(this.actionIndex+1)%BATTLE_ACTIONS.length;
    if(input==='back')this.actionIndex=3;
    if(input==='confirm')return {action:BATTLE_ACTIONS[this.actionIndex]};
    return {};
  }
  reset(){this.actionIndex=0;this.encounterChoice=0;}
}
