import { CONFIG } from './config.js';

const COLORS = Object.freeze({
  background: '#05070c', cyan: '#25e6ff', red: '#ff3b5c', gold: '#f7c956', white: '#e8fbff'
});

function box(ctx, item, color, fill = false) {
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}44`;
  ctx.lineWidth = 2;
  if (fill) ctx.fillRect(item.x, item.y, item.w, item.h);
  ctx.strokeRect(item.x, item.y, item.w, item.h);
}

function drawChamber(ctx, chamber, remaining) {
  if (!chamber) return;
  const remainingSet = new Set(remaining ?? []);
  chamber.walls.forEach((item) => box(ctx, item, '#17475a', true));
  chamber.nodes.filter((item) => remainingSet.has(item.id)).forEach((item) => box(ctx, item, COLORS.cyan, true));
  chamber.shards.forEach((item) => box(ctx, item, COLORS.gold, true));
  chamber.shields.forEach((item) => box(ctx, item, '#8be8ff', true));
  chamber.lasers.forEach((item) => box(ctx, item, COLORS.red, true));
  chamber.barriers.forEach((item) => box(ctx, item, COLORS.red));
}

function pointAt(center, angle, orbit) {
  return { x: center.x + Math.cos(angle) * orbit, y: center.y + Math.sin(angle) * orbit };
}

function drawWarden(ctx, frame) {
  if (!frame) return;
  const center = { x: 195, y: 375 };
  ctx.strokeStyle = COLORS.red;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(center.x, center.y, 48, 0, Math.PI * 2); ctx.stroke();
  for (const shield of frame.shields ?? []) {
    const p = pointAt(center, shield.angle, shield.orbitRadius);
    ctx.strokeRect(p.x - 22, p.y - 5, 44, 10);
  }
  for (const weak of frame.weakPoints ?? []) {
    const p = pointAt(center, weak.angle, 54);
    ctx.fillStyle = weak.open ? COLORS.gold : '#6f3850';
    ctx.beginPath(); ctx.arc(p.x, p.y, weak.radius, 0, Math.PI * 2); ctx.fill();
  }
  for (const laser of frame.lasers ?? []) drawLaser(ctx, laser);
}

function drawLaser(ctx, laser) {
  ctx.save();
  ctx.strokeStyle = laser.type === 'laser' ? COLORS.red : `${COLORS.red}88`;
  ctx.lineWidth = laser.type === 'laser' ? 8 : 3;
  ctx.setLineDash(laser.type === 'laser' ? [] : [10, 8]);
  ctx.beginPath();
  if (laser.orientation === 'horizontal') {
    const x = 16 + Math.max(0, Math.min(1, laser.progress)) * 358;
    ctx.moveTo(x, 88); ctx.lineTo(x, 812);
  } else if (laser.direction === 'top-left-to-bottom-right') {
    const offset = (laser.progress * 2 - 1) * 390;
    ctx.moveTo(-400, -400 + offset); ctx.lineTo(800, 800 + offset);
  } else {
    const offset = laser.progress * 780;
    ctx.moveTo(-400, 400 + offset); ctx.lineTo(800, -800 + offset);
  }
  ctx.stroke(); ctx.restore();
}

export function render(ctx, frame, options = {}) {
  ctx.clearRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);
  ctx.strokeStyle = '#0d2633';
  for (let y = 100; y < 812; y += 48) {
    ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(374, y); ctx.stroke();
  }
  drawChamber(ctx, frame.run.chamber, frame.run.remainingTargetIds);
  drawWarden(ctx, frame.warden);
  if (frame.aim && !frame.bolt) {
    const spawn = frame.run.chamber?.spawn ?? { x: 195, y: 770 };
    const speed = Math.hypot(frame.aim.velocity.x, frame.aim.velocity.y) || 1;
    ctx.strokeStyle = `${COLORS.cyan}aa`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(spawn.x, spawn.y);
    ctx.lineTo(spawn.x + frame.aim.velocity.x / speed * 260, spawn.y + frame.aim.velocity.y / speed * 260);
    ctx.stroke(); ctx.setLineDash([]);
  }
  if (frame.bolt) {
    ctx.fillStyle = options.cosmetic === 'gold' ? COLORS.gold : COLORS.cyan;
    ctx.beginPath(); ctx.arc(frame.bolt.position.x, frame.bolt.position.y, 5, 0, Math.PI * 2); ctx.fill();
  }
}
