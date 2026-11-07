(function(root,factory){const common=typeof module==='object'&&module.exports,api=factory(common?require('./content.js'):root.JudgmentContent);if(common)module.exports=api;else root.JudgmentLogic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 const KEY='forge.judgment-chamber.v1',DEBOUNCE=.18,CONFETTI_CAP=320;
 const event=(id,weight,duration,cooldown,minStage=0,minPress=2)=>({id,weight,duration,cooldown,minStage,minPress});
 const EVENTS=[
  event('confetti',10,2.8,10),event('lights',9,1.5,12),event('disco',7,3.5,20),
  event('multiply',9,2.2,10),event('escape',8,1.2,9),event('reverse',9,1.8,8),
  event('gift',7,2.4,15),event('golden',1,3.6,30,0,10),event('silence',7,1.4,14),
  event('celebration',1,3.4,25,0,10),event('rare',1,2.8,15,0,5),
  event('shrink',3,1,12),event('grow',3,1,12),event('why',3,1.5,14),
  event('counter',3,1.5,12),event('audit',3,2.4,15),event('supervisor',3,2,14,1),
  event('threat',3,2,12,1),event('intercom',5,2.2,12,1),event('distort',3,1,14,2),
  event('do-not-press',3,1.4,14,3),event('break',3,.8,15,3),event('incident',3,2,15,3),
  event('decoy',2,2,20,4),event('recalibrate',3,1.2,16,4),event('closing',3,1.4,16,4),
  event('sincere',5,2.8,18,4,60)
 ];
 const EVENT_MAP=Object.fromEntries(EVENTS.map(e=>[e.id,e]));
 const CATEGORY_WEIGHTS={sarcastic:25,compliment:21,absurd:25,mysterious:15,fourthwall:12,rare:2};
 const ACHIEVEMENT_IDS=new Set(C.achievements.map(a=>a.id));
 class Random{
  constructor(seed){this.state=seed>>>0;}
  next(){this.state=(Math.imul(this.state,1664525)+1013904223)>>>0;return this.state/4294967296;}
 }
 class JudgmentGame{
  constructor({seed=0xC07E2026,effects=true,sound=false}={}){this.initialSeed=seed>>>0;this.rng=new Random(seed);this.count=0;this.achievements=new Set();this.employeeId=null;this.sound=sound;this.effects=effects;this.entered=false;this.paused=false;this.time=0;this.lastPress=-1;this.event=null;this.lastEvent=null;this.cooldowns={};this.nextEvent=0;this.followUp=null;this.message='Go ahead. Press it.';this.previousMessage=null;this.category='mysterious';this.pendingConfetti=0;this.notices=[];this.pressPulse=0;}
  get stage(){return this.count<=5?0:this.count<=15?1:this.count<=30?2:this.count<=50?3:4;}
  get decoy(){return this.count>=40;}
  enter(){this.entered=true;this.paused=false;}
  choose(pool){const available=pool.filter(text=>text!==this.message&&text!==this.previousMessage);return available[Math.floor(this.rng.next()*available.length)]||pool[0];}
  weighted(items){const sum=items.reduce((n,e)=>n+e.weight,0);let n=this.rng.next()*sum;for(const e of items){n-=e.weight;if(n<0)return e;}return items.at(-1);}
  messageFrom(category){this.category=category;this.message=this.choose(C.messages[category]);}
  normalJudgment(){if(this.rng.next()<.34){this.category='sarcastic';this.message=this.choose(C.legacy.messages[this.stage+1]);return;}const weights=Object.entries(CATEGORY_WEIGHTS).filter(([id])=>id!=='rare'||(!this.event&&this.eligible(EVENT_MAP.rare))).map(([id,weight])=>({id,weight}));this.messageFrom(this.weighted(weights).id);}
  unlock(id){if(this.achievements.has(id))return;this.achievements.add(id);this.notices.push(C.achievements.find(a=>a.id===id).name);if(this.notices.length>3)this.notices.shift();}
  burst(count){this.pendingConfetti=Math.min(CONFETTI_CAP,this.pendingConfetti+count);}
  eligible(e){return this.stage>=e.minStage&&this.count>=e.minPress&&this.time>=(this.cooldowns[e.id]||0)&&this.lastEvent!==e.id;}
  selectEvent(){return this.weighted(EVENTS.filter(e=>this.eligible(e)))?.id||null;}
  startEvent(id){const config=EVENT_MAP[id];if(!config)return false;this.event={id,remaining:config.duration,duration:config.duration};this.lastEvent=id;this.cooldowns[id]=this.time+config.cooldown;this.nextEvent=this.time+1.1;this.followUp=null;
   if(id==='threat')this.event.note='Threat level: '+this.choose(['Beige','Mildly Alarming','Undefined','Yes','Tuesday','Confidential']);
   if(id==='intercom')this.event.note=this.choose(['Gallery attendant has been notified.','Visitor 07 remains at the exhibit.','Please do not encourage the other exhibits.','The gift shop does not sell this button.','Security has been asked to observe, not intervene.']);
   if(id==='incident')this.event.note='Human Resources Incident #'+(100+Math.floor(this.rng.next()*900))+' opened';
   if(id==='counter')this.event.note='DISPLAY TEST: '+(1000+Math.floor(this.rng.next()*9000))+' · REAL TOTAL UNCHANGED';
   if(['golden','celebration','rare'].includes(id)){this.messageFrom('rare');this.burst(id==='celebration'?280:220);this.unlock('room-likes-you');}
   if(id==='golden')this.unlock('golden');
   if(id==='confetti')this.burst(160);
   if(id==='disco'){this.unlock('chaos');this.message='The chamber has found its disco licence. It was under a form.';this.category='absurd';}
   if(id==='reverse'){this.message=this.choose(['I am a very dramatic lid. There. I said it.','My entire personality is a circular surface.','I keep judging presses. I should try being a doorbell.','I have one job and an unreasonable lighting budget.']);this.category='sarcastic';}
   if(id==='silence'){this.message='…';this.category='mysterious';this.followUp={at:this.time+.65,text:this.choose(C.messages.absurd),count:this.count};}
   if(id==='gift'){this.followUp={at:this.time+.7,text:this.choose(['A tiny present. Inside: permission to press again.','The gift contains one imaginary biscuit. Crumbs not included.','A present containing a smaller, completely theoretical present.','You received a spare moment. Use it extravagantly.']),count:this.count};}
   if(id==='sincere'){this.message=C.legacy.sincere[0];this.category='compliment';this.followUp={at:this.time+1.5,text:C.legacy.sincere[1].replace('&hellip;','…'),count:this.count};}
   return true;
  }
  press(){if(!this.entered||this.paused||this.time-this.lastPress+1e-9<DEBOUNCE||this.count>=Number.MAX_SAFE_INTEGER)return {accepted:false};this.previousMessage=this.message;this.lastPress=this.time;this.count++;this.pressPulse=1;this.followUp=null;
   if(!this.employeeId){const letters='ACDEFGHJKMNPQRSTUVWXYZ';this.employeeId='ID-'+letters[Math.floor(this.rng.next()*letters.length)]+letters[Math.floor(this.rng.next()*letters.length)]+'-'+(1000+Math.floor(this.rng.next()*9000));}
   if(this.count>=1)this.unlock('first');if(this.count>=25)this.unlock('persistent');if(this.count>=50)this.unlock('persistent-no-reason');if(this.count>=100)this.unlock('professional');
   if(this.count===1){this.message=C.legacy.first;this.category='sarcastic';}
   else{this.normalJudgment();let id=null;if(this.count>=50&&!this.achievements.has('golden'))id='golden';else if([10,25,50,100].includes(this.count))id='celebration';else if(this.category==='rare')id='rare';else if(!this.event&&this.time>=this.nextEvent&&this.rng.next()<.3+this.stage*.04)id=this.selectEvent();if(id)this.startEvent(id);}
   return {accepted:true,count:this.count,message:this.message};
  }
  advance(dt){if(this.paused||!this.entered||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(5,dt);this.time+=dt;this.pressPulse=Math.max(0,this.pressPulse-dt*5);if(this.event){this.event.remaining-=dt;if(this.event.remaining<=0)this.event=null;}if(this.followUp&&this.time>=this.followUp.at){if(this.followUp.count===this.count){this.message=this.followUp.text;this.category='absurd';}this.followUp=null;}}
  drain(){const out={confetti:this.pendingConfetti,notices:this.notices.splice(0)};this.pendingConfetti=0;return out;}
  record(){return {version:1,count:this.count,achievements:[...this.achievements],employeeId:this.employeeId,sound:this.sound,effects:this.effects,rngState:this.rng.state};}
  static fromRecord(data){if(!data||data.version!==1||!Number.isSafeInteger(data.count)||data.count<0||!Array.isArray(data.achievements)||data.achievements.length>ACHIEVEMENT_IDS.size||new Set(data.achievements).size!==data.achievements.length||!data.achievements.every(id=>ACHIEVEMENT_IDS.has(id))||typeof data.sound!=='boolean'||typeof data.effects!=='boolean'||!Number.isInteger(data.rngState)||data.rngState<0||data.rngState>4294967295||(data.employeeId!==null&&!/^ID-[ACDEFGHJKMNPQRSTUVWXYZ]{2}-[1-9][0-9]{3}$/.test(data.employeeId))||(data.count>0&&!data.employeeId))throw Error('Invalid chamber record');const g=new JudgmentGame({seed:data.rngState,effects:data.effects,sound:data.sound});g.count=data.count;g.achievements=new Set(data.achievements);g.employeeId=data.employeeId;if(g.count>0)g.message='Your record has returned. The room has opinions about that.';return g;}
  reset(confirmed){if(!confirmed)return false;const {sound,effects,entered,paused,initialSeed}=this;Object.assign(this,new JudgmentGame({seed:initialSeed,sound,effects}));this.entered=entered;this.paused=paused;return true;}
 }
 class RecordStore{
  constructor(storage){this.storage=storage;this.protected=false;this.warning=null;}
  read(){try{const text=this.storage.getItem(KEY);if(text===null)return {game:null,warning:null};if(text.length>10000)throw Error();return {game:JudgmentGame.fromRecord(JSON.parse(text)),warning:null};}catch{this.protected=true;this.warning='The saved record could not be read. It will stay untouched unless you confirm Reset.';return {game:null,warning:this.warning};}}
  save(game,overwrite=false){if(this.protected&&!overwrite)return false;try{this.storage.setItem(KEY,JSON.stringify(game.record()));this.protected=false;this.warning=null;return true;}catch{this.warning='Progress cannot be saved in this browser. The chamber still works.';return false;}}
 }
 return {JudgmentGame,EVENTS,CATEGORY_WEIGHTS,RecordStore,Random,KEY,DEBOUNCE,CONFETTI_CAP};
});
