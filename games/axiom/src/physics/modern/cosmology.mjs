import {C,H,G,PC,MSUN,TAU,num,meta,makeModel,rk4,curve} from '../shared.mjs';
import {descriptor,profile,plotScene} from './util.mjs';
const curvature=c=>1-c.omegaMatter-c.omegaRadiation-c.omegaLambda;
const polynomial=(c,a)=>c.omegaRadiation+c.omegaMatter*a+curvature(c)*a*a+c.omegaLambda*a**4;
const hubble=(c,a)=>c.hubble*Math.sqrt(polynomial(c,a))/(a*a);
function age(c,a){
 // a = x² regularizes the Big Bang endpoint for radiation/matter/curvature.
 const end=Math.sqrt(a),f=x=>x===0?0:2*x**3/Math.sqrt(polynomial(c,x*x));let evaluations=0;
 const simpson=(lo,hi,fl,fm,fh)=>(hi-lo)*(fl+4*fm+fh)/6;
 function integrate(lo,hi,fl,fm,fh,whole,tolerance,depth){
  const mid=(lo+hi)/2,fa=f((lo+mid)/2),fb=f((mid+hi)/2),left=simpson(lo,mid,fl,fa,fm),right=simpson(mid,hi,fm,fb,fh),delta=left+right-whole;
  evaluations+=2;if(evaluations>50000)throw Error('Cosmic age quadrature exceeds its reliable evaluation budget near a loitering branch.');
  // Near loitering, subtraction in the Friedmann polynomial sets a relative
  // roundoff floor; do not recurse indefinitely on evaluator noise.
  if(Math.abs(delta)<=Math.max(15*tolerance,1e-10*Math.abs(left+right)))return left+right+delta/15;
  if(depth===0)throw Error('Cosmic age quadrature cannot resolve this near-turnaround model reliably.');
  return integrate(lo,mid,fl,fa,fm,left,tolerance/2,depth-1)+integrate(mid,hi,fm,fb,fh,right,tolerance/2,depth-1);
 }
 const fl=f(0),fm=f(end/2),fh=f(end),whole=simpson(0,end,fl,fm,fh);
 return integrate(0,end,fl,fm,fh,whole,1e-11*Math.max(1e-4,whole),24)/c.hubble;
}
function validateExpansion(c){
 const k=curvature(c);if(c.omegaMatter===0&&c.omegaRadiation===0&&k<=0)throw Error('This age model requires a finite-age expanding Big Bang branch; pure de Sitter is excluded.');
 // Check all positive stationary points of the quartic Friedmann polynomial,
 // not only a sampled grid, to exclude a forbidden/turnaround interval.
 const d=a=>c.omegaMatter+2*k*a+4*c.omegaLambda*a**3,limit=4.1;
 const pivot=c.omegaLambda>0&&k<0?Math.min(limit,Math.sqrt(-k/(6*c.omegaLambda))):limit;
 const edges=[0,pivot,limit],candidates=[limit,c.initialScale];
 for(let i=1;i<edges.length;i++){let lo=edges[i-1],hi=edges[i];if(hi===lo||d(lo)*d(hi)>=0)continue;let vlo=d(lo);for(let j=0;j<70;j++){const mid=(lo+hi)/2;if(vlo*d(mid)<=0)hi=mid;else{lo=mid;vlo=d(lo);}}candidates.push((lo+hi)/2);}
 if(candidates.some(a=>!(polynomial(c,a)>0)))throw Error('Chosen density parameters have a forbidden or turnaround interval before a = 4.1; this laboratory covers continuously expanding models only.');
}
const expansion=descriptor({id:'expansion',title:'Friedmann expansion under chosen densities',subject:'cosmology',kind:'A',dynamic:true,dt:c=>1/(2400*hubble(c,c.initialScale)),clockRate:c=>.1/hubble(c,c.initialScale),question:'How do matter, radiation, curvature and a cosmological constant change cosmic expansion and age?',parameters:[num('hubble','Present Hubble parameter H₀','1/s',1e-18,4e-18,1e-20,2.2685455026110557e-18),num('omegaMatter','Present matter density Ωm','1',0,2,.01,.3),num('omegaRadiation','Present radiation density Ωr','1',0,1,.00001,.00009),num('omegaLambda','Present cosmological-constant density ΩΛ','1',0,2,.01,.69991),num('initialScale','Initial scale factor (a₀ today = 1)','1',.01,1,.01,.1),num('comovingSeparation','Chosen comoving radial separation','m',PC,1e9*PC,1e6*PC,1e6*PC,'log')],outputs:{scaleFactor:meta('Scale factor','1'),hubbleRate:meta('Hubble rate at current scale','1/s'),age:meta('Model age since Big Bang','s'),omegaCurvature:meta('Present curvature parameter Ωk','1'),matterFraction:meta('Current matter fraction','1'),radiationFraction:meta('Current radiation fraction','1'),lambdaFraction:meta('Current cosmological-constant fraction','1'),curvatureFraction:meta('Current curvature contribution','1'),deceleration:meta('Deceleration parameter q','1'),properSeparation:meta('Proper radial separation aχ','m')},equationIds:['friedmann','redshift','einstein-field'],references:['mit-cosmology','nasa-cosmology','esa-planck'],assumptions:['Homogeneous isotropic FLRW model with separately conserved pressureless matter, radiation and constant Λ; Ωk = 1 − Ωm − Ωr − ΩΛ.','Defaults are an explicitly chosen illustrative near-flat model (H₀ = 70 km/s/Mpc, Ωm = 0.3), not a claim of latest measurements. Course equations are sourced to MIT 2006; Planck is contextual historical evidence.','Age integrates from the Big Bang using constant component equations of state; this omits transitions in relativistic degrees of freedom, massive-neutrino evolution and inflation.','Only continuously expanding branches up to a = 4.1 are accepted; evolution stops at the physical a = 4 boundary. Clock rate is 0.1 initial Hubble time per real second.','Scene uses radial proper separations on equal-time slices; it is not a global embedding of curved three-space.'],explanation:'The Friedmann equation gives H²/H₀² = Ωr/a⁴ + Ωm/a³ + Ωk/a² + ΩΛ. Scale factor is integrated in physical cosmic time with error-controlled RK4 substeps; near loitering, the outer clock step is internally refined. Age at the initial scale is independently integrated from dt = da/(aH).',presets:[{name:'Chosen near-flat mixture',config:{}},{name:'Matter-only flat universe',config:{omegaMatter:1,omegaRadiation:0,omegaLambda:0}},{name:'Radiation-only flat universe',config:{omegaMatter:0,omegaRadiation:1,omegaLambda:0}},{name:'Open matter universe',config:{omegaMatter:.3,omegaRadiation:0,omegaLambda:0}}]});
function expansionRead(m){const c=m.config,a=m.state.scale,p=polynomial(c,a),matter=c.omegaMatter*a/p,rad=c.omegaRadiation/p,lambda=c.omegaLambda*a**4/p,k=curvature(c)*a*a/p;return {scaleFactor:a,hubbleRate:hubble(c,a),age:m.state.initialAge+m.time,omegaCurvature:curvature(c),matterFraction:matter,radiationFraction:rad,lambdaFraction:lambda,curvatureFraction:k,deceleration:matter/2+rad-lambda,properSeparation:a*c.comovingSeparation};}
function advanceExpansion(m,duration){
 const c=m.config,derivative=([a])=>[a*hubble(c,a)];let a=m.state.scale,elapsed=0,attempts=0;
 // For nonnegative matter/radiation/Lambda, H(a) has at most one positive
 // stationary point, a minimum. Its maximum over [a,4] is at an endpoint.
 const maximumH=Math.max(hubble(c,a),hubble(c,4)),limit=1/(128*maximumH);
 let h=Math.min(duration,limit);
 while(elapsed<duration){
  if(++attempts>32768)throw Error('Expansion refinement exceeded its reliable substep budget.');
  h=Math.min(h,duration-elapsed);
  const whole=rk4([a],h,derivative)[0],half=rk4([a],h/2,derivative)[0],refined=rk4([half],h/2,derivative)[0],error=Math.abs(refined-whole)/15,tolerance=1e-12*Math.max(a,refined);
  if(!Number.isFinite(refined)||error>tolerance){h/=2;if(!(h>duration*1e-15))throw Error('Expansion time step cannot be resolved reliably.');continue;}
  a=refined+(refined-whole)/15;elapsed+=h;
  if(error<tolerance/32)h=Math.min(2*h,limit);
 }
 m.state.scale=a;
}
function withExpansionBoundary(model){
 const originalStep=model.step;
 // Terminal time is another independently evaluated age integral, so a final
 // partial step stops the physical clock at the actual a=4 boundary.
 model.step=function(h=this.dt){
  if(!Number.isFinite(h)||h<=0||h>this.dt*4)throw Error('Step is outside the fixed-step domain.');
  if(!this.valid||this.complete)return;
  const remaining=this.state.duration-this.time,actual=Math.min(h,remaining);
  if(actual>0)originalStep.call(this,actual);
  if(h>=remaining){this.time=this.state.duration;this.state.scale=4;this.complete=true;}
 };
 return model;
}
const rotation=descriptor({id:'rotation-curve',title:'Galaxy rotation under explicit mass profiles',subject:'cosmology',status:'approximation',question:'How does an extended mass distribution change circular speed outside the luminous central region?',parameters:[num('baryonMass','Baryonic profile total mass','kg',1e7*MSUN,1e12*MSUN,1e9*MSUN,5e10*MSUN,'log'),num('scaleRadius','Hernquist baryon scale radius','m',100*PC,20000*PC,100*PC,3000*PC),num('haloSpeed','Asymptotic halo speed parameter','m/s',0,400000,1000,180000),num('coreRadius','Halo core radius','m',100*PC,50000*PC,100*PC,5000*PC),num('radius','Selected galactic radius','m',0,200000*PC,1000*PC,10000*PC)],outputs:{circularSpeed:meta('Combined circular speed','m/s'),baryonCircularSpeed:meta('Baryon-only circular speed','m/s'),haloCircularSpeed:meta('Halo-only circular speed','m/s'),enclosedBaryonMass:meta('Enclosed baryon mass','kg'),enclosedHaloMass:meta('Enclosed halo mass','kg'),haloCentralDensity:meta('Phenomenological central halo density','kg/m³')},equationIds:['circular-speed','gravity'],references:['hernquist1990','nasa-cosmology'],assumptions:['Spherical Newtonian mass model; baryons use Mᵦ(<r) = Mᵦr²/(r+a)². This is a Hernquist profile, not a flattened stellar disk.','Halo has ρ(r) = ρ₀/[1+(r/rc)²], with v∞² = 4πGρ₀rc²; it is an untruncated pseudo-isothermal profile.','This is not an observed galaxy fit, a dark-matter particle identification, or a complete competing-gravity comparison. The untruncated halo has infinite total mass; use only the displayed finite radial range.'],explanation:'For spherical enclosed mass, v² = GM(<r)/r. A concentrated finite baryon profile eventually produces a declining speed, while this selected extended halo profile approaches the chosen constant speed.',presets:[{name:'Baryons plus phenomenological halo',config:{}},{name:'Baryons only',config:{haloSpeed:0}},{name:'Broader halo core',config:{coreRadius:15000*PC}}]});
function rotationRead(c,r=c.radius){const baryon=c.baryonMass*(r/(r+c.scaleRadius))**2,x=r/c.coreRadius,shape=x===0?0:x<1e-3?x*x/3-x**4/5+x**6/7:1-Math.atan(x)/x,vb2=r===0?0:G*baryon/r,vh2=c.haloSpeed*c.haloSpeed*shape;return {circularSpeed:Math.sqrt(vb2+vh2),baryonCircularSpeed:Math.sqrt(vb2),haloCircularSpeed:Math.sqrt(vh2),enclosedBaryonMass:baryon,enclosedHaloMass:vh2*r/G,haloCentralDensity:c.haloSpeed*c.haloSpeed/(4*Math.PI*G*c.coreRadius*c.coreRadius)};}
const redshift=descriptor({id:'redshift',title:'Cosmological wavelength and photon energy',subject:'cosmology',question:'How does the ratio of scale factors connect an emitted wavelength to its observed wavelength?',parameters:[num('redshift','Cosmological redshift z','1',0,20,.1,3),num('wavelength','Rest-frame emitted wavelength','m',1e-10,1e-2,1e-9,500e-9,'log')],outputs:{observedWavelength:meta('Observed wavelength','m'),emittedEnergy:meta('Emitted photon energy','J'),observedEnergy:meta('Observed photon energy','J'),emissionScale:meta('Scale factor at emission (today = 1)','1'),frequencyRatio:meta('Observed / emitted frequency','1')},equationIds:['redshift','friedmann'],references:['mit-cosmology','nasa-cosmology'],assumptions:['Cosmological expansion redshift of freely propagating light with observer scale factor set to one; excludes local peculiar motion, gravitational and instrumental shifts.','At high z this is not converted into a special-relativistic recession velocity. Distance and lookback time need a cosmological model.','Sinusoids illustrate wavelength only; their chosen unit amplitude is not a measured spectrum or a predicted field strength.'],explanation:'The scale-factor relation 1 + z = aobs/aemit = λobs/λemit stretches wavelengths and reduces photon frequency and energy by the same factor.'});
export const experiments=[expansion,rotation,redshift];
export function create(id,input){
 if(id===expansion.id)return withExpansionBoundary(makeModel(expansion,input,{initial:c=>{validateExpansion(c);const initialAge=age(c,c.initialScale);return {scale:c.initialScale,initialAge,duration:age(c,4)-initialAge};},advance:advanceExpansion,read:expansionRead,profile:m=>profile(a=>hubble(m.config,a),.01,4,'Scale factor','1','Hubble rate','1/s','Friedmann H(a) for chosen components'),scene:m=>{const c=m.config,s=c.comovingSeparation,a=m.state.scale;return {bounds:{x:-9*s,y:-2*s,w:18*s,h:4*s},unit:'m (proper radial distance)',caption:'Five comoving tracers along a radial line on a cosmic-time slice. Physical separations scale with a(t); marker sizes are enlarged. These are geometric reference tracers, not observed galaxies.',points:[-2,-1,0,1,2].map(i=>({x:i*a*s,y:0,label:i===0?'reference observer':`${i}χ`})),segments:[{a:{x:-2*a*s,y:0},b:{x:2*a*s,y:0},dash:true}]};},warnings:m=>m.complete?['Evolution stopped at a = 4 and its physical cosmic time.']:[]}));
 if(id===rotation.id){const p=m=>profile(r=>rotationRead(m.config,r).circularSpeed,0,Math.max(2*m.config.radius,10*m.config.scaleRadius,10*m.config.coreRadius),'Radius','m','Circular speed','m/s','Combined model rotation curve');return makeModel(rotation,input,{read:m=>rotationRead(m.config),profile:p,scene:m=>{const q=p(m),s=plotScene(q,'Computed rotation curves for explicit mass profiles; no observations are plotted. Full curve includes a phenomenological halo, dashed curve uses baryons alone.',{points:[{x:m.config.radius,y:rotationRead(m.config).circularSpeed,label:'selected radius'}]});s.curves.push({points:q.points.map(v=>({x:v.x,y:rotationRead(m.config,v.x).baryonCircularSpeed})),dash:true,color:'#ffbd68',label:'baryons only'});return s;}});}
 if(id===redshift.id)return makeModel(redshift,input,{read:m=>{const c=m.config,f=1+c.redshift;return {observedWavelength:c.wavelength*f,emittedEnergy:H*C/c.wavelength,observedEnergy:H*C/(c.wavelength*f),emissionScale:1/f,frequencyRatio:1/f};},profile:m=>profile(z=>m.config.wavelength*(1+z),0,20,'Cosmological redshift','1','Observed wavelength','m','Wavelength scaling at chosen rest wavelength'),scene:m=>{const c=m.config,observed=c.wavelength*(1+c.redshift),xmax=2*observed;return {bounds:{x:0,y:-2.5,w:xmax,h:5},unit:'x: m; y: arbitrary normalized amplitude',caption:'Wavelength comparison at emission (upper) and observation (lower), with arbitrary equal amplitudes. This is a schematic sinusoid, not a measured spectrum; wavelengths obey λobs = (1+z) λemit.',curves:[{points:curve(x=>1.3+.8*Math.sin(TAU*x/c.wavelength),0,xmax,401),label:'emitted',color:'#ffbd68'},{points:curve(x=>-1.3+.8*Math.sin(TAU*x/observed),0,xmax,401),label:'observed'}]};}});
 throw Error('Unknown cosmology experiment.');
}
