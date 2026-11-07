import test from 'node:test';import assert from 'node:assert/strict';
import {harness} from './harness.mjs';
import {CONFIG} from '../js/config.js';
import {flightCollision,cloneFlightSystem,stepFlight} from '../js/physics.js';
test('deliberate low-frequency steering reaches sector targets across five seeds and five difficulty levels',()=>{
 const results=[];
 for(const sector of [1,2,4,7,10])for(const seed of ['one','two','three','four','five']){
  const g=harness(seed);g.systemNumber=sector;g.loadSystem(sector);
  for(let i=0;i<120*120&&g.state==='playing';i++){
   if(i%30===0){
    let target=null,best=Infinity;for(const gem of g.system.gems){if(gem.collected)continue;const d=Math.hypot(gem.x-g.comet.x,gem.y-g.comet.y);if(d<best){best=d;target=gem;}}
    const dx=target.x-g.comet.x,dy=target.y-g.comet.y,d=Math.hypot(dx,dy)||1;
    const desired=Math.min(75,Math.max(24,d));
    const ax=dx/d*desired-g.comet.vx,ay=dy/d*desired-g.comet.vy;
    Object.assign(g.input.keys,{left:ax<-5,right:ax>5,up:ay<-5,down:ay>5,brake:d<70&&g.comet.speed>85});
   }
   g._updatePlaying(CONFIG.PHYSICS_DT);
  }
  results.push({sector,seed,seconds:+g.stats.timeSurvived.toFixed(2),gems:g.sectorGems,ice:g.comet.ice});
  assert.equal(g.state,'sector-complete',JSON.stringify(results.at(-1)));
 }
 console.log('REACHABILITY '+JSON.stringify(results));
});
test('every essential gem is outside the complete moving-hazard envelope',()=>{
 for(let n=1;n<=10;n++){
  const g=harness('clearance-'+n);g.systemNumber=n;g.loadSystem(n);
  const planets=g.system.planets.map(p=>p.orbitRadius+p.radius+Math.max(0,...p.moons.map(m=>m.orbitRadius+m.radius)));
  const belts=g.system.belts.map(b=>Math.max(...b.asteroids.map(a=>a.radial+a.radius)));
  const outer=Math.max(g.system.star.radius,...planets,...belts);
  for(const gem of g.system.gems)assert.ok(Math.hypot(gem.x,gem.y)>outer+gem.radius+9);
 }
});
