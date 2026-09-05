import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Execute the shipped application; record the GPU boundary and control time.
// These measure submitted work and input behavior, not physical-device FPS.
function boot(mobile = true) {
  let now = 0, serial = 0, draws = 0;
  const frames = new Map(), timers = new Map(), elements = new Map();
  const target = () => ({ listeners: {}, addEventListener(k, f) { this.listeners[k] = f; },
    removeEventListener() {}, fire(k, e = {}) { this.listeners[k]?.(e); } });
  const gl = new Proxy({ createShader: () => ({}), createProgram: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true,
    drawArrays: () => { draws++; } }, { get: (o, k) => o[k] ?? (() => {}) });
  const element = () => Object.assign(target(), { clientWidth: 412, clientHeight: 915,
    style: {}, dataset: {}, relList: { supports: () => true },
    classList: { add() {}, remove() {}, toggle() {} }, appendChild() {},
    setAttribute() {}, querySelectorAll: () => [], setPointerCapture() {},
    releasePointerCapture() {}, getContext: () => gl });
  const document = Object.assign(target(), { hidden: false, createElement: element,
    querySelectorAll: () => [], getElementById(id) {
      if (!elements.has(id)) elements.set(id, element()); return elements.get(id);
    } });
  const window = Object.assign(target(), { innerWidth: 412, innerHeight: 915,
    devicePixelRatio: 2.625, matchMedia: () => ({ matches: mobile }),
    setTimeout(f, ms) { const id = ++serial; timers.set(id, { f, at: now + ms }); return id; },
    clearTimeout(id) { timers.delete(id); } });
  const context = vm.createContext({ document, window, performance: { now: () => now },
    requestAnimationFrame(f) { const id = ++serial; frames.set(id, f); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    localStorage: { getItem: () => null, setItem() {} } });
  const html = readFileSync(new URL('../games/mandelbrot-explorer/index.html', import.meta.url), 'utf8');
  const asset = html.match(/src="\.\/assets\/([^"?]+)/)[1];
  vm.runInContext(readFileSync(new URL(`../games/mandelbrot-explorer/assets/${asset}`, import.meta.url), 'utf8'), context);
  function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.f(); }
      const pending = [...frames.values()]; frames.clear(); pending.forEach(f => f(now));
    }
  }
  return { tick, window, document, canvas: elements.get('fractal-canvas'),
    click(id) { elements.get(id).fire('click'); },
    read(code) { return vm.runInContext(code, context); },
    get draws() { return draws; }, get pending() { return frames.size; } };
}
const pointer = (x = 100, id = 1) => ({ pointerId: id, pointerType: 'touch', clientX: x, clientY: 250 });

test('settled views stop requesting animation frames and controls wake rendering', () => {
  const b = boot(); b.tick(60); assert.equal(b.pending, 0);
  const before = b.draws; b.click('btn-iter-up'); b.tick(); assert.equal(b.draws, before + 1);
  b.click('btn-zoom-in'); b.tick(180);
  assert.ok(b.read('h.scale') < 1.5); assert.equal(b.pending, 0);
});

test('holding still submits no repeated draws, drag and pinch wake the renderer', () => {
  const b = boot(); b.tick(); b.canvas.fire('pointerdown', pointer()); b.tick();
  const held = b.draws; b.tick(60); assert.equal(b.draws, held);
  b.window.fire('pointermove', pointer(180)); b.tick(); assert.ok(b.draws > held);
  const dragged = b.draws; b.canvas.fire('pointerdown', pointer(250, 2)); b.tick();
  b.window.fire('pointermove', pointer(300, 2)); b.tick(); assert.ok(b.draws > dragged);
  b.window.fire('pointerup', pointer(300, 2)); b.window.fire('pointerup', pointer(180));
  b.tick(30); assert.equal(b.pending, 0);
});

test('mobile pixel budget falls below 650k while desktop retains high density', () => {
  const mobile = boot(); mobile.tick();
  assert.ok(mobile.canvas.width * mobile.canvas.height < 650000);
  const desktop = boot(false); desktop.tick();
  assert.equal(desktop.canvas.width, 824); assert.equal(desktop.canvas.height, 1830);
  assert.equal(mobile.read('h.screenToComplex(206,457.5,{width:412,height:915}).x'), -.5);
});

test('hidden views stay asleep even if invalidated and repaint when visible', () => {
  const b = boot(); b.tick(); b.document.hidden = true; b.document.fire('visibilitychange');
  const before = b.draws; b.window.fire('resize'); b.tick(60);
  assert.equal(b.draws, before); assert.equal(b.pending, 0);
  b.document.hidden = false; b.document.fire('visibilitychange'); b.tick();
  assert.equal(b.draws, before + 1);
});

test('wheel input during a held pointer does not leave interaction stuck active', () => {
  const b = boot(); b.tick(); b.canvas.fire('pointerdown', pointer());
  b.canvas.fire('wheel', { ...pointer(), deltaY: -50, preventDefault() {} });
  b.window.fire('pointerup', pointer()); b.tick(240);
  assert.equal(b.read('I'), false); assert.equal(b.pending, 0);
});

test('interior shortcut only accepts points whose reference orbit stays bounded', () => {
  const b = boot();
  // Execute the scalar GLSL predicate as JS against independent orbit results.
  const shader = b.read('pt');
  const body = shader.match(/bool knownInterior\(float cx, float cy\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(body, 'shader needs a conservative interior shortcut');
  const inside = new Function('cx', 'cy', body.replace(/\bfloat\b/g, 'let'));
  assert.equal(inside(0, 0), true); assert.equal(inside(-1, 0), true);
  assert.equal(inside(.25, 0), false); assert.equal(inside(-.75, 0), false);
  assert.equal(inside(1, 1), false);
  let skipped = 0;
  for (let y = -1.5; y <= 1.5; y += .025) for (let x = -2; x <= 1; x += .025) {
    if (!inside(x, y)) continue;
    skipped++;
    let zr = x, zi = y;
    for (let i = 0; i < 1000; i++) {
      const next = zr * zr - zi * zi + x; zi = 2 * zr * zi + y; zr = next;
      assert.ok(zr * zr + zi * zi <= 256, `false interior at ${x}, ${y}`);
    }
  }
  assert.ok(skipped > 1800, 'overview should skip a substantial solid interior');
});
