/* Pure optional exploration model. Garden organisms remain owned by script.js. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), finite=Number.isFinite;
const FLORA=['seaweed','kelp','seagrass','algae','sea-fan','soft-coral','anemone','glow'];
const REGIONS=[
 {id:'sunlit',name:'Sunlit Garden',top:'#116c83',bottom:'#072c40',accent:'#a3efd1',hue:155,secret:'Hidden Coral Garden'},
 {id:'kelp',name:'Kelp Forest',top:'#145663',bottom:'#061f32',accent:'#b9e890',hue:125,secret:'The Kelp Passage'},
 {id:'crystal',name:'Crystal Depths',top:'#17355d',bottom:'#080e2e',accent:'#bcb0ff',hue:190,secret:'Crystal Grotto'},
 {id:'twilight',name:'Twilight Sanctuary',top:'#123b53',bottom:'#071422',accent:'#83e2ed',hue:175,secret:'Sunken Observatory'}
];
const TREASURE_TYPES={pearl:{label:'Glowing pearl',points:5,color:'#fff4ca'},shell:{label:'Ancient shell',points:8,color:'#ffb5a1'},crystal:{label:'Reef crystal',points:10,color:'#a9b7ff'},relic:{label:'Relic fragment',points:12,color:'#e3c582'},starfish:{label:'Starfish token',points:8,color:'#ff8f9f'}};
function random(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
const HABITATS=[[875,240],[870,145],[890,310],[850,185]];
const GATE_TYPES={
 bloom:{name:'Bloom Gate',hint:'Stay near the coral to open it.'},
 pearl:{name:'Pearl Gate',hint:'Find the striped gate pearl near the kelp, then return.'},
 current:{name:'Current Gate',hint:'Follow the arrows through both current markers.'},
 resonance:{name:'Resonance Gate',hint:'Swim to the glowing organisms in order: 1, 2, 3.'}
};
const GATES=Object.keys(GATE_TYPES);
const HABITAT_DEFS=[
 {tasks:['coral','coral'],objective:'Recover both coral fragments.'},
 {tasks:['debris','egg'],objective:'Clear the abandoned debris and recover the egg.'},
 {tasks:['vent','coral'],objective:'Awaken the bubble vent and recover the crystal coral.'},
 {tasks:['creature','egg'],objective:'Guide the lost hatchling home and recover the egg.'}
];
const COMPANIONS=[
 {id:'clownfish',name:'Clownfish',kind:'clownfish',description:'An orange reef fish with white bands. This friendly visitor joins you after the Coral Garden is restored.'},
 {id:'seahorse',name:'Seahorse',kind:'seahorse',description:'A curious little seahorse with a curled tail, found in the restored Kelp Passage.'},
 {id:'jellyfish',name:'Jellyfish',kind:'jellyfish',description:'A softly glowing companion from the Crystal Grotto.'},
 {id:'turtle',name:'Sea turtle',kind:'turtle',description:'The hatchling you guided home in the Sunken Observatory.'}
];
const ACTIVITIES=[
 {id:'coral-rescue',name:'Coral Rescue',region:0,restoration:true},
 {id:'bubble-journey',name:'Bubble Journey',region:0,points:[[640,380],[640,260]]},
 {id:'pearl-trail',name:'Pearl Trail',region:1,points:[[655,100],[701,85],[738,126]]},
 {id:'current-rider',name:'Current Rider',region:2,points:[[320,245],[570,245]]},
 {id:'hidden-garden',name:'Hidden Garden',region:2,restoration:true},
 {id:'creature-rescue',name:'Creature Rescue',region:3,restoration:true}
];
const TASK_LABELS={coral:'Recover coral fragment',debris:'Remove abandoned debris',egg:'Recover marine egg',vent:'Activate the bubble vent',creature:'Guide the hatchling home'};
const POI=[
 [['arch',200,280,'Sunwater Arch'],['garden',490,440,'Anemone Garden']],
 [['kelp',335,390,'Kelp Canopy'],['cave',676,114,'Pearl Nook']],
 [['crystal',395,155,'Crystal Shelf'],['vent',640,390,'Bubble Chimney']],
 [['wreck',444,420,'Sunken Relic'],['nest',670,478,'Turtle Nest']]
];
const boundedList=(value,allowed,limit)=>Array.isArray(value)&&value.length<=limit?[...new Set(value.filter(id=>allowed.includes(id)))]:[];
const habitatTasks=r=>HABITAT_DEFS[r].tasks.map((_,i)=>'habitat-'+r+'-'+i);
const rewardForHabitat=20;
function treasures(region,seed){const rng=random(seed+region*997);const layouts=[[[175,190],[340,430],[550,180],[875,240],[460,340],[680,460],[850,400],[255,520]],[[305,170],[470,480],[185,350],[870,145],[565,250],[655,520],[910,435],[370,570]],[[210,430],[540,350],[385,155],[890,310],[630,185],[915,545],[820,100],[140,540]],[[355,260],[170,165],[570,510],[850,185],[445,420],[925,360],[650,280],[270,570]]];const positions=layouts[region];
 return positions.map(([x,y],i)=>({id:`${REGIONS[region].id}-${i}`,type:i<4?'pearl':['shell','crystal','relic','starfish'][i-4],rare:i===3,x:x+(rng()-.5)*10,y:y+(rng()-.5)*10,phase:rng()*Math.PI*2}));}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const overlapsRect=(x,y,r,g)=>x>g.x-r&&x<g.x+g.w+r&&y>g.y-r&&y<g.y+g.h+r;
class Ocean {
 constructor(seed=17017,saved=null){
  this.seed=[1,2].includes(saved?.v)&&Number.isInteger(saved.seed)&&saved.seed>=0&&saved.seed<=0xffffffff?saved.seed:Number.isInteger(seed)?seed>>>0:17017;this.region=0;this.survey=false;this.paused=false;this.time=0;this.target=null;this.brushed=false;this.upstream=0;this.events=[];this.effects=[];this.journal={found:[],secrets:[],encounters:[],challenges:[],milestones:[],points:0,gates:[],restored:[],companions:[],activities:[],tasks:[],keys:[],routes:[]};
  this.restore(saved);this.setRegion(this.region);
 }
 setRegion(index){if(!Number.isInteger(index)||index<0||index>=4)return false;this.region=index;this.probe={x:90,y:320,vx:0,vy:0};this.target=null;this.brushed=false;this.upstream=0;this.time=0;this.effects=[];
  const rng=random(this.seed+index*7919);this.treasures=treasures(index,this.seed);this.secret={id:'secret-'+index,name:REGIONS[index].secret,x:HABITATS[index][0],y:HABITATS[index][1],r:58};
  this.current={x:280,y:175,w:330,h:150,dx:index%2?-27:27};this.vent={x:640,y:390,r:48};const type=GATES[index],gy=this.secret.y, entrance=780, half=72, aperture=32;
  this.gate={...GATE_TYPES[type],type,x:entrance,y:gy-aperture,w:18,h:aperture*2,progress:0,open:false,state:'closed'};
  this.walls=[
   {x:entrance,y:gy-half,w:190,h:12},
   {x:entrance,y:gy+half-12,w:190,h:12},
   {x:entrance,y:gy-half,w:18,h:half-aperture},
   {x:entrance,y:gy+aperture,w:18,h:half-aperture},
   {x:952,y:gy-half,w:18,h:2*half}
  ];
  this.habitat={...this.secret,x:this.secret.x,y:gy,total:HABITAT_DEFS[index].tasks.length,objective:HABITAT_DEFS[index].objective};
  this.poi=POI[index].map(([kind,x,y,label])=>({kind,x,y,label}));
  this.resonance=0;this.currentProgress=0;this.gateOpenedAt=undefined;this.escorting=false;this.escort=null;
  this.markers=[];
  if(type==='pearl')this.markers.push({id:'pearl-key',kind:'pearl',x:690,y:112,label:'Gate pearl'});
  if(type==='current'){
   const direction=Math.sign(this.current.dx);
   const points=direction>0?[320,570]:[570,320];
   points.forEach((x,i)=>this.markers.push({id:'flow-'+i,kind:'current',number:i+1,x,y:215,label:'Current marker '+(i+1)}));
  }
  if(type==='resonance')[[665,124],[722,242],[680,341]].forEach(([x,y],i)=>this.markers.push({id:'tone-'+i,kind:'resonance',number:i+1,x,y,label:'Resonance '+(i+1)}));
  HABITAT_DEFS[index].tasks.forEach((kind,i)=>this.markers.push({id:habitatTasks(index)[i],kind,habitat:true,x:i?918:827,y:gy+(i?27:-27),label:TASK_LABELS[kind]}));
  for(const route of ACTIVITIES.filter(a=>a.region===index&&a.points))route.points.forEach(([x,y],i)=>this.markers.push({id:route.id+'-'+i,route:route.id,number:i+1,kind:'route',x,y,label:route.name+' '+(i+1)+'/'+route.points.length}));
  if(type==='pearl'&&this.journal.keys.includes('pearl-key'))this.gate.hint='Return to the coral gate with the pearl.';
  this.companion=null;
  this.syncDiscoveries();
  this.decorations=Array.from({length:160},(_,i)=>{let type=FLORA[i%8];if(index===1&&i%3===0)type='kelp';if(index>1&&i%9===0)type='glow';return {id:i,type,x:rng()*1000,y:440+rng()*205,scale:.55+rng()*1.2,phase:rng()*Math.PI*2,tint:Math.floor(rng()*3),layer:i%5===0?'front':'back'};});
  const schools=Array.from({length:7},()=>({x:90+rng()*820,y:100+rng()*320}));
  this.schoolCenters=Array.from({length:7},()=>({x:0,y:0,n:0}));
  this.life=Array.from({length:58},(_,i)=>{const school=Math.floor(i/6),group=schools[school%7];return {id:i,type:i<42?'fish':i<47?'jelly':i<53?'crab':'ray',school,x:i<42?group.x+(rng()-.5)*65:rng()*1000,y:i<42?group.y+(rng()-.5)*35:i>=47&&i<53?572+rng()*40:90+rng()*410,vx:(school%2?-1:1)*(8+rng()*14),vy:0,phase:rng()*Math.PI*2,size:3+rng()*5};});return true;
 }
 gateOpen(){return this.gate.open;}
 gateCountdown(){return this.gateOpen()?0:Math.max(0,1.4*(1-this.gate.progress));}
 solidAt(x,y,r=10){
  for(const wall of this.walls)if(overlapsRect(x,y,r,wall))return true;
  return !this.gateOpen()&&overlapsRect(x,y,r,this.gate);
 }
 regionProgress(index){
  if(!REGIONS[index])return null;
  const j=this.journal, id='secret-'+index, ids=habitatTasks(index), restoration=ids.filter(t=>j.tasks.includes(t)).length;
  const habitatState=j.restored.includes(id)?'restored':restoration?'restoring':j.secrets.includes(id)?'discovered':'undiscovered';
  return {
   treasures:j.found.filter(t=>t.startsWith(REGIONS[index].id+'-')).length,totalTreasures:8,
   gate:GATE_TYPES[GATES[index]].name,gateOpen:j.gates.includes(REGIONS[index].id),
   habitat:REGIONS[index].secret,habitatState,restoration,totalTasks:ids.length,
   companion:COMPANIONS[index].name,companionFound:j.companions.includes(COMPANIONS[index].id),
   activities:ACTIVITIES.filter(a=>a.region===index).map(a=>({id:a.id,name:a.name,done:j.activities.includes(a.id)})),
   discoveries:POI[index].map(([kind,,,label],i)=>({id:'poi-'+index+'-'+i,kind,label,done:j.routes.includes('poi-'+index+'-'+i)}))
  };
 }
 syncDiscoveries(){
  const j=this.journal, progress=this.regionProgress(this.region), gate=this.gate;
  gate.open=progress.gateOpen;
  if(gate.open)gate.progress=1;
  gate.state=gate.open?(this.gateOpenedAt===undefined||this.time-this.gateOpenedAt>1?'completed':'open'):gate.progress>0?'activating':'closed';
  this.habitat.state=progress.habitatState;
  this.habitat.progress=progress.restoration;
  this.habitat.ventActive=this.region===2&&j.tasks.includes(habitatTasks(this.region)[0]);
  for(const marker of this.markers){
   marker.collected=marker.route?j.routes.includes(marker.id):marker.habitat?j.tasks.includes(marker.id):
    marker.kind==='pearl'?j.keys.includes(marker.id):marker.kind==='resonance'?marker.number<=this.resonance:marker.number<=this.currentProgress;
   marker.active=!marker.collected&&(marker.habitat?j.secrets.includes(this.secret.id)&&(marker.kind!=='creature'||!this.escorting):
    marker.route?marker.number===1||j.routes.includes(marker.route+'-'+(marker.number-2)):
    !gate.open);
  }
  const unlocked=j.companions.includes(COMPANIONS[this.region].id)?COMPANIONS[this.region]:
   COMPANIONS.find(c=>j.companions.includes(c.id));
  if(unlocked&&this.companion?.id!==unlocked.id)this.companion={...unlocked,x:this.probe.x-20,y:this.probe.y+15,vx:0};
 }
 completeActivity(id){
  if(this.journal.activities.includes(id))return;
  this.journal.activities.push(id);
  const activity=ACTIVITIES.find(a=>a.id===id);
  this.emit('challenge',activity.name+' complete · Recorded in your journal');
 }
 openGate(){
  const id=REGIONS[this.region].id;
  if(this.journal.gates.includes(id))return;
  this.journal.gates.push(id);
  this.gateOpenedAt=this.time;
  this.syncDiscoveries();
  this.emit('gate',this.gate.name+' opened · Swim into the hidden passage');
 }
 updateExploration(dt,flow,ix){
  const p=this.probe,j=this.journal,g=this.gate;
  const nearGate=Math.hypot(p.x-g.x-g.w/2,p.y-g.y-g.h/2)<65;
  if(!g.open){
   if(g.type==='bloom'||g.type==='pearl'&&j.keys.includes('pearl-key')){
    g.progress=clamp(g.progress+(nearGate?dt/(g.type==='bloom'?1.4:.45):-dt*3),0,1);
    if(g.progress>=.9999)this.openGate();
   }else if(g.type==='current'||g.type==='resonance'){
    const count=g.type==='current'?this.currentProgress:this.resonance;
    g.progress=count/(g.type==='current'?2:3);
   }
  }
  if(distance(p,this.secret)<this.secret.r&&!j.secrets.includes(this.secret.id)){
   j.secrets.push(this.secret.id);
   this.recompute();
   this.emit('secret',this.secret.name+' discovered · '+this.habitat.objective+' · +15 discovery points');
   this.syncDiscoveries();
  }
  for(const marker of this.markers){
   if(!marker.active||distance(marker,p)>(marker.kind==='creature'?14:21))continue;
   if(marker.habitat){
    if(marker.kind==='creature'){
     if(!this.escorting){
      this.escorting=true;
      marker.active=false;
      this.escort={...COMPANIONS[this.region],x:marker.x,y:marker.y,vx:0};
      this.emit('activity','Lead the hatchling to the center of this habitat.');
     }
     continue;
    }
    j.tasks.push(marker.id);
    this.emit('activity',marker.label+' · Restoration in progress',marker.x,marker.y);
   }else if(marker.route){
    if(marker.route==='bubble-journey'&&marker.number===1&&flow.y>=0)continue;
    if(marker.route==='current-rider'&&(!flow.x||ix*flow.x<=0))continue;
    j.routes.push(marker.id);
    const route=ACTIVITIES.find(a=>a.id===marker.route);
    if(marker.number===route.points.length)this.completeActivity(route.id);
    else this.emit('activity',route.name+' · Follow the next marker');
   }else if(marker.kind==='pearl'){
    j.keys.push(marker.id);
    g.hint='Return to the coral gate with the pearl.';
    this.emit('activity','Gate pearl collected · Return to the Pearl Gate',marker.x,marker.y);
   }else if(marker.kind==='current'){
    if(marker.number!==this.currentProgress+1||!flow.x||ix*flow.x<=0)continue;
    this.currentProgress++;
    if(this.currentProgress===2)this.openGate();
    else this.emit('activity','Current marker 1 of 2 · Keep swimming with the flow');
   }else if(marker.kind==='resonance'){
    if(marker.number!==this.resonance+1){g.hint='Next: swim to glowing organism '+(this.resonance+1)+'.';continue;}
    this.resonance++;
    if(this.resonance===3)this.openGate();
    else{g.hint='Next: swim to glowing organism '+(this.resonance+1)+'.';this.emit('activity','Resonance '+this.resonance+' of 3 · Follow the next number');}
   }
   this.syncDiscoveries();
  }
  if(this.escort){
   this.follow(this.escort,dt,0);
   if(distance(p,this.secret)<14&&distance(this.escort,this.secret)<19){
    j.tasks.push(habitatTasks(this.region)[0]);
    this.escort=null;
    this.syncDiscoveries();
    this.emit('activity','The hatchling is safely home.');
   }
  }
  if(j.secrets.includes(this.secret.id)&&!j.restored.includes(this.secret.id)&&habitatTasks(this.region).every(id=>j.tasks.includes(id))){
   j.restored.push(this.secret.id);
   j.companions.push(COMPANIONS[this.region].id);
   this.recompute();
   this.emit('restored',this.secret.name+' restored · +'+rewardForHabitat+' points · '+COMPANIONS[this.region].name+' joined you');
   for(const a of ACTIVITIES)if(a.region===this.region&&a.restoration)this.completeActivity(a.id);
   this.syncDiscoveries();
  }
  this.poi.forEach((spot,i)=>{
   const id='poi-'+this.region+'-'+i;
   if(distance(spot,p)<32&&!j.routes.includes(id)){j.routes.push(id);this.emit('secret',spot.label+' · Added to the journal',spot.x,spot.y);}
  });
  g.state=g.open?(this.gateOpenedAt===undefined||this.time-this.gateOpenedAt>1?'completed':'open'):g.progress>0?'activating':'closed';
  if(this.companion)this.follow(this.companion,dt,26);
 }
 follow(animal,dt,offset){
  const p=this.probe,dx=p.x-animal.x,dy=p.y-animal.y,d=Math.hypot(dx,dy);
  if(d<offset+4)return;
  const speed=Math.min(132,(d-offset)*5), ax=animal.x+dx/d*speed*dt,ay=animal.y+dy/d*speed*dt;
  animal.vx=dx/d*speed;
  if(!this.solidAt(ax,animal.y,5))animal.x=ax;
  if(!this.solidAt(animal.x,ay,5))animal.y=ay;
  if(offset&&d>160){
   const regroupY=clamp(p.y+18,25,620);
   if(!this.solidAt(p.x,regroupY,8)){animal.x=p.x;animal.y=regroupY;}
  }
 }
 flowAt(x,y){
  const c=this.current,v=this.vent,h=this.habitat;
  const ambientLift=Math.abs(x-v.x)<v.r&&y>v.y-155&&y<v.y+15&&this.time%6<2;
  const restoredVent=h?.ventActive&&Math.abs(x-827)<18&&y>h.y-54&&y<h.y-16;
  return {x:x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h?c.dx:0,y:ambientLift?-36:restoredVent?-14:0};
 }
 emit(type,text,x=this.probe.x,y=this.probe.y){if(this.companion&&['treasure','secret','restored'].includes(type))this.companion.excitedUntil=this.time+1.6;this.events.push({type,text,x,y});if(this.events.length>24)this.events.shift();for(let i=0;i<8;i++){this.effects.push({x,y,phase:i*.8,life:1.4,type});}if(this.effects.length>120)this.effects.splice(0,this.effects.length-120);}
 collect(id){if(!this.survey||this.paused||this.journal.found.includes(id))return false;const t=this.treasures.find(t=>t.id===id);if(!t||(t.rare&&!this.gateOpen())||distance(t,this.probe)>22)return false;this.journal.found.push(id);if(!this.brushed&&!this.journal.challenges.includes('clean-discovery'))this.journal.challenges.push('clean-discovery');const complete=this.journal.challenges.includes('region-'+this.region);this.recompute();this.emit('treasure',`${t.rare?'Rare pearl':TREASURE_TYPES[t.type].label} · +${TREASURE_TYPES[t.type].points+(t.rare?15:0)} discovery points`,t.x,t.y);if(!complete&&this.journal.challenges.includes('region-'+this.region))this.emit('complete',`${REGIONS[this.region].name} survey complete · all eight treasures found`);return true;}
 recompute(){const j=this.journal,all=REGIONS.flatMap((_,r)=>treasures(r,this.seed));j.points=all.filter(t=>j.found.includes(t.id)).reduce((n,t)=>n+TREASURE_TYPES[t.type].points+(t.rare?15:0),0)+j.secrets.length*15+j.restored.length*rewardForHabitat;
  const award=id=>{if(!j.challenges.includes(id))j.challenges.push(id);};for(let r=0;r<4;r++)if(treasures(r,this.seed).every(t=>j.found.includes(t.id)))award('region-'+r);
  if(all.filter(t=>t.rare&&j.found.includes(t.id)).length>=3)award('rare-pearls');if(j.secrets.length===4)award('all-secrets');j.milestones=[5,12,24].filter(n=>j.found.length>=n);
 }
 step(delta,input={}){if(this.paused||!finite(delta)||delta<=0)return;let remaining=Math.min(delta,.1);while(remaining>1e-8){const dt=Math.min(1/60,remaining);remaining-=dt;this.tick(dt,input);}}
 tick(dt,input){this.time+=dt;const p=this.probe;let ix=finite(input.x)?clamp(input.x,-1,1):0,iy=finite(input.y)?clamp(input.y,-1,1):0;
  if(this.survey){if(ix||iy)this.target=null;else if(this.target){const d=distance(p,this.target);if(d>5){ix=(this.target.x-p.x)/d;iy=(this.target.y-p.y)/d;}else this.target=null;}
   const length=Math.hypot(ix,iy);if(length>1){ix/=length;iy/=length;}const flow=this.flowAt(p.x,p.y);const blend=1-Math.exp(-dt*18),vx=p.vx+(ix*150+flow.x-p.vx)*blend,vy=p.vy+(iy*150+flow.y-p.vy)*blend,nx=clamp(p.x+vx*dt,15,985),ny=clamp(p.y+vy*dt,25,620);
   if(this.solidAt(nx,p.y)){this.brushed=true;p.vx=0;}else{p.x=nx;p.vx=vx;}
   if(this.solidAt(p.x,ny)){this.brushed=true;p.vy=0;}else{p.y=ny;p.vy=vy;}
   if(flow.x&&ix*flow.x<0&&Math.abs(p.vx)>50){this.upstream+=dt;if(this.upstream>2&&!this.journal.challenges.includes('upstream')){this.journal.challenges.push('upstream');this.emit('challenge','Current navigator · optional challenge complete');}}
   for(const t of this.treasures)this.collect(t.id);
   this.updateExploration(dt,flow,ix);
  }
  const schools=this.schoolCenters;for(const s of schools){s.x=0;s.y=0;s.n=0;}for(const c of this.life)if(c.type==='fish'){const s=schools[c.school];s.x+=c.x;s.y+=c.y;s.n++;}
  for(const c of this.life){const group=c.school*.6,heading=c.school%2?-1:1;let flee=0;if(this.survey&&distance(c,p)<90)flee=(c.x-p.x)*.8;let cohesion=0;if(c.type==='fish'){const s=schools[c.school],dx=s.x/s.n-c.x;cohesion=Math.abs(dx)<150?dx*.1:0;c.y+=(s.y/s.n-c.y)*dt*.25;}c.vx=clamp(c.vx+(heading*9-c.vx+cohesion)*dt+flee*dt,-55,55);c.x+=c.vx*dt;c.y+=Math.sin(this.time*.6+group)*dt*(c.type==='crab'?.5:3);if(c.x< -25)c.x=1025;if(c.x>1025)c.x=-25;c.y=clamp(c.y,c.type==='crab'?560:55,c.type==='crab'?625:520);
   if(this.survey&&distance(c,p)<45&&!this.journal.encounters.includes(c.type)){this.journal.encounters.push(c.type);this.emit('encounter',`${c.type==='jelly'?'Jellyfish':c.type} observed`);}
  }
  let visible=0;for(const e of this.effects){e.life-=dt;if(e.life>0)this.effects[visible++]=e;}this.effects.length=visible;
 }
 drainEvents(){const e=this.events;this.events=[];return e;}
 restartSurvey(){return this.setRegion(this.region);}
 serialize(){const j=this.journal;return {v:2,seed:this.seed,region:this.region,found:[...j.found],secrets:[...j.secrets],encounters:[...j.encounters],challenges:[...j.challenges],gates:[...j.gates],tasks:[...j.tasks],restored:[...j.restored],keys:[...j.keys],routes:[...j.routes],activities:[...j.activities]};}
 restore(data){
  if(!data||typeof data!=='object'||![1,2].includes(data.v))return;
  const j=this.journal, all=REGIONS.flatMap((_,r)=>treasures(r,this.seed)), secrets=REGIONS.map((_,r)=>'secret-'+r);
  j.found=boundedList(data.found,all.map(t=>t.id),32);
  j.secrets=boundedList(data.secrets,secrets,4);
  j.encounters=boundedList(data.encounters,['fish','jelly','crab','ray'],4);
  j.challenges=boundedList(data.challenges,j.found.length?['clean-discovery','upstream']:['upstream'],10);
  const migrated=REGIONS.filter((r,i)=>j.secrets.includes(secrets[i])||j.found.includes(r.id+'-3')).map(r=>r.id);
  j.gates=data.v===1?migrated:boundedList(data.gates,REGIONS.map(r=>r.id),4);
  if(data.v===2){
   j.tasks=boundedList(data.tasks,REGIONS.flatMap((_,r)=>j.secrets.includes(secrets[r])?habitatTasks(r):[]),8);
   j.restored=boundedList(data.restored,secrets,4).filter(id=>habitatTasks(secrets.indexOf(id)).every(t=>j.tasks.includes(t)));
   j.companions=j.restored.map(id=>COMPANIONS[secrets.indexOf(id)].id);
   j.keys=boundedList(data.keys,['pearl-key'],1);
   const routeIds=ACTIVITIES.flatMap(a=>(a.points||[]).map((_,i)=>a.id+'-'+i));
   j.routes=boundedList(data.routes,[...routeIds,...POI.flatMap((points,r)=>points.map((_,i)=>'poi-'+r+'-'+i))],20);
   j.activities=ACTIVITIES.filter(a=>a.restoration?j.restored.includes(secrets[a.region]):a.points.every((_,i)=>j.routes.includes(a.id+'-'+i))).map(a=>a.id);
  }
  this.region=Number.isInteger(data.region)&&data.region>=0&&data.region<4?data.region:0;
  this.recompute();
 }
}
const api={Ocean,REGIONS,FLORA,TREASURE_TYPES,random,GATE_TYPES,HABITAT_DEFS,COMPANIONS,ACTIVITIES};root.ReefOcean=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
