// Orbital Bloom - canvas renderer: starfield, glow sprites, trail fade buffer
import { CONSTANTS, PALETTE, TRAIL_FADE, state, stats } from './config.js';
import { attractors } from './attractors.js';
import * as P from './particles.js';
import { previewState } from './tools.js';
import { accelAt } from './gravity.js';

const BUCKETS = ['white', 'cyan', 'violet', 'gold', 'blue'];
let fieldGrid = null;
let fieldFrameCounter = 0;

let canvas = null, ctx = null;
let w = 0, h = 0, dpr = 1;
let sprites = {};
let bodySprites = null;
let bodySpriteSignature = '';
let stars = [[], [], []];
let nebulae = [];
let flashes = [];
let forceFullClear = true;
let lowQuality = false;
let frameTimes = [];

const TILE = 2600;
const PARALLAX = [0.035, 0.1, 0.24];

// This small FIFO cache keeps the expensive body surface gradients and marks off
// the frame path. It deliberately does not refresh on reads: "oldest" means the
// earliest generated appearance, and cache clears are limited to palette/setting changes.
export class BoundedSpriteCache {
  constructor(limit = 96) {
    this.limit = limit;
    this.entries = new Map();
  }

  get size() { return this.entries.size; }
  get(key) { return this.entries.get(key); }
  set(key, value) {
    if (!this.entries.has(key) && this.entries.size >= this.limit) {
      this.entries.delete(this.entries.keys().next().value);
    }
    this.entries.set(key, value);
    return value;
  }
  clear() { this.entries.clear(); }
}

export function bodySpriteCacheKey(body) {
  const seed = Number.isFinite(body?.appearanceSeed) ? Math.trunc(body.appearanceSeed) : 0;
  const variant = ((seed % 8) + 8) % 8;
  return `${body?.type || 'planet'}:${body?.color || 'ivory'}:${body?.gardenStage || 'young'}:${variant}`;
}

// Internal simulation types remain stable; this is the small presentation seam
// used when a selected body needs a readable player-facing name.
export function playerFacingBodyLabel(type) {
  return type === 'heavyCore' ? 'Black Hole' : null;
}

// Adaptive low-quality mode deliberately is not part of this policy. It reduces
// decorative draw work without rebuilding otherwise-valid cached body sprites.
export function bodySpriteCachePolicySignature({ palette = PALETTE, renderQuality = state.renderQuality } = {}) {
  return `${renderQuality}|${Object.values(palette).join('|')}`;
}

export function initRenderer(c) {
  canvas = c;
  ctx = canvas.getContext('2d', { alpha: false });
  bodySprites = new BoundedSpriteCache(96);
  buildSprites();
  invalidateBodySpriteCache();
  buildBackground();
}

function renderSettingsSignature() {
  return bodySpriteCachePolicySignature();
}

function invalidateBodySpriteCache() {
  bodySprites?.clear();
  bodySpriteSignature = renderSettingsSignature();
}

function invalidateBodySpriteCacheIfNeeded() {
  if (bodySpriteSignature !== renderSettingsSignature()) invalidateBodySpriteCache();
}

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function buildSprites() {
  for (const name of BUCKETS) {
    const s = document.createElement('canvas');
    s.width = 64; s.height = 64;
    const sc = s.getContext('2d');
    const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    const col = PALETTE[name];
    grad.addColorStop(0, hexAlpha(col, 1));
    grad.addColorStop(0.3, hexAlpha(col, 0.65));
    grad.addColorStop(1, hexAlpha(col, 0));
    sc.fillStyle = grad;
    sc.fillRect(0, 0, 64, 64);
    sprites[name] = s;
  }
}

export function buildBackground() {
  const counts = [42, 76, 132];
  for (let layer = 0; layer < 3; layer++) {
    stars[layer] = [];
    const n = Math.round(counts[layer] * state.backgroundDensity);
    for (let i = 0; i < n; i++) {
      stars[layer].push({
        x: Math.random() * TILE - TILE / 2,
        y: Math.random() * TILE - TILE / 2,
        r: 0.4 + Math.random() * (layer === 2 ? 1.5 : 0.9),
        b: 0.22 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
      });
    }
  }
  nebulae = [];
  const nn = Math.max(2, Math.round(4 * state.backgroundDensity));
  const palette = [PALETTE.jade, PALETTE.blue];
  for (let i = 0; i < nn; i++) {
    nebulae.push({
      x: Math.random() * TILE - TILE / 2,
      y: Math.random() * TILE - TILE / 2,
      r: 240 + Math.random() * 300,
      color: palette[i % palette.length],
      a: 0.03 + Math.random() * 0.028,
    });
  }
  forceFullClear = true;
}

export function resize(width, height, deviceRatio) {
  dpr = Math.min(deviceRatio || 1, 2);
  w = width; h = height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  forceFullClear = true;
}

export function clearTrails() { forceFullClear = true; }

export function triggerFlash(x, y, color, radius = 100) {
  flashes.push({ x, y, r: 0, maxR: radius, life: 1, color: color || PALETTE.gold });
}

function bucketFor(i) {
  if (state.classificationOverlay) {
    const c = P.pclass[i];
    return c === 2 ? 'gold' : c === 3 ? 'violet' : c === 1 ? 'blue' : 'cyan';
  }
  switch (state.colorMode) {
    case 'speed': {
      const t = P.pspeed[i] / 650;
      if (t < 0.22) return 'blue';
      if (t < 0.5) return 'cyan';
      if (t < 0.85) return 'white';
      return 'gold';
    }
    case 'gravity': {
      const t = Math.log10(1 + P.pgrav[i] * 800);
      if (t < 0.6) return 'blue';
      if (t < 1.3) return 'violet';
      if (t < 2.1) return 'white';
      return 'gold';
    }
    case 'age': {
      const maxAge = P.plife[i] >= 0 ? P.plife[i] : 24;
      const t = P.page[i] / maxAge;
      if (t < 0.12) return 'white';
      if (t < 0.5) return 'cyan';
      if (t < 0.85) return 'violet';
      return 'blue';
    }
    case 'orbital': {
      const ang = Math.atan2(P.pvy[i], P.pvx[i]);
      const norm = (ang + Math.PI) / (Math.PI * 2);
      const sector = Math.floor(norm * 5) % 5;
      return ['cyan', 'violet', 'gold', 'blue', 'white'][sector];
    }
    case 'bybody': {
      const b = P.pbucket[i];
      return b < BUCKETS.length ? BUCKETS[b] : (P.pseed[i] < 0.5 ? 'white' : 'cyan');
    }
    case 'energy': {
      // negative energy = bound (cool), positive = unbound/escaping (hot)
      const e = P.penergy[i];
      if (e < -40000) return 'blue';
      if (e < 0) return 'cyan';
      if (e < 40000) return 'white';
      return 'gold';
    }
    case 'distance': {
      const d = P.pdist[i];
      if (!isFinite(d)) return 'blue';
      if (d < 90) return 'gold';
      if (d < 220) return 'white';
      if (d < 450) return 'cyan';
      return 'blue';
    }
    default:
      return P.pseed[i] < 0.055 ? 'gold' : (P.pseed[i] < 0.5 ? 'white' : 'cyan');
  }
}

function updateFpsAndQuality(dtReal) {
  frameTimes.push(dtReal);
  if (frameTimes.length > 40) frameTimes.shift();
  const avg = frameTimes.reduce((s, v) => s + v, 0) / frameTimes.length;
  stats.fps = Math.round(1 / Math.max(avg, 0.0001));
  const q = state.renderQuality;
  if (q === 'low') lowQuality = true;
  else if (q === 'medium') lowQuality = stats.fps < 32 && P.count > 1500;
  else if (q === 'high') lowQuality = stats.fps < 18 && P.count > 3000; // emergency-only degrade
  else lowQuality = stats.fps < 26 && P.count > 2200; // auto
}

export function render(camera, width, height, dtReal) {
  updateFpsAndQuality(dtReal);
  invalidateBodySpriteCacheIfNeeded();
  const fade = state.motionBlur
    ? Math.min(TRAIL_FADE[state.trailLength], 0.02)
    : TRAIL_FADE[state.trailLength];

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (forceFullClear || fade >= 1) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, width, height);
    forceFullClear = false;
  } else {
    ctx.fillStyle = hexAlpha(PALETTE.ocean, fade);
    ctx.fillRect(0, 0, width, height);
  }

  drawBackground(camera, width, height);
  if (state.gravityOverlay) drawGravityField(camera, width, height);
  drawAttractorTrails(camera, width, height);
  drawAttractors(camera, width, height);
  drawParticles(camera, width, height);
  drawFlashes(camera, width, height, dtReal);
  drawPreview(camera, width, height);
}

function drawBackground(camera, width, height) {
  ctx.save();
  for (let layer = 0; layer < 3; layer++) {
    const par = PARALLAX[layer];
    const offX = camera.x * par;
    const offY = camera.y * par;
    for (const s of stars[layer]) {
      let x = (((s.x - offX) % TILE) + TILE) % TILE - TILE / 2 + width / 2;
      let y = (((s.y - offY) % TILE) + TILE) % TILE - TILE / 2 + height / 2;
      if (x < -10 || x > width + 10 || y < -10 || y > height + 10) continue;
      const twinkle = state.reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(stats.simTime * s.speed + s.phase);
      ctx.globalAlpha = s.b * twinkle;
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const neb of nebulae) {
    const par = 0.05;
    let x = (((neb.x - camera.x * par) % TILE) + TILE) % TILE - TILE / 2 + width / 2;
    let y = (((neb.y - camera.y * par) % TILE) + TILE) % TILE - TILE / 2 + height / 2;
    if (x < -neb.r || x > width + neb.r || y < -neb.r || y > height + neb.r) continue;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, neb.r);
    grad.addColorStop(0, hexAlpha(neb.color, neb.a));
    grad.addColorStop(1, hexAlpha(neb.color, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, neb.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGravityField(camera, width, height) {
  const g = CONSTANTS.G_DEFAULT * state.gravityStrength;
  const cols = 14, rows = 9;
  fieldFrameCounter++;
  if (!fieldGrid || fieldFrameCounter % 4 === 0) {
    fieldGrid = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = (c + 0.5) / cols * width;
        const sy = (r + 0.5) / rows * height;
        const [wx, wy] = camera.screenToWorld(sx, sy, width, height);
        const [ax, ay] = accelAt(wx, wy, g);
        fieldGrid.push({ sx, sy, ax, ay });
      }
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexAlpha(PALETTE.violet, 0.3);
  ctx.lineWidth = 1.2;
  for (const p of fieldGrid) {
    const mag = Math.hypot(p.ax, p.ay);
    if (mag < 0.0002) continue;
    const len = Math.min(6 + Math.log10(1 + mag * 400) * 10, 34);
    const ang = Math.atan2(p.ay, p.ax);
    const ex = p.sx + Math.cos(ang) * len;
    const ey = p.sy + Math.sin(ang) * len;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(ex, ey);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang - 0.4) * 4, ey - Math.sin(ang - 0.4) * 4);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang + 0.4) * 4, ey - Math.sin(ang + 0.4) * 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAttractorTrails(camera, width, height) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (const a of attractors) {
    if (a.fixed || a.showTrail === false || a.trail.length < 4) continue;
    ctx.strokeStyle = hexAlpha(PALETTE.ivory, 0.44);
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let k = 0; k < a.trail.length; k += 2) {
      const [sx, sy] = camera.worldToScreen(a.trail[k], a.trail[k + 1], width, height);
      if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawAttractors(camera, width, height) {
  ctx.save();
  for (const a of attractors) {
    const [sx, sy] = camera.worldToScreen(a.x, a.y, width, height);
    const r = a.radius * camera.zoom;
    if (sx < -r * 4 || sx > width + r * 4 || sy < -r * 4 || sy > height + r * 4) continue;
    drawCelestialBody(a, sx, sy, r);

    if (a.fixed) {
      ctx.strokeStyle = hexAlpha('#ffffff', 0.55);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (a.id === state.selectedAttractorId) {
      ctx.strokeStyle = hexAlpha(PALETTE.white, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 9, 0, Math.PI * 2);
      ctx.stroke();
      drawSelectedBodyLabel(a, sx, sy, r);
    }
  }
  ctx.restore();
}

function drawSelectedBodyLabel(body, sx, sy, radius) {
  const label = playerFacingBodyLabel(body.type);
  if (!label) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PALETTE.ivory;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, sx, sy + radius + 22);
  ctx.restore();
}

function drawCelestialBody(body, sx, sy, radius) {
  const type = body.type;
  const color = PALETTE[body.color] || PALETTE.ivory;
  const cachedType = type === 'star' || type === 'planet' || type === 'moon' || type === 'heavyCore';
  if (!cachedType || radius < 1) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(radius, 1), 0, Math.PI * 2); ctx.fill();
    return;
  }

  if (type === 'star') drawStarCorona(sx, sy, radius, body.flash || 0);
  const sprite = getBodySprite(body);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sprite, sx - radius, sy - radius, radius * 2, radius * 2);

  if (type === 'planet') drawPlanetLight(body, sx, sy, radius);
  if (type === 'heavyCore') drawHeavyCoreAccretion(body, sx, sy, radius);
  if (body.ringStrength > 0) drawBodyRing(body, sx, sy, radius);
}

function getBodySprite(body) {
  const key = bodySpriteCacheKey(body);
  const existing = bodySprites.get(key);
  if (existing) return existing;
  const sprite = document.createElement('canvas');
  sprite.width = 144; sprite.height = 144;
  const sc = sprite.getContext('2d');
  const seed = ((Number.isFinite(body.appearanceSeed) ? body.appearanceSeed : 0) >>> 0) % 8;
  const color = PALETTE[body.color] || PALETTE.ivory;
  if (body.type === 'star') paintStarSprite(sc, color, seed);
  else if (body.type === 'planet') paintPlanetSprite(sc, color, body.gardenStage, seed);
  else if (body.type === 'moon') paintMoonSprite(sc, color, seed);
  else paintHeavyCoreSprite(sc, seed);
  return bodySprites.set(key, sprite);
}

function seededUnit(seed, index) {
  const value = Math.imul((seed + 1) ^ Math.imul(index + 11, 0x45d9f3b), 0x27d4eb2d) >>> 0;
  return value / 0x100000000;
}

function paintStarSprite(sc, color, seed) {
  const core = sc.createRadialGradient(59, 54, 2, 72, 72, 48);
  core.addColorStop(0, PALETTE.ivory);
  core.addColorStop(0.48, PALETTE.amber);
  core.addColorStop(1, color);
  sc.fillStyle = core; sc.beginPath(); sc.arc(72, 72, 46, 0, Math.PI * 2); sc.fill();
  sc.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 12; i++) {
    const angle = seededUnit(seed, i) * Math.PI * 2;
    const distance = 9 + seededUnit(seed, i + 16) * 29;
    sc.fillStyle = hexAlpha(PALETTE.ivory, 0.08 + seededUnit(seed, i + 28) * 0.13);
    sc.beginPath(); sc.arc(72 + Math.cos(angle) * distance, 72 + Math.sin(angle) * distance, 1 + seededUnit(seed, i + 41) * 3, 0, Math.PI * 2); sc.fill();
  }
}

function paintPlanetSprite(sc, color, stage, seed) {
  const surface = sc.createRadialGradient(49, 46, 3, 72, 72, 48);
  surface.addColorStop(0, PALETTE.ivory);
  surface.addColorStop(0.25, color);
  surface.addColorStop(1, PALETTE.blue);
  sc.fillStyle = surface; sc.beginPath(); sc.arc(72, 72, 46, 0, Math.PI * 2); sc.fill();
  sc.save(); sc.beginPath(); sc.arc(72, 72, 46, 0, Math.PI * 2); sc.clip();
  for (let i = 0; i < 7; i++) {
    const x = 39 + seededUnit(seed, i) * 66;
    const y = 44 + seededUnit(seed, i + 17) * 55;
    sc.fillStyle = hexAlpha(stage === 'blooming' ? PALETTE.jade : PALETTE.ivory, 0.12 + seededUnit(seed, i + 31) * 0.12);
    sc.beginPath(); sc.ellipse(x, y, 5 + seededUnit(seed, i + 47) * 12, 2 + seededUnit(seed, i + 61) * 5, seededUnit(seed, i + 79) * Math.PI, 0, Math.PI * 2); sc.fill();
  }
  sc.restore();
  if (stage === 'temperate' || stage === 'blooming') {
    sc.strokeStyle = hexAlpha(PALETTE.jade, stage === 'blooming' ? 0.52 : 0.34);
    sc.lineWidth = stage === 'blooming' ? 4 : 2;
    sc.beginPath(); sc.arc(72, 72, 49, 0, Math.PI * 2); sc.stroke();
  }
}

function paintMoonSprite(sc, color, seed) {
  const surface = sc.createRadialGradient(52, 49, 3, 72, 72, 45);
  surface.addColorStop(0, PALETTE.ivory);
  surface.addColorStop(0.55, color);
  surface.addColorStop(1, PALETTE.blue);
  sc.fillStyle = surface; sc.beginPath(); sc.arc(72, 72, 44, 0, Math.PI * 2); sc.fill();
  sc.save(); sc.beginPath(); sc.arc(72, 72, 44, 0, Math.PI * 2); sc.clip();
  for (let i = 0; i < 5; i++) {
    sc.fillStyle = hexAlpha(PALETTE.blue, 0.18 + seededUnit(seed, i + 11) * 0.12);
    sc.beginPath(); sc.arc(48 + seededUnit(seed, i) * 43, 48 + seededUnit(seed, i + 22) * 42, 3 + seededUnit(seed, i + 33) * 7, 0, Math.PI * 2); sc.fill();
  }
  sc.restore();
}

function paintHeavyCoreSprite(sc, seed) {
  const edge = sc.createRadialGradient(72, 72, 7, 72, 72, 48);
  edge.addColorStop(0, '#02080a'); edge.addColorStop(0.6, '#030a0d'); edge.addColorStop(1, PALETTE.blue);
  sc.fillStyle = edge; sc.beginPath(); sc.arc(72, 72, 43, 0, Math.PI * 2); sc.fill();
  sc.strokeStyle = hexAlpha(PALETTE.ivory, 0.72); sc.lineWidth = 2;
  sc.beginPath(); sc.ellipse(72, 72, 52, 13, 0, 0, Math.PI * 2); sc.stroke();
  sc.strokeStyle = hexAlpha(PALETTE.amber, 0.18 + seededUnit(seed, 1) * 0.14); sc.lineWidth = 1;
  sc.beginPath(); sc.arc(72, 72, 38, Math.PI * 1.14, Math.PI * 1.82); sc.stroke();
}

function drawStarCorona(sx, sy, radius, flash) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [scale, alpha] of [[3.2, 0.13], [1.9, 0.25]]) {
    const corona = ctx.createRadialGradient(sx, sy, radius * 0.25, sx, sy, radius * (scale + flash));
    corona.addColorStop(0, hexAlpha(PALETTE.amber, alpha + flash * 0.12));
    corona.addColorStop(1, hexAlpha(PALETTE.amber, 0));
    ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(sx, sy, radius * (scale + flash), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPlanetLight(body, sx, sy, radius) {
  const star = attractors.find(a => a.type === 'star' && a.id === body.dominantStarId)
    || attractors.find(a => a.type === 'star');
  if (!star) return;
  const angle = Math.atan2(star.y - body.y, star.x - body.x);
  ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.clip();
  const nx = Math.cos(angle), ny = Math.sin(angle);
  const shade = ctx.createLinearGradient(sx + nx * radius, sy + ny * radius, sx - nx * radius, sy - ny * radius);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(0.48, 'rgba(0,0,0,0.08)'); shade.addColorStop(1, 'rgba(0,0,0,0.68)');
  ctx.fillStyle = shade; ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2); ctx.restore();
}

function drawHeavyCoreAccretion(body, sx, sy, radius) {
  if (lowQuality || state.reducedMotion) return;
  const sweep = (stats.simTime * 0.7 + ((body.appearanceSeed || 0) % 8)) % (Math.PI * 2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexAlpha(PALETTE.amber, 0.3); ctx.lineWidth = Math.max(1, radius * 0.11);
  ctx.beginPath(); ctx.ellipse(sx, sy, radius * 1.45, radius * 0.36, -0.18, sweep, sweep + Math.PI * 0.72); ctx.stroke(); ctx.restore();
}

function drawBodyRing(body, sx, sy, radius) {
  const strength = Math.min(1, Math.max(0, body.ringStrength || 0));
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = hexAlpha(PALETTE.ivory, Math.min(0.7, 0.18 + strength * 0.52));
  ctx.lineWidth = Math.max(1, radius * 0.1); ctx.beginPath(); ctx.ellipse(sx, sy, radius * (1.3 + strength * 0.45), radius * (0.42 + strength * 0.12), -0.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

function drawParticles(camera, width, height) {
  ctx.save();
  const useLighter = !(lowQuality || P.count > 3000);
  ctx.globalCompositeOperation = useLighter ? 'lighter' : 'source-over';
  const baseSize = 9 * state.particleSize * camera.zoom;
  const bright = state.particleBrightness;
  const style = state.trailStyle === 'off' ? 'soft' : state.trailStyle;

  for (let i = 0; i < P.count; i++) {
    const [sx, sy] = camera.worldToScreen(P.px[i], P.py[i], width, height);
    if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) continue;

    const bucket = bucketFor(i);
    const sprite = sprites[bucket];
    let alpha = Math.min(bright * (0.55 + P.pseed[i] * 0.5), 1.6);
    let size = baseSize * (0.7 + P.pseed[i] * 0.5);
    ctx.globalAlpha = Math.min(alpha, 1);

    if (style === 'dust') {
      ctx.fillStyle = sprite === sprites.white ? '#ffffff' : sprite === sprites.cyan ? PALETTE.cyan : sprite === sprites.violet ? PALETTE.violet : sprite === sprites.gold ? PALETTE.gold : PALETTE.blue;
      const s = Math.max(1, size * 0.16);
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
    } else if (style === 'line') {
      const [psx, psy] = camera.worldToScreen(P.pPrevX[i], P.pPrevY[i], width, height);
      ctx.strokeStyle = ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = bucket === 'white' ? '#ffffff' : PALETTE[bucket];
      ctx.lineWidth = Math.max(1, size * 0.12);
      ctx.beginPath();
      ctx.moveTo(psx, psy);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    } else if (style === 'comet') {
      const vx = P.pvx[i], vy = P.pvy[i];
      const speed = Math.hypot(vx, vy);
      const ang = speed > 1 ? Math.atan2(vy, vx) : 0;
      const stretch = Math.min(1 + speed / 220, 3.2);
      ctx.globalAlpha = Math.min(ctx.globalAlpha * (1 + Math.min(speed / 500, 1) * 0.5), 1);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.translate(-size * (stretch - 1) * 0.5, 0);
      ctx.drawImage(sprite, -size * stretch / 2, -size / 2, size * stretch, size);
      ctx.restore();
    } else {
      // soft (default): velocity-adaptive — fast particles stretch into a brighter
      // streak with the bright head leading; slow particles stay small round dots
      // and rely on the trail fade-buffer to trace out smooth curved arcs.
      const speedT = Math.min(P.pspeed[i] / 500, 1);
      ctx.globalAlpha = Math.min(ctx.globalAlpha * (1 + speedT * 0.45), 1);
      if (speedT > 0.05) {
        const ang = Math.atan2(P.pvy[i], P.pvx[i]);
        const stretch = 1 + speedT * 1.1;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang);
        ctx.translate(-size * (stretch - 1) * 0.5, 0);
        ctx.drawImage(sprite, -size * stretch / 2, -size / 2, size * stretch, size);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);
      }
    }
  }
  ctx.restore();
}

function drawFlashes(camera, width, height, dtReal) {
  if (flashes.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.life -= dtReal * (state.reducedMotion ? 3.5 : 1.8);
    if (f.life <= 0) { flashes.splice(i, 1); continue; }
    const [sx, sy] = camera.worldToScreen(f.x, f.y, width, height);
    const r = f.maxR * camera.zoom * (1 - f.life) + 4;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, hexAlpha(f.color, f.life * (state.screenFlash ? 0.9 : 0.4)));
    grad.addColorStop(1, hexAlpha(f.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPreview(camera, width, height) {
  const pv = previewState;
  if (!pv.active) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.85;

  if (pv.trajectory?.length > 1) drawTrajectoryGuide(pv, camera, width, height);

  if (pv.kind === 'spawn') {
    const [sx, sy] = camera.worldToScreen(pv.cx, pv.cy, width, height);
    const r = pv.radius * camera.zoom;
    ctx.strokeStyle = hexAlpha(PALETTE.cyan, 0.75);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(r, 2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (pv.dirX !== undefined) {
      const ex = sx + pv.dirX * camera.zoom, ey = sy + pv.dirY * camera.zoom;
      const ang = Math.atan2(pv.dirY, pv.dirX);
      ctx.strokeStyle = hexAlpha(PALETTE.gold, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(ang - 0.45) * 14, ey - Math.sin(ang - 0.45) * 14);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(ang + 0.45) * 14, ey - Math.sin(ang + 0.45) * 14);
      ctx.stroke();
    }
  } else if (pv.kind === 'velocity') {
    const [sx, sy] = camera.worldToScreen(pv.cx, pv.cy, width, height);
    const [ex, ey] = camera.worldToScreen(pv.ex, pv.ey, width, height);
    ctx.strokeStyle = hexAlpha(PALETTE.gold, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (pv.kind === 'impulse') {
    ctx.strokeStyle = hexAlpha(PALETTE.violet, 0.8);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < pv.points.length; k += 2) {
      const [sx, sy] = camera.worldToScreen(pv.points[k], pv.points[k + 1], width, height);
      if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  } else if (pv.kind === 'erase') {
    const [sx, sy] = camera.worldToScreen(pv.cx, pv.cy, width, height);
    ctx.strokeStyle = hexAlpha('#ff6b6b', 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, pv.radius * camera.zoom, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrajectoryGuide(pv, camera, width, height) {
  const outcome = pv.orbitHealth || 'uncertain';
  const color = outcome === 'stable' ? PALETTE.jade : outcome === 'danger' ? PALETTE.coral : PALETTE.amber;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  if (outcome === 'uncertain') ctx.setLineDash([6, 5]);
  if (outcome === 'danger') {
    for (let i = 1; i < pv.trajectory.length; i++) {
      if (i % 2 === 0) continue;
      const [x1, y1] = camera.worldToScreen(pv.trajectory[i - 1].x, pv.trajectory[i - 1].y, width, height);
      const [x2, y2] = camera.worldToScreen(pv.trajectory[i].x, pv.trajectory[i].y, width, height);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  } else {
    ctx.beginPath();
    for (let i = 0; i < pv.trajectory.length; i++) {
      const [sx, sy] = camera.worldToScreen(pv.trajectory[i].x, pv.trajectory[i].y, width, height);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const end = pv.trajectory[pv.trajectory.length - 1];
  const [labelX, labelY] = camera.worldToScreen(end.x, end.y, width, height);
  ctx.fillStyle = color; ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(outcome === 'stable' ? 'STABLE' : outcome === 'danger' ? '⚠ DANGER' : 'UNCERTAIN', labelX + 8, labelY - 8);
  ctx.restore();
}
