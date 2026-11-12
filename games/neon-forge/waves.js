// Lane pairs are close enough to switch with keyboard rotation, but separated
// enough to require deliberate aim. A full 3.2s beat separates each pair.
const TAU = Math.PI * 2;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const TYPES = ['spark', 'drifter', 'bulwark', 'splinter'];
const names = ['FIRST SPARK','DOUBLE BEAT','THE DRIFTERS','BREAK THE SHELL',
  'PRISM STORM','SPLINTER FIELD','CROSSCURRENT','CHAIN REACTION','THE OVERLOAD','THE FORGE HEART'];
const compositions = [
  ['spark'], ['spark','spark'], ['drifter','spark','drifter','drifter'],
  ['bulwark','spark','spark','bulwark'], ['spark','drifter','bulwark','drifter'],
  ['splinter','spark','drifter','spark'], ['drifter','bulwark','spark','splinter'],
  ['spark','spark','splinter','bulwark'], ['bulwark','drifter','splinter','spark'], ['spark']
];
const speeds = [32,38,40,42,46,46,50,54,58,48];

function author(number) {
  const spawns=[];
  const boss=number===10;
  const groups=boss?3:8;
  for(let i=0;i<groups;i++) {
    const at=i*(boss?9:3.2);
    const base=wrap(-Math.PI/2 + i*(number===7 ? (i%2?-1.45:1.45) : .83) + (number-1)*.24);
    const lanes=number===1||boss?1:2;
    for(let lane=0;lane<lanes;lane++) {
      const pattern=compositions[number-1];
      const speed=number===7 ? (i%2?54:46) : speeds[number-1];
      spawns.push({at,type:pattern[(i*lanes+lane)%pattern.length],angle:wrap(base+lane*.7),speed});
    }
  }
  return {number,name:names[number-1],spawns,maxTargets:boss?8:12,boss};
}
const authored=Array.from({length:10},(_,i)=>author(i+1));
// Freeze exported source data; getWave returns independent mutable snapshots.
export const WAVES=Object.freeze(authored.map(w=>Object.freeze({...w,
  spawns:Object.freeze(w.spawns.map(s=>Object.freeze(s)))})));
const copy = w => ({...w,spawns:w.spawns.map(s=>({...s}))});

function seeded(seed) {
  let state=seed>>>0;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
export function getWave(number,mode='endless',seed=1) {
  if(!Number.isSafeInteger(number)||number<1) return null;
  // Every legacy mode enters the same Endless progression.
  if(number%10===0)return {...copy(WAVES[9]),number};
  const rng=seeded((Number.isFinite(seed)?seed:1)^Math.imul(number,0x9e3779b1));
  const groups=Math.min(18,8+Math.floor(number/3));
  const speed=Math.min(78,50+Math.floor((number-1)/2));
  const beat=Math.max(2,2.8-(number-1)*.02);
  const spawns=[];
  let base=rng()*TAU-Math.PI;
  for(let i=0;i<groups;i++) {
    base=wrap(base+(rng()-.5)*3.4);
    for(let lane=0;lane<2;lane++) {
      // Introduce durability before fragmentation; never exceed a two-lane beat.
      const available=number<3?2:number<5?3:4;
      // One armored/fragmenting threat per pair keeps the capped late beat
      // serviceable by finite-speed keyboard rotation without healing grants.
      const previous=spawns.at(-1)?.type;
      const choices=lane===1&&(previous==='bulwark'||previous==='splinter')?2:available;
      spawns.push({at:i*beat,type:TYPES[Math.floor(rng()*choices)],angle:wrap(base+lane*.7),speed});
    }
  }
  return {number,name:`LEVEL ${number}`,spawns,maxTargets:16,boss:false};
}

export function isUpgradeWave(number,mode='endless') {
  if(!Number.isSafeInteger(number)||number<1) return false;
  return number%3===0;
}

export function validateWaves() {
  const errors=[];
  for(const w of WAVES) {
    const fail=message=>errors.push(`Wave ${w.number}: ${message}`);
    if(!w.name||w.spawns.length>24||w.maxTargets>12) fail('invalid metadata/cap');
    let last=-Infinity,burst=0,clock=0,angle=0;
    for(const s of w.spawns) {
      if(!TYPES.includes(s.type)||!Number.isFinite(s.angle)||!Number.isFinite(s.at)||s.at<0||s.at<last||s.speed<32||s.speed>64) fail('invalid spawn');
      if(s.at===last) burst++; else {if(s.at-last<.8) fail('beats too close');burst=1;}
      if(burst>2) fail('burst exceeds two lanes');
      // Conservative no-upgrade keyboard schedule, including another strike
      // for armor or fragments and full center-to-center angular travel.
      const entry=s.at+138/s.speed;
      clock=Math.max(entry,clock+Math.abs(wrap(s.angle-angle))/3.5);
      clock+=s.type==='bulwark'||s.type==='splinter'?.32:0;
      if(clock>=s.at+240/s.speed-.1) fail('keyboard deadline exceeded');
      clock+=.32;angle=s.angle;last=s.at;
    }
    if(!w.boss) {
      const end=Math.max(...w.spawns.map(s=>s.at+240/s.speed));
      if(last<21||end<25||end>60) fail('pacing outside bounds');
    }
  }
  return {ok:errors.length===0,errors};
}
