import { SPECIES, type GameState } from '../creatures/Creature';
import { BATTLE, COMBAT_PERSONALITIES } from '../data/battleBalance';
import { OPPONENTS } from '../data/opponents';
import { SKILLS } from '../data/skills';
import { BATTLE_ACTIONS, type ActiveBattle, type BattleAction, type BattleAnimation, type BattleOutcome } from './BattleState';
import { playerCombatant, enemyCombatant } from './Combatant';
import { chooseEnemyAction } from './BattleAI';
import { resolveDamage } from './DamageResolver';
import { useBattleSkill } from './SkillSystem';
import { settleBattle } from './RewardSystem';
import { battleReady } from './BattlePresentation';
import { randomUnit, type RandomSource } from '../systems/PersonalitySystem';
export function battleBlock(state: GameState): string|null {
  if(state.stage==='egg')return 'Hatch first. Battles can wait.';
  if(state.sleeping)return 'Let your beast wake before battling.';
  if(state.combat.active||state.combat.result)return 'Finish this encounter first.';
  if(state.exploration.active)return 'Still exploring. Wait for the encounter.';
  if(!state.combat.encounter)return 'No wild creature here.';
  if(state.stats.health<BATTLE.minHealth)return 'Feeling poorly. Run safely and recover.';
  if(state.stats.energy<BATTLE.minEnergy)return 'Too sleepy. Run safely and rest.';
  if(state.stats.hunger<BATTLE.minHunger)return 'Too hungry. Run safely and find food.';
  return null;
}
function beat(battle:ActiveBattle,actor:'player'|'enemy'|'system',animation:BattleAnimation,text:string) {
  battle.beats.push({actor,animation,text,playerHP:battle.player.hp,enemyHP:battle.enemy.hp,playerStamina:battle.player.stamina,enemyStamina:battle.enemy.stamina});
}
export function startBattle(state:GameState) {
  const blocked=battleBlock(state);if(blocked)return {success:false,message:blocked};
  const encounter=state.combat.encounter!, player=playerCombatant(state)!;
  const battle:ActiveBattle={opponent:encounter.opponent,playerSpecies:state.species as ActiveBattle['playerSpecies'],personality:state.personality??'calm',rare:encounter.rare,
    player,enemy:enemyCombatant(encounter.opponent,state.stage,encounter.rare),turn:0,failedRuns:0,startedAge:state.age,startedAt:Date.now(),status:'ongoing',beats:[],beatStartedAge:state.age};
  beat(battle,'system','entry',`${OPPONENTS[battle.opponent].name} steps closer!`);
  state.combat.active=battle;state.combat.encounter=null;state.combat.statistics.started++;
  return {success:true,message:'A little courage. A little care.'};
}
export function escapeChance(battle:ActiveBattle) {
  const p=COMBAT_PERSONALITIES[battle.personality];
  const chance=BATTLE.escapeBase+(battle.player.speed-battle.enemy.speed)*BATTLE.escapeSpeed+p.escape+(battle.player.hp/battle.player.maxHP)*BATTLE.escapeHPBonus+battle.failedRuns*BATTLE.escapeRetry;
  return Math.max(BATTLE.escapeMin,Math.min(BATTLE.escapeMax,chance));
}
export function finishBattle(state:GameState,outcome:BattleOutcome,random:RandomSource=Math.random) {
  const battle=state.combat.active;if(!battle||battle.status!=='ongoing')return false;
  battle.status=outcome;
  if(outcome==='victory')battle.enemy.hp=0;
  if(outcome==='defeat')battle.player.hp=0;
  settleBattle(state,battle,outcome,random);
  beat(battle,'player',outcome,outcome==='victory'?'Victory!':outcome==='defeat'?'A little rest. You will be okay.':'Escaped safely.');
  return true;
}
export interface TurnOptions { critical?: boolean; escape?: boolean }
export function resolveTurn(state:GameState,action:BattleAction,random:RandomSource=Math.random,options:TurnOptions={}) {
  const battle=state.combat.active;
  if(!battle||!BATTLE_ACTIONS.includes(action)||!battleReady(battle,state.age))return {success:false,message:'One little moment…'};
  const skill=SKILLS[battle.playerSpecies];
  if(action==='skill'&&battle.player.stamina<skill.cost)return {success:false,message:'Not enough stamina. Guard to recharge.'};
  battle.turn++;battle.beats=[];battle.beatStartedAge=state.age;
  const enemyAction=chooseEnemyAction(battle,random), p=COMBAT_PERSONALITIES[battle.personality];
  const preparedSkill=action==='skill'?useBattleSkill(battle,random):null;
  if(action==='run'){
    if(options.escape??(randomUnit(random)<escapeChance(battle))){finishBattle(state,'escape',random);return {success:true,message:'Escaped safely.'};}
    battle.failedRuns++;beat(battle,'player','dodge','Path blocked! Try again.');
  }
  const guards={player:action==='guard'?BATTLE.guardReduction+p.guard:0,enemy:enemyAction==='guard'?BATTLE.guardReduction:0};
  const acts: ('player'|'enemy')[]=battle.player.speed+(action==='skill'?skill.priority:0)>=battle.enemy.speed?['player','enemy']:['enemy','player'];
  for(const actor of acts){
    if(battle.status!=='ongoing')break;
    const move=actor==='player'?action:enemyAction;
    if(move==='run')continue;
    const attacker=battle[actor], other=actor==='player'?'enemy':'player', defender=battle[other];
    const name=actor==='player'?SPECIES[battle.playerSpecies].name:OPPONENTS[battle.opponent].name;
    if(move==='guard'){
      attacker.stamina=Math.min(attacker.maxStamina,attacker.stamina+BATTLE.guardRecovery);
      beat(battle,actor,'guard',`${name} guarded. Stamina restored.`);continue;
    }
    let power=1;
    if(move==='skill'){
      if(actor==='player'){
        const used=preparedSkill!;power=used.power;
        beat(battle,actor,'skill',`${name} used ${used.name}.${used.spark?' A curious spark!':''}`);
      }else{
        attacker.stamina-=BATTLE.skillCost;power=BATTLE.enemySkillPower;
        beat(battle,actor,'skill',`${name} used Trail Pulse.`);
      }
    }else beat(battle,actor,'attack',`${name} attacks!`);
    let boost=actor==='player'&&attacker.hp/attacker.maxHP<BATTLE.lowHPThreshold?p.lowHP:1;
    if(actor==='player'&&p.unpredictable>0&&randomUnit(random)<p.unpredictable)boost*=BATTLE.unpredictableBoost;
    const evasion=other==='player'?p.evasion:OPPONENTS[battle.opponent].behavior==='fast'?BATTLE.fastEvasion:0;
    const hit=resolveDamage(attacker,defender,random,{power,guard:guards[other],evasion,attackBoost:boost,critical:actor==='player'?options.critical:undefined});
    defender.hp=Math.max(0,defender.hp-hit.damage);
    if(actor==='enemy'&&move==='skill'&&!hit.dodged)defender.stamina=Math.max(0,defender.stamina-Math.ceil(BATTLE.pressureDrain*p.resistance));
    beat(battle,other,hit.dodged?'dodge':hit.critical?'critical':'hit',hit.dodged?'Attack missed. A quick step!':hit.critical?'Critical hit!':`${hit.damage} HP · ${guards[other]?'Guard softened the hit.':'A little impact.'}`);
    if(defender.hp===0)finishBattle(state,other==='enemy'?'victory':'defeat',random);
  }
  // A generous safety limit ends repeated stalemates without a loss penalty.
  if(battle.status==='ongoing'&&battle.turn>=BATTLE.maxTurns)finishBattle(state,'escape',random);
  return {success:true,message:battle.beats.at(-1)?.text??'Ready for the next turn.'};
}
export function acknowledgeBattle(state:GameState) {
  if(!state.combat.result)return false;
  state.combat.active=null;state.combat.result=null;state.exploration.result=null;return true;
}
/** Turn effects are already committed. A reload resumes stable HP/stamina, never re-resolves a turn. */
export function recoverBattle(state:GameState) {
  if(state.combat.active){state.combat.active.beats=[];state.combat.active.beatStartedAge=state.age;}
}
