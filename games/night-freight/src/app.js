(() => {
'use strict';
const {Harbour,Renderer,SHIPMENTS,STEP}=NightFreight;
const $=id=>document.getElementById(id),game=new Harbour(),renderer=new Renderer($('scene'));
const STORAGE='forge-arcade:night-freight:v1';let saved={best:[0,0,0],rocking:true,sound:false};
try{const data=JSON.parse(localStorage.getItem(STORAGE));if(data&&typeof data==='object'){if(Array.isArray(data.best))saved.best=[0,1,2].map(i=>Number.isFinite(data.best[i])?Math.max(0,Math.min(1000,data.best[i])):0);if(typeof data.rocking==='boolean')saved.rocking=data.rocking;if(typeof data.sound==='boolean')saved.sound=data.sound;}}catch{}
const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{}};
let paused=true,overlayKind='intro',sound=false,audio=null,last=0,accumulator=0,toastUntil=0,started=false;
const sources={left:new Set(),right:new Set(),up:new Set(),down:new Set()};
function clearInput(){for(const set of Object.values(sources))set.clear();game.clearInput();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
function hold(action,source,value){if(value&&!paused&&!game.failed&&!game.departing)sources[action].add(source);else sources[action].delete(source);game.input[action]=sources[action].size>0;}
function tone(freq=180,duration=.1,type='sine',volume=.04){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.55,audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch{sound=false;}}
function toast(message){$('toast').textContent=message;toastUntil=performance.now()+4200;}
function setOverlay(kind,html){overlayKind=kind;$('overlay').innerHTML=html?`<div class="card">${html}</div>`:'';clearInput();}
function restoreSound(){if(saved.sound&&!sound){sound=true;$('sound').textContent='Sound on';$('sound').setAttribute('aria-pressed','true');tone(300,.12);}}
function begin(){restoreSound();started=true;paused=false;last=0;accumulator=0;setOverlay('',null);$('pause').textContent='II Pause';toast('Lower near a lift eye. Space arms the magnet.');}
function intro(){setOverlay('intro',`<span class="eyebrow">A SMALL HARBOUR. A STEADY HAND.</span><h2>Work the<br>night water.</h2><p>Lift five steel loads onto the Nightjar.<br>Let the swing settle. Make a clean landing.</p><div class="keys">A / D or ← / → &nbsp; TROLLEY<br>W / S or ↑ / ↓ &nbsp; RAISE / LOWER<br>SPACE &nbsp; ARM / RELEASE MAGNET</div><p>Hold the buttons below on touch screens.<br>All five aboard and still for 3 seconds → Dispatch.</p><button class="primary" data-action="begin">Start the shift →</button><button class="secondary" data-action="free">Just lift · Free Lift</button>`);}
function reset(index=game.index,free=game.free){game.reset(index,free);game.rocking=free?saved.rocking:true;$('rock').checked=saved.rocking;last=0;accumulator=0;begin();updateHUD();}
function pause(){if(!started||game.failed||overlayKind==='complete')return;paused=true;clearInput();accumulator=0;$('pause').textContent='▶ Resume';setOverlay('pause',`<span class="eyebrow">NORTH QUAY / HOLDING</span><h2>Take a breath.</h2><p>Your shipment is right where you left it.</p><button class="primary" data-action="resume">Resume shift →</button><button class="secondary" data-action="help">View controls</button>`);}
function resume(){if(document.hidden)return;restoreSound();paused=false;last=0;accumulator=0;setOverlay('',null);$('pause').textContent='II Pause';}
function help(){paused=true;accumulator=0;setOverlay('help',`<span class="eyebrow">OPERATOR'S POCKET GUIDE</span><h2>Slow is smooth.</h2><ul><li>A/D or ←/→ moves the trolley.</li><li>W/S or ↑/↓ raises / lowers the cable.</li><li>Space arms the magnet. The dotted ring is its reach.</li><li>A lit lift eye means a piece is in range.</li><li>Lift above the dock before travelling. Wait out the swing.</li><li>Space releases the load. Stack or use the whole deck.</li><li>Hold all five steady for 3 seconds, then Dispatch.</li><li>Water loses the shipment. Restart repeats its layout.</li></ul><button class="primary" data-action="resume">${started?'Back to the crane':'Start the shift'} →</button>`);}
$('overlay').addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='begin')begin();if(action==='resume'){started=true;resume();}if(action==='free')reset(0,true);if(action==='retry')reset();if(action==='next')reset(game.index+1,false);if(action==='again')reset(0,false);if(action==='help')help();});
$('pause').onclick=()=>paused&&overlayKind==='pause'?resume():pause();$('help').onclick=help;$('restart').onclick=()=>reset();$('mode').onclick=()=>reset(0,!game.free);
$('rock').onchange=()=>{saved.rocking=$('rock').checked;game.rocking=saved.rocking;save();};
$('sound').onclick=()=>{sound=!sound;saved.sound=sound;save();$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));tone(300,.12);};
$('dispatch').onclick=()=>game.dispatch();
function toggle(){if(!paused){game.toggle();updateHUD();}}
$('magnet').onclick=toggle;
const keyMap={a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',w:'up',ArrowUp:'up',s:'down',ArrowDown:'down'};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(keyMap[k]){e.preventDefault();hold(keyMap[k],`key:${k}`,true);}if(e.code==='Space'){e.preventDefault();if(!e.repeat)toggle();}if(e.code==='Escape'||k==='p'){e.preventDefault();if(e.repeat)return;if(paused&&overlayKind==='pause')resume();else pause();}});
window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(keyMap[k]){e.preventDefault();hold(keyMap[k],`key:${k}`,false);}});
for(const button of document.querySelectorAll('[data-hold]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;button.setPointerCapture(e.pointerId);hold(button.dataset.hold,`pointer:${e.pointerId}`,true);button.classList.add('held');});
 const release=e=>{hold(button.dataset.hold,`pointer:${e.pointerId}`,false);button.classList.remove('held');};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);button.addEventListener('contextmenu',e=>e.preventDefault());
}
window.addEventListener('blur',()=>{clearInput();if(!paused)pause();});
document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;clearInput();if(document.hidden&&!paused)pause();});
window.addEventListener('resize',()=>{renderer.resize();renderer.draw(game);});
game.onEvent=(event,c)=>{
 if(event==='collected')toast('Harbour crew collected an older load · keep lifting');
 if(event==='attach'){toast(`Load ${String(c.id).padStart(2,'0')} attached · lift clear of the quay`);tone(270,.15,'triangle');}
 if(event==='release'){toast('Released · let the steel settle');tone(140,.1,'triangle');}
 if(event==='land'){toast('On deck · a clean landing');tone(95,.13,'sine',.08);}
 if(event==='loss'){tone(65,.5,'triangle');if(game.free)toast('Lost to the water · fresh steel on the quay');else{paused=true;setOverlay('loss',`<span class="eyebrow">LOAD LOST / WATER CONTACT</span><h2>The harbour<br>keeps that one.</h2><p>Lift higher before travelling. Release close to the deck.<br>Your next attempt uses the same cargo arrangement.</p><button class="primary" data-action="retry">Retry shipment ↻</button><button class="secondary" data-action="free">Practice in Free Lift</button>`);}}
 if(event==='dispatch'){tone(110,.8,'sine',.08);toast('Lines away. Shipment outbound.');saved.best[game.index]=Math.max(saved.best[game.index],game.dispatchScore);save();}
 if(event==='departed'){paused=true;const final=game.index===2;setOverlay('complete',`<span class="eyebrow">${final?'ALL THREE SHIPMENTS DELIVERED':'SHIPMENT DELIVERED'}</span><h2>${final?'A good night’s work.':'Steel on its way.'}</h2><div class="stamp">5 / 5 LOADS RETAINED</div><div class="score">${game.dispatchScore}<small> / 1000</small></div><p>800 for cargo retained + up to 200 for alignment<br>with the five cream deck marks.</p><button class="primary" data-action="${final?'again':'next'}">${final?'Work another night ↻':'Next shipment →'}</button><button class="secondary" data-action="free">Keep going · Free Lift</button>`);}
};
function updateHUD(){const shipment=SHIPMENTS[game.index];$('mode-label').textContent=game.free?'FREE LIFT / OPEN QUAY':`SHIPMENT ${String(game.index+1).padStart(2,'0')} / 03`;$('shipment-name').textContent=game.free?'Just you and the water':shipment.name;$('cargo-count').textContent=game.free?`${game.retained} aboard · ${game.lost} lost`:`${game.retained} / 5 aboard`;$('best').textContent=game.free?'PRACTICE / NO SCORE':`BEST ${saved.best[game.index]||'—'}`;
 $('magnet-label').textContent=game.attached?`ATTACHED · load ${String(game.attached.id).padStart(2,'0')}`:game.on?'ON · seeking steel':'OFF · released';$('magnet-icon').textContent=game.attached?'⊓':'⊔';$('magnet-icon').style.color=game.on?'#b5dec3':'#e9a05b';$('magnet').setAttribute('aria-pressed',String(game.on));$('magnet').style.borderColor=game.on?'#a6ccb0':'';
 $('stable-fill').style.width=`${game.stable/3*100}%`;$('stable-time').textContent=game.free?'∞':`${game.stable.toFixed(1)} / 3 s`;$('status').textContent=game.free?'Open supply · reset anytime':game.ready?'Shipment secure · ready to dispatch':game.stable>0?'All aboard · checking stability':game.retained===5?'Let the cargo settle':'Load all five pieces';$('dispatch').disabled=!game.ready||game.departing||paused;$('dispatch').hidden=game.free;$('mode').textContent=game.free?'Shipment mode ↗':'Free Lift ↗';$('rock-setting').hidden=!game.free;
 if(performance.now()>toastUntil)$('toast').textContent='';}
const testing=new URLSearchParams(location.search).has('test');
if(testing)window.__NF={game,snapshot:()=>({...game.snapshot(),paused,overlayKind,input:{...game.input}}),advance(n=1){for(let i=0;i<n;i++)if(!paused)game.step();updateHUD();renderer.draw(game);},render:()=>renderer.draw(game),saved};
function frame(now){if(!last)last=now;const elapsed=Math.min(50,now-last);last=now;if(!paused&&!testing){accumulator+=elapsed;let n=0;while(accumulator>=STEP&&n++<8){game.step();accumulator-=STEP;if(paused){accumulator=0;break;}}}else accumulator=0;renderer.draw(game);updateHUD();requestAnimationFrame(frame);}
game.rocking=true;intro();requestAnimationFrame(frame);
})();
