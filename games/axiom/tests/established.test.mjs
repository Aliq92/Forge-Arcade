import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pack=await import('../src/physics/established.mjs');
const {EXPERIMENTS,createModel}=pack;
const ids='force projectile collisions orbits pendulum rotation double-pendulum ideal-gas heat-transfer carnot microstates phase-change electric-field lorentz dc-circuit rc-circuit rlc-circuit induction traveling-wave double-slit snell thin-lens dispersion doppler'.split(' ');
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b} by ${Math.abs(a-b)}, tolerance ${t}`);
function run(m,t){for(let i=0,n=Math.round(t/m.dt);i<n&&!m.complete;i++)m.step();return m.measure();}
test('All 24 required established laboratories exist',()=>assert.deepEqual(EXPERIMENTS.map(d=>d.id).sort(),ids.sort()));
for(const id of ids)test(`${id}: contract, finite initial/evolved readings, coherent geometry and independent snapshot`,()=>{
 const d=EXPERIMENTS.find(d=>d.id===id);assert.ok(d); const m=createModel(id);assert.equal(m.id,id);assert.ok(m.valid);assert.ok(m.clockRate>0);assert.ok(m.dt>0);assert.ok(m.explain().length>35);
 for(let i=0;i<30;i++)if(m.dynamic)m.step();
 for(const [key,v]of Object.entries(m.measure())){assert.ok(v===null||Number.isFinite(v),key);assert.ok(m.measurementMeta[key],`Missing metadata ${key}`);}
 const scene=m.scene();assert.ok(scene.bounds.w>0&&scene.bounds.h>0);assert.ok(['curves','points','segments','circles','vectors','polygons'].some(k=>scene[k]?.length));
 const profile=m.profile();assert.ok(profile&&profile.points.length>=2&&profile.points.length<=401);assert.ok(profile.points.every(p=>Number.isFinite(p.x)&&(p.y===null||Number.isFinite(p.y))));
 const snap=m.snapshot();snap.config[d.parameters[0].key]='mutated';assert.notEqual(m.config[d.parameters[0].key],'mutated');
 assert.throws(()=>m.step(-1));assert.throws(()=>m.step(m.dt*5));assert.throws(()=>createModel(id,{unknown:2}));
 for(const p of d.presets)assert.ok(createModel(id,p.config).valid);
});
test('constant force exact trajectory, work and a=F/m',()=>{const m=createModel('force',{mass:2,force:4,drag:0,initialSpeed:0,g:9.81});const r=run(m,2);near(r.x,4,1e-10);near(r.vx,4,1e-10);near(r.kineticEnergy,16,1e-9);near(r.acceleration,2);});
test('vacuum projectile ends at analytic ground event',()=>{const m=createModel('projectile',{speed:20,angle:45});const r=run(m,10);near(r.range,400/9.81,1e-9);near(r.flightTime,20*Math.SQRT2/9.81,1e-10);});
test('elastic collision swaps equal-mass velocities and conserves momentum',()=>{const m=createModel('collisions');const r=run(m,2);near(r.v1,0);near(r.v2,3);near(r.momentumError,0);near(r.dissipatedEnergy,0);});
test('Verlet orbit conserves energy and angular momentum for a period',()=>{const m=createModel('orbits'),a=m.measure();const r=run(m,m.theory.orbitalPeriod);assert.ok(Math.abs(r.energyDrift)<1e-8);near(r.angularMomentum/a.angularMomentum,1,1e-12);});
test('small-angle pendulum period agrees with independent elliptic-series correction',()=>{const m=createModel('pendulum',{angle:5}),r=run(m,20),a=5*Math.PI/180,T=2*Math.PI/Math.sqrt(9.81)*(1+a*a/16+11*a**4/3072);near(r.period,T,2e-5);});
test('constant torque satisfies angular impulse and work-energy',()=>{const m=createModel('rotation',{inertia:2,torque:3,omega0:1}),r=run(m,2);near(r.omega,4,1e-10);near(r.angularMomentum,8,1e-10);near(r.energyChange,r.work,1e-9);});
test('double pendulum RK4 preserves undamped energy and perturbation is deterministic',()=>{const m=createModel('double-pendulum'),e=m.measure().energy;const r=run(m,10);assert.ok(Math.abs((r.energy-e)/e)<2e-6);assert.ok(r.separation>=0);const b=createModel('double-pendulum');near(run(b,10).theta1,r.theta1,0);});
test('ideal gas uses exact molar gas constant and scales inversely with volume',()=>{const a=createModel('ideal-gas',{moles:1,temperature:300,volume:.025}).measure();near(a.pressure,8.31446261815324*300/.025,1e-8);const b=createModel('ideal-gas',{volume:.05}).measure();near(a.pressure/2,b.pressure,1e-8);});
test('two finite heat reservoirs conserve energy and increase entropy',()=>{const m=createModel('heat-transfer'),e=m.measure().energy,r=run(m,100);near(r.energy,e,1e-7);assert.ok(r.entropyChange>0);assert.ok(r.temperature1<350&&r.temperature2>280);});
test('Carnot cycle respects Qh-Qc=W and maximum efficiency',()=>{const m=createModel('carnot',{hot:600,cold:300}),r=m.measure();near(r.efficiency,.5);near(r.work,r.heatIn-r.heatOut,1e-9);assert.throws(()=>createModel('carnot',{hot:300,cold:400}));});
test('binomial microstates give exact log C(4,2) and symmetry',()=>{near(createModel('microstates',{particles:4,left:2}).measure().logMultiplicity,Math.log(6));near(createModel('microstates',{particles:10,left:3}).measure().logMultiplicity,createModel('microstates',{particles:10,left:7}).measure().logMultiplicity);assert.throws(()=>createModel('microstates',{particles:3,left:4}));});
test('water latent-heat plateau and phases use physical energy thresholds',()=>{const m=createModel('phase-change',{mass:1,energy:42000+334000/2}),r=m.measure();near(r.temperature,273.15);near(r.meltFraction,.5);});
test('Coulomb potential, field and masked singularity',()=>{const r=createModel('electric-field',{charge:1e-9,x:1,y:0}).measure();near(r.fieldX,8.987551786170e0,1e-8);near(r.potential,r.fieldX);const s=createModel('electric-field',{x:0,y:0});assert.equal(s.measure().fieldX,null);assert.ok(s.warnings.length);});
test('uniform B analytic Lorentz orbit preserves kinetic energy and force perpendicularity',()=>{const m=createModel('lorentz'),e=m.measure().kineticEnergy,r=run(m,1);near(r.kineticEnergy,e,Math.abs(e)*1e-12);near(r.forceDotVelocity,0,1e-20);});
test('series and parallel DC current solve actual network and KCL',()=>{const a=createModel('dc-circuit',{layout:'series',voltage:12,resistance:100,resistance2:200}).measure();near(a.current,.04);near(a.outputVoltage,8);near(a.kclResidual,0);const b=createModel('dc-circuit',{layout:'parallel',voltage:12,resistance:100,resistance2:200}).measure();near(b.current,.18);near(b.sourcePower,b.power,1e-10);});
test('RC one time constant, exact subdivision independence',()=>{const a=createModel('rc-circuit',{resistance:1000,capacitance:.001,voltage:10}),b=createModel('rc-circuit',{resistance:1000,capacitance:.001,voltage:10});const r=run(a,1);for(let i=0;i<480;i++)b.step(b.dt/2);near(r.capacitorVoltage,10*(1-Math.exp(-1)),1e-10);near(r.capacitorVoltage,b.measure().capacitorVoltage,1e-10);});
test('RLC damped energy plus heat is conserved and matches underdamped reference',()=>{const m=createModel('rlc-circuit',{resistance:2,inductance:1,capacitance:.01,voltage:10}),e=m.measure().totalEnergy,r=run(m,1);const q=.1*Math.exp(-1)*(Math.cos(Math.sqrt(99))+Math.sin(Math.sqrt(99))/Math.sqrt(99));near(r.charge,q,1e-7);near(r.totalEnergy+r.heat,e,1e-7);});
test('Faraday emf has correct derivative magnitude and sign',()=>{const m=createModel('induction',{field:.5,area:.1,turns:10,frequency:1,phase:Math.PI/2}),r=m.measure();near(r.emf,Math.PI,1e-12);near(r.flux,0,1e-15);});
test('traveling wave wavelength-speed relation and standing nodes',()=>{const m=createModel('traveling-wave',{mode:'standing',modeNumber:2,length:3,waveSpeed:6});near(m.measure().frequency,2);const p=m.profile();near(p.points[0].y,0);near(p.points.at(-1).y,0,1e-14);});
test('double slit central normalization and single-slit envelope zero',()=>{const m=createModel('double-slit',{wavelength:500e-9,slitWidth:50e-6,slitSeparation:200e-6,screenDistance:1,screenY:0});near(m.measure().intensity,1);const y=.01/Math.sqrt(1-.01**2);near(createModel('double-slit',{wavelength:500e-9,slitWidth:50e-6,screenY:y}).measure().intensity,0,1e-25);});
test('Snell normal ray and total internal reflection',()=>{near(createModel('snell',{angle:0}).measure().refractedAngle,0);const m=createModel('snell',{n1:1.5,n2:1,angle:Math.PI/3});assert.equal(m.measure().refractedAngle,null);near(m.measure().totalInternalReflection,1);});
test('thin lens image law, virtual images, focal infinity unavailable',()=>{near(createModel('thin-lens',{focalLength:.1,objectDistance:.3}).measure().imageDistance,.15);assert.ok(createModel('thin-lens',{focalLength:.1,objectDistance:.05}).measure().imageDistance<0);assert.equal(createModel('thin-lens',{focalLength:.1,objectDistance:.1}).measure().imageDistance,null);});
test('qualified visible dispersion orders blue above red',()=>{assert.ok(createModel('dispersion',{wavelength:400e-9}).measure().index>createModel('dispersion',{wavelength:700e-9}).measure().index);assert.throws(()=>createModel('dispersion',{wavelength:100e-9}));});
test('subsonic classical Doppler gives approaching-source shift',()=>{near(createModel('doppler',{waveSpeed:340,sourceVelocity:34,observerVelocity:0,frequency:1000}).measure().observedFrequency,1000/.9,1e-10);assert.throws(()=>createModel('doppler',{waveSpeed:100,sourceVelocity:100}));});
test('tiny drag projectile prediction remains continuous with vacuum solution',()=>{const a=createModel('projectile',{drag:0}).profile(),b=createModel('projectile',{drag:1e-14}).profile();near(a.points[100].x,b.points[100].x,1e-8);near(a.points[100].y,b.points[100].y,1e-8);});
test('elliptical reference starts at the actual initial separation and apocenter orientation',()=>{const m=createModel('orbits',{velocityFactor:.8});near(m.profile().points[0].x,m.config.orbitalRadius,1e-7);});
test('Lorentz straight-line and negligible-field limits keep finite bounded profiles',()=>{for(const charge of [0,1e-320]){const m=createModel('lorentz',{charge});assert.ok(m.profile().points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));const r=run(m,1);near(r.x,1,1e-10);near(r.y,0,1e-10);}});
test('DC open switch supports legacy configuration without invented current',()=>{const m=createModel('dc-circuit',{closed:false});near(m.measure().current,0);near(m.measure().power,0);assert.ok(m.profile().points.every(p=>p.y===0));});
test('virtual lens construction marks backward extensions and shows outgoing rays',()=>{const m=createModel('thin-lens',{focalLength:.1,objectDistance:.05});assert.ok(m.scene().segments.some(s=>s.dash));assert.ok(m.scene().segments.some(s=>s.a.x===0&&s.b.x>0));});
test('RLC critical and overdamped cases match analytical profiles, and half steps converge',()=>{for(const resistance of [20,50]){const a=createModel('rlc-circuit',{resistance}),b=createModel('rlc-circuit',{resistance});for(let i=0;i<1000;i++){a.step();b.step(b.dt/2);b.step(b.dt/2);}near(a.measure().charge,b.measure().charge,2e-9);near(a.measure().totalEnergy+a.measure().heat,.5,1e-8);}});
test('all numeric parameter boundaries either reject meaningfully or remain finite',()=>{for(const d of EXPERIMENTS)for(const p of d.parameters.filter(p=>p.type==='number'))for(const edge of [p.min,p.max]){let m;try{m=createModel(d.id,{[p.key]:edge});}catch(e){assert.ok(e.message.length>10);continue;}for(let i=0;i<40&&m.dynamic;i++)m.step();assert.ok(Object.values(m.measure()).every(v=>v===null||Number.isFinite(v)),`${d.id}.${p.key}=${edge}`);assert.ok(m.profile().points.every(p=>Number.isFinite(p.x)&&(p.y===null||Number.isFinite(p.y))),`profile ${d.id}.${p.key}=${edge}`);}});
test('static analytical laboratories never create a fictitious physical time history',()=>{for(const d of EXPERIMENTS.filter(d=>d.dynamic===false)){const m=createModel(d.id),before=m.measure();for(let i=0;i<100;i++)m.step();assert.deepEqual(m.measure(),before);assert.equal(m.time,0);}});
test('every model rejects malformed, nonfinite and unsupported parameter input',()=>{for(const d of EXPERIMENTS){for(const bad of [null,[],new Date(),{constructor:1}])assert.throws(()=>createModel(d.id,bad));const p=d.parameters.find(p=>p.type==='number');for(const value of [NaN,Infinity,-Infinity,'1'])assert.throws(()=>createModel(d.id,{[p.key]:value}));}assert.throws(()=>createModel('unknown'));assert.equal(pack.validate('unknown').ok,false);});
test('independent copied models remain byte-identical and have no cross-game runtime imports',()=>{for(const f of ['motion','gravity','waves','electricity']){const copy=readFileSync(new URL(`../src/physics/reused/${f}.js`,import.meta.url),'utf8'),old=readFileSync(new URL(`../../physica/labs/${f}.js`,import.meta.url),'utf8');assert.equal(copy,old);assert.doesNotMatch(copy,/\bimport\b[^;]*physica/);}});
test('review regression: nonelliptical orbit profiles never become spatial curves with energy coordinates',()=>{
 for(const velocityFactor of [0,Math.SQRT2,2.5]){
  const m=createModel('orbits',{velocityFactor}),profile=m.profile(),scene=m.scene();
  assert.equal(profile.x.unit,'m');assert.equal(profile.y.unit,'J/kg');
  assert.equal(scene.unit,'m');assert.equal(scene.curves?.length??0,0,'Specific potential must not be drawn as metres');
  assert.match(scene.caption,/specific potential.*separate/i);
 }
 const ellipse=createModel('orbits',{velocityFactor:.8});assert.equal(ellipse.profile().y.unit,'m');assert.equal(ellipse.scene().curves.length,1);
});
test('review regression: positive thin-lens focal pole separates graph branches without a joining segment',()=>{
 for(const focalLength of [.01,.1,.137,1]){
  const p=createModel('thin-lens',{focalLength}).profile();
  assert.ok(p.points.some(q=>q.x===focalLength&&q.y===null),'The focal singularity must be an explicit graph gap');
  for(let i=1;i<p.points.length;i++){const a=p.points[i-1],b=p.points[i];assert.ok(!(a.y!==null&&b.y!==null&&a.x<focalLength&&b.x>focalLength),'No finite plotted segment may cross the focal plane');}
  for(const q of p.points.filter(q=>q.y!==null))near(1/focalLength,1/q.x+1/q.y,1e-10);
 }
 const diverging=createModel('thin-lens',{focalLength:-.1}).profile();assert.ok(diverging.points.every(p=>p.y<0));
});
test('review regression: prism triangle and face refractions satisfy selected apex, Snell and minimum deviation',()=>{
 const vector=s=>({x:s.b.x-s.a.x,y:s.b.y-s.a.y});
 const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,(a.x*b.x+a.y*b.y)/(Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y)))));
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const onLine=(p,a,b)=>near(cross({x:p.x-a.x,y:p.y-a.y},{x:b.x-a.x,y:b.y-a.y}),0,1e-12);
 for(const prismAngle of [Math.PI/3,.4,1.1])for(const wavelength of [400e-9,700e-9]){
  const m=createModel('dispersion',{prismAngle,wavelength}),s=m.scene(),[apex,left,right]=s.polygons[0].points;
  near(angle({x:left.x-apex.x,y:left.y-apex.y},{x:right.x-apex.x,y:right.y-apex.y}),prismAngle,1e-12);
  const incident=s.segments.find(p=>p.label==='Incident'),internal=s.segments.find(p=>p.label==='Internal'),emergent=s.segments.find(p=>p.label==='Emergent');assert.ok(incident&&internal&&emergent,'Refraction must occur at both prism faces');
  assert.deepEqual(incident.b,internal.a);assert.deepEqual(internal.b,emergent.a);
  onLine(internal.a,apex,left);onLine(internal.b,apex,right);
  const face1={x:apex.x-left.x,y:apex.y-left.y},face2={x:right.x-apex.x,y:right.y-apex.y},inward={x:face1.y,y:-face1.x},outward={x:-face2.y,y:face2.x};
  const i=angle(vector(incident),inward),r1=angle(vector(internal),inward),r2=angle(vector(internal),outward),e=angle(vector(emergent),outward);
  near(Math.sin(i),m.measure().index*Math.sin(r1),1e-12);near(m.measure().index*Math.sin(r2),Math.sin(e),1e-12);
  near(r1,r2,1e-12);near(r1+r2,prismAngle,1e-12);near(angle(vector(incident),vector(emergent)),m.measure().minimumDeviation,1e-12);
 }
});
