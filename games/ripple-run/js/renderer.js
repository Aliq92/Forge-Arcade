// Ripple Run - canvas rendering: water, light, decorations, ripples, orb
window.RR = window.RR || {};

RR.Renderer = (function () {
  const U = RR.Utils;

  let canvas, ctx;
  let t = 0; // internal animation clock
  let rainDrops = [];

  const THEMES=RR.Chromatic.THEMES;
  const pool=new RR.Chromatic.ParticlePool();
  let cache=null,lastSeed=null,lastElapsed=0,completed=false,celebrationAge=99,rings=[],seen=new WeakSet(),seenHits=new WeakMap(),hitGlows=new WeakMap(),currentGlow=.65,currentParticles=true,currentReduced=false,currentProgress=0,visualRng=U.mulberry32(90709);
  function resetEffects(){pool.clear();rings=[];seen=new WeakSet();seenHits=new WeakMap();hitGlows=new WeakMap();completed=false;celebrationAge=99;}
  function syncVisuals(dt,state,theme){
    if(state.sceneSeed!==lastSeed||state.elapsed<lastElapsed-.05){resetEffects();lastSeed=state.sceneSeed;}lastElapsed=state.elapsed||0;
    if(pool.reduced!==!!state.reducedMotion){pool.clear();rings=[];}pool.reduced=!!state.reducedMotion;pool.update(dt);celebrationAge+=dt;
    if(!currentParticles){pool.clear();rings=[];}
    for(const rock of state.rocks||[])hitGlows.set(rock,Math.max(0,(hitGlows.get(rock)||0)-dt*2));
    for(const rp of state.ripples||[]){if(!seen.has(rp)){seen.add(rp);if(currentParticles&&!rp.isRain&&rp.age<.15&&['playing','zen'].includes(state.state))pool.burst(rp.x,rp.y,5,theme);}let hits=seenHits.get(rp);if(!hits){hits=new Set();seenHits.set(rp,hits);}for(const rock of state.rocks||[]){if(rp.hitRocks.has(rock)&&!hits.has(rock)){hits.add(rock);hitGlows.set(rock,.65);if(currentParticles)pool.burst(rock.x,rock.y,3,theme);}}}
    if(state.completed&&!completed&&state.goal){celebrationAge=0;if(currentParticles){pool.burst(state.goal.x,state.goal.y,64,theme);if(!state.reducedMotion)rings=[0,1,2].map(i=>({x:state.goal.x,y:state.goal.y,r:state.goal.r*.85,age:0,speed:45+i*25}));}}completed=!!state.completed;
    for(const ring of rings){ring.age+=dt;ring.r+=ring.speed*dt;}rings=rings.filter(r=>r.age<1.3);
  }

  function init(cnv) {
    canvas = cnv;
    ctx = canvas.getContext('2d');
    return ctx;
  }

  function generateDecorations(seed, W, H) {
    const rng = U.mulberry32(U.hashString('deco-' + seed));
    const lilies = [];
    const reeds = [];
    const petals = [];
    const koi = [];

    const lilyCount = 6;
    for (let i = 0; i < lilyCount; i++) {
      let nx = rng(), ny = rng();
      // bias toward edges so the play area stays clear
      nx = nx < 0.5 ? nx * 0.35 : 1 - (1 - nx) * 0.35;
      ny = ny < 0.5 ? ny * 0.35 : 1 - (1 - ny) * 0.35;
      lilies.push({ nx, ny, r: U.rand.call(null, 0.02, 0.036) * 1000 / 1000, rot: rng() * Math.PI * 2, scale: 0.7 + rng() * 0.6 });
    }
    const reedCount = 8;
    for (let i = 0; i < reedCount; i++) {
      const edge = Math.floor(rng() * 4);
      let nx, ny;
      if (edge === 0) { nx = rng() * 0.12; ny = rng(); }
      else if (edge === 1) { nx = 1 - rng() * 0.12; ny = rng(); }
      else if (edge === 2) { nx = rng(); ny = rng() * 0.10; }
      else { nx = rng(); ny = 1 - rng() * 0.10; }
      reeds.push({ nx, ny, h: 0.05 + rng() * 0.06, sway: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.6 });
    }
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
      petals.push({ nx: rng(), ny: rng(), rot: rng() * Math.PI * 2, drift: rng() * Math.PI * 2, scale: 0.6 + rng() * 0.5 });
    }
    const koiCount = 2;
    for (let i = 0; i < koiCount; i++) {
      koi.push({
        cx: 0.2 + rng() * 0.6, cy: 0.2 + rng() * 0.6,
        r: 0.18 + rng() * 0.18, speed: 0.05 + rng() * 0.06,
        phase: rng() * Math.PI * 2, len: 0.028 + rng() * 0.012
      });
    }
    return { lilies, reeds, petals, koi };
  }

  function setRain(active){if(!active){rainDrops=[];return;}if(!rainDrops.length)for(let i=0;i<60;i++)rainDrops.push({x:visualRng(),y:visualRng(),speed:.4+visualRng()*.3,len:8+visualRng()*10});}

  function drawBackground(W,H,theme,reducedMotion){
    const key=theme.name+'|'+W+'|'+H;if(!cache||cache.key!==key){const base=document.createElement('canvas'),caustic=document.createElement('canvas'),band=document.createElement('canvas');base.width=W;base.height=H;caustic.width=512;caustic.height=256;band.width=4;band.height=128;
      const b=base.getContext('2d'),g=b.createLinearGradient(0,0,W,H);g.addColorStop(0,theme.bgTop);g.addColorStop(1,theme.bgBottom);b.fillStyle=g;b.fillRect(0,0,W,H);const reflection=b.createRadialGradient(W*.75,H*.12,0,W*.75,H*.12,Math.max(W,H)*.75);reflection.addColorStop(0,'rgba('+theme.goal+',.12)');reflection.addColorStop(1,'rgba('+theme.goal+',0)');b.fillStyle=reflection;b.fillRect(0,0,W,H);
      const c=caustic.getContext('2d');c.lineWidth=1;for(let i=0;i<12;i++){c.strokeStyle=i%2?'rgba('+theme.ripple+',.20)':'rgba('+theme.secondary+',.12)';c.beginPath();for(let x=-20;x<=540;x+=20){const y=25+i*19+Math.sin(x*.018+i*1.4)*12;if(x===-20)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
      const bc=band.getContext('2d'),bg=bc.createLinearGradient(0,0,0,128);bg.addColorStop(0,theme.water2);bg.addColorStop(.5,theme.water1);bg.addColorStop(1,theme.water2);bc.fillStyle=bg;bc.fillRect(0,0,4,128);cache={key,base,caustic,band};
    }
    ctx.drawImage(cache.base,0,0,W,H);const motion=reducedMotion?0:t;for(let i=0;i<3;i++){const y=H*(.08+i*.3)+Math.sin(motion*.07+i)*H*.025;ctx.drawImage(cache.band,0,y,W,H*.3);}ctx.save();ctx.globalAlpha=.27;ctx.drawImage(cache.caustic,-12+Math.sin(motion*.08)*9,-10+Math.cos(motion*.06)*6,W+24,H+20);ctx.restore();
  }

  function drawVignette(W, H, theme, highContrast) {
    const innerR = Math.min(W, H) * (highContrast ? 0.5 : 0.35);
    const g = ctx.createRadialGradient(W / 2, H / 2, innerR, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, highContrast ? 'rgba(0,0,0,0.35)' : theme.vignette);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawKoi(koi, W, H, theme, reducedMotion) {
    ctx.save();
    ctx.fillStyle = theme.koi;
    for (const k of koi) {
      const speed = reducedMotion ? 0 : k.speed;
      const a = k.phase + t * speed;
      const cx = k.cx * W + Math.cos(a) * k.r * Math.min(W, H);
      const cy = k.cy * H + Math.sin(a * 1.3) * k.r * Math.min(W, H) * 0.6;
      const angle = Math.atan2(Math.cos(a * 1.3) * 1.3 * Math.cos(a), -Math.sin(a));
      const len = k.len * Math.min(W, H);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(Math.sin(a * 1.3 + 0.01), -Math.sin(a + 0.01)));
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-len * 0.9, 0);
      ctx.lineTo(-len * 1.5, len * 0.35);
      ctx.lineTo(-len * 1.5, -len * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawLilyShape(x, y, r, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.35, Math.PI * 2 - 0.35);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDecorations(deco, W, H, theme, reducedMotion) {
    const min = Math.min(W, H);
    for (const l of deco.lilies) {
      drawLilyShape(l.nx * W, l.ny * H, 0.03 * min * l.scale, l.rot, theme.lily);
    }
    ctx.save();
    ctx.strokeStyle = theme.reed;
    ctx.lineWidth = Math.max(1.2, min * 0.003);
    for (const r of deco.reeds) {
      const sway = reducedMotion ? 0 : Math.sin(t * 0.6 + r.sway) * 0.08;
      const x = r.nx * W, y = r.ny * H;
      const h = r.h * min;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + h * (r.tilt + sway) * 0.6, y - h * 0.6, x + h * (r.tilt + sway), y - h);
      ctx.stroke();
    }
    ctx.restore();
    for (const p of deco.petals) {
      const drift = reducedMotion ? 0 : Math.sin(t * 0.15 + p.drift) * 0.012;
      ctx.save();
      ctx.translate((p.nx + drift) * W, p.ny * H);
      ctx.rotate(p.rot + (reducedMotion ? 0 : t * 0.1));
      ctx.fillStyle = theme.lily;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.012 * min * p.scale, 0.006 * min * p.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawShallow(zones,theme){ctx.save();for(const z of zones){const g=ctx.createRadialGradient(z.x,z.y,0,z.x,z.y,z.r);g.addColorStop(0,'rgba('+theme.goal+',.10)');g.addColorStop(1,'rgba('+theme.goal+',.025)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba('+theme.goal+',.20)';ctx.lineWidth=1;ctx.setLineDash([3,7]);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<9;i++){const a=i*2.4,r=z.r*(.25+(i%3)*.2);ctx.fillStyle='rgba('+theme.goal+',.20)';ctx.fillRect(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,2,1);}}ctx.restore();}

  function drawCurrents(zones, reducedMotion) {
    ctx.save();
    for (const z of zones) {
      ctx.save();
      ctx.beginPath();
      if (z.shape === 'circle') ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      else ctx.rect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
      ctx.clip();

      const bounds = z.shape === 'circle'
        ? { x: z.x - z.r, y: z.y - z.r, w: z.r * 2, h: z.r * 2 }
        : { x: z.x - z.w / 2, y: z.y - z.h / 2, w: z.w, h: z.h };

      const lineCount = 10;
      const speed = reducedMotion ? 0 : z.strength * 0.35;
      for (let i = 0; i < lineCount; i++) {
        const seedOff = i * 137.5;
        const along = ((t * speed * 0.02 + seedOff) % 140) / 140;
        const px = bounds.x + ((i * 0.618) % 1) * bounds.w;
        const py = bounds.y + ((i * 0.382 + along) % 1) * bounds.h;
        const len = 16;
        ctx.strokeStyle = 'rgba(180,220,255,0.22)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px - z.dirX * len, py - z.dirY * len);
        ctx.lineTo(px + z.dirX * len, py + z.dirY * len);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHazards(hazards,reducedMotion){for(const h of hazards){ctx.save();ctx.fillStyle=h.triggered?'rgba(221,146,181,.035)':'rgba(221,146,181,.10)';ctx.strokeStyle=h.triggered?'rgba(246,174,195,.3)':'rgba(255,183,201,.75)';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,198,210,.6)';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(h.x+Math.cos(a)*h.r*.22,h.y+Math.sin(a)*h.r*.22,h.r*.15,h.r*.07,a,0,Math.PI*2);ctx.fill();}ctx.restore();}}

  function drawRocks(rocks){for(const r of rocks){ctx.save();ctx.fillStyle='#05162240';ctx.beginPath();ctx.ellipse(r.x,r.y+r.r*.17,r.r*1.07,r.r*.92,0,0,Math.PI*2);ctx.fill();const g=ctx.createRadialGradient(r.x-r.r*.35,r.y-r.r*.4,0,r.x,r.y,r.r*1.1);g.addColorStop(0,'#789aa5');g.addColorStop(.55,'#405c70');g.addColorStop(1,'#21384e');ctx.fillStyle=g;ctx.strokeStyle='rgba(184,220,222,.4)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='rgba(220,242,229,.23)';ctx.beginPath();ctx.arc(r.x-r.r*.07,r.y-r.r*.1,r.r*.65,3.5,5.8);ctx.stroke();const flash=Math.max(r.flash,hitGlows.get(r)||0);if(flash>.01){ctx.strokeStyle='rgba(184,248,234,'+flash*.65+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();}ctx.restore();}}

  function drawGoal(goal,theme,reducedMotion,highContrast){if(!goal)return;ctx.save();const breathe=reducedMotion?0:Math.sin(t*1.4)*.03;const r=goal.r,halo=ctx.createRadialGradient(goal.x,goal.y,r*.25,goal.x,goal.y,r*1.8);halo.addColorStop(0,'rgba('+theme.goal+','+.15*currentGlow+')');halo.addColorStop(1,'rgba('+theme.goal+',0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(goal.x,goal.y,r*1.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba('+theme.goal+','+(highContrast?1:.85)+')';ctx.lineWidth=highContrast?3:2;ctx.beginPath();ctx.arc(goal.x,goal.y,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba('+theme.goal+',.25)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(goal.x,goal.y,r*.77,0,Math.PI*2);ctx.stroke();for(let i=0;i<6;i++){const a=i*Math.PI/3+(reducedMotion?0:t*.06);ctx.fillStyle='rgba('+theme.goal+',.5)';ctx.beginPath();ctx.ellipse(goal.x+Math.cos(a)*r*.45,goal.y+Math.sin(a)*r*.45,r*(.19+breathe),r*.08,a,0,Math.PI*2);ctx.fill();}if(currentProgress>0){ctx.strokeStyle='#fff5cf';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(goal.x,goal.y,r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*currentProgress);ctx.stroke();}ctx.fillStyle='rgba('+theme.goal+',.75)';ctx.font='8px system-ui';ctx.textAlign='center';ctx.fillText('GOAL',goal.x,goal.y+r+16);ctx.restore();}

  function drawRipples(ripples,theme,glowEnabled,highContrast){ctx.save();for(const rp of ripples){const life=U.clamp(1-rp.age/rp.life,0,1),edge=U.clamp((1.05-rp.radius/rp.maxRadius)/.18,0,1),alpha=(rp.isRain?.13:.75)*life*edge*(highContrast?1.3:1);if(alpha<=.001||rp.radius<=0)continue;const r=rp.radius,g=ctx.createLinearGradient(rp.x-r,rp.y-r,rp.x+r,rp.y+r);g.addColorStop(0,'rgba('+theme.ripple+','+alpha+')');g.addColorStop(.5,'rgba('+theme.rippleCore+','+alpha+')');g.addColorStop(1,'rgba('+theme.secondary+','+alpha+')');if(glowEnabled&&!rp.isRain&&currentGlow>0){ctx.strokeStyle='rgba('+theme.ripple+','+alpha*.13*currentGlow+')';ctx.lineWidth=8;ctx.beginPath();ctx.arc(rp.x,rp.y,r,0,Math.PI*2);ctx.stroke();}ctx.strokeStyle=g;ctx.lineWidth=highContrast?2.5:1.6;ctx.beginPath();ctx.arc(rp.x,rp.y,r,0,Math.PI*2);ctx.stroke();if(!rp.isRain){ctx.strokeStyle='rgba('+theme.rippleCore+','+alpha*.3+')';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(rp.x,rp.y,Math.max(0,r-7),0,Math.PI*2);ctx.stroke();if(r>12&&!currentReduced){ctx.strokeStyle='rgba('+theme.secondary+','+alpha*.14+')';ctx.beginPath();for(let i=0;i<=40;i++){const a=i/40*Math.PI*2,rr=r-11+Math.sin(a*6+t*.4)*.8,x=rp.x+Math.cos(a)*rr,y=rp.y+Math.sin(a)*rr;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}}for(const p of rp.ringPulses){ctx.strokeStyle='rgba('+theme.rippleCore+','+U.clamp(1-p.age/p.life,0,1)*.25+')';ctx.setLineDash([2,5]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}}ctx.restore();
    if(currentParticles&&!currentReduced){const waves=ripples.filter(r=>!r.isRain&&r.radius>1).slice(-12);ctx.save();ctx.fillStyle='rgba('+theme.rippleCore+',.3)';for(let i=0;i<waves.length;i++)for(let j=i+1;j<waves.length;j++){const a=waves[i],b=waves[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.01||d>a.radius+b.radius||d<Math.abs(a.radius-b.radius))continue;const along=(a.radius*a.radius-b.radius*b.radius+d*d)/(2*d),height=Math.sqrt(Math.max(0,a.radius*a.radius-along*along)),x=a.x+dx*along/d,y=a.y+dy*along/d;for(const sign of [-1,1]){ctx.beginPath();ctx.arc(x-sign*dy*height/d,y+sign*dx*height/d,1.4,0,Math.PI*2);ctx.fill();}}ctx.restore();}
  }

  function drawSplashParticles(particles,theme){if(!currentParticles)return;ctx.save();for(const p of currentReduced?[]:particles){const f=U.clamp(p.life/p.maxLife,0,1)*(completed?U.clamp(1-celebrationAge/.9,0,1):1);if(f<=0)continue;ctx.fillStyle='rgba('+theme.rippleCore+','+f*.65+')';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.4,p.size*f),0,Math.PI*2);ctx.fill();}for(const p of pool.active){ctx.fillStyle='rgba('+p.color+','+U.clamp(p.life/p.maxLife,0,1)*.8+')';ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.restore();}

  function drawOrb(orb,theme,glowEnabled){ctx.save();if(currentParticles&&!currentReduced){for(const pt of orb.trail){const f=U.clamp(1-pt.age/.55,0,1);ctx.fillStyle='rgba('+theme.orb+','+f*.14+')';ctx.beginPath();ctx.arc(pt.x,pt.y,orb.radius*(.2+f*.45),0,Math.PI*2);ctx.fill();}}if(glowEnabled&&currentGlow>0){const radius=orb.radius*(2.6+orb.brighten),g=ctx.createRadialGradient(orb.x,orb.y,0,orb.x,orb.y,radius);g.addColorStop(0,'rgba('+theme.orb+','+.4*currentGlow+')');g.addColorStop(1,'rgba('+theme.orb+',0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(orb.x,orb.y,radius,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='rgba('+theme.orb+',.8)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(orb.x,orb.y,orb.radius,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba('+theme.orbCore+',.95)';ctx.beginPath();ctx.arc(orb.x,orb.y,orb.radius*.58,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(orb.x-orb.radius*.18,orb.y-orb.radius*.18,orb.radius*.14,0,Math.PI*2);ctx.fill();ctx.restore();}

  function drawRain(W,H,reducedMotion,dt){if(!rainDrops.length)return;ctx.save();ctx.strokeStyle='rgba(190,223,239,.25)';ctx.lineWidth=1;for(const d of rainDrops){if(!reducedMotion)d.y+=d.speed*.72*dt;if(d.y>1.05){d.y=-.05;d.x=visualRng();}ctx.beginPath();ctx.moveTo(d.x*W,d.y*H);ctx.lineTo(d.x*W-2,d.y*H+d.len);ctx.stroke();}ctx.restore();}

  function drawFireflies(W, H, theme, reducedMotion, seed) {
    const rng = U.mulberry32(U.hashString('fly-' + seed));
    const count = 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const baseX = rng(), baseY = rng(), phase = rng() * 10, spd = 0.15 + rng() * 0.15;
      const tt = reducedMotion ? phase : t * spd + phase;
      const x = (baseX + Math.sin(tt) * 0.03) * W;
      const y = (baseY + Math.cos(tt * 1.3) * 0.03) * H;
      const flick = reducedMotion ? 0.5 : (Math.sin(tt * 3) * 0.5 + 0.5);
      ctx.fillStyle = `rgba(${theme.firefly},${0.15 + flick * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render(dt,state){if(!ctx)return;const animDt=state.state==='paused'?0:dt;t+=animDt;const W=state.W,H=state.H,theme=THEMES[RR.Chromatic.alias(state.theme)]||THEMES.night,reducedMotion=!!state.reducedMotion,highContrast=!!state.highContrast;currentGlow=state.rippleGlow===false?0:(state.glowIntensity??.65);currentParticles=state.particleEffects!==false;currentReduced=reducedMotion;currentProgress=state.goalProgress||0;syncVisuals(animDt,state,theme);
    ctx.save();ctx.clearRect(0,0,W,H);if(!reducedMotion&&(state.shakeX||state.shakeY))ctx.translate(state.shakeX||0,state.shakeY||0);drawBackground(W,H,theme,reducedMotion);if(state.deco){drawKoi(state.deco.koi||[],W,H,theme,reducedMotion);drawDecorations(state.deco,W,H,theme,reducedMotion);}drawShallow(state.shallow||[],theme);drawCurrents(state.currents||[],reducedMotion);drawHazards(state.hazards||[],reducedMotion);drawRocks(state.rocks||[]);
    if(celebrationAge<1.3){ctx.fillStyle='rgba('+theme.goal+','+Math.sin(celebrationAge/1.3*Math.PI)*.055+')';ctx.fillRect(0,0,W,H);}for(const ring of rings){ctx.strokeStyle='rgba('+theme.secondary+','+(1-ring.age/1.3)*.32+')';ctx.lineWidth=1;ctx.setLineDash([4,10]);ctx.beginPath();ctx.ellipse(ring.x,ring.y,ring.r,ring.r*.65,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    drawGoal(state.goal,theme,reducedMotion,highContrast);drawRipples(state.ripples||[],theme,currentGlow>0,highContrast);drawSplashParticles(state.particles||[],theme);for(const orb of state.orbs||[])drawOrb(orb,theme,currentGlow>0);if(currentParticles)drawFireflies(W,H,theme,reducedMotion,state.sceneSeed||1);if(state.rain)drawRain(W,H,reducedMotion,animDt);drawVignette(W,H,theme,highContrast);ctx.restore();
  }

  return {init,render,generateDecorations,setRain,resetEffects,inspect:()=>({particles:pool.active.length,free:pool.free.length,rings:rings.length,time:t,cacheKey:cache?.key})};
})();
