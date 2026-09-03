import { TILE_SIZE, SONAR, HUNTER } from './config.mjs';

const VIEW_TILES = 15;
const GLOW_RADIUS_TILES = 2.1;
const DUST_COUNT = 36;

const COLORS = {
  floorNear: '#182636',
  floorRevealed: 'rgba(56, 225, 198, 0.16)',
  wallRevealed: 'rgba(56, 225, 198, 0.55)',
  crystal: '#f6c453',
  lift: '#38e1c6',
  liftInactive: '#2a6b5f',
  hunter: '#ff4d5e',
  player: '#eaf6ff',
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const renderer = {
    canvas,
    ctx,
    dpr: 1,
    width: canvas.width,
    height: canvas.height,
    scale: 1,
    prevPlayer: null,
    prevHunter: null,
    startTime: performance.now(),
  };
  resizeRenderer(renderer);
  return renderer;
}

export function resizeRenderer(renderer) {
  const { canvas } = renderer;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderer.dpr = dpr;
  renderer.width = w;
  renderer.height = h;
  renderer.scale = Math.min(w, h) / (VIEW_TILES * TILE_SIZE);
}

function worldToScreen(renderer, cameraX, cameraY, x, y) {
  return {
    x: renderer.width / 2 + (x - cameraX) * renderer.scale,
    y: renderer.height / 2 + (y - cameraY) * renderer.scale,
  };
}

function drawGlowFloor(renderer, cameraX, cameraY, cave, player) {
  const { ctx, scale } = renderer;
  const glowPx = GLOW_RADIUS_TILES * TILE_SIZE;
  const minTx = Math.max(0, Math.floor((player.x - glowPx) / TILE_SIZE));
  const maxTx = Math.min(cave.width - 1, Math.floor((player.x + glowPx) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((player.y - glowPx) / TILE_SIZE));
  const maxTy = Math.min(cave.height - 1, Math.floor((player.y + glowPx) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (cave.tiles[ty * cave.width + tx] !== 1) continue;
      const cx = (tx + 0.5) * TILE_SIZE;
      const cy = (ty + 0.5) * TILE_SIZE;
      const dist = Math.hypot(cx - player.x, cy - player.y);
      if (dist > glowPx) continue;
      const alpha = 0.5 * (1 - dist / glowPx);
      const p = worldToScreen(renderer, cameraX, cameraY, tx * TILE_SIZE, ty * TILE_SIZE);
      ctx.fillStyle = COLORS.floorNear;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x, p.y, TILE_SIZE * scale + 1, TILE_SIZE * scale + 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawRevealedTiles(renderer, cameraX, cameraY, cave, revealMap, now) {
  const { ctx, scale } = renderer;
  for (const [key, revealedAt] of revealMap) {
    if (typeof key !== 'string' || !key.includes(',')) continue;
    const age = now - revealedAt;
    if (age > SONAR.revealHoldSeconds) {
      // Prune expired tiles instead of merely skipping them: revealMap only
      // ever grows as the player explores (it's never cleared mid-run), so
      // without this the per-frame iteration cost keeps climbing over a long
      // expedition even though most entries are long past their hold time.
      revealMap.delete(key);
      continue;
    }
    const [txStr, tyStr] = key.split(',');
    const tx = Number(txStr);
    const ty = Number(tyStr);
    const alpha = Math.max(0, 1 - age / SONAR.revealHoldSeconds);
    const isWall = cave.tiles[ty * cave.width + tx] !== 1;
    const p = worldToScreen(renderer, cameraX, cameraY, tx * TILE_SIZE, ty * TILE_SIZE);
    ctx.globalAlpha = alpha * (isWall ? 1 : 0.6);
    ctx.fillStyle = isWall ? COLORS.wallRevealed : COLORS.floorRevealed;
    ctx.fillRect(p.x, p.y, TILE_SIZE * scale + 1, TILE_SIZE * scale + 1);
  }
  ctx.globalAlpha = 1;
}

function drawSonarRings(renderer, cameraX, cameraY, pulses) {
  const { ctx, scale } = renderer;
  for (const pulse of pulses) {
    const alpha = Math.max(0, 1 - pulse.age / SONAR.lifetimeSeconds);
    if (alpha <= 0) continue;
    const p = worldToScreen(renderer, cameraX, cameraY, pulse.position.x, pulse.position.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0, pulse.radius * scale), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56, 225, 198, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function isEntityVisible(revealMap, id, now) {
  const revealedAt = revealMap.get(id);
  if (revealedAt === undefined) return 0;
  const age = now - revealedAt;
  if (age > SONAR.revealHoldSeconds) return 0;
  return Math.max(0, 1 - age / SONAR.revealHoldSeconds);
}

function drawDust(renderer, cameraX, cameraY, player, elapsed) {
  const { ctx, scale } = renderer;
  const glowPx = GLOW_RADIUS_TILES * TILE_SIZE * 0.9;
  ctx.fillStyle = 'rgba(200, 220, 235, 0.35)';
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const seed = i * 12.9898;
    const angle = (Math.sin(seed) * 43758.5453) % (Math.PI * 2);
    const radiusFrac = (Math.abs(Math.sin(seed * 1.7)) + (elapsed * 0.05 + i * 0.618) % 1) % 1;
    const r = radiusFrac * glowPx;
    const wobble = Math.sin(elapsed * 0.8 + i) * 4;
    const x = player.x + Math.cos(angle) * r + wobble;
    const y = player.y + Math.sin(angle) * r + wobble;
    const p = worldToScreen(renderer, cameraX, cameraY, x, y);
    const alpha = 1 - radiusFrac;
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDangerVignette(renderer, hunter) {
  const { ctx, width, height } = renderer;
  if (hunter.awareness <= 0.05) return;
  const intensity = Math.min(1, hunter.awareness) * (hunter.state === 'hunting' ? 1 : 0.6);
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.hypot(cx, cy);
  const gradient = ctx.createRadialGradient(cx, cy, outerRadius * 0.55, cx, cy, outerRadius);
  gradient.addColorStop(0, 'rgba(255, 77, 94, 0)');
  gradient.addColorStop(1, `rgba(255, 77, 94, ${0.45 * intensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function renderFrame(renderer, run, alpha) {
  const { ctx, width, height } = renderer;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  if (!run) return;

  const prevPlayer = renderer.prevPlayer ?? run.player;
  const prevHunter = renderer.prevHunter ?? run.hunter;
  const player = {
    x: lerp(prevPlayer.x, run.player.x, alpha),
    y: lerp(prevPlayer.y, run.player.y, alpha),
  };
  const hunterPos = {
    x: lerp(prevHunter.x, run.hunter.x, alpha),
    y: lerp(prevHunter.y, run.hunter.y, alpha),
  };

  const cameraX = player.x;
  const cameraY = player.y;
  const now = run.elapsed;

  drawGlowFloor(renderer, cameraX, cameraY, run.cave, player);
  drawRevealedTiles(renderer, cameraX, cameraY, run.cave, run.revealMap, now);
  drawSonarRings(renderer, cameraX, cameraY, run.pulses);
  drawDust(renderer, cameraX, cameraY, player, now);

  const liftVisibility = Math.max(
    Math.min(1, GLOW_RADIUS_TILES * TILE_SIZE / Math.max(1, Math.hypot(run.cave.lift.x * TILE_SIZE + TILE_SIZE / 2 - player.x, run.cave.lift.y * TILE_SIZE + TILE_SIZE / 2 - player.y))),
    Math.max(isEntityVisible(run.revealMap, 'lift', now), 0),
  );
  if (liftVisibility > 0.02) {
    const p = worldToScreen(renderer, cameraX, cameraY, (run.cave.lift.x + 0.5) * TILE_SIZE, (run.cave.lift.y + 0.5) * TILE_SIZE);
    ctx.globalAlpha = Math.min(1, liftVisibility + 0.3);
    ctx.fillStyle = run.liftActive ? COLORS.lift : COLORS.liftInactive;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7 * renderer.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const crystal of run.remainingCrystals) {
    const visibility = isEntityVisible(run.revealMap, crystal.id, now);
    if (visibility <= 0.02) continue;
    const p = worldToScreen(renderer, cameraX, cameraY, (crystal.x + 0.5) * TILE_SIZE, (crystal.y + 0.5) * TILE_SIZE);
    ctx.globalAlpha = visibility;
    ctx.fillStyle = COLORS.crystal;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5 * renderer.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const hunterVisibility = isEntityVisible(run.revealMap, 'hunter', now);
  if (hunterVisibility > 0.02) {
    const jitter = 3 * (1 - hunterVisibility);
    const jx = Math.sin(now * 37) * jitter;
    const jy = Math.cos(now * 29) * jitter;
    const p = worldToScreen(renderer, cameraX, cameraY, hunterPos.x + jx, hunterPos.y + jy);
    ctx.globalAlpha = hunterVisibility;
    ctx.fillStyle = COLORS.hunter;
    ctx.beginPath();
    ctx.arc(p.x, p.y, HUNTER.radius * renderer.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const playerScreen = worldToScreen(renderer, cameraX, cameraY, player.x, player.y);
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(playerScreen.x, playerScreen.y, 6 * renderer.scale, 0, Math.PI * 2);
  ctx.fill();

  drawDangerVignette(renderer, run.hunter);

  renderer.prevPlayer = { x: run.player.x, y: run.player.y };
  renderer.prevHunter = { x: run.hunter.x, y: run.hunter.y };
}

