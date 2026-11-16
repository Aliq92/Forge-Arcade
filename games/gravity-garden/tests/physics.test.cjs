const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../physics.js');
const well = { x: 0, y: 0, mass: 2, radius: 300 };
const p = { x: 100, y: 0, vx: 0, vy: 0 };
const mag = v => Math.hypot(v.x, v.y);
test('attraction, repulsion, range, and strength', () => {
  assert.ok(P.force({...well, type:'attractor'}, p, 0).x < 0);
  assert.ok(P.force({...well, type:'repulsor'}, p, 0).x > 0);
  assert.equal(mag(P.force({...well, radius:50}, p, 0)), 0);
  assert.ok(mag(P.force({...well, mass:3}, p, 0)) > mag(P.force({...well, mass:1}, p, 0)));
});
test('vortex and orbit respect direction and orbit corrects radial error', () => {
  for (const type of ['vortex','orbit']) {
    assert.ok(P.force({...well,type,direction:1,orbitRadius:100},p,0).y > 0);
    assert.ok(P.force({...well,type,direction:-1,orbitRadius:100},p,0).y < 0);
  }
  assert.ok(P.force({...well,type:'orbit',orbitRadius:50},p,0).x < 0);
  assert.ok(P.force({...well,type:'orbit',orbitRadius:150},p,0).x > 0);
});
test('pulse and chaos are deterministic and vary over time', () => {
  const pulse = {...well,type:'pulse',frequency:1};
  assert.ok(P.force(pulse,p,0).x < 0);
  assert.ok(P.force(pulse,p,0.5).x > 0);
  const chaos = {...well,type:'chaos',seed:42};
  assert.deepEqual(P.force(chaos,p,1),P.force(chaos,p,1));
  assert.notDeepEqual(P.force(chaos,p,1),P.force(chaos,p,2));
});
test('binary consists of two independent rotating centers with shared mass', () => {
  const w = {...well,type:'binary',separation:80,rotationRate:1};
  const centers = P.centers(w,0);
  assert.equal(centers.length,2);
  assert.equal(centers[0].mass + centers[1].mass,well.mass);
  assert.notDeepEqual(P.centers(w,0),P.centers(w,1));
  assert.ok(mag(P.force(w,p,0)) > 0);
});
test('combined forces are bounded and reuse output, including invalid input', () => {
  const out = {};
  assert.equal(P.combined(Array(100).fill({...well,type:'repulsor',mass:100}),p,0,out),out);
  assert.ok(mag(out) <= 2.5000001);
  for (const v of [P.force({...well,x:Infinity},p,0),P.force(well,{x:NaN,y:0},0),P.combined(null,p,0)]) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
  }
  assert.equal(mag(P.force({...well,enabled:false},p,0)),0);
});
test('orbit guidance remains bounded over a sustained simulation', () => {
  const w = {...well,type:'orbit',orbitRadius:100};
  const particle = {x:100,y:0,vx:0,vy:2};
  for (let i=0;i<3600;i++) {
    const f=P.force(w,particle,i/60);
    particle.vx+=f.x; particle.vy+=f.y;
    particle.x+=particle.vx; particle.y+=particle.vy;
    assert.ok(Number.isFinite(particle.x) && Math.hypot(particle.x,particle.y)<200);
  }
  assert.ok(Math.abs(Math.hypot(particle.x,particle.y)-100)<25);
});


test('orbit target stays strictly inside influence',()=>{const w={...well,type:'orbit',radius:60,orbitRadius:300};assert.equal(P.orbitRadius(w),45);assert.ok(P.force(w,{x:45,y:0,vx:0,vy:0},0).y>0);});
