import { createGame } from './game/game.js';

const canvas=document.getElementById('game');
const root=document.getElementById('ui');
let game=null;
let snap=null;
let confirmReset=false;
const islands=['meadow','sunstone','grove','falls','heart'];

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function button(label,attrs=''){return `<button ${attrs}>${label}</button>`}

function render(ui){
  snap=ui;
  if(!ui.started){
    root.innerHTML=`<div class="screen"><div class="title-wrap"><div class="eyebrow">Return the color</div><h1>Drifterling</h1><p class="subtitle">A small creature, an enormous sky. Glide, gather lost color, and wake the sleeping islands.</p>${button(ui.hasSave?'Continue':'Begin',`class="primary" data-act="start" data-continue="${ui.hasSave?1:0}"`)}<p class="micro">Touch: four-way pad. Keyboard: arrows or WASD.</p></div></div>`;
    bind(); return;
  }
  const dots=islands.map(id=>`<span class="dot ${ui.restored.includes(id)?'on':''}"></span>`).join('');
  let html=`<div class="hud"><div class="top"><div class="progress" aria-label="Island progress">${dots}</div><div class="actions"><button class="icon" data-act="mute" aria-label="${ui.muted?'Unmute':'Mute'}">${ui.muted?'🔇':'🔊'}</button><button class="icon" data-act="pause" aria-label="${ui.paused&&!ui.settingsOpen?'Resume':'Pause'}">${ui.paused&&!ui.settingsOpen?'▶':'Ⅱ'}</button><button class="icon" data-act="settings" aria-label="Settings">⚙</button></div></div>`;
  if(ui.hint&&!ui.paused) html+=`<div class="hint">${esc(ui.hint)}</div>`;
  if(ui.endingLine) html+=`<div class="ending">${esc(ui.endingLine)}</div>`;
  if(ui.showTouchControls) html+=`<div class="dpad" data-ui aria-label="Movement controls"><span></span><button data-dir="ArrowUp" aria-label="Up">↑</button><span></span><button data-dir="ArrowLeft" aria-label="Left">←</button><span class="core"></span><button data-dir="ArrowRight" aria-label="Right">→</button><span></span><button data-dir="ArrowDown" aria-label="Down">↓</button><span></span></div>`;
  if(ui.paused&&!ui.settingsOpen) html+=`<div class="overlay"><div class="panel"><h2>Paused</h2><div class="row">${button('Resume','data-act="resume"')}</div></div></div>`;
  if(ui.settingsOpen) html+=`<div class="overlay"><div class="panel"><h2>Settings</h2><p>Touch uses the four-way pad. Keyboard: WASD or arrows. Space boosts gently on desktop.</p><div class="row">${button(ui.muted?'Sound is off':'Sound is on','class="secondary" data-act="mute"')}${button('Close','class="secondary" data-act="close-settings"')}${confirmReset?`<p>This clears restored islands and color memory.</p>${button('Reset','data-act="reset"')}${button('Cancel','class="ghost" data-act="cancel-reset"')}`:button('Reset journey','class="ghost" data-act="ask-reset"')}</div></div></div>`;
  html+='</div>';
  root.innerHTML=html;
  bind();
}

function bind(){
  root.querySelectorAll('[data-act]').forEach(el=>el.addEventListener('click',()=>{
    const a=el.dataset.act;
    if(a==='start') game?.start(el.dataset.continue==='1');
    if(a==='mute') game?.setMuted(!snap.muted);
    if(a==='pause') game?.setPaused(!snap.paused);
    if(a==='resume') game?.setPaused(false);
    if(a==='settings'){confirmReset=false;game?.toggleSettings(!snap.settingsOpen)}
    if(a==='close-settings'){confirmReset=false;game?.toggleSettings(false);game?.setPaused(false)}
    if(a==='ask-reset'){confirmReset=true;render(snap)}
    if(a==='cancel-reset'){confirmReset=false;render(snap)}
    if(a==='reset'){confirmReset=false;game?.resetJourney()}
  }));
  root.querySelectorAll('[data-dir]').forEach(el=>{
    const code=el.dataset.dir;
    const set=(v)=>game?.setTouchDirection(code,v);
    el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId)}catch{};set(true)});
    const up=e=>{e?.preventDefault?.();set(false)};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);el.addEventListener('contextmenu',e=>e.preventDefault());
  });
}

game=createGame(canvas,render);
