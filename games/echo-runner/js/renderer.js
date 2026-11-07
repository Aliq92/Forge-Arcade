// renderer.js — all canvas drawing. Pure rendering, no game-state mutation.
import { movingPlatformRectAt, laserActiveAt } from './objects.js';

const COLORS = {
  bg0: '#07090c',
  bg1: '#0b0f16',
  grid: 'rgba(140,180,220,0.035)',
  tile: '#1b2028',
  tileEdge: '#333c48',
  tileEdgeGlow: 'rgba(120,190,255,0.10)',
  player: '#f4f9ff',
  playerGlow: 'rgba(160,220,255,0.55)',
  cyan: '#7fe3ff',
  violet: '#b79bff',
  paleBlue: '#8fb4ff',
  danger: '#ff5d7a',
  ok: '#7fffb0',
};

const ECHO_PALETTE = ['#a4b5ff', '#cf9fff', '#7af3d2', '#8fd6ff'];

export function clear(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, COLORS.bg1);
  g.addColorStop(1, COLORS.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawBackgroundGrid(ctx, w, h, camX, chapterAccent) {
  ctx.save();
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const spacing = 48;
  const offset = -((camX * 0.3) % spacing);
  for (let x = offset; x < w; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += spacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // faint accent glow from the top, chapter-tinted
  const rg = ctx.createRadialGradient(w / 2, -80, 40, w / 2, -80, w * 0.9);
  rg.addColorStop(0, hexAlpha(chapterAccent, 0.10));
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function hexAlpha(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function drawTile(ctx, t) {
  ctx.fillStyle = COLORS.tile;
  ctx.fillRect(t.x, t.y, t.w, t.h);
  ctx.strokeStyle = COLORS.tileEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);
  ctx.fillStyle = COLORS.tileEdgeGlow;
  ctx.fillRect(t.x, t.y, t.w, 3);
  ctx.fillStyle='rgba(125,190,225,.14)';
  for(let x=t.x+16;x<t.x+t.w-8;x+=48)ctx.fillRect(x,t.y+8,16,2);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(t.x,t.y+t.h-5,t.w,5);
}

export function drawPlate(ctx, plate, active) {
  const color = plate.allow === 'echo' ? COLORS.violet : plate.allow === 'player' ? COLORS.cyan : COLORS.paleBlue;
  ctx.save();
  ctx.fillStyle = active ? hexAlpha(color, 0.85) : hexAlpha(color, 0.28);
  ctx.fillRect(plate.x, plate.y - 6, plate.w, 6);
  ctx.strokeStyle = hexAlpha(color, active ? 1 : 0.5);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(plate.x + 0.5, plate.y - 5.5, plate.w - 1, 5);
  if (active) {
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.fillRect(plate.x, plate.y - 6, plate.w, 6);
  }
  if (plate.allow !== 'any') {
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(plate.allow === 'echo' ? 'ECHO ONLY' : 'YOU ONLY', plate.x + plate.w / 2, plate.y - 10);
  }
  ctx.restore();
}

export function drawSwitch(ctx, sw, on) {
  const color = sw.allow === 'echo' ? COLORS.violet : sw.allow === 'player' ? COLORS.cyan : COLORS.paleBlue;
  ctx.save();
  ctx.fillStyle = '#161b22';
  ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
  ctx.strokeStyle = hexAlpha(color, 0.8);
  ctx.strokeRect(sw.x + 0.5, sw.y + 0.5, sw.w - 1, sw.h - 1);
  const dotY = on ? sw.y + 8 : sw.y + sw.h - 8;
  ctx.fillStyle = on ? color : 'rgba(255,255,255,0.25)';
  if (on) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.beginPath(); ctx.arc(sw.x + sw.w / 2, dotY, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (sw.allow !== 'any') {
    ctx.fillStyle = hexAlpha(color, 0.9);
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sw.allow === 'echo' ? 'ECHO ONLY' : 'YOU ONLY', sw.x + sw.w / 2, sw.y - 6);
  }
}

export function drawDoor(ctx, door, open, timedActive) {
  ctx.save();
  if (!open) {
    const g = ctx.createLinearGradient(door.x, door.y, door.x + door.w, door.y);
    g.addColorStop(0, '#3a4250');
    g.addColorStop(0.5, '#5a6577');
    g.addColorStop(1, '#3a4250');
    ctx.fillStyle = g;
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.strokeStyle = timedActive ? COLORS.paleBlue : '#232833';
    ctx.lineWidth = 2;
    ctx.strokeRect(door.x + 1, door.y + 1, door.w - 2, door.h - 2);
  } else {
    ctx.strokeStyle = hexAlpha(COLORS.cyan, 0.5);
    ctx.setLineDash([4, 5]);
    ctx.strokeRect(door.x + 1, door.y + 1, door.w - 2, door.h - 2);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

export function drawLaser(ctx, laser, active, t) {
  if (!active) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,120,150,0.25)';
    ctx.setLineDash([3, 4]);
    ctx.strokeRect(laser.x, laser.y, laser.w, laser.h);
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  ctx.save();
  const pulse = 0.75 + Math.sin(t * 14) * 0.25;
  ctx.shadowColor = COLORS.danger;
  ctx.shadowBlur = 16 * pulse;
  ctx.fillStyle = hexAlpha(COLORS.danger, 0.85);
  ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
  ctx.restore();
}

export function drawCrumble(ctx, cf, state,reduced=false) {
  if (state.broken) return;
  ctx.save();
  const shake = state.touchedTick !== null&&!reduced ? Math.sin(Date.now() * 0.08) * 1.2 : 0;
  ctx.translate(shake, 0);
  ctx.fillStyle = state.touchedTick !== null ? '#3a2c2c' : '#242a33';
  ctx.fillRect(cf.x, cf.y, cf.w, cf.h);
  ctx.strokeStyle = state.touchedTick !== null ? 'rgba(255,120,120,0.6)' : COLORS.tileEdge;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cf.x + (cf.w / 4) * i, cf.y);
    ctx.lineTo(cf.x + (cf.w / 4) * i - 5, cf.y + cf.h);
    ctx.stroke();
  }
  ctx.strokeRect(cf.x + 0.5, cf.y + 0.5, cf.w - 1, cf.h - 1);
  ctx.restore();
}

export function drawSpike(ctx, s) {
  ctx.save();
  ctx.fillStyle = '#2a1418';
  ctx.fillRect(s.x, s.y, s.w, s.h);
  const teeth = Math.max(2, Math.round(s.w / 16));
  ctx.fillStyle = COLORS.danger;
  ctx.shadowColor = COLORS.danger; ctx.shadowBlur = 8;
  for (let i = 0; i < teeth; i++) {
    const tw = s.w / teeth;
    const cx = s.x + tw * i + tw / 2;
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.4, s.y + s.h);
    ctx.lineTo(cx, s.y);
    ctx.lineTo(cx + tw * 0.4, s.y + s.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawMovingPlatform(ctx, rect) {
  ctx.save();
  ctx.fillStyle = '#232a35';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = hexAlpha(COLORS.paleBlue, 0.7);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = hexAlpha(COLORS.paleBlue, 0.5);
  ctx.fillRect(rect.x, rect.y, rect.w, 2);
  ctx.restore();
}

export function drawExit(ctx, exit, t, reachable) {
  const cx = exit.x + exit.w / 2, cy = exit.y + exit.h / 2;
  ctx.save();
  const pulse = 0.6 + Math.sin(t * 3) * 0.25;
  ctx.shadowColor = COLORS.ok; ctx.shadowBlur = 24 * pulse;
  ctx.strokeStyle = hexAlpha(COLORS.ok, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 14 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = hexAlpha(COLORS.ok, 0.35 * pulse);
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function squashScale(ent) {
  if (ent.landedThisTick) return { sx: 1.3, sy: 0.7 };
  if (ent.jumpedThisTick) return { sx: 0.85, sy: 1.18 };
  return { sx: 1, sy: 1 };
}

export function drawPlayer(ctx, p, t) {
  drawExplorer(ctx,p,t,null);
}

function drawExplorer(ctx,p,t,echoColor){
  const speed=Math.min(1,Math.abs(p.vx||0)/230),running=p.grounded&&speed>.1;
  const stride=running?Math.sin(t*22)*4*speed:0,jump=!p.grounded&&p.vy!==undefined;
  const idle=running||jump?0:Math.sin(t*3)*.5;
  const color=echoColor||'#fff4df',cyan=echoColor||'#7fe3ff';
  ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h);ctx.scale(p.facing||1,1);
  ctx.shadowBlur=echoColor?8:12;ctx.shadowColor=cyan;
  // Backpack, separate boots and a rounded helmet establish a readable explorer silhouette.
  ctx.fillStyle=echoColor?'#27304d':'#2c4658';ctx.fillRect(-11,-23,5,13);
  ctx.fillStyle=cyan;ctx.fillRect(-11,-20,2,5);ctx.shadowBlur=0;
  ctx.fillStyle=color;roundRectPath(ctx,-7,-23+idle,14,15,4);ctx.fill();
  ctx.fillRect(-7,-8+(jump?-2:stride),5,8);ctx.fillRect(2,-8+(jump?-2:-stride),5,8);
  ctx.fillStyle=cyan;ctx.fillRect(-7,-2+(jump?-2:stride),5,2);ctx.fillRect(2,-2+(jump?-2:-stride),5,2);
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(6,-21+idle);ctx.lineTo(10,-12+(jump?-7:-stride));ctx.stroke();
  ctx.fillStyle=color;roundRectPath(ctx,-10,-34+idle,20,14,6);ctx.fill();
  ctx.fillStyle='#102639';roundRectPath(ctx,-7,-30+idle,15,7,3);ctx.fill();
  ctx.fillStyle=cyan;ctx.fillRect(-4,-28+idle,11,3);ctx.fillStyle='#f5ffff';ctx.fillRect(4,-28+idle,2,2);
  ctx.fillStyle='#29495c';ctx.fillRect(-4,-19+idle,8,5);ctx.fillStyle=cyan;ctx.fillRect(0,-18+idle,2,3);
  ctx.restore();
}

export function drawEcho(ctx, e, t, intensity) {
  const color = ECHO_PALETTE[e.echoIndex % ECHO_PALETTE.length];
  ctx.save();
  ctx.globalAlpha = 0.43;
  drawExplorer(ctx,e,t,color);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.font = 'bold 9px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
    ctx.fillText(`E${e.echoIndex + 1}`, e.x + e.w / 2, e.y - 6);
  ctx.restore();
}

export function drawEchoTrail(ctx, trailPoints, echoIndex, intensity) {
  if (intensity <= 0) return;
  const color = ECHO_PALETTE[echoIndex % ECHO_PALETTE.length];
  ctx.save();
  for (let i = 0; i < trailPoints.length; i++) {
    const pt = trailPoints[i];
    const a = (i / trailPoints.length) * 0.25 * intensity;
    ctx.fillStyle = hexAlpha(color, a);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawParticles(ctx, particles) {
  ctx.save();
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    const color = p.color === 'echo' ? COLORS.violet : p.color === 'danger' ? COLORS.danger : COLORS.cyan;
    ctx.fillStyle = hexAlpha(color, a * 0.8);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- full room
export function renderRoom(ctx, w, h, game) {
  const def = game.levelDef;
  const rt = game.roomRuntime;
  const t = game.settings.reducedMotion?0:game.visualTime;
  const chapter = def.chapter;
  const accentMap = { repeat: '#7fd7ff', overlap: '#b79bff', interference: '#ff9bd6', convergence: '#ffd27f',resonance:'#73f4d4' };

  clear(ctx, w, h);
  drawBackgroundGrid(ctx, w, h, game.camera.x, accentMap[chapter] || '#7fd7ff');
  drawAtmosphere(ctx,w,h,game.camera.x,t,accentMap[chapter]||'#7fd7ff',chapter);

  ctx.save();
  ctx.translate(-game.camera.x, 0);

  for (const tile of def.tiles) drawTile(ctx, tile);

  for (const cf of def.crumblingFloors || []) drawCrumble(ctx, cf, rt.crumbling[cf.id],game.settings.reducedMotion);

  for (const mp of def.movingPlatforms || []){ctx.save();ctx.strokeStyle='rgba(127,227,255,.18)';ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(mp.points[0].x+mp.w/2,mp.points[0].y);ctx.lineTo(mp.points[1].x+mp.w/2,mp.points[1].y);ctx.stroke();ctx.restore();drawMovingPlatform(ctx,movingPlatformRectAt(mp,game.attemptTick));}

  for (const s of def.hazards || []) drawSpike(ctx, s);
  for(const h of def.movingHazards||[])drawLaser(ctx,movingPlatformRectAt(h,game.attemptTick),true,t);

  for (const plate of def.plates || []) drawPlate(ctx, plate, rt.plates[plate.id].active);
  for (const sw of def.switches || []) drawSwitch(ctx, sw, rt.switches[sw.id].on);

  for (const l of def.lasers || []) drawLaser(ctx, l, laserActiveAt(l, game.attemptTick, rt), t);

  for (const door of def.doors || []) {
    const st = rt.doors[door.id];
    drawDoor(ctx, door, st.open, st.timedUntil !== null);
    if(st.timedUntil!==null){ctx.save();ctx.fillStyle=COLORS.cyan;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(Math.max(0,(st.timedUntil-game.attemptTick)/60).toFixed(1)+'s',door.x+door.w/2,door.y-10);ctx.restore();}
  }

  drawExit(ctx, def.exit, t, true);

  drawParticles(ctx, game.particles.active);

  const intensity = game.settings.reducedMotion ? 0 : game.settings.echoTrailIntensity;
  for (const echo of game.echoes) drawEchoTrail(ctx, echo.trail, echo.echoIndex, intensity);
  for (const echo of game.echoes) drawEcho(ctx, echo, t, intensity);
  drawPlayer(ctx, game.player, t);

  ctx.restore();

  if (game.deathFlashT > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255,60,90,${(game.deathFlashT / 0.3) * 0.28})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function drawAtmosphere(ctx,w,h,cam,t,accent,chapter){
 ctx.save();
 // Recessed chamber ribs, cable runs and broken-vault details are deliberately dim.
 for(let layer=0;layer<2;layer++){
  const spacing=layer?220:150,offset=-((cam*(layer?.2:.08))%spacing);
  for(let x=offset-spacing;x<w+spacing;x+=spacing){
   ctx.fillStyle=hexAlpha(accent,layer?.035:.025);ctx.fillRect(x,50,layer?12:30,h-150);
   ctx.strokeStyle=hexAlpha(accent,.07);ctx.lineWidth=1;ctx.strokeRect(x+4,80,38,100);
   if(chapter==='interference'||chapter==='resonance'){ctx.beginPath();ctx.moveTo(x,60);ctx.lineTo(x+38,110);ctx.lineTo(x+38,160);ctx.stroke();}
   else if(chapter==='overlap'){ctx.fillRect(x+12,210,35,6);ctx.fillRect(x-20,260,25,5);}
  }
 }
 for(let i=0;i<34;i++){
  const x=((i*173.3-cam*.12+t*(3+i%4))%w+w)%w,y=45+((i*73.7)%Math.max(1,h-160))+Math.sin(t*.55+i)*7;
  ctx.fillStyle=hexAlpha(accent,.14+(i%3)*.05);ctx.fillRect(x,y,i%5===0?2:1,2);
 }
 ctx.strokeStyle=hexAlpha(accent,.12);ctx.beginPath();ctx.moveTo(0,48);ctx.lineTo(w,48);ctx.stroke();ctx.restore();
}

export function drawCelebration(ctx,w,h,celebration){
 ctx.clearRect(0,0,w,h);if(celebration.time<=0)return;
 const alpha=Math.min(1,celebration.time/.45);ctx.save();ctx.globalAlpha=alpha*.9;
 for(let i=0;i<celebration.count;i++){
  const p=celebration.particles[i];ctx.save();ctx.translate(p.x/960*w,p.y/540*h);ctx.rotate(p.angle);ctx.fillStyle=p.color;
  if(p.shape===0){ctx.beginPath();ctx.arc(0,0,p.size*.55,0,Math.PI*2);ctx.fill();}
  else ctx.fillRect(-p.size/2,-p.size/2,p.shape===2?p.size*1.8:p.size,p.shape===2?2:p.size*.6);
  ctx.restore();
 }ctx.restore();
}

export function renderRewindTransition(ctx, w, h, progress, reducedMotion) {
  ctx.save();
  const p = Math.min(1, progress);
  ctx.fillStyle = `rgba(6,10,16,${0.35 + p * 0.35})`;
  ctx.fillRect(0, 0, w, h);
  if (!reducedMotion) {
    ctx.strokeStyle = hexAlpha(COLORS.cyan, 0.5 * (1 - p));
    for (let i = 0; i < 6; i++) {
      const yy = (h / 6) * i + (1 - p) * 30 * (i % 2 === 0 ? 1 : -1);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy - 40 * p);
      ctx.stroke();
    }
  }
  ctx.fillStyle = hexAlpha(COLORS.cyan, 0.9);
  ctx.font = '600 13px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('REWINDING', w / 2, h / 2);
  ctx.restore();
}
