(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GravityPhysics = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const G = 1400, SOFTEN = 26, MAX_ACCEL = 2.5;
  const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function mass(w) { return clamp(finite(w.mass, finite(w.strength, 1)), 0, 100); }
  function phaseSeed(w) {
    const value = w.seed == null ? String(w.id == null ? 0 : w.id) : String(w.seed);
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return (h >>> 0) / 4294967296 * Math.PI * 2;
  }
  function orbitRadius(w){const radius=clamp(finite(w.radius,600),0,100000);return clamp(finite(w.orbitRadius,100),0,radius*.75);}
  function centers(w, time) {
    if (!w || !Number.isFinite(w.x) || !Number.isFinite(w.y)) return [];
    const a = finite(w.rotationRate, 0) * finite(time, 0);
    const d = clamp(finite(w.separation, 80), 0, 2000) / 2;
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d, m = mass(w) / 2;
    return [{ x: w.x - dx, y: w.y - dy, mass: m }, { x: w.x + dx, y: w.y + dy, mass: m }];
  }
  function force(w, p, time, out) {
    out = out || {}; out.x = 0; out.y = 0;
    if (!w || !p || w.enabled === false || !Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return out;
    const radius = clamp(finite(w.radius, 600), 0, 100000), m = mass(w);
    if (!radius || !m) return out;
    const t = finite(time, 0), dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy);
    const direction = w.direction === -1 ? -1 : 1;
    function contribution(cx, cy, strength, multiplier) {
      const x = cx - p.x, y = cy - p.y, dist = Math.hypot(x, y);
      if (dist >= radius || dist < 1e-9) return;
      const falloff = 1 - (dist / radius) ** 2;
      const f = G * strength * multiplier * falloff * falloff / (dist * dist + SOFTEN * SOFTEN);
      out.x += x / dist * f; out.y += y / dist * f;
    }
    const type = w.type || (w.polarity < 0 ? 'repulsor' : 'attractor');
    if (type === 'binary') {
      // Inline both centers to avoid allocations in the simulation loop.
      const a = finite(w.rotationRate, 0) * t, half = clamp(finite(w.separation, 80), 0, 2000) / 2;
      const x = Math.cos(a) * half, y = Math.sin(a) * half;
      contribution(w.x - x, w.y - y, m / 2, 1);
      contribution(w.x + x, w.y + y, m / 2, 1);
    } else if (d < radius && d > 1e-9) {
      const ux = dx / d, uy = dy / d, falloff = (1 - (d / radius) ** 2) ** 2;
      const base = G * m * falloff / (d * d + SOFTEN * SOFTEN);
      if (type === 'orbit') {
        const target = orbitRadius(w);
        const vx = finite(p.vx, 0), vy = finite(p.vy, 0);
        const tx = uy * direction, ty = -ux * direction;
        const radialSpeed = vx * ux + vy * uy;
        const desiredSpeed = Math.sqrt(G * m * target * target / ((target * target + SOFTEN * SOFTEN) ** 1.5));
        const tangentialSpeed = vx * tx + vy * ty;
        const radial = clamp((d - target) * 0.006 - radialSpeed * 0.1 + tangentialSpeed * tangentialSpeed / Math.max(d, 10), -0.45, 0.45);
        const tangent = clamp((desiredSpeed - (vx * tx + vy * ty)) * 0.04, -0.3, 0.3);
        out.x = (ux * radial + tx * tangent) * falloff;
        out.y = (uy * radial + ty * tangent) * falloff;
      } else if (type === 'chaos') {
        const phase = phaseSeed(w), angle = t * 1.7 + phase + Math.sin(t * 0.73 + phase) * 1.3;
        const intensity = 0.55 + 0.45 * Math.sin(t * 1.13 + phase);
        out.x = Math.cos(angle) * base * intensity; out.y = Math.sin(angle) * base * intensity;
      } else {
        let radial = 1, tangent = 0;
        if (type === 'repulsor') radial = -1;
        else if (type === 'vortex') { radial = 0.35; tangent = 0.8 * direction; }
        else if (type === 'pulse') {
          const wave = Math.cos(t * Math.PI * 2 * clamp(finite(w.frequency, 0.5), 0, 20));
          radial = wave >= 0 ? wave : wave * clamp(finite(w.repelStrength, m) / m, 0, 100);
        }
        out.x = base * (ux * radial + uy * tangent);
        out.y = base * (uy * radial - ux * tangent);
      }
    }
    const length = Math.hypot(out.x, out.y);
    if (!Number.isFinite(length)) { out.x = 0; out.y = 0; }
    else if (length > MAX_ACCEL) { out.x *= MAX_ACCEL / length; out.y *= MAX_ACCEL / length; }
    return out;
  }
  function combined(wells, p, time, out) {
    out = out || {}; out.x = 0; out.y = 0; out.attractMag=0;out.repelMag=0;
    if (!Array.isArray(wells)) return out;
    const scratch = { x: 0, y: 0 };
    for (let i = 0; i < wells.length; i++) {
      force(wells[i], p, time, scratch);
      out.x += scratch.x; out.y += scratch.y;
      const m=Math.hypot(scratch.x,scratch.y);
      if(wells[i] && (wells[i].type==='repulsor' || (wells[i].type==='pulse' && Math.cos(finite(time,0)*Math.PI*2*finite(wells[i].frequency,.5))<0)))out.repelMag+=m;else out.attractMag+=m;
    }
    const length = Math.hypot(out.x, out.y);
    if (!Number.isFinite(length)) { out.x = 0; out.y = 0; }
    else if (length > MAX_ACCEL) { out.x *= MAX_ACCEL / length; out.y *= MAX_ACCEL / length; }
    return out;
  }
  return { force, combined, centers, orbitRadius };
});

