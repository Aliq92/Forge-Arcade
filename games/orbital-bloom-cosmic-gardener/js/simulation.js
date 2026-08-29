// Orbital Bloom - main simulation orchestration: fixed-timestep physics loop
import { CONSTANTS, PALETTE, state, stats } from './config.js';
import * as P from './particles.js';
import { attractors, clearAttractors, removeAttractor } from './attractors.js';
import * as Gravity from './gravity.js';
import * as Renderer from './renderer.js';
import { tickEmitters, clearEmitters } from './tools.js';
import { awardGardenStardust, evaluateIntentions, recordDiscovery, updateChallenge } from './challenges.js';
import {
  advanceGardenBody,
  deriveGardenMetrics,
  drainTransformationEvents,
  enqueueTransformationEvent,
  resolveTransformation,
  summarizeGarden,
} from './garden.js';

let camera = null;
let canvas = null;
let rafId = null;
let lastT = null;
let gardenUpdateAccumulator = 0;
let harmoniousSeconds = 0;
let ejectionCheckAccumulator = 0;
let transformationCount = 0;

const GARDEN_UPDATE_INTERVAL = 0.25;
const EJECTION_CHECK_INTERVAL = 0.5;
const MAX_WORLD_DISTANCE = 6000;
const TRANSFORMATION_COLORS = Object.freeze({
  ring: '#ffd27a',
  debris: '#ff8f78',
  nebula: '#ff8f78',
  stardust: '#ffd27a',
  'wandering-seed': '#ffd27a',
});

export function initSimulation(cameraRef, canvasRef) {
  camera = cameraRef;
  canvas = canvasRef;
}

function queueTransformation(event) {
  if (!event) return;
  enqueueTransformationEvent({ event, result: resolveTransformation(event) });
}

function onAttractorMerge(survivor, x, y, event) {
  Renderer.triggerFlash(x, y, PALETTE[survivor.color] || PALETTE.gold, survivor.radius * 3.2);
  queueTransformation(event);
}

function onAttractorBounce(a, b, x, y) {
  Renderer.triggerFlash(x, y, PALETTE[a.color] || PALETTE.white, Math.max(a.radius, b.radius) * 2.2);
}

function onAttractorDestroy(survivor, x, y, doomedColor, event) {
  Renderer.triggerFlash(x, y, PALETTE[doomedColor] || PALETTE.violet, survivor.radius * 2.8);
  queueTransformation(event);
}

function onSlingshotEvent(x, y) {
  Renderer.triggerFlash(x, y, PALETTE.cyan, 60);
}

export function physicsStep(dt) {
  const g = CONSTANTS.G_DEFAULT * state.gravityStrength;
  Gravity.stepAttractors(dt, g);
  Gravity.handleAttractorCollisions({
    onMerge: onAttractorMerge,
    onBounce: onAttractorBounce,
    onDestroy: onAttractorDestroy,
  });
  queueEjectedBodies(dt);
  processTransformationEvents();
  Gravity.stepParticles(dt, g, onSlingshotEvent);
  tickEmitters(dt);
  stats.simTime += dt;
  updateChallenge();
  updateGardenState(dt, g);
}

function queueEjectedBodies(dt) {
  ejectionCheckAccumulator += dt;
  while (ejectionCheckAccumulator + Number.EPSILON >= EJECTION_CHECK_INTERVAL) {
    ejectionCheckAccumulator -= EJECTION_CHECK_INTERVAL;
    for (let i = attractors.length - 1; i >= 0; i--) {
      const body = attractors[i];
      if (body.fixed || body.cradled || body.lastTransform === 'ejected') continue;
      if (Math.hypot(body.x, body.y) <= MAX_WORLD_DISTANCE) continue;

      body.lastTransform = 'ejected';
      queueTransformation({
        kind: 'ejection', body, x: body.x, y: body.y,
        distance: Math.hypot(body.x, body.y), worldDistance: MAX_WORLD_DISTANCE,
      });
      removeAttractor(body.id);
    }
  }
}

function processTransformationEvents() {
  const events = drainTransformationEvents();
  if (events.length === 0) return;

  for (const { event, result } of events) {
    transformationCount++;
    if (result.ringDelta > 0 && event.survivor) {
      event.survivor.ringStrength = Math.min(1, Math.max(0, event.survivor.ringStrength || 0) + result.ringDelta);
    }
    if (result.discovery) recordDiscovery(result.discovery);
    awardGardenStardust(result.reward);

    const body = event.survivor || event.body;
    const radius = Math.max(20, body?.radius || 20);
    const x = event.x ?? body?.x ?? 0;
    const y = event.y ?? body?.y ?? 0;
    Renderer.triggerFlash(x, y, TRANSFORMATION_COLORS[result.residue] || TRANSFORMATION_COLORS.debris, Math.min(100, radius * 2.1));

    if (result.residue === 'debris' || result.residue === 'nebula') {
      P.spawnPattern({
        cx: x, cy: y,
        count: result.residue === 'debris' ? 28 : 42,
        mode: 'disc', radius: radius * (result.residue === 'debris' ? 2.4 : 3),
        spread: 0.65, spin: 0, speed: result.residue === 'debris' ? 90 : 140,
        lifespan: result.residue === 'debris' ? 4 : 6,
        colorBucket: P.bucketIndexForColor(result.residue === 'debris' ? 'gold' : 'violet'),
      });
    }
  }
}

function updateGardenState(dt, gravity) {
  gardenUpdateAccumulator += dt;
  while (gardenUpdateAccumulator >= GARDEN_UPDATE_INTERVAL) {
    gardenUpdateAccumulator -= GARDEN_UPDATE_INTERVAL;

    for (const body of attractors) {
      if (body.type !== 'planet' && body.type !== 'moon') continue;
      advanceGardenBody(body, deriveGardenMetrics(body, attractors, gravity), GARDEN_UPDATE_INTERVAL);
      if (body.type === 'planet' && body.gardenStage === 'stable') recordDiscovery('stable-world');
      if (body.type === 'planet' && body.gardenStage === 'temperate') recordDiscovery('temperate-world');
      if (body.type === 'planet' && body.gardenStage === 'blooming') recordDiscovery('blooming-world');
      if (body.type === 'moon' && body.orbitHealth === 'stable') recordDiscovery('stable-moon');
    }

    const beforeHarmony = summarizeGarden(attractors, transformationCount, harmoniousSeconds);
    harmoniousSeconds = beforeHarmony.stablePlanets + beforeHarmony.stableMoons >= 2
      ? harmoniousSeconds + GARDEN_UPDATE_INTERVAL
      : 0;
    evaluateIntentions(summarizeGarden(attractors, transformationCount, harmoniousSeconds), GARDEN_UPDATE_INTERVAL);
  }
}

export function stepForward() {
  const dt = CONSTANTS.BASE_DT * Math.max(state.speedMultiplier, 1);
  physicsStep(dt);
}

export function startLoop() {
  lastT = performance.now();
  const frame = (t) => {
    rafId = requestAnimationFrame(frame);
    const dtReal = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    camera.update(dtReal);

    if (state.running) {
      const sm = state.speedMultiplier;
      const steps = sm <= 1 ? 1 : Math.round(sm);
      const dtPerStep = CONSTANTS.BASE_DT * (sm / steps);
      for (let i = 0; i < steps; i++) physicsStep(dtPerStep);
    }

    if (state.followBody && state.selectedAttractorId != null && !camera._animT) {
      const a = attractors.find(a => a.id === state.selectedAttractorId);
      if (a) {
        const followLerp = 1 - Math.pow(0.0025, dtReal);
        camera.x += (a.x - camera.x) * followLerp;
        camera.y += (a.y - camera.y) * followLerp;
      }
    }

    camera._vw = canvas.clientWidth;
    camera._vh = canvas.clientHeight;
    Renderer.render(camera, canvas.clientWidth, canvas.clientHeight, dtReal);
  };
  rafId = requestAnimationFrame(frame);
}

export function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

export function resetSimulation() {
  clearAttractors();
  P.resetParticles();
  clearEmitters();
  Renderer.clearTrails();
  stats.absorbedCount = 0;
  stats.simTime = 0;
  gardenUpdateAccumulator = 0;
  harmoniousSeconds = 0;
  ejectionCheckAccumulator = 0;
  transformationCount = 0;
  state.selectedAttractorId = null;
  state.running = true;
  camera.reset(true);
}

export function clearParticlesOnly() {
  P.resetParticles();
  clearEmitters();
  stats.absorbedCount = 0;
}

export function clearAttractorsOnly() {
  clearAttractors();
  state.selectedAttractorId = null;
}

export function clearAllBodies() {
  clearParticlesOnly();
  clearAttractorsOnly();
}

export function liveParticleStats() {
  let sum = 0, max = 0;
  for (let i = 0; i < P.count; i++) {
    const s = P.pspeed[i];
    sum += s;
    if (s > max) max = s;
  }
  return {
    avg: P.count > 0 ? sum / P.count : 0,
    max,
    count: P.count,
    attractorCount: attractors.length,
  };
}
