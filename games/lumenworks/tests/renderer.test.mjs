import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../renderer.js';

function fixture() {
  const calls = [];
  const context = new Proxy({ measureText: text => ({ width: text.length * 5 }), createRadialGradient: () => ({ addColorStop() {} }) }, { get(target, key) { return key in target ? target[key] : (...args) => calls.push([key, ...args]); } });
  const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ width: 1280, height: 800 }), getContext: () => context };
  const renderer = new Renderer(canvas);
  const board = { id: 'renderer-fixture', width: 12, height: 10, obstacles: [], nodes: [
    { id: 'g', type: 'generator', x: 2, y: 2, capacity: 10 },
    ...['house', 'apartment', 'market', 'shop', 'tram', 'factory', 'public'].map((style, i) => ({ id: style, type: 'building', style, x: i + 3, y: i % 3 + 3, demand: 1 })),
    { id: 's', type: 'switch', x: 4, y: 2, capacity: 10, closed: false },
    { id: 'b', type: 'battery', x: 5, y: 2, energy: 4, maxEnergy: 8, mode: 'support' },
    { id: 'sub', type: 'substation', x: 6, y: 2, capacity: 10 }
  ], edges: [{ id: 'e', from: 'g', to: 'house', capacity: 5, enabled: true }] };
  renderer.fit(board);
  return { renderer, board, calls };
}

test('hint draws distinct FROM and TO ports without powering or changing the network',()=>{
 const {renderer,board,calls}=fixture(),before=JSON.stringify(board);renderer.draw(board,{}, {reduced:true,hint:{from:'g',to:'house'}});assert.equal(JSON.stringify(board),before);assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='FROM'));assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='TO'));assert.equal(renderer.metrics.activePulses,0);
});

test('projection round trips and zoom preserves the world point under the cursor', () => {
  const { renderer } = fixture();
  for (const zoom of [.25, .73, 1, 2.4]) { renderer.camera.zoom = zoom; for (let x = 0; x < 12; x += .7) for (let y = 0; y < 10; y += .9) { const screen = renderer.screen({ x, y }), world = renderer.world(screen.x, screen.y); assert.ok(Math.abs(world.x - x) < 1e-10); assert.ok(Math.abs(world.y - y) < 1e-10); } }
  const before = renderer.world(400, 320); renderer.zoomAt(.5, 400, 320); const after = renderer.world(400, 320); assert.ok(Math.abs(before.x - after.x) < 1e-10); assert.ok(Math.abs(before.y - after.y) < 1e-10);
});

test('forward ports retain a 22 CSS pixel hit target at low zoom, with nearest selection', () => {
  const { renderer, board } = fixture(); renderer.camera.zoom = .25;
  const isolated = { nodes: [board.nodes[0]] }, point = renderer.screen(isolated.nodes[0]);
  assert.equal(renderer.hitNode(point.x + 21.9, point.y, isolated)?.id, 'g'); assert.equal(renderer.hitNode(point.x + 22.1, point.y, isolated), null);
  const pair = { nodes: [board.nodes[0], { id: 'near', x: 2.5, y: 2 }] }, p = renderer.screen(pair.nodes[1]); assert.equal(renderer.hitNode(p.x, p.y, pair).id, 'near');
});

test('fit respects visible HUD insets and cable hit test uses the same projected geometry', () => {
  const { renderer, board } = fixture(); renderer.fit(board, { left: 30, top: 110, right: 280, bottom: 95 });
  for (const n of board.nodes) { const p = renderer.screen(n); assert.ok(p.x >= 30 && p.x <= 1000); assert.ok(p.y >= 110 && p.y <= 705); }
  const a = renderer.screen(board.nodes[0]), b = renderer.screen(board.nodes[1]); assert.equal(renderer.hitEdge((a.x + b.x) / 2, (a.y + b.y) / 2, board)?.id, 'e'); renderer.pan(30, -20); assert.deepEqual(renderer.screen(board.nodes[0]), { x: a.x + 30, y: a.y - 20 });
});

test('all building and equipment variants render without changing board/allocation', () => {
  const { renderer, board } = fixture(), allocation = { nodes: { b: { flow: 1 }, sub: { flow: 2 } }, served: Object.fromEntries(board.nodes.filter(n => n.type === 'building').map(n => [n.id, true])), edges: { e: { flow: 3, enabled: true } } };
  const before = JSON.stringify({ board, allocation }); renderer.draw(board, allocation, { time: 1000, selectedId: 'g', celebration: .5 }); renderer.draw(board, allocation, { quality: 'low', reduced: true });
  assert.equal(JSON.stringify({ board, allocation }), before); assert.equal(renderer.metrics.drawnNodes, 11); assert.equal(renderer.metrics.activePulses, 0);
});

test('pulse animations require actual usable flow and never run on damaged/disabled cables', () => {
  const { renderer, board } = fixture();
  renderer.draw(board, { edges: { e: { flow: 3 } } }); assert.ok(renderer.metrics.activePulses > 0);
  board.edges[0].damaged = true; renderer.draw(board, { edges: { e: { flow: 3 } } }); assert.equal(renderer.metrics.activePulses, 0);
  board.edges[0].damaged = false; board.edges[0].enabled = false; renderer.draw(board, { edges: { e: { flow: 3 } } }); assert.equal(renderer.metrics.activePulses, 0);
  board.edges[0].enabled = true; renderer.draw(board, { edges: { e: { flow: 0 } } }); assert.equal(renderer.metrics.activePulses, 0);
});

test('static terrain cache rebuilds on topology/obstacle changes and is bounded', () => {
  const previous = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return new Proxy({ createRadialGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => key in target ? target[key] : () => {} }); } };
  try {
    const { renderer, board } = fixture(); renderer.draw(board); renderer.draw(board);
    assert.equal(renderer.metrics.cacheBuilds, 1); assert.equal(renderer.metrics.cityCacheBuilds, 1); assert.ok(renderer._cache.width < 1500); assert.ok(renderer._cityCache.canvas.width < 2000);
    // A served-load change invalidates windows but leaves the road layer intact.
    renderer.draw(board, { served: { house: true } }); assert.equal(renderer.metrics.cityCacheBuilds, 2); assert.equal(renderer.metrics.cacheBuilds, 1);
    renderer.draw(board, { served: { house: true } }); assert.equal(renderer.metrics.cityCacheBuilds, 2);
    board.nodes[0].x++; renderer.draw(board); assert.equal(renderer.metrics.cacheBuilds, 2);
    board.obstacles.push({ x: 2, y: 2, w: 1, h: 1 }); renderer.draw(board); assert.equal(renderer.metrics.cacheBuilds, 3);
  }
  finally { if (previous) globalThis.OffscreenCanvas = previous; else delete globalThis.OffscreenCanvas; }
});
