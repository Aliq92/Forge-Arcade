// Visual-only bounded pools. No randomness or state here participates in puzzle physics.
export class VisualParticles{
 constructor(capacity=180){this.capacity=capacity;this.slots=Array.from({length:capacity},(_,id)=>({id}));this.active=[];this.free=this.slots.slice();}
 spawn(opts){const p=this.free.pop();if(!p)return;Object.assign(p,opts);this.active.push(p);return p;}
 update(dt){let write=0;for(const p of this.active){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=dt;if(p.life>0)this.active[write++]=p;else this.free.push(p);}this.active.length=write;}
 clear(){for(const p of this.active)this.free.push(p);this.active.length=0;}
}
export class Celebration{
 constructor(){this.particles=Array.from({length:160},()=>({}));this.count=0;this.time=0;this.duration=2;this.serial=0;}
 start(final=false,reduced=false){
  this.count=reduced?16:final?160:108;this.duration=final?2.3:2;this.time=this.duration;this.serial++;this.reduced=reduced;
  const rows=Math.ceil(this.count/12);
  for(let i=0;i<this.count;i++)Object.assign(this.particles[i],{
   x:((i%12)+.5)*80+Math.sin(i*13)*14,y:(Math.floor(i/12)+.5)*540/rows,
   vx:reduced?0:Math.sin(i*3.7)*65,vy:reduced?0:35+(i%7)*11,angle:i,spin:reduced?0:(i%2?1:-1)*(1+i%4),size:2+i%4,shape:i%3,color:['#7fe3ff','#b79bff','#ffd27f','#ff9bd6','#7fffb0'][i%5],
  });
 }
 update(dt){if(this.time<=0)return;this.time=Math.max(0,this.time-dt);if(this.reduced)return;
  for(let i=0;i<this.count;i++){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;if(p.y>550)p.y=-8;}
 }
 clear(){this.time=0;this.count=0;}
}
