// Campaign state is optional: the original simulation remains usable without it.
export const STAGES=['Survival Outpost','Orbital Expansion','Frontier Station'];
export const UPGRADES={
 cargo:{name:'Cargo module',cost:{material:12,knowledge:3},benefit:'Crew carry 4 more supplies per load per level.'},
 engine:{name:'Engine module',cost:{material:14,energy:4},benefit:'Rover-assisted crew transit is 20% faster per level.'},
 scanner:{name:'Scanner array',cost:{material:10,knowledge:6},benefit:'Crew detection +25 and revealed ground +30 per level.'},
 energy:{name:'Energy system',cost:{material:12,knowledge:2},benefit:'Passive recovery +0.06/s and capacity +80 per level.'},
 station:{name:'Station expansion',cost:{material:24,energy:8,knowledge:6},benefit:'Adds solar/docking structures, +0.04 energy/s and +0.025 material/s per level.',stage:2},
};
const built=(s,type)=>s.buildings.some(b=>b.type===type&&b.progress>=1);
const found=s=>s.discoveries.filter(d=>d.found);
const far=s=>found(s).filter(d=>Math.hypot(d.x,d.y)>=450).length;
const specifications=[
 ['First delivery','RESOURCE DELIVERY','Let the crew gather and return 8 material.',{material:12,energy:4},s=>[Math.min(8,s.frontier.deliveries.material),8]],
 ['A place to stay','STATION SUPPORT','Build a habitat pod. Crew finish foundations for you.',{material:16,energy:6},s=>[+built(s,'habitat'),1]],
 ['Food on the frontier','RESOURCE DELIVERY','Build a garden and receive 8 food from the crew.',{material:16,knowledge:6},s=>[+built(s,'garden')+ +(s.frontier.deliveries.food>=8),2]],
 ['Survey the near moon','ORBITAL SURVEY','Discover any two landmarks. Raise Explore priority if needed.',{material:16,knowledge:10},s=>[Math.min(2,found(s).length),2]],
 ['Power for tomorrow','STATION SUPPORT','Build an energy crystal and buy Energy system level 1.',{material:20,knowledge:8},s=>[+built(s,'energy')+ +(s.frontier.upgrades.energy>=1),2]],
 ['Tools for the crew','FRONTIER MILESTONE','Build a workshop and buy Cargo module level 1.',{material:24,energy:10},s=>[+built(s,'workshop')+ +(s.frontier.upgrades.cargo>=1),2]],
 ['Beyond the landing lights','EXPLORATION','Build a research hut and discover a landmark 450 map units away.',{material:24,knowledge:12},s=>[+built(s,'research')+ +(far(s)>0),2]],
 ['Link the frontier','ORBITAL SURVEY','Buy Engine, Scanner and Station expansion level 1.',{material:26,energy:12},s=>[['engine','scanner','station'].filter(k=>s.frontier.upgrades[k]>=1).length,3]],
 ['Commission the station','FRONTIER MILESTONE','Six facilities, Station level 2; deliver 16 material, 12 energy, 12 data.',{},s=>[
  ['habitat','garden','energy','workshop','research','storage'].filter(k=>built(s,k)).length+
  +(s.frontier.upgrades.station>=2)+ +(s.resources.material>=16)+ +(s.resources.energy>=12)+ +(s.resources.knowledge>=12),10]],
];
export function initFrontier(s){
 if(!s.frontier)s.frontier={version:1,mission:0,stage:1,completed:false,acknowledged:false,elapsed:0,
  deliveries:{food:0,material:0},upgrades:{cargo:0,engine:0,scanner:0,energy:0,station:0},
  claimedDiscoveries:[],nextEvent:90,event:null,eventSeed:(s.terrainSeed^0xf17e)>>>0,reliefAt:0,calm:false};
 return s.frontier;
}
export function announce(s,kind,message){
 const item={day:Math.floor(s.time/180)+1,time:s.time,kind,message};s.log.unshift(item);s.log=s.log.slice(0,80);s.latestEvent=item;
}
export function mission(s){
 const f=initFrontier(s);if(f.completed)return{title:'Frontier station operational',category:'COMPLETE',objective:'Continue exploring, follow the monolith or grow your colony.',progress:9,total:9,ready:false,reward:{}};
 const [title,category,objective,reward,check]=specifications[f.mission], [progress,total]=check(s);
 return{title,category,objective,reward,progress,total,ready:progress>=total};
}
export function claimMission(s){
 const f=initFrontier(s),m=mission(s);if(!m.ready)return false;
 if(f.mission===8){s.resources.material-=16;s.resources.energy-=12;s.resources.knowledge-=12;}
 for(const [key,value]of Object.entries(m.reward))s.resources[key]+=value;
 f.mission++;f.stage=f.mission<3?1:f.mission<6?2:3;f.completed=f.mission===9;
 announce(s,f.completed?'FRONTIER COMPLETE':'MISSION COMPLETE',f.completed?'Frontier station commissioned. A home, a garden and a beacon for the next travelers.':`${m.title} complete. Supplies added to the outpost.`);
 return true;
}
export function upgradeCost(s,id){
 const definition=UPGRADES[id];if(!definition)return null;
 const level=initFrontier(s).upgrades[id];return Object.fromEntries(Object.entries(definition.cost).map(([k,v])=>[k,v*(level+1)]));
}
export function canUpgrade(s,id){
 const def=UPGRADES[id],f=initFrontier(s);return !!def&&f.upgrades[id]<2&&f.stage>=(def.stage||1)&&Object.entries(upgradeCost(s,id)).every(([k,v])=>s.resources[k]>=v);
}
export function buyUpgrade(s,id){
 if(!canUpgrade(s,id))return false;
 for(const [k,v]of Object.entries(upgradeCost(s,id)))s.resources[k]-=v;
 const level=++s.frontier.upgrades[id];announce(s,'UPGRADE',`${UPGRADES[id].name} · level ${level}/2 installed.`);return true;
}
export function onDelivery(s,kind,amount,hub=s.buildings[0]){
 if(!s.frontier)return;
 if(['food','material'].includes(kind))s.frontier.deliveries[kind]+=amount;
 s.frontier.flash={kind:'delivery',x:hub.x,y:hub.y,until:s.frontier.elapsed+2};
 announce(s,'DELIVERY',`Crew delivered ${amount} ${kind}. Available at the outpost.`);
}
export function onDiscover(s,d){
 if(!s.frontier||s.frontier.claimedDiscoveries.includes(d.id))return;
 s.frontier.claimedDiscoveries.push(d.id);
 const key=d.kind==='crystal'?'energy':d.kind==='water'?'food':'material',amount=key==='material'?6:8;
 s.resources[key]+=amount;
 if(s.frontier.event?.kind==='anomaly'&&s.frontier.elapsed>=s.frontier.event.start)s.resources.knowledge+=4;
 s.frontier.flash={kind:'discovery',x:d.x,y:d.y,until:s.frontier.elapsed+3};
}
export function relief(s){
 const f=initFrontier(s);if(f.elapsed<f.reliefAt)return false;
 s.resources.food+=8;s.resources.material+=8;s.resources.energy+=4;f.reliefAt=f.elapsed+60;
 announce(s,'SUPPLY DROP','Relief arrived: +8 food, +8 material, +4 energy. Available again in 60 active seconds.');return true;
}
export function repair(s){
 const f=initFrontier(s);if(f.event?.kind!=='malfunction'||s.resources.material<4)return false;
 s.resources.material-=4;f.event=null;announce(s,'SYSTEM RESTORED','Relay repaired. Normal recovery restored.');return true;
}
export function eventFactor(s){
 const f=s.frontier,e=f?.event;if(!e||f.elapsed<e.start)return 1;
 return e.kind==='solar'?.35:e.kind==='malfunction'?.5:1;
}
function rng(f){f.eventSeed=(Math.imul(f.eventSeed,1664525)+1013904223)>>>0;return f.eventSeed/4294967296;}
export function tickFrontier(s,dt){
 if(!s.frontier)return;const f=s.frontier;f.elapsed+=dt;
 if(f.flash&&f.elapsed>f.flash.until)delete f.flash;
 if(f.event&&f.elapsed>=f.event.end){f.event=null;announce(s,'CLEAR SKIES','The disturbance has passed. Normal station operations resumed.');}
 if(!f.event&&f.elapsed>=f.nextEvent){
  const kind=['solar','supply','malfunction','anomaly'][Math.floor(rng(f)*4)];
  f.event={kind,start:f.elapsed+8,end:f.elapsed+28,applied:false};f.nextEvent=f.elapsed+100+rng(f)*40;
  announce(s,'SPACE WEATHER',`${{solar:'Solar disturbance: energy recovery will slow',supply:'Supply signal: a cache is approaching',malfunction:'Relay fault: repair for 4 material or let it self-correct',anomaly:'Rare anomaly: discoveries will yield +4 data'}[kind]}. Begins in 8 seconds; clears automatically.`);
 }
 if(f.event&&f.elapsed>=f.event.start&&!f.event.applied){
  f.event.applied=true;
  if(f.event.kind==='supply'){s.resources.material+=6;s.resources.food+=6;announce(s,'SUPPLY CACHE','Orbital supply cache received: +6 material, +6 food.');}
 }
 const u=f.upgrades;s.resources.energy+=dt*(.025+u.energy*.06+u.station*.04)*eventFactor(s);
 s.resources.material+=dt*u.station*.025;
}
export function missionBias(s,kind){
 if(!s.frontier||s.frontier.completed)return 0;
 const i=s.frontier.mission;
 if(kind==='gather'&&i===0)return 32;
 if(['forage','farm'].includes(kind)&&i===2)return 25;
 if(kind==='explore'&&[3,6].includes(i))return 35;
 return kind==='build'?12:0;
}
export function navigation(s,camera={x:0,y:0}){
 const f=initFrontier(s),i=f.mission;
 let target=s.buildings.find(b=>b.type==='storage'&&b.progress>=1)||s.buildings[0],label='Outpost delivery hub';
 if(i===0){target=s.nodes.find(n=>n.kind==='material')||s.buildings[0];label='Gathering route · '+(target.name||'Outpost');}
 if(i===2&&!built(s,'garden'))label='Build a food garden near the outpost';
 if([3,6].includes(i)){
  const sites=s.discoveries.filter(d=>!d.found&&(i!==6||Math.hypot(d.x,d.y)>=450));
  target=sites.sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0]||s.buildings[0];label=target.name||'Research hut / outpost';
 }
 return{id:target.id,x:target.x,y:target.y,label,distance:Math.round(Math.hypot(target.x-camera.x,target.y-camera.y))};
}
