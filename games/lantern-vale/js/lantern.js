// The lantern: the game's central resource, light source and protection.
import { LANTERN_MODES } from './config.js';
import { clamp } from './utils.js';

const LOW_ENERGY_FRACTION = 0.22;
const CRITICAL_ENERGY_FRACTION = 0.08;

export class Lantern {
  constructor() {
    this.maxEnergy = 100;
    this.energy = 100;
    this.baseRadius = 150;
    this.drainRate = 2.6; // energy per second, before mode multiplier
    this.mode = 'NORMAL';

    this.flareRadius = 260;
    this.flareState = 'READY';
    this.flareCooldownMax = 5;
    this.flareCooldown = 0;
    this.flareTimer = 0; // active burst duration remaining
    this.flareDuration = 0.55;

    this.radius = this.baseRadius;
    this.intensity = 1;
    this.flickerPhase = Math.random() * 100;
    this.stability = 1; // reduced briefly when a shadow hits the player
  }

  get modeConfig() { return LANTERN_MODES[this.mode]; }

  setMode(mode) { if (LANTERN_MODES[mode]) this.mode = mode; }

  get lowEnergy() { return this.energy / this.maxEnergy < LOW_ENERGY_FRACTION; }
  get criticalEnergy() { return this.energy / this.maxEnergy < CRITICAL_ENERGY_FRACTION; }
  get depleted() { return this.energy <= 0.001; }

  recharge(amount) { this.energy = clamp(this.energy + amount, 0, this.maxEnergy); }

  tryFlare() {
    if (this.flareState !== 'READY') return false;
    this.flareState = 'ACTIVE';
    this.flareTimer = this.flareDuration;
    return true;
  }

  update(dt, { inSafeZone, flickerEnabled, lastEmber, flareDt = dt }) {
    // Use elapsed gameplay time even when physics clamps a slow frame. No
    // callbacks survive pause, menus or a new Player. Carry time across states.
    let remaining = Math.max(0, flareDt);
    if (this.flareState === 'ACTIVE') {
      const elapsed = Math.min(remaining, this.flareTimer);
      this.flareTimer -= elapsed;
      remaining -= elapsed;
      if (this.flareTimer <= 1e-9) {
        this.flareTimer = 0;
        this.flareState = 'COOLDOWN';
        this.flareCooldown = this.flareCooldownMax;
      }
    }
    if (this.flareState === 'COOLDOWN') {
      this.flareCooldown = Math.max(0, this.flareCooldown - remaining);
      if (this.flareCooldown <= 1e-9) {
        this.flareCooldown = 0;
        this.flareState = 'READY';
      }
    }

    const mode = this.modeConfig;
    let drain = this.drainRate * mode.drainMul;
    if (inSafeZone) drain *= 0.28;
    if (!this.depleted) this.energy = clamp(this.energy - drain * dt, 0, this.maxEnergy);

    this.stability = clamp(this.stability + dt * 0.6, 0, 1);

    const fraction = this.energy / this.maxEnergy;
    let targetRadius;
    if (this.depleted) {
      targetRadius = 34 + lastEmber; // emergency glow
    } else {
      const shrink = fraction < LOW_ENERGY_FRACTION ? 0.55 + 0.45 * (fraction / LOW_ENERGY_FRACTION) : 1;
      targetRadius = this.baseRadius * mode.radiusMul * shrink;
    }
    if (this.flareTimer > 0) {
      const t = this.flareTimer / this.flareDuration;
      targetRadius = Math.max(targetRadius, this.flareRadius * t);
    }

    this.flickerPhase += dt * (this.lowEnergy ? 9 : 2.2);
    let flicker = 1;
    if (flickerEnabled) {
      const amt = this.depleted ? 0.35 : this.lowEnergy ? 0.12 : 0.035;
      flicker = 1 - amt * (0.5 + 0.5 * Math.sin(this.flickerPhase)) * (0.6 + 0.4 * Math.sin(this.flickerPhase * 2.7));
    }
    this.radius = targetRadius * flicker * this.stability;
    this.intensity = clamp((this.depleted ? 0.18 : fraction < LOW_ENERGY_FRACTION ? 0.45 + fraction * 2 : 1) * flicker, 0.08, 1) * mode.protectMul;
  }

  onHit() {
    this.stability = 0.4;
    this.energy = clamp(this.energy - 6, 0, this.maxEnergy);
  }
}
