import { CONFIG } from './config.js';
import { finiteVec, reflect } from './math.js';

const MAX_IMPACTS = 8;
const CONTACT_EPSILON = 1e-7;
const TIME_EPSILON = 1e-12;

function startInsideNormal(delta, origin, bounds) {
  const absX = Math.abs(delta.x);
  const absY = Math.abs(delta.y);

  if (absX > 0 || absY > 0) {
    if (absX >= absY) {
      return { x: delta.x > 0 ? -1 : 1, y: 0 };
    }
    return { x: 0, y: delta.y > 0 ? -1 : 1 };
  }

  const faces = [
    { distance: origin.x - bounds.minX, normal: { x: -1, y: 0 } },
    { distance: bounds.maxX - origin.x, normal: { x: 1, y: 0 } },
    { distance: origin.y - bounds.minY, normal: { x: 0, y: -1 } },
    { distance: bounds.maxY - origin.y, normal: { x: 0, y: 1 } }
  ];
  faces.sort((a, b) => a.distance - b.distance);
  return faces[0].normal;
}

function axisTimes(origin, delta, min, max, axis) {
  if (delta === 0) {
    if (origin < min || origin > max) return null;
    return { entry: -Infinity, exit: Infinity, normal: { x: 0, y: 0 } };
  }

  const first = (min - origin) / delta;
  const second = (max - origin) / delta;
  const entry = Math.min(first, second);
  const exit = Math.max(first, second);
  const direction = delta > 0 ? -1 : 1;

  return {
    entry,
    exit,
    normal: axis === 'x'
      ? { x: direction, y: 0 }
      : { x: 0, y: direction }
  };
}

function cornerNormal(xNormal, yNormal) {
  return {
    x: xNormal.x * Math.SQRT1_2,
    y: yNormal.y * Math.SQRT1_2
  };
}

export function sweepCircle(origin, delta, radius, collider) {
  if (!finiteVec(origin) || !finiteVec(delta) || !Number.isFinite(radius) || radius < 0) {
    return null;
  }
  if (![collider?.x, collider?.y, collider?.w, collider?.h].every(Number.isFinite)) {
    return null;
  }

  const bounds = {
    minX: collider.x - radius,
    maxX: collider.x + collider.w + radius,
    minY: collider.y - radius,
    maxY: collider.y + collider.h + radius
  };
  const inside = origin.x >= bounds.minX && origin.x <= bounds.maxX
    && origin.y >= bounds.minY && origin.y <= bounds.maxY;

  if (inside) {
    return {
      time: 0,
      normal: startInsideNormal(delta, origin, bounds),
      point: { ...origin },
      collider
    };
  }

  const xTimes = axisTimes(origin.x, delta.x, bounds.minX, bounds.maxX, 'x');
  const yTimes = axisTimes(origin.y, delta.y, bounds.minY, bounds.maxY, 'y');
  if (!xTimes || !yTimes) return null;

  const entry = Math.max(xTimes.entry, yTimes.entry);
  const exit = Math.min(xTimes.exit, yTimes.exit);
  if (entry < 0 || entry > 1 || entry - exit > TIME_EPSILON || exit < 0) return null;

  const isCorner = Number.isFinite(xTimes.entry)
    && Number.isFinite(yTimes.entry)
    && Math.abs(xTimes.entry - yTimes.entry) <= TIME_EPSILON;
  const normal = isCorner
    ? cornerNormal(xTimes.normal, yTimes.normal)
    : xTimes.entry > yTimes.entry ? xTimes.normal : yTimes.normal;

  return {
    time: entry,
    normal,
    point: {
      x: origin.x + delta.x * entry,
      y: origin.y + delta.y * entry
    },
    collider
  };
}

function invalidFrame() {
  return { invalid: true, events: [] };
}

function earlierHit(candidate, current) {
  if (!current || candidate.time < current.time - TIME_EPSILON) return true;
  if (Math.abs(candidate.time - current.time) > TIME_EPSILON) return false;
  return String(candidate.collider.id ?? '') < String(current.collider.id ?? '');
}

function moveOutsideWall(position, collider, normal) {
  const outside = { ...position };
  if (normal.x < 0) outside.x = collider.x - CONFIG.boltRadius - CONTACT_EPSILON;
  if (normal.x > 0) outside.x = collider.x + collider.w + CONFIG.boltRadius + CONTACT_EPSILON;
  if (normal.y < 0) outside.y = collider.y - CONFIG.boltRadius - CONTACT_EPSILON;
  if (normal.y > 0) outside.y = collider.y + collider.h + CONFIG.boltRadius + CONTACT_EPSILON;
  return outside;
}

function finiteColliderGeometry(collider, radius) {
  if (![collider?.x, collider?.y, collider?.w, collider?.h].every(Number.isFinite)) {
    return false;
  }
  return [
    collider.x - radius,
    collider.x + collider.w + radius,
    collider.y - radius,
    collider.y + collider.h + radius
  ].every(Number.isFinite);
}

export function advanceBolt(bolt, colliders, dt) {
  if (!finiteVec(bolt?.position) || !finiteVec(bolt?.velocity)
      || !Number.isFinite(dt) || dt < 0 || !Array.isArray(colliders)) {
    return invalidFrame();
  }
  if (!colliders.every((collider) => finiteColliderGeometry(collider, CONFIG.boltRadius))) {
    return invalidFrame();
  }

  let position = { ...bolt.position };
  let velocity = { ...bolt.velocity };
  let remaining = dt;
  let impacts = 0;
  const events = [];
  const triggeredSensors = new Set();

  while (remaining > 0 && impacts < MAX_IMPACTS) {
    const delta = {
      x: velocity.x * remaining,
      y: velocity.y * remaining
    };
    if (!finiteVec(delta)) return invalidFrame();

    let earliest = null;
    for (const collider of colliders) {
      if (collider.type !== 'wall' && triggeredSensors.has(collider.id)) continue;
      const candidate = sweepCircle(position, delta, CONFIG.boltRadius, collider);
      if (candidate && earlierHit(candidate, earliest)) earliest = candidate;
    }

    if (!earliest) {
      position = {
        x: position.x + delta.x,
        y: position.y + delta.y
      };
      if (!finiteVec(position)) return invalidFrame();
      remaining = 0;
      break;
    }

    position = { ...earliest.point };
    remaining *= 1 - earliest.time;
    impacts += 1;

    if (earliest.collider.type === 'wall') {
      velocity = reflect(velocity, earliest.normal);
      position = earliest.time === 0
        ? moveOutsideWall(position, earliest.collider, earliest.normal)
        : {
            x: position.x + earliest.normal.x * CONTACT_EPSILON,
            y: position.y + earliest.normal.y * CONTACT_EPSILON
          };
    } else {
      events.push({ type: earliest.collider.type, id: earliest.collider.id });
      triggeredSensors.add(earliest.collider.id);

      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed > 0) {
        const nudgeTime = Math.min(remaining, CONTACT_EPSILON / speed);
        position = {
          x: position.x + velocity.x * nudgeTime,
          y: position.y + velocity.y * nudgeTime
        };
        remaining -= nudgeTime;
      }
    }

    if (!finiteVec(position) || !finiteVec(velocity) || !Number.isFinite(remaining)) {
      return invalidFrame();
    }
  }

  return {
    invalid: false,
    bolt: { position, velocity },
    events
  };
}
