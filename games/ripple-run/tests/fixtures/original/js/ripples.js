// Ripple Run - ripple wave system. Each ripple pushes an orb exactly once,
// at the moment its expanding wavefront passes through the orb's position.
window.RR = window.RR || {};

RR.Ripples = (function () {
  const U = RR.Utils;

  class Ripple {
    constructor(x, y, opts) {
      opts = opts || {};
      this.id = U.uid();
      this.x = x; this.y = y;
      this.radius = 0;
      this.prevRadius = 0;
      this.speed = opts.speed || 340;
      this.maxRadius = opts.maxRadius || 420;
      this.strength = opts.strength != null ? opts.strength : 260;
      this.life = opts.life || (this.maxRadius / this.speed) + 0.35;
      this.age = 0;
      this.isRain = !!opts.isRain;
      this.hue = opts.hue != null ? opts.hue : 190;
      this.hitOrbs = new Set();
      this.hitRocks = new Set();
      this.hitGoal = false;
      this.dead = false;
      this.ringPulses = []; // secondary reflection rings off rocks {x,y,radius,life,age}
    }

    update(dt) {
      this.prevRadius = this.radius;
      this.radius += this.speed * dt;
      this.age += dt;
      if (this.age >= this.life || this.radius > this.maxRadius * 1.05) this.dead = true;
      for (let i = this.ringPulses.length - 1; i >= 0; i--) {
        const p = this.ringPulses[i];
        p.age += dt;
        p.radius += p.speed * dt;
        if (p.age > p.life) this.ringPulses.splice(i, 1);
      }
    }

    fadeFactor() {
      // strength fades as the ring expands outward (also naturally rewards close taps)
      const rFade = U.clamp(1 - this.radius / this.maxRadius, 0, 1);
      const aFade = U.clamp(1 - this.age / this.life, 0, 1);
      return Math.max(0, rFade * 0.75 + aFade * 0.25);
    }
  }

  class RippleManager {
    constructor() {
      this.ripples = [];
    }

    spawn(x, y, opts) {
      const r = new Ripple(x, y, opts);
      this.ripples.push(r);
      if (this.ripples.length > 40) this.ripples.shift();
      return r;
    }

    clear() { this.ripples.length = 0; }

    update(dt, ctx) {
      // ctx: { orbs, rocks, goal, onOrbHit, onRockHit, onGoalHit }
      const orbs = (ctx && ctx.orbs) || [];
      const rocks = (ctx && ctx.rocks) || [];
      const goal = ctx && ctx.goal;

      for (const rp of this.ripples) {
        rp.update(dt);
        if (rp.isRain) continue;

        for (const orb of orbs) {
          if (rp.hitOrbs.has(orb)) continue;
          const d = U.dist(rp.x, rp.y, orb.x, orb.y);
          if (rp.prevRadius <= d && rp.radius >= d) {
            const fade = rp.fadeFactor();
            const mag = rp.strength * fade;
            if (mag > 0.5) {
              const dir = d > 0.001 ? U.vecNorm(orb.x - rp.x, orb.y - rp.y) : { x: 1, y: 0 };
              orb.applyImpulse(dir.x * mag * dt * 60, dir.y * mag * dt * 60);
              if (ctx.onOrbHit) ctx.onOrbHit(orb, rp);
            }
            rp.hitOrbs.add(orb);
          }
        }

        for (const rock of rocks) {
          if (rp.hitRocks.has(rock)) continue;
          const d = U.dist(rp.x, rp.y, rock.x, rock.y);
          if (rp.prevRadius <= d && rp.radius >= d && d < rp.maxRadius) {
            rp.hitRocks.add(rock);
            rp.ringPulses.push({
              x: rock.x, y: rock.y, radius: rock.r * 0.6, speed: 60, age: 0, life: 0.5
            });
            if (ctx.onRockHit) ctx.onRockHit(rock, rp);
          }
        }

        if (goal && !rp.hitGoal) {
          const d = U.dist(rp.x, rp.y, goal.x, goal.y);
          if (rp.prevRadius <= d && rp.radius >= d && d < rp.maxRadius) {
            rp.hitGoal = true;
            if (ctx.onGoalHit) ctx.onGoalHit(goal, rp);
          }
        }
      }

      this.ripples = this.ripples.filter(r => !r.dead);
    }
  }

  return { Ripple, RippleManager };
})();
