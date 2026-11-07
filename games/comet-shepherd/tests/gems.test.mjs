import test from 'node:test';import assert from 'node:assert/strict';
import * as gems from '../js/gems.js';
import {generateSystem} from '../js/systemGenerator.js';
import {stepFlight} from '../js/physics.js';
import {CONFIG} from '../js/config.js';
test('seeded sectors provide distinct safe gems and a first-sector coast route reaches eight',()=>{
 for(const seed of ['one','two','three','four','five']){
  const s=generateSystem(1,seed),again=generateSystem(1,seed);
  assert.deepEqual(s.gems,again.gems);assert.equal(new Set(s.gems.map(g=>g.id)).size,s.gems.length);
  assert.ok(s.gems.length>=10);
  const outer=Math.max(...s.planets.map(p=>p.orbitRadius+p.radius));
  assert.ok(s.gems.every(g=>Math.hypot(g.x,g.y)>outer+50));
  const c={...s.spawn,vx:s.vel.x,vy:s.vel.y,radius:9};let count=0;
  for(let i=0;i<2400;i++){stepFlight(c,s,CONFIG.PHYSICS_DT);gems.collectGems(s.gems,c,()=>count++);}
  assert.ok(count>=8,`${seed}: ${count} reachable`);
 }
});
test('swept gem overlap awards each gem once and exact type scores',()=>{
 const list=Object.keys(gems.GEM_TYPES).map((type,i)=>({id:i,type,x:i*30,y:0,radius:11,collected:false}));
 const c={previousX:-50,previousY:0,x:150,y:0,radius:9};let score=0,count=0;
 const collect=g=>{score+=gems.GEM_TYPES[g.type].points;count++;};
 gems.collectGems(list,c,collect);gems.collectGems(list,c,collect);
 assert.equal(score,90);assert.equal(count,3);assert.ok(list.every(g=>g.collected));
});
