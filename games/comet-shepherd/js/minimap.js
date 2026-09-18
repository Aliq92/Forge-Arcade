import { TAU, clamp } from './utils.js';
import { RESOURCE_TYPES } from './resources.js';

export class Minimap{
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.resize();
  }
  resize(){
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = this.canvas.clientWidth || 180;
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.size = size;
  }

  draw(system, comet, chicken=null){
    const ctx=this.ctx, size=this.size;
    ctx.clearRect(0,0,size,size);
    const cx=size/2, cy=size/2;
    const ox=system.star.x, oy=system.star.y;

    // Fit the generated content itself, not an abstract padded bounds radius.
    let worldRadius=420;
    const include=(x,y,pad=0)=>{
      const d=Math.hypot(x-ox,y-oy)+pad;
      if(Number.isFinite(d)) worldRadius=Math.max(worldRadius,d);
    };
    include(system.gate.x,system.gate.y,system.gate.radius);
    for(const p of system.planets){
      include(p.x,p.y,p.radius);
      for(const m of p.moons) include(m.x,m.y,m.radius);
    }
    for(const belt of system.belts){
      worldRadius=Math.max(worldRadius,belt.orbitRadius+(belt.bandWidth||0));
    }
    for(const r of system.resources){ if(!r.collected) include(r.x,r.y,r.radius||0); }
    worldRadius*=1.08;

    const scale=(size/2-8)/worldRadius;
    const point=(x,y)=>({x:cx+(x-ox)*scale,y:cy+(y-oy)*scale});

    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,size/2-2,0,TAU); ctx.clip();

    // asteroid belts and current asteroid positions
    for(const belt of system.belts){
      ctx.strokeStyle='rgba(160,160,180,0.20)';
      ctx.lineWidth=Math.max(1,(belt.bandWidth||20)*scale);
      ctx.beginPath(); ctx.arc(cx,cy,belt.orbitRadius*scale,0,TAU); ctx.stroke();
      ctx.fillStyle='rgba(175,175,188,0.36)';
      for(const a of belt.asteroids || []){
        const q=point(a.x,a.y);
        ctx.fillRect(q.x-0.7,q.y-0.7,1.4,1.4);
      }
    }

    // star
    ctx.fillStyle='#ffdd8a';
    ctx.beginPath(); ctx.arc(cx,cy,4,0,TAU); ctx.fill();

    // flare sector originates from the actual star map position.
    if(system.flare.state!=='idle'){
      ctx.save();
      ctx.globalAlpha=system.flare.state==='warning'?0.32:0.5;
      ctx.fillStyle=system.flare.state==='warning'?'#ffb14e':'#ff5a4e';
      const a0=system.flare.sectorAngle-system.flare.sectorWidth/2;
      const a1=system.flare.sectorAngle+system.flare.sectorWidth/2;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,size/2-4,a0,a1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // planets + moons at their live orbital coordinates.
    for(const p of system.planets){
      const q=point(p.x,p.y);
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(q.x,q.y,clamp(p.radius*scale*1.4,1.6,4),0,TAU); ctx.fill();
      ctx.fillStyle='#d6deee';
      for(const m of p.moons){
        const mq=point(m.x,m.y);
        ctx.beginPath(); ctx.arc(mq.x,mq.y,1.15,0,TAU); ctx.fill();
      }
    }

    // collectible materials, using the same resource colors as the world renderer.
    for(const r of system.resources){
      if(r.collected) continue;
      const q=point(r.x,r.y);
      const def=RESOURCE_TYPES[r.type];
      ctx.fillStyle=def ? def.glowColor : '#ffffff';
      const rr=r.type==='ANCIENT_CORE'?1.8:r.type==='STARDUST'?0.9:1.25;
      ctx.beginPath(); ctx.arc(q.x,q.y,rr,0,TAU); ctx.fill();
    }

    // gate
    const g=point(system.gate.x,system.gate.y);
    ctx.strokeStyle='#9bf3ff'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.arc(g.x,g.y,4,0,TAU); ctx.stroke();

    // space chicken
    if(chicken && chicken.active){
      const ch=point(chicken.x,chicken.y);
      ctx.fillStyle='#fff3b0';
      ctx.beginPath(); ctx.arc(ch.x,ch.y,2,0,TAU); ctx.fill();
      ctx.fillStyle='#ff6b70';
      ctx.fillRect(ch.x+1.5,ch.y-2,1.4,1.4);
    }

    // comet
    const cp=point(comet.x,comet.y);
    ctx.fillStyle='#eafcff';
    ctx.beginPath(); ctx.arc(cp.x,cp.y,3,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(150,225,255,0.6)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cp.x,cp.y,6,0,TAU); ctx.stroke();

    ctx.restore();
    ctx.strokeStyle='rgba(140,150,255,0.3)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,size/2-2,0,TAU); ctx.stroke();
  }
}
