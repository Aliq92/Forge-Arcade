import test from 'node:test';import assert from 'node:assert/strict';
import {makeGame} from './harness.mjs';
test('every completion triggers bounded two-second confetti spread across the full view',()=>{
 const {game:g}=makeGame(15);g._completeRoom();
 assert.ok(g.confetti.count>=80&&g.confetti.count<=160);assert.ok(g.confetti.time>=1.5&&g.confetti.time<=2.5);
 const points=g.confetti.particles.slice(0,g.confetti.count);
 assert.ok(Math.min(...points.map(p=>p.x))<80&&Math.max(...points.map(p=>p.x))>880);
 assert.ok(Math.min(...points.map(p=>p.y))<80&&Math.max(...points.map(p=>p.y))>460);
 const serial=g.confetti.serial;g._completeRoom();assert.equal(g.confetti.serial,serial);
 for(let i=0;i<60;i++)g.update(.05);assert.equal(g.confetti.time,0);
});
test('reduced motion uses sparse static confetti with the same bounded lifetime',()=>{
 const {game:g}=makeGame(19);g.settings.reducedMotion=true;g._completeRoom();assert.ok(g.confetti.count<=16);
 const before=g.confetti.particles.slice(0,g.confetti.count).map(p=>[p.x,p.y]);g.update(.05);
 assert.deepEqual(g.confetti.particles.slice(0,g.confetti.count).map(p=>[p.x,p.y]),before);
});
test('repeated materialization bursts never grow beyond the effect pool capacity',()=>{
 const {game:g}=makeGame(3);for(let i=0;i<50;i++)g._spawnMaterializeBurst(g.levelDef.spawn);
 assert.ok(g.particles.active.length<=180);g.particles.update(2);assert.equal(g.particles.active.length,0);
});
