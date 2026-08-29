// Orbital Bloom - pure garden-state metadata and orbital health metrics

export const GARDEN_STAGES = ['young', 'stable', 'temperate', 'blooming'];

const transformationEvents = [];
const EMPTY_TRANSFORMATION_EVENTS = Object.freeze([]);

export const GARDEN_THRESHOLDS = Object.freeze({
  stableSeconds: 12,
  temperateSeconds: 24,
  bloomingSeconds: 45,
  temperateWarmthMin: 0.72,
  temperateWarmthMax: 1.28,
});

export function createGardenMetadata(type, overrides = {}) {
  return {
    gardenStage: overrides.gardenStage || 'young',
    stageAge: Number.isFinite(overrides.stageAge) ? overrides.stageAge : 0,
    stableFor: Number.isFinite(overrides.stableFor) ? overrides.stableFor : 0,
    dominantStarId: overrides.dominantStarId ?? null,
    warmth: Number.isFinite(overrides.warmth) ? overrides.warmth : 0,
    orbitHealth: overrides.orbitHealth || 'unknown',
    appearanceSeed: Number.isFinite(overrides.appearanceSeed) ? overrides.appearanceSeed : 0,
    ringStrength: Number.isFinite(overrides.ringStrength) ? overrides.ringStrength : 0,
    cradled: false,
    lastTransform: overrides.lastTransform || null,
  };
}

export function resolveTransformation(event = {}) {
  const mass = Math.max(0, event.consumed?.mass ?? event.body?.mass ?? 0);
  const reward = event.kind === 'merge'
    ? Math.min(60, 10 + Math.round(mass / 25))
    : event.kind === 'destroy'
      ? Math.min(60, 12 + Math.round(mass / 30))
      : Math.min(40, Math.max(8, Math.round(mass / 100)));

  if (event.kind === 'merge') {
    const createsRing = event.survivor?.type === 'planet' && event.consumed?.type === 'moon';
    return {
      reward,
      residue: createsRing ? 'ring' : 'debris',
      ringDelta: createsRing ? 0.22 : 0,
      discovery: createsRing ? 'first-ring-transformation' : null,
    };
  }

  if (event.kind === 'destroy') {
    return { reward, residue: 'nebula', ringDelta: 0, discovery: null };
  }

  const distance = event.distance;
  const worldDistance = Number.isFinite(event.worldDistance) && event.worldDistance > 0
    ? event.worldDistance
    : 6000;
  if (Number.isFinite(distance) && distance >= worldDistance) {
    return { reward, residue: 'stardust', ringDelta: 0, discovery: null };
  }

  return { reward, residue: 'wandering-seed', ringDelta: 0, discovery: null };
}

export function enqueueTransformationEvent(event) {
  transformationEvents.push(event);
}

export function drainTransformationEvents() {
  if (transformationEvents.length === 0) return EMPTY_TRANSFORMATION_EVENTS;
  return transformationEvents.splice(0);
}

export function findDominantStar(body, bodies) {
  let dominant = null;
  let strongestInfluence = -Infinity;

  for (const candidate of bodies) {
    if (candidate === body || candidate.type !== 'star' || !Number.isFinite(candidate.mass)) continue;
    const dx = body.x - candidate.x;
    const dy = body.y - candidate.y;
    const distanceSquared = dx * dx + dy * dy;
    const influence = candidate.mass / Math.max(distanceSquared, Number.EPSILON);
    if (influence > strongestInfluence) {
      dominant = candidate;
      strongestInfluence = influence;
    }
  }

  return dominant;
}

export function deriveGardenMetrics(body, bodies, gravity) {
  const star = findDominantStar(body, bodies);
  if (!star || !Number.isFinite(gravity) || gravity <= 0) {
    return {
      dominantStarId: null,
      specificEnergy: null,
      angularMomentum: 0,
      eccentricity: Infinity,
      orbitState: 'unstable',
      warmth: 0,
      warmthState: 'cold',
    };
  }

  const rx = body.x - star.x;
  const ry = body.y - star.y;
  const vx = body.vx - star.vx;
  const vy = body.vy - star.vy;
  const distanceSquared = rx * rx + ry * ry;
  const distance = Math.sqrt(distanceSquared);
  const mu = gravity * star.mass;

  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(mu) || mu <= 0) {
    return {
      dominantStarId: star.id,
      specificEnergy: null,
      angularMomentum: 0,
      eccentricity: Infinity,
      orbitState: 'unstable',
      warmth: 0,
      warmthState: 'cold',
    };
  }

  const speedSquared = vx * vx + vy * vy;
  const specificEnergy = speedSquared / 2 - mu / distance;
  const angularMomentum = rx * vy - ry * vx;
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * specificEnergy * angularMomentum * angularMomentum) / (mu * mu)));
  const orbitState = eccentricity < 0.22 ? 'stable' : eccentricity < 0.55 ? 'transitional' : 'unstable';
  const warmth = (star.mass / 9000) * ((220 * 220) / distanceSquared);
  const warmthState = warmth < GARDEN_THRESHOLDS.temperateWarmthMin
    ? 'cold'
    : warmth > GARDEN_THRESHOLDS.temperateWarmthMax
      ? 'hot'
      : 'temperate';

  return {
    dominantStarId: star.id,
    specificEnergy,
    angularMomentum,
    eccentricity,
    orbitState,
    warmth,
    warmthState,
  };
}

export function advanceGardenBody(body, metrics, dt) {
  const elapsed = Number.isFinite(dt) && dt > 0 ? dt : 0;
  body.dominantStarId = metrics.dominantStarId ?? body.dominantStarId ?? null;
  body.warmth = Number.isFinite(metrics.warmth) ? metrics.warmth : body.warmth ?? 0;
  body.orbitHealth = metrics.orbitState || 'unknown';

  if (metrics.orbitState === 'stable') body.stableFor = (body.stableFor || 0) + elapsed;
  if (metrics.orbitState === 'unstable') body.stableFor = 0;

  let nextStage = 'young';
  if (body.stableFor >= GARDEN_THRESHOLDS.stableSeconds) nextStage = 'stable';
  if (body.stableFor >= GARDEN_THRESHOLDS.temperateSeconds && metrics.warmthState === 'temperate') nextStage = 'temperate';
  if (body.stableFor >= GARDEN_THRESHOLDS.bloomingSeconds && metrics.warmthState === 'temperate') nextStage = 'blooming';

  if (body.gardenStage !== nextStage) {
    body.gardenStage = nextStage;
    body.stageAge = 0;
  } else {
    body.stageAge = (body.stageAge || 0) + elapsed;
  }

  return body;
}

export function summarizeGarden(bodies, transformationCount, harmoniousSeconds) {
  let stablePlanets = 0;
  let stableMoons = 0;
  let temperatePlanets = 0;

  for (const body of bodies || []) {
    if (!body || body.orbitHealth !== 'stable') continue;
    if (body.type === 'planet') {
      stablePlanets++;
      if (body.gardenStage === 'temperate' || body.gardenStage === 'blooming') temperatePlanets++;
    } else if (body.type === 'moon') {
      stableMoons++;
    }
  }

  return {
    stablePlanets,
    stableMoons,
    temperatePlanets,
    harmoniousSeconds: Number.isFinite(harmoniousSeconds) && harmoniousSeconds > 0 ? harmoniousSeconds : 0,
    transformations: Number.isFinite(transformationCount) && transformationCount > 0 ? Math.floor(transformationCount) : 0,
  };
}
