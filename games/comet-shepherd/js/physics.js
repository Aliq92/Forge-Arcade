import {CONFIG} from './config.js';
export function gravityFrom(body,x,y,out={}){
 const dx=body.x-x,dy=body.y-y,r2=dx*dx+dy*dy,soften=CONFIG.MIN_SOFTEN+body.radius*.28;
 let factor=CONFIG.G*body.mass/(r2+soften*soften)**1.5;
 const r=Math.sqrt(r2);
 if(factor*r>CONFIG.MAX_ACCEL)factor=CONFIG.MAX_ACCEL/(r||1);
 out.ax=dx*factor;out.ay=dy*factor;out.r=r;return out;
}
const single={};
export function totalGravity(bodies,x,y,out={}){
 let ax=0,ay=0;
 for(const b of bodies){gravityFrom(b,x,y,single);ax+=single.ax;ay+=single.ay;}
 out.ax=Number.isFinite(ax)?ax:0;out.ay=Number.isFinite(ay)?ay:0;return out;
}
export function flightBodies(system){
 return system._flightBodies||(system._flightBodies=[system.star,...system.planets]);
}
export function advanceOrbits(system,dt){
 for(const p of system.planets){
  p.previousX=p.x;p.previousY=p.y;p.angle+=p.orbitSpeed*dt;
  p.x=system.star.x+Math.cos(p.angle)*p.orbitRadius;p.y=system.star.y+Math.sin(p.angle)*p.orbitRadius;
  for(const m of p.moons||[]){
   m.previousX=m.x;m.previousY=m.y;m.angle+=m.orbitSpeed*dt;
   m.x=p.x+Math.cos(m.angle)*m.orbitRadius;m.y=p.y+Math.sin(m.angle)*m.orbitRadius;
  }
 }
 for(const belt of system.belts||[])for(const a of belt.asteroids){
  a.previousX=a.x;a.previousY=a.y;a.angle+=a.angularSpeed*dt;a.rotation+=a.rotSpeed*dt;
  a.x=system.star.x+Math.cos(a.angle)*a.radial;a.y=system.star.y+Math.sin(a.angle)*a.radial;
 }
}
const first={},last={};
// Shared kick/drift/kick: evaluate gravity at both orbital times without step allocations.
export function stepFlight(state,system,dt){
 const bodies=flightBodies(system);totalGravity(bodies,state.x,state.y,first);
 state.previousX=state.x;state.previousY=state.y;
 state.vx+=first.ax*dt*.5;state.vy+=first.ay*dt*.5;
 state.x+=state.vx*dt;state.y+=state.vy*dt;advanceOrbits(system,dt);
 totalGravity(bodies,state.x,state.y,last);
 state.vx+=last.ax*dt*.5;state.vy+=last.ay*dt*.5;return state;
}
export function cloneFlightSystem(system){
 return {star:{...system.star},planets:system.planets.map(p=>({...p,moons:(p.moons||[]).map(m=>({...m}))})),
 belts:(system.belts||[]).map(b=>({...b,asteroids:b.asteroids.map(a=>({...a}))})),bounds:system.bounds};
}
export function sweptOverlap(x0,y0,x1,y1,bx0,by0,bx1,by1,radius){
 const x=x0-bx0,y=y0-by0,dx=x1-bx1-x,dy=y1-by1-y;
 const d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,-(x*dx+y*dy)/d)):0;
 return (x+dx*t)**2+(y+dy*t)**2<=radius*radius;
}
export function overlapsFlight(state,body,radius){
 return sweptOverlap(state.previousX??state.x,state.previousY??state.y,state.x,state.y,
 body.previousX??body.x,body.previousY??body.y,body.x,body.y,radius);
}
export function flightCollision(state,system){
 if(overlapsFlight(state,system.star,system.star.radius+state.radius))return 'star';
 for(const p of system.planets){
  if(overlapsFlight(state,p,p.radius+state.radius))return 'planet';
  for(const m of p.moons||[])if(overlapsFlight(state,m,m.radius+state.radius))return 'moon';
 }
 for(const belt of system.belts||[])for(const a of belt.asteroids)
 if(!a.hit&&overlapsFlight(state,a,a.radius+state.radius))return 'asteroid';
 return null;
}
export function integrate(state,ax,ay,dt){state.vx+=ax*dt;state.vy+=ay*dt;state.x+=state.vx*dt;state.y+=state.vy*dt;}
export function speed(vx,vy){return Math.hypot(vx,vy);}
