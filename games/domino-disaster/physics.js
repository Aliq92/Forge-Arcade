// Deterministic sequential-impulse 2D solver; pixels, kilograms, seconds.
const dot=(a,b)=>a.x*b.x+a.y*b.y, cross=(a,b)=>a.x*b.y-a.y*b.x;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createBody(s={}) {
 const shape=s.shape||'rect',mass=s.mass??1,w=s.w??14,h=s.h??56,r=s.r??10;
 const inertia=shape==='circle'?mass*r*r/2:mass*(w*w+h*h)/12;
 return {...s,id:s.id,type:s.type||'body',shape,x:s.x??0,y:s.y??0,angle:s.angle??0,vx:s.vx??0,vy:s.vy??0,omega:s.omega??0,w,h,r,mass,inertia,invMass:s.static||s.pivot?0:1/mass,invInertia:s.static?0:1/inertia,static:!!s.static,friction:s.friction??.5,restitution:s.restitution??.06,asleep:false,quiet:0};
}
export function vertices(b){const c=Math.cos(b.angle),s=Math.sin(b.angle);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:b.x+x*b.w/2*c-y*b.h/2*s,y:b.y+x*b.w/2*s+y*b.h/2*c}));}
function axes(b){return [{x:Math.cos(b.angle),y:Math.sin(b.angle)},{x:-Math.sin(b.angle),y:Math.cos(b.angle)}];}
function inside(p,b,tol=.001){const d=sub(p,b),a=axes(b);return Math.abs(dot(d,a[0]))<=b.w/2+tol&&Math.abs(dot(d,a[1]))<=b.h/2+tol;}
function intersections(a,b,c,d){const r=sub(b,a),s=sub(d,c),z=cross(r,s);if(Math.abs(z)<1e-8)return null;const t=cross(sub(c,a),s)/z,u=cross(sub(c,a),r)/z;return t>=0&&t<=1&&u>=0&&u<=1?{x:a.x+t*r.x,y:a.y+t*r.y}:null;}
export function collide(a,b){
 if(a.shape==='circle'&&b.shape==='circle'){const d=sub(b,a),l=Math.hypot(d.x,d.y),depth=a.r+b.r-l;if(depth<0)return null;const n=l?{x:d.x/l,y:d.y/l}:{x:1,y:0};return {normal:n,depth,contacts:[{x:a.x+n.x*(a.r-depth/2),y:a.y+n.y*(a.r-depth/2)}]};}
 if(a.shape==='circle'||b.shape==='circle'){
  const c=a.shape==='circle'?a:b,r=c===a?b:a,ax=axes(r),d=sub(c,r),lx=dot(d,ax[0]),ly=dot(d,ax[1]);let qx=clamp(lx,-r.w/2,r.w/2),qy=clamp(ly,-r.h/2,r.h/2),dx=lx-qx,dy=ly-qy,l=Math.hypot(dx,dy),depth=c.r-l;
  if(depth<0)return null;if(l<1e-8){if(r.w/2-Math.abs(lx)<r.h/2-Math.abs(ly)){dx=lx>=0?1:-1;dy=0;depth=c.r+r.w/2-Math.abs(lx);qx=dx*r.w/2;}else{dy=ly>=0?1:-1;dx=0;depth=c.r+r.h/2-Math.abs(ly);qy=dy*r.h/2;}l=1;}
  const n={x:(ax[0].x*dx+ax[1].x*dy)/l,y:(ax[0].y*dx+ax[1].y*dy)/l};if(c===a){n.x=-n.x;n.y=-n.y;}return {normal:n,depth,contacts:[{x:r.x+ax[0].x*qx+ax[1].x*qy,y:r.y+ax[0].y*qx+ax[1].y*qy}]};
 }
 const av=vertices(a),bv=vertices(b);let depth=Infinity,n;
 for(const axis of [...axes(a),...axes(b)]){const ap=av.map(p=>dot(p,axis)),bp=bv.map(p=>dot(p,axis));const overlap=Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp));if(overlap<0)return null;if(overlap<depth){depth=overlap;n={...axis};}}
 if(dot(sub(b,a),n)<0){n.x=-n.x;n.y=-n.y;}
 const points=[...av.filter(p=>inside(p,b)),...bv.filter(p=>inside(p,a))];for(let i=0;i<4;i++)for(let j=0;j<4;j++){const p=intersections(av[i],av[(i+1)%4],bv[j],bv[(j+1)%4]);if(p)points.push(p);}
 // Project the overlap polygon to the contact plane and retain tangent extremes.
 const tangent={x:-n.y,y:n.x},plane=(Math.max(...av.map(p=>dot(p,n)))+Math.min(...bv.map(p=>dot(p,n))))/2;
 points.sort((p,q)=>dot(p,tangent)-dot(q,tangent));const extremes=points.length?[points[0],points[points.length-1]]:[{x:(a.x+b.x)/2,y:(a.y+b.y)/2}];const contacts=extremes.map(p=>{const d=plane-dot(p,n);return{x:p.x+n.x*d,y:p.y+n.y*d};});if(Math.hypot(contacts[0].x-contacts.at(-1).x,contacts[0].y-contacts.at(-1).y)<.01)contacts.pop();
 return {normal:n,depth,contacts};
}
function apply(b,j,p){if(b.static)return;b.vx+=j.x*b.invMass;b.vy+=j.y*b.invMass;b.omega+=cross(sub(p,b),j)*b.invInertia;}
export class PhysicsWorld{
 constructor({gravity=800}={}){this.gravity=gravity;this.bodies=[];this.time=0;this.stepCount=0;this.contacts=[];this.metrics={pairs:0,contacts:0,substeps:0,stepMs:0,activeBodies:0};}
 add(b){this.bodies.push(b);return b;}find(id){return this.bodies.find(b=>b.id===id);}
 impulse(body,j,p){const b=typeof body==='string'?this.find(body):body;if(!b||b.static)return;apply(b,j,p||b);b.asleep=false;b.quiet=0;}
 step(dt=1/120){const begin=performance.now();let maxMove=0;for(const b of this.bodies)if(!b.static)maxMove=Math.max(maxMove,(Math.hypot(b.vx,b.vy)+Math.abs(b.omega)*Math.max(b.w,b.h)/2)*dt);const steps=clamp(Math.ceil(maxMove/3),2,24),h=dt/steps;this.contacts=[];let pairs=0;
 for(let k=0;k<steps;k++){
  for(const b of this.bodies){if(b.static||b.asleep)continue;if(!b.pivot)b.vy+=this.gravity*h;const speed=Math.hypot(b.vx,b.vy);if(speed>1200){b.vx*=1200/speed;b.vy*=1200/speed;}b.omega=clamp(b.omega,-16,16);b.x+=b.vx*h;b.y+=b.vy*h;b.angle+=b.omega*h;if(b.pivot){b.x=b.pivot.x;b.y=b.pivot.y;b.vx=0;b.vy=0;if(Math.abs(b.angle)>(b.maxAngle??.55)){b.angle=clamp(b.angle,-(b.maxAngle??.55),b.maxAngle??.55);b.omega=0;}}}
  const cs=[];for(let i=0;i<this.bodies.length;i++)for(let j=i+1;j<this.bodies.length;j++){const a=this.bodies[i],b=this.bodies[j];if(a.sensor||b.sensor||a.static&&b.static||a.asleep&&b.asleep)continue;const ra=a.shape==='circle'?a.r:Math.hypot(a.w,a.h)/2,rb=b.shape==='circle'?b.r:Math.hypot(b.w,b.h)/2;if(Math.abs(a.x-b.x)>ra+rb||Math.abs(a.y-b.y)>ra+rb)continue;pairs++;const c=collide(a,b);if(c){c.a=a;c.b=b;c.strength=0;cs.push(c);}}
  for(let iter=0;iter<12;iter++)for(const c of cs){const {a,b,normal:n}=c;for(const p of c.contacts){const ar=sub(p,a),br=sub(p,b),va={x:a.vx-a.omega*ar.y,y:a.vy+a.omega*ar.x},vb={x:b.vx-b.omega*br.y,y:b.vy+b.omega*br.x},rv=sub(vb,va),vn=dot(rv,n),den=a.invMass+b.invMass+cross(ar,n)**2*a.invInertia+cross(br,n)**2*b.invInertia;if(!den||vn>=0)continue;const j=-(1+(vn<-35?Math.min(a.restitution,b.restitution):0))*vn/den;const impulse={x:n.x*j,y:n.y*j};apply(a,{x:-impulse.x,y:-impulse.y},p);apply(b,impulse,p);c.strength=Math.max(c.strength,j);if(j>1){a.asleep=false;b.asleep=false;}const t={x:-n.y,y:n.x},vt=dot(rv,t),td=a.invMass+b.invMass+cross(ar,t)**2*a.invInertia+cross(br,t)**2*b.invInertia,jt=clamp(-vt/(td||1),-j*Math.sqrt(a.friction*b.friction),j*Math.sqrt(a.friction*b.friction));apply(a,{x:-t.x*jt,y:-t.y*jt},p);apply(b,{x:t.x*jt,y:t.y*jt},p);}}
  for(const c of cs){const den=c.a.invMass+c.b.invMass;if(den){const v=Math.max(c.depth-.015,0)*.65/den;for(const [b,sign] of [[c.a,-1],[c.b,1]]){b.x+=sign*c.normal.x*v*b.invMass;b.y+=sign*c.normal.y*v*b.invMass;}}this.contacts.push(c);}
 }
 for(const b of this.bodies){if(b.static)continue;b.vx*=.9998;b.omega*=.9997;if(Math.hypot(b.vx,b.vy)<1.2&&Math.abs(b.omega)<.025){b.quiet+=dt;if(b.quiet>.6){b.asleep=true;b.vx=b.vy=b.omega=0;}}else{b.quiet=0;b.asleep=false;}}
 this.time+=dt;this.stepCount++;this.metrics={pairs,contacts:this.contacts.length,substeps:steps,stepMs:performance.now()-begin,activeBodies:this.bodies.filter(b=>!b.static&&!b.asleep).length};
 }
}
