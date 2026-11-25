(function(){
'use strict';
const $=id=>document.getElementById(id),{World,MATERIALS,ID}=ParticleLabMaterials,{LEVELS,Session,templates}=ParticleLabChallenges,E=ParticleLabExperiment;
const canvas=$('sim'),renderer=new ParticleLabRenderer(canvas),listeners=[],history=[],costs=[];
const SETTINGS_KEY='forge.elementerra.presentation.v1';
const mobilePalette=matchMedia('(max-width: 600px), (max-height: 500px) and (orientation: landscape)');
const modalOpen=()=>$('menuDialog').open||$('levelsDialog').open;
const stepInterval=1/30;
const effect=(index,id,event)=>renderer.addEffect(index,id,event,world().tick,world().width);
let mode='sandbox',sandbox=templates('empty'),initial=sandbox.export(),session=null,material=ID.sand,tool='brush',radius=1,rate=3,running=true,speed=1,accumulator=0,last=performance.now(),raf=0,dirty=true,pointer=null,lastHud=0,disposed=false,completionShown=false,keyCursor={x:48,y:32},tour=-1;
let sandboxRunning=true;
let completed=[],storageIssue='';try{const raw=localStorage.getItem(E.PROGRESS_KEY);if(raw){const p=E.progress(localStorage);completed=p.completed;storageIssue=p.error||'';}}catch{storageIssue='Browser storage is unavailable. You can still experiment.';}
const world=()=>mode==='sandbox'?sandbox:session.world;
const listen=(el,name,fn,options)=>{el.addEventListener(name,fn,options);listeners.push(()=>el.removeEventListener(name,fn,options));};
function status(text){const el=$('status');if(el.textContent!==text)el.textContent=text;}
function setPalette(open){
  $('paletteToggle').setAttribute('aria-expanded',String(open));
  $('paletteBody').hidden=!open;
}
function cursorTint(){
  if(tool==='heat')return '#ffc174';
  if(tool==='cool')return '#8ed9ed';
  if(['inspect','erase'].includes(tool))return '#f1eee3';
  return ParticleLabRenderer.swatches[material];
}
function endPointer(){if(pointer&&canvas.hasPointerCapture(pointer.id))canvas.releasePointerCapture(pointer.id);pointer=null;renderer.preview=null;dirty=true;}
function pause(value){running=!value;endPointer();accumulator=0;last=performance.now();$('pause').textContent=running?'Ⅱ Pause':'▶ Play';$('pause').setAttribute('aria-pressed',String(!running));dirty=true;}
function record(){if(mode!=='sandbox')return;history.push(sandbox.export());if(history.length>12)history.shift();$('undo').disabled=false;}
function selection(){document.querySelectorAll('[data-material]').forEach(b=>{b.setAttribute('aria-pressed',String(+b.dataset.material===material));b.disabled=mode==='challenge'&&!session.level.materials.includes(+b.dataset.material);});document.querySelectorAll('[data-tool]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.tool===tool));b.disabled=mode==='challenge'&&b.dataset.tool!=='inspect'&&!session.level.tools.includes(b.dataset.tool);});$('materialHelp').textContent=MATERIALS[material].description;$('activeMaterial').textContent=MATERIALS[material].name;if(renderer.cursor){renderer.cursor.radius=tool==='inspect'||tool==='rect'?0:radius;renderer.cursor.tint=cursorTint();}$('brushValue').textContent=radius===0?'1 cell':String(radius*2+1)+' cells';$('brush').value=radius;$('undo').disabled=mode==='challenge'||!history.length;dirty=true;}
function chooseTool(t){endPointer();tool=t;selection();if(tour===2&&t==='heat')tourAdvance();}
function canTool(t){return mode==='sandbox'||t==='inspect'||session.level.tools.includes(t);}
function resetUi(){endPointer();renderer.clearEffects();completionShown=false;$('completion').hidden=true;$('hint').hidden=true;$('hintToggle').setAttribute('aria-expanded','false');history.length=0;accumulator=0;dirty=true;}
function switchMode(next){if(next===mode)return;if(mode==="sandbox")sandboxRunning=running;resetUi();mode=next;if(mode==='challenge'){tour=-1;$('tutorial').hidden=true;session=new Session(Math.min(11,completed.length));tool=session.level.tools[0];material=session.level.materials[0]??ID.sand;radius=0;}$('sandboxMode').setAttribute('aria-pressed',String(mode==='sandbox'));$('challengeMode').setAttribute('aria-pressed',String(mode==='challenge'));$('challengePanel').hidden=mode!=='challenge';$('saveControls').hidden=mode!=='sandbox';$('templateWrap').hidden=mode!=='sandbox';$('clear').disabled=mode==='challenge';if(mode==='sandbox'){tool='brush';material=ID.sand;}pause(mode==='challenge'||!sandboxRunning);refreshChallenge();selection();status(mode==='sandbox'?'Sandbox restored. Your experiment stayed separate.':'Build while paused; press Play to test your solution.');}
function beginLevel(index){resetUi();session=new Session(index);tool=session.level.tools[0];material=session.level.materials[0]??ID.sand;radius=0;$('levelsDialog').close();pause(true);refreshChallenge();selection();status('Experiment loaded. Build while paused, then press Play.');}
function refreshChallenge(){if(mode!=='challenge')return;const l=session.level;$('levelNumber').textContent=`EXPERIMENT ${String(session.index+1).padStart(2,'0')} / ${LEVELS.length}`;$('challengeTime').max=l.maxTicks;$('levelName').textContent=l.name;$('objective').textContent=l.objective;$('hint').replaceChildren();const p=document.createElement('p');p.textContent=l.hint;$('hint').append(p);const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Tested recipe (grid coordinates; Inspect shows position)';details.append(summary);const recipe=document.createElement('p');recipe.className='recipe';recipe.textContent=l.solution.map(a=>a.wait?`Run ${a.wait} ticks (${(a.wait/30).toFixed(1)}s)`:`${a.tool}${a.material!=null?' '+MATERIALS[a.material].name:''} (${a.x},${a.y})${Number.isFinite(a.x2)?` → (${a.x2},${a.y2})`:''}${a.radius?' · size '+(a.radius*2+1):' · size 1'}`).join(' → ');details.append(recipe);$('hint').append(details);updateHud();}
function showLevels(){endPointer();const grid=$('levelGrid');grid.replaceChildren();$('levelSummary').textContent=`${completed.length} / ${LEVELS.length} complete`;LEVELS.forEach((l,i)=>{const b=document.createElement('button'),done=completed.includes(i),unlocked=i===0||completed.includes(i-1);b.dataset.level=i;b.dataset.state=done?'complete':unlocked?'available':'locked';b.disabled=!unlocked;const small=document.createElement('small'),name=document.createElement('b');small.textContent=`${String(i+1).padStart(2,'0')} · ${done?'COMPLETE ✓':unlocked?'AVAILABLE':'LOCKED'}`;name.textContent=l.name;b.append(small,name);b.addEventListener('click',()=>beginLevel(i));grid.append(b);});$('levelsDialog').showModal();}
function finish(){if(mode!=='challenge'||session.status==='playing'||completionShown)return;completionShown=true;pause(true);$('completion').classList.toggle('won',session.status==='won');$('resultLabel').textContent=session.status==='won'?'Experiment complete':'Experiment ended';if(session.status==='won'){if(!completed.includes(session.index))completed.push(session.index);const saved=E.saveProgress(safeStorage(),completed);$('completionTitle').textContent=session.level.name+' ✓';$('completionDetail').textContent=`${session.world.tick} simulation ticks · ${session.edits} / ${session.budget} budget used.${saved?' Progress saved.':' Progress kept for this visit; browser storage is unavailable.'}`;const final=session.index===LEVELS.length-1;$('nextLevel').hidden=final;status(saved?(final?'Final experiment complete.':'Experiment complete. Next challenge unlocked.'):'Experiment complete. Storage unavailable; progress is kept for this visit.');}else{$('completionTitle').textContent='Try another approach';$('completionDetail').textContent=session.progress;$('nextLevel').hidden=true;status('Time limit reached. Retry restores the original experiment.');}updateHud();$('completion').hidden=false;}
function safeStorage(){try{return localStorage;}catch{return {getItem(){throw Error();},setItem(){throw Error();}};}}
function updateHud(){const w=world();let total=0;for(const c of w.cells)if(c)total++;$('stats').textContent=`${total.toLocaleString()} cells · tick ${w.tick} · ${speed}×${costs.length?' · '+(costs.reduce((a,b)=>a+b,0)/costs.length).toFixed(1)+' ms / tick':''}`;$('stageTag').textContent=mode==='sandbox'?'SANDBOX / 96 × 64':`EXPERIMENT ${session.index+1} / 96 × 64`;if(mode==='challenge'){
  const progress=$('objectiveProgress');
  if(progress.textContent!==session.progress)progress.textContent=session.progress;
  $('budget').textContent=`Budget ${session.edits} / ${session.budget} · ${Math.max(0,session.level.maxTicks-w.tick)} ticks left`;
  $('challengeTime').value=w.tick;
}
if(renderer.cursor) updateReadout(renderer.cursor.x,renderer.cursor.y);
}
function flood(x,y){const w=world(),start=y*w.width+x;if(w.cells[start]||w.locked[start])return 0;const seen=new Uint8Array(w.cells.length),stack=[start];let n=0;seen[start]=1;while(stack.length){const i=stack.pop();if(w.cells[i]||w.locked[i])continue;w.set(i%96,Math.floor(i/96),material);n++;for(const j of [i%96?i-1:-1,i%96<95?i+1:-1,i-96,i+96])if(j>=0&&j<w.cells.length&&!seen[j]){seen[j]=1;stack.push(j);}}return n;}
function apply(a){renderer.invalidate();if(a.tool==='inspect'){inspect(a.x,a.y);return false;}if(mode==='challenge'){const ok=session.apply(a);if(!ok)status('No edit made. Check the allowed tools, editable area and remaining budget.');else status('Edit placed. Press Play to test, or keep building.');dirty=true;return ok;}const w=sandbox;let n=0;switch(a.tool){case 'brush':n=w.paint(a.x,a.y,a.material,a.radius);break;case 'line':n=w.line(a.x,a.y,a.x2,a.y2,a.material,a.radius);break;case 'rect':n=w.rect(a.x,a.y,a.x2,a.y2,a.material,true);break;case 'erase':n=w.line(a.x,a.y,a.x2??a.x,a.y2??a.y,0,a.radius);break;case 'heat':case 'cool':n=w.heat(a.x,a.y,a.tool==='heat'?160:-400,a.radius);break;case 'fill':n=flood(a.x,a.y);break;}dirty=true;if(n&&tour===0)tourAdvance();if(n&&tour===2&&a.tool==='heat')tourAdvance();return !!n;}
function updateReadout(x,y){
  const w=world(),i=y*w.width+x,el=$('cursorReadout');
  const text=`(${x}, ${y}) · ${MATERIALS[w.cells[i]].name} · ${w.temp[i].toFixed(1)}°C${w.locked[i]?' · fixed fixture':''}`;
  if(el.textContent!==text)el.textContent=text;
}
function inspect(x,y){
  renderer.cursor={x,y,radius:tool==='inspect'||tool==='rect'?0:radius,tint:cursorTint()};
  updateReadout(x,y);
  dirty=true;
}
function point(e){const r=canvas.getBoundingClientRect();return {x:Math.min(95,Math.max(0,Math.floor((e.clientX-r.left)/r.width*96))),y:Math.min(63,Math.max(0,Math.floor((e.clientY-r.top)/r.height*64)))};}
function actionAt(p,p2=p){return {tool,x:p.x,y:p.y,x2:p2.x,y2:p2.y,material,radius};}
function stroke(a,b){if(tool==='brush'||tool==='erase'){const n=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));for(let i=1;i<=n;i++){const t=i/n;apply(actionAt({x:Math.round(a.x+(b.x-a.x)*t),y:Math.round(a.y+(b.y-a.y)*t)}));}}else apply(actionAt(b));}
listen(canvas,'pointerdown',e=>{if(e.button!==0||pointer||modalOpen()||!$('completion').hidden)return;e.preventDefault();canvas.focus({preventScroll:true});const p=point(e);inspect(p.x,p.y);if(!canTool(tool))return;if(tool==='inspect')return;record();pointer={id:e.pointerId,start:p,last:p,time:0};canvas.setPointerCapture(e.pointerId);if(!['line','rect'].includes(tool))apply(actionAt(p));});
function dragTo(p) {
  if(tool==='line'||tool==='rect'){
    renderer.preview={...actionAt(pointer.start,p),tint:cursorTint()};
  }else if(p.x!==pointer.last.x||p.y!==pointer.last.y){
    stroke(pointer.last,p);
  }
  pointer.last=p;
}
listen(canvas,'pointermove',e=>{
  if(modalOpen()||!$('completion').hidden||(pointer&&pointer.id!==e.pointerId)) return;
  const p=point(e);
  if(pointer&&pointer.id===e.pointerId){
    e.preventDefault();
    if(tool==='brush'||tool==='erase'){
      for(const sample of e.getCoalescedEvents?.()||[]) dragTo(point(sample));
    }
    dragTo(p);
  }
  inspect(p.x,p.y);
});
listen(canvas,'pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=point(e);if(tool==='line'||tool==='rect')apply(actionAt(pointer.start,p));else dragTo(p);endPointer();if(e.pointerType==='touch')renderer.cursor=null;});
listen(canvas,'pointercancel',e=>{
  if(pointer&&pointer.id!==e.pointerId) return;
  endPointer();
  renderer.cursor=null;
});
listen(canvas,'lostpointercapture',e=>{
  if(pointer?.id!==e.pointerId) return;
  pointer=null;
  renderer.preview=null;
  dirty=true;
});
listen(canvas,'pointerleave',()=>{if(!pointer){renderer.cursor=null;dirty=true;}});
function advance(n=1){for(let i=0;i<n;i++){const start=performance.now();const notify=renderer.reduced||renderer.low?undefined:effect;const motion=notify?renderer.beginStep(world(),stepInterval/speed):undefined;if(mode==='challenge'){session.step(1,notify,motion);finish();}else sandbox.step(notify,motion);costs.push(performance.now()-start);if(costs.length>120)costs.shift();if(!running&&mode==='challenge'&&session.status!=='playing')break;}dirty=true;}
function frame(ts){if(disposed)return;const dt=Math.min(.1,Math.max(0,(ts-last)/1000));last=ts;if(running&&!document.hidden){accumulator+=dt*speed;let steps=0;const deadline=performance.now()+10;while(accumulator>=stepInterval&&steps<6&&performance.now()<deadline){advance();accumulator-=stepInterval;steps++;if(!running){accumulator=0;break;}}accumulator=Math.min(accumulator,stepInterval*6);if(pointer&&['brush','heat','cool','erase'].includes(tool)){pointer.time+=dt;if(pointer.time>=1/(rate*5)){apply(actionAt(pointer.last));pointer.time=0;}}}if(dirty||renderer.wantsFrame(ts,running)){renderer.draw(world(),mode==='challenge'?session.level.zones:[],ts,running);dirty=false;}if(ts-lastHud>180){updateHud();lastHud=ts;}raf=requestAnimationFrame(frame);}
function tourAdvance(){tour++;if(tour>3){tour=-1;$('tutorial').hidden=true;status('Tour complete. Try a challenge or create your own experiment.');return;}const steps=[['1 · Make a little matter','Choose Sand and draw on the canvas. Grains fall and pile up.'],['2 · Freeze time','Press Pause, then draw a line or rectangle. Editing stays available while time is stopped.'],['3 · Change the temperature','Choose Ice and paint a block. Select Heat +, then tap the ice to melt it.'],['4 · Try an ELEMENTERRA experiment','Open Challenge Mode to begin Sandfall. Each experiment teaches a new interaction.']];$('tutorial').hidden=false;$('tourTitle').textContent=steps[tour][0];$('tourText').textContent=steps[tour][1];$('tourNext').textContent=tour===3?'Finish tour':'Skip step';}
const groups=[
  ['Powders',[ID.sand]],['Liquids',[ID.water,ID.oil,ID.lava]],
  ['Solids',[ID.stone,ID.metal,ID.wood,ID.ice]],['Gases & effects',[ID.steam,ID.fire,ID.smoke]],
];
for(const [name,ids] of groups){
  const group=document.createElement('section'),heading=document.createElement('h3'),buttons=document.createElement('div');
  group.className='materialGroup';
  heading.textContent=name;
  group.append(heading,buttons);
  for(const id of ids){
    const m=MATERIALS[id],button=document.createElement('button'),swatch=document.createElement('span');
    button.type='button';
    button.dataset.material=id;
    button.title=m.description;
    swatch.className='swatch '+m.state;
    swatch.style.setProperty('--chip',ParticleLabRenderer.swatches[id]);
    swatch.setAttribute('aria-hidden','true');
    button.append(swatch,m.name);
    listen(button,'click',()=>{
      endPointer();
      material=id;
      if(!canTool(tool)||tool==='inspect')tool=mode==='challenge'?session.level.tools[0]:'brush';
      selection();
    });
    buttons.append(button);
  }
  $('materials').append(group);
}
setPalette(!mobilePalette.matches);
listen(mobilePalette,'change',e=>setPalette(!e.matches));
listen($('paletteToggle'),'click',()=>setPalette($('paletteBody').hidden));
function storeSettings(){
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({quality:renderer.quality,rate}));}catch{/* Settings remain available for this visit. */}
}
try{
  const stored=JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if(['auto','low','high'].includes(stored?.quality))renderer.quality=stored.quality;
  if([1,3,6].includes(stored?.rate))rate=stored.rate;
}catch{/* Use defaults when storage is unavailable. */}
$('quality').value=renderer.quality;
$('rate').value=rate;
listen($('quality'),'change',e=>{
  renderer.quality=e.target.value;
  renderer.clearEffects();
  renderer.invalidate();
  renderer.resize();
  dirty=true;
  storeSettings();
});
listen(renderer.motion,'change',()=>{
  renderer.clearEffects();
  renderer.invalidate();
  dirty=true;
});
listen($('menuOpen'),'click',()=>{
  endPointer();
  $('menuStatus').hidden=true;
  $('menuDialog').showModal();
});
listen($('menuSandbox'),'click',()=>{$('menuDialog').close();switchMode('sandbox');});
listen($('menuChallenges'),'click',()=>{$('menuDialog').close();switchMode('challenge');});
listen($('menuHelp'),'click',()=>{$('menuDialog').close();$('help').click();});
listen($('menuContinue'),'click',()=>{
  try{
    const saved=E.load(safeStorage());
    $('menuDialog').close();
    switchMode('sandbox');
    loadWorld(saved);
  }catch(error){
    $('menuStatus').textContent=error.message;
    $('menuStatus').hidden=false;
  }
});
for(const b of document.querySelectorAll('[data-tool]'))listen(b,'click',()=>chooseTool(b.dataset.tool));
listen($('sandboxMode'),'click',()=>switchMode('sandbox'));listen($('challengeMode'),'click',()=>switchMode('challenge'));listen($('pause'),'click',()=>{pause(running);if(tour===1)tourAdvance();});listen($('step'),'click',()=>{pause(true);advance();updateHud();});listen($('speed'),'change',e=>{speed=+e.target.value;accumulator=0;});listen($('brush'),'input',e=>{radius=+e.target.value;selection();});listen($('rate'),'change',e=>{rate=+e.target.value;storeSettings();});
listen($('undo'),'click',()=>{if(mode==='sandbox'&&history.length){endPointer();renderer.clearEffects();sandbox=World.from(history.pop());selection();dirty=true;status('Last edit undone, including its simulation snapshot.');}});
listen($('reset'),'click',()=>{resetUi();if(mode==='sandbox')sandbox=World.from(initial);else session.retry();pause(mode==='challenge');refreshChallenge();selection();status(mode==='sandbox'?'Starting environment restored.':'Experiment reset. Budget and original materials restored.');});
listen($('clear'),'click',()=>{if(mode!=='sandbox')return;endPointer();record();renderer.clearEffects();sandbox=new World();dirty=true;status('Empty laboratory. Undo is available.');});
listen($('template'),'change',e=>{if(mode!=='sandbox')return;endPointer();record();renderer.clearEffects();sandbox=templates(e.target.value);initial=sandbox.export();dirty=true;status('Starting scene: '+e.target.selectedOptions[0].textContent);});
listen($('save'),'click',()=>{try{E.save(safeStorage(),sandbox);status('Sandbox saved locally. Challenge progress stays separate.');}catch(e){status(e.message);}});
function loadWorld(next){endPointer();record();renderer.clearEffects();sandbox=next;initial=sandbox.export();pause(true);selection();dirty=true;status('Sandbox loaded and paused. Press Play to continue.');}
listen($('load'),'click',()=>{try{loadWorld(E.load(safeStorage()));}catch(e){status(e.message);}});
listen($('export'),'click',()=>{const blob=new Blob([E.encode(sandbox)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='elementerra-sandbox-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Sandbox exported as a version 2 file.');});
listen($('import'),'click',()=>$('importFile').click());listen($('importFile'),'change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1500000)throw Error('This file exceeds the save limit. Your lab is unchanged.');const next=E.decode(await f.text());if(mode!=='sandbox')throw Error('Return to Sandbox before importing.');loadWorld(next);}catch(err){status(err.message);}finally{e.target.value='';}});
listen($('hintToggle'),'click',()=>{$('hint').hidden=!$('hint').hidden;$('hintToggle').setAttribute('aria-expanded',String(!$('hint').hidden));});listen($('levelSelect'),'click',showLevels);listen($('closeLevels'),'click',()=>$('levelsDialog').close());listen($('replay'),'click',()=>beginLevel(session.index));listen($('allLevels'),'click',showLevels);listen($('nextLevel'),'click',()=>beginLevel(Math.min(11,session.index+1)));
listen($('help'),'click',()=>{if(mode!=='sandbox')switchMode('sandbox');tour=-1;tourAdvance();});listen($('tourNext'),'click',tourAdvance);listen($('tourClose'),'click',()=>{tour=-1;$('tutorial').hidden=true;});
listen(document,'keydown',e=>{if(e.key==='Escape'){endPointer();tour=-1;$('tutorial').hidden=true;return;}if(e.target.matches('input,select,textarea')||modalOpen()||!$('completion').hidden)return;const key=e.key.toLowerCase();if(e.target===canvas&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)){e.preventDefault();if(e.key==='Enter'){record();apply(actionAt(keyCursor));}else{keyCursor.x=Math.max(1,Math.min(94,keyCursor.x+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)));keyCursor.y=Math.max(1,Math.min(62,keyCursor.y+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)));inspect(keyCursor.x,keyCursor.y);}return;}if(e.code==='Space'&&!e.target.matches('button')){e.preventDefault();pause(running);}if(key==='.'&&!e.ctrlKey){pause(true);advance();}const keys={b:'brush',l:'line',r:'rect',f:'fill',e:'erase',h:'heat',c:'cool',i:'inspect'};if(keys[key]&&!e.ctrlKey&&!e.metaKey&&canTool(keys[key]))chooseTool(keys[key]);if(key==='z'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('undo').click();}});
listen(document,'visibilitychange',()=>{last=performance.now();accumulator=0;endPointer();});
const observer=new ResizeObserver(()=>{renderer.resize();dirty=true;});observer.observe(canvas);
listen(window,'pageshow',()=>{last=performance.now();accumulator=0;renderer.resize();dirty=true;});
listen(window,'pagehide',event=>{endPointer();if(event.persisted)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();for(const off of listeners)off();});
window.particleLabDebug=Object.freeze({inspect:()=>({mode,running,speed,material,tool,radius,completed:[...completed],world:world().export(),session:session?{index:session.index,status:session.status,edits:session.edits,progress:session.progress}:null,performance:{samples:costs.length,mean:costs.length?costs.reduce((a,b)=>a+b,0)/costs.length:0,max:costs.length?Math.max(...costs):0},reducedMotion:renderer.reduced,quality:renderer.quality})});
selection();renderer.resize();updateHud();if(storageIssue)status(storageIssue);raf=requestAnimationFrame(frame);
})();
