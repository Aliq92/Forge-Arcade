import { rgba } from "./math.js";
const KIND_DOT = 0;
const KIND_SOFT = 1;
export function createParticlePool(cap) {
    const items = Array.from({ length: cap }, ()=>({
            live: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2,
            r: 255, g: 255, b: 255, a: 1, drag: 1.4, kind: KIND_DOT
        }));
    let cursor = 0;
    function spawn(p) {
        for(let n = 0; n < cap; n++){
            const i = (cursor + n) % cap;
            const it = items[i];
            if (!it.live) {
                cursor = (i + 1) % cap;
                it.live = true;
                it.x = p.x; it.y = p.y; it.vx = p.vx ?? 0; it.vy = p.vy ?? 0;
                it.life = 0; it.max = p.max ?? 0.8; it.size = p.size ?? 2.5;
                it.r = p.r ?? 220; it.g = p.g ?? 230; it.b = p.b ?? 240;
                it.a = p.a ?? 0.7; it.drag = p.drag ?? 1.4; it.kind = p.kind ?? KIND_SOFT;
                return;
            }
        }
    }
    function burst(x, y, c, n, speed, reduced) {
        const count = reduced ? Math.min(6, n) : n;
        for(let i = 0; i < count; i++){
            const a = Math.random() * Math.PI * 2;
            const s = speed * (0.3 + Math.random());
            spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                max: 0.5 + Math.random() * 0.6, size: 1.5 + Math.random() * 3,
                r: c.r, g: c.g, b: c.b, a: 0.75 });
        }
    }
    function trail(x, y, vx, vy, c, size) {
        spawn({
            x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
            vx: -vx * 0.12 + (Math.random() - 0.5) * 8,
            vy: -vy * 0.12 + (Math.random() - 0.5) * 8,
            max: 0.55 + Math.random() * 0.35, size, r: c.r, g: c.g, b: c.b,
            a: 0.45, drag: 2.2
        });
    }
    function update(dt) {
        for(let i = 0; i < cap; i++){
            const p = items[i];
            if (!p.live) continue;
            p.life += dt;
            if (p.life >= p.max) { p.live = false; continue; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            const keep = Math.exp(-p.drag * dt);
            p.vx *= keep; p.vy *= keep;
        }
    }
    function draw(ctx, wx, wy) {
        for(let i = 0; i < cap; i++){
            const p = items[i];
            if (!p.live) continue;
            const t = p.life / p.max;
            const a = p.a * (1 - t) * (1 - t);
            const s = p.size * (1 + t * 0.6);
            ctx.fillStyle = rgba({ r: p.r, g: p.g, b: p.b }, a);
            ctx.beginPath(); ctx.arc(wx(p.x), wy(p.y), s, 0, Math.PI * 2); ctx.fill();
        }
    }
    return { spawn, burst, trail, update, draw, items };
}
