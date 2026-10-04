import { SPECIES, type GameState } from '../creatures/Creature';
import { OPPONENTS } from '../data/opponents';
import { SKILLS } from '../data/skills';
import { ITEMS } from '../data/items';
import { BATTLE_ACTIONS } from '../battle/BattleState';
import { battleFrame, battleReady } from '../battle/BattlePresentation';
import { creatureSprite } from '../creatures/sprites';
import { opponentSprite } from '../assets/opponentSprites';
import { icon } from '../assets/icons';
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export function battleMessage(state:GameState) {
  const active=state.combat.active;
  if(!active)return state.combat.encounter?.hostile?'A restless wild spark. Battle or run?':'A wild spark. Battle or take a quiet path?';
  const frame=battleFrame(active,state.age);
  return frame?.beat.text??(state.combat.result?.message??'A choose · B act · C choose Run');
}
export function battleMarkup(state:GameState,choice:number,selected:number) {
  const encounter=state.combat.encounter;
  if(encounter)return `<div class="fb-status-heading">${encounter.rare?'Rare encounter':encounter.hostile?'Wild challenge':encounter.optional?'A friendly challenge':'Wild encounter'}<span>1V1</span></div><div class="fb-encounter-card">${opponentSprite(encounter.opponent)}<strong>${OPPONENTS[encounter.opponent].name}</strong><div class="fb-encounter-choices"><span class="${choice===0?'chosen':''}">BATTLE</span><span class="${choice===1?'chosen':''}">RUN</span></div></div><div class="fb-status-help">A CHOOSE · B CONFIRM · C RUN</div>`;
  const active=state.combat.active;if(!active)return null;
  const frame=battleFrame(active,state.age), snapshot=frame?.beat;
  if(active.status!=='ongoing'&&!frame){
    const summary=state.combat.result!;
    return `<div class="fb-status-heading">${summary.outcome==='victory'?'Victory!':summary.outcome==='defeat'?'A little recovery':'Escaped safely'}<span>1V1</span></div><div class="fb-battle-result"><strong>${OPPONENTS[active.opponent].name} · ${active.turn} ${active.turn===1?'turn':'turns'}</strong><p>${escape(summary.message)}</p><small>${summary.item?`${ITEMS[summary.item].name.toUpperCase()} ${summary.stored?'→ ITEMS':'· STACK FULL'}`:summary.outcome==='defeat'?'FOOD, COMPANY & REST HELP':'A SMALL STORY REMEMBERED'}</small></div><div class="fb-status-help">B CONTINUE · C BACK</div>`;
  }
  const pHP=snapshot?.playerHP??active.player.hp,eHP=snapshot?.enemyHP??active.enemy.hp,stamina=snapshot?.playerStamina??active.player.stamina;
  const fighter=(side:'player'|'enemy',hp:number,max:number,name:string,sprite:string)=>`<div class="fb-fighter fb-fighter-${side}"><span>${name}</span><div class="fb-combat-hp" aria-label="${side==='player'?'Player':'Enemy'} HP ${hp} of ${max}"><i style="width:${hp/max*100}%"></i></div><small>${hp}/${max}</small><div class="fb-combat-sprite">${sprite}</div></div>`;
  return `<div class="fb-battle-arena" data-animation="${frame?.beat.animation??''}" data-actor="${frame?.beat.actor??''}" data-beat="${frame?.index??-1}" data-turn="${active.turn}">${fighter('player',pHP,active.player.maxHP,SPECIES[active.playerSpecies].name,creatureSprite(active.playerSpecies))}<span class="fb-versus">×</span>${fighter('enemy',eHP,active.enemy.maxHP,OPPONENTS[active.opponent].name,opponentSprite(active.opponent))}<span class="fb-combat-cue" aria-hidden="true">${frame?.beat.animation==='critical'?'!':frame?.beat.animation==='guard'?'▣':frame?.beat.animation==='skill'?'✦':frame?.beat.animation==='dodge'?'↝':''}</span><div class="fb-stamina"><span>STM</span><div><i style="width:${stamina/active.player.maxStamina*100}%"></i></div><span>${selected===2?`${SKILLS[active.playerSpecies].name} · ${SKILLS[active.playerSpecies].cost} STM`:`TURN ${active.turn+1}`}</span></div></div>`;
}
export function battleMenuMarkup(state:GameState,selected:number) {
  const active=state.combat.active;
  if(!active||active.status!=='ongoing')return null;
  const available=battleReady(active,state.age);
  const icons=['train','health','spark','arrow'] as const;
  return BATTLE_ACTIONS.map((action,i)=>`<div class="fb-menu-item${i===selected?' is-selected':''}${!available?' fb-action-busy':''}" data-battle-action="${action}" aria-current="${i===selected}">${icon(icons[i])}<span>${action}</span><i></i></div>`).join('');
}
