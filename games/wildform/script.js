(function () {
  'use strict';
  const S=Wildform,KEY='wildform_save_v1',$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let world,loadMessage='',storageAvailable=true;
  try {const saved=localStorage.getItem(KEY);world=saved?S.restore(saved):null;if(saved&&!world)loadMessage='The saved world could not be read. A fresh habitat is ready.';}
  catch {storageAvailable=false;loadMessage='Local storage is unavailable. You can still explore this session.';}
  world=world||S.createWorld(48271);
  const renderer=new WildformRenderer($('#world')),canvas=$('#world');
  let tool='inspect',panelType=null,panelSpecies=null,selected=null,toastUntil=0,lastEvent=world.events[0],lastUi=0,lastFrame=performance.now(),autosave=0;
  let pendingReset=null,space=false,frameCounter=0,simulationMs=0;
  const seasons=['Spring','Summer','Autumn','Winter'];
  const icons={mossback:'◒',duskstalker:'◈',spritebeetle:'✧',glowmoth:'⋈',hopper:'⌁',reedskipper:'≈',ridgeclaw:'△',sporekeeper:'♧',crystalfinch:'◇',luminant:'✦'};
  const roles={grazer:'Herbivore',predator:'Predator',decomposer:'Decomposer',pollinator:'Night pollinator',omnivore:'Wetland omnivore',seeder:'Seed spreader'};
  const hints={inspect:'Tap a creature to meet it. Drag to look around.',pan:'Drag to move the camera. Scroll or pinch to zoom.',raise:'Raise a ridge. Steep terrain changes the routes animals can take.',lower:'Lower a basin. Nearby water flows into low ground.',water:'Paint a pond. Water spreads downhill and moistens the soil.',plant:'Plant real food. Growth depends on climate and soil nutrients.',species:'Tap a suitable habitat to introduce up to three creatures.'};
  function toast(text,duration=3600){$('#toast').textContent=text;$('#toast').hidden=false;toastUntil=performance.now()+duration;}
  function chooseTool(name){
    if(!hints[name])return;tool=name;renderer.tool=name;renderer.follow=null;
    $$('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===name);b.setAttribute('aria-pressed',b.dataset.tool===name);});
    $('#tool-hint').textContent=hints[name];$('#species-label').hidden=name!=='species';$('#plant-label').hidden=name!=='plant';
    $('#brush-label').hidden=!['raise','lower','water','plant'].includes(name);canvas.style.cursor=name==='inspect'||name==='pan'?'grab':'crosshair';
  }
  function setSpeed(n){world.settings.speed=n;$$('[data-speed]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.speed)===n);b.setAttribute('aria-pressed',Number(b.dataset.speed)===n);});}
  function setOverlay(name){
    world.settings.overlay=name;renderer.overlay=name;$('#overlay').value=name;const legend=$('#legend');legend.hidden=name==='normal';
    const info={moisture:['Soil moisture','Dry','Saturated'],temperature:['Local temperature','−5°C','40°C'],population:['Animals per 4 × 4 habitat patch','0','12+'],biodiversity:['Species per 4 × 4 habitat patch','0','7+'],territory:['Preferred Ridgeclaw ranges','Radius: 4 cells','']};
    if(info[name]){const [title,lo,hi]=info[name];legend.innerHTML=`${title}<div class="legend-gradient"></div><div class="legend-ends"><span>${lo}</span><span>${hi}</span></div>`;if(name==='temperature')legend.querySelector('.legend-gradient').style.background='linear-gradient(90deg,#59a4d0,#df7159)';}
  }
  function save(notify=false){
    try {localStorage.setItem(KEY,S.serialize(world));storageAvailable=true;$('#save-status').textContent='Saved just now · on this device';if(notify)toast('Your ecosystem is saved on this device.');return true;}
    catch {storageAvailable=false;$('#save-status').textContent='Local save unavailable';if(notify)toast('The browser could not save this world. Storage may be full or blocked.',6000);return false;}
  }
  function load(){
    try {const saved=S.restore(localStorage.getItem(KEY));if(!saved){toast('No valid saved world was found.');return false;}world=saved;reconcileAudio();renderer.dirty=true;selected=null;renderer.selected=null;renderer.follow=null;lastEvent=world.events[0];sync();closePanel();toast('Saved ecosystem restored.');return true;}
    catch {toast('Local storage could not be accessed.');return false;}
  }
  function sync(){setSpeed(world.settings.speed);setOverlay(world.settings.overlay);$('#world-seed').textContent='WORLD '+world.seed;updateHud();}
  function closePanel(){panelType=null;$('#panel').hidden=true;document.body.classList.remove('inspecting');}
  function openPanel(type,key=null){
    if(panelType===type&&key===panelSpecies&&type!=='creature'){closePanel();return;}
    panelType=type;panelSpecies=key;$('#panel').hidden=false;$('#welcome').hidden=true;document.body.classList.toggle('inspecting',type==='creature');renderPanel();
  }
  function meter(label,value,color=''){return `<div class="metric"><div class="metric-heading"><span>${label}</span><strong>${Math.round(value)}%</strong></div><div class="meter"><i style="width:${S.clamp(value,0,100)}%;${color?'background:'+color:''}"></i></div></div>`;}
  function row(a,b){return `<div class="data-row"><span>${a}</span><span>${b}</span></div>`;}
  function button(id,text,cls=''){return `<button id="${id}" class="panel-button ${cls}">${text}</button>`;}
  function bind(id,fn){const b=$('#'+id);if(b)b.addEventListener('click',fn);}
  function renderPanel(){
    const el=$('#panel-content'),s=S.stats(world);let html='',kicker='FIELD NOTES';
    if(panelType==='populations'){
      kicker='THE INHABITANTS';html='<h2>A world of small lives.</h2><p>Every number is a living creature in this world. Choose a species to discover its place in the food web.</p>';
      for(const [key,def]of Object.entries(S.SPECIES))html+=`<button class="species-row" data-species="${key}"><span class="species-dot" style="background:${def.color}"></span><span>${def.name}<span class="role">${roles[def.role]}</span></span><strong data-count="${key}">${s.counts[key]}</strong></button>`;
    } else if(panelType==='species'){
      const def=S.SPECIES[panelSpecies],n=s.counts[panelSpecies];kicker='SPECIES FIELD GUIDE';
      const old=world.history.length>3?world.history[world.history.length-4].counts[panelSpecies]:n,diff=n-old;
      html=`<h2>${def.name}</h2><span class="badge">${roles[def.role].toUpperCase()}</span><canvas id="creature-preview" class="creature-preview"></canvas>${row('Living population',`<span id="species-count">${n}</span>`)}${row('Diet',def.diet)}${row('Preferred habitats',def.biomes.map(i=>S.BIOMES[i]).join(', '))}${row('Average energy',`<span id="species-energy">${n?Math.round(s.energies[panelSpecies]/n):0}%</span>`)}${row('Recent trend',`<span id="species-trend">${diff>0?'+':''}${diff} over ~30 seconds</span>`)}${row('Typical lifespan',(def.lifespan/S.DAY).toFixed(1)+' days')}${button('introduce-this','Introduce '+def.name,'primary')}${button('back-species','← All species')}<p>Traits vary among individuals. Offspring inherit small variations; survival determines which persist.</p>`;
    } else if(panelType==='creature'){
      const a=world.organisms.find(a=>a.id===selected);
      if(!a){el.innerHTML='<h2>A life completed.</h2><p>This creature has returned to the food web. Its remaining organic matter enriches the soil.</p>'+button('back-species','Meet another species');bind('back-species',()=>openPanel('populations'));return;}
      const def=S.SPECIES[a.species];kicker='INDIVIDUAL · '+String(a.id).padStart(4,'0');
      html=`<h2>${def.name}</h2><span class="badge" id="behavior">${a.behavior}</span><canvas id="creature-preview" class="creature-preview"></canvas><div id="creature-meters"></div>${row('Age',`<span id="creature-age">${(a.age/S.DAY).toFixed(2)} days</span>`)}${row('Generation',a.generation)}${row('Preferred habitat',def.biomes.map(i=>S.BIOMES[i]).join(', '))}<h3>Inherited traits</h3>${row('Movement',a.traits.speed.toFixed(2)+'×')}${row('Food efficiency',a.traits.efficiency.toFixed(2)+'×')}${row('Temperature preference',a.traits.temperature.toFixed(1)+'°C')}${row('Moisture preference',Math.round(a.traits.moisture*100)+'%')}${row('Night activity',Math.round(a.traits.night*100)+'%')}${row('Markings',['Natural','Patterned','Rare luminous'][a.traits.marking])}${button('follow-creature','Follow this creature','primary')}${button('inspect-species','View species')}`;
    } else if(panelType==='ecology'){
      kicker='ECOSYSTEM OBSERVATORY';html='<h2>The balance of life.</h2><p>A few useful signals from a complex world. These describe this fictional ecosystem; they are not a scientific stability score.</p><div id="ecology-metrics"></div><canvas id="population-chart" class="mini-chart" aria-label="Recent population history"></canvas><h3>Life in each habitat</h3><div id="biome-counts"></div><h3>Since this world began</h3><div id="event-counts"></div><p>Food is mean plant biomass per cell. Water is surface water coverage; moisture is soil saturation. Pressure is the share of the 180-creature capacity.</p>';
    } else if(panelType==='journal'){
      kicker='ECOSYSTEM JOURNAL';html='<h2>Notes from the wild.</h2><p>Births, hunts, new ranges and the occasional unexpected discovery.</p><div id="journal-entries"></div>';
    } else if(panelType==='climate'){
      kicker='ENVIRONMENTAL CONDITIONS';html=`<h2>Change the weather.</h2><p>Climate acts on every habitat. Creatures seek conditions that suit their inherited traits.</p><label class="climate"><span>Rainfall <strong id="rain-value">${Math.round(world.rainfall*100)}%</strong></span><input id="rainfall" aria-label="Rainfall" type="range" min="0" max="100" value="${Math.round(world.rainfall*100)}"></label><label class="climate"><span>Base temperature <strong id="temp-value">${world.temperature}°C</strong></span><input id="temperature" aria-label="Base temperature" type="range" min="-5" max="40" value="${world.temperature}"></label><p class="hint">Rain gradually adds water and soil moisture. Heat increases evaporation. Elevation, daylight and the seasons also affect local temperature.</p><h3>Slow changes, lasting consequences</h3><p>One day lasts two minutes at 1×. Seasons last six days. There are no automatic disasters, and you can restore a declining habitat.</p>`;
    } else if(panelType==='settings'){
      kicker='YOUR LITTLE WORLD';html=`<h2>Keep the wild.</h2><p>Versioned saves live in this browser on this device. Autosaves occur every 45 seconds and when this tab is hidden.</p>${button('save-world','Save world now','primary')}${button('load-world','Load saved world')}${button('sound-toggle',world.settings.muted?'Enable ambient sound':'Mute ambient sound')}${button('show-guide','Open field guide')}<h3>A fresh habitat</h3><label for="seed">World seed</label><input id="seed" class="seed-input" type="number" min="1" max="4294967295" value="${world.seed}">${button('new-world','New world with a new seed')}${button('reset-world','Reset current seed','danger')}<p>Both actions ask before replacing your current world.</p><p id="performance-info"></p>`;
    } else if(panelType==='help'){
      kicker='A LITTLE FIELD GUIDE';html='<h2>You shape the conditions.</h2><p>The animals make the decisions. They eat, drink, avoid predators, find mates and travel to better habitats.</p><ol class="help-list"><li>Observe a creature to see what it needs.</li><li>Lower ground, then add water to make a pond.</li><li>Plant nearby food; introduce a few grazers.</li><li>Add a predator and watch the herd react.</li><li>Adjust rainfall and temperature gradually.</li><li>Use overlays and the journal to read the consequences.</li></ol><h3>Moving around</h3><p>Observe and Navigate allow drag-to-pan. Painting tools edit only with one pointer. Two-finger gestures always navigate. Scroll or pinch to zoom.</p><h3>Keyboard</h3><p>Space: pause/resume · 1/2/4/8: speed · V: cinematic · Esc: close/exit · arrows: pan · +/−: zoom.</p><h3>A simplified ecology</h3><p>Plants use soil nutrients. Grazers eat biomass; predators consume prey. Decomposers recycle decay. Pollinators help growth and finches spread seeds. Limited, inherited variation can shift populations across generations.</p><p>No game over. If a species disappears, improve its habitat and introduce it again.</p>';
    }
    $('#panel-kicker').textContent=kicker;el.innerHTML=html;
    $$('[data-species]').forEach(b=>b.addEventListener('click',()=>openPanel('species',b.dataset.species)));
    bind('back-species',()=>openPanel('populations'));bind('introduce-this',()=>{$('#species-select').value=panelSpecies;chooseTool('species');closePanel();toast('Tap a habitat to introduce '+S.SPECIES[panelSpecies].name+'.');});
    bind('follow-creature',()=>{renderer.follow=renderer.follow===selected?null:selected;renderer.camera.zoom=Math.max(renderer.camera.zoom,1.8);$('#follow-creature').textContent=renderer.follow?'Stop following':'Follow this creature';});
    bind('inspect-species',()=>{const a=world.organisms.find(a=>a.id===selected);if(a)openPanel('species',a.species);});
    bind('save-world',()=>save(true));bind('load-world',load);bind('sound-toggle',toggleSound);bind('show-guide',()=>openPanel('help'));
    bind('new-world',()=>requestReset(false));bind('reset-world',()=>requestReset(true));
    if($('#rainfall'))$('#rainfall').addEventListener('input',e=>{world.rainfall=Number(e.target.value)/100;$('#rain-value').textContent=e.target.value+'%';});
    if($('#temperature'))$('#temperature').addEventListener('input',e=>{world.temperature=Number(e.target.value);$('#temp-value').textContent=e.target.value+'°C';});
    for(const id of ['rainfall','temperature'])if($('#'+id))$('#'+id).addEventListener('change',()=>{S.event(world,`Climate adjusted: ${world.temperature}°C, ${Math.round(world.rainfall*100)}% rainfall.`,'climate',4);toast('Conditions changed. Watch plants and creatures respond over time.');});
    updatePanel();
  }
  function drawPortrait(a){
    const cv=$('#creature-preview');if(!cv||!a)return;
    cv.width=520;cv.height=180;const c=cv.getContext('2d');c.clearRect(0,0,520,180);c.translate(260,95);c.scale(100,100);
    renderer.drawCreature(c,{...a,x:0,y:0,angle:-.18},world,world.time);
  }
  function updatePanel(){
    if(!panelType)return;const s=S.stats(world);
    if(panelType==='populations')$$('[data-count]').forEach(el=>el.textContent=s.counts[el.dataset.count]);
    if(panelType==='species'){
      const n=s.counts[panelSpecies];$('#species-count').textContent=n;$('#species-energy').textContent=(n?Math.round(s.energies[panelSpecies]/n):0)+'%';
      const old=world.history.length>3?world.history[world.history.length-4].counts[panelSpecies]:n,d=n-old;$('#species-trend').textContent=(d>0?'+':'')+d+' over ~30 seconds';
      const a=world.organisms.find(a=>a.species===panelSpecies);drawPortrait(a||{species:panelSpecies,id:0,age:100,traits:{marking:0},behavior:'IDLE',vx:0,vy:0});
    }
    if(panelType==='creature'){
      const a=world.organisms.find(a=>a.id===selected);if(!a){if($('#behavior'))renderPanel();return;}
      $('#behavior').textContent=a.behavior;$('#creature-age').textContent=(a.age/S.DAY).toFixed(2)+' days';
      $('#creature-meters').innerHTML=meter('Energy',a.energy)+meter('Hydration',a.hydration,'#709c9d')+meter('Health',a.health);drawPortrait(a);
    }
    if(panelType==='ecology'){
      const trend=s.trend===0?'Holding steady':s.trend>0?'Growing · +'+s.trend:'Declining · '+s.trend;
      $('#ecology-metrics').innerHTML=row('Biodiversity',s.biodiversity+' / 10 species')+meter('Food availability',s.food*100)+meter('Surface water',s.water*100,'#709c9d')+meter('Soil moisture',s.moisture*100,'#709c9d')+meter('Population pressure',s.pressure*100,'#a39a68')+row('Recent population trend',trend);
      $('#biome-counts').innerHTML=s.biomes.map((b,i)=>row(S.BIOMES[i],b.total+' lives · '+b.species.size+' species')).join('');
      $('#event-counts').innerHTML=row('Births',world.counters.births)+row('Deaths',world.counters.deaths)+row('Successful hunts',world.counters.hunts)+row('Biome crossings',world.counters.migrations)+row('Rare mutations',world.counters.mutations);
      const cv=$('#population-chart');cv.width=520;cv.height=160;const c=cv.getContext('2d');c.clearRect(0,0,520,160);c.strokeStyle='#d6deca';c.lineWidth=1;
      for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,20+i*35);c.lineTo(520,20+i*35);c.stroke();}
      c.strokeStyle='#708e5d';c.lineWidth=3;c.beginPath();world.history.forEach((h,i)=>{const x=i/Math.max(1,world.history.length-1)*520,y=145-h.total/180*130;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
    }
    if(panelType==='journal'){
      const list=$('#journal-entries');list.replaceChildren();
      world.events.slice(0,30).forEach(e=>{const el=document.createElement('div');el.className='journal-entry';const t=document.createElement('time');t.textContent='DAY '+(Math.floor(e.time/S.DAY)+1)+' · '+Math.floor(e.time%S.DAY/S.DAY*24).toString().padStart(2,'0')+':00';el.append(t,document.createTextNode(e.text));list.append(el);});
    }
    if(panelType==='settings')$('#performance-info').textContent=`${Math.round(renderer.perf.fps)} fps · ${renderer.perf.drawMs.toFixed(1)} ms draw · ${simulationMs.toFixed(1)} ms simulation · ${world.organisms.length}/${S.CAP} creatures`;
  }
  function updateHud(){
    const frac=(world.time%S.DAY)/S.DAY,period=frac<.22?'Night':frac<.3?'Dawn':frac<.7?'Daylight':frac<.8?'Dusk':'Night';
    $('#day').textContent='Day '+(Math.floor(world.time/S.DAY)+1);$('#season').textContent=seasons[Math.floor(world.time/(S.DAY*6))%4]+' · '+period;
    $('#population').textContent=world.organisms.length;
    if(selected&&!world.organisms.some(a=>a.id===selected)){renderer.selected=null;renderer.follow=null;}
  }
  function requestReset(sameSeed){
    let seed=world.seed;
    if(!sameSeed){const input=Number($('#seed')?.value);seed=input>0&&input!==world.seed?input>>>0:crypto.getRandomValues(new Uint32Array(1))[0]||1;}
    pendingReset=seed;$('#confirm-title').textContent=sameSeed?'Reset this world?':'Begin a new world?';
    $('#confirm-text').textContent=`This replaces the current ecosystem and its local save. New habitat seed: ${seed}.`;
    $('#confirm-dialog').showModal();
  }
  bind('cancel-reset',()=>{$('#confirm-dialog').close();pendingReset=null;});
  bind('confirm-reset',()=>{
    if(pendingReset===null)return;world=S.createWorld(pendingReset);reconcileAudio();pendingReset=null;selected=null;renderer.selected=null;renderer.reset();renderer.dirty=true;
    lastEvent=world.events[0];$('#confirm-dialog').close();closePanel();sync();save();toast('A new world awakens.');
  });
  // Sound is deliberately quiet, procedural and gesture-gated.
  let audio=null,windGain=null,wind=null;
  function reconcileAudio(){
    if(!audio){world.settings.muted=true;return;}
    (world.settings.muted?audio.suspend():audio.resume()).catch(()=>{world.settings.muted=true;});
  }
  async function toggleSound(){
    if(!world.settings.muted){world.settings.muted=true;if(audio)await audio.suspend();}
    else try {
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){toast('Audio is not supported in this browser.');return;}
      if(!audio){audio=new Audio();const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);
        let seed=891;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647*2-1)*.4;}
        wind=audio.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=550;
        windGain=audio.createGain();windGain.gain.value=.045;wind.connect(filter);filter.connect(windGain);windGain.connect(audio.destination);wind.start();}
      await audio.resume();world.settings.muted=false;chime();
    }catch {toast('The browser could not start audio.');return;}
    if($('#sound-toggle'))$('#sound-toggle').textContent=world.settings.muted?'Enable ambient sound':'Mute ambient sound';
  }
  function chime(){if(!audio||world.settings.muted||audio.state!=='running')return;for(const [i,hz] of [523.25,659.25,783.99].entries()){
    const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*.09;osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.022,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.7);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.8);}}
  // A save can remember unmuted, but playback still requires a new gesture.
  const rememberedSound=!world.settings.muted;world.settings.muted=true;
  function cinema(enabled){renderer.cinematic=enabled;renderer.follow=null;renderer.cinemaClock=0;document.body.classList.toggle('cinematic',enabled);$('#exit-cinema').hidden=!enabled;$('#cinema-caption').hidden=!enabled;if(!enabled)renderer.reset();}
  function selectAt(point){
    let closest=null,best=Math.max(.7,15/renderer.scale);
    for(const a of world.organisms){const d=Math.hypot(a.x-point.x,a.y-point.y);if(d<best){best=d;closest=a;}}
    if(closest){selected=closest.id;renderer.selected=selected;openPanel('creature');}else{selected=null;renderer.selected=null;closePanel();}
  }
  function applyPaint(point){
    const changed=S.paint(world,tool,point.x,point.y,renderer.brush,$('#species-select').value,$('#plant-select').value);
    renderer.dirty=true;
    if(tool==='species')toast(changed?`Introduced ${changed} ${S.SPECIES[$('#species-select').value].name.toLowerCase()}${changed>1?'s':''}.`:world.organisms.length>=S.CAP?'The world is at its 180-creature capacity.':'Choose shallower, suitable ground for this species.');
    return changed;
  }
  const pointers=new Map();let gesture=null,lastPaint=0;
  function local(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.button!==1&&e.button!==2)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=local(e);pointers.set(e.pointerId,p);renderer.follow=null;
    if(pointers.size===2){const pts=[...pointers.values()];gesture={multi:true,distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),center:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2}};return;}
    gesture={start:p,last:p,moved:false,multi:false,pan:tool==='pan'||tool==='inspect'||space||e.button!==0,painted:false};
    // Paint after a short delay or first drag, so a second touch cannot accidentally edit.
    gesture.startTime=performance.now();
  });
  canvas.addEventListener('pointermove',e=>{
    const p=local(e);renderer.hover=renderer.world(p.x,p.y);if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,p);
    if(pointers.size>=2){const pts=[...pointers.values()],distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
      if(gesture&&gesture.multi){renderer.camera.x-=(center.x-gesture.center.x)/renderer.scale;renderer.camera.y-=(center.y-gesture.center.y)/renderer.scale;renderer.zoom(distance/Math.max(1,gesture.distance),center.x,center.y);}
      gesture={multi:true,distance,center};return;}
    if(!gesture||gesture.multi)return;
    if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>5)gesture.moved=true;
    if(gesture.pan){renderer.camera.x-=(p.x-gesture.last.x)/renderer.scale;renderer.camera.y-=(p.y-gesture.last.y)/renderer.scale;renderer.boundCamera();}
    else if(tool!=='species'&&(e.pointerType!=='touch'||performance.now()-gesture.startTime>100)){
      const now=performance.now();if(now-lastPaint>35){const from=renderer.world(gesture.last.x,gesture.last.y),to=renderer.world(p.x,p.y),n=Math.min(24,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/.4));
        for(let i=0;i<=n;i++)applyPaint({x:from.x+(to.x-from.x)*i/Math.max(n,1),y:from.y+(to.y-from.y)*i/Math.max(n,1)});lastPaint=now;gesture.painted=true;}
    }
    gesture.last=p;
  });
  function pointerUp(e){
    const p=local(e);
    if(gesture&&!gesture.multi&&!gesture.moved){if(tool==='inspect'&&!space)selectAt(renderer.world(p.x,p.y));else if(!gesture.pan&&!gesture.painted)applyPaint(renderer.world(p.x,p.y));}
    pointers.delete(e.pointerId);if(!pointers.size)gesture=null;else if(gesture)gesture.multi=true;
  }
  canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});
  canvas.addEventListener('pointerleave',()=>{if(!pointers.size)renderer.hover=null;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=local(e);renderer.follow=null;renderer.zoom(Math.exp(-e.deltaY*.001),p.x,p.y);},{passive:false});
  $$('[data-tool]').forEach(b=>b.addEventListener('click',()=>chooseTool(b.dataset.tool)));
  $$('[data-speed]').forEach(b=>b.addEventListener('click',()=>setSpeed(Number(b.dataset.speed))));
  $('#brush').addEventListener('input',e=>renderer.brush=Number(e.target.value));
  $('#overlay').addEventListener('change',e=>setOverlay(e.target.value));
  for(const[key,def]of Object.entries(S.SPECIES)){const option=document.createElement('option');option.value=key;option.textContent=icons[key]+' '+def.name;$('#species-select').append(option);}
  $('#species-select').value='mossback';
  bind('population-button',()=>openPanel('populations'));bind('ecology-button',()=>openPanel('ecology'));bind('journal-button',()=>openPanel('journal'));bind('settings-button',()=>openPanel('settings'));bind('climate-button',()=>openPanel('climate'));bind('help-button',()=>openPanel('help'));bind('close-panel',closePanel);bind('dismiss-welcome',()=>$('#welcome').hidden=true);
  bind('zoom-in',()=>renderer.zoom(1.2));bind('zoom-out',()=>renderer.zoom(1/1.2));bind('home',()=>renderer.reset());
  $('.brand').addEventListener('click',e=>{e.preventDefault();renderer.reset();});bind('cinema-button',()=>cinema(true));bind('exit-cinema',()=>cinema(false));
  document.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('#confirm-dialog').open)return;
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)setSpeed(world.settings.speed?0:1);space=true;}
    if(['1','2','4','8'].includes(e.key))setSpeed(Number(e.key));
    if(e.key.toLowerCase()==='v')cinema(!renderer.cinematic);
    if(e.key==='Escape'){cinema(false);closePanel();chooseTool('inspect');}
    if(e.key==='+'||e.key==='=')renderer.zoom(1.15);if(e.key==='-')renderer.zoom(1/1.15);
    if(e.key.startsWith('Arrow')){e.preventDefault();renderer.follow=null;renderer.camera.x+=(e.key==='ArrowRight'?2:e.key==='ArrowLeft'?-2:0);renderer.camera.y+=(e.key==='ArrowDown'?2:e.key==='ArrowUp'?-2:0);renderer.boundCamera();}
  });
  document.addEventListener('keyup',e=>{if(e.code==='Space')space=false;});window.addEventListener('blur',()=>{space=false;pointers.clear();gesture=null;});
  window.addEventListener('resize',()=>renderer.resize());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(audio)audio.suspend();}else{lastFrame=performance.now();if(audio&&!world.settings.muted)audio.resume();}});
  window.addEventListener('pagehide',()=>save());
  function frame(now){
    const dt=Math.min(.25,(now-lastFrame)/1000);lastFrame=now;
    if(!document.hidden){const t=performance.now();S.advance(world,dt);simulationMs=performance.now()-t;renderer.draw(world,world.time,dt);frameCounter++;
      if(now-lastUi>400){lastUi=now;updateHud();updatePanel();}
      if(world.events[0]!==lastEvent){lastEvent=world.events[0];if(lastEvent&&world.time>15&&!renderer.cinematic){toast(lastEvent.text,4000);if(lastEvent.text.includes('Rare'))chime();}}
      if(now>toastUntil)$('#toast').hidden=true;
      autosave+=dt;if(autosave>45){save();autosave=0;}
      if(windGain&&!world.settings.muted&&audio.state==='running')windGain.gain.setTargetAtTime(.025+world.rainfall*.04,audio.currentTime,3);
    }
    requestAnimationFrame(frame);
  }
  sync();chooseTool('inspect');if(loadMessage)toast(loadMessage,7000);if(!storageAvailable)$('#save-status').textContent='Local save unavailable';
  if(rememberedSound)toast('Sound is off until you enable it again in Settings.');
  // Console-accessible authoritative state also makes reproducible QA possible.
  window.game={get world(){return world;},renderer,chooseTool,setSpeed,setOverlay,save,load,openPanel,cinema,get frames(){return frameCounter;},get simulationMs(){return simulationMs;}};
  requestAnimationFrame(frame);
})();
