import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, normalizeConfig, EXPERIMENTS, PARAMETERS } from '../labs/gravity.js';

const G = 6.67430e-11;
function near(actual, expected, tolerance) { assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} expected ${expected} ±${tolerance}`); }
function body(id,mass,x,y=0,vx=0,vy=0,radius=1) { return {id,name:id,type:'asteroid',mass,x,y,vx,vy,radius,color:'#aabbcc'}; }
function run(model,seconds) { for(let i=0,n=Math.ceil(seconds/model.dt);i<n && model.valid && !model.complete;i++) model.step(); return model; }

test('Newtonian pair accelerations are inverse-square, opposite force and independent of labels',()=>{
  const bodies=[body('a',2e12,-1000),body('b',3e12,1000)];
  const m=createModel('free',{bodies});
  near(m.state.bodies[0].ax,G*3e12/4e6,1e-14);
  near(m.state.bodies[1].ax,-G*2e12/4e6,1e-14);
  near(2e12*m.state.bodies[0].ax+3e12*m.state.bodies[1].ax,0,1e-6);
  const relabel=createModel('free',{bodies:bodies.map(b=>({...b,type:'star'}))});
  assert.deepEqual(m.state.bodies.map(b=>b.ax),relabel.state.bodies.map(b=>b.ax));
});

test('all guided configurations initialize measured state, safe ellipse, metadata and deep snapshots',()=>{
  assert.deepEqual(EXPERIMENTS.map(e=>e.id),['G1','G2','G3','G4']);
  for(const e of EXPERIMENTS) {
    const m=createModel(e.mode,e.defaults); assert.equal(m.valid,true); assert.ok(m.state.bodies.length>=2);
    assert.ok(Object.keys(PARAMETERS[e.mode]).length>0); assert.equal(m.measure().time,0);
    const s=m.snapshot(); s.bodies[0].mass=3; assert.notEqual(m.state.bodies[0].mass,3);
    m.step(); assert.ok(m.time>0); assert.equal(m.measure().time,m.time);
  }
  const e=createModel('elliptical'); const q=(.8**2/(2-.8**2))*2e7;
  assert.ok(q>e.state.bodies[0].radius+e.state.bodies[1].radius);
});

test('invalid, unsafe, nonfinite and excessive configurations are rejected without throwing in normalize',()=>{
  for(const [mode,params] of [['constructor',{}],['free',null],['free',{gFactor:NaN}],['circular',{velocityFactor:'1'}],['fall',{height:-1}],['free',{surprise:2}],['free',{bodies:[]}],['free',{bodies:Array.from({length:13},(_,i)=>body('a'+i,1,i*10))}],['free',{bodies:[body('__proto__',1,0)]}],['free',{bodies:[body('x',1,0),body('x',1,20)]}],['free',{bodies:[body('x',1,0),body('y',1,0)]}],['free',{bodies:[body('x',1e32,0),body('y',1e32,1e-300)]}]]) {
    assert.equal(normalizeConfig(mode,params).ok,false,`${mode} ${JSON.stringify(params)}`);
    assert.throws(()=>createModel(mode,params),Error);
  }
});

test('near-surface free fall follows inverse-square energy and terminates at physical contact',()=>{
  const m=createModel('fall'); const initial=m.measure();
  near(initial.acceleration,G*5.972e24/(6.372e6**2),1e-12);
  run(m,4); assert.ok(m.measure().acceleration>initial.acceleration);
  const r=m.measure().radius;
  const expected=Math.sqrt(2*G*(5.972e24+1)*(1/r-1/6.372e6));
  near(m.measure().speed,expected,1e-6);
  run(m,30); assert.equal(m.complete,true); assert.equal(m.valid,true); assert.ok(m.time<15);
  assert.ok(m.measure().radius>=6.371e6); assert.ok(m.measure().radius<6.371e6+2);
  const sweep=createModel('fall');let maxSpeedError=0,maxEnergy=0;
  while(!sweep.complete){sweep.step();const v=sweep.measure();const expected=Math.sqrt(2*G*(5.972e24+1)*(1/v.radius-1/6.372e6));maxSpeedError=Math.max(maxSpeedError,Math.abs(v.speed-expected));maxEnergy=Math.max(maxEnergy,Math.abs(v.energyDrift));}
  assert.ok(maxSpeedError<1e-6); assert.ok(maxEnergy<1e-12);
  console.log('GRAVITY fall errors',JSON.stringify({time:sweep.time,radius:sweep.measure().radius,speed:sweep.measure().speed,maxSpeedError,maxEnergy}));
});

test('circular orbit conserves energy, angular momentum, center of mass over ten periods',()=>{
  const m=createModel('circular'); const initial=m.measure(); const period=m.theory.orbitalPeriod;
  let maxR=0,maxE=0,maxL=0,maxCOM=0;
  for(let i=0,n=Math.ceil(10*period/m.dt);i<n;i++) {
    m.step(); const v=m.measure();
    maxR=Math.max(maxR,Math.abs(v.radius/initial.radius-1)); maxE=Math.max(maxE,Math.abs(v.energyDrift));
    maxL=Math.max(maxL,Math.abs(v.angularMomentum/initial.angularMomentum-1)); maxCOM=Math.max(maxCOM,Math.hypot(v.comX,v.comY));
  }
  console.log('GRAVITY circular max errors',JSON.stringify({maxR,maxE,maxL,maxCOM}));
  assert.ok(m.valid); assert.ok(maxR<7e-7); assert.ok(maxE<3e-12); assert.ok(maxL<2e-13); assert.ok(maxCOM<1e-20);
});

test('ellipse reaches analytical apses with bounded energy error and timestep convergence',()=>{
  function assess(dt) {
    const m=createModel('elliptical'); const r0=m.measure().radius,mu=G*(5.972e24+1000);
    const a=r0/(2-.8**2),period=2*Math.PI*Math.sqrt(a**3/mu),q=a*(1-(1-.8**2));
    let minR=r0,maxE=0;
    for(let i=0,n=Math.ceil(period/dt);i<n;i++) {m.step(dt);minR=Math.min(minR,m.measure().radius);maxE=Math.max(maxE,Math.abs(m.measure().energyDrift));}
    return {error:Math.abs(minR-q)/q,maxE};
  }
  const coarse=assess(5),fine=assess(2.5);
  console.log('GRAVITY ellipse max errors',JSON.stringify({coarse,fine}));
  // The minimum of discrete radius samples includes apsis sampling error.
  assert.ok(coarse.error<3e-6); assert.ok(coarse.maxE<6e-6); assert.ok(fine.maxE<coarse.maxE*.3);
});

test('gravity challenge references are achievable and wrong configurations remain distinguishable',()=>{
  const stable=createModel('circular',{velocityFactor:1}); let maxDeviation=0;
  for(let i=0;i<1200;i++){stable.step();maxDeviation=Math.max(maxDeviation,Math.abs(stable.measure().radius/stable.state.initialSeparation-1));}
  assert.ok(maxDeviation<.05); assert.equal(stable.time,6000);
  const escape=createModel('circular',{velocityFactor:1.6});
  while(escape.time<20000 && escape.measure().radius<1.4*escape.state.initialSeparation)escape.step();
  assert.ok(escape.measure().specificEnergy>0);assert.ok(escape.measure().radialVelocity>0);assert.ok(escape.measure().radius>=1.4*escape.state.initialSeparation);
  const transfer=createModel('circular',{velocityFactor:1.1});let ratio=1;
  for(let i=0;i<5000;i++){transfer.step();ratio=Math.max(ratio,transfer.measure().radius/transfer.state.initialSeparation);}
  assert.ok(ratio>=1.45 && ratio<=1.55); assert.ok(transfer.measure().specificEnergy<0);
  assert.ok(stable.measure().specificEnergy<0); assert.ok(maxDeviation<.4);
  console.log('GRAVITY challenge references',JSON.stringify({stableMaxDeviation:maxDeviation,escapeTime:escape.time,escape:escape.measure(),transferMaxRatio:ratio}));
});

test('three-body replay is deterministic with conserved barycenter',()=>{
  const a=run(createModel('threebody'),10000),b=run(createModel('threebody'),10000);
  assert.deepEqual(a.snapshot(),b.snapshot()); assert.ok(a.valid);
  assert.ok(Math.hypot(a.measure().comX,a.measure().comY)<1e-8);
  assert.ok(Math.abs(a.measure().energyDrift)<1e-5);
  const sweep=createModel('threebody');const initialL=sweep.measure().angularMomentum;let maxEnergy=0,maxCOM=0,maxAngular=0;
  for(let i=0;i<2000;i++){sweep.step();const v=sweep.measure();maxEnergy=Math.max(maxEnergy,Math.abs(v.energyDrift));maxCOM=Math.max(maxCOM,Math.hypot(v.comX,v.comY));maxAngular=Math.max(maxAngular,Math.abs(v.angularMomentum/initialL-1));}
  console.log('GRAVITY threebody errors',JSON.stringify({maxEnergy,maxCOM,maxAngular}));
});

test('merger conserves mass/momentum, combines volume and accounts energy discontinuity separately',()=>{
  const m=createModel('free',{merge:true,bodies:[body('a',1e6,-3,0,1,0,2),body('b',2e6,3,0,-.5,0,2)]});
  const initial=m.measure(); run(m,5);
  assert.equal(m.state.bodies.length,1);assert.equal(m.state.merges,1);
  const merged=m.state.bodies[0];assert.equal(merged.mass,3e6);near(merged.vx,0,1e-14);near(merged.radius,Math.cbrt(16),1e-14);
  assert.ok(m.measure().mergeKineticLoss>0); assert.notEqual(m.measure().mergeEnergyChange,0);
  near(m.measure().totalEnergy-initial.totalEnergy-m.measure().mergeEnergyChange,m.measure().energyDrift*Math.abs(initial.totalEnergy),1e-8);
  assert.equal(m.measure().radius,null);
});

test('close encounters refine or pause with an understandable warning and finite state',()=>{
  const m=createModel('free',{bodies:[body('a',1e32,0),body('b',1,10)]});
  m.step(); assert.equal(m.valid,false);assert.ok(m.warnings.length);assert.equal(m.time,0);
  assert.ok(m.state.bodies.every(b=>[b.x,b.y,b.vx,b.vy,b.ax,b.ay].every(Number.isFinite)));
  const a=createModel('circular');assert.throws(()=>a.step(Infinity));assert.equal(a.time,0);
});

test('high-speed bodies cannot tunnel through each other and chain merges keep state finite',()=>{
  const fast=createModel('free',{bodies:[body('a',1e3,-100,0,100,0,5),body('b',1e3,100,0,-100,0,5)]});
  fast.step();assert.ok(fast.valid);assert.equal(fast.state.merges,1);assert.ok(fast.warnings.length);
  const chain=createModel('free',{bodies:[body('a',1e3,-3,0,0,0,4),body('b',1e3,3,0,0,0,4),body('c',1e3,0,0,0,0,1)]});
  assert.equal(chain.state.bodies.length,1);assert.equal(chain.state.merges,2);
  assert.ok(Object.values(chain.measure()).every(v=>v===null || Number.isFinite(v)));
});

test('nonmerging contact stops at finite contact and zero-total-energy drift is finite',()=>{
  const m=createModel('free',{merge:false,bodies:[body('a',1e3,-100,0,100,0,5),body('b',1e3,100,0,-100,0,5)]});
  m.step();assert.ok(m.complete);assert.equal(m.state.merges,0);near(m.measure().radius,10,1e-10);
  const p=createModel('free',{bodies:[body('a',1e3,0,0,1,2)]});p.step();
  near(p.state.bodies[0].x,5,1e-14);near(p.state.bodies[0].y,10,1e-14);assert.equal(p.measure().energyDrift,0);
});
