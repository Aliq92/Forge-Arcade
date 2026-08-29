// Orbital Bloom - attractor bodies (stars, planets, heavy cores, anchors)
import { CONSTANTS, clamp } from './config.js';
import { createGardenMetadata } from './garden.js';

let nextId = 1;

export const attractors = [];

export const TYPE_DEFAULTS = {
  star:      { mass: 9000,  baseRadius: 20, color: 'gold',   label: 'Star' },
  planet:    { mass: 2000,  baseRadius: 11, color: 'cyan',   label: 'Planet' },
  moon:      { mass: 220,   baseRadius: 6,  color: 'ivory',  label: 'Moon' },
  heavyCore: { mass: 30000, baseRadius: 15, color: 'violet', label: 'Black Hole' },
  anchor:    { mass: 6000,  baseRadius: 13, color: 'white',  label: 'Anchor', fixed: true },
};

export function massToRadius(mass, type) {
  const def = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.planet;
  const refMass = def.mass;
  const scale = Math.pow(mass / refMass, 1 / 3);
  return clamp(def.baseRadius * scale, 5, 90);
}

export function createAttractor(type, x, y, overrides = {}) {
  const def = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.planet;
  const mass = clamp(overrides.mass ?? def.mass, CONSTANTS.MIN_MASS, CONSTANTS.MAX_MASS);
  const id = Number.isFinite(overrides.id) ? overrides.id : nextId++;
  if (id >= nextId) nextId = id + 1;
  const obj = {
    id,
    name: overrides.name || `${def.label} ${id}`,
    type,
    x, y,
    vx: overrides.vx || 0,
    vy: overrides.vy || 0,
    mass,
    radius: Number.isFinite(overrides.radius) ? overrides.radius : massToRadius(mass, type),
    fixed: overrides.fixed !== undefined ? overrides.fixed : !!def.fixed,
    color: overrides.color || def.color,
    showTrail: overrides.showTrail !== undefined ? overrides.showTrail : true,
    trail: [],
    flash: 0,
    nearbyCount: 0,
    ...createGardenMetadata(type, overrides),
  };
  attractors.push(obj);
  return obj;
}

export function removeAttractor(id) {
  const i = attractors.findIndex(a => a.id === id);
  if (i >= 0) attractors.splice(i, 1);
}

export function setNextAttractorId(minimumNextId) {
  if (Number.isFinite(minimumNextId)) nextId = Math.max(nextId, Math.ceil(minimumNextId));
}

export function duplicateAttractor(id, offset = 30) {
  const src = getAttractor(id);
  if (!src) return null;
  const copy = createAttractor(src.type, src.x + offset, src.y + offset, {
    mass: src.mass, vx: src.vx, vy: src.vy, fixed: src.fixed,
    radius: src.radius, color: src.color, showTrail: src.showTrail, name: `${src.name} copy`,
    gardenStage: src.gardenStage, stageAge: src.stageAge, stableFor: src.stableFor,
    dominantStarId: src.dominantStarId, warmth: src.warmth, orbitHealth: src.orbitHealth,
    ringStrength: src.ringStrength,
    appearanceSeed: duplicateAppearanceSeed(src.appearanceSeed, nextId),
    cradled: false,
  });
  return copy;
}

function duplicateAppearanceSeed(sourceSeed, newId) {
  const seed = Number.isFinite(sourceSeed) ? sourceSeed >>> 0 : 0;
  return (Math.imul(seed, 1664525) + (newId >>> 0) + 1013904223) >>> 0;
}

export function getAttractor(id) {
  return attractors.find(a => a.id === id) || null;
}

export function clearAttractors() {
  attractors.length = 0;
}

export function setMass(a, mass) {
  a.mass = clamp(mass, CONSTANTS.MIN_MASS, CONSTANTS.MAX_MASS);
  a.radius = massToRadius(a.mass, a.type);
}

export function nearestAttractor(x, y, maxDist = Infinity) {
  let best = null, bestD = maxDist;
  for (const a of attractors) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}
