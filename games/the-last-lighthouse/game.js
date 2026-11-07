/* One watch controller. The simulation alone owns ships, energy and weather. */
(() => {
  'use strict';
  const { Simulation, CONFIG, WORLD, SHIP_TYPES } = window.LastLighthouseSimulation;
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const settingsKey = 'forge-arcade:the-last-lighthouse:v1';
  let storage = null, sound = false;
  try {
    storage = localStorage;
    storage.setItem('forge-arcade:the-last-lighthouse:probe','1');
    storage.removeItem('forge-arcade:the-last-lighthouse:probe');
    sound = JSON.parse(storage.getItem(settingsKey) || 'null')?.sound === true;
  } catch { storage = null; $('storage-notice').hidden = false; }
  const audio = new window.LastLighthouseAudio.Audio({enabled:sound});
  const frameElement = $('ocean-frame'), canvas = $('ocean');
  const renderer = new window.LastLighthouseRendering.Renderer(canvas,WORLD,{reducedMotion:reduced.matches,beamWidth:CONFIG.beamWidth,beamRange:CONFIG.beamRange});
  let sim = new Simulation(71024), state = 'MENU';
  let raf = null, lastTime = null, visualTime = 0, hudTimer = 0;
  let dragging = null;
  const held = new Set();
  const input = {turn:0,aim:null};
  let noticeUntil = 0;
  const demo = {
    beamAngle:.6,beamOn:true,beamLocked:false,energy:100,storm:.22,time:0,
    ships:[
      {id:'ship-1',type:'fishing',x:700,y:625,angle:-2.8,radius:8,speed:7,confidence:.8,illuminated:true,warning:false,danger:0},
      {id:'ship-2',type:'sail',x:250,y:400,angle:.6,radius:9,speed:8,confidence:.3,illuminated:false,warning:false,danger:0},
      {id:'ship-3',type:'cargo',x:780,y:310,angle:2.65,radius:12,speed:7.5,confidence:.4,illuminated:false,warning:false,danger:0}
    ],rescued:0,lost:0
  };
  function timeText(seconds) {
    const total=Math.max(0,Math.floor(seconds));
    return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  }
  function soundUI() {
    $('sound-button').setAttribute('aria-pressed',String(audio.enabled));
    $('sound-label').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  }
  function resetInput() { held.clear(); input.turn=0; input.aim=null; dragging=null; }
  function resize() {
    const bounds=frameElement.getBoundingClientRect();
    if(bounds.width && bounds.height)renderer.resize(bounds.width,bounds.height,Math.min(devicePixelRatio||1,2));
    requestFrame();
  }
  function setState(next) {
    resetInput(); lastTime=null; state=next; document.body.dataset.state=next;
    const isMenu=next==='MENU'||next==='TUTORIAL';
    const modal=['TUTORIAL','PAUSED','VICTORY','GAME_OVER'].includes(next);
    $('menu').hidden=!isMenu; $('game-screen').hidden=isMenu;
    (isMenu?$('menu-scene'):$('arena-mount')).append(frameElement);
    $('dialog-backdrop').hidden=!modal;
    $('main').inert=modal; document.querySelector('.topbar').inert=modal;
    if(next==='PLAYING'){sim.resume();audio.wake();}
    if(next==='MENU'){sim.pause();audio.sleep();}
    if(next==='TUTORIAL'){sim.pause();audio.sleep();showTutorial();}
    if(next==='PAUSED'){sim.pause();audio.sleep();showPause();}
    if(next==='VICTORY'){audio.cue('victory');showVictory();}
    if(next==='GAME_OVER'){audio.cue('gameover');showLoss();}
    if(modal)queueMicrotask(()=>$('dialog-actions').querySelector('button')?.focus());
    else if(next==='PLAYING')canvas.focus({preventScroll:true});
    requestAnimationFrame(resize); requestFrame();
  }
  function start(seed=71024) {
    sim=new Simulation(seed); noticeUntil=0; renderer.effects.length=0;
    audio.wake(); setState('PLAYING');
    tell('The first vessel is approaching from the southwest. Give it a steady sweep.');
    updateHUD(); render(0);
  }
  function pause(){if(state==='PLAYING')setState('PAUSED');}
  function resume(){if(state==='PAUSED'){audio.wake();setState('PLAYING');}}
  function restart(){
    sim.restart(); renderer.effects.length=0; noticeUntil=0;
    audio.wake(); setState('PLAYING');
    tell('A fresh watch. The same sea, another chance to bring them home.');
    updateHUD(); render(0);
  }
  function toggleBeam() {
    if(state!=='PLAYING')return false;
    audio.wake();
    if(!sim.toggleBeam()){
      if(sim.beamLocked)tell('The lamp needs a little more charge before it can be relit.','energy');
      return false;
    }
    audio.cue('toggle');updateHUD();requestFrame();return true;
  }
  function tell(text,kind='') {
    $('notice').textContent=text;$('notice').dataset.kind=kind;noticeUntil=sim.time+9;
  }
  function processEvents() {
    for(const event of sim.events){
      renderer.event(event);
      if(event.type==='spawn'){audio.cue('spawn');tell(`${SHIP_TYPES[event.shipType]?.label || 'A vessel'} entering the ${event.x<500?'western':'eastern'} lane. Look for its identification light.`);}
      else if(event.type==='rescue'){audio.cue('rescue');tell(`${SHIP_TYPES[event.shipType]?.label || 'A vessel'} safely in harbor. ${sim.rescued} of 12 brought home.`);}
      else if(event.type==='loss'){audio.cue('loss');tell(`A vessel was lost ${event.reason==='boundary'?'beyond the chart':'in dangerous water'}. ${sim.lost} of 3 lost. Watch the warning triangles.`,'warning');}
      else if(event.type==='warning'){audio.cue('warning');tell('A vessel is nearing danger. Shine the beam on the warning triangle to help it turn.','warning');}
      else if(event.type==='exhausted')tell('The lamp is exhausted. Let it recharge; the ships remember their last heading.','energy');
      else if(event.type==='ready')tell('The lamp has recovered enough charge. Relight it when a vessel needs you.','energy');
    }
    sim.events.length=0;
    if(state==='PLAYING'&&(sim.state==='VICTORY'||sim.state==='GAME_OVER')){updateHUD();setState(sim.state);}
  }
  function updateHUD() {
    $('rescued-count').innerHTML=`${sim.rescued} <small>/ 12</small>`;
    $('lost-count').innerHTML=`${sim.lost} <small>/ 3</small>`;
    $('clock').textContent=timeText(sim.time);
    const energy=Math.round(sim.energy),storm=Math.round(sim.storm*100);
    $('energy-value').innerHTML=`${energy} <small>%</small>`;
    $('energy-fill').style.width=`${sim.energy/CONFIG.maxEnergy*100}%`;
    $('energy-meter').setAttribute('aria-valuenow',String(energy));
    $('energy-meter').dataset.low=String(energy<25);
    $('energy-state').textContent=sim.beamLocked?'RECHARGING LAMP':sim.beamOn?'LAMP BURNING':'LAMP RESTING';
    $('energy-rate').textContent=sim.beamOn?`−${CONFIG.energyDrain} / SEC`:`+${CONFIG.energyRecharge} / SEC`;
    $('beam-button').setAttribute('aria-pressed',String(sim.beamOn));
    $('beam-button').disabled=sim.beamLocked;
    $('beam-button-label').textContent=sim.beamLocked?`Recharging · ${Math.max(0,(CONFIG.rechargeThreshold-sim.energy)/CONFIG.energyRecharge).toFixed(1)}s`:sim.beamOn?'Extinguish beam':'Light the beam';
    $('storm-value').innerHTML=`${storm} <small>%</small>`;
    $('storm-fill').style.width=`${storm}%`;
    $('storm-meter').setAttribute('aria-valuenow',String(storm));
    $('weather-caption').textContent=sim.storm<.27?'A quiet opening in the weather.':sim.storm<.48?'The fog is gathering. Currents are strengthening.':'A steady storm. Keep an eye on the slower-turning cargo ships.';
    let urgent=null;
    for(const ship of sim.ships){if(!urgent||ship.danger>urgent.danger+.05||(Math.abs(ship.danger-urgent.danger)<=.05&&ship.confidence<urgent.confidence))urgent=ship;}
    $('ship-readout').dataset.danger=String(urgent?.warning || false);
    if(urgent){
      const number=urgent.id.replace(/\D/g,'').padStart(2,'0');
      $('ship-name').textContent=`${urgent.warning?'! ':''}${SHIP_TYPES[urgent.type].label} ${number}`;
      $('ship-status').textContent=urgent.warning?`Danger ahead · Guidance ${Math.round(urgent.confidence*100)}%`:urgent.illuminated?`Receiving your light · Guidance ${Math.round(urgent.confidence*100)}%`:urgent.confidence>.4?`Holding its course · Guidance ${Math.round(urgent.confidence*100)}%`:`Needs a sweep · Guidance ${Math.round(urgent.confidence*100)}%`;
    }else{$('ship-name').textContent=sim.rescued?'A moment between vessels':'Waiting for the first vessel';$('ship-status').textContent='The mint harbor lights mark safe water.';}
    if(sim.time>noticeUntil){
      const message=sim.beamLocked?'The lamp is recovering. It will stay off until you choose to relight it.':sim.ships.length>1?'Share the light. A guided ship keeps its course while you attend to another.':sim.beamOn?'A short, steady sweep builds confidence. Rest the lamp when the course is holding.':'The lamp recharges faster than it drains. Relight it before a ship loses its bearings.';
      if($('notice').textContent!==message){$('notice').textContent=message;$('notice').dataset.kind='';}
    }
    audio.setIntensity(sim.storm,sim.beamOn);
  }
  function dialog(kicker,title,copy,kind,mark='✧') {
    $('dialog-kicker').textContent=kicker;$('dialog-title').textContent=title;
    $('dialog-copy').textContent=copy;$('dialog-mark').textContent=mark;
    $('dialog').dataset.kind=kind;$('dialog-detail').replaceChildren();$('dialog-actions').replaceChildren();
  }
  function action(id,text,fn,primary=false){
    const button=document.createElement('button');button.id=id;button.type='button';button.className=primary?'primary-button':'secondary-button';button.textContent=text;button.addEventListener('click',fn);$('dialog-actions').append(button);
  }
  function stat(label,value){
    const box=document.createElement('div');box.className='result-stat';
    const name=document.createElement('span');name.className='label';name.textContent=label;
    const amount=document.createElement('strong');amount.textContent=value;box.append(name,amount);$('dialog-detail').append(box);
  }
  function showTutorial(){
    dialog('A KEEPER’S FIELD GUIDE','A little light\ngoes a long way.','The sea is patient at first. Learn the lamp, then let the ships teach you the rest.','tutorial');
    const list=document.createElement('ol');list.className='tutorial-list';
    const lessons=[['Aim at a vessel.','Drag across the ocean, or hold A/D or the arrow keys. The lamp turns smoothly; its gold cone gives ships a safe route around the island.'],['Build confidence, then move on.','A steady sweep helps a vessel hold its course after you look away. Cargo ships turn slowly; sailing vessels feel the currents more. A warning triangle means danger is near.'],['Rest the lamp.','Space or the lamp button switches it off. Energy recovers at 14 per second and drains at 8. An empty lamp must recover before you can relight it.'],['Bring twelve home.','Mint harbor lights mark safety. Three ships lost ends the watch. P/Escape pauses everything; R restarts the same watch.']];
    for(const [heading,copy]of lessons){const row=document.createElement('li'),title=document.createElement('strong');title.textContent=heading;row.append(title,document.createElement('br'),copy);list.append(row);}
    $('dialog-detail').append(list);
    action('tutorial-start','Begin the watch',()=>start(),true);
    action('menu-button','Back to the lighthouse',()=>{setState('MENU');$('start-button').focus();});
  }
  function showPause(){
    dialog('THE WATCH IS ON HOLD','Even the sea\ncan wait.','Every vessel, current, and moment of lamp energy is held exactly where you left it.','pause','Ⅱ');
    stat('RESCUED',`${sim.rescued} / 12`);stat('WATCH TIME',timeText(sim.time));
    action('resume-button','Resume watch',resume,true);action('retry-button','Restart this watch',restart);action('menu-button','Main menu',()=>{setState('MENU');$('start-button').focus();});
  }
  function showVictory(){
    dialog('NORTH REACH / ALL VESSELS ACCOUNTED FOR','THE HARBOR\nIS SAFE','Twelve lights along the shore. Twelve stories carried home.\nFor one more night, the beacon held.','victory','✧');
    stat('SHIPS RESCUED',String(sim.rescued));stat('SHIPS LOST',String(sim.lost));stat('COMPLETION TIME',timeText(sim.time));stat('BEAM EFFICIENCY',`${Math.round(sim.efficiency)}%`);
    action('play-again-button','Play again',restart,true);action('menu-button','Back to the lighthouse',()=>{setState('MENU');$('start-button').focus();});
  }
  function showLoss(){
    dialog('NORTH REACH / WATCH ENDED','The light\nwill return.','The storm took its toll. Another watch is waiting, and the same sea gives you another chance.','loss','⋈');
    stat('SHIPS RESCUED',String(sim.rescued));stat('SHIPS LOST',String(sim.lost));stat('SURVIVAL TIME',timeText(sim.time));stat('BEAM EFFICIENCY',`${Math.round(sim.efficiency)}%`);
    action('retry-button','Retry the watch',restart,true);action('menu-button','Back to the lighthouse',()=>{setState('MENU');$('start-button').focus();});
  }
  function aim(angle){if(state==='PLAYING'&&Number.isFinite(angle)){input.aim=angle;input.turn=0;held.clear();}}
  function pointAim(event){const point=renderer.screenToWorld(event.clientX,event.clientY);if(point)aim(Math.atan2(point.y-WORLD.lighthouse.y,point.x-WORLD.lighthouse.x));}
  canvas.addEventListener('pointerdown',event=>{
    if(state!=='PLAYING'||event.button!==0||dragging!==null)return;
    if(event.pointerType==='touch')document.body.classList.add('touch');
    event.preventDefault();dragging=event.pointerId;canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);pointAim(event);audio.wake();
  });
  canvas.addEventListener('pointermove',event=>{if(state==='PLAYING'&&event.pointerId===dragging){event.preventDefault();pointAim(event);}});
  const endPointer=event=>{if(event.pointerId===dragging){dragging=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}};
  canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',event=>{endPointer(event);input.aim=null;});
  canvas.addEventListener('lostpointercapture',()=>{dragging=null;});canvas.addEventListener('contextmenu',event=>event.preventDefault());
  function updateTurn(){input.turn=(held.has('d')||held.has('ArrowRight')?1:0)-(held.has('a')||held.has('ArrowLeft')?1:0);}
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    const key=event.key,lower=key.toLowerCase();
    if(['TUTORIAL','PAUSED','VICTORY','GAME_OVER'].includes(state)){
      if(key==='Tab'){
        const buttons=[...$('dialog-actions').querySelectorAll('button')],first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&(document.activeElement===first||!buttons.includes(document.activeElement))){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!buttons.includes(document.activeElement))){event.preventDefault();first?.focus();}
      }
      if((key==='Escape'||lower==='p')&&state==='PAUSED'){event.preventDefault();if(!event.repeat)resume();}
      else if(key==='Escape'&&state==='TUTORIAL'){event.preventDefault();setState('MENU');$('how-button').focus();}
      else if(lower==='r'&&state!=='TUTORIAL'){event.preventDefault();if(!event.repeat)restart();}
      return;
    }
    if(state!=='PLAYING')return;
    if(['a','d'].includes(lower)||['ArrowLeft','ArrowRight'].includes(key)){
      event.preventDefault();held.add(key.startsWith('Arrow')?key:lower);input.aim=null;updateTurn();audio.wake();return;
    }
    if(lower==='p'||key==='Escape'){event.preventDefault();if(!event.repeat)pause();return;}
    if(lower==='r'){event.preventDefault();if(!event.repeat)restart();return;}
    if(key===' '&&(document.activeElement===canvas||document.activeElement===document.body||document.activeElement===$('beam-button'))){event.preventDefault();if(!event.repeat)toggleBeam();}
  });
  document.addEventListener('keyup',event=>{held.delete(event.key.startsWith('Arrow')?event.key:event.key.toLowerCase());updateTurn();});
  window.addEventListener('blur',()=>{resetInput();if(state==='PLAYING')pause();});
  $('start-button').addEventListener('click',()=>start());$('how-button').addEventListener('click',()=>setState('TUTORIAL'));
  $('pause-button').addEventListener('click',pause);$('beam-button').addEventListener('click',toggleBeam);
  $('sound-button').addEventListener('click',()=>{
    audio.setEnabled(!audio.enabled);soundUI();
    try{storage?.setItem(settingsKey,JSON.stringify({sound:audio.enabled}));}catch{$('storage-notice').hidden=false;}
    if(audio.enabled)audio.cue('toggle');
  });

  function render(dt){
    if(state==='MENU'||state==='TUTORIAL'){
      demo.time=visualTime;demo.beamAngle=reduced.matches?.6:.6+Math.sin(visualTime*.12)*.4;
      renderer.render(demo,visualTime,state==='MENU'?dt:0);
    }else renderer.render(sim,sim.time,state==='PLAYING'?dt:0);
  }
  function tick(now){
    raf=null;const dt=lastTime===null?0:Math.min((now-lastTime)/1000,CONFIG.maxFrameDelta);lastTime=now;
    if(state==='PLAYING'){
      sim.step(dt,input);processEvents();hudTimer+=dt;
      if(hudTimer>=.1){hudTimer=0;updateHUD();}
    }
    if(state==='MENU'&&!reduced.matches)visualTime+=dt;
    render(dt);
    if(!document.hidden&&(state==='PLAYING'||(state==='MENU'&&!reduced.matches)))requestFrame();
  }
  function requestFrame(){if(raf===null&&!document.hidden)raf=requestAnimationFrame(tick);}
  const observer=new ResizeObserver(resize);observer.observe(frameElement);
  reduced.addEventListener('change',()=>{renderer.setReducedMotion(reduced.matches);requestFrame();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(state==='PLAYING')pause();resetInput();audio.sleep();if(raf!==null)cancelAnimationFrame(raf);raf=null;lastTime=null;}
    else{lastTime=null;requestFrame();}
  });
  window.addEventListener('pagehide',()=>{if(state==='PLAYING')pause();resetInput();audio.sleep();if(raf!==null)cancelAnimationFrame(raf);raf=null;lastTime=null;});
  window.addEventListener('pageshow',()=>{lastTime=null;requestFrame();});
  soundUI();setState('MENU');
  if(new URLSearchParams(location.search).has('test'))window.LastLighthouseTest={
    get state(){return state;},get sim(){return sim;},get input(){return {...input};},
    get audioState(){return {created:!!audio.context,state:audio.context?.state||'uninitialized',enabled:audio.enabled};},
    get renderer(){return renderer;},start,pause,resume,restart,setState,aim,toggleBeam,
    advance(seconds,control={}){
      if(state!=='PLAYING'||!Number.isFinite(seconds)||seconds<=0)return;
      if(typeof control.beam==='boolean'&&control.beam!==sim.beamOn&&!sim.beamLocked)sim.toggleBeam();
      let remaining=seconds;
      while(remaining>1e-8&&state==='PLAYING'){
        const dt=Math.min(remaining,CONFIG.maxFrameDelta);sim.step(dt,control);remaining-=dt;
        // Accelerated QA advances the same effect clock as visible play, so
        // arrival markers expire rather than accumulating on the harbor.
        renderer.clock+=dt;processEvents();
      }
      hudTimer=0;updateHUD();render(0);
    }
  };
})();
