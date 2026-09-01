import { CONFIG } from './config.js';
import { advanceBolt } from './physics.js';

const MAX_GENERATION_ATTEMPTS = 20;
const AIM_MIN_DEGREES = -75;
const AIM_MAX_DEGREES = 75;
const AIM_STEP_DEGREES = 1.5;
const BOLT_SPEED = 780;
const VALIDATION_STEP = 1 / 30;
const VALIDATION_FRAMES = 240;

const ARENA_WALLS = Object.freeze([
  Object.freeze({ id: 'wall-top', type: 'wall', x: 0, y: 72, w: 390, h: 16 }),
  Object.freeze({ id: 'wall-right', type: 'wall', x: 374, y: 72, w: 16, h: 756 }),
  Object.freeze({ id: 'wall-bottom', type: 'wall', x: 0, y: 812, w: 390, h: 16 }),
  Object.freeze({ id: 'wall-left', type: 'wall', x: 0, y: 72, w: 16, h: 756 })
]);

function routePoint(spawn, angle, distance) {
  const radians = angle * Math.PI / 180;
  return {
    x: spawn.x + Math.sin(radians) * distance,
    y: spawn.y - Math.cos(radians) * distance
  };
}

function defineTemplate({ id, minDifficulty, angle, tags, accentWalls = [] }) {
  const spawn = { x: CONFIG.logicalWidth / 2, y: 770 };
  const nodeDistances = [145, 265, 385, 510];
  const nodeZones = nodeDistances.map((distance, index) => {
    const center = routePoint(spawn, angle, distance);
    return {
      id: `${id}-node-zone-${index + 1}`,
      kind: 'node',
      x: center.x - 24,
      y: center.y - 24,
      w: 48,
      h: 48,
      minDistance: distance - 12,
      maxDistance: distance + 12
    };
  });
  const hazardX = angle <= 0 ? 286 : 36;
  const hazardZones = [
    { id: `${id}-hazard-zone-1`, kind: 'hazard', x: hazardX, y: 245, w: 58, h: 86 },
    { id: `${id}-hazard-zone-2`, kind: 'hazard', x: hazardX, y: 470, w: 58, h: 86 }
  ];

  return Object.freeze({
    id,
    minDifficulty,
    angle,
    tags: Object.freeze([...tags]),
    spawn: Object.freeze(spawn),
    walls: Object.freeze(accentWalls.map((wall) => Object.freeze({ ...wall, type: 'wall' }))),
    placementZones: Object.freeze([...nodeZones, ...hazardZones].map(Object.freeze))
  });
}

const TEMPLATES = Object.freeze([
  defineTemplate({
    id: 'central-spine',
    minDifficulty: 1,
    angle: 0,
    tags: ['open', 'intro'],
    accentWalls: [{ id: 'central-spine-accent', x: 40, y: 205, w: 72, h: 12 }]
  }),
  defineTemplate({
    id: 'left-slice',
    minDifficulty: 1,
    angle: -15,
    tags: ['angled', 'open'],
    accentWalls: [{ id: 'left-slice-accent', x: 278, y: 360, w: 70, h: 12 }]
  }),
  defineTemplate({
    id: 'right-slice',
    minDifficulty: 2,
    angle: 15,
    tags: ['angled', 'shards'],
    accentWalls: [{ id: 'right-slice-accent', x: 42, y: 360, w: 70, h: 12 }]
  }),
  defineTemplate({
    id: 'left-thread',
    minDifficulty: 3,
    angle: -7.5,
    tags: ['tight', 'shield'],
    accentWalls: [{ id: 'left-thread-accent', x: 292, y: 182, w: 12, h: 92 }]
  }),
  defineTemplate({
    id: 'right-thread',
    minDifficulty: 4,
    angle: 7.5,
    tags: ['tight', 'laser'],
    accentWalls: [{ id: 'right-thread-accent', x: 86, y: 182, w: 12, h: 92 }]
  }),
  defineTemplate({
    id: 'vault-gauntlet',
    minDifficulty: 5,
    angle: 0,
    tags: ['ordered', 'moving'],
    accentWalls: [
      { id: 'vault-gauntlet-left', x: 48, y: 310, w: 76, h: 12 },
      { id: 'vault-gauntlet-right', x: 266, y: 310, w: 76, h: 12 }
    ]
  })
]);

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

function safeWalls() {
  return ARENA_WALLS.map((wall) => ({ ...wall }));
}

export const SAFE_CHAMBER = Object.freeze({
  seed: 0,
  difficulty: 1,
  templateId: 'safe-chamber',
  difficultyTags: Object.freeze(['safe', 'open']),
  suggestedAngle: 0,
  ordered: false,
  spawn: Object.freeze({ x: 195, y: 770 }),
  walls: Object.freeze(safeWalls().map(Object.freeze)),
  placementZones: Object.freeze([
    Object.freeze({ id: 'safe-zone-1', kind: 'node', x: 171, y: 560, w: 48, h: 48 }),
    Object.freeze({ id: 'safe-zone-2', kind: 'node', x: 171, y: 360, w: 48, h: 48 })
  ]),
  nodes: Object.freeze([
    Object.freeze({ id: 'safe-node-1', type: 'target', required: true, order: 1, x: 184, y: 573, w: 22, h: 22 }),
    Object.freeze({ id: 'safe-node-2', type: 'target', required: true, order: 2, x: 184, y: 373, w: 22, h: 22 })
  ]),
  shards: Object.freeze([]),
  shields: Object.freeze([]),
  lasers: Object.freeze([]),
  barriers: Object.freeze([])
});

function randomInRange(random, min, max) {
  return min + (max - min) * random();
}

function centeredCollider(id, type, center, size, extra = {}) {
  return {
    id,
    type,
    x: center.x - size.w / 2,
    y: center.y - size.h / 2,
    w: size.w,
    h: size.h,
    ...extra
  };
}

function placeInZone(random, zone, size) {
  return {
    x: randomInRange(random, zone.x + size.w / 2, zone.x + zone.w - size.w / 2),
    y: randomInRange(random, zone.y + size.h / 2, zone.y + zone.h - size.h / 2)
  };
}

function buildCandidate(seed, difficulty, attempt) {
  const candidateSeed = (seed + Math.imul(attempt + 1, 0x9E3779B1)) >>> 0;
  const random = mulberry32(candidateSeed);
  const eligible = TEMPLATES.filter((template) => template.minDifficulty <= difficulty);
  const template = eligible[Math.floor(random() * eligible.length)];
  const nodeZones = template.placementZones.filter((zone) => zone.kind === 'node');
  const hazardZones = template.placementZones.filter((zone) => zone.kind === 'hazard');
  const nodeCount = difficulty >= 4 ? 3 : 2;
  const nodeSize = Math.max(18, 25 - difficulty);
  const nodes = nodeZones.slice(0, nodeCount).map((zone, index) => {
    const distance = randomInRange(random, zone.minDistance, zone.maxDistance);
    const center = routePoint(template.spawn, template.angle, distance);
    return centeredCollider(`node-${index + 1}`, 'target', center, { w: nodeSize, h: nodeSize }, {
      required: true,
      order: index + 1
    });
  });

  const shardDistance = randomInRange(random, 185, 335);
  const shardCenter = routePoint(template.spawn, template.angle, shardDistance);
  const shards = [centeredCollider('shard-1', 'shard', shardCenter, { w: 13, h: 13 })];
  if (difficulty >= 3) {
    const extraZone = hazardZones[1];
    shards.push(centeredCollider(
      'shard-2',
      'shard',
      placeInZone(random, extraZone, { w: 13, h: 13 }),
      { w: 13, h: 13 }
    ));
  }

  const shields = difficulty >= 3
    ? [centeredCollider(
      'shield-1',
      'shield',
      placeInZone(random, hazardZones[0], { w: 42, h: 8 }),
      { w: 42, h: 8 }
    )]
    : [];
  const lasers = difficulty >= 4
    ? [centeredCollider(
      'laser-1',
      'laser',
      placeInZone(random, hazardZones[1], { w: 8, h: 52 }),
      { w: 8, h: 52 },
      { active: true }
    )]
    : [];
  const barriers = difficulty >= 5
    ? [centeredCollider(
      'barrier-1',
      'barrier',
      placeInZone(random, hazardZones[0], { w: 38, h: 10 }),
      { w: 38, h: 10 },
      {
        axis: 'y',
        travel: 26,
        speed: 34 + difficulty * 2,
        phase: random()
      }
    )]
    : [];

  return {
    seed,
    difficulty,
    templateId: template.id,
    difficultyTags: [...template.tags],
    suggestedAngle: template.angle,
    ordered: template.tags.includes('ordered'),
    spawn: { ...template.spawn },
    walls: [...safeWalls(), ...template.walls.map((wall) => ({ ...wall }))],
    placementZones: template.placementZones.map((zone) => ({ ...zone })),
    nodes,
    shards,
    shields,
    lasers,
    barriers
  };
}

function finitePoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function finiteCollider(collider) {
  return collider
    && typeof collider.id === 'string'
    && [collider.x, collider.y, collider.w, collider.h].every(Number.isFinite)
    && collider.w >= 0
    && collider.h >= 0;
}

function hasCapability(capabilities, id) {
  if (Array.isArray(capabilities)) return capabilities.includes(id);
  if (capabilities instanceof Set) return capabilities.has(id);
  if (capabilities && typeof capabilities === 'object') {
    return capabilities[id] === true
      || Array.isArray(capabilities.owned) && capabilities.owned.includes(id);
  }
  return false;
}

function barrierEnvelope(barrier) {
  const travel = Number.isFinite(barrier.travel) ? Math.abs(barrier.travel) : 0;
  if (barrier.axis === 'x') {
    return {
      ...barrier,
      type: 'barrier',
      x: barrier.x - travel,
      w: barrier.w + travel * 2
    };
  }
  if (barrier.axis === 'y') {
    return {
      ...barrier,
      type: 'barrier',
      y: barrier.y - travel,
      h: barrier.h + travel * 2
    };
  }
  return { ...barrier, type: 'barrier' };
}

function validationColliders(chamber) {
  return [
    ...chamber.walls.map((wall) => ({ ...wall, type: 'wall' })),
    ...chamber.nodes.map((node) => ({ ...node, type: 'target' })),
    ...chamber.shards.map((shard) => ({ ...shard, type: 'shard' })),
    ...chamber.shields.map((shield) => ({ ...shield, type: 'shield' })),
    ...chamber.lasers.filter((laser) => laser.active !== false).map((laser) => ({ ...laser, type: 'laser' })),
    ...chamber.barriers.map(barrierEnvelope)
  ];
}

function completesAtAngle(chamber, capabilities, angle) {
  const colliders = validationColliders(chamber);
  const requiredIds = new Set(chamber.nodes.filter((node) => node.required !== false).map((node) => node.id));
  const orderedIds = chamber.nodes
    .filter((node) => node.required !== false)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((node) => node.id);
  const hitIds = new Set();
  const piercedShieldIds = new Set();
  const allowedShieldPierces = hasCapability(capabilities, 'pierce') ? 1 : 0;
  let expectedIndex = 0;
  const radians = angle * Math.PI / 180;
  let bolt = {
    position: { ...chamber.spawn },
    velocity: {
      x: Math.sin(radians) * BOLT_SPEED,
      y: -Math.cos(radians) * BOLT_SPEED
    }
  };

  for (let frameIndex = 0; frameIndex < VALIDATION_FRAMES; frameIndex += 1) {
    const frame = advanceBolt(bolt, colliders, VALIDATION_STEP);
    if (frame.invalid) return false;

    for (const event of frame.events) {
      if (event.type === 'laser' || event.type === 'barrier') return false;
      if (event.type === 'shield') {
        piercedShieldIds.add(event.id);
        if (piercedShieldIds.size > allowedShieldPierces) return false;
        continue;
      }
      if (event.type !== 'target' || hitIds.has(event.id)) continue;
      if (chamber.ordered && event.id !== orderedIds[expectedIndex]) return false;
      hitIds.add(event.id);
      expectedIndex += 1;
      if ([...requiredIds].every((id) => hitIds.has(id))) return true;
    }

    bolt = frame.bolt;
  }

  return false;
}

export function validateChamber(chamber, capabilities = []) {
  if (!chamber || typeof chamber !== 'object' || !finitePoint(chamber.spawn)) return false;
  const collections = ['walls', 'nodes', 'shards', 'shields', 'lasers', 'barriers'];
  if (!collections.every((key) => Array.isArray(chamber[key]))) return false;
  const hasRequiredNode = chamber.nodes.some((node) => node.required !== false);
  if (!hasRequiredNode || !collections.every((key) => chamber[key].every(finiteCollider))) {
    return false;
  }

  const angleCount = Math.round((AIM_MAX_DEGREES - AIM_MIN_DEGREES) / AIM_STEP_DEGREES);
  for (let index = 0; index <= angleCount; index += 1) {
    const angle = AIM_MIN_DEGREES + index * AIM_STEP_DEGREES;
    if (completesAtAngle(chamber, capabilities, angle)) return true;
  }
  return false;
}

export function generateChamber(seed, difficulty, capabilities = []) {
  if (!Number.isFinite(seed) || !Number.isFinite(difficulty)) return clone(SAFE_CHAMBER);
  const normalizedSeed = Math.trunc(seed) >>> 0;
  const normalizedDifficulty = Math.min(6, Math.max(1, Math.trunc(difficulty)));

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = buildCandidate(normalizedSeed, normalizedDifficulty, attempt);
    if (validateChamber(candidate, capabilities)) return candidate;
  }

  return clone(SAFE_CHAMBER);
}
