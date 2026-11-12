/* ECHO TIDE — no runtime dependencies. Simulation, input, audio, view and UI are
   deliberately separated. All distances are in world units; time is seconds. */
'use strict';
(() => {
const CONFIG = Object.freeze({
  worldWidth:6000, worldHeight:4800, vesselRadius:12, speed:84, acceleration:5.8,
  pulseRadius:320, pulseDuration:1.2, revealPersistence:3, pulseCooldown:1,
  pulseDisturbance:18, quietRecovery:1.8, quietDelay:2, invulnerability:3,
  beaconRadius:105, shadowWarning:3, maxParticles:180, maxDPR:1.5,
  burstDuration:.6, burstMultiplier:2.2, burstCooldown:4, burstDisturbance:12,
  physicsStep:1/120, shadowChaseSpeed:58, siltWarning:4, siltDuration:5
});
const State = Object.freeze({MENU:'MENU',PLAYING:'PLAYING',PAUSED:'PAUSED',VICTORY:'VICTORY',GAME_OVER:'GAME_OVER'});
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const mix = (a,b,t) => a+(b-a)*t;
const TAU=Math.PI*2;
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function formatTime(t){return `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;}

class World {
  constructor(seed=4139){
    this.width=CONFIG.worldWidth;this.height=CONFIG.worldHeight;
    this.harbor={x:650,y:4240,r:175};
    this.beacons=[{x:1350,y:2300,name:'The Bell',symbol:'I',type:0},{x:3800,y:850,name:'The Crown',symbol:'II',type:1},{x:5000,y:3570,name:'The Needle',symbol:'III',type:2}].map(b=>({...b,active:false,revealUntil:0,discovered:false,activatedAt:-100}));
    this.sanctuary={x:900,y:820,r:155,unlocked:false,revealUntil:0,discovered:false};
    this.rocks=[];const random=seeded(seed);
    // Hand-placed chains make islands, channels, sheltered bays and open basins.
    const chains=[
      [160,3930,400,3900,4,57],[270,4450,970,4520,9,62],
      [1380,3800,2010,4000,8,82],[2140,3990,2500,3530,7,76],
      [1050,3140,1840,3080,10,76],[560,2800,610,2100,9,68],
      [1890,2450,2100,1880,8,83],[1900,1660,2570,1590,9,71],
      [2820,2200,3280,2630,8,97],[3240,2750,3430,3150,6,78],
      [2930,1020,3110,460,8,66],[3960,1430,4660,1540,10,79],
      [4700,2070,4820,2720,9,74],[5230,3060,5700,3030,7,74],
      [4250,3530,3970,4030,8,78],[3270,4210,2880,4400,6,72],
      [600,1280,1250,1310,9,65],[1610,810,1860,320,7,67],
      [5390,600,5530,1240,8,83],[230,600,260,1210,8,68]
    ];
    for(const [x1,y1,x2,y2,n,r] of chains)for(let i=0;i<n;i++){
      const t=i/(n-1),x=mix(x1,x2,t)+(random()-.5)*45,y=mix(y1,y2,t)+(random()-.5)*45,rr=r*(.8+random()*.4);
      const vertices=[];for(let j=0;j<9;j++){const a=j/9*TAU;const rad=rr*(.87+random()*.13);vertices.push({x:Math.cos(a)*rad,y:Math.sin(a)*rad});}
      this.rocks.push({x,y,r:rr,vertices,revealUntil:0,discovered:false});
    }
    // Two optional straight channels; both ends and broad outside bypasses stay open.
    for(const [cx,cy] of [[1250,2680],[3600,1950]])for(const side of [-1,1])for(let i=0;i<7;i++){
      const r=32,x=cx-210+i*70,y=cy+side*65;
      this.rocks.push({x,y,r,vertices:Array.from({length:9},(_,j)=>({x:Math.cos(j/9*TAU)*r,y:Math.sin(j/9*TAU)*r})),revealUntil:0,discovered:false,channel:true});
    }
    this.currents=[{x:1000,y:3550,rx:450,ry:170,dx:.9,dy:-.25},{x:2710,y:1390,rx:420,ry:200,dx:1,dy:-.2},{x:4500,y:2250,rx:220,ry:540,dx:.15,dy:1},{x:3650,y:3860,rx:480,ry:220,dx:-1,dy:.15}].map((c,i)=>({...c,id:i,revealUntil:0,discovered:false,entered:false,crossed:false}));
    this.echoShadows=[{x:2680,y:1650,rx:250,ry:200},{x:4750,y:3240,rx:260,ry:180}].map(z=>({...z,kind:'echo-shadow',revealUntil:0,discovered:false}));
    this.siltfalls=[{x:2660,y:2670,r:145},{x:4050,y:2480,r:150}].map(z=>({...z,phase:'idle',timer:0,revealUntil:0,discovered:false}));
    this.details=[{x:900,y:3690,type:0},{x:2540,y:2900,type:1},{x:3650,y:1870,type:0},{x:5330,y:4080,type:1},{x:2220,y:830,type:1}].map(d=>({...d,revealUntil:0,discovered:false}));
    this.shadows=[{cx:2400,cy:3300,rx:500,ry:270,phase:0},{cx:3470,cy:1220,rx:540,ry:320,phase:2.8},{cx:5010,cy:2760,rx:360,ry:520,phase:1.5}].map(s=>({...s,x:s.cx+Math.cos(s.phase)*s.rx,y:s.cy+Math.sin(s.phase)*s.ry,angle:0,armed:false,pursuing:false,warn:0,revealUntil:0}));
    this.revealables=[...this.rocks,...this.beacons,this.sanctuary,...this.currents,...this.details,...this.shadows,...this.echoShadows,...this.siltfalls];
    this.reindex();
    this.motes=Array.from({length:230},()=>({x:random()*this.width,y:random()*this.height,size:.7+random()*1.3,phase:random()*TAU}));
  }
  safe(p){return dist(p,this.harbor)<this.harbor.r || (this.sanctuary.unlocked&&dist(p,this.sanctuary)<230)||this.beacons.some(b=>b.active&&dist(p,b)<145);}
  reindex(){this.rockGrid=new Map();const cell=200;for(const r of this.rocks){const reach=r.r+CONFIG.vesselRadius+4;for(let y=Math.floor((r.y-reach)/cell);y<=Math.floor((r.y+reach)/cell);y++)for(let x=Math.floor((r.x-reach)/cell);x<=Math.floor((r.x+reach)/cell);x++){const key=x+','+y;if(!this.rockGrid.has(key))this.rockGrid.set(key,[]);this.rockGrid.get(key).push(r);}}}
  rocksNear(p){return this.rockGrid.get(Math.floor(p.x/200)+','+Math.floor(p.y/200))||[];}
  echoAt(p){return this.echoShadows.find(z=>((p.x-z.x)/z.rx)**2+((p.y-z.y)/z.ry)**2<1);}
  currentAt(p,t,disturbance){
    let x=Math.sin(p.y*.002+t*.1)*2,y=Math.cos(p.x*.002-t*.08)*2;
    for(const c of this.currents){const q=((p.x-c.x)/c.rx)**2+((p.y-c.y)/c.ry)**2;if(q<1){const strength=(1-q)*(12+disturbance*.32);x+=c.dx*strength;y+=c.dy*strength;}}
    return{x,y};
  }
}
class AudioSystem {
  constructor(){this.enabled=false;this.ctx=null;this.bed=null;this.sceneActive=false;this.seaLevel=0;this.voices=new Set();}
  toggle(){this.enabled=!this.enabled;if(this.enabled)this.unlock();else this.silence();this.setScene(this.sceneActive,this.seaLevel);return this.enabled;}
  silence(){for(const v of this.voices){try{v.o.stop();}catch{}v.o.disconnect();v.g.disconnect();}this.voices.clear();if(this.bed)this.bed.gain.value=0;if(this.ctx)this.ctx.suspend().catch(()=>{});}
  unlock(){try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;this.ctx ||= new Context();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});if(!this.bed){this.bed=this.ctx.createGain();this.bed.gain.value=0;this.bed.connect(this.ctx.destination);for(const frequency of [55,82.41]){const o=this.ctx.createOscillator();o.frequency.value=frequency;o.connect(this.bed);o.start();}}this.setScene(this.sceneActive,this.seaLevel);}catch{this.enabled=false;}}
  setScene(active,level=this.seaLevel){this.sceneActive=active;this.seaLevel=level;if(this.bed)this.bed.gain.setTargetAtTime(this.enabled && active ? .005+level*.000035 : 0,this.ctx.currentTime,.7);}
  tone(freq,duration=.6,volume=.06,type='sine',end=freq,delay=0){
    if(!this.enabled||!this.ctx)return;
    const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay,voice={o,g};this.voices.add(voice);o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(voice);};
  }
  play(name){if(name==='burst')this.tone(100,.4,.035,'triangle',220);if(name==='ready')this.tone(560,.18,.018,'sine',700);if(name==='warning')this.tone(260,.3,.025,'sine',180);if(name==='sonar'){this.tone(640,1.15,.08,'sine',120);this.tone(960,.5,.025,'sine',400);}if(name==='beacon'||name==='unlock'||name==='victory'){[220,330,440,660].forEach((n,i)=>this.tone(n,1.8,.045,'sine',n,i*.15));}if(name==='rock')this.tone(85,.18,.045,'triangle',45);if(name==='damage'){this.tone(130,.6,.08,'triangle',45);this.tone(220,.8,.04,'sine',80);}}
}
class Input {
  constructor(game){
    this.game=game;this.keys=new Set();this.joy={x:0,y:0};this.pointer=null;
    window.addEventListener('keydown',e=>{
      if(e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);if(e.repeat)return;
      if(['ShiftLeft','ShiftRight','KeyB'].includes(e.code))game.burst();
      if(e.code==='Space')game.pulse();if(e.code==='KeyP'||e.code==='Escape')game.pause();
      if(e.code==='KeyR'&&game.state!==State.MENU)game.start();if((e.code==='KeyM'||e.code==='KeyC')&&game.state===State.PLAYING)game.ui.toggleChart();
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>{this.clear();if(game.state===State.PLAYING)game.pause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();if(game.state===State.PLAYING)game.pause();}});
    window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')document.body.classList.add('touch');},{passive:true});
    const joy=$('joystick');
    joy.addEventListener('pointerdown',e=>{e.preventDefault();if(this.pointer!==null||game.state!==State.PLAYING)return;this.pointer=e.pointerId;joy.setPointerCapture(e.pointerId);this.move(e);});
    joy.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer)this.move(e);});
    const release=e=>{if(e.pointerId===this.pointer){this.pointer=null;this.joy.x=this.joy.y=0;this.drawStick();}};
    joy.addEventListener('pointerup',release);joy.addEventListener('pointercancel',release);joy.addEventListener('lostpointercapture',release);
    $('sonar-button').addEventListener('pointerdown',e=>{e.preventDefault();game.pulse();});
    $('burst-button').addEventListener('pointerdown',e=>{e.preventDefault();game.burst();});
    // Keyboard/assistive activation emits click without a pointerdown.
    $('sonar-button').addEventListener('click',e=>{if(e.detail===0)game.pulse();});
    $('burst-button').addEventListener('click',e=>{if(e.detail===0)game.burst();});
  }
  move(e){const r=$('joystick').getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y),max=r.width*.32,f=Math.min(l,max)/Math.max(l,1);this.joy.x=x*f/max;this.joy.y=y*f/max;this.drawStick();}
  drawStick(){const max=$('joystick').clientWidth*.32;$('stick').style.transform=`translate(${this.joy.x*max}px,${this.joy.y*max}px)`;}
  clear(){this.keys.clear();this.pointer=null;this.joy.x=this.joy.y=0;this.drawStick();}
  axis(){let x=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.joy.x,y=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.joy.y;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}return{x,y};}
}
class Simulation {
  constructor(seed=4139){this.seed=seed;this.reset();}
  reset(){
    this.world=new World(this.seed);this.player={x:this.world.harbor.x,y:this.world.harbor.y,vx:0,vy:0,angle:-Math.PI/2,integrity:3,invulnerable:0};
    this.time=0;this.disturbance=0;this.peak=0;this.pulseCount=0;this.lastPulse=-100;this.rings=[];this.particles=[];this.wakeClock=0;this.impactClock=0;this.pathClock=0;this.path=[];this.lastBand=0;this.event=null;
    this.burstRemaining=0;this.burstCooldown=0;this.burstCount=0;this.lastBurst=-100;this.burstDirection={x:0,y:-1};this.burstRing=null;this.escapes=0;this.quietBeacons=0;this.currentCrossings=0;
  }
  pulse(){if(this.time-this.lastPulse<CONFIG.pulseCooldown)return false;this.lastPulse=this.time;this.pulseCount++;this.disturbance=clamp(this.disturbance+CONFIG.pulseDisturbance,0,100);this.peak=Math.max(this.peak,this.disturbance);this.rings.push({x:this.player.x,y:this.player.y,age:0,r:0,limit:CONFIG.pulseRadius*(this.world.echoAt(this.player)?.72:1)});return true;}
  burst(){
    if(this.burstCooldown>1e-7)return false;
    this.burstRemaining=CONFIG.burstDuration;this.burstCooldown=CONFIG.burstCooldown;this.lastBurst=this.time;this.burstCount++;
    const p=this.player;this.burstDirection={x:Math.cos(p.angle),y:Math.sin(p.angle)};this.burstRing={x:p.x,y:p.y,age:0};
    this.disturbance=clamp(this.disturbance+CONFIG.burstDisturbance,0,100);this.peak=Math.max(this.peak,this.disturbance);
    for(let i=0;i<18&&this.particles.length<CONFIG.maxParticles;i++){const angle=p.angle+Math.PI+(i%5-2)*.13,speed=35+(i*13%55);this.particles.push({x:p.x-this.burstDirection.x*12,y:p.y-this.burstDirection.y*12,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.55,max:.55,color:'#a6eee5',size:1+i%2});}
    return true;
  }
  zoneStatus(){
    const p=this.player,w=this.world,z=w.siltfalls.find(z=>dist(p,z)<z.r+160&&['warning','active'].includes(z.phase));
    if(z)return{kind:z.phase==='warning'?'silt-warning':'silt',text:z.phase==='warning'?`△ SILTFALL IN ${Math.ceil(z.timer)}s · leave or take the outer route`:`△ SILTFALL · slow water · clears in ${Math.ceil(z.timer)}s`};
    if(w.echoAt(p))return{kind:'shadow',text:'◌ ECHO SHADOW · shorter echoes · slow down and pulse'};
    const current=w.currents.find(c=>((p.x-c.x)/(c.rx+70))**2+((p.y-c.y)/(c.ry+70))**2<1);if(current)return{kind:'current',text:'≋ CURRENT · follow the arrows or steer across'};
    if(w.shadows.some(h=>h.armed&&dist(p,h)<600))return{kind:'threat',text:'△ SHADOW ALERT · go quiet, burst away or shelter at a lit beacon'};
    return{kind:'quiet',text:this.time<18?'SHIFT / B · BURST adds disturbance; SPACE remains sonar':''};
  }
  particlesAt(x,y,color,n=25){for(let i=0;i<n&&this.particles.length<CONFIG.maxParticles;i++){const a=i/n*TAU,s=12+(i*17%40);this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1.8,max:1.8,color,size:1+(i%3)});}}
  update(dt,input,emit=()=>{}){
    if(!Number.isFinite(dt)||dt<=0||dt>.5)return;
    const count=Math.ceil(dt/CONFIG.physicsStep),step=dt/count;
    for(let i=0;i<count;i++){this.integrate(step,input,emit);if(this.event)break;}
  }
  integrate(dt,input,emit){
    this.time+=dt;const p=this.player,w=this.world;this.event=null;p.invulnerable=Math.max(0,p.invulnerable-dt);this.impactClock=Math.max(0,this.impactClock-dt);
    const wasCharging=this.burstCooldown>0,bursting=this.burstRemaining>1e-7;
    this.burstCooldown=Math.max(0,this.burstCooldown-dt);if(this.burstCooldown<1e-7)this.burstCooldown=0;
    if(wasCharging&&!this.burstCooldown)emit('ready');
    if(this.burstRing){this.burstRing.age+=dt;if(this.burstRing.age>.55)this.burstRing=null;}
    const recovery=this.time-Math.max(this.lastPulse,this.lastBurst)>CONFIG.quietDelay?CONFIG.quietRecovery:0;
    this.disturbance=clamp(this.disturbance+(.35*Math.min(1,Math.hypot(input.x,input.y))-recovery)*dt,0,100);this.peak=Math.max(this.peak,this.disturbance);
    for(const z of w.siltfalls){
      if(z.phase==='idle'&&w.beacons.some(b=>b.active)&&dist(p,z)<z.r+180){z.phase='warning';z.timer=CONFIG.siltWarning;z.discovered=true;emit('warning','Siltfall ahead in four seconds. Steer outside the marked ring; the route will clear.');}
      else if(z.phase!=='idle'){z.timer-=dt;if(z.timer<=0){if(z.phase==='warning'){z.phase='active';z.timer=CONFIG.siltDuration;}else if(z.phase==='active'){z.phase='cooldown';z.timer=35;}else{z.phase='idle';z.timer=0;}}}
    }
    const band=this.disturbance>65?2:this.disturbance>30?1:0;
    if(band!==this.lastBand){if(band===2)emit('warning','The deep is awake. Violet trails warn of approaching shadows.');if(band===0&&this.lastBand>0)emit('quiet','The ocean settles.');this.lastBand=band;}
    // Reveals are sampled at the traveling wave, not only at the emission point.
    for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.age+=dt;r.r=r.limit*Math.min(1,r.age/CONFIG.pulseDuration);for(const o of w.revealables){const d=dist(r,o);if(d<=r.r+(o.r||20)&&d>=r.r-50-(o.r||20)){o.revealUntil=this.time+CONFIG.revealPersistence*(w.echoAt(o)?.55:1);o.discovered=true;}}if(r.age>CONFIG.pulseDuration+.75)this.rings.splice(i,1);}
    const current=w.currentAt(p,this.time,this.disturbance),inSilt=w.siltfalls.some(z=>z.phase==='active'&&dist(p,z)<z.r);
    let targetX=input.x*CONFIG.speed,targetY=input.y*CONFIG.speed;
    if(bursting){targetX=this.burstDirection.x*CONFIG.speed*CONFIG.burstMultiplier+input.x*CONFIG.speed*.2;targetY=this.burstDirection.y*CONFIG.speed*CONFIG.burstMultiplier+input.y*CONFIG.speed*.2;const magnitude=Math.hypot(targetX,targetY),cap=CONFIG.speed*CONFIG.burstMultiplier;if(magnitude>cap){targetX*=cap/magnitude;targetY*=cap/magnitude;}}
    if(inSilt){targetX*=bursting?.85:.65;targetY*=bursting?.85:.65;}
    const response=1-Math.exp(-(bursting?9:Math.hypot(p.vx,p.vy)>CONFIG.speed*1.05?3.8:CONFIG.acceleration)*dt);
    p.vx=mix(p.vx,targetX+current.x,response);p.vy=mix(p.vy,targetY+current.y,response);
    this.burstRemaining=Math.max(0,this.burstRemaining-dt);if(this.burstRemaining<1e-7)this.burstRemaining=0;
    const previousX=p.x,previousY=p.y;
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(Math.hypot(p.vx,p.vy)>5){let a=Math.atan2(p.vy,p.vx)-p.angle;a=Math.atan2(Math.sin(a),Math.cos(a));p.angle+=a*(1-Math.exp(-9*dt));}
    p.x=clamp(p.x,25,w.width-25);p.y=clamp(p.y,25,w.height-25);
    for(let pass=0;pass<5;pass++)for(const r of w.rocksNear(p)){const dx=p.x-r.x,dy=p.y-r.y,d=Math.hypot(dx,dy),min=r.r+CONFIG.vesselRadius;if(d<min){const nx=d?dx/d:1,ny=d?dy/d:0;p.x=r.x+nx*min;p.y=r.y+ny*min;const into=p.vx*nx+p.vy*ny;if(into<0){p.vx-=into*nx*1.3;p.vy-=into*ny*1.3;}r.revealUntil=this.time+1.4;r.discovered=true;if(this.impactClock===0){emit('rock');this.impactClock=.8;this.particlesAt(p.x,p.y,'#9acbc4',8);}}}
    // A concave join between overlapping rocks may have no stable local pushout.
    // Return to the last clear position instead of letting the vessel wedge inside.
    if(w.rocksNear(p).some(r=>dist(p,r)<r.r+CONFIG.vesselRadius-.05) && !w.rocksNear({x:previousX,y:previousY}).some(r=>Math.hypot(previousX-r.x,previousY-r.y)<r.r+CONFIG.vesselRadius-.05)){p.x=previousX;p.y=previousY;p.vx*=.3;p.vy*=.3;}
    for(const b of w.beacons){if(!b.active&&dist(p,b)<CONFIG.beaconRadius){if(this.disturbance<30)this.quietBeacons++;b.active=true;b.activatedAt=this.time;this.disturbance=Math.max(0,this.disturbance-20);p.integrity=Math.min(3,p.integrity+1);this.particlesAt(b.x,b.y,'#e5c586',45);emit('beacon',`${b.name} is awake. The water grows still. A safe haven in the dark.`);}}
    if(!w.sanctuary.unlocked&&w.beacons.every(b=>b.active)){w.sanctuary.unlocked=true;emit('unlock','Three voices, one tide. Follow the golden signal home.');}
    for(const s of w.shadows){
      s.phase+=dt*.16;const oldX=s.x,oldY=s.y,near=dist(p,s)<700;
      if(band===2&&!w.safe(p)&&near){if(!s.armed&&dist(p,s)>230){s.armed=true;s.warn=CONFIG.shadowWarning;}if(s.armed)s.warn=Math.max(0,s.warn-dt);}else{s.armed=false;s.warn=CONFIG.shadowWarning;}
      const chasing=s.armed&&s.warn<=0;
      if(s.pursuing&&!chasing){this.escapes++;emit('evade','Shadow evaded. Quiet water and lit beacons break pursuit.');}s.pursuing=chasing;
      const target=chasing?p:{x:s.cx+Math.cos(s.phase)*s.rx,y:s.cy+Math.sin(s.phase)*s.ry},dx=target.x-oldX,dy=target.y-oldY,d=Math.hypot(dx,dy)||1,travel=Math.min(d,(chasing?CONFIG.shadowChaseSpeed:90)*dt);
      s.x=oldX+dx/d*travel;s.y=oldY+dy/d*travel;s.angle=Math.atan2(s.y-oldY,s.x-oldX);
      if(s.armed&&s.warn<=0&&!w.safe(p)&&dist(p,s)<56&&p.invulnerable===0){p.integrity--;p.invulnerable=CONFIG.invulnerability;const dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy)||1;p.vx+=dx/d*90;p.vy+=dy/d*90;this.particlesAt(p.x,p.y,'#c0a4de',20);emit('damage','A shadow struck your hull. Go quiet to let the deep sleep.');if(p.integrity<=0)this.event=State.GAME_OVER;}
    }
    if(w.sanctuary.unlocked&&dist(p,w.sanctuary)<w.sanctuary.r)this.event=State.VICTORY;
    for(const c of w.currents){const q=((p.x-c.x)/c.rx)**2+((p.y-c.y)/c.ry)**2;if(q<.8){c.entered=true;c.discovered=true;}else if(q>1&&c.entered&&!c.crossed){c.crossed=true;this.currentCrossings++;emit('current','Current crossed. Its direction is recorded on the chart.');}}
    this.wakeClock+=dt;if(this.wakeClock>.07&&Math.hypot(p.vx,p.vy)>8){this.wakeClock=0;if(this.particles.length<CONFIG.maxParticles)this.particles.push({x:p.x-Math.cos(p.angle)*13,y:p.y-Math.sin(p.angle)*13,vx:-p.vx*.08,vy:-p.vy*.08,life:1.4,max:1.4,color:'#77cbbf',size:1.6});}
    for(let i=this.particles.length-1;i>=0;i--){const q=this.particles[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;if(q.life<=0)this.particles.splice(i,1);}
    this.pathClock+=dt;if(this.pathClock>1){this.pathClock=0;this.path.push({x:p.x,y:p.y});if(this.path.length>1600)this.path.shift();}
  }
  target(){const remaining=this.world.beacons.filter(b=>!b.active);if(!remaining.length)return{...this.world.sanctuary,name:'The Sanctuary'};return remaining.reduce((a,b)=>dist(this.player,a)<dist(this.player,b)?a:b);}
}

class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:650,y:4240};this.width=0;this.height=0;this.zoom=1;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();window.addEventListener('resize',()=>this.resize());}
  resize(){this.width=window.innerWidth;this.height=window.innerHeight;const dpr=Math.min(window.devicePixelRatio||1,CONFIG.maxDPR);this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.dpr=dpr;this.zoom=this.width<600?.82:1;}
  track(p,dt,snap=false){const f=snap?1:1-Math.exp(-4*dt);this.camera.x=mix(this.camera.x,p.x,f);this.camera.y=mix(this.camera.y,p.y,f);}
  visible(o,pad=160){return Math.abs(o.x-this.camera.x)<this.width/this.zoom/2+pad&&Math.abs(o.y-this.camera.y)<this.height/this.zoom/2+pad;}
  glow(x,y,r,color,alpha=1){if(r<1)return;const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.globalAlpha=alpha;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.globalAlpha=1;}
  line(x1,y1,x2,y2,color,width=1){const c=this.ctx;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  circle(x,y,r,color,width=1){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  reveal(o,s){return clamp((o.revealUntil-s.time)/1.3,0,1);}
  draw(s,menu=false){
    const c=this.ctx,w=s.world,p=s.player,t=s.time,decorTime=this.reduced?0:s.time;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=1;c.fillStyle='#06151f';c.fillRect(0,0,this.width,this.height);
    if(!this.seaCache||this.seaCache.width!==this.width||this.seaCache.height!==this.height){this.seaCache=document.createElement('canvas');this.seaCache.width=this.width;this.seaCache.height=this.height;const cache=this.seaCache.getContext('2d'),sea=cache.createRadialGradient(this.width*.55,this.height*.5,30,this.width*.5,this.height*.5,Math.max(this.width,this.height)*.75);sea.addColorStop(0,'#0b2935');sea.addColorStop(.6,'#081e2a');sea.addColorStop(1,'#040f1b');cache.fillStyle=sea;cache.fillRect(0,0,this.width,this.height);}c.drawImage(this.seaCache,0,0);
    c.save();c.translate(this.width/2,this.height/2);c.scale(this.zoom,this.zoom);c.translate(-this.camera.x,-this.camera.y);
    const left=this.camera.x-this.width/this.zoom/2,top=this.camera.y-this.height/this.zoom/2;
    // Sparse contour lines drift at different frequencies without full-screen noise.
    c.lineWidth=.7;
    for(let j=Math.floor(top/65);j<(top+this.height/this.zoom)/65+1;j++){
      c.beginPath();for(let x=left-30;x<left+this.width/this.zoom+50;x+=35){const y=j*65+Math.sin(x*.008+j*.8+decorTime*.13)*13+Math.cos(x*.017-decorTime*.09)*3;if(x===left-30)c.moveTo(x,y);else c.lineTo(x,y);}c.strokeStyle=j%3?'#39718010':'#417b891a';c.stroke();
    }
    if(menu&&!this.reduced){const f=(t%7)/7;this.circle(w.harbor.x,w.harbor.y,100+f*350,`rgba(122,207,199,${(1-f)*.13})`);this.circle(w.harbor.x,w.harbor.y,90+f*350,`rgba(122,207,199,${(1-f)*.06})`);}
    for(const m of w.motes){if(!this.visible(m,10))continue;c.globalAlpha=.15+(Math.sin(decorTime*.5+m.phase)+1)*.13;c.fillStyle='#70bdb5';c.fillRect(m.x+Math.sin(decorTime*.08+m.phase)*6,m.y+Math.cos(decorTime*.07+m.phase)*6,m.size,m.size);}c.globalAlpha=1;
    // Boundary light is strongest as the vessel approaches the edge.
    const edge=Math.min(p.x,p.y,w.width-p.x,w.height-p.y);c.strokeStyle=`rgba(123,193,192,${clamp(1-edge/200,0,.6)})`;c.lineWidth=3;c.strokeRect(14,14,w.width-28,w.height-28);
    for(const zone of w.currents){if(!this.visible(zone,600))continue;const nearby=((p.x-zone.x)/(zone.rx+100))**2+((p.y-zone.y)/(zone.ry+100))**2<1,a=Math.max(this.reveal(zone,s),nearby?.8:zone.discovered?.2:0);if(!a)continue;c.save();c.translate(zone.x,zone.y);c.globalAlpha=a*.55;const angle=Math.atan2(zone.dy,zone.dx);for(let i=0;i<22;i++){const f=(((this.reduced?0:t*.12)+i*.177)%1)*2-1,x=f*zone.rx,y=Math.sin(i*17)*zone.ry*.8;if((x/zone.rx)**2+(y/zone.ry)**2>1)continue;c.save();c.translate(x,y);c.rotate(angle);this.line(-10,0,9,0,'#75bfc6');this.line(4,-4,9,0,'#75bfc6');this.line(4,4,9,0,'#75bfc6');c.restore();}c.restore();}
    this.challenges(s);
    // Harbor remains a legible pocket of safety.
    if(this.visible(w.harbor,230)){const h=w.harbor;this.glow(h.x,h.y,210,'#38746a',.16);this.circle(h.x,h.y,145,'#8eb7a125');c.save();c.setLineDash([2,12]);this.circle(h.x,h.y,160,'#9fcab522');c.restore();for(let i=0;i<5;i++){const x=h.x-120+i*14;this.line(x,h.y+48,x,h.y+115,'#758f8055',4);this.line(x-4,h.y+51,x+4,h.y+51,'#aac3a460',2);}this.label('THE QUIET HARBOR',h.x,h.y+195,'#8fb7ad',9);}
    for(const r of w.rocks){if(!this.visible(r))continue;const close=clamp(1-(dist(p,r)-r.r)/95,0,1)*.45,a=Math.max(this.reveal(r,s),close);if(a<=0)continue;c.save();c.translate(r.x,r.y);c.globalAlpha=a;c.beginPath();r.vertices.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fillStyle='#0d2732';c.fill();c.lineWidth=1.4;c.strokeStyle='#63989d';c.stroke();c.beginPath();for(let i=0;i<r.vertices.length;i++){const v=r.vertices[i];i?c.lineTo(v.x*.72+6,v.y*.72-5):c.moveTo(v.x*.72+6,v.y*.72-5);}c.closePath();c.strokeStyle='#47677470';c.lineWidth=.8;c.stroke();this.line(-r.r*.3,r.r*.1,r.r*.18,-r.r*.4,'#41646a55');c.restore();}
    for(const d of w.details){const a=this.reveal(d,s);if(!a||!this.visible(d))continue;c.save();c.globalAlpha=a*.65;c.translate(d.x,d.y);c.rotate(-.35);if(d.type===0){c.beginPath();c.moveTo(-55,0);c.quadraticCurveTo(0,-34,55,0);c.quadraticCurveTo(0,35,-55,0);c.strokeStyle='#8caaa1';c.stroke();this.line(-65,0,60,0,'#93b9ae');for(let i=-30;i<40;i+=13)this.line(i,-15,i,15,'#6d8a84');}else{for(let i=0;i<5;i++){const a=i/5*TAU;this.circle(Math.cos(a)*37,Math.sin(a)*37,8,'#7caaa270');}this.circle(0,0,46,'#7caaa245');}c.restore();}
    for(const b of w.beacons)this.beacon(b,s);
    this.sanctuary(w.sanctuary,s);
    for(const sh of w.shadows){if(!this.visible(sh,150))continue;const awake=sh.armed,near=dist(p,sh)<460,a=awake?(sh.warn>0?.3:.8):Math.max(this.reveal(sh,s)*.2,s.disturbance>30?.1:0);if(!a)continue;this.glow(sh.x,sh.y,100,'#65518b',a*.25);c.save();c.translate(sh.x,sh.y);c.rotate(sh.angle);c.globalAlpha=a;c.beginPath();c.moveTo(68,0);c.bezierCurveTo(20,-37,-46,-25,-80,Math.sin(decorTime*3)*12);c.bezierCurveTo(-30,20,20,36,68,0);c.fillStyle='#1b1635';c.fill();c.strokeStyle=awake?'#a18ac6':'#514967';c.lineWidth=1;c.stroke();this.line(38,-5,47,-3,'#d9b6e8',2);this.line(38,5,47,3,'#d9b6e8',2);c.restore();if(awake&&near){c.save();c.setLineDash([5,10]);this.circle(sh.x,sh.y,75+Math.sin(decorTime*4)*4,sh.warn>0?'#ad95d66f':'#aa8fd3a0');c.restore();this.label(sh.warn>0?'WAKING':'SHADOW',sh.x,sh.y-94,'#b7a1ce',8);}}
    for(const r of s.rings){const fade=clamp(1-(r.age-CONFIG.pulseDuration)/.75,0,1);this.glow(r.x,r.y,r.r,'#3eaaa6',.035*fade);for(let i=4;i>=0;i--){const rad=r.r-i*4;if(rad>0)this.circle(r.x,r.y,rad,`rgba(111,220,211,${(.03+i*.012)*fade})`,i===0?2:3);}this.circle(r.x,r.y,r.r,'#86e0d269',1.2*fade);}
    if(!this.reduced)for(const q of s.particles){if(!this.visible(q,10))continue;c.globalAlpha=q.life/q.max*.55;c.fillStyle=q.color;c.beginPath();c.arc(q.x,q.y,q.size,0,TAU);c.fill();}c.globalAlpha=1;
    if(s.burstRing&&!this.reduced){const r=s.burstRing,f=r.age/.55;this.circle(r.x,r.y,16+f*65,`rgba(133,228,220,${(1-f)*.45})`,1.5);}
    if(s.burstRemaining>0){const length=this.reduced?22:24+s.burstRemaining/CONFIG.burstDuration*62;c.save();c.translate(p.x,p.y);c.rotate(p.angle);const jet=c.createLinearGradient(-length,0,-8,0);jet.addColorStop(0,'#76e3dc00');jet.addColorStop(1,'#b6fff1aa');c.fillStyle=jet;c.beginPath();c.moveTo(-10,-5);c.lineTo(-length,-1);c.lineTo(-length,1);c.lineTo(-10,5);c.closePath();c.fill();this.line(-12,0,-length*.7,0,'#b5f4e4aa',1);c.restore();}
    this.vessel(p,t);
    if(!menu)this.indicators(s);
    c.restore();
    if(s.disturbance>30){const intensity=(s.disturbance-30)/70,grad=c.createRadialGradient(this.width/2,this.height/2,this.width*.2,this.width/2,this.height/2,Math.max(this.width,this.height)*.65);grad.addColorStop(0,'transparent');grad.addColorStop(1,`rgba(72,41,96,${intensity*(.22+Math.sin(decorTime*1.4)*.04)})`);c.fillStyle=grad;c.fillRect(0,0,this.width,this.height);}
  }
  label(text,x,y,color='#a9c4c3',size=9){const c=this.ctx;c.font=`${size}px Arial`;c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);}
  vessel(p,t){const c=this.ctx;this.glow(p.x,p.y,75,'#63d4be',.2);this.glow(p.x,p.y,27,'#79f5da',.19);c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.globalAlpha=p.invulnerable>0?(this.reduced?.7:.5+Math.sin(t*8)*.18):1;c.beginPath();c.moveTo(17,0);c.quadraticCurveTo(-1,-10,-13,-7);c.lineTo(-8,0);c.lineTo(-13,7);c.quadraticCurveTo(-1,10,17,0);c.fillStyle='#9be1d3';c.fill();c.strokeStyle='#d4fff0';c.lineWidth=.8;c.stroke();this.line(-6,0,7,0,'#1f7273',2);this.line(-9,-6,-16,-10,'#76b8b5',2);this.line(-9,6,-16,10,'#76b8b5',2);c.fillStyle='#fff7cb';c.beginPath();c.arc(7,0,2,0,TAU);c.fill();c.restore();}
  challenges(s){
    const c=this.ctx,p=s.player,t=s.time;
    for(const z of s.world.echoShadows){const near=((p.x-z.x)/(z.rx+90))**2+((p.y-z.y)/(z.ry+90))**2<1,a=Math.max(this.reveal(z,s),near?.5:0);if(!a||!this.visible(z,350))continue;c.save();c.globalAlpha=a*.55;c.strokeStyle='#aaafcc';c.setLineDash([2,10]);c.beginPath();c.ellipse(z.x,z.y,z.rx,z.ry,0,0,TAU);c.stroke();c.setLineDash([]);for(let i=0;i<6;i++)this.line(z.x-z.rx*.65+i*z.rx*.23,z.y-18,z.x-z.rx*.65+i*z.rx*.23+15,z.y+18,'#9aabc275');c.restore();this.label('ECHO SHADOW / FAINT RETURNS',z.x,z.y-z.ry-18,'#aab8cf',8);}
    for(const z of s.world.siltfalls){if(!['warning','active'].includes(z.phase)||!this.visible(z,230))continue;c.save();c.setLineDash([5,9]);this.circle(z.x,z.y,z.r,z.phase==='warning'?'#e0c78c99':'#b5c9c780',1.5);c.setLineDash([]);this.label(z.phase==='warning'?`△ SILTFALL · ${Math.ceil(z.timer)}s`:'△ SILTFALL · SLOW WATER',z.x,z.y-z.r-18,'#dfd2a8',9);if(z.phase==='active')for(let i=0;i<(this.reduced?6:18);i++){const x=z.x+Math.sin(i*7)*z.r*.8,y=z.y-z.r+((i*23+(this.reduced?0:t*24))%(z.r*2));this.line(x,y,x+4,y+8,'#a7c9c44a',2);}c.restore();}
  }
  beacon(b,s){if(!this.visible(b,240))return;const c=this.ctx,t=s.time,active=b.active,reveal=this.reveal(b,s),a=active?1:reveal;
    this.glow(b.x,b.y,active?155:65,'#dfb65f',active?.23:.07);this.glow(b.x,b.y,18,'#e6c779',.25);c.fillStyle=active?'#f5d78c':'#b99d66';c.beginPath();c.arc(b.x,b.y-8,active?3:1.5,0,TAU);c.fill();
    if(a>0){c.save();c.translate(b.x,b.y);c.globalAlpha=a;this.circle(0,0,55,active?'#cfb26d70':'#7c8f7e66');this.circle(0,0,64,'#acaa7e22');c.strokeStyle=active?'#e2c27d':'#9caa91';c.fillStyle='#152d34';c.lineWidth=2;c.beginPath();if(b.type===0){c.moveTo(-19,18);c.lineTo(-15,-22);c.quadraticCurveTo(0,-42,15,-22);c.lineTo(19,18);c.closePath();}if(b.type===1){c.moveTo(-28,17);c.lineTo(-28,-28);c.lineTo(-13,-9);c.lineTo(0,-37);c.lineTo(13,-9);c.lineTo(28,-28);c.lineTo(28,17);c.closePath();}if(b.type===2){c.moveTo(-13,23);c.lineTo(-7,-23);c.lineTo(0,-55);c.lineTo(7,-23);c.lineTo(13,23);c.closePath();}c.fill();c.stroke();this.circle(0,-7,6,active?'#f6db99':'#859f91');this.line(-32,25,32,25,'#8d9e87');c.restore();this.label(b.name.toUpperCase(),b.x,b.y+88,active?'#d6c08b':`rgba(154,183,170,${a})`);}
    if(active&&t-b.activatedAt<2.4){const f=(t-b.activatedAt)/2.4;this.circle(b.x,b.y,60+f*160,`rgba(235,201,131,${(1-f)*.7})`,2);}
  }
  sanctuary(o,s){if(!this.visible(o,500))return;const c=this.ctx,active=o.unlocked,a=active?1:this.reveal(o,s);this.glow(o.x,o.y,active?420:70,'#e5bd61',active?.2:.04);if(!a)return;c.save();c.translate(o.x,o.y);c.globalAlpha=a;this.circle(0,0,150,active?'#dab97488':'#4c727469');this.circle(0,0,130,active?'#e3c48255':'#4c727440');for(let i=0;i<12;i++){const a=i/12*TAU;c.save();c.rotate(a);this.line(0,-145,0,-165,active?'#e5c686':'#4c7274',3);c.restore();}c.beginPath();c.arc(0,0,83,Math.PI*1.12,Math.PI*1.88);c.strokeStyle=active?'#e4c582':'#4f7272';c.lineWidth=6;c.stroke();this.line(-77,28,-77,-45,active?'#e4c582':'#4f7272',5);this.line(77,28,77,-45,active?'#e4c582':'#4f7272',5);this.circle(0,0,18,active?'#ffdda1':'#4f7272',2);c.restore();this.label(active?'THE SANCTUARY · COME HOME':'THE SANCTUARY · DORMANT',o.x,o.y+204,active?'#e4ca90':'#6b8b8c',10);}
  chartCurrents(c,s){
    for(const zone of s.world.currents){if(!zone.discovered)continue;c.save();c.strokeStyle='#8ad9d7cc';c.lineWidth=22;c.beginPath();c.ellipse(zone.x,zone.y,zone.rx,zone.ry,0,0,TAU);c.stroke();c.translate(zone.x,zone.y);c.rotate(Math.atan2(zone.dy,zone.dx));c.beginPath();c.moveTo(-75,0);c.lineTo(75,0);c.lineTo(18,-40);c.moveTo(75,0);c.lineTo(18,40);c.stroke();c.restore();}
    for(const zone of s.world.echoShadows){if(!zone.discovered)continue;c.save();c.setLineDash([25,45]);c.strokeStyle='#b7b8cbaa';c.lineWidth=18;c.beginPath();c.ellipse(zone.x,zone.y,zone.rx,zone.ry,0,0,TAU);c.stroke();c.restore();}
  }
  indicators(s){const p=s.player,target=s.target(),c=this.ctx;
    // World-space bearing close to vessel, safely clear of HUD and touch controls.
    if(dist(p,target)>210){const angle=Math.atan2(target.y-p.y,target.x-p.x),r=100;c.save();c.translate(p.x+Math.cos(angle)*r,p.y+Math.sin(angle)*r);c.rotate(angle);c.beginPath();c.moveTo(6,0);c.lineTo(-4,-4);c.lineTo(-4,4);c.closePath();c.fillStyle=s.world.sanctuary.unlocked?'#f3d588':'#c8b68599';c.fill();c.restore();}
    for(const sh of s.world.shadows){if(sh.armed&&dist(p,sh)<550&&dist(p,sh)>110){const angle=Math.atan2(sh.y-p.y,sh.x-p.x);c.save();c.translate(p.x,p.y);c.beginPath();c.arc(0,0,79,angle-.22,angle+.22);c.strokeStyle='#af92c080';c.lineWidth=2;c.stroke();c.restore();}}
    if(Math.min(p.x,p.y,s.world.width-p.x,s.world.height-p.y)<110)this.label('THE TIDE TURNS YOU BACK',p.x,p.y-64,'#8baeb5',8);
  }
  chart(s){const canvas=$('chart-canvas'),c=canvas.getContext('2d'),w=s.world,k=canvas.width/w.width;c.fillStyle='#081b25';c.fillRect(0,0,300,240);c.strokeStyle='#52797d20';c.lineWidth=.5;for(let x=0;x<300;x+=30){c.beginPath();c.moveTo(x,0);c.lineTo(x,240);c.stroke();}for(let y=0;y<240;y+=30){c.beginPath();c.moveTo(0,y);c.lineTo(300,y);c.stroke();}c.save();c.scale(k,k);for(const r of w.rocks){if(!r.discovered)continue;c.fillStyle='#567b7c';c.beginPath();c.arc(r.x,r.y,r.r,0,TAU);c.fill();}this.chartCurrents(c,s);c.strokeStyle='#73baab70';c.lineWidth=14;c.beginPath();s.path.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();for(const b of w.beacons){c.save();c.translate(b.x,b.y);c.rotate(Math.PI/4);c.fillStyle=b.active?'#e5c17e':'#9b966e';c.fillRect(-45,-45,90,90);c.restore();}c.font='180px Georgia';c.textAlign='center';c.fillStyle=w.sanctuary.unlocked?'#f3d282':'#688d8e';c.fillText('✦',w.sanctuary.x,w.sanctuary.y+65);c.fillStyle='#93f0db';c.beginPath();c.arc(s.player.x,s.player.y,48,0,TAU);c.fill();c.restore();}
}
class UI {
  constructor(game){this.game=game;this.toastUntil=0;this.clock=0;
    $('start').onclick=()=>{game.start();$('start').blur();};$('resume').onclick=()=>game.pause();$('pause').onclick=()=>game.pause();document.querySelectorAll('.restart').forEach(b=>b.onclick=()=>game.start());
    $('sound').onclick=e=>{const on=game.audio.toggle();$('sound-off').hidden=on;$('sound').setAttribute('aria-label',on?'Mute sound':'Enable sound');if(e.detail)$('sound').blur();};
    $('chart-button').onclick=e=>{this.toggleChart();if(e.detail)$('chart-button').blur();};$('close-chart').onclick=e=>{$('chart').hidden=true;if(e.detail)document.activeElement?.blur();else $('chart-button').focus();};
    $('motion').onclick=()=>{game.renderer.reduced=!game.renderer.reduced;document.body.classList.toggle('calm-motion',game.renderer.reduced);$('motion').textContent=`Reduced motion: ${game.renderer.reduced?'on':'off'}`;};
  }
  toggleChart(){ $('chart').hidden=!$('chart').hidden;this.game.renderer.chart(this.game.sim);}
  toast(text,seconds=5){if(!text)return;$('toast').textContent=text;$('toast').classList.add('visible');this.toastUntil=this.game.sim.time+seconds;}
  state(){const g=this.game,st=g.state,menu=st===State.MENU,playing=st===State.PLAYING;
    g.audio.setScene(playing);$('overlay').classList.toggle('closed',playing);$('menu-panel').hidden=!menu;$('pause-panel').hidden=st!==State.PAUSED;$('end-panel').hidden=st!==State.VICTORY&&st!==State.GAME_OVER;
    for(const id of ['hud','telemetry','navigation','desktop-help','surge-status'])$(id).hidden=menu||st===State.VICTORY||st===State.GAME_OVER;
    $('motion').textContent=`Reduced motion: ${g.renderer.reduced?'on':'off'}`;
    $('touch-controls').hidden=!playing;if(!playing)$('chart').hidden=true;
    $('pause').setAttribute('aria-label',st===State.PAUSED?'Resume game':'Pause game');
    if(st===State.VICTORY||st===State.GAME_OVER){const win=st===State.VICTORY;$('end-kicker').textContent=win?'THE OCEAN REMEMBERS YOUR KINDNESS':'THE DEEP NEEDS QUIET';$('end-title').innerHTML=win?'You found<br><em>the light.</em>':'Lost to<br><em>the tide.</em>';$('end-copy').textContent=win?'Three voices carry across the water. Your voyage ends in a place the darkness cannot reach.':'Awakened shadows broke your hull. Watch for violet warning trails, use fewer pulses, and shelter near a lit beacon while the sea settles.';$('stat-time').textContent=formatTime(g.sim.time);$('stat-pulses').textContent=g.sim.pulseCount;$('stat-peak').textContent=Math.ceil(g.sim.peak)+'%';}
    $('touch-controls').inert=!playing;$('chart').inert=!playing;$('hud').inert=!playing;
    for(const id of ['menu-panel','pause-panel','end-panel'])$(id).inert=$(id).hidden;
    if(st===State.VICTORY)$('end-copy').textContent+=` Quiet beacons ${g.sim.quietBeacons}/3 · currents crossed ${g.sim.currentCrossings}/4 · bursts ${g.sim.burstCount} · evasions ${g.sim.escapes}.`;
    if(!playing){$('toast').classList.remove('visible');const panel=menu?$('menu-panel'):st===State.PAUSED?$('pause-panel'):$('end-panel');panel.querySelector('button')?.focus({preventScroll:true});}
  }
  update(dt,force=false){this.clock+=dt;if(this.clock<.1&&!force)return;this.clock=0;const s=this.game.sim,w=s.world,n=w.beacons.filter(b=>b.active).length,d=s.disturbance;
    this.game.audio.setScene(this.game.state===State.PLAYING,d);
    if(this.lastCount!==n||force){this.lastCount=n;$('progress').innerHTML=`BEACONS <b>${n} / 3</b>`;document.querySelectorAll('.beacon-pips i').forEach((el,i)=>el.classList.toggle('active',w.beacons[i].active));}
    const color=d>65?'#b39bd1':d>30?'#ddc68e':'#8ce0d5';$('sea-state').textContent=d>65?'AWAKENED':d>30?'RESTLESS':'CALM';$('sea-state').style.color=color;$('disturbance-value').textContent=Math.ceil(d);$('disturbance-bar').style.width=d+'%';$('disturbance-bar').style.background=color;$('integrity').textContent='◆ '.repeat(s.player.integrity)+'◇ '.repeat(3-s.player.integrity);$('integrity').setAttribute('aria-label',s.player.integrity+' integrity remaining');
    const t=s.target(),a=Math.atan2(t.y-s.player.y,t.x-s.player.x);$('bearing').textContent='↑';$('bearing').style.transform=`rotate(${a+Math.PI/2}rad)`;$('destination').textContent=t.name;$('distance').textContent=`${Math.round(dist(s.player,t))} m`;
    const cooldown=clamp((CONFIG.pulseCooldown-(s.time-s.lastPulse))/CONFIG.pulseCooldown,0,1);$('cooldown').style.height=cooldown*100+'%';$('pulse-ready').textContent=cooldown>0?'RECHARGING':'PULSE READY';
    const charging=s.burstCooldown>0,remaining=s.burstCooldown.toFixed(1);$('burst-status').textContent=s.burstRemaining>0?'BURST ACTIVE':charging?`RECHARGING — ${remaining}s`:'BURST READY';$('burst-meter').value=1-s.burstCooldown/CONFIG.burstCooldown;$('burst-button').setAttribute('aria-disabled',String(charging));$('burst-button').classList.toggle('ready',!charging);$('burst-touch-status').textContent=charging?remaining+'s':'READY';
    const zone=s.zoneStatus(),status=$('hazard-status');status.dataset.kind=zone.kind;if(status.textContent!==zone.text)status.textContent=zone.text;
    if(s.time>this.toastUntil)$('toast').classList.remove('visible');if(!$('chart').hidden)this.game.renderer.chart(s);
  }
}
class Game {
  constructor(){this.sim=new Simulation();this.state=State.MENU;this.audio=new AudioSystem();this.renderer=new Renderer($('ocean'));this.ui=new UI(this);this.input=new Input(this);this.lastFrame=null;this.menuTime=0;this.ui.state();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);}
  start(){this.audio.silence();this.sim.reset();this.input.clear();this.state=State.PLAYING;$('chart').hidden=true;this.renderer.track(this.sim.player,0,true);this.ui.state();this.ui.update(0,true);this.ui.toast('Leave the quiet harbor. Follow the amber bearing. Space or SONAR reveals the way.',7);if(this.audio.enabled)this.audio.unlock();document.activeElement?.blur();}
  pause(){if(this.state===State.PLAYING){this.state=State.PAUSED;this.input.clear();this.audio.silence();this.ui.state();}else if(this.state===State.PAUSED){this.state=State.PLAYING;if(this.audio.enabled)this.audio.unlock();this.ui.state();document.activeElement?.blur();}}
  pulse(){if(this.state===State.PLAYING&&this.sim.pulse())this.audio.play('sonar');}
  burst(){if(this.state===State.PLAYING&&this.sim.burst()){this.audio.play('burst');this.ui.toast('PROPULSION BURST · +12 disturbance',2);this.ui.update(0,true);}}
  emit(type,text){this.audio.play(type);if(text)this.ui.toast(text,type==='unlock'?8:5);}
  loop(now){const dt=this.lastFrame===null?0:Math.min((now-this.lastFrame)/1000,.05);this.lastFrame=now;
    if(this.state===State.PLAYING){
      // Substeps keep collision and warning timing stable after slow frames.
      const count=Math.max(1,Math.ceil(dt/(1/60))),step=dt/count,axis=this.input.axis();for(let i=0;i<count;i++){this.sim.update(step,axis,(type,text)=>this.emit(type,text));if(this.sim.event){this.state=this.sim.event;this.audio.play(this.state===State.VICTORY?'victory':'damage');this.input.clear();this.ui.update(0,true);this.ui.state();break;}}
      this.renderer.track(this.sim.player,dt);this.ui.update(dt);
    }else if(this.state===State.MENU){this.menuTime+=dt;}
    // Paused and ending scenes are static; menu water alone gently drifts.
    if(this.state===State.MENU){const time=this.sim.time;this.sim.time=this.menuTime;this.renderer.draw(this.sim,true);this.sim.time=time;}else this.renderer.draw(this.sim);
    requestAnimationFrame(this.loop);
  }
}
const game=new Game();
$('start').disabled=false;
$('launch-status').hidden=true;
// Explicit opt-in inspection surface for automated QA; absent in a normal run.
if(new URLSearchParams(location.search).has('test'))window.EchoTideTest={game,CONFIG,State,World,Simulation,Renderer,Input,AudioSystem};
})();
