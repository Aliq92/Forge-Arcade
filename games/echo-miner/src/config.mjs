export const STEP_SECONDS = 1 / 60;
export const MAX_FRAME_SECONDS = 0.25;

export const TILE_SIZE = 32;

export const PLAYER = {
  baseSpeed: 3.6 * TILE_SIZE,
  radius: TILE_SIZE * 0.32,
  sprintMultiplier: 1.65,
  maxStamina: 3.2,
  staminaDrainPerSecond: 1,
  staminaRecoverPerSecond: 0.6,
  minSprintStamina: 0.15,
  weightPenaltyPerCrystal: 0.025,
  maxWeightPenalty: 0.18,
};

export const SONAR = {
  lifetimeSeconds: 1.4,
  expandSpeed: 9 * TILE_SIZE,
  maxRadius: 8 * TILE_SIZE,
  ringThickness: TILE_SIZE * 1.1,
  revealHoldSeconds: 6,
};

export const SOUND = {
  strengths: { sonar: 1, sprint: 0.22, crystal: 0.55 },
  maxRange: { sonar: 22 * TILE_SIZE, sprint: 9 * TILE_SIZE, crystal: 12 * TILE_SIZE },
  lifetimeSeconds: 4,
  repetitionRadius: 6 * TILE_SIZE,
  repetitionWindowSeconds: 4,
  repetitionBonus: 0.35,
  repetitionBonusCap: 0.9,
};

export const HUNTER = {
  radius: TILE_SIZE * 0.36,
  investigatingThreshold: 0.2,
  suspiciousThreshold: 0.46,
  huntingThreshold: 0.72,
  awarenessDecayPerSecond: 0.18,
  losContactGraceSeconds: 2.5,
  sightRange: 10 * TILE_SIZE,
  dormantWanderSpeed: 0.9 * TILE_SIZE,
  investigatingSpeed: 1.4 * TILE_SIZE,
  suspiciousSpeed: 1.9 * TILE_SIZE,
};

export const DIFFICULTIES = {
  survey: {
    label: 'Survey',
    width: 92,
    height: 92,
    quota: 8,
    totalCrystals: 10,
    hunterSpeedTiles: 1.7,
    hunterAwarenessGain: 0.5,
    sonarCooldownSeconds: 2,
    sonarMaxRadius: 9 * TILE_SIZE,
  },
  descent: {
    label: 'Descent',
    width: 120,
    height: 120,
    quota: 11,
    totalCrystals: 14,
    hunterSpeedTiles: 2.3,
    hunterAwarenessGain: 0.7,
    sonarCooldownSeconds: 2.4,
    sonarMaxRadius: 8 * TILE_SIZE,
  },
  abyss: {
    label: 'Abyss',
    width: 130,
    height: 130,
    quota: 12,
    totalCrystals: 16,
    hunterSpeedTiles: 2.9,
    hunterAwarenessGain: 0.95,
    sonarCooldownSeconds: 2.8,
    sonarMaxRadius: 7 * TILE_SIZE,
  },
};

export const MIN_LIFT_SPAWN_DISTANCE = 20;

export const CRYSTAL_PICKUP_RADIUS = TILE_SIZE * 0.6;
export const LIFT_INTERACT_RADIUS = TILE_SIZE * 0.6;
export const HUNTER_CONTACT_RADIUS = PLAYER.radius + HUNTER.radius;
export const SPRINT_SOUND_INTERVAL_SECONDS = 0.35;

export const STORAGE_KEY = 'echoMiner.v1';

