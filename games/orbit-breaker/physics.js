/* Shared by the browser and the headless physics tests. World: 1000 × 1000. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrbitPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const R=442, MAX_SPEED=520, FIELD=380, STEP=1/120;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function ball(x=500,y=660,vx=210,vy=-90) { return {x,y,px:x,py:y,vx,vy,r:9,trail:[],invulnerable:0,orbit:0}; }
  function force(x,y,a,strength=1) {
    if(!a) return {x:0,y:0};
    const dx=a.x-x,dy=a.y-y,d=Math.hypot(dx,dy);
    if(d>=FIELD||d<.001) return {x:0,y:0};
    const f=Math.min(1500,11000000/(d*d+8500))*Math.min(1,(FIELD-d)/75)*strength;
    return {x:dx/d*f,y:dy/d*f};
  }
  function stepBall(b,dt,obstacles=[],wells=[],attractor=null,onHit=()=>{},strength=1) {
    b.px=b.x; b.py=b.y;
    let f=force(b.x,b.y,attractor,strength),ax=f.x,ay=f.y;
    for(const w of wells) { f=force(b.x,b.y,w,w.strength||.24); ax+=f.x;ay+=f.y; }
    const acc=Math.hypot(ax,ay); if(acc>1800) {ax*=1800/acc;ay*=1800/acc;}
    b.vx=(b.vx+ax*dt)*Math.exp(-.012*dt); b.vy=(b.vy+ay*dt)*Math.exp(-.012*dt);
    let speed=Math.hypot(b.vx,b.vy);
    if(speed>MAX_SPEED) {b.vx*=MAX_SPEED/speed;b.vy*=MAX_SPEED/speed;}
    if(speed<95) {const angle=speed>1?Math.atan2(b.vy,b.vx):-Math.PI/3;b.vx+=Math.cos(angle)*90*dt;b.vy+=Math.sin(angle)*90*dt;}
    // At most 2.2 world units per microstep; narrower than any collision radius.
    const substeps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/2.2));
    for(let s=0;s<substeps;s++) {
      b.x+=b.vx*dt/substeps;b.y+=b.vy*dt/substeps;
      for(const o of obstacles) {
        if(o.dead || o.type==='ring') continue;
        const dx=b.x-o.x,dy=b.y-o.y,d=Math.hypot(dx,dy),r=b.r+o.r;
        if(d<r) {
          const nx=d>.0001?dx/d:1,ny=d>.0001?dy/d:0;
          b.x=o.x+nx*(r+.02);b.y=o.y+ny*(r+.02);
          const ovx=o.vx||0,ovy=o.vy||0,v=(b.vx-ovx)*nx+(b.vy-ovy)*ny;
          if(v<0) {b.vx-=1.92*v*nx;b.vy-=1.92*v*ny;onHit(o,b);}
        }
      }
      const dx=b.x-500,dy=b.y-500,d=Math.hypot(dx,dy);
      if(d>R-b.r) {
        const nx=dx/d,ny=dy/d;b.x=500+nx*(R-b.r);b.y=500+ny*(R-b.r);
        const v=b.vx*nx+b.vy*ny;
        if(v>0) {b.vx-=1.94*v*nx;b.vy-=1.94*v*ny;onHit({type:'wall',angle:Math.atan2(ny,nx),x:b.x,y:b.y},b);}
      }
    }
    speed=Math.hypot(b.vx,b.vy);if(speed>MAX_SPEED) {b.vx*=MAX_SPEED/speed;b.vy*=MAX_SPEED/speed;}
    if(![b.x,b.y,b.vx,b.vy].every(Number.isFinite)) Object.assign(b,ball());
    b.invulnerable=Math.max(0,b.invulnerable-dt);
  }
  return {R,MAX_SPEED,FIELD,STEP,ball,force,stepBall,clamp};
});
