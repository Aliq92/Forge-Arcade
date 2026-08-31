import { HUNTER, TILE_SIZE } from './config.mjs';
import { scoreSound, scoreSoundEvents } from './sound-events.mjs';

export const HUNTER_STATES = Object.freeze({
  DORMANT: 'dormant',
  INVESTIGATING: 'investigating',
  SUSPICIOUS: 'suspicious',
  HUNTING: 'hunting',
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function tileOf(position) {
  return { x: Math.floor(position.x / TILE_SIZE), y: Math.floor(position.y / TILE_SIZE) };
}

function moveToward(x, y, targetX, targetY, speed, dt) {
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return { x, y };
  const step = Math.min(dist, speed * dt);
  return { x: x + (dx / dist) * step, y: y + (dy / dist) * step };
}

function isPathStillValid(cave, path) {
  return path.every((wp) => {
    if (wp.x < 0 || wp.y < 0 || wp.x >= cave.width || wp.y >= cave.height) return false;
    return cave.tiles[wp.y * cave.width + wp.x] === 1;
  });
}

/** Grid-based ray traversal: true when nothing solid lies between the two points. */
export function hasLineOfSight(cave, from, to, maxRange = Infinity) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if (dist > maxRange) return false;
  const steps = Math.max(1, Math.ceil(dist / (TILE_SIZE / 4)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = from.x + (to.x - from.x) * t;
    const py = from.y + (to.y - from.y) * t;
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= cave.width || ty >= cave.height) return false;
    if (cave.tiles[ty * cave.width + tx] !== 1) return false;
  }
  return true;
}

export function createHunter(position) {
  return {
    x: position.x,
    y: position.y,
    radius: HUNTER.radius,
    state: HUNTER_STATES.DORMANT,
    awareness: 0,
    target: null,
    path: [],
    pathGoalKey: null,
    lastContactAt: -Infinity,
  };
}

/** Picks the loudest currently-audible sound event, not merely the newest one. */
export function chooseSoundTarget(hunter, events, now) {
  const listener = { position: { x: hunter.x, y: hunter.y } };
  let best = null;
  let bestScore = 0;
  for (const event of events) {
    const score = scoreSound(event, listener, now);
    if (score > bestScore) {
      bestScore = score;
      best = event;
    }
  }
  return best ? { x: best.position.x, y: best.position.y, score: bestScore } : null;
}

export function updateHunter(hunter, context, dt) {
  const { cave, player, soundEvents, now, difficulty, findPath } = context;
  const listener = { position: { x: hunter.x, y: hunter.y } };

  const rawContribution = clamp(scoreSoundEvents(soundEvents, listener, now) * difficulty.hunterAwarenessGain, 0, 1);
  const awareness = clamp(Math.max(rawContribution, hunter.awareness - HUNTER.awarenessDecayPerSecond * dt), 0, 1);

  const los = hasLineOfSight(cave, { x: hunter.x, y: hunter.y }, { x: player.x, y: player.y }, HUNTER.sightRange);
  const hasStrongAwareness = awareness >= HUNTER.huntingThreshold;
  const lastContactAt = los || hasStrongAwareness ? now : hunter.lastContactAt;

  let state = hunter.state;
  if (state === HUNTER_STATES.DORMANT) {
    if (awareness >= HUNTER.investigatingThreshold) state = HUNTER_STATES.INVESTIGATING;
  } else if (state === HUNTER_STATES.INVESTIGATING) {
    if (awareness >= HUNTER.suspiciousThreshold) state = HUNTER_STATES.SUSPICIOUS;
    else if (awareness < HUNTER.investigatingThreshold) state = HUNTER_STATES.DORMANT;
  } else if (state === HUNTER_STATES.SUSPICIOUS) {
    if (awareness >= HUNTER.huntingThreshold || los) state = HUNTER_STATES.HUNTING;
    else if (awareness < HUNTER.investigatingThreshold) state = HUNTER_STATES.DORMANT;
    else if (awareness < HUNTER.suspiciousThreshold) state = HUNTER_STATES.INVESTIGATING;
  } else if (state === HUNTER_STATES.HUNTING) {
    const graceExpired = now - lastContactAt > HUNTER.losContactGraceSeconds;
    if (graceExpired && awareness < HUNTER.huntingThreshold) state = HUNTER_STATES.SUSPICIOUS;
  }

  let target = hunter.target;
  if (state === HUNTER_STATES.HUNTING) {
    target = { x: player.x, y: player.y };
  } else if (state === HUNTER_STATES.INVESTIGATING || state === HUNTER_STATES.SUSPICIOUS) {
    const chosen = chooseSoundTarget(hunter, soundEvents, now);
    if (chosen) target = { x: chosen.x, y: chosen.y };
  }

  let speed = HUNTER.dormantWanderSpeed;
  if (state === HUNTER_STATES.INVESTIGATING) speed = HUNTER.investigatingSpeed;
  else if (state === HUNTER_STATES.SUSPICIOUS) speed = HUNTER.suspiciousSpeed;
  else if (state === HUNTER_STATES.HUNTING) speed = difficulty.hunterSpeedTiles * TILE_SIZE;

  const currentTile = tileOf({ x: hunter.x, y: hunter.y });
  let path = hunter.path;
  let pathGoalKey = hunter.pathGoalKey;

  if (target) {
    const targetTile = tileOf(target);
    const targetKey = `${targetTile.x},${targetTile.y}`;
    const needsRecalc = targetKey !== pathGoalKey || path.length === 0 || !isPathStillValid(cave, path);
    if (needsRecalc) {
      path = findPath(cave, currentTile, targetTile);
      pathGoalKey = targetKey;
    }
  } else {
    path = [];
    pathGoalKey = null;
  }

  let remainingPath = path;
  while (remainingPath.length > 0 && remainingPath[0].x === currentTile.x && remainingPath[0].y === currentTile.y) {
    remainingPath = remainingPath.slice(1);
  }

  let x = hunter.x;
  let y = hunter.y;
  if (remainingPath.length > 0) {
    const waypoint = remainingPath[0];
    const wx = (waypoint.x + 0.5) * TILE_SIZE;
    const wy = (waypoint.y + 0.5) * TILE_SIZE;
    const moved = moveToward(x, y, wx, wy, speed, dt);
    x = moved.x;
    y = moved.y;
    if (Math.hypot(wx - x, wy - y) < 2) remainingPath = remainingPath.slice(1);
  }

  return {
    ...hunter,
    x,
    y,
    state,
    awareness,
    target,
    path: remainingPath,
    pathGoalKey,
    lastContactAt,
  };
}

