import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Run the actual shipped script. Canvas calls are recorded because Node has no
// browser rasterizer; these tests measure submitted work, not device FPS.
function boot({ mobile = true, file = new URL('../games/kaleido-drift/index.html', import.meta.url) } = {}) {
  const calls = [];
  const elements = new Map();
  const listeners = new Map();
  const bitmaps = [];
  function element() {
    const el = { width: 0, height: 0, style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      addEventListener() {}, setAttribute() {}, appendChild() {}, getBoundingClientRect() { return { left: 0, top: 0 }; } };
    const ctx = new Proxy({}, { get(o, k) { return k in o ? o[k] : (...args) => { calls.push({ kind: k, args, canvas: el }); if (k === 'createRadialGradient') return { addColorStop() {} }; }; }, set(o,k,v) { o[k]=v; return true; } });
    el.getContext = () => ctx;
    return el;
  }
  const document = { hidden: false, readyState: 'loading', body: element(),
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element, querySelectorAll: () => [], addEventListener(name, fn) { listeners.set(name, fn); } };
  const window = { innerWidth: 412, innerHeight: 915, devicePixelRatio: 2.625, matchMedia: q => ({ matches: mobile && q.includes('pointer: coarse') }), addEventListener() {} };
  const context = vm.createContext({ document, window, performance: { now: () => 0 }, requestAnimationFrame() {}, cancelAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, localStorage: { getItem() { return null; }, setItem() {} },
    createImageBitmap: async () => { const b = { closed: false, close() { this.closed = true; } }; bitmaps.push(b); return b; } });
  let html = readFileSync(file, 'utf8');
  const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  vm.runInContext(script.replace(/\}\)\(\);\s*$/, `this.game = { init, S, resizeCanvases, processStrokeSegment, onPointerDown, onPointerMove, onPointerUp, updateRotationAndDrift, markContent, loop, clearCanvas, pushUndoSnapshot, undo, updateParticles, particles, effectiveMaxParticles, toLocalXY, get state() { return { W, H, dpr, artCanvas, undoStack }; } }; })();`), context);
  context.game.init();
  calls.length = 0;
  return { g: context.game, calls, window, document, listeners, bitmaps };
}

test('mobile canvas limits pixel work without changing touch alignment', () => {
  const { g } = boot();
  assert.ok(g.state.W * g.state.H < 650000);
  const p = g.toLocalXY({ clientX: 206, clientY: 457.5 });
  assert.ok(Math.abs(p.x - g.state.W / 2) <= 0.5);
  assert.ok(Math.abs(p.y - g.state.H / 2) <= 0.5);
});

test('continuous brushes do not subdivide a straight input into redundant blurred strokes', () => {
  for (const brush of ['ribbon', 'glass', 'spark']) {
    const { g, calls } = boot();
    g.S.brush = brush; g.S.symmetry = 24;
    const p = { last: { x: 100, y: 100, t: 0 }, stampAcc: 0 };
    g.processStrokeSegment(p, { x: 300, y: 100 }, 16);
    assert.ok(calls.filter(c => c.kind === 'stroke').length <= 24, brush);
    assert.equal(p.last.x, 300);
  }
});

test('stamp brushes still interpolate across long moves', () => {
  const { g, calls } = boot(); g.S.brush = 'dots'; g.S.symmetry = 4;
  g.processStrokeSegment({ last: { x: 0, y: 0, t: 0 } }, { x: 300, y: 0 }, 16);
  assert.ok(calls.filter(c => c.kind === 'arc').length > 4);
});

test('spark budget includes all mirror copies', () => {
  const { g } = boot(); g.S.symmetry = 24;
  for (let i = 0; i < 260; i++) g.particles.push({ x: 1, y: 1, vx: 0, vy: 0, life: 0, maxLife: 900, size: 2, color: '#ffffff' });
  g.updateParticles(16);
  assert.ok(g.particles.length * 24 <= 384);
});

test('drift skips empty artwork and uses only one full-canvas image copy', () => {
  const { g, calls } = boot();
  g.updateRotationAndDrift(16);
  assert.equal(calls.filter(c => c.kind === 'drawImage').length, 0);
  g.markContent(); calls.length = 0; g.updateRotationAndDrift(16);
  assert.equal(calls.filter(c => c.kind === 'drawImage').length, 1);
});

test('120Hz callbacks do not double render work', () => {
  const { g, calls } = boot();
  for (let i = 1; i <= 120; i++) g.loop(i * 1000 / 120);
  const renders = calls.filter(c => c.kind === 'drawImage').length;
  assert.ok(renders >= 55 && renders <= 61, String(renders));
});

test('clear releases undo bitmap memory including snapshots still pending', async () => {
  const { g, bitmaps } = boot();
  await g.pushUndoSnapshot();
  const pending = g.pushUndoSnapshot();
  g.clearCanvas(); await pending;
  assert.equal(g.state.undoStack.length, 0);
  assert.ok(bitmaps.every(b => b.closed));
});

test('undo history stays within mobile memory budget and releases evicted images', async () => {
  const { g, bitmaps } = boot();
  for (let i = 0; i < 20; i++) await g.pushUndoSnapshot();
  assert.ok(g.state.undoStack.length * g.state.W * g.state.H * 4 <= 24 * 1024 * 1024);
  assert.ok(bitmaps.some(b => b.closed));
  g.undo(); assert.ok(bitmaps.at(-1).closed);
});

test('empty coalesced input still draws and hidden pages submit no frames', () => {
  const { g, calls, document, listeners } = boot();
  const e = { pointerId: 1, pointerType: 'touch', clientX: 50, clientY: 50, timeStamp: 0, preventDefault() {} };
  g.onPointerDown(e); calls.length = 0;
  g.onPointerMove({ ...e, clientX: 150, timeStamp: 16, getCoalescedEvents: () => [] });
  assert.ok(calls.some(c => c.kind === 'stroke'));
  calls.length = 0; document.hidden = true; listeners.get('visibilitychange')(); g.loop(1000);
  assert.equal(calls.length, 0);
});

test('rotation swaps preserve the last frame as the next source', () => {
  const { g, calls } = boot(); g.markContent();
  const original = g.state.artCanvas;
  g.updateRotationAndDrift(16);
  const rotated = g.state.artCanvas;
  assert.notEqual(rotated, original);
  calls.length = 0; g.updateRotationAndDrift(16);
  assert.equal(calls.find(c => c.kind === 'drawImage').args[0], rotated);
  assert.equal(g.state.artCanvas, original);
});

test('resize preserves art but releases stale undo and particle coordinates', async () => {
  const { g, calls, window, bitmaps } = boot(); g.markContent();
  await g.pushUndoSnapshot();
  window.innerWidth = 915; window.innerHeight = 412;
  g.resizeCanvases();
  assert.ok(g.state.W > g.state.H);
  assert.ok(calls.some(c => c.kind === 'drawImage' && c.args.length === 9));
  assert.ok(bitmaps.every(b => b.closed));
  assert.equal(g.state.undoStack.length, 0);
});

export { boot };
