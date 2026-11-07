import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let E;try{E=require('../games/the-last-lighthouse/simulation.js');}catch{E={};}
const run=(sim,seconds,input={})=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60,input);};
const fresh=()=>new E.Simulation();
const one=()=>{const s=fresh();run(s,2.1);s.spawnTimer=999;return [s,s.ships[0]];};

test('beam rotation respects angular speed, shortest wrap, and turn input',()=>{
 assert.equal(typeof E.Simulation,'function');
 const s=fresh();s.beamAngle=0;run(s,1,{turn:1});assert.ok(Math.abs(s.beamAngle-115*Math.PI/180)<1e-8);
 s.beamAngle=Math.PI-.01;s.step(1/60,{aim:-Math.PI+.01});assert.ok(Math.abs(E.angleDifference(s.beamAngle,-Math.PI+.01))<1e-8);
 assert.ok(Math.abs(E.angleDifference(-Math.PI+.1,Math.PI-.1)-.2)<1e-8);
});
test('beam cone checks direction, half width, range, and active state',()=>{
 const s=fresh();s.beamAngle=0;const p=E.WORLD.lighthouse;
 assert.equal(E.beamContains(s,p.x+100,p.y),true);assert.equal(E.beamContains(s,p.x-100,p.y),false);
 assert.equal(E.beamContains(s,p.x+800,p.y),false);assert.equal(E.beamContains(s,p.x+100,p.y+60),false);
 s.toggleBeam();assert.equal(E.beamContains(s,p.x+100,p.y),false);
});
test('active energy drains at eight per second, inactive energy recharges at fourteen',()=>{
 const s=fresh();run(s,1);assert.ok(Math.abs(s.energy-92)<1e-7);s.toggleBeam();run(s,.5);assert.ok(Math.abs(s.energy-99)<1e-7);run(s,1);assert.equal(s.energy,100);
});
test('exhaustion locks beam off until threshold, readiness never auto enables it',()=>{
 const s=fresh();run(s,12.6);assert.equal(s.beamOn,false);assert.equal(s.beamLocked,true);assert.equal(s.toggleBeam(),false);assert.ok(s.events.some(e=>e.type==='exhausted'));
 run(s,1.3);assert.equal(s.beamLocked,false);assert.equal(s.beamOn,false);assert.ok(s.events.some(e=>e.type==='ready'));assert.equal(s.toggleBeam(),true);assert.equal(s.beamOn,true);
});
test('real illumination increases confidence and retained guidance fades gradually',()=>{
 const [s,ship]=one();s.beamAngle=Math.atan2(ship.y-E.WORLD.lighthouse.y,ship.x-E.WORLD.lighthouse.x);s.beamOn=true;
 run(s,2,{aim:s.beamAngle});assert.equal(ship.illuminated,true);assert.ok(ship.confidence>.35);const before=ship.confidence;
 s.toggleBeam();run(s,1);assert.equal(ship.illuminated,false);assert.ok(ship.confidence<before&&ship.confidence>before-.05);
});
test('sailing vessels feel stronger currents than cargo and currents vary with storm',()=>{
 const [s,ship]=one();const c=E.WORLD.currents[0];ship.x=c.x;ship.y=c.y;
 ship.type='sail';ship.confidence=0;ship.angle=0;ship.vx=E.SHIP_TYPES.sail.speed;ship.vy=0;s.beamOn=false;s.step(1/60);const sail=Math.abs(ship.currentY);
 ship.type='cargo';ship.x=c.x;ship.y=c.y;s.step(1/60);assert.ok(sail>Math.abs(ship.currentY));
 const early=s.storm;run(s,20);assert.ok(s.storm>early);
});
test('reef collision counts one loss, removes ship, and emits location',()=>{
 const [s,ship]=one(),reef=E.WORLD.reefs[0];ship.x=reef.x;ship.y=reef.y;s.step(1/60);
 assert.equal(s.lost,1);assert.equal(s.ships.length,0);assert.ok(s.events.some(e=>e.type==='loss'&&e.id===ship.id&&Number.isFinite(e.x)));
});
test('swept collision catches a small hazard even when endpoint is past it',()=>{
 const [s,ship]=one(),rock=E.WORLD.rocks[0];ship.x=rock.x-50;ship.y=rock.y;ship.angle=0;ship.vx=6000;ship.vy=0;ship.speed=6000;ship.type='cargo';s.beamOn=false;
 s.step(1/60);assert.equal(s.lost,1);
});
test('collision circles include ship radius and distinguish just-outside tangents',()=>{
 for(const [offset,loss]of [[-.1,1],[.1,0]]){
  const [s,ship]=one(),rock=E.WORLD.rocks[0];ship.x=rock.x;ship.y=rock.y+rock.r+ship.radius+offset;ship.speed=0;ship.vx=0;ship.vy=0;s.beamOn=false;s.step(1/60);assert.equal(s.lost,loss);
 }
});
test('safe harbor arrival rescues instead of losing and removes vessel',()=>{
 const [s,ship]=one();ship.x=E.WORLD.harbor.x;ship.y=E.WORLD.harbor.y;s.step(1/60);
 assert.equal(s.rescued,1);assert.equal(s.lost,0);assert.equal(s.ships.length,0);assert.ok(s.events.some(e=>e.type==='rescue'));
});
test('fast swept harbor entry rescues without needing an endpoint inside the harbor',()=>{
 const [s,ship]=one();ship.x=E.WORLD.harbor.x-50;ship.y=E.WORLD.harbor.y;ship.vx=6000;ship.vy=0;ship.speed=6000;ship.angle=0;s.beamOn=false;s.step(1/60);assert.equal(s.rescued,1);assert.equal(s.lost,0);
});
test('fishing boats correct course and gain confidence faster than cargo ships',()=>{
 const observed={};
 for(const type of ['fishing','cargo']){
  const [s,ship]=one();ship.type=type;ship.angle=-1;ship.confidence=0;s.beamAngle=Math.atan2(ship.y-E.WORLD.lighthouse.y,ship.x-E.WORLD.lighthouse.x);run(s,2,{aim:s.beamAngle});observed[type]={confidence:ship.confidence,turn:Math.abs(E.angleDifference(ship.angle,-1))};
 }
 assert.ok(observed.fishing.confidence>observed.cargo.confidence);assert.ok(observed.fishing.turn>observed.cargo.turn*2);
});
test('predetermined corridors spawn outside danger with bounded manageable population',()=>{
 const s=fresh();run(s,2.1);assert.equal(s.ships.length,1);const ship=s.ships[0];assert.equal(ship.type,'fishing');assert.equal(ship.warning,false);assert.ok(ship.age<1);
 for(const h of [...E.WORLD.reefs,...E.WORLD.rocks,E.WORLD.island])assert.ok(Math.hypot(ship.x-h.x,ship.y-h.y)>h.r+ship.radius+80);
 assert.ok(s.events.some(e=>e.type==='spawn'));assert.ok(E.CONFIG.maxShips<=4);
});
test('twelve safe arrivals cause victory and stop subsequent simulation',()=>{
 const [s,ship]=one();s.rescued=11;ship.x=E.WORLD.harbor.x;ship.y=E.WORLD.harbor.y;s.step(1/60);assert.equal(s.state,'VICTORY');assert.ok(s.events.some(e=>e.type==='victory'));
 const before=s.snapshot();run(s,2,{turn:1});assert.deepEqual(s.snapshot(),before);
});
test('third loss causes game over and never double counts the same ship',()=>{
 const [s,ship]=one();s.lost=2;ship.x=-20;ship.y=100;s.step(1/60);assert.equal(s.state,'GAME_OVER');assert.equal(s.lost,3);assert.ok(s.events.some(e=>e.type==='gameover'));run(s,1);assert.equal(s.lost,3);
});
test('pause freezes ships, energy, weather, spawn timer, and input',()=>{
 const [s]=one();s.pause();const before=s.snapshot();run(s,10,{turn:1});assert.equal(s.toggleBeam(),false);assert.deepEqual(s.snapshot(),before);s.resume();s.step(1/60);assert.equal(s.state,'PLAYING');assert.ok(s.time>before.time);
});
test('restart restores original seed and every field after a partial run',()=>{
 const s=new E.Simulation(29),original=s.snapshot();run(s,8,{turn:.3});s.pause();s.restart();assert.deepEqual(s.snapshot(),original);
});
test('fixed steps reproduce seeded runs and ignore invalid time or enormous wall clock gaps',()=>{
 const a=new E.Simulation(441),b=new E.Simulation(441),other=new E.Simulation(442);
 for(let i=0;i<300;i++){a.step(1/30,{turn:.2});b.step(1/60,{turn:.2});b.step(1/60,{turn:.2});other.step(1/30,{turn:.2});}
 assert.deepEqual(a.snapshot(),b.snapshot());assert.notDeepEqual(a.snapshot(),other.snapshot());const before=a.time;a.step(100);assert.ok(a.time-before<=.251);a.step(NaN);a.step(-1);assert.ok(Number.isFinite(a.time));
});
test('idle play loses eventually, but no vessel is lost immediately after spawning',()=>{
 const s=fresh(),born=new Map();let minimum=Infinity;
 for(let i=0;i<60*240&&s.state==='PLAYING';i++){s.step(1/60);for(const e of s.events.splice(0)){if(e.type==='spawn')born.set(e.id,s.time);if(e.type==='loss')minimum=Math.min(minimum,s.time-born.get(e.id));}}
 assert.equal(s.state,'GAME_OVER');assert.equal(s.lost,3);assert.ok(minimum>15,`earliest unguided loss ${minimum}`);
});
test('unguided encounters provide more than eight seconds of warning across five seeds',()=>{
 for(const seed of [71024,1,42,2026,99173]){
  const s=new E.Simulation(seed),born=new Map(),warned=new Map();s.toggleBeam();
  while(s.state==='PLAYING'&&s.time<240){s.step(1/30);for(const e of s.events.splice(0)){
   if(e.type==='spawn')born.set(e.id,e.time);if(e.type==='warning'&&!warned.has(e.id))warned.set(e.id,e.time);
   if(e.type==='loss'){assert.ok(e.time-born.get(e.id)>15);assert.ok(e.time-(warned.get(e.id)??e.time)>8,`seed ${seed}, ${e.id} needs warning`);}
  }}assert.equal(s.state,'GAME_OVER');
 }
});
test('efficiency is bounded and counts useful illumination only',()=>{
 const s=fresh();assert.equal(s.efficiency,0);run(s,1);assert.equal(s.efficiency,0);run(s,4);assert.ok(s.efficiency>0&&s.efficiency<=100);
});
test('visible-information beam strategy wins default seed and four other seeds',()=>{
 const {driveWinningRun}=require('./the-last-lighthouse-balance.cjs');
 for(const seed of [71024,1,42,2026,99173]){const result=driveWinningRun(seed);assert.equal(result.state,'VICTORY',JSON.stringify(result));assert.equal(result.rescued,12);assert.ok(result.lost<3);assert.ok(result.time>=480&&result.time<=720);assert.ok(result.maxShips<=4);}
});
test('four simultaneous corridor entries remain winnable with real beam and energy rules',()=>{
 const {driveWinningRun}=require('./the-last-lighthouse-balance.cjs');const result=driveWinningRun(71024,{initialFleet:4});assert.equal(result.state,'VICTORY',JSON.stringify(result));assert.equal(result.rescued,12);assert.equal(result.lost,0);assert.equal(result.maxShips,4);
});
test('a keeper deciding only once per second can win without rapid input precision',()=>{
 const {driveWinningRun}=require('./the-last-lighthouse-balance.cjs');const result=driveWinningRun(71024,{decisionInterval:1});assert.equal(result.state,'VICTORY',JSON.stringify(result));assert.equal(result.lost,0);
});
