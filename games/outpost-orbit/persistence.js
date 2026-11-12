import {TYPES} from './simulation.js';
import {initFrontier,UPGRADES} from './frontier.js';
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const point=p=>p&&finite(p.x,-2000,2000)&&finite(p.y,-2000,2000);
const count=(value,max)=>Number.isInteger(value)&&value>=0&&value<=max;
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function loadState(text){
 try{
  const s=JSON.parse(text);
  if(!s||s.saveVersion!==1||!finite(s.seed,0,4294967295)||!finite(s.time,0,1e9)||!finite(s.terrainSeed,0,4294967295))return null;
  if(!s.resources||!['food','energy','material','knowledge'].every(k=>finite(s.resources[k],0,1e7)))return null;
  if(!Array.isArray(s.buildings)||s.buildings.length<2||s.buildings[0].type!=='landing'||s.buildings[1].type!=='camp'||!s.buildings.every(b=>point(b)&&TYPES[b.type]&&count(b.id,1e6)&&finite(b.progress,0,1))||new Set(s.buildings.map(b=>b.id)).size!==s.buildings.length)return null;
  if(!Array.isArray(s.aliens)||!s.aliens.length||s.aliens.length>24||!s.aliens.every(a=>point(a)&&finite(a.px,-2000,2000)&&finite(a.py,-2000,2000)&&count(a.id,100)&&typeof a.name==='string'&&/^#[a-f0-9]{6}$/i.test(a.color)&&Array.isArray(a.traits)&&a.traits.every(t=>typeof t==='string')&&a.needs&&['hunger','rest','social'].every(k=>finite(a.needs[k],0,200))&&a.relationships&&a.visits&&a.exposures&&a.stats&&Array.isArray(a.memories)&&Array.isArray(a.visualTraits)&&finite(a.age,0,1e9)&&(!a.task||(point(a.task.target)&&['walk','work'].includes(a.task.phase)&&finite(a.task.remaining,-1,1000)&&finite(a.task.elapsed,0,10000)&&(!a.task.waypoints||Array.isArray(a.task.waypoints)&&a.task.waypoints.length<=100&&a.task.waypoints.every(point))))))return null;
  if(!Array.isArray(s.discoveries)||s.discoveries.length!==9||!s.discoveries.every(d=>point(d)&&typeof d.id==='string'&&typeof d.name==='string'&&typeof d.found==='boolean')||!Array.isArray(s.nodes)||s.nodes.length!==4||!s.nodes.every(n=>point(n)&&['food','material'].includes(n.kind)))return null;
  const nodes={fruit:'food',salvage:'material',fungus:'food',rocks:'material'};
  const sites={pond:'water',crystal:'crystal',grove:'fungal',bones:'bones',cave:'cave',machine:'tech',vent:'vent',egg:'egg',monolith:'monolith'};
  if(new Set(s.nodes.map(n=>n.id)).size!==4||!s.nodes.every(n=>nodes[n.id]===n.kind)||new Set(s.discoveries.map(d=>d.id)).size!==9||!s.discoveries.every(d=>sites[d.id]===d.kind))return null;
  const alienIds=new Set(s.aliens.map(a=>String(a.id)));
  if(alienIds.size!==s.aliens.length||!s.aliens.every(a=>record(a.relationships)&&Object.entries(a.relationships).every(([id,v])=>alienIds.has(id)&&finite(v,0,100))&&['visits','exposures','stats'].every(k=>record(a[k])&&Object.values(a[k]).every(v=>finite(v,0,1e12)))&&(!a.carrying||['food','material'].includes(a.carrying.kind)&&finite(a.carrying.amount,0,1000))))return null;
  if(!Array.isArray(s.revealed)||s.revealed.length>220||!s.revealed.every(p=>point(p)&&finite(p.r,1,500))||!s.paths||Object.keys(s.paths).length>1800||!Object.entries(s.paths).every(([k,v])=>/^-?\d+,-?\d+$/.test(k)&&finite(v,0,1)))return null;
  if(!s.priorities||!['food','build','research','explore'].every(k=>count(s.priorities[k],2))||!record(s.metrics)||!['steps','completed','social','discoveries'].every(k=>finite(s.metrics[k],0,1e12)))return null;
  if(!['eventAt','arrivalAt','monolith','monolithProgress','eggStage','eggAt','nextId'].every(k=>finite(s[k],0,1e12)))return null;
  if(!Array.isArray(s.log)||s.log.length>80||!s.log.every(e=>typeof e.message==='string'&&typeof e.kind==='string'&&finite(e.time,0,1e12)&&finite(e.day,0,1e12)))return null;
  s.muted=s.muted!==false;s.speed=[0,1,2,4,8].includes(s.speed)?s.speed:0;
  // Names and rich display fields are text, never markup, including legacy saves.
  for(const a of s.aliens){for(const k of ['hunger','rest','social'])a.needs[k]=Math.min(100,a.needs[k]);a.name=a.name.replace(/[<>"'&]/g,'').slice(0,32);a.traits=a.traits.map(t=>t.replace(/[<>"'&]/g,'').slice(0,30));a.visualTraits=a.visualTraits.filter(t=>['water','tech','crystal','fungal'].includes(t));}
  const raw=s.frontier;delete s.frontier;const f=initFrontier(s);
  if(raw?.version===1){
   f.mission=count(raw.mission,9)?raw.mission:0;f.stage=f.mission<3?1:f.mission<6?2:3;f.completed=f.mission===9;f.acknowledged=f.completed&&raw.acknowledged===true;
   for(const k of Object.keys(UPGRADES))f.upgrades[k]=count(raw.upgrades?.[k],2)?raw.upgrades[k]:0;
   for(const k of ['food','material'])f.deliveries[k]=finite(raw.deliveries?.[k],0,1e9)?raw.deliveries[k]:0;
   f.elapsed=finite(raw.elapsed,0,1e9)?raw.elapsed:0;f.nextEvent=finite(raw.nextEvent,f.elapsed,f.elapsed+200)?raw.nextEvent:f.elapsed+90;
   f.reliefAt=finite(raw.reliefAt,0,f.elapsed+60)?raw.reliefAt:0;f.eventSeed=count(raw.eventSeed,4294967295)?raw.eventSeed:f.eventSeed;f.calm=raw.calm===true;
   f.claimedDiscoveries=Array.isArray(raw.claimedDiscoveries)?[...new Set(raw.claimedDiscoveries.filter(id=>s.discoveries.some(d=>d.id===id)))]:[];
   const e=raw.event;if(e&&['solar','supply','malfunction','anomaly'].includes(e.kind)&&finite(e.start,0,f.elapsed+8)&&finite(e.end,f.elapsed,f.elapsed+30))f.event={kind:e.kind,start:e.start,end:e.end,applied:e.applied===true};
  }else f.claimedDiscoveries=s.discoveries.filter(d=>d.found).map(d=>d.id);
  return s;
 }catch{return null;}
}
