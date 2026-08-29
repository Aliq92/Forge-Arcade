// Orbital Bloom - read-only previews for gentle celestial placement.
import { CONSTANTS } from './config.js';

const MAX_STEPS = 90;
const MAX_WORLD_DISTANCE = 6000;
const STABLE_RADIUS_TOLERANCE = 0.35;
const SOFTENING_SQUARED = CONSTANTS.SOFTENING * CONSTANTS.SOFTENING;

function hasFiniteBodyValues(body) {
  return !!body && Number.isFinite(body.x) && Number.isFinite(body.y)
    && Number.isFinite(body.vx) && Number.isFinite(body.vy)
    && Number.isFinite(body.mass) && Number.isFinite(body.radius);
}

function isCandidateOf(body, candidate) {
  return body === candidate || (Number.isFinite(body?.id) && body.id === candidate.id);
}

function overlapsBody(x, y, candidate, other) {
  const dx = other.x - x;
  const dy = other.y - y;
  const radius = candidate.radius + other.radius;
  return dx * dx + dy * dy <= radius * radius;
}

function dominantStarFor(body, bodies) {
  let dominantStar = null;
  let dominantInfluence = -Infinity;
  for (let i = 0; i < bodies.length; i++) {
    const other = bodies[i];
    if (other?.type !== 'star' || isCandidateOf(other, body) || !Number.isFinite(other.mass)
      || !Number.isFinite(other.x) || !Number.isFinite(other.y)) continue;
    const dx = other.x - body.x;
    const dy = other.y - body.y;
    const influence = other.mass / (dx * dx + dy * dy + SOFTENING_SQUARED);
    if (influence > dominantInfluence) {
      dominantInfluence = influence;
      dominantStar = other;
    }
  }
  return dominantStar;
}

export function classifyOrbitPreview(points, body, bodies, gravity) {
  if (!Array.isArray(points) || points.length === 0 || !hasFiniteBodyValues(body)
    || !Array.isArray(bodies) || !Number.isFinite(gravity) || gravity <= 0) return 'danger';

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
      || Math.hypot(point.x, point.y) > MAX_WORLD_DISTANCE) return 'danger';
    for (let j = 0; j < bodies.length; j++) {
      const other = bodies[j];
      if (isCandidateOf(other, body)) continue;
      if (!hasFiniteBodyValues(other) || overlapsBody(point.x, point.y, body, other)) return 'danger';
    }
  }

  const dominantStar = dominantStarFor(body, bodies);
  if (!dominantStar) return 'uncertain';

  const initialRadius = Math.hypot(body.x - dominantStar.x, body.y - dominantStar.y);
  const finalPoint = points[points.length - 1];
  const finalRadius = Math.hypot(finalPoint.x - dominantStar.x, finalPoint.y - dominantStar.y);
  if (!Number.isFinite(initialRadius) || !Number.isFinite(finalRadius) || initialRadius <= 0) return 'danger';
  return Math.abs(finalRadius - initialRadius) / initialRadius <= STABLE_RADIUS_TOLERANCE
    ? 'stable'
    : 'uncertain';
}

export function predictTrajectory({ body, bodies, gravity, steps = MAX_STEPS, dt = 1 / 30 } = {}) {
  if (!hasFiniteBodyValues(body) || !Array.isArray(bodies) || !Number.isFinite(gravity) || gravity <= 0
    || !Number.isFinite(dt) || dt <= 0) {
    return { points: [], outcome: 'danger', closestBodyId: null };
  }

  const stepCount = Math.min(MAX_STEPS, Math.max(0, Math.floor(Number.isFinite(steps) ? steps : MAX_STEPS)));
  let x = body.x;
  let y = body.y;
  let vx = body.vx;
  let vy = body.vy;
  let closestBodyId = null;
  let closestDistanceSquared = Infinity;
  const points = [{ x, y }];

  for (let i = 0; i < bodies.length; i++) {
    const other = bodies[i];
    if (isCandidateOf(other, body) || !hasFiniteBodyValues(other)) continue;
    const dx = other.x - x;
    const dy = other.y - y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < closestDistanceSquared) {
      closestDistanceSquared = distanceSquared;
      closestBodyId = other.id;
    }
    if (overlapsBody(x, y, body, other)) {
      return {
        points,
        outcome: classifyOrbitPreview(points, body, bodies, gravity),
        closestBodyId,
      };
    }
  }

  for (let step = 0; step < stepCount; step++) {
    let ax = 0;
    let ay = 0;
    for (let i = 0; i < bodies.length; i++) {
      const other = bodies[i];
      if (isCandidateOf(other, body) || !hasFiniteBodyValues(other)) continue;
      const dx = other.x - x;
      const dy = other.y - y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < closestDistanceSquared) {
        closestDistanceSquared = distanceSquared;
        closestBodyId = other.id;
      }
      const softenedDistanceSquared = distanceSquared + SOFTENING_SQUARED;
      const inverseDistance = 1 / Math.sqrt(softenedDistanceSquared);
      const force = gravity * other.mass * inverseDistance * inverseDistance * inverseDistance;
      ax += dx * force;
      ay += dy * force;
    }

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy)) {
      return { points, outcome: 'danger', closestBodyId };
    }
    points.push({ x, y });
    if (Math.hypot(x, y) > MAX_WORLD_DISTANCE) break;

    let collided = false;
    for (let i = 0; i < bodies.length; i++) {
      const other = bodies[i];
      if (isCandidateOf(other, body) || !hasFiniteBodyValues(other)) continue;
      if (overlapsBody(x, y, body, other)) {
        closestBodyId = other.id;
        collided = true;
        break;
      }
    }
    if (collided) break;
  }

  return {
    points,
    outcome: classifyOrbitPreview(points, body, bodies, gravity),
    closestBodyId,
  };
}
