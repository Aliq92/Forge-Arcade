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
function treasures(region,seed){const rng=random(seed+region*997);const layouts=[[[175,190],[340,430],[550,180],[875,240],[460,340],[680,460],[850,400],[255,520]],[[305,170],[470,480],[185,350],[870,145],[565,250],[655,520],[910,435],[370,570]],[[210,430],[540,350],[385,155],[890,310],[630,185],[915,545],[820,100],[140,540]],[[355,260],[170,165],[570,510],[850,185],[445,420],[925,360],[650,280],[270,570]]];const positions=layouts[region];
 return positions.map(([x,y],i)=>({id:`${REGIONS[region].id}-${i}`,type:i<4?'pearl':['shell','crystal','relic','starfish'][i-4],rare:i===3,x:x+(rng()-.5)*10,y:y+(rng()-.5)*10,phase:rng()*Math.PI*2}));}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class Ocean {
 constructor(seed=17017,saved=null){
  this.seed=Number.isInteger(seed)?seed>>>0:17017;this.region=0;this.survey=false;this.paused=false;this.time=0;this.target=null;this.brushed=false;this.upstream=0;this.events=[];this.effects=[];this.journal={found:[],secrets:[],encounters:[],challenges:[],milestones:[],points:0};
  this.restore(saved);this.setRegion(this.region);
 }
 setRegion(index){if(!Number.isInteger(index)||index<0||index>=4)return false;this.region=index;this.probe={x:90,y:320,vx:0,vy:0};this.target=null;this.brushed=false;this.upstream=0;this.time=0;this.effects=[];
  const rng=random(this.seed+index*7919);this.treasures=treasures(index,this.seed);this.secret={id:'secret-'+index,name:REGIONS[index].secret,x:HABITATS[index][0],y:HABITATS[index][1],r:58};
  this.current={x:280,y:175,w:330,h:150,dx:index%2?-27:27};this.vent={x:640,y:390,r:48};this.gate={x:760,y:160,w:18,h:180};
  this.decorations=Array.from({length:160},(_,i)=>{let type=FLORA[i%8];if(index===1&&i%3===0)type='kelp';if(index>1&&i%9===0)type='glow';return {id:i,type,x:rng()*1000,y:440+rng()*205,scale:.55+rng()*1.2,phase:rng()*Math.PI*2,tint:Math.floor(rng()*3),layer:i%5===0?'front':'back'};});
  const schools=Array.from({length:7},()=>({x:90+rng()*820,y:100+rng()*320}));
  this.life=Array.from({length:58},(_,i)=>{const school=Math.floor(i/6),group=schools[school%7];return {id:i,type:i<42?'fish':i<47?'jelly':i<53?'crab':'ray',school,x:i<42?group.x+(rng()-.5)*65:rng()*1000,y:i<42?group.y+(rng()-.5)*35:i>=47&&i<53?572+rng()*40:90+rng()*410,vx:(school%2?-1:1)*(8+rng()*14),vy:0,phase:rng()*Math.PI*2,size:3+rng()*5};});return true;
 }
 gateOpen(){return this.time%8<4;}
 gateCountdown(){return this.gateOpen()?4-this.time%8:8-this.time%8;}
 solidAt(x,y,r=10){const g=this.gate;return !this.gateOpen()&&x>g.x-r&&x<g.x+g.w+r&&y>g.y-r&&y<g.y+g.h+r;}
 flowAt(x,y){const c=this.current,v=this.vent;return {x:x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h?c.dx:0,y:Math.abs(x-v.x)<v.r&&y>v.y-155&&y<v.y+15&&this.time%6<2?-36:0};}
 emit(type,text,x=this.probe.x,y=this.probe.y){this.events.push({type,text,x,y});if(this.events.length>24)this.events.shift();for(let i=0;i<8;i++){this.effects.push({x,y,phase:i*.8,life:1.4,type});}if(this.effects.length>120)this.effects.splice(0,this.effects.length-120);}
 collect(id){if(!this.survey||this.paused||this.journal.found.includes(id))return false;const t=this.treasures.find(t=>t.id===id);if(!t||distance(t,this.probe)>22)return false;this.journal.found.push(id);if(!this.brushed&&!this.journal.challenges.includes('clean-discovery'))this.journal.challenges.push('clean-discovery');const complete=this.journal.challenges.includes('region-'+this.region);this.recompute();this.emit('treasure',`${t.rare?'Rare pearl':TREASURE_TYPES[t.type].label} · +${TREASURE_TYPES[t.type].points+(t.rare?15:0)} discovery points`,t.x,t.y);if(!complete&&this.journal.challenges.includes('region-'+this.region))this.emit('complete',`${REGIONS[this.region].name} survey complete · all eight treasures found`);return true;}
 recompute(){const j=this.journal,all=REGIONS.flatMap((_,r)=>treasures(r,this.seed));j.points=all.filter(t=>j.found.includes(t.id)).reduce((n,t)=>n+TREASURE_TYPES[t.type].points+(t.rare?15:0),0)+j.secrets.length*15;
  const award=id=>{if(!j.challenges.includes(id))j.challenges.push(id);};for(let r=0;r<4;r++)if(treasures(r,this.seed).every(t=>j.found.includes(t.id)))award('region-'+r);
  if(all.filter(t=>t.rare&&j.found.includes(t.id)).length>=3)award('rare-pearls');if(j.secrets.length===4)award('all-secrets');j.milestones=[5,12,24].filter(n=>j.found.length>=n);
 }
 step(delta,input={}){if(this.paused||!finite(delta)||delta<=0)return;let remaining=Math.min(delta,.1);while(remaining>1e-8){const dt=Math.min(1/60,remaining);remaining-=dt;this.tick(dt,input);}}
 tick(dt,input){this.time+=dt;const p=this.probe;let ix=finite(input.x)?clamp(input.x,-1,1):0,iy=finite(input.y)?clamp(input.y,-1,1):0;
  if(this.survey){if(ix||iy)this.target=null;else if(this.target){const d=distance(p,this.target);if(d>5){ix=(this.target.x-p.x)/d;iy=(this.target.y-p.y)/d;}else this.target=null;}
   const length=Math.hypot(ix,iy);if(length>1){ix/=length;iy/=length;}const flow=this.flowAt(p.x,p.y);const vx=ix*150+flow.x,vy=iy*150+flow.y,nx=clamp(p.x+vx*dt,15,985),ny=clamp(p.y+vy*dt,25,620);
   if(this.solidAt(nx,p.y)){this.brushed=true;p.vx=0;const g=this.gate;if(p.x>g.x-10&&p.x<g.x+g.w+10)p.x=p.x<g.x+g.w/2?g.x-10:g.x+g.w+10;}else{p.x=nx;p.vx=vx;}
   if(this.solidAt(p.x,ny)){this.brushed=true;p.vy=0;}else{p.y=ny;p.vy=vy;}
   if(flow.x&&ix*flow.x<0&&Math.abs(p.vx)>50){this.upstream+=dt;if(this.upstream>2&&!this.journal.challenges.includes('upstream')){this.journal.challenges.push('upstream');this.emit('challenge','Current navigator · optional challenge complete');}}
   for(const t of this.treasures)this.collect(t.id);
   if(distance(p,this.secret)<this.secret.r&&!this.journal.secrets.includes(this.secret.id)){this.journal.secrets.push(this.secret.id);this.recompute();this.emit('secret',`${this.secret.name} discovered · +15 discovery points`);}
  }
  const schools=Array.from({length:7},()=>({x:0,y:0,n:0}));for(const c of this.life)if(c.type==='fish'){const s=schools[c.school];s.x+=c.x;s.y+=c.y;s.n++;}
  for(const c of this.life){const group=c.school*.6,heading=c.school%2?-1:1;let flee=0;if(this.survey&&distance(c,p)<90)flee=(c.x-p.x)*.8;let cohesion=0;if(c.type==='fish'){const s=schools[c.school],dx=s.x/s.n-c.x;cohesion=Math.abs(dx)<150?dx*.1:0;c.y+=(s.y/s.n-c.y)*dt*.25;}c.vx=clamp(c.vx+(heading*9-c.vx+cohesion)*dt+flee*dt,-55,55);c.x+=c.vx*dt;c.y+=Math.sin(this.time*.6+group)*dt*(c.type==='crab'?.5:3);if(c.x< -25)c.x=1025;if(c.x>1025)c.x=-25;c.y=clamp(c.y,c.type==='crab'?560:55,c.type==='crab'?625:520);
   if(this.survey&&distance(c,p)<45&&!this.journal.encounters.includes(c.type)){this.journal.encounters.push(c.type);this.emit('encounter',`${c.type==='jelly'?'Jellyfish':c.type} observed`);}
  }
  for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
 }
 drainEvents(){const e=this.events;this.events=[];return e;}
 restartSurvey(){this.time=0;this.probe={x:90,y:320,vx:0,vy:0};this.target=null;this.brushed=false;this.effects=[];this.upstream=0;}
 serialize(){return {v:1,seed:this.seed,region:this.region,found:[...this.journal.found],secrets:[...this.journal.secrets],encounters:[...this.journal.encounters],challenges:[...this.journal.challenges]};}
 restore(data){if(!data||typeof data!=='object'||data.v!==1)return;const all=REGIONS.flatMap((_,r)=>treasures(r,this.seed)),valid=new Set(all.map(t=>t.id));const list=(v,allow,cap)=>Array.isArray(v)&&v.length<=cap?[...new Set(v.filter(x=>typeof x==='string'&&allow.has(x)))]:[];
  this.journal.found=list(data.found,valid,32);this.journal.secrets=list(data.secrets,new Set(['secret-0','secret-1','secret-2','secret-3']),4);this.journal.encounters=list(data.encounters,new Set(['fish','jelly','crab','ray']),4);
  this.journal.challenges=list(data.challenges,new Set(this.journal.found.length?['clean-discovery','upstream']:['upstream']),10);this.region=Number.isInteger(data.region)&&data.region>=0&&data.region<4?data.region:0;this.recompute();
 }
}
const api={Ocean,REGIONS,FLORA,TREASURE_TYPES,random};root.ReefOcean=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
