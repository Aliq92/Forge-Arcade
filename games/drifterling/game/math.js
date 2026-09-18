export function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
export function expDamp(current, target, lambda, dt) {
    return target + (current - target) * Math.exp(-lambda * dt);
}
export function lerpAngle(a, b, t) {
    let d = b - a;
    while(d > Math.PI)d -= Math.PI * 2;
    while(d < -Math.PI)d += Math.PI * 2;
    return a + d * t;
}
export function expDampAngle(current, target, lambda, dt) {
    let d = target - current;
    while(d > Math.PI)d -= Math.PI * 2;
    while(d < -Math.PI)d += Math.PI * 2;
    return current + d * (1 - Math.exp(-lambda * dt));
}
export function hypot2(x, y) {
    return x * x + y * y;
}
export function dist(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
}
export function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}
export function hash2(a, b) {
    return hash(a * 12.9898 + b * 78.233);
}
export const CYAN = { r: 126, g: 200, b: 212 };
export const GOLD = { r: 232, g: 192, b: 122 };
export const VIOLET = { r: 176, g: 138, b: 214 };
export const PRISM = { r: 232, g: 210, b: 230 };
export const PEARL = { r: 232, g: 230, b: 225 };
export const INDIGO = { r: 11, g: 16, b: 32 };
export const PALE = { r: 168, g: 174, b: 186 };
export function rgba(c, a) {
    return `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`;
}
export function mixRgb(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
export function scaleRgb(c, s) {
    return { r: c.r * s, g: c.g * s, b: c.b * s };
}
export function colorForKind(kind, t = 0) {
    if (kind === "cyan") return CYAN;
    if (kind === "gold") return GOLD;
    if (kind === "violet") return VIOLET;
    const h = t * 0.12 % 1;
    return hsl(h, 0.45, 0.72);
}
export function hsl(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n)=>{
        const k = (n + h * 12) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}
export function nearestOnSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby;
    const t = len2 < 1e-6 ? 0 : clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
    const x = ax + abx * t;
    const y = ay + aby * t;
    const len = Math.sqrt(len2) || 1;
    return { x, y, t, nx: abx / len, ny: aby / len };
}
export function inView(x, y, camX, camY, viewW, viewH, pad = 80) {
    return x > camX - viewW * 0.5 - pad && x < camX + viewW * 0.5 + pad && y > camY - viewH * 0.5 - pad && y < camY + viewH * 0.5 + pad;
}
