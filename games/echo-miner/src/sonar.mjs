import { SONAR, TILE_SIZE } from './config.mjs';

export function createPulse(position, now, maxRadius = SONAR.maxRadius) {
  return {
    position: { x: position.x, y: position.y },
    startTime: now,
    age: 0,
    radius: 0,
    maxRadius,
  };
}

export function updatePulses(pulses, dt) {
  const next = [];
  for (const pulse of pulses) {
    const age = pulse.age + dt;
    if (age > SONAR.lifetimeSeconds) continue;
    const radius = Math.min(pulse.maxRadius, age * SONAR.expandSpeed);
    next.push({ ...pulse, age, radius });
  }
  return next;
}

/**
 * Marks every tile and entity within the pulse's current radius as revealed
 * at `world.now` by writing into `world.revealMap` (tile key `"x,y"` or an
 * entity's `id`). Reveal is cumulative: once the expanding ring has crossed
 * a tile it stays marked until the hold duration elapses (handled by the
 * renderer), so calling this once per simulation step naturally reveals
 * exactly the geometry the ring has touched, then lets it fade.
 */
export function applyPulseReveal(pulse, world) {
  const { cave, revealMap, now, entities = [] } = world;
  const radius = pulse.radius;
  if (radius <= 0) return revealMap;

  const minTx = Math.max(0, Math.floor((pulse.position.x - radius) / TILE_SIZE));
  const maxTx = Math.min(cave.width - 1, Math.floor((pulse.position.x + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((pulse.position.y - radius) / TILE_SIZE));
  const maxTy = Math.min(cave.height - 1, Math.floor((pulse.position.y + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      const cx = (tx + 0.5) * TILE_SIZE;
      const cy = (ty + 0.5) * TILE_SIZE;
      const dist = Math.hypot(cx - pulse.position.x, cy - pulse.position.y);
      if (dist <= radius) revealMap.set(`${tx},${ty}`, now);
    }
  }

  for (const entity of entities) {
    const dist = Math.hypot(entity.x - pulse.position.x, entity.y - pulse.position.y);
    if (dist <= radius) revealMap.set(entity.id, now);
  }

  return revealMap;
}

