// Ripple Run - shared math/utility helpers
window.RR = window.RR || {};

RR.Utils = (function () {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  function dist2(ax, ay, bx, by) { return dist(ax, ay, bx, by); }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  // simple deterministic hash-based PRNG for stable decoration layouts
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
    return h;
  }

  function normToWorld(nx, ny, W, H) { return { x: nx * W, y: ny * H }; }
  function normRadius(nr, W, H) { return nr * Math.min(W, H); }

  function vecNorm(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len, len };
  }

  return {
    clamp, lerp, dist, dist2, rand, randInt, easeOutCubic, easeInOutSine, easeOutBack,
    uid, mulberry32, hashString, normToWorld, normRadius, vecNorm
  };
})();
