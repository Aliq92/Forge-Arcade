import test from 'node:test';
import assert from 'node:assert/strict';
import {SUBJECTS,LESSONS,CONNECTIONS,THEORIES,PARTICLES,DISCOVERIES} from '../src/content/curriculum.mjs';
import {EQUATIONS} from '../src/content/equations.mjs';
import {REFERENCES} from '../src/content/references.mjs';
const modelIds=new Set('force projectile collisions orbits pendulum rotation double-pendulum ideal-gas heat-transfer carnot microstates phase-change electric-field lorentz dc-circuit rc-circuit rlc-circuit induction traveling-wave double-slit snell thin-lens dispersion doppler relativity schwarzschild-clocks photon-path lensing gravitational-wave particle-box tunneling spin entanglement particle-decay neutrino scattering expansion rotation-curve redshift classical-string compactification branes stellar-life'.split(' '));
const ids=items=>new Set(items.map(x=>x.id));
test('content routes resolve with unique IDs and acyclic prerequisites',()=>{
 for(const items of [SUBJECTS,LESSONS,EQUATIONS,REFERENCES,THEORIES,PARTICLES,DISCOVERIES])assert.equal(ids(items).size,items.length);
 assert.equal(SUBJECTS.length,10);assert.ok(LESSONS.length>=45&&LESSONS.length<=55);
 const lessons=ids(LESSONS),sources=ids(REFERENCES),eqs=ids(EQUATIONS),subjects=ids(SUBJECTS);
 for(const x of [...LESSONS,...EQUATIONS,...THEORIES,...PARTICLES,...DISCOVERIES])for(const ref of x.references)assert.ok(sources.has(ref),`${x.id}: ${ref}`);
 for(const l of LESSONS){assert.ok(subjects.has(l.subject));for(const x of l.prerequisites)assert.ok(lessons.has(x));for(const x of l.equationIds)assert.ok(eqs.has(x),`${l.id}: ${x}`);for(const x of l.experimentIds)assert.ok(modelIds.has(x),`${l.id}: ${x}`);assert.ok(l.topics.length>0);for(const t of l.topics)assert.ok(t.definition.length>35);assert.equal(new Set(Object.values(l.levels)).size,3);for(const text of Object.values(l.levels))assert.ok(text.length>100);}
 const visited=new Set(),active=new Set();function visit(id){assert.ok(!active.has(id),'prerequisite cycle');if(visited.has(id))return;active.add(id);LESSONS.find(x=>x.id===id).prerequisites.forEach(visit);active.delete(id);visited.add(id);}LESSONS.forEach(x=>visit(x.id));
 for(const edge of CONNECTIONS){assert.ok(lessons.has(edge.from));assert.ok(lessons.has(edge.to));assert.ok(edge.label.length>5);}
 for(const e of EQUATIONS)if(e.example.experimentId)assert.ok(modelIds.has(e.example.experimentId));
 for(const s of SUBJECTS)assert.ok(LESSONS.filter(l=>l.subject===s.id).length>=3);
 for(const d of DISCOVERIES)assert.ok(lessons.has(d.lessonId));
});
test('remaining scalar equations agree with rounded independent worked references and carry SI units',()=>{
 // Rounded physical reference values deliberately do not import the implementation constants.
 const fixtures=[
 ['momentum',{mass:2,velocity:-3},-6,'kg m/s'],['angular',{inertia:2,omega:3},6,'kg m²/s'],
 ['torque',{inertia:2,alpha:-3},-6,'N m'],['oscillator',{mass:1,spring:4},3.141592654,'s'],
 ['ideal-gas',{moles:1,temperature:300,volume:0.025},99773.55,'Pa'],
 ['first-law',{heat:100,work:40},60,'J'],['entropy',{multiplicity:2},9.56993e-24,'J/K'],
 ['coulomb',{charge1:1e-6,charge2:-1e-6,radius:1},-0.008987552,'N'],
 ['lorentz-force',{charge:1e-6,speed:3,field:2},6e-6,'N'],
 ['rc',{source:5,resistance:1000,capacitance:0.001,time:1},3.16060279,'V'],
 ['wave',{frequency:2,wavelength:3},6,'m/s'],['snell',{n1:1,n2:1.5,angle:0.5235987755982988},0.33983691,'rad'],
 ['thin-lens',{focal:0.1,distance:0.3},0.15,'m'],['doppler',{frequency:100,medium:340,observer:0,source:34},111.111111,'Hz'],
 ['einstein-energy',{mass:1},8.987551787e16,'J'],['schwarzschild',{mass:1.98847e30},2953.339,'m'],
 ['box-energy',{mode:1,mass:9.1093837139e-31,width:1e-9},6.024667e-20,'J'],
 ['born',{angle:2.0943951023931953},0.25,'1'],['uncertainty',{spread:1e-9},5.272859e-26,'kg m/s'],
 ['circular-speed',{mass:1e41,radius:1e20},258346.7,'m/s']
 ];
 for(const [id,input,want,unit]of fixtures){const result=EQUATIONS.find(e=>e.id===id).calculate(input);assert.equal(result.unit,unit,id);assert.ok(Math.abs(result.value-want)<=Math.abs(want)*2e-6,`${id}: ${result.value} vs ${want}`);}
});
test('equation domain boundaries preserve physical meaning instead of silently clamping',()=>{
 const get=id=>EQUATIONS.find(e=>e.id===id);
 assert.throws(()=>get('box-energy').calculate({mode:1.5}));
 assert.throws(()=>get('newton2').calculate({mass:0}));
 assert.throws(()=>get('snell').calculate({n1:1.5,n2:1,angle:1}));
 assert.throws(()=>get('doppler').calculate({medium:340,source:340}));
 assert.equal(get('rc').calculate({time:0}).value,0);
 assert.equal(get('entropy').calculate({multiplicity:1}).value,0);
 assert.equal(get('dilation').calculate({beta:0,properTime:2}).value,2);
 assert.ok(get('thin-lens').calculate({focal:0.1,distance:0.05}).value<0);
 const base=get('box-energy').calculate({mode:1}).value;
 assert.equal(get('box-energy').calculate({mode:2}).value/base,4);
 assert.equal(get('gravity').calculate({radius:4}).value/get('gravity').calculate({radius:2}).value,0.25);
 assert.throws(()=>get('box-energy').calculate({width:1e-12}),/nonrelativistic/i);
 assert.throws(()=>get('gravity').calculate({mass1:1e32,mass2:1e32,radius:1}),/weak/i);
 assert.throws(()=>get('circular-speed').calculate({mass:1e44,radius:1}),/weak/i);
 const core='newton2 gravity kinematics momentum energy angular torque oscillator lagrangian hamiltonian ideal-gas first-law entropy carnot coulomb ohm kirchhoff maxwell-gauss maxwell-magnetism maxwell-faraday maxwell-ampere lorentz-force rc rlc wave snell thin-lens interference doppler lorentz-transform dilation einstein-energy schwarzschild einstein-field schrodinger box-energy tunneling born uncertainty decay neutrino friedmann redshift circular-speed'.split(' ');
 for(const id of core)assert.ok(get(id),id);
});
test('equation explorer calculates independently checked SI examples and rejects invalid domains',()=>{
 const calc=(id,p)=>EQUATIONS.find(x=>x.id===id).calculate(p).value;
 for(const [id,p,want]of [['newton2',{mass:2,acceleration:3},6],['gravity',{mass1:2,mass2:3,radius:2},1.001145e-10],['kinematics',{initialVelocity:2,acceleration:3,time:4},32],['energy',{mass:2,speed:3},9],['ohm',{current:2,resistance:3},6],['carnot',{hot:600,cold:300},0.5],['dilation',{beta:0.6,properTime:8},10],['redshift',{emitted:5e-7,z:1},1e-6],['decay',{initial:100,halfLife:2,time:4},25]])assert.ok(Math.abs(calc(id,p)-want)<=Math.max(1e-30,Math.abs(want)*1e-12),id);
 assert.ok(EQUATIONS.filter(x=>x.calculate).length>=15);
 for(const e of EQUATIONS){assert.ok(e.symbols.length>0);assert.ok(e.derivation.length>=2);assert.ok(e.assumptions.length>0);if(e.calculate){assert.ok(Number.isFinite(e.calculate({}).value),e.id);assert.throws(()=>e.calculate({unknown:1}));assert.throws(()=>e.calculate({[e.parameters[0].key]:NaN}));}}
 assert.throws(()=>calc('carnot',{hot:300,cold:600}));assert.throws(()=>calc('dilation',{beta:1}));assert.throws(()=>calc('thin-lens',{focal:0.1,distance:0.1}));
});
test('constant-acceleration displacement rejects trajectories leaving its nonrelativistic domain',()=>{
 const calculate=EQUATIONS.find(e=>e.id==='kinematics').calculate;
 // The individually permitted inputs imply final speed 10^9 m/s; a joint guard must reject them.
 assert.throws(()=>calculate({initialVelocity:0,acceleration:1e6,time:1000}),/nonrelativistic/i);
 assert.throws(()=>calculate({initialVelocity:0,acceleration:-1e6,time:1000}),/nonrelativistic/i);
 assert.throws(()=>calculate({initialVelocity:1e6,acceleration:1e6,time:29}),/nonrelativistic/i);
 // Linear velocity reaches its largest absolute value at an endpoint, including a sign reversal.
 assert.equal(calculate({initialVelocity:1e6,acceleration:-1e6,time:2}).value,0);
 assert.equal(calculate({initialVelocity:2,acceleration:3,time:4}).value,32);
 assert.equal(calculate({initialVelocity:1e6,acceleration:1e6,time:0}).value,0);
 assert.equal(calculate({initialVelocity:0,acceleration:1e6,time:29}).value,420500000);
});
test('operator and tensor equations offer scoped guidance and Maxwell both formulations',()=>{
 for(const id of ['maxwell-gauss','maxwell-magnetism','maxwell-faraday','maxwell-ampere']){const e=EQUATIONS.find(x=>x.id===id);assert.match(e.expression,/∮/);assert.match(e.expression,/[∇]/);}
 for(const id of ['schrodinger','einstein-field']){const e=EQUATIONS.find(x=>x.id===id);assert.equal(e.calculate,undefined);assert.ok(e.example.text.length>100);}
});
test('unconfirmed frameworks and unknown neutrino masses retain honest evidence labels',()=>{
 for(const id of ['string','m-theory','lqg','susy'])assert.equal(THEORIES.find(x=>x.id===id).status,'unconfirmed');
 assert.equal(THEORIES.find(x=>x.id==='gr').status,'established');
 assert.equal(PARTICLES.length,17);for(const p of PARTICLES.filter(x=>x.id.includes('neutrino')))assert.equal(p.mass,null);
 for(const r of REFERENCES){assert.ok(r.url.startsWith('https://'));assert.ok(r.date===null||typeof r.date==='string');}
});
