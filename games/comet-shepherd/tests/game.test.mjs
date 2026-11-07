import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../js/game.js';import {Comet} from '../js/comet.js';import {CONFIG} from '../js/config.js';
import {computeTrajectory} from '../js/trajectory.js';
import {harness} from './harness.mjs';
test('all gameplay clocks, motion and collections agree at 30, 60 and 144 fps',()=>{
 const snapshots=[];
 for(const fps of [30,60,144]){
  const g=harness();for(let i=0;i<fps*6;i++)g._updatePlaying(1/fps);
  snapshots.push([g.comet.x,g.comet.y,g.comet.energy,g.comet.heat,g.stats.timeSurvived,g.sectorGems,g.stats.gemScore]);
 }
 for(const a of snapshots.slice(1))a.forEach((v,i)=>assert.ok(Math.abs(v-snapshots[0][i])<1e-7,`${i}: ${v} vs ${snapshots[0][i]}`));
});
test('holding a diagonal nudge remains frame-rate independent at 30, 60 and 144 fps',()=>{
 const values=[];for(const fps of [30,60,144]){const g=harness('held-fps');g.input.keys={right:true,up:true};for(let i=0;i<fps*3;i++)g._updatePlaying(1/fps);values.push([g.comet.x,g.comet.y,g.comet.energy,g.comet.vx,g.comet.vy]);}
 for(const v of values.slice(1))v.forEach((n,i)=>assert.ok(Math.abs(n-values[0][i])<1e-7));
});
test('gems finish the objective without chicken; continuing and upgrades retain earlier progress',()=>{
 const g=harness();
 for(let i=0;i<2400&&g.state==='playing';i++)g._updatePlaying(CONFIG.PHYSICS_DT);
 assert.equal(g.state,'sector-complete');assert.equal(g.sectorGems,8);assert.equal(g.stats.systemsCrossed,1);
 assert.equal(g.stats.chickens,0);assert.equal(g.stats.gemScore,120);
 g._completeSector();assert.equal(g.stats.systemsCrossed,1);
 g._pickUpgrade('GENTLE_TOUCH');assert.equal(g.systemNumber,2);assert.equal(g.sectorGems,0);assert.equal(g.stats.gemScore,120);
});
test('sector retry restores its entry checkpoint and preserves prior-sector earnings/upgrades',()=>{
 const g=harness();g.stats.gemScore=120;g.stats.systemsCrossed=1;g.systemNumber=2;g.upgradeState.GENTLE_TOUCH=1;g.loadSystem(2);
 const start={x:g.comet.x,y:g.comet.y,energy:g.comet.energy};
 g._onCollectGem(g.system.gems[0]);g.comet.energy=0;g.comet.x+=90;g.restartSector();
 assert.equal(g.stats.gemScore,120);assert.equal(g.stats.systemsCrossed,1);assert.equal(g.upgradeState.GENTLE_TOUCH,1);
 assert.equal(g.sectorGems,0);assert.equal(g.comet.x,start.x);assert.equal(g.comet.energy,start.energy);
 assert.equal(g.system.gems.some(gem=>gem.collected),false);
});
test('sector retry discards encounters and transient feedback from the failed attempt',()=>{
 const g=harness();g.assistTrack.set('p0',{entrySpeed:100,minDist:20});g.starTrack={entrySpeed:90,minDist:150};g.burstTrajectoryTimer=1;
 g.restartSector();assert.equal(g.assistTrack.size,0);assert.equal(g.starTrack,null);assert.equal(g.burstTrajectoryTimer,0);
});
test('pause freezes simulation and resume/restart discard stale partial time and queued controls',()=>{
 const g=harness();g.accumulator=.004;g._queuedInputEvents=[{type:'emergency'}];g.pause();
 const before=JSON.stringify(g.comet);g._updatePlaying(1);assert.equal(JSON.stringify(g.comet),before);
 g.resume();assert.equal(g.accumulator,0);assert.deepEqual(g._queuedInputEvents,[]);
 g._updatePlaying(2);assert.ok(g.stats.timeSurvived<=.051);
});
test('correction uses exactly the affordable preview impulse and never overspends energy',()=>{
 const c=new Comet(0,0,0,0);c.energy=4;
 const impulse=c.correctionImpulse(100,0,1);
 assert.ok(impulse.x>0&&impulse.x<CONFIG.CORRECTION_MAX_IMPULSE);
 c.applyCorrection(100,0,1);assert.equal(c.vx,impulse.x);assert.ok(c.energy>=0);
 const v=c.vx;assert.equal(c.applyCorrection(100,0,1),false);assert.equal(c.vx,v);
});
test('four-direction precision nudges and braking respond on a fixed tick',()=>{
 const g=harness(),vx=g.comet.vx,vy=g.comet.vy;
 g.input.keys.up=true;g._updatePlaying(CONFIG.PHYSICS_DT);assert.ok(g.comet.vy<vy-1);
 g.input.keys.up=false;g.input.keys.brake=true;g.comet.vx=100;g.comet.vy=0;g._updatePlaying(CONFIG.PHYSICS_DT);assert.ok(g.comet.vx<100);
});
test('held-steering forecast matches the full gameplay update with pending correction',()=>{
 for(const keys of [{up:true},{right:true,down:true},{brake:true}]){
  const g=harness('input-forecast');Object.assign(g.input.keys,keys);
  const pending=g.comet.correctionImpulse(80,-50,.35);
  const pts=computeTrajectory(g.comet,g.system,pending,1,keys);g.comet.applyCorrection(80,-50,.35);
  let step=0,maxError=0;
  for(const p of pts.slice(1)){
   while(step<p.step){g._updatePlaying(CONFIG.PHYSICS_DT);step++;}
   maxError=Math.max(maxError,Math.hypot(g.comet.x-p.x,g.comet.y-p.y));
  }
  assert.ok(maxError<1e-7,JSON.stringify({keys,maxError}));console.log('GAME FORECAST '+JSON.stringify({keys,maxError,samples:pts.length}));
 }
});
test('exploration gate preserves earned sector progress and the ten-sector milestone',()=>{
 const g=harness();g.sectorGems=8;g._completeSector();g.state='playing';
 let fade;g.ui.fadeToBlack=callback=>{fade=callback;};
 g._triggerGateReached();assert.equal(g.stats.systemsCrossed,1);assert.equal(g.state,'gate-transition');
 fade();assert.equal(g.state,'upgrade');
 g.systemNumber=10;g.sectorAwarded=true;g._offerSectorUpgrade();assert.equal(g.state,'milestone');assert.equal(g.milestoneShown,true);
 g._advanceAfterMilestone();assert.equal(g.state,'upgrade');g._pickUpgrade('LONGER_VISION');assert.equal(g.systemNumber,11);
});
