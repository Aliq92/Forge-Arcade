import test from 'node:test';
import assert from 'node:assert/strict';
import * as physics from '../js/physics.js';
import {CONFIG} from '../js/config.js';
import {generateSystem} from '../js/systemGenerator.js';
import {computeTrajectory} from '../js/trajectory.js';
import {Comet} from '../js/comet.js';

test('gravity follows softened Newtonian vector law and remains finite at center',()=>{
 const b={x:0,y:0,mass:40,radius:20},x=70,y=90;
 const soft=CONFIG.MIN_SOFTEN+b.radius*.28,den=(x*x+y*y+soft*soft)**1.5;
 const g=physics.gravityFrom(b,x,y);
 assert.ok(Math.abs(g.ax+CONFIG.G*b.mass*x/den)<1e-10);
 assert.ok(Math.abs(g.ay+CONFIG.G*b.mass*y/den)<1e-10);
 assert.deepEqual([physics.gravityFrom(b,0,0).ax,physics.gravityFrom(b,0,0).ay],[0,0]);
});

test('prediction matches actual dynamic-body flight at every sample without mutating the live system',()=>{
 for(const quality of [.65,1,1.4]){
  const system=generateSystem(2,'prediction-'+quality);
  const c=new Comet(system.spawn.x,system.spawn.y,system.vel.x,system.vel.y);
  const before=JSON.stringify(system),pts=computeTrajectory(c,system,{x:12,y:-7},quality);
  assert.equal(JSON.stringify(system),before);
  c.vx+=12;c.vy-=7;let step=0,maxError=0;
  for(const p of pts.slice(1)){
   while(step<p.step){physics.stepFlight(c,system,CONFIG.PHYSICS_DT);step++;}
   maxError=Math.max(maxError,Math.hypot(c.x-p.x,c.y-p.y));
  }
  assert.ok(maxError<1e-7,`maximum error ${maxError}`);
  assert.ok(pts.at(-1).step>=120);
  console.log(`prediction quality=${quality}, samples=${pts.length}, max error=${maxError} world units`);
 }
});

test('swept moving-body collision detects crossing even when endpoints do not overlap',()=>{
 assert.equal(physics.sweptOverlap(-100,0,100,0,0,-10,0,10,12),true);
 assert.equal(physics.sweptOverlap(-100,50,100,50,0,0,0,0,12),false);
});

test('Verlet orbit conserves energy closely over sixty seconds',()=>{
 const star={x:0,y:0,mass:100,radius:20},r=500;
 const soft=CONFIG.MIN_SOFTEN+star.radius*.28;
 const c={x:r,y:0,vx:0,vy:Math.sqrt(CONFIG.G*star.mass*r*r/(r*r+soft*soft)**1.5)};
 const system={star,planets:[],belts:[]};
 const energy=()=>.5*(c.vx*c.vx+c.vy*c.vy)-CONFIG.G*star.mass/Math.sqrt(c.x*c.x+c.y*c.y+soft*soft);
 const initial=energy();for(let i=0;i<7200;i++)physics.stepFlight(c,system,CONFIG.PHYSICS_DT);
 assert.ok(Math.abs((energy()-initial)/initial)<1e-5);
});
test('fixed-step flight stays within 0.1 world units of an eight-times-finer reference',()=>{
 let maximum=0;
 for(const seed of ['fine-one','fine-two','fine-three']){
  const s=generateSystem(4,seed),p=s.planets[1];
  const c={x:p.x+190,y:p.y-120,vx:35,vy:90,radius:9};
  const fineSystem=physics.cloneFlightSystem(s),fine={...c};
  for(let i=1;i<=720;i++){
   physics.stepFlight(c,s,CONFIG.PHYSICS_DT);
   for(let j=0;j<8;j++)physics.stepFlight(fine,fineSystem,CONFIG.PHYSICS_DT/8);
   maximum=Math.max(maximum,Math.hypot(c.x-fine.x,c.y-fine.y));
  }
 }
 assert.ok(maximum<.1,`reference error ${maximum}`);console.log('FINE REFERENCE maximum error='+maximum+' world units over 6 seconds');
});
test('collision preview respects the same short invulnerability window as actual flight',()=>{
 const star={x:0,y:0,mass:0,radius:100,dangerRadius:200};
 const system={star,planets:[],belts:[],bounds:{radius:2000}};
 const c=new Comet(110,0,-100,0);c.invulnTimer=2.5;
 const pts=computeTrajectory(c,system,null,.65);
 assert.equal(pts.collided,undefined,'grace allows the entire crossing before collision checks resume');
 c.invulnTimer=0;assert.equal(computeTrajectory(c,system,null,.65).collided,'star');
});
