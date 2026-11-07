import { TILE_SIZE, SONAR, HUNTER } from './config.mjs';

const VIEW_TILES = 15;
const GLOW_RADIUS_TILES = 2.1;
const DUST_COUNT = 36;

const COLORS = {
  floorNear: '#182636',
  floorRevealed: 'rgba(56, 225, 198, 0.16)',
  wallRevealed: 'rgba(56, 225, 198, 0.55)',
  crystal: '#f6c453',
  lift: '#38e1c6',
  liftInactive: '#2a6b5f',
  hunter: '#ff4d5e',
  player: '#eaf6ff',
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const renderer = {
    canvas,
    ctx,
    dpr: 1,
    width: canvas.width,
    height: canvas.height,
    scale: 1,
    prevPlayer: null,
    prevHunter: null,
    startTime: performance.now(),
  };
  resizeRenderer(renderer);
  return renderer;
}

export function resizeRenderer(renderer) {
  const { canvas } = renderer;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderer.dpr = dpr;
  renderer.width = w;
  renderer.height = h;
  renderer.scale = Math.min(w, h) / (VIEW_TILES * TILE_SIZE);
}

function worldToScreen(renderer, cameraX, cameraY, x, y) {
  return {
    x: renderer.width / 2 + (x - cameraX) * renderer.scale,
    y: renderer.height / 2 + (y - cameraY) * renderer.scale,
  };
}

function drawGlowFloor(renderer, cameraX, cameraY, cave, player) {
  const { ctx, scale } = renderer;
  const glowPx = GLOW_RADIUS_TILES * TILE_SIZE;
  const minTx = Math.max(0, Math.floor((player.x - glowPx) / TILE_SIZE));
  const maxTx = Math.min(cave.width - 1, Math.floor((player.x + glowPx) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((player.y - glowPx) / TILE_SIZE));
  const maxTy = Math.min(cave.height - 1, Math.floor((player.y + glowPx) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (cave.tiles[ty * cave.width + tx] !== 1) continue;
      const cx = (tx + 0.5) * TILE_SIZE;
      const cy = (ty + 0.5) * TILE_SIZE;
      const dist = Math.hypot(cx - player.x, cy - player.y);
      if (dist > glowPx) continue;
      const alpha = 0.5 * (1 - dist / glowPx);
      const p = worldToScreen(renderer, cameraX, cameraY, tx * TILE_SIZE, ty * TILE_SIZE);
      ctx.fillStyle = COLORS.floorNear;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x, p.y, TILE_SIZE * scale + 1, TILE_SIZE * scale + 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawRevealedTiles(renderer, cameraX, cameraY, cave, revealMap, now) {
  const { ctx, scale } = renderer;
  for (const [key, revealedAt] of revealMap) {
    if (typeof key !== 'string' || !key.includes(',')) continue;
    const age = now - revealedAt;
    if (age > SONAR.revealHoldSeconds) continue;
    const [txStr, tyStr] = key.split(',');
    const tx = Number(txStr);
    const ty = Number(tyStr);
    const alpha = Math.max(0, 1 - age / SONAR.revealHoldSeconds);
    const isWall = cave.tiles[ty * cave.width + tx] !== 1;
    const p = worldToScreen(renderer, cameraX, cameraY, tx * TILE_SIZE, ty * TILE_SIZE);
    if(p.x<-TILE_SIZE*scale||p.y<-TILE_SIZE*scale||p.x>renderer.width||p.y>renderer.height)continue;
    ctx.globalAlpha = alpha * (isWall ? 1 : 0.6);
    ctx.fillStyle = isWall ? COLORS.wallRevealed : COLORS.floorRevealed;
    ctx.fillRect(p.x, p.y, TILE_SIZE * scale + 1, TILE_SIZE * scale + 1);
  }
  ctx.globalAlpha = 1;
}

function drawSonarRings(renderer, cameraX, cameraY, pulses) {
  const { ctx, scale } = renderer;
  for (const pulse of pulses) {
    const alpha = Math.max(0, 1 - pulse.age / SONAR.lifetimeSeconds);
    if (alpha <= 0) continue;
    const p = worldToScreen(renderer, cameraX, cameraY, pulse.position.x, pulse.position.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0, pulse.radius * scale), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56, 225, 198, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function isEntityVisible(revealMap, id, now) {
  const revealedAt = revealMap.get(id);
  if (revealedAt === undefined) return 0;
  const age = now - revealedAt;
  if (age > SONAR.revealHoldSeconds) return 0;
  return Math.max(0, 1 - age / SONAR.revealHoldSeconds);
}

function drawDust(renderer, cameraX, cameraY, player, elapsed) {
  const { ctx, scale } = renderer;
  const glowPx = GLOW_RADIUS_TILES * TILE_SIZE * 0.9;
  ctx.fillStyle = 'rgba(200, 220, 235, 0.35)';
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const seed = i * 12.9898;
    const angle = (Math.sin(seed) * 43758.5453) % (Math.PI * 2);
    const radiusFrac = (Math.abs(Math.sin(seed * 1.7)) + (elapsed * 0.05 + i * 0.618) % 1) % 1;
    const r = radiusFrac * glowPx;
    const wobble = Math.sin(elapsed * 0.8 + i) * 4;
    const x = player.x + Math.cos(angle) * r + wobble;
    const y = player.y + Math.sin(angle) * r + wobble;
    const p = worldToScreen(renderer, cameraX, cameraY, x, y);
    const alpha = 1 - radiusFrac;
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSurveyEffects(renderer,run,cameraX,cameraY){
 const {ctx,scale,width,height,dpr}=renderer,now=run.elapsed;
 const visible=p=>p.x>-40&&p.y>-40&&p.x<width+40&&p.y<height+40;
 const world=p=>worldToScreen(renderer,cameraX,cameraY,(p.x+.5)*TILE_SIZE,(p.y+.5)*TILE_SIZE);
 ctx.save();
 // Quiet mineral seams and shallow puddles are restricted to the lamp's immediate area.
 const px=Math.floor(run.player.x/TILE_SIZE),py=Math.floor(run.player.y/TILE_SIZE);
 for(let y=py-2;y<=py+2;y++)for(let x=px-2;x<=px+2;x++){
  if(x<0||y<0||x>=run.cave.width||y>=run.cave.height||run.cave.tiles[y*run.cave.width+x]!==1)continue;
  const seed=x*43+y*71,p=world({x,y});if(Math.hypot(x-px,y-py)>2)continue;
  if(seed%11===0){ctx.strokeStyle='#227c833d';ctx.lineWidth=scale;ctx.beginPath();ctx.ellipse(p.x,p.y,9*scale,3*scale,0,0,Math.PI*2);ctx.stroke();}
  if(seed%7===0){ctx.fillStyle='#4bafa544';ctx.fillRect(p.x-8*scale,p.y+9*scale,3*scale,2*scale);}
 }
 const t=run.tremor;
 if(t.phase!=='quiet'){
  for(const tile of t.tiles){
   const p=world(tile);if(!visible(p))continue;
   ctx.strokeStyle='#c99cff';ctx.fillStyle=t.phase==='active'?'#79618f':'#c99cff22';ctx.lineWidth=1.5*dpr;
   const size=14*scale;ctx.fillRect(p.x-size,p.y-size,size*2,size*2);ctx.strokeRect(p.x-size,p.y-size,size*2,size*2);
   ctx.beginPath();ctx.moveTo(p.x-size*.6,p.y-size*.6);ctx.lineTo(p.x+size*.6,p.y+size*.6);ctx.moveTo(p.x-size*.6,p.y+size*.6);ctx.lineTo(p.x+size*.6,p.y-size*.6);ctx.stroke();
  }
  // Falling dust is a warning cue; only marked debris tiles affect movement.
  for(let i=0;i<24;i++){
   const offset=renderer.reducedMotion?.5:((now*(t.phase==='active'?.75:.35)+i*.173)%1);
   const x=width*(.12+(i*.137)% .76),y=height*(.12+offset*.7);
   ctx.fillStyle=t.phase==='active'?'#bda6c666':'#d9d0b544';ctx.fillRect(x,y,2*dpr,(i%3+1)*dpr);
  }
 }
 const s=run.scanner;
 if(s.origin&&s.highlightUntil>now){
  const age=Math.max(0,now-(s.highlightUntil-5)),origin=worldToScreen(renderer,cameraX,cameraY,s.origin.x,s.origin.y);
  ctx.strokeStyle='#5df7d3';ctx.globalAlpha=Math.max(0,.65-age*.25);ctx.lineWidth=2*dpr;
  if(!renderer.reducedMotion){ctx.beginPath();ctx.arc(origin.x,origin.y,Math.min(400,age*500)*scale,-Math.PI*.8,Math.PI*.8);ctx.stroke();}
  ctx.globalAlpha=1;
  const targets=[...s.crystals.filter(c=>run.remainingCrystals.some(r=>r.id===c.id)).map(c=>({...c,kind:'crystal'})),...s.passages.map(p=>({...p,kind:'passage'}))];
  const player=worldToScreen(renderer,cameraX,cameraY,run.player.x,run.player.y);
  for(const [index,target] of targets.entries()){
   const p=world(target);if(visible(p)){ctx.setLineDash(target.kind==='passage'?[4*dpr,4*dpr]:[]);ctx.strokeStyle='#55f2d5';ctx.beginPath();ctx.arc(p.x,p.y,12*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
   const dx=p.x-player.x,dy=p.y-player.y,dist=Math.hypot(dx,dy);if(dist<28*dpr)continue;
   const angle=Math.atan2(dy,dx),radius=Math.min(64*dpr,height*.16),x=player.x+Math.cos(angle)*radius,y=player.y+Math.sin(angle)*radius;
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=target.kind==='crystal'?'#ffc867':'#55f2d5';ctx.beginPath();ctx.moveTo(7*dpr,0);ctx.lineTo(-4*dpr,-4*dpr);ctx.lineTo(-4*dpr,4*dpr);ctx.closePath();ctx.fill();ctx.restore();
   if(index===0){ctx.fillStyle='#a0e5d6';ctx.font=`${10*dpr}px system-ui`;ctx.textAlign='center';ctx.fillText(target.kind==='crystal'?'CRYSTAL':'PASSAGE',player.x,player.y+radius+19*dpr);}
  }
 }
 ctx.restore();
}

function drawDangerVignette(renderer, hunter) {
  const { ctx, width, height } = renderer;
  if (hunter.awareness <= 0.05) return;
  const intensity = Math.min(1, hunter.awareness) * (hunter.state === 'hunting' ? 1 : 0.6);
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.hypot(cx, cy);
  const gradient = ctx.createRadialGradient(cx, cy, outerRadius * 0.55, cx, cy, outerRadius);
  gradient.addColorStop(0, 'rgba(255, 77, 94, 0)');
  gradient.addColorStop(1, `rgba(255, 77, 94, ${0.45 * intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function renderFrame(renderer, run, alpha) {
  const { ctx, width, height } = renderer;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  if (!run) return;

  const prevPlayer = renderer.prevPlayer ?? run.player;
  const prevHunter = renderer.prevHunter ?? run.hunter;
  const player = {
    x: lerp(prevPlayer.x, run.player.x, alpha),
    y: lerp(prevPlayer.y, run.player.y, alpha),
  };
  const hunterPos = {
    x: lerp(prevHunter.x, run.hunter.x, alpha),
    y: lerp(prevHunter.y, run.hunter.y, alpha),
  };

  const shake=renderer.reducedMotion?0:run.tremor?.phase==='active'?1.2:run.tremor?.phase==='warning'?.35:0;
  const cameraX = player.x+Math.sin(run.elapsed*31)*shake;
  const cameraY = player.y+Math.cos(run.elapsed*27)*shake;
  const now = run.elapsed;

  drawGlowFloor(renderer, cameraX, cameraY, run.cave, player);
  drawRevealedTiles(renderer, cameraX, cameraY, run.cave, run.revealMap, now);
  drawSonarRings(renderer, cameraX, cameraY, run.pulses);
  drawDust(renderer, cameraX, cameraY, player, renderer.reducedMotion?0:now);
  drawSurveyEffects(renderer,run,cameraX,cameraY);

  const liftVisibility = Math.max(
    Math.min(1, GLOW_RADIUS_TILES * TILE_SIZE / Math.max(1, Math.hypot(run.cave.lift.x * TILE_SIZE + TILE_SIZE / 2 - player.x, run.cave.lift.y * TILE_SIZE + TILE_SIZE / 2 - player.y))),
    Math.max(isEntityVisible(run.revealMap, 'lift', now), 0),
  );
  if (liftVisibility > 0.02) {
    const p = worldToScreen(renderer, cameraX, cameraY, (run.cave.lift.x + 0.5) * TILE_SIZE, (run.cave.lift.y + 0.5) * TILE_SIZE);
    ctx.globalAlpha = Math.min(1, liftVisibility + 0.3);
    ctx.fillStyle = run.liftActive ? COLORS.lift : COLORS.liftInactive;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7 * renderer.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const crystal of run.remainingCrystals) {
    const scannerVisible=run.scanner.highlightUntil>now&&run.scanner.crystals.some(c=>c.id===crystal.id);
    const near=Math.hypot((crystal.x+.5)*TILE_SIZE-player.x,(crystal.y+.5)*TILE_SIZE-player.y)<TILE_SIZE*2.1;
    const visibility = Math.max(isEntityVisible(run.revealMap, crystal.id, now),scannerVisible?1:near?.55:0);
    if (visibility <= 0.02) continue;
    const p = worldToScreen(renderer, cameraX, cameraY, (crystal.x + 0.5) * TILE_SIZE, (crystal.y + 0.5) * TILE_SIZE);
    ctx.globalAlpha = visibility;
    ctx.fillStyle = COLORS.crystal;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5 * renderer.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle=scannerVisible?'#5ffadd':'#ffe0a0';ctx.lineWidth=renderer.scale;ctx.beginPath();ctx.moveTo(p.x,p.y-9*renderer.scale);ctx.lineTo(p.x+6*renderer.scale,p.y);ctx.lineTo(p.x,p.y+9*renderer.scale);ctx.lineTo(p.x-6*renderer.scale,p.y);ctx.closePath();ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const hunterVisibility = isEntityVisible(run.revealMap, 'hunter', now);
  if (hunterVisibility > 0.02) {
    const jitter = renderer.reducedMotion?0:3 * (1 - hunterVisibility);
    const jx = Math.sin(now * 37) * jitter;
    const jy = Math.cos(now * 29) * jitter;
    const p = worldToScreen(renderer, cameraX, cameraY, hunterPos.x + jx, hunterPos.y + jy);
    ctx.globalAlpha = hunterVisibility;
    ctx.fillStyle = COLORS.hunter;
    ctx.beginPath();
    ctx.arc(p.x, p.y, HUNTER.radius * renderer.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const playerScreen = worldToScreen(renderer, cameraX, cameraY, player.x, player.y);
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(playerScreen.x, playerScreen.y, 6 * renderer.scale, 0, Math.PI * 2);
  ctx.fill();

  drawDangerVignette(renderer, run.hunter);

  renderer.prevPlayer = { x: run.player.x, y: run.player.y };
  renderer.prevHunter = { x: run.hunter.x, y: run.hunter.y };
}

