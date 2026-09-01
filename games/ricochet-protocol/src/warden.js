const FULL_TURN = Math.PI * 2;
const MAX_HP = 12;
const OPEN_WINDOW_DURATION = 0.5;
const OPEN_WINDOW_PERIOD = 1;
const LASER_WARNING_DURATION = 1;
const LASER_SWEEP_DURATION = 0.5;
const LASER_COOLDOWN_DURATION = 0.5;
const LASER_CYCLE_DURATION = LASER_WARNING_DURATION
  + LASER_SWEEP_DURATION
  + LASER_COOLDOWN_DURATION;

function finiteAtLeast(value, minimum, fallback) {
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

function phaseFor(hp) {
  if (hp <= 4) return 3;
  if (hp <= 8) return 2;
  return 1;
}

function rotationSpeed(phase) {
  return phase === 3 ? 2 : phase === 2 ? 1.2 : 0.75;
}

function isWeakPointOpen(clock) {
  return clock % OPEN_WINDOW_PERIOD < OPEN_WINDOW_DURATION;
}

function impactIdFor(event) {
  return typeof event?.id === 'string' && event.id.length > 0 ? event.id : null;
}

function collectDamage(events, acceptedHitIds, weakPointOpen) {
  if (!weakPointOpen || !Array.isArray(events)) return 0;

  let damage = 0;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const hitId = impactIdFor(event);
    if (event?.type !== 'weak-point' || !hitId || acceptedHitIds.has(hitId)) continue;
    if (!Number.isFinite(event.damage) || event.damage <= 0) continue;

    acceptedHitIds.add(hitId);
    damage += event.damage;
  }
  return damage;
}

function laserDescriptor(phase, laserClock) {
  if (phase === 1) return [];

  const cycleIndex = Math.floor(laserClock / LASER_CYCLE_DURATION);
  const cycleTime = laserClock - cycleIndex * LASER_CYCLE_DURATION;
  if (cycleTime >= LASER_WARNING_DURATION + LASER_SWEEP_DURATION) return [];

  const orientation = phase === 2 ? 'horizontal' : 'diagonal';
  const direction = phase === 2
    ? 'left-to-right'
    : cycleIndex % 2 === 0
      ? 'top-left-to-bottom-right'
      : 'top-right-to-bottom-left';
  const sweepId = `warden-laser-phase-${phase}-cycle-${cycleIndex}`;
  const warning = cycleTime < LASER_WARNING_DURATION;

  return [{
    type: warning ? 'laser-warning' : 'laser',
    id: sweepId,
    cycleId: sweepId,
    sweepId,
    orientation,
    direction,
    progress: warning
      ? cycleTime / LASER_WARNING_DURATION
      : (cycleTime - LASER_WARNING_DURATION) / LASER_SWEEP_DURATION
  }];
}

function shieldsFor(angle) {
  return [0, Math.PI].map((offset, index) => ({
    id: `warden-shield-${index + 1}`,
    angle: (angle + offset) % FULL_TURN,
    radius: 28,
    orbitRadius: 72
  }));
}

function weakPointsFor(phase, weakPointOpen, angle) {
  const count = phase === 3 ? 2 : 1;
  const radius = phase === 3 ? 12 : 18;

  return Array.from({ length: count }, (_, index) => ({
    id: `warden-weak-point-${index + 1}`,
    open: weakPointOpen,
    radius,
    angle: (angle + index * Math.PI) % FULL_TURN
  }));
}

export function createWarden() {
  return {
    hp: MAX_HP,
    maxHp: MAX_HP,
    phase: 1,
    angle: 0,
    weakPointOpen: true,
    weakPointClock: 0,
    laserClock: 0,
    hitIds: [],
    defeated: false,
    victoryEmitted: false
  };
}

export function updateWarden(state, events, dt) {
  const previous = state && typeof state === 'object' ? state : createWarden();
  const maxHp = finiteAtLeast(previous.maxHp, 1, MAX_HP);
  const hp = Math.min(maxHp, finiteAtLeast(previous.hp, 0, maxHp));
  const elapsed = finiteAtLeast(dt, 0, 0);
  const acceptedHitIds = new Set(Array.isArray(previous.hitIds) ? previous.hitIds : []);
  const isDefeated = previous.defeated === true || hp === 0;
  const damage = isDefeated ? 0 : collectDamage(events, acceptedHitIds, previous.weakPointOpen !== false);
  const nextHp = Math.max(0, hp - damage);
  const previousPhase = phaseFor(hp);
  const phase = phaseFor(nextHp);
  const angle = (finiteAtLeast(previous.angle, 0, 0) + rotationSpeed(phase) * elapsed) % FULL_TURN;
  const weakPointClock = finiteAtLeast(previous.weakPointClock, 0,
    previous.weakPointOpen === false ? OPEN_WINDOW_DURATION : 0) + elapsed;
  const laserClock = finiteAtLeast(previous.laserClock, 0, 0);
  const nextLaserClock = phase === previousPhase ? laserClock + elapsed : 0;
  const defeated = nextHp === 0;
  const victory = defeated && previous.victoryEmitted !== true;

  const nextState = {
    ...previous,
    hp: nextHp,
    maxHp,
    phase,
    angle,
    weakPointOpen: isWeakPointOpen(weakPointClock),
    weakPointClock,
    laserClock: nextLaserClock,
    hitIds: [...acceptedHitIds],
    defeated,
    victoryEmitted: previous.victoryEmitted === true || victory
  };

  return {
    state: nextState,
    shields: defeated ? [] : shieldsFor(angle),
    weakPoints: defeated ? [] : weakPointsFor(phase, nextState.weakPointOpen, angle),
    lasers: defeated ? [] : laserDescriptor(phase, nextLaserClock),
    victory
  };
}
