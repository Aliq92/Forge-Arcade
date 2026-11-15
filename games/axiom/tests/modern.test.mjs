import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPERIMENTS,createModel} from '../src/physics/modern.mjs';
import {C,H,HBAR,E,G,ME,MSUN,PC} from '../src/physics/shared.mjs';
const near=(a,b,rel=1e-10,abs=0)=>assert.ok(Math.abs(a-b)<=Math.max(abs,rel*Math.max(Math.abs(a),Math.abs(b))),`${a} ≈ ${b}`);
const step=(m,n=240)=>{for(let i=0;i<n&&!m.complete;i++)m.step();return m.measure();};

test('all modern defaults and presets expose finite physical readings and bounded independent geometry',()=>{
 assert.equal(EXPERIMENTS.length,15);
 for(const d of EXPERIMENTS)for(const config of [{},...d.presets.map(p=>p.config)]){
  const m=createModel(d.id,config);step(m,20);
  const r=m.measure();for(const v of Object.values(r))assert.ok(v===null||Number.isFinite(v),d.id);
  const scene=m.scene();assert.ok(scene.caption.length>10,d.id);assert.ok(scene.bounds.w>0&&scene.bounds.h>0,d.id);
  assert.ok((scene.points?.length||0)<=80,d.id);for(const c of scene.curves||[])assert.ok(c.points.length<=401,d.id);
  const p=m.profile();assert.ok(p&&p.points.length>=2&&p.points.length<=401,d.id);
  assert.ok(p.points.some(p=>Number.isFinite(p.y)),d.id);
  const snap=m.snapshot();snap.config.extra=99;assert.equal(m.config.extra,undefined);
  assert.throws(()=>createModel(d.id,{unknown:1}),/Unknown/);
 }
});
test('Lorentz transform preserves timelike and spacelike intervals; twin clocks and velocity addition',()=>{
 const m=createModel('relativity',{beta:.6,eventTime:5,eventPosition:3*C,properLength:10,travelerBeta:.6,tripDuration:10});
 const r=m.measure();near(r.gamma,1.25);near(r.transformedTime,4);near(r.transformedPosition,0,0,1e-6);near(r.interval,16*C*C);near(r.transformedInterval,r.interval);near(r.contractedLength,8);near(r.combinedVelocity/C,15/17);near(r.twinProperDuration,8);
 const s=createModel('relativity',{beta:-.9,eventTime:1,eventPosition:3*C}).measure();near(s.interval,s.transformedInterval,1e-13);
 assert.throws(()=>createModel('relativity',{beta:1}));
});
test('Schwarzschild static clocks obey lapse, redshift reciprocity and reject horizon',()=>{
 const m=createModel('schwarzschild-clocks',{radiusRatio:4,referenceRatio:16});const r=step(m,100);
 near(r.lapse,Math.sqrt(.75));near(r.properTime/r.time,r.lapse);near(r.frequencyRatio,Math.sqrt(.8));near(r.schwarzschildRadius,2*G*10*MSUN/(C*C));
 assert.throws(()=>createModel('schwarzschild-clocks',{radiusRatio:1}));
});
test('Schwarzschild photon orbit captures below critical b and escapes above; weak bending and first integral',()=>{
 const c=createModel('photon-path',{impactRatio:2}).measure();assert.equal(c.captured,1);
 const e=createModel('photon-path',{impactRatio:5}).measure();assert.equal(e.escaped,1);assert.ok(e.closestRadiusRatio>1.5);assert.ok(e.orbitInvariantError<1e-8);
 const w=createModel('photon-path',{impactRatio:100}).measure();near(w.deflectionAngle,.02,.04);assert.ok(w.orbitInvariantError<1e-8);
});
test('point lens roots obey lens equation and Einstein angle mass scaling',()=>{
 const a=createModel('lensing').measure(),b=createModel('lensing',{mass:4*MSUN}).measure();near(b.einsteinAngle,2*a.einsteinAngle);
 near(a.imagePlus-a.einsteinAngle**2/a.imagePlus,a.sourceAngle);near(a.imageMinus-a.einsteinAngle**2/a.imageMinus,a.sourceAngle);
 assert.throws(()=>createModel('lensing',{lensDistance:100*PC,sourceDistance:50*PC}));
});
test('plane gravitational wave keeps true strain and arm displacement separate from display gain',()=>{
 const a=createModel('gravitational-wave',{strain:1e-21,frequency:100,armLength:4000,displayGain:1e20});const b=createModel('gravitational-wave',{displayGain:1e19});
 step(a,60);step(b,60);near(a.measure().strainPlus,b.measure().strainPlus);assert.ok(Math.abs(a.measure().armDisplacement)<=2e-18);near(a.measure().armDisplacement,2000*a.measure().strainPlus);
});
test('box energies match electron 1nm well, normalize superposition and conserve energy through unitary evolution',()=>{
 const m=createModel('particle-box',{length:1e-9,modeA:1,modeB:2,mixing:.5});const r=m.measure();near(r.energyA/E,.376030162,.000001);near(r.energyB/r.energyA,4);near(r.normalization,1,1e-11);
 const before=m.profile().points;step(m,321);near(m.measure().normalization,1,1e-11);near(m.measure().meanEnergy,r.meanEnergy,1e-13);assert.notDeepEqual(m.profile().points,before);
 assert.throws(()=>createModel('particle-box',{modeA:2,modeB:2}));assert.throws(()=>createModel('particle-box',{modeA:1.5}));
});
test('rectangular barrier threshold is continuous, opaque limit finite, free barrier transparent',()=>{
 const width=1e-9,height=E;const threshold=createModel('tunneling',{energy:E,height,width}).measure().transmission;
 near(threshold,1/(1+ME*E*width*width/(2*HBAR*HBAR)),1e-12);
 for(const ratio of [1-1e-9,1+1e-9])near(createModel('tunneling',{energy:E*ratio,height,width}).measure().transmission,threshold,1e-7);
 assert.equal(createModel('tunneling',{height:0}).measure().transmission,1);
 const opaque=createModel('tunneling',{energy:.001*E,height:100*E,width:1e-7}).measure();assert.equal(opaque.transmission,0);near(opaque.reflection,1);
});
test('spin Born probabilities normalize and singlet obeys no signaling with Tsirelson CHSH',()=>{
 near(createModel('spin',{statePolar:Math.PI/2,analyzerPolar:0}).measure().probabilityPlus,.5);
 near(createModel('spin',{statePolar:0,analyzerPolar:0}).measure().probabilityPlus,1);
 const m=createModel('entanglement',{angleA:0,angleB:0}).measure();near(m.correlation,-1);near(m.probabilitySame,0);near(m.marginalAPlus,.5);near(createModel('entanglement').measure().chsh,2*Math.SQRT2);
 for(const angleB of [0,.2,1,2,Math.PI]){const r=createModel('entanglement',{angleB}).measure();near(r.jointPP+r.jointPM,.5);near(r.jointPP+r.jointMP+r.jointPM+r.jointMM,1);}
});
test('decay reports expectation, exact half life and activity with dt-independent exponential',()=>{
 const a=createModel('particle-decay',{halfLife:2,initialCount:1000});step(a,240);near(a.measure().expectedRemaining,500,1e-12);near(a.measure().activity,500*Math.log(2)/2);
 const b=createModel('particle-decay',{halfLife:2,initialCount:1000});for(let i=0;i<120;i++)b.step(b.dt*2);near(a.measure().expectedRemaining,b.measure().expectedRemaining,1e-12);
});
test('two-flavour neutrino SI phase matches conventional 1.267 km/GeV coefficient and unity conservation',()=>{
 const r=createModel('neutrino',{baseline:295000,energy:.6e9*E,deltaMassSquared:.0025,mixingAngle:Math.PI/4}).measure();
 near(r.transitionProbability,Math.sin(1.266932679*.0025*295/.6)**2,1e-8);near(r.transitionProbability+r.survivalProbability,1);
 near(createModel('neutrino',{baseline:0}).measure().transitionProbability,0);near(createModel('neutrino',{mixingAngle:0}).measure().transitionProbability,0);
});
test('synthetic COM scattering conserves energy and opposite momentum including threshold',()=>{
 const m=createModel('scattering',{totalEnergy:10e9*E,massA:ME,massB:2*ME,angle:.7});const r=m.measure();near(r.energyA+r.energyB,10e9*E);near(r.momentumXTotal,0,0,1e-35);near(r.momentumYTotal,0,0,1e-35);near(r.energyA*r.energyA-r.momentum*r.momentum*C*C,ME*ME*C**4,1e-7);
 assert.throws(()=>createModel('scattering',{totalEnergy:1e-16}));
 const threshold=createModel('scattering',{totalEnergy:3*ME*C*C,massA:ME,massB:2*ME}).measure();near(threshold.momentum,0,0,1e-28);
});
test('Friedmann integration matches matter-only analytical age and expansion and radiation age',()=>{
 const H0=2e-18,a0=.1;const m=createModel('expansion',{hubble:H0,omegaMatter:1,omegaRadiation:0,omegaLambda:0,initialScale:a0});
 near(m.measure().age,2/(3*H0)*a0**1.5,1e-8);step(m,400);near(m.measure().scaleFactor,(a0**1.5+1.5*H0*m.time)**(2/3),2e-8);
 const r=createModel('expansion',{hubble:H0,omegaMatter:0,omegaRadiation:1,omegaLambda:0,initialScale:.5}).measure();near(r.age,.25/(2*H0),1e-9);
 assert.throws(()=>createModel('expansion',{omegaMatter:0,omegaRadiation:0,omegaLambda:1}));
});
test('modelled galaxy rotation curve has zero centre and baryon Kepler tail without halo',()=>{
 const c=createModel('rotation-curve',{radius:0}).measure();near(c.circularSpeed,0);
 const a=createModel('rotation-curve',{radius:100000*PC,haloSpeed:0,scaleRadius:1000*PC}).measure();near(a.circularSpeed,Math.sqrt(G*a.enclosedBaryonMass/(100000*PC)));assert.equal(a.enclosedHaloMass,0);
 const h=createModel('rotation-curve',{radius:100000*PC,haloSpeed:200000,coreRadius:1000*PC}).measure();near(h.haloCircularSpeed,200000,.01);
});
test('cosmological spectral redshift scales wavelength and photon energy; no spurious recession velocity',()=>{
 const r=createModel('redshift',{redshift:3,wavelength:500e-9}).measure();near(r.observedWavelength,2e-6);near(r.observedEnergy/r.emittedEnergy,.25);near(r.emissionScale,.25);assert.equal(r.recessionVelocity,undefined);
});
test('dynamic default graph follows a changing observable rather than a fixed input-derived constant',()=>{
 for(const d of EXPERIMENTS.filter(d=>d.dynamic)){const m=createModel(d.id),before=m.measure()[d.graph.y];step(m,61);assert.notEqual(m.measure()[d.graph.y],before,d.id+' graph observable');}
});
test('SR event remains inside diagram for events before the coordinate origin',()=>{
 const m=createModel('relativity',{eventTime:-100}),s=m.scene(),event=s.points.find(p=>p.label==='selected event');assert.ok(event.y>=s.bounds.y&&event.y<=s.bounds.y+s.bounds.h);
});
test('box rejects identical modes with an explanatory state-domain error',()=>{
 assert.throws(()=>createModel('particle-box',{modeA:2,modeB:2}),/distinct eigenstates/);
});
test('scattering resolves conserved components from outgoing on-shell momenta',()=>{
 const r=createModel('scattering',{angle:Math.PI/2}).measure();near(r.momentumYA,r.momentum);near(r.momentumYB,-r.momentum);near(r.momentumXA+r.momentumXB,r.momentumXTotal,0,1e-35);near(r.momentumYA+r.momentumYB,r.momentumYTotal,0,1e-35);
});
test('age quadrature resolves a narrow loitering interval in a permitted closed model',()=>{
 // Independent composite Simpson reference, 200,000 x=sqrt(a) intervals.
 const r=createModel('expansion',{omegaMatter:.3,omegaRadiation:0,omegaLambda:1.71346,initialScale:1}).measure();near(r.age,3189648227668054000,1e-8);
});
test('strong photon bending matches an independent first-integral quadrature and critical orbit is unresolved honestly',()=>{
 // Independent 200,000-interval Simpson integral after u=u_turn(1-t²).
 near(createModel('photon-path',{impactRatio:5}).measure().deflectionAngle,.5903957874486377,1e-8);
 const m=createModel('photon-path',{impactRatio:3*Math.sqrt(3)/2}),r=m.measure();assert.equal(r.captured,0);assert.equal(r.escaped,0);assert.equal(r.deflectionAngle,null);assert.ok(m.warnings.length>0);
});
test('flat matter plus Lambda age and pure curvature age match independent closed forms',()=>{
 const H0=2e-18,r=createModel('expansion',{hubble:H0,omegaMatter:.3,omegaRadiation:0,omegaLambda:.7,initialScale:1}).measure();near(r.age,2/(3*H0*Math.sqrt(.7))*Math.asinh(Math.sqrt(.7/.3)),1e-10);
 near(createModel('expansion',{hubble:H0,omegaMatter:0,omegaRadiation:0,omegaLambda:0,initialScale:.5}).measure().age,.5/H0);
 assert.throws(()=>createModel('expansion',{omegaMatter:2,omegaRadiation:0,omegaLambda:0}),/turnaround/);
});
test('modern numeric boundaries either reject domains or retain finite readings and geometry',()=>{
 function check(value,label){if(typeof value==='number')assert.ok(Number.isFinite(value),label);else if(value&&typeof value==='object')for(const [key,v]of Object.entries(value))check(v,label+'.'+key);}
 for(const d of EXPERIMENTS){for(const p of d.parameters)for(const value of [p.min,p.max]){if(value===undefined)continue;let m;try{m=createModel(d.id,{[p.key]:value});}catch(e){assert.ok(e.message.length>10);continue;}step(m,500);check(m.measure(),d.id);check(m.scene(),d.id);check(m.profile(),d.id);}
  const p=d.parameters.find(p=>p.type==='number');for(const bad of [NaN,Infinity,'1',null])assert.throws(()=>createModel(d.id,{[p.key]:bad}));
 }
});
test('static analytical models do not create a fictitious elapsed physical time',()=>{
 for(const d of EXPERIMENTS.filter(d=>d.dynamic===false)){const m=createModel(d.id);step(m,20);assert.equal(m.time,0,d.id);}
});
test('point-lens angular profile breaks at its pole despite floating-point sampling roundoff',()=>{
 const p=createModel('lensing',{mass:1.4125375446227546e25}).profile();assert.equal(p.points[100].y,null);assert.ok(p.points.slice(0,100).every(p=>Number.isFinite(p.y)));assert.ok(p.points.slice(101).every(p=>Number.isFinite(p.y)));
});
test('neutrino high-frequency profile resolves oscillations in a labelled local window without changing selected probability',()=>{
 const c={baseline:1e8,energy:1e6*E,deltaMassSquared:1,mixingAngle:Math.PI/4},m=createModel('neutrino',c),p=m.profile(),r=m.measure();
 assert.ok(p.points.length<=401);assert.match(p.label,/cropped|local window/i);
 for(let i=1;i<p.points.length;i++)assert.ok(p.points[i].x-p.points[i-1].x<=r.oscillationLength/40,'at least 40 intervals per oscillation');
 assert.ok(p.points[0].x<=c.baseline&&p.points.at(-1).x>=c.baseline);near(r.transitionProbability,Math.sin(E*E*c.baseline/(4*c.energy*HBAR*C))**2);
 assert.match(m.scene().caption,/cropped|local window/i);assert.ok(m.scene().points.some(p=>p.x===c.baseline&&p.y===r.transitionProbability));
});
test('tunneling unresolved resonances use an identified exact envelope rather than aliased transmission samples',()=>{
 const c={mass:1e-26,width:1e-7,height:2*E,energy:E},m=createModel('tunneling',c),p=m.profile();
 assert.match(p.label,/lower envelope/i);assert.match(p.y.label,/lower bound/i);assert.match(p.label,/not.*average/i);assert.ok(m.warnings.some(w=>/resonan/i.test(w)));
 for(const point of p.points){assert.ok(point.x>=c.height);const delta=point.x-c.height;const bound=delta===0?0:1/(1+c.height*c.height/(4*point.x*delta));near(point.y,bound,1e-12,1e-16);}
 // Exact selected-energy probability is still computed, even outside the envelope window.
 near(m.measure().transmission+m.measure().reflection,1);assert.equal(m.measure().transmission,0);
 assert.match(createModel('tunneling').profile().label,/exact rectangular/i);
});
test('Friedmann time stepping resolves departure from loitering and terminates at the physical a=4 boundary',()=>{
 const config={omegaMatter:.3,omegaRadiation:0,omegaLambda:1.71346,initialScale:.444},m=createModel('expansion',config);
 // Independent fine RK4 reference uses 20,000 substeps per original outer dt.
 const target=12*m.dt;
 const n=240000,h=target/n,f=a=>m.config.hubble*Math.sqrt(.3/a+(1-.3-1.71346)+1.71346*a*a);let reference=.444;
 for(let i=0;i<n;i++){const k1=f(reference),k2=f(reference+h*k1/2),k3=f(reference+h*k2/2),k4=f(reference+h*k3);reference+=h*(k1+2*k2+2*k3+k4)/6;}
 for(let i=0;i<12;i++)m.step();near(m.time,target,1e-10);near(m.measure().scaleFactor,reference,1e-7);
 while(!m.complete&&m.time<10*target)m.step();assert.equal(m.complete,true);near(m.measure().scaleFactor,4,0,1e-12);
 const scene=m.scene();assert.ok(scene.points.every(p=>p.x>=scene.bounds.x&&p.x<=scene.bounds.x+scene.bounds.w));
 // A=4 age from an independently fine Simpson integral in x=sqrt(a).
 const panels=400000,dx=2/panels,g=x=>x===0?0:2*x*x/Math.sqrt(.3+(1-.3-1.71346)*x*x+1.71346*x**6);let sum=g(2);
 for(let i=1;i<panels;i++)sum+=(i%2?4:2)*g(i*dx);near(m.measure().age,sum*dx/(3*m.config.hubble),1e-8);
 const stopped=m.snapshot();m.step();assert.deepEqual(m.snapshot(),stopped);
});
