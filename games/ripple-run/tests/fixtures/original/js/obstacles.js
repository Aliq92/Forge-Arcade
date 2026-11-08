// Ripple Run - rocks, currents, shallow water, hazards, goal, and motion paths
window.RR = window.RR || {};

RR.Obstacles = (function () {
  const U = RR.Utils;

  // ---- motion path helpers: given base x/y and elapsed time t, return offset ----
  const Paths = {
    circle(cx, cy, r, speed, phase) {
      return function (t) {
        const a = (phase || 0) + t * speed;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      };
    },
    horizontal(cx, cy, amp, speed, phase) {
      return function (t) {
        return { x: cx + Math.sin(t * speed + (phase || 0)) * amp, y: cy };
      };
    },
    vertical(cx, cy, amp, speed, phase) {
      return function (t) {
        return { x: cx, y: cy + Math.sin(t * speed + (phase || 0)) * amp };
      };
    },
    figureEight(cx, cy, rx, ry, speed, phase) {
      return function (t) {
        const a = (phase || 0) + t * speed;
        return { x: cx + Math.sin(a) * rx, y: cy + Math.sin(a * 2) * ry * 0.5 };
      };
    }
  };

  class Rock {
    constructor(x, y, r, pathFn) {
      this.baseX = x; this.baseY = y; this.r = r;
      this.x = x; this.y = y;
      this.pathFn = pathFn || null;
      this.flash = 0;
    }
    update(t, dt) {
      if (this.pathFn) {
        const p = this.pathFn(t);
        this.x = p.x; this.y = p.y;
      }
      this.flash *= Math.exp(-dt * 5);
    }
  }

  class CurrentZone {
    constructor(opts) {
      this.shape = opts.shape || 'rect';
      this.x = opts.x; this.y = opts.y;
      this.w = opts.w; this.h = opts.h; this.r = opts.r;
      const dir = U.vecNorm(opts.dirX || 1, opts.dirY || 0);
      this.dirX = dir.x; this.dirY = dir.y;
      this.strength = opts.strength || 80;
    }
    contains(px, py) {
      if (this.shape === 'circle') {
        return U.dist(px, py, this.x, this.y) <= this.r;
      }
      return px >= this.x - this.w / 2 && px <= this.x + this.w / 2 &&
             py >= this.y - this.h / 2 && py <= this.y + this.h / 2;
    }
  }

  class ShallowZone {
    constructor(x, y, r, dragMultiplier) {
      this.x = x; this.y = y; this.r = r;
      this.dragMultiplier = dragMultiplier || 3.2;
    }
    contains(px, py) { return U.dist(px, py, this.x, this.y) <= this.r; }
  }

  class HazardZone {
    constructor(x, y, r, opts) {
      opts = opts || {};
      this.x = x; this.y = y; this.r = r;
      this.type = opts.type || 'fragile'; // 'fragile' (rating penalty) | 'drain' (hard fail)
      this.triggered = false;
      this.pulse = 0;
    }
    contains(px, py) { return U.dist(px, py, this.x, this.y) <= this.r; }
    reset() { this.triggered = false; this.pulse = 0; }
  }

  class Goal {
    constructor(x, y, r, pathFn) {
      this.baseX = x; this.baseY = y; this.r = r;
      this.x = x; this.y = y;
      this.pathFn = pathFn || null;
      this.pulse = 0;
    }
    update(t, dt) {
      if (this.pathFn) {
        const p = this.pathFn(t);
        this.x = p.x; this.y = p.y;
      }
      this.pulse *= Math.exp(-dt * 3);
    }
  }

  function collideOrbRock(orb, rock) {
    const d = U.dist(orb.x, orb.y, rock.x, rock.y);
    const minD = orb.radius + rock.r;
    if (d < minD) {
      const nx = d > 0.001 ? (orb.x - rock.x) / d : 1;
      const ny = d > 0.001 ? (orb.y - rock.y) / d : 0;
      const overlap = minD - d;
      orb.x += nx * overlap;
      orb.y += ny * overlap;

      const vn = orb.vx * nx + orb.vy * ny;
      const restitution = 0.42;
      if (vn < 0) {
        orb.vx -= (1 + restitution) * vn * nx;
        orb.vy -= (1 + restitution) * vn * ny;
        // tangential friction
        orb.vx *= 0.94; orb.vy *= 0.94;
      }
      rock.flash = 1;
      return true;
    }
    return false;
  }

  return { Rock, CurrentZone, ShallowZone, HazardZone, Goal, Paths, collideOrbRock };
})();
