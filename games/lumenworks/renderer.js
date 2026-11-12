/* LUMENWORKS' miniature city. Rendering never writes to the network. */
const TILE_X = 48, TILE_Y = 25;
const TAU = Math.PI * 2;
const C = { sky: '#07121f', land: '#17323b', road: '#11242e', curb: '#2a4850', teal: '#44d8bc', cyan: '#70e9f2', amber: '#ffcc78', red: '#e58c86', ink: '#08151f', pale: '#d5e8e4' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const project = p => ({ x: (p.x - p.y) * TILE_X, y: (p.x + p.y) * TILE_Y });
const hash = s => { let n = 2166136261; for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
const distanceToSegment = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(x - a.x - t * dx, y - a.y - t * dy); };
function polygon(ctx, points, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function line(ctx, points, color, width = 1) { ctx.beginPath(); ctx.moveTo(...points[0]); for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
function ellipse(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function box(ctx, x, y, w, d, h, colors = ['#385762', '#203f4e', '#527481']) {
  const a = [x, y - h], b = [x + w, y + w * .48 - h], c = [x + w - d, y + (w + d) * .48 - h], e = [x - d, y + d * .48 - h];
  polygon(ctx, [a, b, [b[0], b[1] + h], [a[0], a[1] + h]], colors[0]);
  polygon(ctx, [b, c, [c[0], c[1] + h], [b[0], b[1] + h]], colors[1]);
  polygon(ctx, [a, b, c, e], colors[2], '#ffffff0b');
  return { a, b, c, e };
}
function glow(ctx, x, y, size, color, high) {
  if (!high) return;
  const g = ctx.createRadialGradient(x, y, 1, x, y, size); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(x - size, y - size, size * 2, size * 2);
}
function tree(ctx, x, y, seed) {
  ellipse(ctx, x + 3, y + 2, 10, 4, '#06181e55'); line(ctx, [[x, y], [x, y - 13]], '#45605a', 2);
  ellipse(ctx, x, y - 16, 8 + seed % 3, 11, seed % 2 ? '#27554f' : '#214b48'); ellipse(ctx, x - 3, y - 20, 5, 7, '#35645a');
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 1; this.height = 1; this.camera = { x: 0, y: 0, zoom: 1 };
    this.metrics = { frameMs: 0, drawnNodes: 0, activePulses: 0, cacheBuilds: 0, cityCacheBuilds: 0, dpr: 1 };
    this._cache = null; this._cacheKey = ''; this._cityCache = null; this._cityCacheKey = ''; this.resize();
  }
  resize() {
    const bounds = this.canvas.getBoundingClientRect?.() || {};
    this.width = Math.max(1, bounds.width || this.canvas.clientWidth || globalThis.innerWidth || 800);
    this.height = Math.max(1, bounds.height || this.canvas.clientHeight || globalThis.innerHeight || 600);
    this.dpr = Math.min(1.5, globalThis.devicePixelRatio || 1);
    const w = Math.round(this.width * this.dpr), h = Math.round(this.height * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.metrics.dpr = this.dpr;
  }
  fit(board, viewport = {}) {
    const left = viewport.left ?? 24, top = viewport.top ?? 100;
    const right = viewport.right ?? (this.width >= 950 ? 280 : 24), bottom = viewport.bottom ?? 90;
    const minX = -(board.height || 10) * TILE_X - 28, maxX = (board.width || 12) * TILE_X + 28;
    const minY = -95, maxY = ((board.width || 12) + (board.height || 10)) * TILE_Y + 34;
    const availableW = Math.max(120, this.width - left - right), availableH = Math.max(120, this.height - top - bottom);
    this.camera.zoom = clamp(Math.min(availableW / (maxX - minX), availableH / (maxY - minY)), .25, 1.65);
    this.camera.x = left + availableW / 2 - (minX + maxX) / 2 * this.camera.zoom;
    this.camera.y = top + availableH / 2 - (minY + maxY) / 2 * this.camera.zoom;
  }
  screen(point) { const p = project(point); return { x: p.x * this.camera.zoom + this.camera.x, y: p.y * this.camera.zoom + this.camera.y }; }
  world(x, y) { const a = (x - this.camera.x) / this.camera.zoom / TILE_X, b = (y - this.camera.y) / this.camera.zoom / TILE_Y; return { x: (a + b) / 2, y: (b - a) / 2 }; }
  hitNode(x, y, board) {
    let nearest = null, best = Math.max(22, 13 * this.camera.zoom);
    for (const n of board.nodes) { const p = this.screen(n), d = Math.hypot(x - p.x, y - p.y); if (d <= best) { best = d; nearest = n; } }
    return nearest;
  }
  hitEdge(x, y, board) {
    const nodes = new Map(board.nodes.map(n => [n.id, n])); let nearest = null, best = 12;
    for (const e of board.edges) { const a = nodes.get(e.from), b = nodes.get(e.to); if (!a || !b) continue; const d = distanceToSegment(x, y, this.screen(a), this.screen(b)); if (d < best) { nearest = e; best = d; } }
    return nearest;
  }
  pan(dx, dy) { this.camera.x += dx; this.camera.y += dy; }
  zoomAt(factor, x, y) { const point = this.world(x, y); this.camera.zoom = clamp(this.camera.zoom * factor, .25, 2.4); const p = project(point); this.camera.x = x - p.x * this.camera.zoom; this.camera.y = y - p.y * this.camera.zoom; }
  _terrain(board) {
    const key = JSON.stringify([board.id, board.width, board.height, board.obstacles, board.nodes.map(n => [n.id, n.x, n.y])]);
    if (key === this._cacheKey && this._cache) return;
    const w = board.width || 12, h = board.height || 10, pad = 70;
    const bounds = { x: -h * TILE_X - pad, y: -pad, width: (w + h) * TILE_X + pad * 2, height: (w + h) * TILE_Y + pad * 2 + 25 };
    const canvas = globalThis.OffscreenCanvas ? new OffscreenCanvas(bounds.width, bounds.height) : globalThis.document?.createElement('canvas');
    if (!canvas) { this._cache = null; return; }
    canvas.width = bounds.width; canvas.height = bounds.height; const ctx = canvas.getContext('2d'); ctx.translate(-bounds.x, -bounds.y);
    const p = (x, y) => { const q = project({ x, y }); return [q.x, q.y]; };
    const corners = [p(-.65, -.65), p(w - .35, -.65), p(w - .35, h - .35), p(-.65, h - .35)];
    const foot = corners.map(([x, y]) => [x, y + 13]); polygon(ctx, foot, '#071b26', '#24434c'); polygon(ctx, corners, C.land, '#36545b');
    // Wide quiet streets cut a finely gridded island into walkable city blocks.
    for (let x = 0; x < w; x++) { line(ctx, [p(x + .48, -.6), p(x + .48, h - .4)], '#29444b', 14); line(ctx, [p(x + .48, -.6), p(x + .48, h - .4)], C.road, 11); }
    for (let y = 0; y < h; y++) { line(ctx, [p(-.6, y + .48), p(w - .4, y + .48)], '#29444b', 14); line(ctx, [p(-.6, y + .48), p(w - .4, y + .48)], C.road, 11); }
    ctx.setLineDash([3, 13]);
    for (let x = 1; x < w; x += 3) line(ctx, [p(x + .48, -.45), p(x + .48, h - .55)], '#42616a55', 1);
    for (let y = 1; y < h; y += 3) line(ctx, [p(-.45, y + .48), p(w - .55, y + .48)], '#42616a55', 1);
    ctx.setLineDash([]);
    const occupied = new Set(board.nodes.map(n => `${Math.round(n.x)},${Math.round(n.y)}`));
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
      const seed = hash(`${board.id}:${x}:${y}`), [px, py] = p(x, y);
      if (!occupied.has(`${x},${y}`) && seed % 5 < 2) {
        polygon(ctx, [[px - 20, py - 4], [px, py - 14], [px + 20, py - 4], [px, py + 6]], '#20443e', '#35534b');
        tree(ctx, px - 5, py - 3, seed); if (seed % 3 === 0) tree(ctx, px + 10, py, seed + 1);
      } else if (!occupied.has(`${x},${y}`) && seed % 11 === 0) {
        box(ctx, px - 4, py - 6, 11, 11, 6, ['#43616a', '#2b4651', '#617c80']);
      }
    }
    for (const o of board.obstacles || []) {
      const corners = [p(o.x, o.y), p(o.x + o.w, o.y), p(o.x + o.w, o.y + o.h), p(o.x, o.y + o.h)];
      polygon(ctx, corners, '#102d44', '#59798a');
      for (let t = .2; t < o.h; t += .35) line(ctx, [p(o.x + .1, o.y + t), p(o.x + o.w - .1, o.y + t)], '#44738a66', 1);
      const a = p(o.x + o.w / 2, o.y + o.h / 2); ctx.font = '8px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#a5bfcc'; ctx.fillText('NO CABLES', a[0], a[1]);
    }
    this._cache = { canvas, ...bounds }; this._cacheKey = key; this.metrics.cacheBuilds++;
  }
  _building(ctx, n, powered, time, high, reduced, drawVehicle = true) {
    const s = n.style || 'house', seed = hash(n.id), px = -5, py = -25;
    ellipse(ctx, 0, -8, 34, 12, '#05121d77');
    const warm = powered ? '#f1b766' : '#29424f', glass = powered ? '#ffe1a0' : '#172f42';
    if (powered) glow(ctx, 0, -12, 65, '#ffb85720', high);
    const palettes = [['#48657b', '#2b455e', '#698397'], ['#6a5869', '#443c55', '#8a7282'], ['#476b69', '#2d4d54', '#718b83']];
    const colors = palettes[seed % palettes.length];
    let width = 28, depth = 25, height = 35;
    if (s === 'apartment') { width = 32; depth = 25; height = 71; }
    if (s === 'market') { width = 40; depth = 24; height = 31; }
    if (s === 'shop') { width = 30; depth = 25; height = 44; }
    if (s === 'tram') { width = 42; depth = 28; height = 34; }
    if (s === 'factory') { width = 39; depth = 25; height = 43; }
    if (s === 'public') { width = 38; depth = 28; height = 48; }
    box(ctx, px, py, width, depth, height, colors);
    // Lit facade windows follow the two isometric faces instead of floating on top.
    const rows = s === 'apartment' ? 5 : s === 'shop' ? 3 : 2;
    for (let row = 0; row < rows; row++) {
      const yy = py - height + 9 + row * 11;
      for (let col = 0; col < 3; col++) {
        const xx = px + 5 + col * (width - 7) / 3, y = yy + (xx - px) * .48;
        polygon(ctx, [[xx, y], [xx + 4, y + 2], [xx + 4, y + 7], [xx, y + 5]], (seed + col + row) % 7 === 0 ? warm : glass);
        const rx = px + width - 5 - col * (depth - 6) / 3, ry = yy + width * .48 + (px + width - rx) * .48;
        polygon(ctx, [[rx, ry], [rx - 4, ry + 2], [rx - 4, ry + 7], [rx, ry + 5]], glass);
      }
    }
    if (s === 'house') {
      polygon(ctx, [[px - depth - 3, py + depth * .48 - height], [px + 1, py - height - 19], [px + width + 3, py + width * .48 - height], [px + width - depth, py + (width + depth) * .48 - height]], '#344357', '#627280');
      polygon(ctx, [[px + 1, py - height - 19], [px + width + 3, py + width * .48 - height], [px + width, py + width * .48 - height + 1], [px, py - height]], '#536477');
      box(ctx, px - 6, py - height - 8, 5, 5, 15, ['#60717e', '#3c5263', '#7a8590']);
    } else if (s === 'market' || s === 'shop') {
      for (let i = 0; i < 6; i++) { const x = px + i * width / 6, y = py - 18 + i * width / 6 * .48; polygon(ctx, [[x, y - 5], [x + width / 6, y - 2], [x + width / 6 + 4, y + 5], [x + 4, y + 2]], i % 2 ? '#c38b73' : '#ded0a2'); }
      if (s === 'market') { box(ctx, px - 18, py + 18, 14, 8, 9, ['#897052', '#5b4d45', '#d0a971']); for (let i = 0; i < 4; i++) ellipse(ctx, px - 17 + i * 3, py + 12 + i, 2.3, 2, ['#e99c74', '#8fa85d'][i % 2]); }
      line(ctx, [[px + 3, py - height - 4], [px + width - 3, py + width * .48 - height - 7]], powered ? C.amber : '#61767e', 3);
    } else if (s === 'apartment') {
      box(ctx, px + 6, py - height - 1, 18, 14, 7, ['#375667', '#234253', '#5c7a85']);
      line(ctx, [[px + 13, py - height - 8], [px + 13, py - height - 19]], '#7c94a0', 1.5);
      for (let i = 0; i < 4; i++) line(ctx, [[px + 1, py - 18 - i * 11], [px + width - 1, py + width * .48 - 18 - i * 11]], '#acbbc222', 1);
    } else if (s === 'factory') {
      box(ctx, px - 11, py - 27, 9, 9, 67, ['#726c73', '#454c5e', '#8b8790']);
      line(ctx, [[px - 10, py - 82], [px - 4, py - 79]], '#d3a88a', 4);
      for (let i = 0; i < 3; i++) box(ctx, px + i * 10, py - height + i * 5, 8, 20, 7, ['#54727b', '#334f60', '#91a1a1']);
      if (powered && !reduced) for (let i = 0; i < 3; i++) { const t = ((time * .00012 + i / 3) % 1); ellipse(ctx, px - 8 + t * 10, py - 94 - t * 28, 4 + t * 6, 3 + t * 4, `rgba(159,184,189,${.16 * (1 - t)})`); }
    } else if (s === 'public') {
      polygon(ctx, [[px - depth - 2, py + depth * .48 - height], [px + 4, py - height - 13], [px + width + 2, py + width * .48 - height], [px + width - depth, py + (width + depth) * .48 - height]], '#708993', '#9caea7');
      for (let i = 0; i < 4; i++) { const x = px + 4 + i * 8; line(ctx, [[x, py - 26 + i * 4], [x, py - 4 + i * 4]], '#adbbb5', 3); }
      ellipse(ctx, px + 5, py - height - 1, 4, 4, powered ? C.amber : '#8da0a1');
    } else if (s === 'tram') {
      const a = [px - 17, py + 19], b = [px + 48, py + 51]; line(ctx, [a, b], '#748895', 2); line(ctx, [[a[0] - 5, a[1] + 3], [b[0] - 5, b[1] + 3]], '#748895', 2);
      if (drawVehicle) this._tram(ctx, powered, time, reduced);
    }
    // A warm doorway and lamp connect each inhabited building to its actual port.
    polygon(ctx, [[px + width - 5, py + width * .48 - 12], [px + width - 11, py + width * .48 - 9], [px + width - 11, py + width * .48 + 1], [px + width - 5, py + width * .48 - 2]], warm);
    line(ctx, [[-24, -4], [-24, -30], [-17, -33]], '#6c838a', 1.5);
    ellipse(ctx, -17, -33, 3, 2, powered ? C.amber : '#425866');
    if (powered) { glow(ctx, -17, -30, 24, '#ffcc7840', high); ellipse(ctx, -17, -3, 12, 4, '#ffcc7818'); }
    line(ctx, [[0, -10], [0, -2]], '#739390', 2);
  }
  _tram(ctx, powered, time, reduced) {
    const t = powered && !reduced ? .5 + Math.sin(time * .00048) * .4 : .25;
    const x = -22 + 65 * t, y = -6 + 32 * t;
    box(ctx, x, y, 20, 9, 13, ['#7db1a8', '#386d72', '#c1cfbe']);
    for (let i = 0; i < 3; i++) polygon(ctx, [[x + 3 + i * 5, y - 10 + i * 2.4], [x + 6 + i * 5, y - 8.5 + i * 2.4], [x + 6 + i * 5, y - 4 + i * 2.4], [x + 3 + i * 5, y - 5.5 + i * 2.4]], powered ? '#ffe1a0' : '#172f42');
  }
  _equipment(ctx, n, state, time, high, reduced) {
    const powered = n.type === 'generator' ? n.capacity > 0 : (state.flow || 0) > 0;
    ellipse(ctx, 0, -7, 31, 11, '#06141c88');
    if (powered) glow(ctx, 0, -20, 48, '#3ee1c025', high);
    box(ctx, -3, -24, 28, 27, 7, ['#345b64', '#1c3e50', '#65868a']);
    if (n.type === 'generator') {
      box(ctx, 1, -29, 23, 21, 29, ['#317d79', '#205459', '#5bb4a6']);
      for (let i = 0; i < 4; i++) line(ctx, [[5 + i * 4, -52 + i * 2], [5 + i * 4, -34 + i * 2]], '#174a53', 2);
      ellipse(ctx, -8, -51, 11, 7, '#1c4a55'); ellipse(ctx, -8, -53, 10, 6, '#64c6b5');
      const angle = !reduced && powered ? time * .001 : 0;
      for (let i = 0; i < 3; i++) { const a = angle + i * TAU / 3; line(ctx, [[-8, -53], [-8 + Math.cos(a) * 7, -53 + Math.sin(a) * 3.7]], '#174a53', 2); }
      box(ctx, -13, -33, 6, 6, 29, ['#4e7677', '#294d5c', '#9fbbb0']);
      line(ctx, [[-10, -65], [-10, -73]], '#a8cbc2', 1);
    } else if (n.type === 'substation') {
      box(ctx, -1, -31, 20, 18, 22, ['#428f8b', '#205862', '#75bbac']);
      for (let i = 0; i < 3; i++) { const x = -14 + i * 12, y = -38 + i * 5; line(ctx, [[x, y], [x, y - 24]], '#8bb9b5', 2); for (let j = 0; j < 3; j++) ellipse(ctx, x, y - 8 - j * 4, 4, 2, '#c5d4bd'); }
      line(ctx, [[-14, -62], [10, -52]], '#61e0d1', 1.5);
    } else if (n.type === 'switch') {
      const closed = n.closed !== false;
      box(ctx, -3, -31, 18, 17, 17, ['#547c80', '#2b545f', '#7da9a4']);
      ellipse(ctx, -5, -50, 3, 3, '#d5dfc5'); ellipse(ctx, 10, -43, 3, 3, '#d5dfc5');
      line(ctx, [[-5, -50], closed ? [10, -43] : [6, -63]], closed ? C.teal : C.amber, 3);
      ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#e0eee2'; ctx.fillText(closed ? 'ON' : 'OPEN', 2, -30);
    } else if (n.type === 'battery') {
      box(ctx, -1, -30, 22, 20, 32, ['#2e817c', '#205058', '#5bafa1']); box(ctx, 4, -62, 10, 9, 3, ['#abc9bb', '#5c8b89', '#d1dfcd']);
      const fraction = clamp((n.energy || 0) / (n.maxEnergy || 1), 0, 1);
      for (let i = 0; i < 4; i++) polygon(ctx, [[3, -54 + i * 6], [16, -48 + i * 6], [16, -45 + i * 6], [3, -51 + i * 6]], fraction >= (4 - i) / 4 ? C.teal : '#163a49');
      ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#d1eae0'; ctx.fillText(n.mode === 'support' ? '↑' : n.mode === 'charge' ? '↓' : '—', 5, -20);
    }
    ellipse(ctx, 0, -15, 2, 2, powered ? C.teal : '#6e8185'); line(ctx, [[0, -12], [0, -1]], '#709895', 2);
  }
  _city(board, allocation, high, reduced) {
    // Facades, windows, lamps and equipment are stationary between network edits.
    // Keep just one bounded city layer; vehicle movement is drawn separately.
    const key = JSON.stringify([board.id, board.width, board.height, high, reduced, board.nodes.map(n => [n.id, n.type, n.style, n.x, n.y, n.capacity, n.closed, n.mode, Math.floor((n.energy || 0) / (n.maxEnergy || 1) * 4), !!allocation.served?.[n.id], (allocation.nodes?.[n.id]?.flow || 0) > 0])]);
    if (key === this._cityCacheKey && this._cityCache) return true;
    const bounds = { x: -(board.height || 10) * TILE_X - 70, y: -120, width: ((board.width || 12) + (board.height || 10)) * TILE_X + 140, height: ((board.width || 12) + (board.height || 10)) * TILE_Y + 210 };
    const density = 1.5;
    const canvas = globalThis.OffscreenCanvas ? new OffscreenCanvas(Math.ceil(bounds.width * density), Math.ceil(bounds.height * density)) : globalThis.document?.createElement('canvas');
    if (!canvas) return false;
    canvas.width = Math.ceil(bounds.width * density); canvas.height = Math.ceil(bounds.height * density);
    const ctx = canvas.getContext('2d'); ctx.setTransform(density, 0, 0, density, -bounds.x * density, -bounds.y * density);
    const ordered = [...board.nodes].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.x - b.x);
    for (const n of ordered) {
      const p = project(n), state = allocation.nodes?.[n.id] || {};
      ctx.save(); ctx.translate(p.x, p.y);
      if (n.type === 'building') this._building(ctx, n, !!allocation.served?.[n.id], 0, high, true, reduced);
      else this._equipment(ctx, n, state, 0, high, true);
      ctx.restore();
    }
    this._cityCache = { canvas, ...bounds }; this._cityCacheKey = key; this.metrics.cityCacheBuilds++;
    return true;
  }
  draw(board, allocation = {}, options = {}) {
    const started = globalThis.performance?.now?.() || 0, ctx = this.ctx;
    const high = options.quality !== 'low', reduced = !!options.reduced, time = options.time || 0;
    this.metrics.activePulses = 0;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.fillStyle = C.sky; ctx.fillRect(0, 0, this.width, this.height);
    if (high) { const g = ctx.createRadialGradient(this.width * .45, this.height * .45, 1, this.width * .45, this.height * .45, Math.max(this.width, this.height) * .7); g.addColorStop(0, '#132f3d'); g.addColorStop(1, C.sky); ctx.fillStyle = g; ctx.fillRect(0, 0, this.width, this.height); }
    // Fixed stars are atmosphere, never electrical activity.
    for (let i = 0; i < (high ? 44 : 16); i++) { const x = hash(`sx${i}`) % this.width, y = hash(`sy${i}`) % this.height; ctx.fillStyle = '#a1c8cf22'; ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, 1); }
    this._terrain(board);
    ctx.save(); ctx.translate(this.camera.x, this.camera.y); ctx.scale(this.camera.zoom, this.camera.zoom);
    if (this._cache) ctx.drawImage(this._cache.canvas, this._cache.x, this._cache.y);
    const nodes = new Map(board.nodes.map(n => [n.id, n]));
    for (const e of board.edges) {
      const from = nodes.get(e.from), to = nodes.get(e.to); if (!from || !to) continue;
      const a = project(from), b = project(to), state = allocation.edges?.[e.id] || {};
      const flow = e.enabled !== false && !e.damaged && state.enabled !== false && !state.damaged ? Math.max(0, state.flow || 0) : 0;
      const selected = options.selectedId === e.id, constrained = !!state.constrained;
      line(ctx, [[a.x, a.y + 3], [b.x, b.y + 3]], '#04121f', 7);
      ctx.setLineDash(e.damaged ? [5, 7] : e.enabled === false ? [2, 6] : []);
      // Two inexpensive transparent strokes read as a glow without a large blurred raster.
      if (flow > 0 && high) { line(ctx, [[a.x, a.y], [b.x, b.y]], '#70e9f214', 10); line(ctx, [[a.x, a.y], [b.x, b.y]], '#70e9f228', 5); }
      line(ctx, [[a.x, a.y], [b.x, b.y]], e.damaged ? C.red : constrained ? '#e6b872' : flow > 0 ? C.cyan : '#52727f', selected ? 4 : flow > 0 ? 2.7 : 2);
      ctx.setLineDash([]);
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
      const angle = Math.atan2(dy, dx), t = flow > 0 && !reduced ? .2 + ((time * .00018 + hash(e.id) % 100 / 100) % .6) : .5;
      ctx.save(); ctx.translate(a.x + dx * t, a.y + dy * t); ctx.rotate(angle);
      line(ctx, [[-4, -3], [0, 0], [-4, 3]], flow > 0 ? '#d9ffff' : '#7d959c', 1.3); ctx.restore();
      if (flow > 0 && !reduced) { const count = high ? Math.min(4, Math.max(1, Math.floor(length / 100))) : 1; for (let i = 0; i < count; i++) { const q = ((time * .00013 + i / count + hash(e.id) % 31 / 31) % 1); ellipse(ctx, a.x + dx * q, a.y + dy * q, 2.3, 2.3, '#d2ffff'); this.metrics.activePulses++; } }
      if (e.damaged) { const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2; line(ctx, [[x - 4, y - 5], [x + 4, y + 5]], '#f5b5a4', 2); line(ctx, [[x + 4, y - 5], [x - 4, y + 5]], '#f5b5a4', 2); }
      if (selected || constrained) { const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2 - 9; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = constrained ? C.amber : C.pale; ctx.fillText(`${constrained ? '! ' : ''}${Math.round(flow * 10) / 10}/${e.capacity} PU`, x, y); }
    }
    if (this._city(board, allocation, high, reduced)) {
      const cache = this._cityCache; ctx.drawImage(cache.canvas, cache.x, cache.y, cache.width, cache.height);
      if (!reduced) for (const n of board.nodes) {
        const powered = !!allocation.served?.[n.id];
        if (n.type !== 'building') continue;
        const p = project(n);
        if (n.style === 'tram') { ctx.save(); ctx.translate(p.x, p.y); this._tram(ctx, powered, time, false); ctx.restore(); }
        else if (n.style === 'factory' && powered && high) for (let i = 0; i < 3; i++) { const t = ((time * .00012 + i / 3) % 1); ellipse(ctx, p.x - 13 + t * 10, p.y - 119 - t * 28, 4 + t * 6, 3 + t * 4, `rgba(159,184,189,${.16 * (1 - t)})`); }
      }
    } else {
      const ordered = [...board.nodes].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.x - b.x);
      for (const n of ordered) { const p = project(n), state = allocation.nodes?.[n.id] || {}; ctx.save(); ctx.translate(p.x, p.y); if (n.type === 'building') this._building(ctx, n, !!allocation.served?.[n.id], time, high, reduced); else this._equipment(ctx, n, state, time, high, reduced); ctx.restore(); }
    }
    ctx.restore();
    // Ports render above all scenery in CSS pixels; they cannot shrink below touch clarity.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const n of board.nodes) {
      const p = this.screen(n), state = allocation.nodes?.[n.id] || {}, selected = options.selectedId === n.id || options.drag?.fromId === n.id;
      const powered = n.type === 'building' ? !!allocation.served?.[n.id] : n.type === 'generator' ? n.capacity > 0 : (state.flow || 0) > 0;
      const constrained = state.constrained, radius = selected ? 11 : 8;
      if (selected) { ellipse(ctx, p.x, p.y, 17, 17, '#8df1e517'); ctx.strokeStyle = '#e4fff8'; ctx.lineWidth = 1.5; ctx.strokeRect(p.x - 15, p.y - 15, 30, 30); }
      ctx.setLineDash(!powered ? [2, 2] : []); ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, TAU); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = constrained ? C.amber : powered ? C.teal : '#8aa2ac'; ctx.stroke(); ctx.setLineDash([]);
      ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = constrained ? C.amber : powered ? '#e3f9df' : '#b5c8cf';
      const glyph = constrained ? '!' : n.type === 'building' ? powered ? '✓' : '○' : n.type === 'generator' ? '+' : n.type === 'battery' ? 'B' : n.type === 'switch' ? n.closed === false ? '/' : '−' : '◇'; ctx.fillText(glyph, p.x, p.y + .5);
      if (this.camera.zoom >= .42 || selected) {
        const label = n.type === 'building' ? `${n.demand} PU` : n.type === 'battery' ? `${Math.round((n.energy || 0) * 10) / 10} EU` : `${state.flow ? Math.round(state.flow * 10) / 10 + '/' : ''}${n.capacity || 0} PU`;
        const labelWidth = ctx.measureText(label).width + 12; ctx.fillStyle = '#07141eea'; ctx.fillRect(p.x - labelWidth / 2, p.y + 12, labelWidth, 15); ctx.fillStyle = powered ? '#c6e7df' : '#a5b8c1'; ctx.font = '9px system-ui'; ctx.fillText(label, p.x, p.y + 20);
      }
      if (selected) { const label = n.name || n.style || n.type, width = ctx.measureText(label).width + 20; ctx.fillStyle = '#102c38f2'; ctx.fillRect(p.x - width / 2, p.y - 41, width, 20); ctx.fillStyle = '#e2f8ee'; ctx.font = 'bold 10px system-ui'; ctx.fillText(label, p.x, p.y - 31); }
    }
    if (options.hint) {
      const hint=options.hint, source=nodes.get(hint.from||hint.nodeId), destination=nodes.get(hint.to);
      if(source){
        const a=this.screen(source),b=destination?this.screen(destination):null;
        if(b){ctx.setLineDash([8,6]);line(ctx,[[a.x,a.y],[b.x,b.y]],C.amber,3);ctx.setLineDash([]);const angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(angle);line(ctx,[[-9,-6],[0,0],[-9,6]],C.amber,3);ctx.restore();}
        for(const [point,label] of [[a,destination?'FROM':'CONTROL'],...(b?[[b,'TO']]:[])]){ctx.beginPath();ctx.arc(point.x,point.y,21,0,TAU);ctx.strokeStyle=C.amber;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=C.ink;ctx.fillRect(point.x-28,point.y-43,56,18);ctx.fillStyle=C.amber;ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(label,point.x,point.y-30);}
      }
    }
    if (options.drag?.fromId && nodes.has(options.drag.fromId) && options.drag.point) { const a = this.screen(nodes.get(options.drag.fromId)), b = options.drag.point; ctx.setLineDash([7, 5]); line(ctx, [[a.x, a.y], [b.x, b.y]], options.drag.valid === false ? C.red : C.cyan, 2.5); ctx.setLineDash([]); ellipse(ctx, b.x, b.y, 5, 5, options.drag.valid === false ? C.red : C.cyan); }
    if (options.celebration > 0 && !reduced) { const intensity = clamp(options.celebration, 0, 1); for (let i = 0; i < 24; i++) { const x = (hash(`c${i}`) % 1000) / 1000 * this.width, y = this.height - ((time * .025 + i * 47) % this.height); ctx.globalAlpha = intensity * .55; ellipse(ctx, x, y, 1.5, 1.5, i % 2 ? C.amber : C.teal); } ctx.globalAlpha = 1; }
    ctx.textBaseline = 'alphabetic'; this.metrics.drawnNodes = board.nodes.length; this.metrics.frameMs = (globalThis.performance?.now?.() || started) - started;
  }
}
