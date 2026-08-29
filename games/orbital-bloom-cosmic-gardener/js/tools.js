// Orbital Bloom - pointer/tool interaction layer (placement, spawning, erase, impulse, move)
import { CONSTANTS, state, clamp } from './config.js';
import { createAttractor, attractors, removeAttractor, nearestAttractor } from './attractors.js';
import { predictTrajectory } from './orbit-guidance.js';
import * as P from './particles.js';

function bucketNear(wx, wy, maxDist = 380) {
  const a = nearestAttractor(wx, wy, maxDist);
  return a ? P.bucketIndexForColor(a.color) : undefined;
}

// Read by renderer.js to draw live drag previews (radius circles, velocity arrows, etc.)
export const previewState = {
  active: false,
  kind: null,
  trajectory: [],
  orbitHealth: 'unknown',
  closestBodyId: null,
};

function clearTrajectoryPreview() {
  previewState.trajectory = [];
  previewState.orbitHealth = 'unknown';
  previewState.closestBodyId = null;
}

export function clearToolPreview() {
  previewState.active = false;
  previewState.kind = null;
  clearTrajectoryPreview();
}

export function placementVelocity(start, current) {
  return {
    vx: clamp((current.x - start.x) * 1.4, -CONSTANTS.MAX_ATTRACTOR_SPEED, CONSTANTS.MAX_ATTRACTOR_SPEED),
    vy: clamp((current.y - start.y) * 1.4, -CONSTANTS.MAX_ATTRACTOR_SPEED, CONSTANTS.MAX_ATTRACTOR_SPEED),
  };
}

export function applyGentleInfluence(bodies, gesture, options = {}) {
  const radius = options.radius ?? CONSTANTS.GENTLE_INFLUENCE_RADIUS;
  const maxDelta = options.maxDelta ?? CONSTANTS.GENTLE_INFLUENCE_MAX_DELTA;
  const gestureLength = Math.hypot(gesture.dx, gesture.dy);
  if (!(radius > 0) || !(maxDelta > 0) || gestureLength < 0.001) return;

  const ux = gesture.dx / gestureLength;
  const uy = gesture.dy / gestureLength;
  const delta = Math.min(gestureLength, maxDelta);
  for (const body of bodies) {
    if (body.fixed || body.cradled) continue;
    const distance = Math.hypot(body.x - gesture.x, body.y - gesture.y);
    if (distance >= radius) continue;
    const falloff = 1 - distance / radius;
    body.vx += ux * delta * falloff;
    body.vy += uy * delta * falloff;
  }
}

export function applyBodyPulse(body, delta) {
  if (!body || body.fixed) return;
  const length = Math.hypot(delta.x, delta.y);
  if (length < 0.001) return;
  const scale = Math.min(length, CONSTANTS.PULSE_MAX_DELTA) / length;
  body.vx += delta.x * scale;
  body.vy += delta.y * scale;
}

const CREATIVE_TOOL_VARIANTS = Object.freeze([
  { id: 'oceanSeed', tool: 'planet', label: 'Ocean planet', title: 'Place an ocean-style planet' },
  { id: 'ringSeed', tool: 'planet', label: 'Ringed planet', title: 'Place a ringed planet' },
  { id: 'fineInfluence', tool: 'influence', label: 'Fine influence', title: 'Use a gentler, finer influence' },
]);

export function getCreativeToolVariants(unlocks = []) {
  const available = new Set(Array.isArray(unlocks) ? unlocks : []);
  return CREATIVE_TOOL_VARIANTS.filter(variant => available.has(variant.id));
}

function planetSeedOverrides(variant) {
  if (variant === 'oceanSeed') return { color: 'blue' };
  if (variant === 'ringSeed') return { ringStrength: 0.42 };
  return {};
}

export function createSeedAttractor(type, x, y, fixed = false, variant = null) {
  const overrides = type === 'planet' ? planetSeedOverrides(variant) : {};
  return createAttractor(type, x, y, { fixed, ...overrides });
}

export function influenceOptionsForVariant(variant) {
  return variant === 'fineInfluence' ? { maxDelta: 4 } : {};
}

export const emitters = []; // continuous stream emitters {x,y,mode,angle,radius,spin,speed,rate,acc,life}
let nextEmitterId = 1;

let cam = null;
let canvasEl = null;

// Multi-touch pinch-to-zoom tracking (keyed by pointerId)
const activePointers = new Map();
let pinchActive = false;
let pinchLastDist = null;

const pointer = {
  down: false, mode: null,
  startX: 0, startY: 0, curX: 0, curY: 0,
  startScreenX: 0, startScreenY: 0,
  lastScreenX: 0, lastScreenY: 0,
  target: null, spawnKind: null,
  impulsePoints: [], lastImpulseX: 0, lastImpulseY: 0,
  moveHistory: [],
  cradleTimer: null, cradleEligible: false, cradlePreviousFixed: null,
};

function clearCradleWatch() {
  if (pointer.cradleTimer !== null) clearTimeout(pointer.cradleTimer);
  pointer.cradleTimer = null;
  pointer.cradleEligible = false;
}

function beginCradleWatch(body) {
  clearCradleWatch();
  pointer.cradleEligible = true;
  pointer.cradleTimer = setTimeout(() => {
    pointer.cradleTimer = null;
    if (!pointer.down || !pointer.cradleEligible || pointer.target !== body) return;
    pointer.mode = 'cradleBody';
    pointer.cradlePreviousFixed = body.fixed;
    body.cradled = true;
  }, CONSTANTS.CRADLE_HOLD_MS);
}

function finishCradle(applyVelocity) {
  const body = pointer.target;
  if (body?.cradled) {
    if (applyVelocity) Object.assign(body, placementVelocity(
      { x: pointer.startX, y: pointer.startY },
      { x: pointer.curX, y: pointer.curY },
    ));
    body.fixed = pointer.cradlePreviousFixed;
    body.cradled = false;
  }
  pointer.cradlePreviousFixed = null;
}

export function initTools(canvasElement, cameraRef) {
  canvasEl = canvasElement;
  cam = cameraRef;
  canvasEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  canvasEl.addEventListener('wheel', onWheel, { passive: false });
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
  canvasEl.addEventListener('dblclick', onDoubleClick);
  window.addEventListener('ob:tool-changed', clearToolPreview);
}

function rectAndWorld(e) {
  const rect = canvasEl.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
  const [wx, wy] = cam.screenToWorld(sx, sy, rect.width, rect.height);
  return { rect, sx, sy, wx, wy };
}

function hitTestAttractor(wx, wy, extraPx = 0) {
  const tolerance = (14 + extraPx) / cam.zoom;
  let best = null, bestD = Infinity;
  for (const a of attractors) {
    const d = Math.hypot(a.x - wx, a.y - wy);
    const r = a.radius + tolerance;
    if (d < r && d < bestD) { bestD = d; best = a; }
  }
  return best;
}

function dispatchSelection(id) {
  state.selectedAttractorId = id;
  window.dispatchEvent(new CustomEvent('ob:selection-changed', { detail: { id } }));
}

function onPointerDown(e) {
  if (e.target !== canvasEl) return;
  const { sx, sy, wx, wy } = rectAndWorld(e);

  if (e.pointerType === 'touch') {
    activePointers.set(e.pointerId, { x: sx, y: sy });
    if (activePointers.size >= 2) {
      // A second finger just touched down: abandon any in-progress single-touch
      // tool action and switch to pinch-zoom for the duration of the gesture.
      clearCradleWatch();
      finishCradle(false);
      pointer.down = false;
      pointer.mode = null;
      clearToolPreview();
      pinchActive = true;
      const pts = [...activePointers.values()];
      pinchLastDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      return;
    }
  }

  pointer.down = true;
  pointer.startX = wx; pointer.startY = wy;
  pointer.curX = wx; pointer.curY = wy;
  pointer.startScreenX = sx; pointer.startScreenY = sy;
  pointer.lastScreenX = sx; pointer.lastScreenY = sy;
  pointer.moveHistory = [{ x: wx, y: wy, t: performance.now() }];
  clearCradleWatch();

  if (e.button === 2 || e.button === 1) { pointer.mode = 'pan'; return; }

  const tool = state.currentTool;

  if (tool === 'select') {
    const hit = hitTestAttractor(wx, wy);
    if (hit) {
      dispatchSelection(hit.id);
      pointer.target = hit;
      if (e.altKey) pointer.mode = 'moveAttractor';
      else pointer.mode = 'idle';
      beginCradleWatch(hit);
    } else {
      dispatchSelection(null);
      pointer.mode = 'pan';
    }
  } else if (tool === 'move') {
    const hit = hitTestAttractor(wx, wy, 30);
    if (hit) {
      pointer.mode = 'moveAttractor'; pointer.target = hit; dispatchSelection(hit.id);
      beginCradleWatch(hit);
    }
    else pointer.mode = 'pan';
  } else if (tool === 'star' || tool === 'planet' || tool === 'moon' || tool === 'heavyCore' || tool === 'anchor') {
    const fixed = tool === 'anchor' ? true : state.attractorFixed;
    const a = createSeedAttractor(tool, wx, wy, fixed, state.gardenVariant);
    pointer.mode = fixed ? 'idle' : 'placeVelocity';
    pointer.target = a;
    dispatchSelection(a.id);
  } else if (tool === 'point') {
    const n = Math.round(clamp(state.spawnAmount / 10, 8, 150));
    P.spawnPattern({
      cx: wx, cy: wy, count: n, mode: 'disc',
      radius: 14, spread: 0.5, spin: 0, speed: 12,
      colorBucket: bucketNear(wx, wy),
    });
    pointer.mode = 'idle';
  } else if (tool === 'cloud' || tool === 'ring' || tool === 'disc' || tool === 'jet' || tool === 'stream') {
    pointer.mode = 'spawn';
    pointer.spawnKind = tool;
    previewState.active = true;
    previewState.kind = 'spawn';
    previewState.cx = wx; previewState.cy = wy; previewState.radius = 4;
  } else if (tool === 'erase') {
    pointer.mode = 'erase';
    eraseAttractorAt(wx, wy);
    eraseParticlesAt(wx, wy);
    previewState.active = true; previewState.kind = 'erase';
    previewState.cx = wx; previewState.cy = wy; previewState.radius = eraseRadius();
  } else if (tool === 'impulse') {
    pointer.mode = 'impulse';
    pointer.impulsePoints = [wx, wy];
    pointer.lastImpulseX = wx; pointer.lastImpulseY = wy;
    previewState.active = true; previewState.kind = 'impulse'; previewState.points = [wx, wy];
  } else if (tool === 'influence') {
    pointer.mode = 'influence';
    previewState.active = true; previewState.kind = 'influence';
    previewState.cx = wx; previewState.cy = wy; previewState.radius = CONSTANTS.GENTLE_INFLUENCE_RADIUS;
  } else if (tool === 'pulse') {
    const selected = attractors.find(a => a.id === state.selectedAttractorId);
    const target = selected || nearestAttractor(wx, wy, 48 / cam.zoom);
    pointer.target = target;
    pointer.mode = target ? 'pulse' : 'idle';
    if (target) {
      // Reuse the established arrow preview so pulse remains visible without a renderer branch.
      previewState.active = true; previewState.kind = 'velocity';
      previewState.cx = target.x; previewState.cy = target.y;
      previewState.ex = target.x; previewState.ey = target.y;
    }
  }
}

function onPointerMove(e) {
  const rect = canvasEl.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

  if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: sx, y: sy });

  if (pinchActive) {
    if (activePointers.size >= 2) {
      const pts = [...activePointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2, midY = (pts[0].y + pts[1].y) / 2;
      if (pinchLastDist && dist > 0) {
        const factor = clamp(dist / pinchLastDist, 0.85, 1.18);
        cam.zoomAt(midX, midY, factor, rect.width, rect.height);
      }
      pinchLastDist = dist;
    }
    return;
  }

  if (!pointer.down) return;
  const [wx, wy] = cam.screenToWorld(sx, sy, rect.width, rect.height);
  const previousX = pointer.curX, previousY = pointer.curY;
  pointer.curX = wx; pointer.curY = wy;
  pointer.moveHistory.push({ x: wx, y: wy, t: performance.now() });
  if (pointer.moveHistory.length > 6) pointer.moveHistory.shift();

  if (pointer.cradleEligible && Math.hypot(sx - pointer.startScreenX, sy - pointer.startScreenY) > CONSTANTS.CRADLE_DRIFT_PIXELS) {
    clearCradleWatch();
  }

  switch (pointer.mode) {
    case 'pan':
      cam.pan(sx - pointer.lastScreenX, sy - pointer.lastScreenY);
      break;
    case 'moveAttractor':
      if (pointer.target) { pointer.target.x = wx; pointer.target.y = wy; }
      break;
    case 'cradleBody':
      if (pointer.target) { pointer.target.x = wx; pointer.target.y = wy; }
      break;
    case 'placeVelocity':
      previewState.active = true; previewState.kind = 'velocity';
      previewState.cx = pointer.target.x; previewState.cy = pointer.target.y;
      previewState.ex = wx; previewState.ey = wy;
      if (pointer.target) {
        const { vx, vy } = placementVelocity(
          { x: pointer.startX, y: pointer.startY },
          { x: wx, y: wy },
        );
        const trajectory = predictTrajectory({
          body: { ...pointer.target, vx, vy },
          bodies: attractors,
          gravity: 2600 * state.gravityStrength,
        });
        previewState.trajectory = trajectory.points;
        previewState.orbitHealth = trajectory.outcome;
        previewState.closestBodyId = trajectory.closestBodyId;
      }
      break;
    case 'spawn': {
      const dx = wx - pointer.startX, dy = wy - pointer.startY;
      const r = Math.hypot(dx, dy);
      previewState.radius = Math.max(r, 8);
      if (pointer.spawnKind === 'jet' || pointer.spawnKind === 'stream') {
        previewState.dirX = dx; previewState.dirY = dy;
      } else {
        previewState.dirX = undefined;
      }
      break;
    }
    case 'erase':
      eraseParticlesAt(wx, wy);
      previewState.cx = wx; previewState.cy = wy;
      break;
    case 'impulse': {
      applyImpulseAt(pointer.lastImpulseX, pointer.lastImpulseY, wx, wy);
      pointer.impulsePoints.push(wx, wy);
      if (pointer.impulsePoints.length > 40) pointer.impulsePoints.splice(0, pointer.impulsePoints.length - 40);
      previewState.points = pointer.impulsePoints;
      pointer.lastImpulseX = wx; pointer.lastImpulseY = wy;
      break;
    }
    case 'influence':
      applyGentleInfluence(attractors, {
        x: wx, y: wy,
        dx: wx - previousX, dy: wy - previousY,
      }, influenceOptionsForVariant(state.gardenVariant));
      previewState.cx = wx; previewState.cy = wy;
      break;
    case 'pulse':
      if (pointer.target) {
        previewState.ex = pointer.target.x + wx - pointer.startX;
        previewState.ey = pointer.target.y + wy - pointer.startY;
      }
      break;
  }
  pointer.lastScreenX = sx; pointer.lastScreenY = sy;
}

function onPointerUp(e) {
  if (e && activePointers.has(e.pointerId)) activePointers.delete(e.pointerId);
  if (pinchActive) {
    if (activePointers.size < 2) { pinchActive = false; pinchLastDist = null; }
    return;
  }

  const isCancel = e?.type === 'pointercancel';

  switch (pointer.mode) {
    case 'placeVelocity': {
      const a = pointer.target;
      if (a && !a.fixed) {
        Object.assign(a, placementVelocity(
          { x: pointer.startX, y: pointer.startY },
          { x: pointer.curX, y: pointer.curY },
        ));
      }
      break;
    }
    case 'cradleBody':
      finishCradle(!isCancel);
      break;
    case 'pulse':
      if (pointer.target && !isCancel) {
        applyBodyPulse(pointer.target, {
          x: pointer.curX - pointer.startX,
          y: pointer.curY - pointer.startY,
        });
      }
      break;
    case 'moveAttractor': {
      const a = pointer.target;
      if (a && !a.fixed && pointer.moveHistory.length >= 2) {
        const h = pointer.moveHistory;
        const first = h[0], last = h[h.length - 1];
        const dt = Math.max((last.t - first.t) / 1000, 0.001);
        if (last.t - first.t < 400) {
          a.vx = clamp((last.x - first.x) / dt * 0.4, -900, 900);
          a.vy = clamp((last.y - first.y) / dt * 0.4, -900, 900);
        }
      }
      break;
    }
    case 'spawn':
      doSpawn();
      break;
  }
  pointer.down = false;
  clearCradleWatch();
  if (pointer.target?.cradled) finishCradle(false);
  pointer.mode = null;
  pointer.target = null;
  clearToolPreview();
}

function onWheel(e) {
  e.preventDefault();
  const rect = canvasEl.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
  const factor = Math.pow(1.0018, -e.deltaY);
  cam.zoomAt(sx, sy, factor, rect.width, rect.height);
}

function onDoubleClick(e) {
  const { wx, wy } = rectAndWorld(e);
  P.spawnPattern({
    cx: wx, cy: wy,
    count: Math.min(state.spawnAmount, 500),
    mode: 'disc', radius: 55, spread: 0.4,
    spin: 0, speed: 140,
    colorBucket: bucketNear(wx, wy),
  });
}

function eraseRadius() { return 34 / cam.zoom; }

function eraseAttractorAt(wx, wy) {
  const hit = hitTestAttractor(wx, wy, 8);
  if (hit) {
    removeAttractor(hit.id);
    if (state.selectedAttractorId === hit.id) dispatchSelection(null);
  }
}

function eraseParticlesAt(wx, wy) {
  P.clearNear(wx, wy, eraseRadius());
  for (let i = emitters.length - 1; i >= 0; i--) {
    const em = emitters[i];
    if (Math.hypot(em.x - wx, em.y - wy) < eraseRadius() + 20) emitters.splice(i, 1);
  }
}

function applyImpulseAt(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const dlen = Math.hypot(dx, dy);
  if (dlen < 0.001) return;
  const ux = dx / dlen, uy = dy / dlen;
  const radius = 85;
  const r2 = radius * radius;
  const strength = clamp(dlen * 5, 0, 260);
  for (let i = 0; i < P.count; i++) {
    const ddx = P.px[i] - x2, ddy = P.py[i] - y2;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 <= r2) {
      const falloff = 1 - Math.sqrt(d2) / radius;
      P.pvx[i] += ux * strength * falloff;
      P.pvy[i] += uy * strength * falloff;
    }
  }
}

function doSpawn() {
  const dx = pointer.curX - pointer.startX, dy = pointer.curY - pointer.startY;
  const dragLen = Math.hypot(dx, dy);
  const kind = pointer.spawnKind;
  const isDirectional = kind === 'jet' || kind === 'stream';
  const mode = kind === 'cloud' ? state.spawnMode : (kind === 'stream' ? 'jet' : kind);

  const opts = {
    cx: pointer.startX, cy: pointer.startY,
    count: state.spawnAmount,
    mode,
    radius: kind === 'jet' ? Math.max(state.spawnRadius * 0.35, 20)
      : kind === 'stream' ? Math.max(state.spawnRadius * 0.6, 34)
      : Math.max(dragLen, state.spawnRadius * 0.4, 24),
    spread: state.spawnSpread,
    spin: state.spawnSpin,
    speed: isDirectional ? clamp(dragLen * (kind === 'jet' ? 2.2 : 1.5), 60, 900) : state.spawnSpeed,
    angle: isDirectional ? Math.atan2(dy, dx) : 0,
    coneSpread: kind === 'stream' ? 0.7 : 0.4,
    colorBucket: bucketNear(pointer.startX, pointer.startY),
  };

  if (state.continuousStream) {
    emitters.push({
      id: nextEmitterId++,
      x: opts.cx, y: opts.cy, mode: opts.mode,
      radius: opts.radius, spread: opts.spread, spin: opts.spin,
      speed: opts.speed, angle: opts.angle, coneSpread: opts.coneSpread,
      colorBucket: opts.colorBucket,
      rate: Math.max(state.spawnAmount / 3, 12),
      acc: 0,
    });
  } else {
    P.spawnPattern(opts);
  }
}

export function tickEmitters(dt) {
  for (const em of emitters) {
    em.acc += em.rate * dt;
    while (em.acc >= 1) {
      em.acc -= 1;
      P.spawnPattern({
        cx: em.x, cy: em.y, count: 1, mode: em.mode,
        radius: em.radius, spread: em.spread, spin: em.spin,
        speed: em.speed, angle: em.angle, coneSpread: em.coneSpread,
        colorBucket: em.colorBucket,
      });
    }
  }
}

export function clearEmitters() {
  emitters.length = 0;
  clearToolPreview();
}

export function focusOnSelected(camera) {
  const a = attractors.find(a => a.id === state.selectedAttractorId);
  if (a) camera.focusOn(a.x, a.y, Math.max(camera.zoom, 1.4));
}
