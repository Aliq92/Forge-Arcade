const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../challenges.js');
test('twelve distinct missions in three tiers',()=>{
 assert.equal(C.challenges.length,12); assert.equal(new Set(C.challenges.map(c=>c.name)).size,12);
 for(let tier=1;tier<=3;tier++) assert.equal(C.challenges.filter(c=>c.tier===tier).length,4);
});
for(let i=0;i<12;i++) test(`course ${i+1}: start, achievable path, objectives, timing, rewards once`,()=>{
 const c=C.challenges[i]; assert.ok(c); assert.equal(c.route[0].time,5);
 assert.ok(c.goal.gates<=c.route.filter(o=>o.kind==='gate').length);
 assert.ok(c.goal.cubes<=c.route.filter(o=>o.kind==='cube').length);
 let last={x:0,y:0,time:0};
 for(const o of c.route){assert.ok(Math.abs(o.x)<=4 && Math.abs(o.y)<=3);assert.ok(o.time-last.time>=3);
 assert.ok(Math.hypot(o.x-last.x,o.y-last.y)/(o.time-last.time)<3);last=o;}
 for(const h of c.hazards){assert.ok(h.time-h.warning>=3);assert.ok(h.safeX>=-3 && h.safeX<=3);
 assert.equal(C.hazardHit(h,h.safeX),false);assert.equal(C.hazardHit(h,h.safeX+3),true);
 const targets=[...c.route.map(o=>({...o})),...c.hazards.map(h=>({time:h.time,x:h.safeX,y:0}))].sort((a,b)=>a.time-b.time);
 let p={x:0,y:0,time:0};for(const t of targets){assert.ok(Math.hypot(t.x-p.x,t.y-p.y)/(t.time-p.time)<3,'safe route within keyboard rate');p=t;}}
 assert.equal(C.outcome(c,{elapsed:0,gates:0,cubes:0}), 'playing');
 assert.equal(C.outcome(c,{elapsed:c.duration,gates:0,cubes:0}), 'failed');
 assert.equal(C.outcome(c,{elapsed:c.duration,gates:c.goal.gates,cubes:c.goal.cubes}), 'complete');
 const save={};assert.equal(C.award(save,c.id,false),true);assert.equal(C.award(save,c.id,false),false);
 assert.equal(C.award(save,c.id,true),false);assert.equal(save[c.id].precision,true);
});
test('distance integrates original sector speed',()=>{assert.equal(C.distanceAt(0),0);assert.ok(Math.abs(C.distanceAt(18)-342)<1e-8);assert.ok(C.distanceAt(40)>C.distanceAt(20));});
test('bad saves are contained and unknown fields do not unlock missions',()=>{for(const v of ['{','null','[]','42'])assert.deepEqual(C.readSave(v),{});assert.deepEqual(C.readSave('{"bogus":{"medal":true}}'),{});});
test('hazard warning boundaries and optional precision',()=>{const h={time:10,warning:7,safeX:0};assert.equal(C.eventPhase(h,6.99),'dormant');assert.equal(C.eventPhase(h,7),'warning');assert.equal(C.eventPhase(h,10),'surge');assert.equal(C.eventPhase(h,11),'clear');assert.equal(C.hazardHit(h,2),false);assert.equal(C.hazardHit(h,2.01),true);});
