'use strict';
const STATE=Object.freeze({MENU:0,FLIGHT:1,EXPLODING:2,RESULTS:3});
const SAVE_KEY='apogee_save';
const DEEP_SPACE_KM=600;
const IMPACT_SLOWDOWN=.78;
const MAX={engine:8,fuel:8,stages:6};
const COST={engine:{base:50,mult:1.48},fuel:{base:48,mult:1.45},stages:{base:145,mult:1.78}};
const RANKS=[
  {name:'CADET',xp:0},{name:'STRIDER',xp:1500},{name:'ORBITER',xp:6000},{name:'VANGUARD',xp:16000},{name:'ZENITH',xp:36000},{name:'APOGEE PRIME',xp:70000}
];
const MILESTONES=[
  {alt:25,reward:100,label:'LOW SKY'}, {alt:75,reward:180,label:'STRATOSPHERE'}, {alt:150,reward:300,label:'MESOSPHERE'},
  {alt:300,reward:500,label:'THERMOSPHERE'}, {alt:600,reward:850,label:'EXOSPHERE'}, {alt:1000,reward:1400,label:'ORBITAL'},
  {alt:1800,reward:2200,label:'DEEP SPACE'}, {alt:3000,reward:3500,label:'FORGE LEGEND'}
];
const ZONES=[
  {km:0,name:'LOW ATMOSPHERE',color:'#9aa6bb'}, {km:25,name:'STRATOSPHERE',color:'#67d8ff'},
  {km:75,name:'MESOSPHERE',color:'#7ea2ff'}, {km:150,name:'THERMOSPHERE',color:'#a988ff'},
  {km:300,name:'EXOSPHERE',color:'#d793ff'}, {km:600,name:'DEEP SPACE',color:'#62f5db'}
];
const LIVERIES=[
  {id:'forge',name:'FORGE',req:'STANDARD',body:['#b4bfd1','#ffffff','#a5b1c4'],accent:'#62f5db',fin:'#ff6c7b',glass:'#37d8c1'},
  {id:'ember',name:'EMBER',req:'STRIDER RANK',rank:1,body:['#6f7582','#d9dde5','#545b69'],accent:'#ff974d',fin:'#ff5d4f',glass:'#ffc36b'},
  {id:'aurora',name:'AURORA',req:'75 KM BEST',alt:75,body:['#a7b9d7','#f8fbff','#8fa4c9'],accent:'#9d7cff',fin:'#5de0ff',glass:'#d2b6ff'},
  {id:'void',name:'VOID',req:'VANGUARD RANK',rank:3,body:['#202636','#596279','#111722'],accent:'#d88cff',fin:'#7f5cff',glass:'#f0b2ff'},
  {id:'prime',name:'PRIME',req:'1000 KM BEST',alt:1000,body:['#8b7350','#fff1bd','#685438'],accent:'#ffd86b',fin:'#f4b83f',glass:'#fff0a0'}
];
const TRAILS=[
  {id:'ion',name:'ION',req:'STANDARD',outer:'#ff7d35',mid:'#ffb454',core:'#fff0a4',particle1:'#ffbd4a',particle2:'#ff6b3d',plasma:'#6cf6ff'},
  {id:'solar',name:'SOLAR',req:'150 KM BEST',alt:150,outer:'#ff4e2f',mid:'#ff8f3d',core:'#fff4c8',particle1:'#ffd36a',particle2:'#ff5436',plasma:'#ffdd74'},
  {id:'neon',name:'NEON',req:'ORBITER RANK',rank:2,outer:'#b94dff',mid:'#ff66d8',core:'#d8f7ff',particle1:'#f06cff',particle2:'#55e8ff',plasma:'#9dfffa'},
  {id:'plasma',name:'PLASMA',req:'ZENITH RANK',rank:4,outer:'#3f7cff',mid:'#55dfff',core:'#ffffff',particle1:'#62f5db',particle2:'#6796ff',plasma:'#d3ffff'}
];
function freshSave(){return{schema:4,engine:1,fuel:1,stages:1,bestAlt:0,credits:0,xp:0,lifetimeAlt:0,flights:0,claimed:[],dailyContracts:null,selectedLivery:'forge',selectedTrail:'ion',isMuted:false}}
let save=freshSave();
let state=STATE.MENU,lastTime=0,resultsReady=false,toastTimer=0;
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d',{alpha:false});
let W=1,H=1,DPR=1;
const flight={alt:0,vel:0,totalStages:0,activeStage:0,fuel:0,maxFuel:0,perfects:0,chain:0,maxChain:0,sepCredits:0,particles:[],debris:[],texts:[],shockwaves:[],speedLines:[],stars:[],clouds:[],shake:0,timeScale:1,zoneIndex:0,endedByExplosion:false,cameraLead:0,apogeeTimer:0,apogeeTriggered:false,apogeeHold:false,sepFlash:0,x:0,vx:0,steerTarget:0,steerDir:0,pointerSteer:false,deepSpaceActive:false,deepSpaceAnnounced:false,hazards:[],hazardTimer:0,impactCooldown:0,impacts:0};

const $=id=>document.getElementById(id);
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fmt(n){return Math.floor(n).toLocaleString('en-US')}
function cost(type){if(save[type]>=MAX[type])return Infinity;const c=COST[type];return Math.floor(c.base*Math.pow(c.mult,save[type]))}
function haptic(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern)}catch(_){}}
function flash(power=.35){const el=$('flash');el.style.opacity=String(power);el.classList.add('flash-on');setTimeout(()=>{el.classList.remove('flash-on');el.style.opacity='0'},45)}
function toast(text,tone='cyan'){const el=$('toast');clearTimeout(toastTimer);el.textContent=text;el.className='toast '+tone+' show';toastTimer=setTimeout(()=>el.classList.remove('show'),900)}

function resize(){W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);generateEnvironment()}
addEventListener('resize',resize,{passive:true});

function generateEnvironment(){flight.stars=[];flight.clouds=[];for(let i=0;i<170;i++)flight.stars.push({x:Math.random()*W,y:Math.random()*H,size:Math.random()*1.8+.2,a:Math.random()*.8+.2});for(let i=0;i<16;i++)flight.clouds.push({x:Math.random()*W,y:-(Math.random()*H*2),w:55+Math.random()*100,h:18+Math.random()*25,s:.35+Math.random()*.55})}

/* Audio */
const AC=window.AudioContext||window.webkitAudioContext;let ac=null,engOsc=null,engGain=null;
function ensureAudio(){if(!AC)return null;if(!ac)ac=new AC();if(ac.state==='suspended')ac.resume().catch(()=>{});return ac}
const audio={tone(freq,type='sine',dur=.12,vol=.16){try{const a=ensureAudio();if(!a||save.isMuted)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;g.gain.exponentialRampToValueAtTime(.001,a.currentTime+dur);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+dur)}catch(_){}},engine(on=true){try{const a=ensureAudio();if(!a||save.isMuted)return;if(!engOsc){engOsc=a.createOscillator();engOsc.type='sawtooth';engGain=a.createGain();const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=160;engOsc.connect(f);f.connect(engGain);engGain.connect(a.destination);engGain.gain.value=0;engOsc.start()}engGain.gain.setTargetAtTime(on?.32:0,a.currentTime,.08)}catch(_){}},pitch(t){try{if(ac&&engOsc)engOsc.frequency.setTargetAtTime(55+t*115,ac.currentTime,.06)}catch(_){}},perfect(){this.tone(880,'triangle',.35,.18);setTimeout(()=>this.tone(1320,'sine',.25,.11),25)},great(){this.tone(540,'triangle',.18,.14)},bad(){this.tone(180,'square',.18,.09)},explode(){try{const a=ensureAudio();if(!a||save.isMuted)return;const len=Math.floor(a.sampleRate*.8),buf=a.createBuffer(1,len,a.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();s.buffer=buf;f.type='lowpass';f.frequency.value=900;g.gain.value=.65;s.connect(f);f.connect(g);g.connect(a.destination);s.start()}catch(_){}}};
