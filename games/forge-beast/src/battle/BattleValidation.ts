import type { GameState } from '../creatures/Creature';
import { SPECIES } from '../creatures/Creature';
import { OPPONENT_IDS } from '../data/opponents';
import { PERSONALITY_IDS } from '../data/personalities';
import { ITEM_IDS } from '../data/items';
import { ZONE_IDS } from '../data/expeditions';
import { BATTLE } from '../data/battleBalance';
import type { ActiveBattle } from './BattleState';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const integer=(v:unknown):v is number=>number(v)&&Number.isSafeInteger(v);
const species=(v:unknown)=>typeof v==='string'&&v!=='cinder-egg'&&Object.hasOwn(SPECIES,v);
const combatant=(v:unknown)=>object(v)&&['hp','maxHP','attack','defense','speed','stamina','maxStamina','shield','dodgeBoost'].every(k=>number(v[k]))&&
  (v.maxHP as number)>0&&(v.maxHP as number)<=200&&(v.hp as number)<=(v.maxHP as number)&&
  (v.maxStamina as number)>0&&(v.maxStamina as number)<=60&&(v.stamina as number)<=(v.maxStamina as number)&&
  (v.attack as number)>0&&(v.attack as number)<=100&&(v.defense as number)<=100&&(v.speed as number)<=100&&(v.shield as number)<=1&&(v.dodgeBoost as number)<=1;
export function validCombat(state:GameState) {
  const c=state.combat;if(!object(c)||!object(c.statistics)||!object(c.discoveries)||!Array.isArray(c.history)||c.history.length>BATTLE.historyLimit)return false;
  const stats=c.statistics;if(!['started','wins','losses','escapes','declined'].every(k=>integer(stats[k as keyof typeof stats])))return false;
  const resolved=stats.wins+stats.losses+stats.escapes;
  if(resolved>stats.started||c.history.length>resolved)return false;
  if(!Object.entries(c.discoveries).every(([id,v])=>OPPONENT_IDS.includes(id as never)&&object(v)&&integer(v.encountered)&&integer(v.defeated)&&v.defeated<=v.encountered))return false;
  const summary=(v:unknown)=>object(v)&&OPPONENT_IDS.includes(v.opponent as never)&&species(v.playerSpecies)&&typeof v.rare==='boolean'&&
    ['victory','defeat','escape'].includes(v.outcome as string)&&integer(v.turns)&&(v.turns as number)<=BATTLE.maxTurns&&number(v.startedAt)&&number(v.endedAt)&&number(v.age)&&v.age<=state.age&&
    (v.item===null||ITEM_IDS.includes(v.item as never))&&typeof v.stored==='boolean'&&(!v.stored||v.item!==null)&&typeof v.message==='string'&&v.message.length<=240;
  if(!c.history.every(summary)||(c.result!==null&&!summary(c.result)))return false;
  if(c.encounter!==null){const e=c.encounter;if(!object(e)||!OPPONENT_IDS.includes(e.opponent as never)||typeof e.rare!=='boolean'||typeof e.hostile!=='boolean'||typeof e.optional!=='boolean'||
    !(e.zone===null||ZONE_IDS.includes(e.zone as never))||!number(e.age)||e.age>state.age||!number(e.timestamp)||c.active!==null||c.result!==null||state.exploration.active||state.stage==='egg'||state.sleeping)return false;}
  if(c.active!==null){
    const a=c.active as ActiveBattle;
    if(!object(a)||!OPPONENT_IDS.includes(a.opponent)||!species(a.playerSpecies)||a.playerSpecies!==state.species||!PERSONALITY_IDS.includes(a.personality)||typeof a.rare!=='boolean'||
      !combatant(a.player)||!combatant(a.enemy)||!integer(a.turn)||a.turn>BATTLE.maxTurns||!integer(a.failedRuns)||a.failedRuns>a.turn||!number(a.startedAge)||a.startedAge>state.age||
      !number(a.startedAt)||!number(a.beatStartedAge)||a.beatStartedAge>state.age||!['ongoing','victory','defeat','escape'].includes(a.status)||state.stage==='egg'||state.sleeping||state.exploration.active)return false;
    if(!Array.isArray(a.beats)||a.beats.length>6||!a.beats.every(b=>object(b)&&['player','enemy','system'].includes(b.actor as string)&&Object.hasOwn(BATTLE.beatSeconds,b.animation as string)&&typeof b.text==='string'&&b.text.length<=160&&
      number(b.playerHP)&&b.playerHP<=a.player.maxHP&&number(b.enemyHP)&&b.enemyHP<=a.enemy.maxHP&&number(b.playerStamina)&&b.playerStamina<=a.player.maxStamina&&number(b.enemyStamina)&&b.enemyStamina<=a.enemy.maxStamina))return false;
    if(a.status==='ongoing'){if(a.player.hp<=0||a.enemy.hp<=0||c.result!==null||stats.started!==resolved+1)return false;}
    else if(!c.result||c.result.outcome!==a.status||c.result.opponent!==a.opponent||stats.started!==resolved||
      (a.status==='victory'&&a.enemy.hp!==0)||(a.status==='defeat'&&a.player.hp!==0))return false;
  }else if(c.result!==null||stats.started!==resolved)return false;
  return true;
}
