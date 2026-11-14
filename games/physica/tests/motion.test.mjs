import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, normalizeConfig, EXPERIMENTS } from '../labs/motion.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} vs ${b} (tol ${t})`);
function run(m,t=10){for(let i=0;i<Math.ceil(t/m.dt)&&!m.complete;i++)m.step();return m;}
test('projectile sampled trajectory and interpolated touchdown obey analytical solution',()=>{
 for(const angle of [15,45,75])for(const y0 of [0,3]){
  const m=createModel('projectile',{speed:10,angle,y0}); run(m,20);
  const v=10*Math.sin(angle*Math.PI/180), t=(v+Math.sqrt(v*v+19.62*y0))/9.81;
  near(m.measure().range,10*Math.cos(angle*Math.PI/180)*t,1e-8);
  near(m.measure().flightTime,t,1e-8);near(m.measure().maxHeight,y0+v*v/19.62,1e-8);
  assert.ok(m.state.landed);assert.ok(m.complete);near(m.measure().y,0);
 }
});
test('projectile linear drag lowers range and dissipates mechanical energy',()=>{
 const ideal=run(createModel('projectile')),drag=run(createModel('projectile',{drag:.3}));
 assert.ok(drag.measure().range<ideal.measure().range);assert.ok(drag.measure().dissipatedEnergy>0);
 near(drag.measure().totalEnergy+drag.measure().dissipatedEnergy,112.5,1e-7);
});
test('static friction holds, kinetic friction opposes reverse motion, incline vectors sum',()=>{
 const held=run(createModel('incline',{theta:10,muStatic:.3,muKinetic:.2}),2);near(held.measure().distance,0);
 const slide=createModel('incline',{theta:30,muStatic:.3,muKinetic:.2});slide.step();
 near(slide.measure().acceleration,9.81*(.5-.2*Math.cos(Math.PI/6)));
 const sum=slide.state.forces.filter(f=>f.label!=='Net').reduce((v,f)=>[v[0]+f.x,v[1]+f.y],[0,0]);
 near(Math.hypot(...sum),slide.measure().netForce);
 const uphill=createModel('incline',{theta:0,initialSpeed:-5,muStatic:.3,muKinetic:.2});uphill.step();assert.ok(uphill.measure().vx>-5);
});
test('C5 friction stops without reversal at independently derived distance',()=>{
 const m=run(createModel('incline',{theta:0,initialSpeed:5,muKinetic:.255,muStatic:.3}),10);
 near(m.measure().distance,25/(2*.255*9.81),1e-8);near(m.measure().speed,0);assert.ok(m.state.stopped);
});
test('Newton force and exact linear drag agree with analytical velocity and displacement',()=>{
 const m=run(createModel('force',{mass:2,force:4}),2);near(m.measure().vx,4,1e-10);near(m.measure().x,4,1e-10);
 const d=run(createModel('force',{mass:2,force:4,drag:1}),2);
 near(d.measure().vx,4*(1-Math.exp(-1)),1e-10);near(d.measure().x,8*Math.exp(-1),1e-10);
});
test('vanishing drag remains finite and approaches the no-drag solution',()=>{
 const m=run(createModel('force',{mass:2,force:4,drag:1e-300}),2);
 assert.ok(m.valid);near(m.measure().vx,4,1e-10);near(m.measure().x,4,1e-10);
});
test('collision requires actual contact and conserves momentum, restitution, energy budget',()=>{
 for(const restitution of [0,.4,1]){
  const m=createModel('collision',{m1:2,m2:3,u1:4,u2:-1,restitution});
  assert.equal(m.state.collisionOccurred,false);near(m.measure().v1,4);m.step();assert.equal(m.state.collisionOccurred,false);
  run(m,2);assert.ok(m.state.collisionOccurred);near(m.measure().momentum,5,1e-10);
  near(m.measure().v2-m.measure().v1,5*restitution,1e-10);
  near(m.measure().kineticEnergy+m.measure().dissipatedEnergy,17.5,1e-10);
 }
 const m=run(createModel('collision'),2);near(m.measure().v2,3);near(m.measure().v1,0);
});
test('Free accepts add/remove and both object types, real contact impulses',()=>{
 const bodies=[{id:'a',type:'block',mass:1,x:3,y:4,vx:2,vy:0,radius:.5},{id:'b',type:'ball',mass:1,x:5,y:4,vx:0,vy:0,radius:.5}];
 const m=run(createModel('free',{g:0,drag:0,restitution:1,bodies}),1);
 assert.ok(m.state.collisionOccurred);near(m.state.bodies[0].vx,0,1e-9);near(m.state.bodies[1].vx,2,1e-9);near(m.measure().dissipatedEnergy,0,1e-9);
 assert.equal(createModel('free',{bodies:bodies.slice(0,1)}).state.bodies.length,1);
 assert.equal(createModel('free',{bodies:[]}).state.bodies.length,0);
});
test('Free exposes gravity and drag acceleration for every body, not only the first',()=>{
 const m=createModel('free',{g:5,drag:1,bodies:[{id:'a',type:'ball',mass:1,x:3,y:4,vx:2,vy:0,radius:.5},{id:'b',type:'block',mass:2,x:7,y:4,vx:4,vy:2,radius:.5}]});
 near(m.state.bodies[1].ax,-2);near(m.state.bodies[1].ay,-6);
});
test('Free oblique contact conserves vector momentum and elastic KE away from walls',()=>{
 const bodies=[{id:'a',type:'ball',mass:2,x:4,y:4,vx:3,vy:.5,radius:.5},{id:'b',type:'block',mass:1,x:6,y:4.5,vx:0,vy:0,radius:.5}];
 const m=run(createModel('free',{g:0,restitution:1,bodies}),1);
 assert.ok(m.state.collisionOccurred);const [a,b]=m.state.bodies;
 near(2*a.vx+b.vx,6,1e-10);near(2*a.vy+b.vy,1,1e-10);near(m.measure().kineticEnergy,9.25,1e-10);
 assert.ok(Math.abs(b.vy)>0.1);
});
test('Free crowded contacts remain inside enclosure and expose contact energy correction',()=>{
 const bodies=Array.from({length:12},(_,i)=>({id:'body'+i,type:i%2?'block':'ball',mass:1,x:.5,y:.5,vx:0,vy:0,radius:.5}));
 const m=createModel('free',{bodies});run(m,.1);
 assert.ok(m.warnings.some(w=>w.includes('overlap')));
 for(const b of m.state.bodies)assert.ok(b.x>=b.radius&&b.x<=20-b.radius&&b.y>=b.radius&&b.y<=12-b.radius);
 assert.ok(Number.isFinite(m.measure().numericalEnergyError));
});
test('motion challenge references succeed only after actual events',()=>{
 const c4=createModel('projectile',{speed:10,angle:45});assert.equal(c4.measure().range,null);run(c4,10);
 assert.ok(c4.state.landed&&c4.measure().range>=9.8&&c4.measure().range<=10.6);
 const c5=run(createModel('incline',{theta:0,initialSpeed:5,muKinetic:.255,muStatic:.3}),10);assert.ok(c5.state.stopped&&c5.measure().distance>=4.7&&c5.measure().distance<=5.3);
 const c6=run(createModel('collision'),2);assert.ok(c6.state.collisionOccurred);near(c6.measure().v2,3,.05);
 const wrong=run(createModel('collision',{restitution:0}),2);assert.ok(Math.abs(wrong.measure().v2-3)>.05);
});
test('accuracy sweep reports observed analytical errors rather than rounded display values',t=>{
 let range=0,flight=0,height=0,momentum=0,energy=0;
 for(const speed of [1,10,50,100])for(const angle of [5,30,45,85])for(const y0 of [0,20]){
  const m=run(createModel('projectile',{speed,angle,y0}),40),v=speed*Math.sin(angle*Math.PI/180),T=(v+Math.sqrt(v*v+19.62*y0))/9.81;
  range=Math.max(range,Math.abs(m.measure().range-speed*Math.cos(angle*Math.PI/180)*T));flight=Math.max(flight,Math.abs(m.measure().flightTime-T));height=Math.max(height,Math.abs(m.measure().maxHeight-y0-v*v/19.62));
 }
 for(const m1 of [.05,1,100])for(const m2 of [.05,1,100])for(const restitution of [0,.2,1]){
  const m=run(createModel('collision',{m1,m2,u1:10,u2:-3,restitution}),1);
  momentum=Math.max(momentum,Math.abs(m.measure().momentum-(10*m1-3*m2)));energy=Math.max(energy,Math.abs(m.measure().kineticEnergy+m.measure().dissipatedEnergy-(50*m1+4.5*m2)));
 }
 assert.ok(range<1e-8&&flight<1e-9&&height<1e-8&&momentum<1e-9&&energy<1e-8);
 t.diagnostic(JSON.stringify({maxRangeError_m:range,maxFlightError_s:flight,maxHeightError_m:height,maxMomentumError_kg_m_s:momentum,maxCollisionEnergyBudgetError_J:energy}));
});
test('rejects malformed unsafe and unbounded configs, snapshots and resets are independent',()=>{
 for(const [mode,p] of [['projectile',{mass:0}],['force',{drag:NaN}],['free',{bodies:Array(13).fill({})}],['__proto__',{}],['force',{typo:2}],['free',{bodies:[{id:'__proto__'}]}]])assert.equal(normalizeConfig(mode,p).ok,false);
 assert.throws(()=>createModel('force',{mass:-1}));
 const m=createModel('projectile');const snap=m.snapshot();snap.bodies[0].x=999;near(m.state.bodies[0].x,0);m.step();near(createModel(m.mode,m.config).time,0);
 assert.equal(EXPERIMENTS.length,4);
});
test('Free defaults missing body fields but rejects explicit null numeric fields',()=>{
 const base={id:'a',type:'ball'};
 assert.equal(normalizeConfig('free',{bodies:[base]}).ok,true);
 for(const key of ['mass','x','y','vx','vy','radius']){
  const result=normalizeConfig('free',{bodies:[{...base,[key]:null}]});
  assert.equal(result.ok,false,`explicit null ${key} must fail`);
 }
});
