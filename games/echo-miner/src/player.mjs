import { PLAYER, TILE_SIZE } from './config.mjs';

function isWallTile(cave, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= cave.width || ty >= cave.height) return true;
  return cave.tiles[ty * cave.width + tx] !== 1;
}

const DIAGONAL = Math.SQRT1_2;

function circleCollides(cave, x, y, radius) {
  const points = [
    [x - radius, y],
    [x + radius, y],
    [x, y - radius],
    [x, y + radius],
    [x - radius * DIAGONAL, y - radius * DIAGONAL],
    [x + radius * DIAGONAL, y - radius * DIAGONAL],
    [x - radius * DIAGONAL, y + radius * DIAGONAL],
    [x + radius * DIAGONAL, y + radius * DIAGONAL],
  ];
  for (const [px, py] of points) {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    if (isWallTile(cave, tx, ty)) return true;
  }
  return false;
}

export function createPlayer(position) {
  return {
    x: position.x,
    y: position.y,
    radius: PLAYER.radius,
    baseSpeed: PLAYER.baseSpeed,
    stamina: PLAYER.maxStamina,
    crystals: 0,
    sprinting: false,
    facingX: 0,
    facingY: 1,
    moving: false,
  };
}

export function weightFactor(crystals) {
  return 1 - Math.min(PLAYER.maxWeightPenalty, crystals * PLAYER.weightPenaltyPerCrystal);
}

export function updatePlayer(player, input, cave, dt) {
  let moveX = input.moveX ?? 0;
  let moveY = input.moveY ?? 0;
  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude > 1) {
    moveX /= magnitude;
    moveY /= magnitude;
  }

  const sprinting = Boolean(input.sprint) && player.stamina > 0;
  const sprintFactor = sprinting ? PLAYER.sprintMultiplier : 1;
  const speed = player.baseSpeed * weightFactor(player.crystals) * sprintFactor;

  let x = player.x;
  let y = player.y;

  if (magnitude > 0) {
    const nextX = x + moveX * speed * dt;
    if (!circleCollides(cave, nextX, y, player.radius)) x = nextX;

    const nextY = y + moveY * speed * dt;
    if (!circleCollides(cave, x, nextY, player.radius)) y = nextY;
  }

  let stamina = player.stamina;
  if (sprinting) {
    stamina = Math.max(0, stamina - PLAYER.staminaDrainPerSecond * dt);
  } else {
    stamina = Math.min(PLAYER.maxStamina, stamina + PLAYER.staminaRecoverPerSecond * dt);
  }

  const moving = magnitude > 0 && (x !== player.x || y !== player.y);
  const facingX = magnitude > 0 ? moveX : player.facingX;
  const facingY = magnitude > 0 ? moveY : player.facingY;

  return { ...player, x, y, stamina, sprinting, moving, facingX, facingY };
}

export function collectCrystal(player) {
  return { ...player, crystals: player.crystals + 1 };
}

export { circleCollides };

