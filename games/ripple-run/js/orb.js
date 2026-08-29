// Ripple Run - the glowing orb the player guides
window.RR = window.RR || {};

RR.Orb = (function () {
  const U = RR.Utils;

  const BASE_DRAG = 1.15;       // per-second velocity decay
  const MAX_SPEED = 620;        // world units / sec
  const TRAIL_INTERVAL = 0.02;  // seconds between trail samples
  const TRAIL_LIFE = 0.55;

  class Orb {
    constructor(x, y, opts) {
      opts = opts || {};
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.radius = opts.radius || 12;
      this.hue = opts.hue != null ? opts.hue : 190;
      this.brighten = 0; // 0..1 flash amount
      this.trail = [];
      this._trailTimer = 0;
      this.goalHold = 0;
      this.settled = true; // true when nearly stationary (for subtle idle bob)
      this.bobPhase = Math.random() * Math.PI * 2;
    }

    applyImpulse(dx, dy) {
      this.vx += dx; this.vy += dy;
      this.brighten = Math.min(1, this.brighten + 0.55);
    }

    update(dt, world) {
      const dragMul = (world && world.dragMultiplier) || 1;
      const drag = BASE_DRAG * dragMul;
      const decay = Math.exp(-drag * dt);
      this.vx *= decay;
      this.vy *= decay;

      if (world && world.forceX) { this.vx += world.forceX * dt; }
      if (world && world.forceY) { this.vy += world.forceY * dt; }

      const speed = Math.hypot(this.vx, this.vy);
      if (speed > MAX_SPEED) {
        const s = MAX_SPEED / speed;
        this.vx *= s; this.vy *= s;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // soft pond boundary
      if (world) {
        const m = this.radius + 6;
        if (this.x < m) { this.x = m; this.vx = Math.abs(this.vx) * 0.45; }
        if (this.x > world.W - m) { this.x = world.W - m; this.vx = -Math.abs(this.vx) * 0.45; }
        if (this.y < m) { this.y = m; this.vy = Math.abs(this.vy) * 0.45; }
        if (this.y > world.H - m) { this.y = world.H - m; this.vy = -Math.abs(this.vy) * 0.45; }
      }

      this.settled = speed < 6;

      this._trailTimer += dt;
      if (this._trailTimer >= TRAIL_INTERVAL) {
        this._trailTimer = 0;
        this.trail.push({ x: this.x, y: this.y, age: 0 });
        if (this.trail.length > 26) this.trail.shift();
      }
      for (let i = this.trail.length - 1; i >= 0; i--) {
        this.trail[i].age += dt;
        if (this.trail[i].age > TRAIL_LIFE) this.trail.splice(i, 1);
      }

      this.brighten *= Math.exp(-dt * 4.5);
    }
  }

  return { Orb, MAX_SPEED };
})();
