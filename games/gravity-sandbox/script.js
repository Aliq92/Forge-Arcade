(() => {
'use strict';

/* ============================= CONSTANTS ============================= */

const G = 6000;
const SOFTENING = 14;
const MAX_ACCEL = 260000;
const MAX_SPEED = 6000;
const FIXED_DT = 1 / 120;
const MAX_STEPS_PER_FRAME = 60;
const LAUNCH_SCALE = 1.8;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 6;
const MIN_DRAG_PX = 6;

const TYPE_LABEL = { planet: 'Planet', moon: 'Moon', star: 'Star', blackhole: 'Black Hole' };

const MASS_RANGE = {
  planet:    { min: 5,    max: 400,   step: 1,   def: 60 },
  moon:      { min: 2,    max: 80,    step: 1,   def: 12 },
  star:      { min: 500,  max: 12000, step: 10,  def: 3000 },
  blackhole: { min: 3000, max: 60000, step: 50,  def: 15000 },
};

const TRAIL_LENGTHS = { off: 0, short: 25, medium: 75, long: 160 };
const TRAJECTORY_STEPS = { off: 0, short: 90, medium: 180, long: 320 };

const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ============================= CANVAS SETUP ============================ */

const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

let dpr = Math.min(window.devicePixelRatio || 1, 2);
let width = window.innerWidth;
let height = window.innerHeight;
let bgGradient = null;
let stars = [];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  bgGradient = makeBgGradient();
  stars = makeStars(clamp(Math.floor((width * height) / 6000), 80, 420));
}

function makeBgGradient() {
  const g = ctx.createRadialGradient(width / 2, height * 0.32, 0, width / 2, height * 0.32, Math.max(width, height) * 0.85);
  g.addColorStop(0, '#0b1128');
  g.addColorStop(0.55, '#060811');
  g.addColorStop(1, '#020207');
  return g;
}

function makeStars(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.3 + 0.3,
    baseAlpha: Math.random() * 0.5 + 0.15,
    speed: Math.random() * 1.1 + 0.25,
    phase: Math.random() * Math.PI * 2,
    bright: Math.random() < 0.06,
  }));
}

window.addEventListener('resize', resize);
resize();

/* ============================== UTILITIES ============================== */

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }
function lerp(a, b, t) { return a + (b - a) * t; }
function zoomScale(v, lo, hi) { return clamp(v / camera.zoom, lo, hi); }

function radiusForMass(mass, type) {
  if (type === 'blackhole') return clamp(6 + Math.cbrt(mass) * 1.4, 9, 70);
  return clamp(Math.cbrt(mass) * 2.3, 5, 90);
}

function getMaxBodies() { return width < 700 ? 45 : 90; }

let nameCounters = { planet: 0, moon: 0, star: 0, blackhole: 0 };
function nextName(type) {
  nameCounters[type]++;
  return `${TYPE_LABEL[type]} ${nameCounters[type]}`;
}

/* ================================ BODY =================================== */

let idCounter = 1;

class Body {
  constructor(x, y, vx, vy, mass, type, name) {
    this.id = idCounter++;
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.ax = 0; this.ay = 0;
    this.mass = mass;
    this.type = type;
    this.name = name || nextName(type);
    this.radius = radiusForMass(mass, type);
    this.fixed = false;
    this.trail = [];
    this.paletteVariant = Math.random() < 0.5 ? 'a' : 'b';
    this.spinPhase = Math.random() * Math.PI * 2;
    this.craters = type === 'moon'
      ? Array.from({ length: 3 }, () => ({
          dx: (Math.random() - 0.5) * 0.85,
          dy: (Math.random() - 0.5) * 0.85,
          r: 0.14 + Math.random() * 0.16,
        }))
      : null;
  }
}

function palette(b) {
  switch (b.type) {
    case 'planet':
      return b.paletteVariant === 'a'
        ? { c0: '#d7fbee', c1: '#4fbf8f', c2: '#1c5c44', glow: '#59c9a5' }
        : { c0: '#dff1ff', c1: '#4f9fe0', c2: '#1c4a78', glow: '#6ad2ff' };
    case 'moon':
      return { c0: '#ffffff', c1: '#c3c9dc', c2: '#666d88', glow: '#b9c0d4' };
    case 'star':
      return { c0: '#fffdf2', c1: '#ffd27a', c2: '#ff9d3f', glow: '#ffcf7a' };
    case 'blackhole':
      return { c0: '#241238', c1: '#0c0616', c2: '#000000', glow: '#b98bff', ring2: '#6ad2ff' };
  }
}

/* ============================== WORLD STATE ============================== */

let bodies = [];
let selected = null;
let running = true;
let speedMultiplier = 1;
let simTime = 0;
let accumulator = 0;
let initialSnapshot = [];
let collisionMode = 'merge'; // 'merge' | 'bounce' | 'pass'
let trajectoryKey = 'medium';
let mode = 'spawn'; // 'spawn' | 'select' | 'pan'
let cinematic = false;
let followTarget = null;
let cameraAnim = null;
let effects = [];
let fieldPoints = [];
let fieldTimer = 0;

const camera = { x: 0, y: 0, zoom: 1 };

const display = { trails: true, labels: true, vectors: false, com: false, field: false, trailLength: 'medium' };

let currentSpawnType = 'planet';

/* ============================ COORD TRANSFORMS =========================== */

function worldToScreen(x, y) {
  return { x: width / 2 + (x - camera.x) * camera.zoom, y: height / 2 + (y - camera.y) * camera.zoom };
}
function screenToWorld(x, y) {
  return { x: (x - width / 2) / camera.zoom + camera.x, y: (y - height / 2) / camera.zoom + camera.y };
}

/* ================================ PHYSICS ================================= */

function computeAccelerations() {
  for (const b of bodies) { b.ax = 0; b.ay = 0; }
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const dist = Math.sqrt(distSq);
      const invDist3 = 1 / (distSq * dist);
      const fa = G * b.mass * invDist3;
      const fb = G * a.mass * invDist3;
      a.ax += fa * dx; a.ay += fa * dy;
      b.ax -= fb * dx; b.ay -= fb * dy;
    }
    const accelMag = Math.hypot(a.ax, a.ay);
    if (accelMag > MAX_ACCEL) {
      const s = MAX_ACCEL / accelMag;
      a.ax *= s; a.ay *= s;
    }
  }
}

function integrate(dt) {
  for (const b of bodies) {
    if (b.fixed) { b.vx = 0; b.vy = 0; continue; }
    b.vx += b.ax * dt;
    b.vy += b.ay * dt;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > MAX_SPEED) {
      const s = MAX_SPEED / speed;
      b.vx *= s; b.vy *= s;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (!isFinite(b.x) || !isFinite(b.y)) { b.x = 0; b.y = 0; b.vx = 0; b.vy = 0; }
  }
}

function resolveBounce(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  if (dist < 0.0001) dist = 0.0001;
  const nx = dx / dist, ny = dy / dist;
  const aInv = a.fixed ? 0 : 1 / a.mass;
  const bInv = b.fixed ? 0 : 1 / b.mass;
  const invSum = aInv + bInv;
  if (invSum <= 0) return;

  const overlap = (a.radius + b.radius) - dist;
  if (overlap > 0) {
    a.x -= nx * overlap * (aInv / invSum);
    a.y -= ny * overlap * (aInv / invSum);
    b.x += nx * overlap * (bInv / invSum);
    b.y += ny * overlap * (bInv / invSum);
  }

  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return;

  const restitution = 0.55;
  const j = -(1 + restitution) * velAlongNormal / invSum;
  const ix = j * nx, iy = j * ny;
  a.vx -= ix * aInv; a.vy -= iy * aInv;
  b.vx += ix * bInv; b.vy += iy * bInv;
}

function handleCollisions() {
  if (collisionMode === 'pass') return;

  if (collisionMode === 'merge') {
    let mergedAny = true;
    while (mergedAny) {
      mergedAny = false;
      outer:
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i], b = bodies[j];
          const minDist = (a.radius + b.radius) * 0.92;
          if (dist2(a.x, a.y, b.x, b.y) < minDist * minDist) {
            mergeBodies(i, j);
            mergedAny = true;
            break outer;
          }
        }
      }
    }
  } else if (collisionMode === 'bounce') {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        const minDist = a.radius + b.radius;
        if (dist2(a.x, a.y, b.x, b.y) < minDist * minDist) {
          resolveBounce(a, b);
        }
      }
    }
  }
}

function mergeBodies(i, j) {
  const a = bodies[i], b = bodies[j];
  const totalMass = a.mass + b.mass;
  const dominant = a.mass >= b.mass ? a : b;
  const isBH = a.type === 'blackhole' || b.type === 'blackhole';
  const bhParent = a.type === 'blackhole' ? a : (b.type === 'blackhole' ? b : dominant);
  const newType = isBH ? 'blackhole' : dominant.type;

  const merged = new Body(
    (a.x * a.mass + b.x * b.mass) / totalMass,
    (a.y * a.mass + b.y * b.mass) / totalMass,
    (a.vx * a.mass + b.vx * b.mass) / totalMass,
    (a.vy * a.mass + b.vy * b.mass) / totalMass,
    totalMass,
    newType,
    isBH ? bhParent.name : dominant.name
  );
  merged.paletteVariant = dominant.paletteVariant;
  merged.trail = dominant.trail;
  merged.fixed = a.fixed || b.fixed;
  if (merged.fixed) { merged.vx = 0; merged.vy = 0; }

  const pal = palette(merged);
  effects.push({ x: merged.x, y: merged.y, r: Math.max(a.radius, b.radius), t: 0, dur: reducedMotion ? 0.25 : 0.55, color: pal.glow });

  const wasSelected = selected === a || selected === b;
  const wasFollowed = followTarget === a || followTarget === b;
  bodies.splice(j, 1);
  bodies.splice(i, 1);
  bodies.push(merged);
  if (wasSelected) selectBody(merged);
  if (wasFollowed) followTarget = merged;
}

function physicsStep(dt) {
  computeAccelerations();

  let maxSpeed = 0, minRadius = Infinity;
  for (const b of bodies) {
    if (b.fixed) continue;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > maxSpeed) maxSpeed = sp;
    if (b.radius < minRadius) minRadius = b.radius;
  }
  let substeps = 1;
  if (isFinite(minRadius) && minRadius > 0 && maxSpeed > 0) {
    substeps = clamp(Math.ceil((maxSpeed * dt) / (minRadius * 0.6)), 1, 6);
  }
  const subDt = dt / substeps;
  for (let s = 0; s < substeps; s++) {
    integrate(subDt);
    handleCollisions();
  }
  simTime += dt;
}

function stepOnce() {
  if (!bodies.length) return;
  if (running) { running = false; updatePlayButton(); }
  physicsStep(FIXED_DT);
  pushTrailPoints();
}

/* ============================== TRAILS =================================== */

function currentTrailMax() { return TRAIL_LENGTHS[display.trailLength]; }

function pushTrailPoints() {
  const max = currentTrailMax();
  for (const b of bodies) {
    if (max <= 0) { if (b.trail.length) b.trail.length = 0; continue; }
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > max) b.trail.splice(0, b.trail.length - max);
  }
}

function applyTrailLength() {
  const max = currentTrailMax();
  for (const b of bodies) {
    if (b.trail.length > max) b.trail.splice(0, b.trail.length - max);
  }
}

/* =============================== PRESETS ================================= */

function softenedOrbitalSpeed(centralMass, r) {
  const distSq = r * r + SOFTENING * SOFTENING;
  const dist = Math.sqrt(distSq);
  const accel = G * centralMass * r / (distSq * dist);
  return Math.sqrt(accel * r);
}

function twoBodyOrbit(m1, m2, separation) {
  const totalMass = m1 + m2;
  const r1 = separation * m2 / totalMass;
  const r2 = separation * m1 / totalMass;
  const vRel = softenedOrbitalSpeed(totalMass, separation);
  const v1 = vRel * m2 / totalMass;
  const v2 = vRel * m1 / totalMass;
  return {
    pos1: { x: -r1, y: 0 }, pos2: { x: r2, y: 0 },
    vel1: { x: 0, y: -v1 }, vel2: { x: 0, y: v2 },
  };
}

function circularVelocity(centralMass, r) {
  return softenedOrbitalSpeed(centralMass, r);
}

const PRESETS = {
  'earth-moon': () => {
    const o = twoBodyOrbit(600, 9, 95);
    return {
      zoom: 2.1,
      bodies: [
        new Body(o.pos1.x, o.pos1.y, o.vel1.x, o.vel1.y, 600, 'planet', 'Earth'),
        new Body(o.pos2.x, o.pos2.y, o.vel2.x, o.vel2.y, 9, 'moon', 'Moon'),
      ],
    };
  },
  'solar-system': () => {
    const starMass = 9000;
    const star = new Body(0, 0, 0, 0, starMass, 'star', 'Sol');
    const defs = [
      { r: 100, m: 6,  name: 'Mercuri' },
      { r: 175, m: 10, name: 'Veneris' },
      { r: 260, m: 11, name: 'Terra' },
      { r: 360, m: 16, name: 'Jovis' },
      { r: 470, m: 12, name: 'Saturnus' },
    ];
    const list = [star];
    defs.forEach((d, idx) => {
      const angle = idx * 1.05;
      const v = circularVelocity(starMass, d.r);
      const x = Math.cos(angle) * d.r, y = Math.sin(angle) * d.r;
      const vx = -Math.sin(angle) * v, vy = Math.cos(angle) * v;
      list.push(new Body(x, y, vx, vy, d.m, 'planet', d.name));
    });
    return { zoom: 0.68, bodies: list };
  },
  'binary-stars': () => {
    const o = twoBodyOrbit(2400, 2400, 210);
    return {
      zoom: 1.4,
      bodies: [
        new Body(o.pos1.x, o.pos1.y, o.vel1.x, o.vel1.y, 2400, 'star', 'Alpha'),
        new Body(o.pos2.x, o.pos2.y, o.vel2.x, o.vel2.y, 2400, 'star', 'Beta'),
      ],
    };
  },
  'three-body': () => {
    return {
      zoom: 0.5,
      bodies: [
        new Body(-600, 36, 1.1, 27.5, 242, 'star', 'Chaos-A'),
        new Body(624, -60, -1.65, -29.15, 275, 'star', 'Chaos-B'),
        new Body(24, 690, 34.1, 1.1, 209, 'star', 'Chaos-C'),
      ],
    };
  },
  'slingshot-lab': () => {
    const starMass = 6200;
    const star = new Body(0, 0, 0, 0, starMass, 'star', 'Anchor');
    const flyby = new Body(-980, -300, 168, 46, 9, 'planet', 'Voyager');
    return { zoom: 0.5, bodies: [star, flyby] };
  },
  'triple-star': () => {
    const m = 1400;
    const r = 260;
    const list = [];
    const names = ['Nyx', 'Thera', 'Corvus'];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + 0.15;
      const v = circularVelocity(m * 2.4, r) * 0.8;
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      const vx = -Math.sin(angle) * v, vy = Math.cos(angle) * v;
      list.push(new Body(x, y, vx, vy, m, 'star', names[i]));
    }
    return { zoom: 0.62, bodies: list };
  },
  'black-hole-system': () => {
    const bhMass = 9000;
    const bh = new Body(0, 0, 0, 0, bhMass, 'blackhole', 'Sagittarius');
    const defs = [
      { r: 140, m: 8,  type: 'planet', name: 'Cinder' },
      { r: 230, m: 14, type: 'planet', name: 'Hollow' },
      { r: 320, m: 5,  type: 'moon',   name: 'Wisp' },
    ];
    const list = [bh];
    defs.forEach((d, idx) => {
      const angle = idx * 1.4;
      const v = circularVelocity(bhMass, d.r);
      const x = Math.cos(angle) * d.r, y = Math.sin(angle) * d.r;
      const vx = -Math.sin(angle) * v, vy = Math.cos(angle) * v;
      list.push(new Body(x, y, vx, vy, d.m, d.type, d.name));
    });
    return { zoom: 0.62, bodies: list };
  },
  'double-planet': () => {
    const o = twoBodyOrbit(220, 190, 130);
    return {
      zoom: 1.6,
      bodies: [
        new Body(o.pos1.x, o.pos1.y, o.vel1.x, o.vel1.y, 220, 'planet', 'Aster'),
        new Body(o.pos2.x, o.pos2.y, o.vel2.x, o.vel2.y, 190, 'planet', 'Ymir'),
      ],
    };
  },
  'collision-course': () => {
    return {
      zoom: 1.1,
      bodies: [
        new Body(-340, -20, 95, 4, 260, 'planet', 'Vex'),
        new Body(340, 20, -95, -4, 90, 'moon', 'Toro'),
      ],
    };
  },
  'empty': () => ({ zoom: 1, bodies: [] }),
};

function loadPreset(key) {
  const builder = PRESETS[key];
  if (!builder) return;
  const result = builder();
  bodies = result.bodies;
  camera.x = 0; camera.y = 0; camera.zoom = result.zoom;
  simTime = 0; accumulator = 0;
  selected = null;
  followTarget = null;
  cameraAnim = null;
  effects = [];
  hideInspector();
  snapshotCurrent();
  running = true;
  updatePlayButton();
}

function snapshotCurrent() {
  initialSnapshot = bodies.map(b => ({
    x: b.x, y: b.y, vx: b.vx, vy: b.vy, mass: b.mass, type: b.type, name: b.name,
    paletteVariant: b.paletteVariant, fixed: b.fixed,
  }));
}

function resetSimulation() {
  bodies = initialSnapshot.map(s => {
    const nb = new Body(s.x, s.y, s.vx, s.vy, s.mass, s.type, s.name);
    nb.paletteVariant = s.paletteVariant;
    nb.fixed = !!s.fixed;
    return nb;
  });
  simTime = 0; accumulator = 0;
  selected = null;
  followTarget = null;
  cameraAnim = null;
  effects = [];
  hideInspector();
}

function clearAll() {
  bodies = [];
  initialSnapshot = [];
  simTime = 0; accumulator = 0;
  selected = null;
  followTarget = null;
  cameraAnim = null;
  effects = [];
  hideInspector();
}

/* ================================ RENDER ================================= */

function drawStars(now) {
  for (const s of stars) {
    const amp = reducedMotion ? 0.04 : 0.18;
    const alpha = clamp(s.baseAlpha + Math.sin(now / 1000 * s.speed + s.phase) * amp, 0, 1);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.bright ? s.r * 1.8 : s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrail(b) {
  const n = b.trail.length;
  if (n < 2) return;
  const pal = palette(b);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(b.trail[0].x, b.trail[0].y);
  for (let k = 1; k < n; k++) ctx.lineTo(b.trail[k].x, b.trail[k].y);
  ctx.strokeStyle = pal.glow;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = zoomScale(Math.max(1, b.radius * 0.28), 0.5, 20);
  ctx.stroke();

  const headStart = Math.max(0, n - 18);
  if (n - headStart >= 2) {
    ctx.beginPath();
    ctx.moveTo(b.trail[headStart].x, b.trail[headStart].y);
    for (let k = headStart + 1; k < n; k++) ctx.lineTo(b.trail[k].x, b.trail[k].y);
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = zoomScale(Math.max(1, b.radius * 0.34), 0.6, 24);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawEffects() {
  for (const fx of effects) {
    const p = clamp(fx.t / fx.dur, 0, 1);
    const rr = fx.r * (1 + p * 1.6);
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.8;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = zoomScale(2.5, 1, 6);
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = (1 - p) * 0.3;
    ctx.fillStyle = fx.color;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, rr * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBody(b, now) {
  const pal = palette(b);
  ctx.save();
  ctx.translate(b.x, b.y);

  if (b.type === 'blackhole') {
    const ringR = b.radius * 2.3;
    ctx.save();
    ctx.rotate((reducedMotion ? 0 : now / 4000) + b.spinPhase);
    const ringGrad = ctx.createRadialGradient(0, 0, b.radius * 0.85, 0, 0, ringR);
    ringGrad.addColorStop(0, 'rgba(185,139,255,0)');
    ringGrad.addColorStop(0.5, 'rgba(185,139,255,0.5)');
    ringGrad.addColorStop(0.78, 'rgba(106,210,255,0.32)');
    ringGrad.addColorStop(1, 'rgba(185,139,255,0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, ringR, ringR * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate((reducedMotion ? 0 : -now / 6000) + b.spinPhase * 0.5);
    const ringGrad2 = ctx.createRadialGradient(0, 0, b.radius * 1.1, 0, 0, ringR * 1.15);
    ringGrad2.addColorStop(0, 'rgba(106,210,255,0)');
    ringGrad2.addColorStop(0.6, 'rgba(106,210,255,0.16)');
    ringGrad2.addColorStop(1, 'rgba(106,210,255,0)');
    ctx.fillStyle = ringGrad2;
    ctx.beginPath();
    ctx.ellipse(0, 0, ringR * 1.15, ringR * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const coreGrad = ctx.createRadialGradient(-b.radius * 0.3, -b.radius * 0.3, 1, 0, 0, b.radius);
    coreGrad.addColorStop(0, pal.c0);
    coreGrad.addColorStop(0.6, pal.c1);
    coreGrad.addColorStop(1, pal.c2);
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius * 0.82, 0, Math.PI * 2);
    ctx.fill();
  } else {
    if (b.type === 'star') {
      const pulse = reducedMotion ? 0 : Math.sin(now / 700 + b.spinPhase) * 0.06;
      const haloR = b.radius * (1.7 + pulse);
      const haloGrad = ctx.createRadialGradient(0, 0, b.radius * 0.8, 0, 0, haloR);
      haloGrad.addColorStop(0, 'rgba(255,210,140,0.25)');
      haloGrad.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    const grad = ctx.createRadialGradient(-b.radius * 0.32, -b.radius * 0.32, b.radius * 0.05, 0, 0, b.radius);
    grad.addColorStop(0, pal.c0);
    grad.addColorStop(0.55, pal.c1);
    grad.addColorStop(1, pal.c2);
    ctx.fillStyle = grad;
    const flicker = (b.type === 'star' && !reducedMotion) ? Math.sin(now / 480 + b.spinPhase) * 8 : 0;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = (b.type === 'star' ? 46 + flicker : b.type === 'planet' ? 16 : 8);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();

    if (b.type === 'planet') {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = pal.glow;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, b.radius * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.96, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (b.type === 'moon' && b.craters) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(60,64,84,0.35)';
      for (const c of b.craters) {
        ctx.beginPath();
        ctx.ellipse(c.dx * b.radius, c.dy * b.radius, c.r * b.radius, c.r * b.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (b.fixed) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = zoomScale(1.2, 0.6, 3);
    ctx.setLineDash([zoomScale(3, 1.5, 6), zoomScale(3, 1.5, 6)]);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + zoomScale(4, 2, 10), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (b === selected) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(106,210,255,0.9)';
    ctx.lineWidth = zoomScale(1.6, 0.8, 4);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + zoomScale(5, 3, 14), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawVelocityVector(b) {
  if (b.fixed) return;
  const speed = Math.hypot(b.vx, b.vy);
  if (speed < 0.5) return;
  const len = Math.min(Math.sqrt(speed) * 9, 140) + b.radius + 4;
  const ang = Math.atan2(b.vy, b.vx);
  const ex = b.x + Math.cos(ang) * len;
  const ey = b.y + Math.sin(ang) * len;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = zoomScale(1.4, 0.8, 5);
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  const headLen = zoomScale(7, 4, 14);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - headLen * Math.cos(ang - 0.4), ey - headLen * Math.sin(ang - 0.4));
  ctx.lineTo(ex - headLen * Math.cos(ang + 0.4), ey - headLen * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
}

function drawLabel(b) {
  const fontSize = zoomScale(12, 9, 26);
  ctx.font = `${fontSize}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,236,251,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = zoomScale(4, 1, 8);
  ctx.fillText(b.name, b.x, b.y - b.radius - zoomScale(8, 6, 20));
  ctx.shadowBlur = 0;
}

function drawCOM() {
  if (!bodies.length) return;
  let totalMass = 0, cx = 0, cy = 0;
  for (const b of bodies) { totalMass += b.mass; cx += b.x * b.mass; cy += b.y * b.mass; }
  cx /= totalMass; cy /= totalMass;
  const pulse = reducedMotion ? 1 : 1 + Math.sin(performance.now() / 260) * 0.15;
  ctx.strokeStyle = 'rgba(255,209,122,0.85)';
  ctx.lineWidth = zoomScale(1.4, 0.7, 4);
  const s = zoomScale(9 * pulse, 5, 24);
  ctx.beginPath();
  ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
  ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  const fontSize = zoomScale(10, 8, 16);
  ctx.font = `${fontSize}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,209,122,0.75)';
  ctx.fillText('COM', cx, cy - s - zoomScale(6, 4, 12));
}

function drawField() {
  if (!fieldPoints.length) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(140,170,255,0.4)';
  ctx.lineWidth = 1;
  for (const p of fieldPoints) {
    const mag = Math.hypot(p.ax, p.ay);
    if (mag < 1e-6) continue;
    const len = clamp(Math.sqrt(mag) * 0.9, 3, 22);
    const nx = p.ax / mag, ny = p.ay / mag;
    const ex = p.sx + nx * len, ey = p.sy + ny * len;
    ctx.globalAlpha = clamp(0.12 + mag * 0.0006, 0.12, 0.5);
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function updateField() {
  fieldPoints = [];
  if (!display.field) return;
  const spacing = 92;
  for (let sx = spacing / 2; sx < width; sx += spacing) {
    for (let sy = spacing / 2; sy < height; sy += spacing) {
      const w = screenToWorld(sx, sy);
      let ax = 0, ay = 0;
      for (const b of bodies) {
        const dx = b.x - w.x, dy = b.y - w.y;
        const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
        const dist = Math.sqrt(distSq);
        const f = G * b.mass / (distSq * dist);
        ax += f * dx; ay += f * dy;
      }
      fieldPoints.push({ sx, sy, ax, ay });
    }
  }
}

/* --------------------------- Trajectory preview --------------------------- */

function predictTrajectory(x0, y0, vx, vy, mass) {
  const steps = TRAJECTORY_STEPS[trajectoryKey];
  if (!steps || !bodies.length) return null;
  const dt = FIXED_DT * 2;
  let px = x0, py = y0, pvx = vx, pvy = vy;
  const pts = [{ x: px, y: py }];
  let collideIndex = null;
  const projRadius = radiusForMass(mass, currentSpawnType);

  for (let s = 0; s < steps; s++) {
    let ax = 0, ay = 0;
    for (const b of bodies) {
      const dx = b.x - px, dy = b.y - py;
      const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const dist = Math.sqrt(distSq);
      const f = G * b.mass / (distSq * dist);
      ax += f * dx; ay += f * dy;
    }
    const accelMag = Math.hypot(ax, ay);
    if (accelMag > MAX_ACCEL) { const sc = MAX_ACCEL / accelMag; ax *= sc; ay *= sc; }
    pvx += ax * dt; pvy += ay * dt;
    const speed = Math.hypot(pvx, pvy);
    if (speed > MAX_SPEED) { const sc = MAX_SPEED / speed; pvx *= sc; pvy *= sc; }
    px += pvx * dt; py += pvy * dt;
    pts.push({ x: px, y: py });

    for (const b of bodies) {
      const rr = projRadius + b.radius;
      if (dist2(px, py, b.x, b.y) < rr * rr) { collideIndex = pts.length - 1; break; }
    }
    if (collideIndex !== null) break;
  }
  return { points: pts, collideIndex };
}

function drawTrajectoryPreview(traj) {
  if (!traj || traj.points.length < 2) return;
  const pts = traj.points;
  const total = pts.length;
  const chunks = Math.min(24, total - 1);
  const chunkSize = Math.max(1, Math.floor((total - 1) / chunks));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([zoomScale(3, 1.5, 6), zoomScale(5, 2.5, 10)]);
  for (let c = 0; c < chunks; c++) {
    const startIdx = c * chunkSize;
    const endIdx = Math.min(total - 1, startIdx + chunkSize);
    if (endIdx <= startIdx) continue;
    const isCollisionSeg = traj.collideIndex !== null && endIdx >= traj.collideIndex - chunkSize;
    const fade = 1 - c / chunks;
    ctx.globalAlpha = clamp(fade * 0.65, 0.03, 0.65);
    ctx.strokeStyle = isCollisionSeg ? 'rgba(255,170,110,0.9)' : 'rgba(160,200,255,0.85)';
    ctx.lineWidth = zoomScale(1.6, 0.8, 3);
    ctx.beginPath();
    ctx.moveTo(pts[startIdx].x, pts[startIdx].y);
    for (let k = startIdx + 1; k <= endIdx; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  if (traj.collideIndex !== null) {
    const p = pts[traj.collideIndex];
    const pulse = reducedMotion ? 1 : 1 + Math.sin(performance.now() / 180) * 0.25;
    ctx.strokeStyle = 'rgba(255,170,110,0.9)';
    ctx.lineWidth = zoomScale(1.6, 0.8, 3);
    ctx.beginPath();
    ctx.arc(p.x, p.y, zoomScale(9 * pulse, 4, 18), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpawnArrow() {
  if (!gesture || gesture.type !== 'spawn') return;
  const cur = pointers.get(gesture.pointerId);
  if (!cur) return;
  const startS = worldToScreen(gesture.startWorld.x, gesture.startWorld.y);
  const dx = cur.x - startS.x, dy = cur.y - startS.y;
  const d = Math.hypot(dx, dy);
  if (d < MIN_DRAG_PX) return;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.strokeStyle = 'rgba(106,210,255,0.9)';
  ctx.fillStyle = 'rgba(106,210,255,0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(startS.x, startS.y);
  ctx.lineTo(cur.x, cur.y);
  ctx.stroke();
  ctx.setLineDash([]);
  const headLen = 10;
  ctx.beginPath();
  ctx.moveTo(cur.x, cur.y);
  ctx.lineTo(cur.x - headLen * Math.cos(ang - 0.4), cur.y - headLen * Math.sin(ang - 0.4));
  ctx.lineTo(cur.x - headLen * Math.cos(ang + 0.4), cur.y - headLen * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(startS.x, startS.y, 4, 0, Math.PI * 2);
  ctx.fill();

  const worldD = d / camera.zoom;
  const speedLabel = `${Math.round(worldD * LAUNCH_SCALE)} u/s`;
  ctx.font = '12px "Cascadia Code", "SF Mono", Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,236,251,0.9)';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(speedLabel, cur.x + 14, cur.y - 10);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function render(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  drawStars(now);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  if (display.trails) for (const b of bodies) drawTrail(b);
  if (display.com) drawCOM();
  drawEffects();
  for (const b of bodies) drawBody(b, now);
  if (display.vectors) for (const b of bodies) drawVelocityVector(b);
  if (display.labels) for (const b of bodies) drawLabel(b);

  if (gesture && gesture.type === 'spawn' && gesture.trajectory) {
    drawTrajectoryPreview(gesture.trajectory);
  }

  ctx.restore();

  if (display.field) drawField();
  drawSpawnArrow();
}

/* ============================== INTERACTION =============================== */

const pointers = new Map();
let gesture = null;

function hitTestBody(sx, sy) {
  let best = null, bestD = Infinity;
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    const s = worldToScreen(b.x, b.y);
    const r = Math.max(b.radius * camera.zoom, 12);
    const d = Math.hypot(sx - s.x, sy - s.y);
    if (d <= r && d < bestD) { best = b; bestD = d; }
  }
  return best;
}

function zoomAt(sx, sy, factor) {
  const before = screenToWorld(sx, sy);
  camera.zoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const after = screenToWorld(sx, sy);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
}

function breakFollow() {
  followTarget = null;
  cameraAnim = null;
  updateFollowButton();
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
  const factor = Math.pow(1.0015, -e.deltaY);
  zoomAt(sx, sy, factor);
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  pointers.set(e.pointerId, { x, y });
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }

  if (pointers.size === 1) {
    if (e.button === 2 || e.button === 1) {
      breakFollow();
      gesture = { type: 'pan', pointerId: e.pointerId, camX: camera.x, camY: camera.y, sx: x, sy: y };
    } else if (mode === 'pan') {
      breakFollow();
      gesture = { type: 'pan', pointerId: e.pointerId, camX: camera.x, camY: camera.y, sx: x, sy: y };
    } else if (mode === 'select') {
      const hit = hitTestBody(x, y);
      if (hit) {
        selectBody(hit);
        if (!running) {
          hit.trail.length = 0;
          const w = screenToWorld(x, y);
          gesture = { type: 'dragBody', pointerId: e.pointerId, body: hit, offX: hit.x - w.x, offY: hit.y - w.y };
        } else {
          gesture = null;
        }
      } else {
        deselect();
        gesture = null;
      }
    } else { // spawn mode
      const hit = hitTestBody(x, y);
      if (hit) {
        selectBody(hit);
        gesture = null;
      } else {
        deselect();
        gesture = { type: 'spawn', pointerId: e.pointerId, startWorld: screenToWorld(x, y), startScreen: { x, y }, trajectory: null };
      }
    }
  } else if (pointers.size === 2) {
    gesture = null; // cancel any single-finger gesture (avoids spawn-after-pinch / launch-after-pinch)
    const pts = [...pointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    breakFollow();
    gesture = {
      type: 'pinch', startDist: Math.max(d, 1), startZoom: camera.zoom,
      startMid: mid, startCamX: camera.x, startCamY: camera.y,
    };
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  pointers.set(e.pointerId, { x, y });

  if (!gesture) return;

  if (gesture.type === 'pan' && e.pointerId === gesture.pointerId) {
    camera.x = gesture.camX - (x - gesture.sx) / camera.zoom;
    camera.y = gesture.camY - (y - gesture.sy) / camera.zoom;
  } else if (gesture.type === 'dragBody' && e.pointerId === gesture.pointerId) {
    const w = screenToWorld(x, y);
    gesture.body.x = w.x + gesture.offX;
    gesture.body.y = w.y + gesture.offY;
  } else if (gesture.type === 'pinch' && pointers.size >= 2) {
    const pts = [...pointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    camera.zoom = clamp(gesture.startZoom * (d / gesture.startDist), MIN_ZOOM, MAX_ZOOM);
    camera.x = gesture.startCamX - (mid.x - gesture.startMid.x) / camera.zoom;
    camera.y = gesture.startCamY - (mid.y - gesture.startMid.y) / camera.zoom;
  } else if (gesture.type === 'spawn' && e.pointerId === gesture.pointerId) {
    const startS = worldToScreen(gesture.startWorld.x, gesture.startWorld.y);
    const d = Math.hypot(x - startS.x, y - startS.y);
    if (d < MIN_DRAG_PX || trajectoryKey === 'off') {
      gesture.trajectory = null;
    } else {
      const endWorld = screenToWorld(x, y);
      const vx = (endWorld.x - gesture.startWorld.x) * LAUNCH_SCALE;
      const vy = (endWorld.y - gesture.startWorld.y) * LAUNCH_SCALE;
      const massVal = Number(elMassSlider.value);
      gesture.trajectory = predictTrajectory(gesture.startWorld.x, gesture.startWorld.y, vx, vy, massVal);
    }
  }
});

function endPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;

  if (gesture && gesture.type === 'spawn' && gesture.pointerId === e.pointerId) {
    const endWorld = screenToWorld(x, y);
    const startS = worldToScreen(gesture.startWorld.x, gesture.startWorld.y);
    const dScreen = Math.hypot(x - startS.x, y - startS.y);
    const dx = endWorld.x - gesture.startWorld.x;
    const dy = endWorld.y - gesture.startWorld.y;
    const vx = dScreen > MIN_DRAG_PX ? dx * LAUNCH_SCALE : 0;
    const vy = dScreen > MIN_DRAG_PX ? dy * LAUNCH_SCALE : 0;
    createBody(gesture.startWorld.x, gesture.startWorld.y, vx, vy);
    gesture = null;
  } else if (gesture && (gesture.type === 'pan' || gesture.type === 'dragBody') && gesture.pointerId === e.pointerId) {
    gesture = null;
  }

  pointers.delete(e.pointerId);
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }

  if (gesture && gesture.type === 'pinch' && pointers.size < 2) {
    gesture = null;
  }
}

canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

window.addEventListener('keydown', (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const key = e.key.toLowerCase();

  if (key === 'delete' || key === 'backspace') {
    if (selected) deleteSelected();
  } else if (key === 'escape') {
    if (cinematic) setCinematic(false);
    else deselect();
  } else if (e.key === ' ') {
    e.preventDefault();
    running = !running; updatePlayButton();
  } else if (key === 's') {
    setMode('spawn');
  } else if (key === 'v') {
    setMode('select');
  } else if (key === 'h') {
    setMode('pan');
  } else if (key === 'r') {
    resetSimulation();
  } else if (key === 'f') {
    if (selected) focusOn(selected);
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) lastTime = performance.now();
});

/* ============================== BODY CREATION ============================= */

function createBody(x, y, vx, vy) {
  if (bodies.length >= getMaxBodies()) { showToast('BODY LIMIT REACHED'); return null; }
  const massVal = Number(elMassSlider.value);
  const b = new Body(x, y, vx, vy, massVal, currentSpawnType);
  bodies.push(b);
  selectBody(b);
  return b;
}

/* =============================== MODES ===================================== */

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === m));
  canvas.classList.toggle('mode-pan', m === 'pan');
  canvas.classList.toggle('mode-select', m === 'select');
  gesture = null;
}

/* =============================== CAMERA ===================================== */

function focusOn(b) {
  cameraAnim = {
    fromX: camera.x, fromY: camera.y, fromZoom: camera.zoom,
    toX: b.x, toY: b.y, toZoom: Math.max(camera.zoom, 1.1),
    t0: performance.now(), dur: 450,
  };
}

function fitAll() {
  if (!bodies.length) return;
  followTarget = null;
  updateFollowButton();
  if (bodies.length === 1) { focusOn(bodies[0]); return; }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of bodies) {
    minX = Math.min(minX, b.x - b.radius); maxX = Math.max(maxX, b.x + b.radius);
    minY = Math.min(minY, b.y - b.radius); maxY = Math.max(maxY, b.y + b.radius);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const w = Math.max(maxX - minX, 40), h = Math.max(maxY - minY, 40);
  const pad = 1.3;
  const targetZoom = clamp(Math.min(width / (w * pad), height / (h * pad)), MIN_ZOOM, MAX_ZOOM);
  cameraAnim = { fromX: camera.x, fromY: camera.y, fromZoom: camera.zoom, toX: cx, toY: cy, toZoom: targetZoom, t0: performance.now(), dur: 500 };
}

/* =============================== UI WIRING ================================ */

const elPlay = document.getElementById('btn-play');
const elStep = document.getElementById('btn-step');
const elReset = document.getElementById('btn-reset');
const elClear = document.getElementById('btn-clear');
const elCameraReset = document.getElementById('btn-camera-reset');
const elFitAll = document.getElementById('btn-fit-all');
const elSpeedGroup = document.getElementById('speed-group');
const elCollisionGroup = document.getElementById('collision-group');
const elTrailLengthGroup = document.getElementById('trail-length-group');
const elTrajectoryGroup = document.getElementById('trajectory-group');
const elTypeGrid = document.getElementById('type-grid');
const elMassSlider = document.getElementById('spawn-mass');
const elMassValue = document.getElementById('spawn-mass-value');
const elToggleHud = document.getElementById('btn-toggle-hud');
const elPanels = document.getElementById('panels');
const elModeBar = document.getElementById('mode-bar');
const elModePlayIcon = document.getElementById('mode-play-icon');
const elToast = document.getElementById('toast');
const elBtnSave = document.getElementById('btn-save');
const elBtnLoad = document.getElementById('btn-load');
const elBtnCinematic = document.getElementById('btn-cinematic');
const elCinematicExit = document.getElementById('btn-cinematic-exit');

const elStatBodies = document.getElementById('stat-bodies');
const elStatTime = document.getElementById('stat-time');
const elStatSpeed = document.getElementById('stat-speed');
const elStatFps = document.getElementById('stat-fps');

const elInspector = document.getElementById('inspector');
const elInspName = document.getElementById('insp-name');
const elInspType = document.getElementById('insp-type');
const elInspMass = document.getElementById('insp-mass');
const elInspMassValue = document.getElementById('insp-mass-value');
const elInspVx = document.getElementById('insp-vx');
const elInspVy = document.getElementById('insp-vy');
const elInspSpeed = document.getElementById('insp-speed');
const elInspPosition = document.getElementById('insp-position');
const elBtnFixed = document.getElementById('btn-fixed');
const elBtnFocus = document.getElementById('btn-focus');
const elBtnFollow = document.getElementById('btn-follow');
const elBtnDuplicate = document.getElementById('btn-duplicate');
const elBtnReverse = document.getElementById('btn-reverse');
const elBtnDelete = document.getElementById('btn-delete');
const elBtnCloseInspector = document.getElementById('btn-close-inspector');

let toastTimer = null;
function showToast(msg, ms = 1600) {
  elToast.textContent = msg;
  elToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove('show'), ms);
}

function updatePlayButton() {
  elPlay.textContent = running ? 'Pause' : 'Play';
  elModePlayIcon.textContent = running ? '❬❬' : '▶';
}

elPlay.addEventListener('click', () => { running = !running; updatePlayButton(); });
elStep.addEventListener('click', stepOnce);
elReset.addEventListener('click', resetSimulation);
elClear.addEventListener('click', clearAll);
elCameraReset.addEventListener('click', () => { breakFollow(); camera.x = 0; camera.y = 0; camera.zoom = 1; });
elFitAll.addEventListener('click', fitAll);

elSpeedGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-speed]');
  if (!btn) return;
  speedMultiplier = Number(btn.dataset.speed);
  [...elSpeedGroup.children].forEach(c => c.classList.toggle('active', c === btn));
});

elCollisionGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-collision]');
  if (!btn) return;
  collisionMode = btn.dataset.collision;
  [...elCollisionGroup.children].forEach(c => c.classList.toggle('active', c === btn));
});

elTrailLengthGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-traillen]');
  if (!btn) return;
  display.trailLength = btn.dataset.traillen;
  [...elTrailLengthGroup.children].forEach(c => c.classList.toggle('active', c === btn));
  applyTrailLength();
});

elTrajectoryGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-traj]');
  if (!btn) return;
  trajectoryKey = btn.dataset.traj;
  [...elTrajectoryGroup.children].forEach(c => c.classList.toggle('active', c === btn));
});

elTypeGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-type]');
  if (!btn) return;
  currentSpawnType = btn.dataset.type;
  [...elTypeGrid.children].forEach(c => c.classList.toggle('active', c === btn));
  applyMassRange(elMassSlider, elMassValue, MASS_RANGE[currentSpawnType]);
});

function applyMassRange(sliderEl, labelEl, range) {
  sliderEl.min = range.min;
  sliderEl.max = range.max;
  sliderEl.step = range.step;
  sliderEl.value = range.def;
  labelEl.textContent = range.def;
}

elMassSlider.addEventListener('input', () => { elMassValue.textContent = elMassSlider.value; });

document.querySelectorAll('.panel-display .toggle-btn[data-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.toggle;
    display[key] = !display[key];
    btn.classList.toggle('active', display[key]);
    if (key === 'field' && display.field) updateField();
  });
});

document.querySelectorAll('.panel-presets [data-preset]').forEach(btn => {
  btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
});

elToggleHud.addEventListener('click', () => elPanels.classList.toggle('hidden'));

elModeBar.addEventListener('click', (e) => {
  const modeBtn = e.target.closest('button[data-mode]');
  if (modeBtn) { setMode(modeBtn.dataset.mode); return; }
  if (e.target.closest('#btn-play-mobile')) { running = !running; updatePlayButton(); return; }
  if (e.target.closest('#btn-menu-mobile')) { elPanels.classList.toggle('hidden'); return; }
});

/* ------------------------------ Save / Load ------------------------------ */

const SAVE_KEY = 'gravity-sandbox-save-v1';

function saveSystem() {
  const data = {
    bodies: bodies.map(b => ({
      x: b.x, y: b.y, vx: b.vx, vy: b.vy, mass: b.mass, type: b.type,
      name: b.name, fixed: !!b.fixed, paletteVariant: b.paletteVariant,
    })),
    camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
    collisionMode, trajectoryKey,
    display: { trails: display.trails, labels: display.labels, vectors: display.vectors, com: display.com, field: display.field, trailLength: display.trailLength },
    spawnType: currentSpawnType,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    showToast('System Saved');
  } catch (err) {
    showToast('Save Failed');
  }
}

function syncUIFromState() {
  document.querySelectorAll('.panel-display .toggle-btn[data-toggle]').forEach(btn => {
    btn.classList.toggle('active', !!display[btn.dataset.toggle]);
  });
  [...elCollisionGroup.children].forEach(c => c.classList.toggle('active', c.dataset.collision === collisionMode));
  [...elTrailLengthGroup.children].forEach(c => c.classList.toggle('active', c.dataset.traillen === display.trailLength));
  [...elTrajectoryGroup.children].forEach(c => c.classList.toggle('active', c.dataset.traj === trajectoryKey));
  [...elTypeGrid.children].forEach(c => c.classList.toggle('active', c.dataset.type === currentSpawnType));
  applyMassRange(elMassSlider, elMassValue, MASS_RANGE[currentSpawnType]);
}

function loadSystem() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (err) { raw = null; }
  if (!raw) { showToast('No Saved System'); return; }
  let data;
  try { data = JSON.parse(raw); } catch (err) { showToast('Save Corrupted'); return; }
  if (!data || !Array.isArray(data.bodies)) { showToast('Save Corrupted'); return; }

  bodies = data.bodies.map(s => {
    const nb = new Body(s.x, s.y, s.vx, s.vy, s.mass, s.type, s.name);
    nb.fixed = !!s.fixed;
    if (s.paletteVariant) nb.paletteVariant = s.paletteVariant;
    return nb;
  });
  if (data.camera) { camera.x = data.camera.x; camera.y = data.camera.y; camera.zoom = data.camera.zoom; }
  collisionMode = data.collisionMode || 'merge';
  trajectoryKey = data.trajectoryKey || 'medium';
  Object.assign(display, data.display || {});
  currentSpawnType = data.spawnType || 'planet';

  simTime = 0; accumulator = 0;
  selected = null; followTarget = null; cameraAnim = null; effects = [];
  hideInspector();
  snapshotCurrent();
  syncUIFromState();
  updateFollowButton();
  showToast('System Loaded');
}

elBtnSave.addEventListener('click', saveSystem);
elBtnLoad.addEventListener('click', loadSystem);

/* ------------------------------ Cinematic ------------------------------ */

function setCinematic(v) {
  cinematic = v;
  document.body.classList.toggle('cinematic', cinematic);
}
elBtnCinematic.addEventListener('click', () => setCinematic(true));
elCinematicExit.addEventListener('click', () => setCinematic(false));

/* ------------------------------ Inspector ------------------------------ */

function selectBody(b) {
  selected = b;
  elInspector.hidden = false;
  elInspName.value = b.name;
  elInspType.textContent = TYPE_LABEL[b.type];
  applyMassRange(elInspMass, elInspMassValue, MASS_RANGE[b.type]);
  elInspMass.value = b.mass;
  elInspMassValue.textContent = Math.round(b.mass);
  elInspVx.value = Math.round(b.vx);
  elInspVy.value = Math.round(b.vy);
  elBtnFixed.classList.toggle('active', !!b.fixed);
  updateFollowButton();
}

function deselect() {
  selected = null;
  hideInspector();
}

function hideInspector() {
  elInspector.hidden = true;
}

function deleteSelected() {
  if (!selected) return;
  const idx = bodies.indexOf(selected);
  if (idx >= 0) bodies.splice(idx, 1);
  if (followTarget === selected) breakFollow();
  deselect();
}

function updateFollowButton() {
  elBtnFollow.classList.toggle('active', !!selected && followTarget === selected);
}

elInspName.addEventListener('input', () => {
  if (selected) selected.name = elInspName.value.trim() || TYPE_LABEL[selected.type];
});

elInspMass.addEventListener('input', () => {
  if (!selected) return;
  const m = Number(elInspMass.value);
  selected.mass = m;
  selected.radius = radiusForMass(m, selected.type);
  elInspMassValue.textContent = Math.round(m);
});

elInspVx.addEventListener('input', () => {
  if (!selected) return;
  const v = Number(elInspVx.value);
  selected.vx = isFinite(v) ? v : 0;
});
elInspVy.addEventListener('input', () => {
  if (!selected) return;
  const v = Number(elInspVy.value);
  selected.vy = isFinite(v) ? v : 0;
});

elBtnFixed.addEventListener('click', () => {
  if (!selected) return;
  selected.fixed = !selected.fixed;
  if (selected.fixed) { selected.vx = 0; selected.vy = 0; elInspVx.value = 0; elInspVy.value = 0; }
  elBtnFixed.classList.toggle('active', selected.fixed);
});

elBtnFocus.addEventListener('click', () => { if (selected) focusOn(selected); });

elBtnFollow.addEventListener('click', () => {
  if (!selected) return;
  followTarget = followTarget === selected ? null : selected;
  cameraAnim = null;
  updateFollowButton();
});

elBtnDuplicate.addEventListener('click', () => {
  if (!selected) return;
  if (bodies.length >= getMaxBodies()) { showToast('BODY LIMIT REACHED'); return; }
  const offset = selected.radius * 2 + 14;
  const nb = new Body(selected.x + offset, selected.y, selected.vx, selected.vy, selected.mass, selected.type, null);
  nb.fixed = selected.fixed;
  nb.paletteVariant = selected.paletteVariant;
  bodies.push(nb);
  selectBody(nb);
});

elBtnReverse.addEventListener('click', () => {
  if (!selected || selected.fixed) return;
  selected.vx *= -1; selected.vy *= -1;
});

elBtnDelete.addEventListener('click', deleteSelected);
elBtnCloseInspector.addEventListener('click', deselect);

/* Init default mass range for starting spawn type */
applyMassRange(elMassSlider, elMassValue, MASS_RANGE[currentSpawnType]);

/* =============================== MAIN LOOP ================================= */

let lastTime = performance.now();
let fps = 60;
let statsTimer = 0;
let trailTimer = 0;

function updateInspectorLive() {
  if (!selected || elInspector.hidden) return;
  const speed = Math.hypot(selected.vx, selected.vy);
  elInspSpeed.textContent = speed.toFixed(1);
  elInspPosition.textContent = `${selected.x.toFixed(0)}, ${selected.y.toFixed(0)}`;
  if (document.activeElement !== elInspMass) {
    elInspMass.value = selected.mass;
    elInspMassValue.textContent = Math.round(selected.mass);
  }
  if (document.activeElement !== elInspVx) elInspVx.value = Math.round(selected.vx);
  if (document.activeElement !== elInspVy) elInspVy.value = Math.round(selected.vy);
}

function updateStats(realDt) {
  fps = fps * 0.9 + (1 / Math.max(realDt, 0.0001)) * 0.1;
  statsTimer += realDt;
  if (statsTimer >= 0.15) {
    statsTimer = 0;
    elStatBodies.textContent = bodies.length;
    elStatTime.textContent = simTime.toFixed(1) + 's';
    elStatSpeed.textContent = running ? speedMultiplier + 'x' : 'PAUSED';
    elStatFps.textContent = Math.round(fps);
  }
}

function updateCamera(now) {
  if (cameraAnim) {
    const t = clamp((now - cameraAnim.t0) / cameraAnim.dur, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.x = lerp(cameraAnim.fromX, cameraAnim.toX, ease);
    camera.y = lerp(cameraAnim.fromY, cameraAnim.toY, ease);
    camera.zoom = lerp(cameraAnim.fromZoom, cameraAnim.toZoom, ease);
    if (t >= 1) cameraAnim = null;
  } else if (followTarget && bodies.includes(followTarget)) {
    camera.x += (followTarget.x - camera.x) * 0.08;
    camera.y += (followTarget.y - camera.y) * 0.08;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  let realDt = (now - lastTime) / 1000;
  lastTime = now;
  realDt = Math.min(realDt, 0.1);

  if (running && bodies.length) {
    accumulator += realDt * speedMultiplier;
    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      physicsStep(FIXED_DT);
      accumulator -= FIXED_DT;
      steps++;
    }
    trailTimer += realDt;
    if (trailTimer >= 1 / 30) {
      trailTimer = 0;
      pushTrailPoints();
    }
  }

  if (effects.length) {
    effects = effects.filter(fx => { fx.t += realDt; return fx.t < fx.dur; });
  }

  fieldTimer += realDt;
  if (display.field && fieldTimer > 0.12) {
    fieldTimer = 0;
    updateField();
  }

  updateCamera(now);
  render(now);
  updateInspectorLive();
  updateStats(realDt);
}

requestAnimationFrame(frame);

})();
