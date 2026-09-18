import { CYAN, GOLD, VIOLET, PEARL, colorForKind, expDamp, expDampAngle, mixRgb, rgba } from "./math.js";
const TENDRIL_COUNT = 5;
const TENDRIL_SEGS = 7;
export function createCreature(x, y, affinity, stage) {
    const tendrils = [];
    for(let i = 0; i < TENDRIL_COUNT; i++){
        const segs = [];
        for(let s = 0; s < TENDRIL_SEGS; s++)segs.push({ x, y });
        tendrils.push(segs);
    }
    return { x, y, vx: 0, vy: 0, facing: -Math.PI / 2, pulse: 0, happy: 0, expand: 0, bob: 0, tendrils, motes: [], affinity, stage, trailBoost: 0 };
}
export function stageFromProgress(restoredCount, endingDone) {
    if (endingDone || restoredCount >= 4) return 2;
    if (restoredCount >= 2) return 1;
    return 0;
}
export function bodyRadius(c) { return (18 + c.stage * 6) * (1 + c.expand * 0.22); }
export function creatureColor(c, t) {
    const a = c.affinity;
    const sum = a.cyan + a.gold + a.violet + a.prism + 0.0001;
    let col = mixRgb(PEARL, CYAN, 0.18);
    col = mixRgb(col, CYAN, a.cyan / sum * 0.85);
    col = mixRgb(col, GOLD, a.gold / sum * 0.85);
    col = mixRgb(col, VIOLET, a.violet / sum * 0.85);
    if (a.prism > 0.15) col = mixRgb(col, colorForKind("prism", t), 0.28);
    if (c.motes.length) {
        const last = c.motes[c.motes.length - 1];
        col = mixRgb(col, colorForKind(last.kind, t), 0.35);
    }
    return col;
}
export function updateCreatureVisual(c, dt, time, maxSpeed) {
    const speed = Math.hypot(c.vx, c.vy);
    if (speed > 8) c.facing = expDampAngle(c.facing, Math.atan2(c.vy, c.vx), 7, dt);
    c.pulse += dt; c.happy = Math.max(0, c.happy - dt); c.expand = expDamp(c.expand, 0, 3.2, dt);
    c.trailBoost = Math.max(0, c.trailBoost - dt * 0.35);
    c.bob = Math.sin(time * 1.4) * (speed < 18 ? 2.4 : 0.6);
    const back = c.facing + Math.PI;
    const tendrilLen = 9 + c.affinity.cyan * 22 + c.stage * 6;
    const rad = bodyRadius(c) * 0.55;
    for(let i = 0; i < TENDRIL_COUNT; i++){
        const segs = c.tendrils[i];
        const spread = (i / (TENDRIL_COUNT - 1) - 0.5) * 1.15;
        const rootAng = back + spread;
        const rootX = c.x + Math.cos(rootAng) * rad;
        const rootY = c.y + Math.sin(rootAng) * rad + c.bob;
        const first = segs[0]; first.x = rootX; first.y = rootY;
        for(let s = 1; s < TENDRIL_SEGS; s++){
            const prev = segs[s - 1], cur = segs[s];
            const wave = Math.sin(time * 2.1 + i * 0.9 + s * 0.45) * (1.6 + (1 - s / TENDRIL_SEGS) * 1.2);
            const side = back + spread + Math.PI / 2;
            const targetX = prev.x + Math.cos(back + spread * 0.4) * tendrilLen + Math.cos(side) * wave * 0.35;
            const targetY = prev.y + Math.sin(back + spread * 0.4) * tendrilLen + Math.sin(side) * wave * 0.35;
            const follow = 14 - s * 0.6;
            cur.x = expDamp(cur.x, targetX, follow, dt);
            cur.y = expDamp(cur.y, targetY, follow, dt);
        }
    }
    for (const m of c.motes)m.phase += dt * (1.1 + c.stage * 0.15);
    void maxSpeed;
}
export function drawCreature(ctx, c, wx, wy, time, reduced) {
    const col = creatureColor(c, time);
    const core = mixRgb(col, GOLD, 0.25 + c.affinity.gold * 0.45);
    const rad = bodyRadius(c);
    const speed = Math.hypot(c.vx, c.vy);
    const lean = Math.sin(c.facing) * 0.08 * Math.min(1, speed / 120);
    const sx = wx(c.x), sy = wy(c.y) + c.bob;
    for(let i = 0; i < TENDRIL_COUNT; i++){
        const segs = c.tendrils[i];
        ctx.beginPath(); ctx.moveTo(wx(segs[0].x), wy(segs[0].y) + c.bob);
        for(let s = 1; s < segs.length; s++){ const p = segs[s]; ctx.lineTo(wx(p.x), wy(p.y) + c.bob); }
        const alpha = 0.22 + (1 - i / TENDRIL_COUNT) * 0.18;
        ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = 3.2 - i * 0.25; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
        const tip = segs[segs.length - 1];
        ctx.fillStyle = rgba(col, 0.45); ctx.beginPath(); ctx.arc(wx(tip.x), wy(tip.y) + c.bob, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(c.facing + lean + (c.happy > 0 ? Math.sin(c.happy * 10) * 0.35 : 0));
    const stretch = 1 + Math.min(0.16, speed / 280); ctx.scale(stretch, 1 / stretch);
    if (c.affinity.violet > 0.12 || c.stage > 0) {
        const fin = 8 + c.affinity.violet * 16;
        ctx.fillStyle = rgba(VIOLET, 0.22 + c.affinity.violet * 0.25);
        ctx.beginPath(); ctx.ellipse(2, -rad * 0.7, fin, fin * 0.38, -0.5, 0, Math.PI * 2); ctx.ellipse(2, rad * 0.7, fin, fin * 0.38, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    const glowR = rad * 2.2;
    const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, glowR);
    bodyGrad.addColorStop(0, rgba(core, 0.95)); bodyGrad.addColorStop(0.28, rgba(col, 0.55)); bodyGrad.addColorStop(0.62, rgba(col, 0.16)); bodyGrad.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.ellipse(0, 0, rad * 1.15, rad * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(mixRgb(col, PEARL, 0.35), 0.55); ctx.beginPath(); ctx.ellipse(-rad * 0.12, -rad * 0.08, rad * 0.72, rad * 0.58, -0.2, 0, Math.PI * 2); ctx.fill();
    const beat = 1 + Math.sin(time * 2.6) * 0.08;
    ctx.fillStyle = rgba(mixRgb(core, PEARL, 0.4), 0.95); ctx.beginPath(); ctx.arc(-rad * 0.08, 0, rad * 0.28 * beat, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(PEARL, 0.7); ctx.beginPath(); ctx.arc(-rad * 0.16, -rad * 0.08, rad * 0.1, 0, Math.PI * 2); ctx.fill();
    const eyeSpread = rad * 0.28;
    ctx.fillStyle = rgba(PEARL, 0.95); ctx.beginPath(); ctx.arc(rad * 0.22, -eyeSpread, 2.3, 0, Math.PI * 2); ctx.arc(rad * 0.22, eyeSpread, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba({ r: 20, g: 28, b: 48 }, 0.85); ctx.beginPath(); ctx.arc(rad * 0.28, -eyeSpread, 1.15, 0, Math.PI * 2); ctx.arc(rad * 0.28, eyeSpread, 1.15, 0, Math.PI * 2); ctx.fill();
    const balanced = c.affinity.cyan > 0.2 && c.affinity.gold > 0.2 && c.affinity.violet > 0.2;
    if (balanced || c.affinity.prism > 0.2 || c.stage === 2) {
        ctx.strokeStyle = rgba(colorForKind("prism", time), 0.55); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, rad * 0.5, time, time + 1.2); ctx.stroke();
        ctx.strokeStyle = rgba(GOLD, 0.4); ctx.beginPath(); ctx.arc(0, 0, rad * 0.62, -time * 0.7, -time * 0.7 + 0.9); ctx.stroke();
    }
    ctx.restore();
    for(let i = 0; i < c.motes.length; i++){
        const m = c.motes[i], ang = m.phase + i * (Math.PI * 2 / Math.max(1, c.motes.length)), orbit = rad + 10 + i * 3;
        const mx = sx + Math.cos(ang) * orbit, my = sy + Math.sin(ang) * orbit * 0.72, mc = colorForKind(m.kind, time);
        ctx.fillStyle = rgba(mc, 0.9); ctx.beginPath(); ctx.arc(mx, my, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(mc, 0.25); ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fill();
    }
    void reduced;
}
export function addMote(c, kind) {
    if (c.motes.length >= 3) c.motes.shift();
    c.motes.push({ kind, phase: Math.random() * Math.PI * 2 });
}
export function takeMatchingMote(c, want) {
    if (!c.motes.length) return null;
    if (want === "any") return c.motes.shift().kind;
    if (want === "mix") {
        const kinds = new Set(c.motes.map((m)=>m.kind));
        if (kinds.size >= 2 || c.motes.some((m)=>m.kind === "prism")) return c.motes.shift().kind;
        return null;
    }
    const idx = c.motes.findIndex((m)=>m.kind === want || m.kind === "prism");
    if (idx < 0) return null;
    return c.motes.splice(idx, 1)[0].kind;
}
export function hasMatchingEnergy(c, want) {
    if (!c.motes.length) return false;
    if (want === "any") return true;
    if (want === "mix") {
        const kinds = new Set(c.motes.map((m)=>m.kind));
        return kinds.size >= 2 || c.motes.some((m)=>m.kind === "prism");
    }
    return c.motes.some((m)=>m.kind === want || m.kind === "prism");
}
export function bumpAffinity(c, kind) { c.affinity[kind] = Math.min(1, c.affinity[kind] + (kind === "prism" ? 0.22 : 0.16)); }
