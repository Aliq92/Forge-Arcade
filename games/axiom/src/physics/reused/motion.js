/** Translational SI mechanics. See MOTION.md for coordinates and model limits. */
export const LAB_ID = 'motion';
const rad = d => d * Math.PI / 180;
const clone = v => JSON.parse(JSON.stringify(v));
const number = (key,label,unit,min,max,step,value) => ({key,label,unit,min,max,step,default:value});
const mass=()=>number('mass','Mass','kg',.05,100, .05,2);
const gravity=()=>number('g','Gravity','m/s²',0,30,.01,9.81);
const drag=()=>number('drag','Linear air drag','kg/s',0,10,.01,0);
const force=()=>number('force','Applied force','N',-100,100,.1,4);
const initial=()=>number('initialSpeed','Initial velocity','m/s',-30,30,.1,0);
export const PARAMETERS = {
 projectile:[{...mass(),default:1},gravity(),number('speed','Launch speed','m/s',0,100,.1,15),number('angle','Launch angle','degrees',0,90,1,45),drag(),number('y0','Launch height','m',0,50,.1,0)],
 incline:[mass(),gravity(),number('theta','Incline angle','degrees',0,80,1,25),number('muStatic','Static friction coefficient','1',0,2,.01,.3),number('muKinetic','Kinetic friction coefficient','1',0,2,.005,.2),initial(),{...force(),default:0}],
 force:[mass(),force(),drag(),initial(),gravity()],
 collision:[number('m1','First mass','kg',.05,100,.05,1),number('m2','Second mass','kg',.05,100,.05,1),number('u1','First initial velocity','m/s',-30,30,.1,3),number('u2','Second initial velocity','m/s',-30,30,.1,0),number('restitution','Restitution','1',0,1,.01,1)],
 free:[gravity(),drag(),number('restitution','Restitution','1',0,1,.01,.8),number('width','Box width','m',5,100,1,20),number('height','Box height','m',5,100,1,12)]
};
const defaults=mode=>Object.fromEntries(PARAMETERS[mode].map(p=>[p.key,p.default]));
const teaching=[
 ['M1','projectile','Projectile Motion','Measure flight time, range, and maximum height.','How does doubling launch speed change range at the same angle?','Horizontal and vertical motion share time. Gravity changes vertical velocity; linear air drag also reduces horizontal speed. Ideal comparisons apply only when drag is zero.',['x = v₀ cos(α)t','y = y₀ + v₀ sin(α)t − ½gt²','Fdrag = −b v'],['Uniform gravity; no wind or spin. Ground contact refers to the point at the body center.']],
 ['M2','incline','Friction & Inclined Planes','Distinguish static holding from kinetic sliding and stopping.','Will this block slide when the downhill force exceeds maximum static friction?','Downhill is the positive distance direction. Static friction can balance a small drive; moving friction opposes sliding. Increasing kinetic friction shortens the stopping distance on a horizontal surface.',['N = mg cos(θ)','|fstatic| ≤ μs N','fkinetic = −μk N sign(v)','ma = mg sin(θ) + F + f'],['Infinite plane; applied force is parallel to the plane. No rotation.']],
 ['M3','force',"Newton’s Second Law",'Compare acceleration with applied force and mass.','At fixed force, what happens to acceleration when mass doubles?','Net force sets acceleration. With linear air drag, the opposing force grows with velocity, approaching a terminal speed when it balances the applied force.',['Fnet = F − b v','a = Fnet / m','KE = ½mv²'],['Horizontal frictionless support balances weight; drag is idealized linear drag.']],
 ['M4','collision','Collisions & Momentum','Measure contact velocities, momentum, and the mechanical energy converted at contact.','For equal masses and elastic contact, what velocity will the initially stationary object gain?','Contact impulses act equally and oppositely, conserving pair momentum. Restitution controls separation speed; lost translational kinetic energy becomes unmodeled deformation, heat, and sound.',['m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂','v₂ − v₁ = e(u₁ − u₂)','Edissipated = KEbefore − KEafter'],['One-dimensional, isolated, smooth pair; point translation with finite contact radii.']]
];
export const EXPERIMENTS=teaching.map(([id,mode,title,objective,prediction,explanation,equations,assumptions])=>({id,lab:LAB_ID,mode,title,objective,prediction,explanation,equations,assumptions,defaults:defaults(mode),graph:{x:'time',y:mode==='collision'?'v2':'speed'}}));
const safeId=s=>typeof s==='string'&&/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/.test(s)&&!['constructor','prototype','__proto__'].includes(s);
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&(Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null);
const freeDefaults=()=>[
 {id:'a',type:'ball',mass:1,x:4,y:6,vx:3,vy:0,radius:.45,color:'#ffad5c'},
 {id:'b',type:'block',mass:2,x:9,y:3,vx:-1,vy:1,radius:.6,color:'#67def1'}
];
export function normalizeConfig(mode,params={}) {
 const errors=[];
 if(!Object.hasOwn(PARAMETERS,mode))return {ok:false,config:null,errors:['Unknown motion experiment mode.']};
 if(!plain(params))return {ok:false,config:null,errors:['Parameters must be a plain object.']};
 const config=defaults(mode), allowed=new Set([...Object.keys(config),...(mode==='free'?['bodies']:[])]);
 for(const key of Object.keys(params))if(!allowed.has(key))errors.push(`Unsupported motion parameter: ${key}.`);
 for(const p of PARAMETERS[mode])if(Object.hasOwn(params,p.key)){
  const v=params[p.key];if(typeof v!=='number'||!Number.isFinite(v)||v<p.min||v>p.max)errors.push(`${p.label} must be finite and between ${p.min} and ${p.max} ${p.unit}.`);else config[p.key]=v;
 }
 if(mode==='incline'&&config.muKinetic>config.muStatic)errors.push('Kinetic friction must not exceed static friction in this Coulomb model.');
 if(mode==='free'){
  const input=Object.hasOwn(params,'bodies')?params.bodies:freeDefaults();config.bodies=[];
  if(!Array.isArray(input)||input.length>12)errors.push('Free Mode supports an array of at most 12 bodies.');
  else{
   const ids=new Set();
   for(const item of input){
    if(!plain(item)){errors.push('Each body must be a plain object.');continue;}
    const field=(key,fallback)=>Object.hasOwn(item,key)?item[key]:fallback;
    const b={id:item.id,type:item.type,mass:field('mass',1),x:field('x',2),y:field('y',2),vx:field('vx',0),vy:field('vy',0),radius:field('radius',.4),color:field('color','#ffad5c')};
    if(Object.keys(item).some(k=>!Object.hasOwn(b,k)))errors.push('Body has unsupported fields.');
    if(!safeId(b.id)||ids.has(b.id))errors.push('Body IDs must be unique safe identifiers.');ids.add(b.id);
    if(!['ball','block'].includes(b.type))errors.push('Body type must be ball or block.');
    const valid=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
    if(!valid(b.mass,.05,100)||!valid(b.radius,.1,1.5)||!valid(b.x,b.radius,config.width-b.radius)||!valid(b.y,b.radius,config.height-b.radius)||!valid(b.vx,-30,30)||!valid(b.vy,-30,30))errors.push('Body mass, radius, position, or velocity is outside the supported SI bounds.');
    if(typeof b.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(b.color))errors.push('Body color must be a six-digit hex color.');
    config.bodies.push(b);
   }
  }
 }
 return {ok:errors.length===0,config:errors.length?null:config,errors};
}
const body=(id,type,mass,x,y,vx=0,vy=0,radius=.35)=>({id,type,mass,x,y,vx,vy,radius,color:id==='b'?'#67def1':'#ffad5c',ax:0,ay:0});
// Exact solution over h for a constant drive acceleration and linear −b v drag.
function advance(x,v,a,k,h){
 if(k===0)return [x+v*h+.5*a*h*h,v+a*h];
 const z=k*h,q=-Math.expm1(-z);
 // Stable exponential integrator, including arbitrarily small positive drag.
 const p1=z<1e-4?1-z/2+z*z/6-z*z*z/24:q/z;
 const p2=z<1e-4?.5-z/6+z*z/24-z*z*z/120:(z-q)/(z*z);
 return [x+v*h*p1+a*h*h*p2,v*Math.exp(-z)+a*h*p1];
}
const energy=b=>.5*b.mass*(b.vx*b.vx+b.vy*b.vy);
export function createModel(mode,params={}) {
 const result=normalizeConfig(mode,params);if(!result.ok)throw new Error(result.errors.join(' '));
 const c=result.config;
 const m={lab:LAB_ID,mode,config:clone(c),time:0,dt:1/240,clockRate:1,valid:true,complete:false,warnings:[],theory:{},state:{bodies:[],landed:false,collisionOccurred:false,stopped:false,forces:[],distance:0,dissipatedEnergy:0,maxHeight:c.y0??0,flightTime:null,range:null}};
 const s=m.state;
 if(mode==='projectile'){
  s.bodies=[body('a','ball',c.mass,0,c.y0,c.speed*Math.cos(rad(c.angle)),c.speed*Math.sin(rad(c.angle)),.2)];
  if(c.g>0&&c.drag===0){const vy=s.bodies[0].vy,t=(vy+Math.sqrt(vy*vy+2*c.g*c.y0))/c.g;m.theory={range:s.bodies[0].vx*t,flightTime:t,maxHeight:c.y0+vy*vy/(2*c.g)};}
  else if(c.drag>0)m.warnings.push('Linear drag is an idealized model; the vacuum projectile formulas do not apply.');
 }else if(mode==='incline'){
  s.bodies=[body('a','block',c.mass,0,0,c.initialSpeed*Math.cos(rad(c.theta)),-c.initialSpeed*Math.sin(rad(c.theta)))];s.alongVelocity=c.initialSpeed;s.theta=rad(c.theta);s.plane={angle:s.theta,origin:{x:0,y:0}};
 }else if(mode==='force')s.bodies=[body('a','block',c.mass,0,0,c.initialSpeed)];
 else if(mode==='collision'){
  s.bodies=[body('a','ball',c.m1,-2,.35,c.u1),body('b','ball',c.m2,2,.35,c.u2)];
  m.theory={v1:(c.m1*c.u1+c.m2*c.u2-c.m2*c.restitution*(c.u1-c.u2))/(c.m1+c.m2),v2:(c.m1*c.u1+c.m2*c.u2+c.m1*c.restitution*(c.u1-c.u2))/(c.m1+c.m2)};
 }else{
  s.bodies=clone(c.bodies).map(b=>({...b,ax:0,ay:0}));
  s.bounds={width:c.width,height:c.height};
  m.warnings.push('Free bodies translate without spin. Ball and block contacts both use circular envelopes; no face contact or rotational energy. Fixed walls exchange momentum with the box. Simultaneous contacts use a bounded sequential impulse approximation.');
  if(s.bodies.some((a,i)=>s.bodies.slice(i+1).some(bb=>Math.hypot(bb.x-a.x,bb.y-a.y)<a.radius+bb.radius)))m.warnings.push('Initial bodies overlap. Contact position correction is approximate; separate objects for clean measurements.');
 }
 const initialMomentum=s.bodies.reduce((p,b)=>p+b.mass*b.vx,0);
 const initialEnergy=s.bodies.reduce((e,b)=>e+energy(b)+(mode==='projectile'||mode==='free'?b.mass*c.g*b.y:0),0);
 const setForces=()=>{
  if(mode==='free')for(const q of s.bodies){q.ax=-c.drag*q.vx/q.mass;q.ay=-c.g-c.drag*q.vy/q.mass;}
  const b=s.bodies[0];s.forces=[];if(!b)return;
  let weight=0,normal=0,friction=0,fx=0,fy=0;
  const add=(label,x,y)=>s.forces.push({label,x,y,unit:'N',bodyId:b.id});
  if(mode==='projectile'||mode==='free'){
   weight=b.mass*c.g;add('Weight',0,-weight);add('Air drag',-c.drag*b.vx,-c.drag*b.vy);fx=-c.drag*b.vx;fy=-weight-c.drag*b.vy;
  }else if(mode==='force'){
   weight=normal=b.mass*c.g;add('Weight',0,-weight);add('Normal',0,normal);add('Applied',c.force,0);add('Air drag',-c.drag*b.vx,0);fx=c.force-c.drag*b.vx;
  }else if(mode==='incline'){
   const t=s.theta,N=b.mass*c.g*Math.cos(t),drive=b.mass*c.g*Math.sin(t)+c.force,v=s.alongVelocity;
   friction=Math.abs(v)<1e-11&&Math.abs(drive)<=c.muStatic*N?-drive:-c.muKinetic*N*Math.sign(Math.abs(v)>1e-11?v:drive);
   weight=b.mass*c.g;normal=N;const along=drive+friction;fx=along*Math.cos(t);fy=-along*Math.sin(t);
   add('Weight',0,-weight);add('Normal',N*Math.sin(t),N*Math.cos(t));add('Applied',c.force*Math.cos(t),-c.force*Math.sin(t));add('Friction',friction*Math.cos(t),-friction*Math.sin(t));
  }
  add('Net',fx,fy);b.ax=fx/b.mass;b.ay=fy/b.mass;s.weight=weight;s.normalForce=normal;s.frictionForce=Math.abs(friction);s.netForce=Math.hypot(fx,fy);
 };
 setForces();
 m.step=(h=m.dt)=>{
  if(m.complete||!m.valid)return;
  if(typeof h!=='number'||!Number.isFinite(h)||Math.abs(h-m.dt)>1e-12)throw new Error('Motion uses its fixed physical timestep.');
  const b=s.bodies[0];let elapsed=h;
  if(mode==='projectile'){
   const old={...b},k=c.drag/c.mass;
   let [nx,nvx]=advance(b.x,b.vx,0,k,h),[ny,nvy]=advance(b.y,b.vy,-c.g,k,h);
   if(b.vy>0&&nvy<=0){
    let lo=0,hi=h;for(let i=0;i<45;i++){const t=(lo+hi)/2;if(advance(old.y,old.vy,-c.g,k,t)[1]>0)lo=t;else hi=t;}
    s.maxHeight=Math.max(s.maxHeight,advance(old.y,old.vy,-c.g,k,(lo+hi)/2)[0]);
   }
   s.maxHeight=Math.max(s.maxHeight,ny);
   if(ny<=0&&(old.y>0||nvy<0||old.vy<=0)){
    let lo=0,hi=h;for(let i=0;i<48;i++){const t=(lo+hi)/2;if(advance(old.y,old.vy,-c.g,k,t)[0]>0)lo=t;else hi=t;}
    elapsed=(lo+hi)/2;[nx,nvx]=advance(old.x,old.vx,0,k,elapsed);[,nvy]=advance(old.y,old.vy,-c.g,k,elapsed);ny=0;
    s.landed=true;s.range=nx;s.flightTime=m.time+elapsed;m.complete=true;
   }
   Object.assign(b,{x:nx,y:ny,vx:nvx,vy:nvy});s.dissipatedEnergy=Math.max(0,initialEnergy-energy(b)-c.mass*c.g*b.y);
  }else if(mode==='force'){
   const oldKE=energy(b),oldX=b.x;[b.x,b.vx]=advance(b.x,b.vx,c.force/c.mass,c.drag/c.mass,h);
   s.dissipatedEnergy+=Math.max(0,c.force*(b.x-oldX)-(energy(b)-oldKE));
  }else if(mode==='incline'){
   const N=c.mass*c.g*Math.cos(s.theta),drive=c.mass*c.g*Math.sin(s.theta)+c.force;
   let v=s.alongVelocity,d=s.distance,friction=0;
   const moving=Math.abs(v)>1e-11,holding=!moving&&Math.abs(drive)<=c.muStatic*N;
   if(!holding){
    friction=-c.muKinetic*N*Math.sign(moving?v:drive);const a=(drive+friction)/c.mass;
    if(moving&&v*a<0&&Math.abs(v/a)<=h){
     const stop=-v/a;d+=v*stop+.5*a*stop*stop;s.dissipatedEnergy+=Math.abs(friction*(d-s.distance));v=0;
     if(Math.abs(drive)>c.muStatic*N){const rem=h-stop,fr=-c.muKinetic*N*Math.sign(drive),ac=(drive+fr)/c.mass,extra=.5*ac*rem*rem;d+=extra;v=ac*rem;s.dissipatedEnergy+=Math.abs(fr*extra);}
    }else{const delta=v*h+.5*a*h*h;d+=delta;v+=a*h;s.dissipatedEnergy+=Math.abs(friction*delta);}
   }else v=0;
   s.distance=d;s.alongVelocity=v;s.stopped=Math.abs(v)<1e-11;Object.assign(b,{x:d*Math.cos(s.theta),y:-d*Math.sin(s.theta),vx:v*Math.cos(s.theta),vy:-v*Math.sin(s.theta)});
  }else if(mode==='collision'){
   const [a,b2]=s.bodies,closing=a.vx-b2.vx,gap=b2.x-a.x-a.radius-b2.radius;
   const hit=!s.collisionOccurred&&closing>0?gap/closing:Infinity;
   if(hit>=-1e-12&&hit<=h){
    const t=Math.max(0,hit);a.x+=a.vx*t;b2.x+=b2.vx*t;const before=energy(a)+energy(b2),j=(1+c.restitution)*closing/(1/a.mass+1/b2.mass);
    a.vx-=j/a.mass;b2.vx+=j/b2.mass;s.dissipatedEnergy+=Math.max(0,before-energy(a)-energy(b2));s.collisionOccurred=true;s.contactTime=m.time+t;
    a.x+=a.vx*(h-t);b2.x+=b2.vx*(h-t);
   }else for(const q of s.bodies)q.x+=q.vx*h;
  }else{
   // Substeps bound travel to < one tenth of the smallest contact diameter.
   const speed=Math.max(1,...s.bodies.map(q=>Math.hypot(q.vx,q.vy))),radius=Math.min(.1,...s.bodies.map(q=>q.radius)),count=Math.min(64,Math.max(1,Math.ceil(speed*h/(radius*.2))));
   const step=h/count;
   for(let n=0;n<count;n++){
    for(const q of s.bodies){
     const before=energy(q)+q.mass*c.g*q.y,k=c.drag/q.mass;[q.x,q.vx]=advance(q.x,q.vx,0,k,step);[q.y,q.vy]=advance(q.y,q.vy,-c.g,k,step);
     s.dissipatedEnergy+=Math.max(0,before-energy(q)-q.mass*c.g*q.y);
     for(const [axis,vel,limit] of [['x','vx',c.width],['y','vy',c.height]]){
      if(q[axis]<q.radius){q[axis]=q.radius;if(q[vel]<0){const ke=energy(q);q[vel]*=-c.restitution;s.dissipatedEnergy+=ke-energy(q);}}
      if(q[axis]>limit-q.radius){q[axis]=limit-q.radius;if(q[vel]>0){const ke=energy(q);q[vel]*=-c.restitution;s.dissipatedEnergy+=ke-energy(q);}}
     }
    }
    for(let i=0;i<s.bodies.length;i++)for(let j=i+1;j<s.bodies.length;j++){
     const a=s.bodies[i],bb=s.bodies[j],dx=bb.x-a.x,dy=bb.y-a.y,d=Math.hypot(dx,dy),contact=a.radius+bb.radius;
     if(d>=contact)continue;
     const nx=d>1e-12?dx/d:1,ny=d>1e-12?dy/d:0,inv=1/a.mass+1/bb.mass;
     const overlap=contact-d;a.x-=nx*overlap/(a.mass*inv);a.y-=ny*overlap/(a.mass*inv);bb.x+=nx*overlap/(bb.mass*inv);bb.y+=ny*overlap/(bb.mass*inv);
     const vn=(bb.vx-a.vx)*nx+(bb.vy-a.vy)*ny;
     if(vn<0){const before=energy(a)+energy(bb),impulse=-(1+c.restitution)*vn/inv;a.vx-=impulse*nx/a.mass;a.vy-=impulse*ny/a.mass;bb.vx+=impulse*nx/bb.mass;bb.vy+=impulse*ny/bb.mass;s.dissipatedEnergy+=Math.max(0,before-energy(a)-energy(bb));s.collisionOccurred=true;}
    }
    // Body corrections may push another body through a wall; enforce bounds
    // after all contacts as well. Residual measures disclose positional work.
    for(const q of s.bodies)for(const [axis,vel,limit] of [['x','vx',c.width],['y','vy',c.height]]){
     const lower=q[axis]<q.radius,upper=q[axis]>limit-q.radius;
     if(lower||upper){q[axis]=Math.max(q.radius,Math.min(limit-q.radius,q[axis]));if((lower&&q[vel]<0)||(upper&&q[vel]>0)){const ke=energy(q);q[vel]*=-c.restitution;s.dissipatedEnergy+=ke-energy(q);}}
    }
   }
  }
  m.time+=elapsed;setForces();
  if(s.bodies.some(q=>!Number.isFinite(q.x)||!Number.isFinite(q.y)||Math.abs(q.x)>1e6||Math.abs(q.y)>1e6||Math.abs(q.vx)>1e5||Math.abs(q.vy)>1e5)){
   m.valid=false;m.complete=true;m.warnings.push('Simulation stopped at the supported spatial or speed bound. Reset with a smaller drive.');
  }
 };
 m.measure=()=>{
  const b=s.bodies[0],KE=s.bodies.reduce((e,q)=>e+energy(q),0),PE=(mode==='projectile'||mode==='incline'||mode==='free')?s.bodies.reduce((e,q)=>e+q.mass*(c.g??0)*q.y,0):0;
  const momentum=s.bodies.reduce((p,q)=>p+q.mass*q.vx,0);
  return {time:m.time,x:b?.x??null,y:b?.y??null,vx:b?.vx??null,vy:b?.vy??null,speed:b?Math.hypot(b.vx,b.vy):null,acceleration:b?Math.hypot(b.ax,b.ay):null,netForce:s.netForce??0,weight:s.weight??0,normalForce:s.normalForce??0,frictionForce:s.frictionForce??0,kineticEnergy:KE,potentialEnergy:PE,totalEnergy:KE+PE,dissipatedEnergy:s.dissipatedEnergy,numericalEnergyError:mode==='free'?KE+PE+s.dissipatedEnergy-initialEnergy:null,momentum,momentumError:mode==='collision'?momentum-initialMomentum:null,range:s.range,flightTime:s.flightTime,maxHeight:mode==='projectile'?s.maxHeight:null,distance:mode==='incline'?s.distance:null,v1:mode==='collision'?s.bodies[0].vx:null,v2:mode==='collision'?s.bodies[1].vx:null};
 };
 const labels={time:['Time','s'],x:['Horizontal position','m'],y:['Vertical position','m'],vx:['Horizontal velocity','m/s'],vy:['Vertical velocity','m/s'],speed:['Speed','m/s'],acceleration:['Acceleration magnitude','m/s²'],netForce:['Net force magnitude','N'],weight:['Weight','N'],normalForce:['Normal force','N'],frictionForce:['Friction magnitude','N'],kineticEnergy:['Kinetic energy','J'],potentialEnergy:['Gravitational potential energy','J'],totalEnergy:['Mechanical energy','J'],dissipatedEnergy:['Energy converted from motion','J'],momentum:['Horizontal momentum','kg m/s'],momentumError:['Pair momentum change','kg m/s'],range:['Measured landing range','m'],flightTime:['Measured flight time','s'],maxHeight:['Measured maximum height','m'],distance:['Distance along plane','m'],v1:['First velocity','m/s'],v2:['Second velocity','m/s']};
 m.measurementMeta=Object.fromEntries(Object.entries(labels).map(([key,[label,unit]])=>[key,{label,unit}]));
 m.measurementMeta.numericalEnergyError={label:'Contact energy approximation residual',unit:'J'};
 m.snapshot=()=>clone(s);
 return m;
}
