import { Game } from './game.js';
import { LEVELS,createSandbox } from './levels.js';
import { CATALOG,placementError } from './gadgets.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { Store,parseLayout } from './storage.js';
import { Audio } from './audio.js';
const $=id=>document.getElementById(id),store=new Store(),audio=new Audio(),renderer=new Renderer($('table'));
let game=new Game(LEVELS[0]),selected=null,serial=0,last=performance.now(),notice='',shown=false;
const say=text=>{notice=text;$('status').textContent=text;};
const open=id=>$(id).showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
function fit(){renderer.resize();const mobile=innerWidth<=700;renderer.fit(game.board,innerHeight<500?{top:100,bottom:95,left:15,right:250}:mobile?{top:150,bottom:310,left:15,right:15}:{top:130,bottom:135,left:30,right:300});}
function select(id){selected=id;refresh();}
function act(action){const result=game.edit(action);say(result.message||'Build updated.');if(result.ok){if(action.type==='place'){selected=game.board.objects.at(-1).id;input.tool=null;}requestAnimationFrame(refresh);}return result;}
function rotate(deg){const o=game.board.objects.find(o=>o.id===selected);if(o)act({type:'rotate',id:o.id,angle:Math.round(((o.angle||0)+deg*Math.PI/180)*1e9)/1e9});else if(input.tool){input.toolAngle=(input.toolAngle||0)+deg*Math.PI/180;if(input.ghost)input.ghost.angle=input.toolAngle;refresh();}}
const input=new Input($('table'),renderer,{board:()=>game.board,editable:()=>game.state==='build',select,act,rotate,remove:()=>act({type:'delete',id:selected}),history:type=>{if(game.state==='build'){game.editor[type]();refresh();}},push,pause,
  spec:(type,p)=>{let id;do{id=`placed-${++serial}`;}while(game.board.objects.some(o=>o.id===id)||game.board.platforms.some(o=>o.id===id));return {id,type,x:Math.round(p.x),y:Math.round(p.y),angle:input.toolAngle||0,locked:false};}});
function load(board){game=new Game(board,{sandbox:board.id==='sandbox'});selected=null;input.tool=null;input.ghost=null;shown=false;notice='';document.body.classList.toggle('sandbox',game.sandbox);$('title').textContent=game.sandbox?'FREE-BUILD WORKSHOP':`${String(board.id).padStart(2,'0')} / ${board.title}`;$('instruction').textContent=board.tutorial||'Build a machine, choose its starting trigger, then push.';$('speed').value='1';fit();refresh();}
function refresh(){const b=game.board,build=game.state==='build',o=b.objects.find(o=>o.id===selected);$('mode').textContent=game.state.toUpperCase();$('count').textContent=`${game.editor.count} placed`;
  $('palette').replaceChildren(...Object.entries(CATALOG).map(([type,c])=>{const button=document.createElement('button');button.dataset.type=type;button.textContent=c.label;const count=document.createElement('span');count.textContent=game.editor.remaining(type);button.append(count);button.disabled=!build||!game.editor.remaining(type);button.classList.toggle('active',input.tool===type);button.onclick=()=>{input.tool=input.tool===type?null:type;select(null);say(input.tool?'Click or drag on the tabletop to place.':'Selection tool.');};return button;}));
  $('selection').replaceChildren(new Option('None',''),...b.objects.map(o=>new Option(`${o.locked?'🔒 ':''}${o.name||CATALOG[o.type].label} · ${o.id}`,o.id)));$('selection').value=selected||'';
  $('workbench').classList.toggle('inspect',!!o);$('selected-label').textContent=o?`${o.locked?'Fixed · ':''}${CATALOG[o.type].label}`:input.tool?`Place ${CATALOG[input.tool].label}`:'Pick a gadget to inspect.';
  for(const key of ['x','y','angle']){$(key).value=o?key==='angle'?Math.round((o.angle||0)*180/Math.PI*100)/100:o[key]:input.tool?key==='angle'?(input.toolAngle||0)*180/Math.PI:key==='x'?Math.round(b.width/2):400:'';$(key).disabled=!build||(!o&&!input.tool)||o?.locked;}
  for(const id of ['apply','left','right','delete','strength','accept'])$(id).disabled=!build||!o||o.locked;
  for(const id of ['apply','left','right'])if(build&&input.tool&&!o)$(id).disabled=false;
  $('apply').textContent=input.tool&&!o?'Place at coordinates':'Apply position';
  let toolRotate=$('tool-rotate');if(!toolRotate){toolRotate=document.createElement('div');toolRotate.id='tool-rotate';toolRotate.className='row';const l=document.createElement('button'),r=document.createElement('button');l.textContent='↶ Tool 5°';r.textContent='Tool 5° ↷';l.onclick=()=>rotate(-5);r.onclick=()=>rotate(5);toolRotate.append(l,r);$('palette').after(toolRotate);}toolRotate.hidden=!input.tool;
  $('strength-label').hidden=o?.type!=='spring';$('strength').value=o?.settings?.strength||300;$('accept-label').hidden=!['finish','switch'].includes(o?.type);$('accept').value=o?.settings?.accept||'any';
  $('connection').replaceChildren(new Option('Choose a gear / spring',''),...b.objects.filter(s=>['gear','spring'].includes(s.type)&&s.id!==selected).map(s=>new Option(`${s.id}${b.links.some(l=>l.from===selected&&l.to===s.id)?' ✓':''}`,s.id)));
  $('connect').disabled=$('disconnect').disabled=!build||!['gear','switch'].includes(o?.type);$('starting').disabled=!build||!game.sandbox||!['domino','marble','gear','spring'].includes(o?.type);
  $('undo').disabled=!build||!game.editor.history.length;$('redo').disabled=!build||!game.editor.future.length;$('reset').disabled=!build;$('push').disabled=!build;$('pause').disabled=!['running','paused','replay','replayPaused'].includes(game.state);$('pause').textContent=['paused','replayPaused'].includes(game.state)?'Resume':'Pause';$('edit').disabled=build;$('retry').disabled=build;$('replay').disabled=!game.record?.outcome;$('timeline-label').hidden=!game.state.startsWith('replay');
}
function push(){if(game.state!=='build')return;audio.unlock();const r=game.push();if(!r.ok){say(r.message);return;}shown=false;input.ghost=null;say('Hands off. The machine is running.');refresh();}
function pause(){if(['paused','replayPaused'].includes(game.state))game.resume();else game.pause();refresh();}
function edit(){game.returnBuild();shown=false;say('Your setup is preserved. Tinker and try again.');refresh();}
function replay(){game.replay();$('timeline').max=Math.ceil(game.record.duration*15);shown=true;refresh();}
$('selection').onchange=()=>{input.tool=null;select($('selection').value||null);};
$('angle').onchange=()=>{if(input.tool&&!selected){input.toolAngle=Number($('angle').value)*Math.PI/180;if(input.ghost)input.ghost.angle=input.toolAngle;}};
$('apply').onclick=()=>{const id=selected,x=Number($('x').value),y=Number($('y').value),angle=Number($('angle').value)*Math.PI/180;if(input.tool&&!id){input.toolAngle=angle;act({type:'place',object:input.hooks.spec(input.tool,{x,y})});}else if(act({type:'move',id,x,y}).ok)act({type:'rotate',id,angle});};
$('left').onclick=()=>rotate(-5);$('right').onclick=()=>rotate(5);$('delete').onclick=()=>{if(act({type:'delete',id:selected}).ok)select(null);};$('strength').onchange=()=>act({type:'configure',id:selected,settings:{strength:Number($('strength').value)}});$('accept').onchange=()=>act({type:'configure',id:selected,settings:{accept:$('accept').value}});
$('connect').onclick=()=>act({type:'link',from:selected,to:$('connection').value});$('disconnect').onclick=()=>act({type:'unlink',from:selected,to:$('connection').value});$('starting').onclick=()=>act({type:'start',id:selected});
for(const type of ['undo','redo'])$(type).onclick=()=>{if(game.state==='build'){game.editor[type]();refresh();}};
$('reset').onclick=()=>{if(game.state==='build'){game.editor.reset();select(null);say('Puzzle reset. Undo can restore your last layout.');}};
$('push').onclick=push;$('pause').onclick=pause;$('edit').onclick=edit;$('retry').onclick=()=>{game.restartSim();shown=false;refresh();};$('replay').onclick=replay;$('speed').onchange=()=>game.setSpeed($('speed').value);$('timeline').oninput=()=>{game.seek(Number($('timeline').value)/15);refresh();};$('fit').onclick=fit;
$('hint').onclick=()=>say(game.board.hint||'Try a starter domino with the next toy within its falling reach.');$('menu').onclick=()=>{game.pause();refresh();$('back-machine').hidden=false;open('home');};
$('back-machine').onclick=()=>{$('home').close();refresh();};
$('play').onclick=()=>{$('home').close();const i=store.data.stars.findIndex(s=>!s);load(LEVELS[i<0?11:i]);};
$('sandbox').onclick=()=>{$('home').close();load(createSandbox());};
$('levels-button').onclick=()=>{$('levels').replaceChildren(...LEVELS.map((l,i)=>{const btn=document.createElement('button');const s=document.createElement('small');s.textContent=`PUZZLE ${String(i+1).padStart(2,'0')}`;const title=document.createElement('span');title.textContent=l.title;const stars=document.createElement('b');stars.textContent='★'.repeat(store.data.stars[i])+'☆'.repeat(3-store.data.stars[i]);btn.append(s,title,stars);btn.disabled=!store.unlocked(i);btn.onclick=()=>{$('level-dialog').close();$('home').close();load(l);};return btn;}));open('level-dialog');};
$('how').onclick=()=>open('help');$('settings-button').onclick=()=>{for(const k of ['sound','volume','reduced','quality']){if(['sound','reduced'].includes(k))$(k).checked=store.data.settings[k];else $(k).value=store.data.settings[k];}open('settings');};
for(const k of ['sound','volume','reduced','quality'])$(k).onchange=()=>{store.data.settings[k]=['sound','reduced'].includes(k)?$(k).checked:k==='volume'?Number($(k).value):$(k).value;audio.enabled=store.data.settings.sound;audio.volume=store.data.settings.volume;audio.unlock();store.save();};
function saved(){ $('saved-layouts').replaceChildren(...store.data.layouts.map(l=>{const b=document.createElement('button');b.textContent=`Load ${l.name}`;b.onclick=()=>{load(l.board);$('save-dialog').close();};return b;}));}
$('saves').onclick=()=>{if(game.state!=='build'){say('Choose Edit Setup before saving.');return;}saved();open('save-dialog');};$('save-layout').onclick=()=>{try{store.saveLayout($('save-name').value,game.board);saved();$('save-message').textContent=store.error||'Layout saved.';}catch(e){$('save-message').textContent=e.message;}};
$('export').onclick=()=>{$('json').value=JSON.stringify(game.board,null,2);$('save-message').textContent='Copy this text to keep or share your machine.';};$('import').onclick=()=>{try{load(parseLayout($('json').value));$('save-dialog').close();say('Imported machine.');}catch(e){$('save-message').textContent=e.message;}};
$('next').onclick=()=>{$('victory').close();if(Number(game.board.id)<12)load(LEVELS[Number(game.board.id)]);else{open('home');say('All twelve machines complete! The workshop is yours.');}};$('victory-replay').onclick=()=>{$('victory').close();replay();};$('victory-edit').onclick=()=>{$('victory').close();edit();};
audio.enabled=store.data.settings.sound;audio.volume=store.data.settings.volume;
function frame(now){const delta=(now-last)/1000;last=now;const prior=game.state;game.advance(delta);const events=game.sim?.drainEvents()||[];renderer.feedback(events);audio.play(events);
  if(prior!==game.state)refresh();
  if(['success','stopped'].includes(game.state)&&!shown){shown=true;if(game.state==='success'){
    if(!game.sandbox&&!game.awarded){store.award(game.result);game.awarded=true;}$('stars').textContent=game.sandbox?'✦':'★'.repeat(game.result.stars)+'☆'.repeat(3-game.result.stars);$('result').textContent=`${game.result.used} placed toys · ${game.result.duration.toFixed(2)} seconds · ${game.result.triggered} triggered. ${store.error}`;$('next').hidden=game.sandbox;$('next').textContent=Number(game.board.id)===12?'Workshop complete':'Next puzzle';open('victory');
    }else say(`CHAIN STOPPED · ${game.sim.reason||'The machine settled.'} ${game.sim.lastEvent?.text||''}`);}
  const ghost=input.ghost;renderer.draw(game.board,game.scene,{time:now/1000,selectedId:selected,ghost,valid:!ghost||!placementError(game.board,ghost,input.drag?.kind==='move'?ghost.id:null),quality:store.data.settings.quality,reduced:store.data.settings.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches,highlightId:game.state==='stopped'?(game.sim.lastEvent?.id||game.sim.lastEvent?.b):null});
  if(game.state.startsWith('replay'))$('timeline').value=Math.round(game.replayTime*15);
  requestAnimationFrame(frame);
}
window.addEventListener('resize',fit);document.addEventListener('visibilitychange',()=>{if(document.hidden){game.pause();refresh();}});
load(LEVELS[0]);open('home');requestAnimationFrame(frame);
// A read-only inspection surface helps automated QA observe the same public controls.
globalThis.domino={get game(){return game;},renderer,store,get input(){return input;}};
