import { disturbDust } from "./artifacts.js";
import { recordIntervention } from "./culture.js";
import { bound, clamp, distance } from "./world.js";
export const POWERS = ["TOUCH", "LIGHT", "RAIN", "MUTATE", "DISTORT"];
export function applyPower(w, kind, position) {
  if (!POWERS.includes(kind)) return null;
  const p = bound({ x: position.x, y: position.y });
  const effect = { ...p, kind, radius: 105, ttl: kind === "TOUCH" ? 3 : 24 };
  effect.eventId = recordIntervention(w, kind, p).id;
  w.effects.push(effect);
  if (w.effects.length > 12) w.effects.shift();
  if (kind === "TOUCH") disturbDust(w, p);
  if (kind === "TOUCH")
    for (const a of w.agents) {
      const force = clamp(1 - distance(a, p) / 140);
      if (force > 0) {
        const d = Math.max(1, distance(a, p));
        a.x += ((a.x - p.x) / d) * force * 5;
        a.y += ((a.y - p.y) / d) * force * 5;
        bound(a);
        a.fear = clamp(a.fear + force * (0.45 + a.traits.caution * 0.5));
        a.decision = 0;
        a.target = bound({
          x: a.x + (a.x - p.x) * force * 0.8,
          y: a.y + (a.y - p.y) * force * 0.8,
        });
        a.action = "FLEE";
        a.decision = 1.5;
      }
    }
  return effect;
}
export function updateEnvironment(w, dt) {
  for (const r of w.regions) {
    r.light = 0;
    r.moisture = clamp(r.moisture - 0.0008 * dt, 0.18, 1);
    r.mutation = clamp(r.mutation - 0.006 * dt);
  }
  for (const e of w.effects) {
    e.ttl -= dt;
    if (e.kind === "RAIN") {
      for (const r of w.regions)
        if (distance(e, r) < e.radius + 35)
          r.moisture = clamp(r.moisture + 0.024 * dt);
      for (const p of w.water)
        if (distance(e, p) < e.radius)
          p.amount = clamp(p.amount + 1.2 * dt, 0, 100);
      if (!w.water.some((p) => distance(p, e) < 95) && w.water.length < 7) {
        w.water.push({ x: e.x, y: e.y, amount: 8, temporary: true });
      }
    }
    if (e.kind === "MUTATE") {
      for (const r of w.regions)
        if (distance(e, r) < e.radius + 35)
          r.mutation = clamp(r.mutation + 0.06 * dt);
      for (const p of w.plants)
        if (distance(e, p) < e.radius)
          p.color = clamp(p.color + 1.4 * dt, 155, 245);
    }
    if (e.kind === "DISTORT") {
      for (const p of w.particles) {
        const d = distance(p, e);
        if (d < e.radius && d > 1) {
          const force = (1 - d / e.radius) * 18 * dt;
          p.vx -= ((p.y - e.y) / d) * force;
          p.vy += ((p.x - e.x) / d) * force;
        }
      }
      for (const a of w.agents) {
        const d = distance(a, e);
        if (d < e.radius && d > 1) {
          const f = (1 - d / e.radius) * 4 * dt,
            dx = (a.x - e.x) / d,
            dy = (a.y - e.y) / d;
          a.x -= dy * f;
          a.y += dx * f;
          bound(a);
        }
      }
    }
    if (e.kind === "LIGHT") {
      for (const r of w.regions)
        if (distance(e, r) < e.radius + 35) r.light = 1;
      for (const p of w.plants)
        if (distance(e, p) < e.radius)
          p.food = clamp(p.food + p.growth * 2 * dt, 0, p.capacity);
    }
  }
  for (const p of w.water)
    if (p.temporary) p.amount = clamp(p.amount - 0.08 * dt, 0, 100);
  w.water = w.water.filter((p) => !p.temporary || p.amount > 1);
  w.effects = w.effects.filter((e) => e.ttl > 0);
}
