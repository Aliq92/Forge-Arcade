// Independent SI Newtonian N-body lab. No rendering or wall-clock dependencies.
export const LAB_ID='gravity';
export const G=6.67430e-11;
export const EARTH_RADIUS=6.371e6;
const clone=value=>JSON.parse(JSON.stringify(value));
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const plain=value=>value!==null && typeof value==='object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const safeId=value=>typeof value==='string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(value) && !['__proto__','prototype','constructor'].includes(value);
const numeric=(key,label,unit,min,max,step,def)=>({key,label,unit,min,max,step,default:def});
const central=numeric('centralMass','Central mass','kg',1e20,1e28,1e23,5.972e24);
const radius=numeric('orbitalRadius','Initial separation','m',7e6,1e10,1e6,2e7);
const velocity=numeric('velocityFactor','Tangential speed / circular speed','',0,2.5,.01,1);
const strength=numeric('gFactor','Gravity strength × G','',.01,10,.01,1);
const merging={key:'merge',label:'Merge at contact',unit:'',type:'boolean',default:true};
export const PARAMETERS={
  fall:[central,strength,numeric('height','Release height above surface','m',10,1e6,10,1000),{...merging,default:false}],
  circular:[central,radius,velocity,strength,merging],
  elliptical:[central,radius,{...velocity,default:.8},strength,merging],
  threebody:[central,radius,velocity,strength,merging],
  free:[strength,merging],
};
const commonAssumptions=['Two-dimensional Newtonian gravity in SI units; no atmosphere, relativity, tides or self-gravity energy.', 'Spherical bodies attract as point masses outside contact; no force softening.', 'Perfectly inelastic merging conserves mass and linear momentum. Spin and internal energy are not simulated.'];
function descriptor(id,mode,title,objective,prediction,explanation,equations,graphKey) {
  return {id,lab:LAB_ID,mode,title,objective,prediction,explanation,equations,assumptions:commonAssumptions.slice(),defaults:Object.fromEntries(PARAMETERS[mode].map(p=>[p.key,p.default])),graph:{x:'time',y:graphKey}};
}
export const EXPERIMENTS=[
  descriptor('G1','fall','Falling Objects','Measure how gravitational acceleration changes during a near-surface fall.','Will acceleration stay exactly constant as the object falls?','The planet and falling object both accelerate. Acceleration increases as their separation shrinks. The initial g value is a reference, while the graph samples the changing force. Contact ends a trial unless merging is enabled.',['a = GM/r²','U = −GMm/r','v² = 2G(M+m)(1/r − 1/r₀)'],'acceleration'),
  descriptor('G2','circular','Circular Orbits','Balance tangential motion with gravitational acceleration.','What happens if tangential speed is slightly smaller or larger than circular speed?','Circular speed depends on separation and combined mass. Both bodies recoil around their common center of mass. A bound orbit has negative relative specific energy.',['v_c = √(G(M+m)/r)','T = 2π√(r³/[G(M+m)])','ε = v_rel²/2 − G(M+m)/r'],'radius'),
  descriptor('G3','elliptical','Elliptical Orbits','Compare speed and separation along an elliptical orbit.','At which end of an ellipse will the object move fastest?','The default starts at apocenter below circular speed. The object speeds up toward pericenter. Angular momentum and total energy remain approximately constant between contacts; numerical error decreases with smaller timesteps.',['v² = G(M+m)(2/r − 1/a)','r_p = r₀ f²/(2 − f²)','L_z = Σm(xv_y − yv_x)'],'speed'),
  descriptor('G4','threebody','Three-Body Interaction','Observe how an additional gravitating body perturbs an orbit.','Will a small change in one starting velocity leave all future positions unchanged?','The central planet, inner satellite and outer moon all attract one another. Repeat the same setup for deterministic replay, then edit a Free copy to compare nearby initial states. Sensitivity varies by configuration; this hierarchical preset is not a claim that every three-body orbit is chaotic.',['aᵢ = Σⱼ Gmⱼ(rⱼ − rᵢ)/|rⱼ − rᵢ|³','R_COM = Σmᵢrᵢ / Σmᵢ'],'radius'),
];

function validateBodies(input,errors) {
  if(!Array.isArray(input) || input.length<1 || input.length>12) {errors.push('Use 1–12 bodies.');return [];}
  const ids=new Set(),out=[];
  const limits={mass:[1,1e32],x:[-1e13,1e13],y:[-1e13,1e13],vx:[-1e8,1e8],vy:[-1e8,1e8],radius:[1,1e12]};
  const keys=new Set(['id','name','type','mass','x','y','vx','vy','radius','color']);
  input.forEach((b,i)=>{
    if(!plain(b)){errors.push(`Body ${i+1} must be an object.`);return;}
    for(const key of Object.keys(b))if(!keys.has(key))errors.push(`Unsupported body field: ${key}.`);
    if(!safeId(b.id) || ids.has(b.id))errors.push('Body IDs must be safe, unique identifiers.');
    ids.add(b.id);
    if(typeof b.name!=='string' || b.name.length<1 || b.name.length>60)errors.push(`Body ${i+1} needs a name (1–60 characters).`);
    if(!['star','planet','moon','asteroid'].includes(b.type))errors.push(`Body ${i+1} has an unsupported type.`);
    if(typeof b.color!=='string' || !/^#[0-9a-fA-F]{6}$/.test(b.color))errors.push('Body colors must use #rrggbb.');
    for(const [key,[min,max]] of Object.entries(limits))if(typeof b[key]!=='number' || !Number.isFinite(b[key]) || b[key]<min || b[key]>max)errors.push(`Body ${i+1} ${key} must be finite within ${min}…${max}.`);
    out.push({...b});
  });
  for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++)if(Math.hypot(out[j].x-out[i].x,out[j].y-out[i].y)<1e-6)errors.push('Body centers must be separated by at least 1 micrometer; coincident or numerically singular initial states are unsupported.');
  return out;
}
export function normalizeConfig(mode,params={}) {
  const errors=[];
  if(typeof mode!=='string' || !own(PARAMETERS,mode))return {ok:false,config:null,errors:['Unknown gravity experiment.']};
  if(!plain(params))return {ok:false,config:null,errors:['Parameters must be a plain object.']};
  const schema=PARAMETERS[mode],allowed=new Set(schema.map(p=>p.key));
  if(mode==='free')allowed.add('bodies');
  for(const key of Object.keys(params))if(!allowed.has(key))errors.push(`Unsupported gravity parameter: ${key}.`);
  const config={};
  for(const p of schema) {
    const value=own(params,p.key)?params[p.key]:p.default;
    if(p.type==='boolean') {if(typeof value!=='boolean')errors.push(`${p.label} must be true or false.`);}
    else if(typeof value!=='number' || !Number.isFinite(value) || value<p.min || value>p.max)errors.push(`${p.label} must be finite within ${p.min}…${p.max} ${p.unit}.`);
    config[p.key]=value;
  }
  if(mode==='free')config.bodies=validateBodies(own(params,'bodies')?params.bodies:makePreset('circular',EXPERIMENTS[1].defaults),errors);
  return {ok:errors.length===0,config:errors.length?null:config,errors};
}
function makeBody(id,name,type,mass,x,y,vx,vy,radius,color) {return {id,name,type,mass,x,y,vx,vy,radius,color};}
function makePreset(mode,c) {
  const satelliteMass=mode==='fall'?1:1000;
  const r=mode==='fall'?EARTH_RADIUS+c.height:c.orbitalRadius;
  const speed=mode==='fall'?0:c.velocityFactor*Math.sqrt(G*c.gFactor*(c.centralMass+satelliteMass)/r);
  const bodies=[makeBody('primary','Central planet','planet',c.centralMass,0,0,0,0,EARTH_RADIUS,'#986bfa'),makeBody('satellite',mode==='fall'?'Falling object':'Satellite','asteroid',satelliteMass,r,0,0,speed,mode==='fall'?1:2e4,'#49e4ef')];
  if(mode==='threebody') {
    const rMoon=r*3,mMoon=c.centralMass*.01;
    bodies.push(makeBody('moon','Outer moon','moon',mMoon,rMoon,0,0,Math.sqrt(G*c.gFactor*(c.centralMass+mMoon)/rMoon),4e5,'#ffcf73'));
  }
  // Subtract the full system barycenter and bulk velocity: no artificially fixed source.
  const mass=bodies.reduce((s,b)=>s+b.mass,0),com={x:0,y:0,vx:0,vy:0};
  for(const b of bodies)for(const k of Object.keys(com))com[k]+=b.mass/mass*b[k];
  for(const b of bodies)for(const k of Object.keys(com))b[k]-=com[k];
  return bodies;
}
function accelerate(bodies,gravity) {
  for(const b of bodies){b.ax=0;b.ay=0;}
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++) {
    const a=bodies[i],b=bodies[j],dx=b.x-a.x,dy=b.y-a.y,r=Math.hypot(dx,dy),factor=gravity/(r*r*r);
    a.ax+=factor*b.mass*dx;a.ay+=factor*b.mass*dy;
    b.ax-=factor*a.mass*dx;b.ay-=factor*a.mass*dy;
  }
}
function totals(bodies,gravity) {
  let kineticEnergy=0,potentialEnergy=0,angularMomentum=0,mass=0,comX=0,comY=0,px=0,py=0;
  for(const b of bodies){kineticEnergy+=.5*b.mass*(b.vx*b.vx+b.vy*b.vy);angularMomentum+=b.mass*(b.x*b.vy-b.y*b.vx);mass+=b.mass;comX+=b.mass*b.x;comY+=b.mass*b.y;px+=b.mass*b.vx;py+=b.mass*b.vy;}
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)potentialEnergy-=gravity*bodies[i].mass*bodies[j].mass/Math.hypot(bodies[j].x-bodies[i].x,bodies[j].y-bodies[i].y);
  return {kineticEnergy,potentialEnergy,totalEnergy:kineticEnergy+potentialEnergy,angularMomentum,comX:comX/mass,comY:comY/mass,momentumX:px,momentumY:py};
}
const meta={time:['Time','s'],radius:['Relative separation','m'],speed:['Relative speed','m/s'],radialVelocity:['Radial velocity','m/s'],specificEnergy:['Relative specific orbital energy','J/kg'],acceleration:['Satellite acceleration','m/s²'],kineticEnergy:['Kinetic energy','J'],potentialEnergy:['Gravitational potential energy','J'],totalEnergy:['Total mechanical energy','J'],energyDrift:['Energy drift excluding merge discontinuities',''],angularMomentum:['Angular momentum about origin','kg m²/s'],comX:['Center of mass x','m'],comY:['Center of mass y','m'],momentumX:['Momentum x','kg m/s'],momentumY:['Momentum y','kg m/s'],mergeEnergyChange:['Merge mechanical energy change (signed)','J'],mergeKineticLoss:['Kinetic energy converted at merges','J'],mergeAngularMomentumChange:['Unresolved spin / angular momentum change (signed)','kg m²/s']};

export function createModel(mode,params={}) {
  const normalized=normalizeConfig(mode,params);
  if(!normalized.ok)throw new Error(normalized.errors.join(' '));
  const config=normalized.config,gravity=G*config.gFactor;
  const bodies=mode==='free'?clone(config.bodies):makePreset(mode,config);
  accelerate(bodies,gravity);
  const initial=totals(bodies,gravity),a=bodies[0],b=bodies[1];
  const r=b?Math.hypot(b.x-a.x,b.y-a.y):null,mu=b?gravity*(a.mass+b.mass):null;
  const v2=b?(b.vx-a.vx)**2+(b.vy-a.vy)**2:null;
  const semi=b?1/(2/r-v2/mu):null;
  const model={lab:LAB_ID,mode,config:clone(config),time:0,dt:mode==='fall'?.02:5,clockRate:mode==='fall'?1:1000,valid:true,complete:false,warnings:[],
    state:{bodies,merges:0,initialSeparation:r,centerOfMass:{x:initial.comX,y:initial.comY},mergeEnergyChange:0,mergeKineticLoss:0,mergeAngularMomentumChange:0,substeps:0},
    theory:{circularSpeed:b?Math.sqrt(mu/r):null,escapeSpeed:b?Math.sqrt(2*mu/r):null,orbitalPeriod:b && semi>0?2*Math.PI*Math.sqrt(semi**3/mu):null,initialG:b?gravity*a.mass/(r*r):null},
    measurementMeta:Object.fromEntries(Object.entries(meta).map(([key,[label,unit]])=>[key,{label,unit}])),
    measure(){
      const result=totals(this.state.bodies,gravity),[primary,satellite]=this.state.bodies;
      let radius=null,speed=null,radialVelocity=null,specificEnergy=null,acceleration=null;
      if(satellite){const dx=satellite.x-primary.x,dy=satellite.y-primary.y,dvx=satellite.vx-primary.vx,dvy=satellite.vy-primary.vy;radius=Math.hypot(dx,dy);speed=Math.hypot(dvx,dvy);radialVelocity=(dx*dvx+dy*dvy)/radius;specificEnergy=.5*speed*speed-gravity*(primary.mass+satellite.mass)/radius;acceleration=Math.hypot(satellite.ax,satellite.ay);}
      return {time:this.time,...result,radius,speed,radialVelocity,specificEnergy,acceleration,energyDrift:(result.totalEnergy-initial.totalEnergy-this.state.mergeEnergyChange)/(Math.abs(initial.totalEnergy) || Math.abs(initial.kineticEnergy)+Math.abs(initial.potentialEnergy) || 1),mergeEnergyChange:this.state.mergeEnergyChange,mergeKineticLoss:this.state.mergeKineticLoss,mergeAngularMomentumChange:this.state.mergeAngularMomentumChange};
    },
    snapshot(){return clone(this.state);},
    step(dt=this.dt){
      if(typeof dt!=='number' || !Number.isFinite(dt) || dt<=0 || dt>this.dt)throw new Error(`Gravity step must be positive and at most ${this.dt} s.`);
      if(!this.valid || this.complete)return;
      const backup=this.snapshot(),startTime=this.time;
      let elapsed=0,count=0,refined=false;
      const fail=message=>{this.state=backup;this.time=startTime;this.valid=false;warn(message);};
      while(elapsed<dt) {
        const list=this.state.bodies;
        if(resolveContacts()){updateCOM();return;}
        let h=dt-elapsed;
        for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++) {
          const p=list[i],q=list[j],r=Math.hypot(q.x-p.x,q.y-p.y),v=Math.hypot(q.vx-p.vx,q.vy-p.vy);
          h=Math.min(h,.02*Math.sqrt(r**3/(gravity*(p.mass+q.mass))));
          // Bound travel relative to body size to prevent stepping across contact unseen.
          if(v>0)h=Math.min(h,.1*Math.max(p.radius+q.radius,r-(p.radius+q.radius))/v);
        }
        if(h<(dt-elapsed)/2)refined=true;
        if(++count>256 || h<dt/1e8 || !Number.isFinite(h)) {fail('Close encounter exceeds the 256-substep accuracy budget. Increase separation/radii or reduce masses/speeds and reset.');return;}
        // Locate first surface crossing along this Verlet position drift, rather than
        // letting a fast object finish inside a planet. Bisection is only used on contact.
        for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
          const p=list[i],q=list[j],contact=p.radius+q.radius;
          const separation=t=>Math.hypot(q.x-p.x+(q.vx-p.vx)*t+.5*(q.ax-p.ax)*t*t,q.y-p.y+(q.vy-p.vy)*t+.5*(q.ay-p.ay)*t*t);
          if(separation(h)<contact){let lo=0,hi=h;for(let k=0;k<50;k++){const mid=(lo+hi)/2;if(separation(mid)>contact)lo=mid;else hi=mid;}h=hi;}
        }
        for(const p of list){p.vx+=.5*h*p.ax;p.vy+=.5*h*p.ay;p.x+=h*p.vx;p.y+=h*p.vy;}
        // A bounded drift cannot tunnel through spheres; contact is resolved after this kick.
        if(list.some((p,i)=>list.some((q,j)=>j>i && Math.hypot(q.x-p.x,q.y-p.y)===0))) {fail('Unresolved coincident centers; reset with greater separation.');return;}
        accelerate(list,gravity);
        for(const p of list){p.vx+=.5*h*p.ax;p.vy+=.5*h*p.ay;}
        elapsed+=h;this.time=startTime+elapsed;
        if(list.some(p=>![p.x,p.y,p.vx,p.vy,p.ax,p.ay].every(Number.isFinite) || Math.max(Math.abs(p.x),Math.abs(p.y))>1e15 || Math.hypot(p.vx,p.vy)>1e9)) {fail('The simulation exceeded its finite Newtonian working range. Reduce the initial energy and reset.');return;}
        if(resolveContacts()){updateCOM();return;}
      }
      this.time=startTime+dt;this.state.substeps=count;updateCOM();
      if(refined)warn('Close approach: bounded smaller Verlet substeps are active. Energy diagnostics remain available.');
    },
  };
  function warn(message){if(!model.warnings.includes(message))model.warnings.push(message);}
  function updateCOM(){const t=totals(model.state.bodies,gravity);model.state.centerOfMass={x:t.comX,y:t.comY};}
  function resolveContacts(){
    let again=true,before=null;
    while(again){
      again=false;const list=model.state.bodies;
      outer:for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
        const p=list[i],q=list[j];
        if(Math.hypot(q.x-p.x,q.y-p.y)>(p.radius+q.radius)*(1+2e-15))continue;
        if(!config.merge){model.complete=true;warn('Physical contact reached. Trial stopped; no rebound or interior gravity is modeled.');return true;}
        // Account a cascade as one event: its intermediate merged center may
        // coincide with another member, where point-particle potential is undefined.
        if(!before)before=totals(list,gravity);
        const mass=p.mass+q.mass;
        const merged={...p,name:`${p.name} + ${q.name}`.slice(0,60),mass,x:(p.mass*p.x+q.mass*q.x)/mass,y:(p.mass*p.y+q.mass*q.y)/mass,vx:(p.mass*p.vx+q.mass*q.vx)/mass,vy:(p.mass*p.vy+q.mass*q.vy)/mass,radius:Math.cbrt(p.radius**3+q.radius**3),ax:0,ay:0};
        list[i]=merged;list.splice(j,1);
        model.state.merges++;
        warn('Perfectly inelastic merge: mass and linear momentum conserved. Mechanical energy jump is accounted separately; internal heat, self-gravity and spin are unresolved.');
        again=true;break outer;
      }
    }
    if(before){
      const after=totals(model.state.bodies,gravity);
      model.state.mergeEnergyChange+=after.totalEnergy-before.totalEnergy;
      model.state.mergeKineticLoss+=before.kineticEnergy-after.kineticEnergy;
      model.state.mergeAngularMomentumChange+=after.angularMomentum-before.angularMomentum;
      accelerate(model.state.bodies,gravity);
    }
    return false;
  }
  if(mode==='fall')warn('Free fall uses inverse-square gravity, not constant g. Surface contact ends the trial when merging is off.');
  resolveContacts();updateCOM();
  return model;
}
