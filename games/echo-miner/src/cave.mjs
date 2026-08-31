import { createRng } from './random.mjs';
import { floodReachable } from './pathfinding.mjs';
import { DIFFICULTIES, MIN_LIFT_SPAWN_DISTANCE } from './config.mjs';

const MAX_GENERATION_ATTEMPTS = 40;
const MIN_CRYSTAL_SPACING = 4;
const MIN_CRYSTAL_DISTANCE_FROM_LIFT = 5;
const MIN_CRYSTAL_DISTANCE_FROM_HUNTER = 12;

function index(width, x, y) {
  return y * width + x;
}

function carveRect(tiles, width, x, y, w, h) {
  for (let ty = y; ty < y + h; ty += 1) {
    for (let tx = x; tx < x + w; tx += 1) {
      tiles[index(width, tx, ty)] = 1;
    }
  }
}

function roomsOverlap(a, b, padding) {
  return (
    a.x - padding < b.x + b.w &&
    a.x + a.w + padding > b.x &&
    a.y - padding < b.y + b.h &&
    a.y + a.h + padding > b.y
  );
}

function placeRooms(width, height, rng) {
  const targetRooms = Math.min(22, Math.max(9, Math.round((width * height) / 150)));
  const rooms = [];
  const maxAttempts = targetRooms * 12;

  for (let attempt = 0; attempt < maxAttempts && rooms.length < targetRooms; attempt += 1) {
    const w = rng.intInclusive(4, 8);
    const h = rng.intInclusive(4, 8);
    const x = rng.intInclusive(1, width - w - 2);
    const y = rng.intInclusive(1, height - h - 2);
    const room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    if (rooms.some((other) => roomsOverlap(room, other, 1))) continue;
    rooms.push(room);
  }

  return rooms;
}

function carveCorridor(tiles, width, height, from, to, rng) {
  let { cx, cy } = { cx: from.cx, cy: from.cy };
  const targetX = to.cx;
  const targetY = to.cy;
  const horizontalFirst = rng.chance(0.5);

  const carvePoint = (x, y) => {
    if (x >= 0 && y >= 0 && x < width && y < height) tiles[index(width, x, y)] = 1;
  };

  if (horizontalFirst) {
    while (cx !== targetX) {
      carvePoint(cx, cy);
      cx += cx < targetX ? 1 : -1;
    }
    while (cy !== targetY) {
      carvePoint(cx, cy);
      cy += cy < targetY ? 1 : -1;
    }
  } else {
    while (cy !== targetY) {
      carvePoint(cx, cy);
      cy += cy < targetY ? 1 : -1;
    }
    while (cx !== targetX) {
      carvePoint(cx, cy);
      cx += cx < targetX ? 1 : -1;
    }
  }
  carvePoint(targetX, targetY);
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function chooseHunterSpawn(distances, width, lift, rng) {
  const candidates = [];
  let farthest = { dist: -1, x: lift.x, y: lift.y };

  for (const [idx, dist] of distances) {
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (dist > farthest.dist) farthest = { dist, x, y };
    if (dist >= MIN_LIFT_SPAWN_DISTANCE) candidates.push({ x, y, dist });
  }

  if (candidates.length === 0) return { x: farthest.x, y: farthest.y };
  const picked = rng.pick(candidates);
  return { x: picked.x, y: picked.y };
}

function chooseCrystals(distances, width, lift, hunterSpawn, count, rng) {
  const floorCells = [];
  for (const [idx, dist] of distances) {
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (dist < MIN_CRYSTAL_DISTANCE_FROM_LIFT) continue;
    floorCells.push({ x, y });
  }

  const shuffled = rng.shuffle(floorCells);
  const chosen = [];

  for (const cell of shuffled) {
    if (chosen.length >= count) break;
    if (manhattan(cell.x, cell.y, hunterSpawn.x, hunterSpawn.y) < MIN_CRYSTAL_DISTANCE_FROM_HUNTER) continue;
    const tooClose = chosen.some((c) => manhattan(c.x, c.y, cell.x, cell.y) < MIN_CRYSTAL_SPACING);
    if (tooClose) continue;
    chosen.push(cell);
  }

  // Relax spacing if the cave was too tight to reach the target count.
  if (chosen.length < count) {
    for (const cell of shuffled) {
      if (chosen.length >= count) break;
      if (chosen.some((c) => c.x === cell.x && c.y === cell.y)) continue;
      if (cell.x === hunterSpawn.x && cell.y === hunterSpawn.y) continue;
      chosen.push(cell);
    }
  }

  return chosen.slice(0, count);
}

function attemptGeneration(width, height, difficulty, rng) {
  const tiles = new Uint8Array(width * height);
  const rooms = placeRooms(width, height, rng);
  if (rooms.length < 6) return null;

  for (const room of rooms) carveRect(tiles, width, room.x, room.y, room.w, room.h);

  for (let i = 1; i < rooms.length; i += 1) {
    carveCorridor(tiles, width, height, rooms[i - 1], rooms[i], rng);
    if (i >= 2 && rng.chance(0.35)) {
      carveCorridor(tiles, width, height, rooms[i - 2], rooms[i], rng);
    }
  }

  const grid = { width, height, tiles };
  const lift = { x: rooms[0].cx, y: rooms[0].cy };
  const distances = floodReachable(grid, lift);

  const hunterSpawn = chooseHunterSpawn(distances, width, lift, rng);
  const crystals = chooseCrystals(distances, width, lift, hunterSpawn, difficulty.totalCrystals, rng);

  if (crystals.length < difficulty.totalCrystals) return null;

  return { width, height, tiles, lift, crystals, hunterSpawn };
}

export function generateCave({ seed, difficulty }) {
  const preset = DIFFICULTIES[difficulty];
  if (!preset) throw new Error(`Unknown difficulty: ${difficulty}`);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = createRng(`${seed}:${difficulty}:${attempt}`);
    const result = attemptGeneration(preset.width, preset.height, preset, rng);
    if (!result) continue;

    const cave = { ...result, seed };
    const report = validateCave(cave);
    if (report.valid) return cave;
  }

  throw new Error(`Failed to generate a valid ${difficulty} cave for seed ${seed}`);
}

export function validateCave(cave) {
  const errors = [];
  const { width, height, tiles, lift, crystals, hunterSpawn } = cave;
  const grid = { width, height, tiles };

  if (tiles.length !== width * height) {
    errors.push('tiles length does not match width*height');
    return { valid: false, errors };
  }

  if (tiles[index(width, lift.x, lift.y)] !== 1) {
    errors.push('lift is not on a floor tile');
    return { valid: false, errors };
  }

  const distances = floodReachable(grid, lift);

  if (!distances.has(index(width, hunterSpawn.x, hunterSpawn.y))) {
    errors.push('hunter spawn is not reachable from the lift');
  } else {
    const dist = distances.get(index(width, hunterSpawn.x, hunterSpawn.y));
    if (dist < MIN_LIFT_SPAWN_DISTANCE) {
      errors.push(`hunter spawn is only ${dist} cells from the lift (minimum ${MIN_LIFT_SPAWN_DISTANCE})`);
    }
  }

  for (const crystal of crystals) {
    if (!distances.has(index(width, crystal.x, crystal.y))) {
      errors.push(`crystal at (${crystal.x},${crystal.y}) is not reachable from the lift`);
    }
  }

  return { valid: errors.length === 0, errors };
}

