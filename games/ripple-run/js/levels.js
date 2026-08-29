// Ripple Run - level data (normalized 0..1 coordinates) + world builder
window.RR = window.RR || {};

RR.Levels = (function () {
  const U = RR.Utils;
  const O = RR.Obstacles;

  // All positions normalized to [0,1] of playfield width/height.
  // Radii normalized to min(W,H) so shapes stay proportional on any screen.
  const DATA = [
    {
      id: 1, name: 'First Ripple', tip: 'Tap the water near the orb to push it toward the light.',
      start: { x: 0.20, y: 0.50 },
      goal: { x: 0.80, y: 0.50, r: 0.085 },
      rocks: [], currents: [], shallow: [], hazards: [],
      par: { taps: 3, time: 8 }
    },
    {
      id: 2, name: 'Angle', tip: 'Ripples push straight outward — tap off to the side to curve your path.',
      start: { x: 0.16, y: 0.82 },
      goal: { x: 0.84, y: 0.18, r: 0.08 },
      rocks: [], currents: [], shallow: [], hazards: [],
      par: { taps: 4, time: 10 }
    },
    {
      id: 3, name: 'Momentum', tip: 'Long crossing ahead — chain a few taps to keep the orb gliding.',
      start: { x: 0.10, y: 0.50 },
      goal: { x: 0.90, y: 0.50, r: 0.075 },
      rocks: [], currents: [], shallow: [], hazards: [],
      par: { taps: 6, time: 14 }
    },
    {
      id: 4, name: 'The Rock', tip: 'A rock blocks the direct line. Push the orb around it.',
      start: { x: 0.15, y: 0.5 },
      goal: { x: 0.85, y: 0.5, r: 0.08 },
      rocks: [{ x: 0.5, y: 0.5, r: 0.10 }],
      currents: [], shallow: [], hazards: [],
      par: { taps: 5, time: 12 }
    },
    {
      id: 5, name: 'Narrow Pass', tip: 'Thread the gap between the stones.',
      start: { x: 0.14, y: 0.5 },
      goal: { x: 0.86, y: 0.5, r: 0.075 },
      rocks: [{ x: 0.5, y: 0.30, r: 0.10 }, { x: 0.5, y: 0.70, r: 0.10 }],
      currents: [], shallow: [], hazards: [],
      par: { taps: 6, time: 14 }
    },
    {
      id: 6, name: 'Current', tip: 'A gentle current drifts the orb downward — aim your taps to compensate.',
      start: { x: 0.15, y: 0.55 },
      goal: { x: 0.85, y: 0.28, r: 0.08 },
      rocks: [],
      currents: [{ shape: 'rect', x: 0.5, y: 0.55, w: 1.0, h: 0.30, dirX: 0, dirY: 1, strength: 55 }],
      shallow: [], hazards: [],
      par: { taps: 6, time: 15 }
    },
    {
      id: 7, name: 'Moving Goal', tip: 'The light drifts in a slow circle — time your ripple to meet it.',
      start: { x: 0.16, y: 0.5 },
      goal: { x: 0.62, y: 0.5, r: 0.075, motion: { type: 'circle', r: 0.16, speed: 0.5 } },
      rocks: [], currents: [], shallow: [], hazards: [],
      par: { taps: 6, time: 18 }
    },
    {
      id: 8, name: 'Shallow Water', tip: 'Shallow water saps momentum — push firmly before you enter it.',
      start: { x: 0.15, y: 0.5 },
      goal: { x: 0.85, y: 0.5, r: 0.08 },
      rocks: [],
      currents: [],
      shallow: [{ x: 0.5, y: 0.5, r: 0.24, dragMultiplier: 3.6 }],
      hazards: [],
      par: { taps: 6, time: 16 }
    },
    {
      id: 9, name: 'Strong Current', tip: 'A strong current resists you — chain ripples upstream.',
      start: { x: 0.16, y: 0.22 },
      goal: { x: 0.84, y: 0.80, r: 0.08 },
      rocks: [],
      currents: [{ shape: 'rect', x: 0.5, y: 0.5, w: 1.05, h: 0.36, dirX: -1, dirY: -0.35, strength: 95 }],
      shallow: [], hazards: [],
      par: { taps: 8, time: 20 }
    },
    {
      id: 10, name: 'Fragile Lilies', tip: 'Glowing lilies bruise easily — guide the orb clear of them.',
      start: { x: 0.15, y: 0.5 },
      goal: { x: 0.85, y: 0.5, r: 0.08 },
      rocks: [],
      currents: [],
      shallow: [],
      hazards: [{ x: 0.42, y: 0.36, r: 0.065, type: 'fragile' }, { x: 0.6, y: 0.64, r: 0.065, type: 'fragile' }],
      par: { taps: 6, time: 15 }
    },
    {
      id: 11, name: 'Double Current', tip: 'Two currents run opposite ways — find the calm seam between them.',
      start: { x: 0.14, y: 0.16 },
      goal: { x: 0.86, y: 0.84, r: 0.075 },
      rocks: [],
      currents: [
        { shape: 'rect', x: 0.5, y: 0.32, w: 1.05, h: 0.22, dirX: 1, dirY: 0, strength: 60 },
        { shape: 'rect', x: 0.5, y: 0.68, w: 1.05, h: 0.22, dirX: -1, dirY: 0, strength: 60 }
      ],
      shallow: [], hazards: [],
      par: { taps: 8, time: 20 }
    },
    {
      id: 12, name: 'Rock Garden', tip: 'Several stones crowd the pond — plan a winding route.',
      start: { x: 0.10, y: 0.5 },
      goal: { x: 0.90, y: 0.5, r: 0.075 },
      rocks: [
        { x: 0.32, y: 0.30, r: 0.075 }, { x: 0.32, y: 0.70, r: 0.075 },
        { x: 0.55, y: 0.50, r: 0.085 }, { x: 0.72, y: 0.25, r: 0.07 }, { x: 0.72, y: 0.75, r: 0.07 }
      ],
      currents: [], shallow: [], hazards: [],
      par: { taps: 8, time: 22 }
    },
    {
      id: 13, name: 'Moving Barriers', tip: 'Lily pads drift slowly — time your push through the gap.',
      start: { x: 0.15, y: 0.5 },
      goal: { x: 0.85, y: 0.5, r: 0.075 },
      rocks: [
        { x: 0.45, y: 0.35, r: 0.075, motion: { type: 'horizontal', amp: 0.10, speed: 0.6 } },
        { x: 0.55, y: 0.65, r: 0.075, motion: { type: 'horizontal', amp: 0.10, speed: 0.5, phase: Math.PI } }
      ],
      currents: [], shallow: [], hazards: [],
      par: { taps: 7, time: 20 }
    },
    {
      id: 14, name: 'One-Way Flow', tip: 'A river cuts across the pond — ripple hard to cross it.',
      start: { x: 0.16, y: 0.18 },
      goal: { x: 0.84, y: 0.82, r: 0.08 },
      rocks: [],
      currents: [{ shape: 'rect', x: 0.5, y: 0.5, w: 0.34, h: 1.1, dirX: 1, dirY: 0.15, strength: 105 }],
      shallow: [], hazards: [],
      par: { taps: 8, time: 22 }
    },
    {
      id: 15, name: 'Night Bloom', tip: 'Everything at once — stones, current, a drifting light, and fragile blooms.',
      start: { x: 0.12, y: 0.5 },
      goal: { x: 0.78, y: 0.5, r: 0.07, motion: { type: 'figureEight', rx: 0.08, ry: 0.10, speed: 0.6 } },
      rocks: [{ x: 0.42, y: 0.30, r: 0.07 }, { x: 0.5, y: 0.72, r: 0.075 }],
      currents: [{ shape: 'rect', x: 0.55, y: 0.5, w: 0.5, h: 0.5, dirX: 0.3, dirY: -1, strength: 45 }],
      shallow: [],
      hazards: [{ x: 0.30, y: 0.62, r: 0.055, type: 'fragile' }],
      par: { taps: 10, time: 28 }
    }
  ];

  function buildMotion(motion, W, H, baseX, baseY) {
    if (!motion) return null;
    const min = Math.min(W, H);
    if (motion.type === 'circle') {
      return O.Paths.circle(baseX, baseY, motion.r * min, motion.speed, motion.phase || Math.random() * 6);
    }
    if (motion.type === 'horizontal') {
      return O.Paths.horizontal(baseX, baseY, motion.amp * min, motion.speed, motion.phase || 0);
    }
    if (motion.type === 'vertical') {
      return O.Paths.vertical(baseX, baseY, motion.amp * min, motion.speed, motion.phase || 0);
    }
    if (motion.type === 'figureEight') {
      return O.Paths.figureEight(baseX, baseY, motion.rx * min, motion.ry * min, motion.speed, motion.phase || 0);
    }
    return null;
  }

  function build(index, W, H) {
    const def = DATA[index];
    if (!def) return null;
    const min = Math.min(W, H);
    const start = U.normToWorld(def.start.x, def.start.y, W, H);

    const goalBase = U.normToWorld(def.goal.x, def.goal.y, W, H);
    const goalMotion = buildMotion(def.goal.motion, W, H, goalBase.x, goalBase.y);
    const goal = new O.Goal(goalBase.x, goalBase.y, def.goal.r * min, goalMotion);

    const rocks = def.rocks.map(r => {
      const base = U.normToWorld(r.x, r.y, W, H);
      const motion = buildMotion(r.motion, W, H, base.x, base.y);
      return new O.Rock(base.x, base.y, r.r * min, motion);
    });

    const currents = def.currents.map(c => {
      const center = U.normToWorld(c.x, c.y, W, H);
      if (c.shape === 'circle') {
        return new O.CurrentZone({ shape: 'circle', x: center.x, y: center.y, r: c.r * min, dirX: c.dirX, dirY: c.dirY, strength: c.strength });
      }
      return new O.CurrentZone({ shape: 'rect', x: center.x, y: center.y, w: c.w * W, h: c.h * H, dirX: c.dirX, dirY: c.dirY, strength: c.strength });
    });

    const shallow = def.shallow.map(s => {
      const center = U.normToWorld(s.x, s.y, W, H);
      return new O.ShallowZone(center.x, center.y, s.r * min, s.dragMultiplier);
    });

    const hazards = def.hazards.map(h => {
      const center = U.normToWorld(h.x, h.y, W, H);
      return new O.HazardZone(center.x, center.y, h.r * min, { type: h.type });
    });

    return {
      id: def.id, name: def.name, tip: def.tip,
      start, goal, rocks, currents, shallow, hazards,
      par: def.par
    };
  }

  return { DATA, build, count: DATA.length };
})();
