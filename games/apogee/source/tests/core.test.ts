import test from 'node:test';
import assert from 'node:assert/strict';
import { Flight, grade } from '../src/simulation.js';
import { defaults, sanitize, finishRun, buy, cost } from '../src/progression.js';

test('visible timing windows grade early, good, great, perfect and critical',()=>{
 assert.equal(grade(.5,0),'EARLY'); assert.equal(grade(.2,0),'GOOD'); assert.equal(grade(.07,0),'GREAT'); assert.equal(grade(.02,0),'PERFECT'); assert.equal(grade(-.02,0),'CRITICAL');
});
test('early staging discards unburned fuel; perfect grants a larger impulse',()=>{
 const a=new Flight(defaults().upgrades,()=>.5), b=new Flight(defaults().upgrades,()=>.5);
 a.start(); b.start(); a.step(.1); b.step(.1); const mass=a.mass; a.separate(); b.fuelFraction=.02; b.separate();
 assert.equal(a.stage,1); assert.ok(a.mass<mass); assert.ok(b.velocity>a.velocity); assert.equal(b.grades.PERFECT,1);
});
test('unseparated booster explodes after grace interval',()=>{
 const f=new Flight(defaults().upgrades,()=>.5); f.start(); for(let i=0;i<2000&&f.phase==='burn';i++)f.step(1/60);
 assert.equal(f.phase,'failed');
});
test('last stage automatically coasts and reaches an actual maximum',()=>{
 const f=new Flight(defaults().upgrades,()=>.5); f.start(); let coast=false, peak=0;
 for(let i=0;i<18000&&!['apogee','failed'].includes(f.phase);i++){
 if(f.phase==='burn'&&f.stage<f.stages.length-1&&f.fuelFraction<.025)f.separate();
 f.step(1/60); if(f.phase==='coast'){coast=true;peak=Math.max(peak,f.altitude);}
 }
 assert.ok(coast); assert.equal(f.phase,'apogee'); assert.ok(f.altitude>=peak); assert.equal(f.velocity,0); assert.ok(f.elapsed>20&&f.elapsed<50,`duration ${f.elapsed}`);
});
test('invalid saves recover and numeric values are bounded',()=>{
 const s=sanitize({rp:-10,best:Infinity,upgrades:{engine:999,fuel:'oops'},settings:{sfx:'yes'}});
 assert.equal(s.rp,0); assert.equal(s.best,0); assert.equal(s.upgrades.engine,40); assert.equal(s.upgrades.fuel,0); assert.equal(s.settings.sfx,true);
 assert.deepEqual(sanitize(null),defaults());
});
test('flight awards research, records, achievements and affordable purchases',()=>{
 const s=defaults(); const f=new Flight(s.upgrades,()=>.5); f.elapsed=30; f.altitude=105000; f.highestVelocity=2000; f.grades.PERFECT=2;
 const reward=finishRun(s,f); assert.ok(reward.rp>0); assert.ok(reward.record); assert.equal(s.best,105000); assert.ok(s.achievements.includes(100));
 s.rp=cost('engine',0); assert.ok(buy(s,'engine')); assert.equal(s.upgrades.engine,1); assert.equal(s.rp,0); assert.equal(buy(s,'engine'),false);
});
test('late-game builds reach apogee within ninety seconds and fuel improves range',()=>{
 for(const level of [5,15,40]){const u=defaults().upgrades;for(const k of Object.keys(u) as (keyof typeof u)[])u[k]=k==='staging'?Math.min(5,level):level;const f=new Flight(u,()=>.5);f.start();for(let i=0;i<6000&&!['apogee','failed'].includes(f.phase);i++){if(f.phase==='burn'&&f.stage<f.stages.length-1&&f.fuelFraction<.02)f.separate();f.step(1/60);}assert.equal(f.phase,'apogee');assert.ok(f.elapsed<90,`level ${level}: ${f.elapsed}`);}
 const peaks=[0,1,5].map(level=>{const u=defaults().upgrades;u.fuel=level;const f=new Flight(u,()=>.5);f.start();for(let i=0;i<6000&&!['apogee','failed'].includes(f.phase);i++){if(f.phase==='burn'&&f.stage<f.stages.length-1&&f.fuelFraction<.02)f.separate();f.step(1/60);}return f.altitude;});assert.ok(peaks[1]>peaks[0]);assert.ok(peaks[2]>peaks[1]);
});
test('aborting before ignition grants no research or records',()=>{
 const s=defaults();const f=new Flight(s.upgrades,()=>.5);f.phase='failed';const before=JSON.stringify(s);assert.deepEqual(finishRun(s,f),{rp:0,record:false});assert.equal(JSON.stringify(s),before);
});
