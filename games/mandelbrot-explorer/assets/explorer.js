/* Application orchestration; legacy camera, pointer controls, destinations and bookmark UI remain in the preceding script. */
(() => {
  const Core=FractalCore, canvas=document.getElementById('fractal-canvas'), h=new lt;
  const coarse=window.matchMedia('(pointer: coarse)').matches;
  const settingsKey='mandelbrot-explorer:settings:v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(settingsKey)||'{}')||{};}catch{}
  let settings=Core.preferences(saved,window.matchMedia('(prefers-reduced-motion: reduce)').matches,coarse);
  let multiplier=1,active=false,interacting=false,raf=null,last=performance.now(),lost=false,dirty=true,phase=settings.phase,frames=0;
  let renderer;const frameCosts=new Float32Array(240);
  const viewport=()=>({width:canvas.clientWidth||innerWidth,height:canvas.clientHeight||innerHeight});
  h.jumpTo(-.5,0,Core.fitScale(viewport().width,viewport().height),false);
  const L=()=>Core.iterations(h.scale,multiplier,settings.maxIterations);
  const saveSettings=()=>{try{localStorage.setItem(settingsKey,JSON.stringify({...settings,phase}));}catch{}};
  const selectedPalette=()=>Core.palettes.find(p=>p.id===settings.palette)||Core.palettes[0];
  const $=id=>document.getElementById(id);
  function createRenderer(){const next=new FractalRenderer(canvas,{vertex:mt,fragment:pt,maxDpr:coarse?1.25:2});next.onProgress=wake;return next;}
  try{renderer=createRenderer();}catch(error){$('intro').innerHTML='<div class="intro-content"><h1>WebGL2 is needed</h1><p>This browser cannot run the high-precision fractal renderer. Try a recent Chrome, Edge, Firefox or Safari.</p></div>';console.warn(error.message);return;}
  function wake(){if(!document.hidden&&!lost&&raf===null){last=performance.now();raf=requestAnimationFrame(frame);}}
  function invalidate(){dirty=true;if(settings.reducedMotion)h.jumpTo(h.targetCenterX,h.targetCenterY,h.targetScale,false);wake();}
  function toast(text){ui.showToast(text);}
  function travel(view,name){const v=Core.restore(view);h.jumpTo(v.x,v.y,v.scale,!settings.reducedMotion);multiplier=Core.clamp(v.iterations/(110+42*Math.log2(1.5/v.scale+1)),.3,4);invalidate();ui.closePanels();toast(view.scale<Core.MIN_SCALE?'Saved location opened at the supported zoom limit.':name);}
  function reset(){h.jumpTo(-.5,0,Core.fitScale(viewport().width,viewport().height),!settings.reducedMotion);invalidate();toast('Full set · view reset');}
  function randomDive(){travel(Ct(),'Discovery bookmark · random dive');}
  function saveLocation(){const b=It({name:'Bookmark '+(E().length+1),x:h.centerX,y:h.centerY,scale:h.scale,iterations:L(),palette:settings.palette,maxIterations:settings.maxIterations,multiplier});ui.renderBookmarks(E());toast(E().some(x=>x.id===b.id)?'Location saved on this device':'Storage unavailable · location could not be saved');}
  function iterationDelta(direction){multiplier=Core.clamp(multiplier*(direction>0?1.3:1/1.3),.3,4);invalidate();}
  function pickPalette(id){settings.palette=id;ui.setActivePalette(id);saveSettings();wake();updateControls();}
  const ui=new Pt({onBeginDive(){active=true;ui.showExplorer();$('explorer-bar').inert=$('controls').inert=false;$('hud').hidden=true;canvas.focus({preventScroll:true});wake();},
    onZoomIn(){h.zoomTo(1.6,h.centerX,h.centerY);invalidate();},onZoomOut(){h.zoomTo(1/1.6,h.centerX,h.centerY);invalidate();},
    onReset:reset,onRandomDive:randomDive,onIterDelta:iterationDelta,onSaveLocation:saveLocation,onSelectPalette:pickPalette,
    onSelectPreset:p=>travel(p===U[0]?{...p,scale:Core.fitScale(viewport().width,viewport().height)}:p,'Discovery bookmark · '+p.name),
    onSelectBookmark:b=>{if(!Core.validBookmark(b))return;settings.palette=b.palette;
      if(Number.isFinite(b.maxIterations))settings.maxIterations=Core.clamp(b.maxIterations,128,4000);
      else settings.maxIterations=Math.max(settings.maxIterations,Math.min(4000,b.iterations));
      travel(b,'Revisiting '+b.name);if(Number.isFinite(b.multiplier))multiplier=Core.clamp(b.multiplier,.3,4);
      ui.setActivePalette(settings.palette);saveSettings();updateControls();},
    onRenameBookmark:(id,name)=>{Dt(id,name.slice(0,80));ui.renderBookmarks(E());},
    onDeleteBookmark:id=>{Rt(id);ui.renderBookmarks(E());}});
  ui.setActivePalette(settings.palette);ui.renderBookmarks(E());
  const originalClose=ui.closePanels.bind(ui);
  ui.closePanels=()=>{originalClose();for(const id of ['settings-panel','help-panel'])$(id).hidden=true;};
  ui.togglePanel=panel=>{const show=panel.hidden;ui.closePanels();panel.hidden=!show;if(show)panel.querySelector('button,select,input')?.focus({preventScroll:true});};
  const input=new Et(canvas,h,{getViewport:viewport,onViewChange:invalidate,
    onInteractionStart(){interacting=true;wake();},onInteractionEnd(){interacting=false;invalidate();},
    onResetView:reset,onSaveLocation:saveLocation,onRandomDive:randomDive,onIterationsDelta:iterationDelta});
  function clearGestures(){input.pointers.clear();input.dragStart=input.dragLast=null;input.dragMoved=false;input.pinchLastDist=0;input.interactionActiveCount=0;
    if(input.interactionEndTimer!==null)clearTimeout(input.interactionEndTimer);input.interactionEndTimer=null;interacting=false;canvas.classList.remove('dragging');}
  function updateControls(){
    $('quality').value=settings.quality;$('max-iterations').value=String(settings.maxIterations);
    $('reduced-motion').checked=settings.reducedMotion;$('high-contrast').checked=settings.highContrast;
    $('cycle-speed').value=String(settings.cycleSpeed);$('colour-phase').value=String(phase);
    $('cycle-speed').disabled=settings.reducedMotion;$('btn-cycle').disabled=settings.reducedMotion;
    $('btn-cycle').setAttribute('aria-pressed',String(settings.cycle));$('btn-cycle').textContent=settings.cycle?'Freeze colours':'Cycle colours';
    document.body.classList.toggle('reduced-motion',settings.reducedMotion);document.body.classList.toggle('high-contrast',settings.highContrast);
    $('palette-current').textContent=selectedPalette().name;
  }
  function setting(id,callback,event='change'){$(id).addEventListener(event,e=>{callback(e.target);saveSettings();updateControls();wake();});}
  setting('quality',e=>{settings.quality=e.value;invalidate();});
  setting('max-iterations',e=>{settings.maxIterations=Number(e.value);invalidate();});
  setting('reduced-motion',e=>{settings.reducedMotion=e.checked;if(e.checked){settings.cycle=false;h.stop();}invalidate();});
  setting('high-contrast',e=>settings.highContrast=e.checked);
  setting('cycle-speed',e=>settings.cycleSpeed=Number(e.value),'input');
  setting('colour-phase',e=>{phase=Number(e.value);settings.cycle=false;},'input');
  $('btn-cycle').addEventListener('click',()=>{settings.cycle=!settings.cycle&&!settings.reducedMotion;saveSettings();updateControls();wake();});
  $('btn-info').addEventListener('click',()=>{$('hud').hidden=!$('hud').hidden;$('btn-info').setAttribute('aria-expanded',String(!$('hud').hidden));});
  $('btn-settings').addEventListener('click',()=>ui.togglePanel($('settings-panel')));
  $('btn-help').addEventListener('click',()=>ui.togglePanel($('help-panel')));
  document.querySelectorAll('[data-close]').forEach(button=>button.setAttribute('aria-label','Close panel'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){ui.closePanels();canvas.focus({preventScroll:true});}});
  canvas.addEventListener('pointerdown',()=>{if(active)ui.closePanels();});
  canvas.addEventListener('wheel',()=>{if(active)ui.closePanels();},{passive:true});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;clearGestures();if(raf!==null)cancelAnimationFrame(raf);raf=null;renderer.suspend();$('render-status').textContent='Graphics paused · restoring context';});
  canvas.addEventListener('webglcontextrestored',()=>{try{renderer=createRenderer();lost=false;invalidate();toast('Graphics restored');}catch{toast('Graphics could not restart. Reload this page.');}});
  document.addEventListener('visibilitychange',()=>{clearGestures();if(document.hidden){if(raf!==null)cancelAnimationFrame(raf);raf=null;renderer.suspend();saveSettings();}else invalidate();});
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(invalidate,80);});
  window.addEventListener('orientationchange',()=>{clearGestures();invalidate();});
  function frame(now){
    raf=null;if(document.hidden||lost)return;
    const start=performance.now(),dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    const oldX=h.centerX,oldY=h.centerY,oldScale=h.scale;
    const moving=h.update(dt);
    if(dirty||oldX!==h.centerX||oldY!==h.centerY||oldScale!==h.scale){renderer.request(h,{iterations:L(),quality:settings.quality,coarse,previewOnly:moving||interacting});dirty=false;}
    const pending=renderer.step();
    if(settings.cycle&&active&&!settings.reducedMotion)phase=(phase+dt*settings.cycleSpeed)%1;
    renderer.present(selectedPalette(),phase);
    const info=renderer.inspect();ui.updateHUD(h.centerX,h.centerY,h.scale,h.getZoomDepth(),L(),info.renderMs,h.isNearPrecisionLimit());
    const message=info.status==='ready'?'Detail ready':info.status==='preview'?'Approximate preview':'Refining · preview shown';
    if($('render-status').textContent!==message)$('render-status').textContent=message;
    $('hud-palette').textContent=selectedPalette().name;$('hud-width').textContent=(2*h.scale*viewport().width/viewport().height).toPrecision(5);
    $('hud-precision').textContent=h.atPrecisionFloor()?'Supported zoom limit · boundary detail remains approximate':'Approaching supported zoom limit';
    frameCosts[(frames++)%240]=performance.now()-start;
    if(moving||(pending&&!info.waitingWorker)||(settings.cycle&&active&&!settings.reducedMotion))raf=requestAnimationFrame(frame);
  }
  $('explorer-bar').inert=$('controls').inert=true;
  updateControls();
  window.MandelbrotDebug={camera:h,core:Core,inspect:()=>({camera:{centerX:h.centerX,centerY:h.centerY,scale:h.scale},settings:{...settings},phase,iterations:L(),interacting,active,rafPending:raf!==null,frames,frameCosts,renderer:renderer.inspect()}),
    probe:(v,w,height,limit)=>renderer.probe(v,w,height,limit),readCache:()=>renderer.readCache(),
    setView:(v)=>{h.jumpTo(v.x,v.y,v.scale,false);if(v.iterations)multiplier=Core.clamp(v.iterations/(110+42*Math.log2(1.5/h.scale+1)),.3,4);invalidate();}};
  wake();
})();
