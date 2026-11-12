import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../input.js';

class FakeCanvas {
  style = { touchAction: 'pan-y' };
  listeners = new Map();
  captured = new Set();
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  getBoundingClientRect() { return { left: 10, top: 20 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); this.emit('lostpointercapture', { pointerId: id }); }
  emit(type, properties = {}) {
    const event = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20, prevented: false, preventDefault() { this.prevented = true; }, ...properties };
    for (const fn of this.listeners.get(type) || []) fn(event);
    return event;
  }
  pointer(type, x, y, properties = {}) { return this.emit(type, { clientX: x + 10, clientY: y + 20, ...properties }); }
}

function fixture() {
  const canvas = new FakeCanvas();
  const board = { width: 12, height: 10, nodes: [
    { id: 'g', type: 'generator', x: 1, y: 1, capacity: 8 },
    { id: 'h', type: 'building', x: 4, y: 1, demand: 2, style: 'house' },
    { id: 's', type: 'substation', x: 2, y: 3, capacity: 8 }
  ], edges: [{ id: 'existing', from: 's', to: 'h', capacity: 8, enabled: true }], obstacles: [], constraints: { maxLength: 10, maxCables: 8, cableCapacity: 8 } };
  const state = { tool: 'cable', active: true, connected: [], invalid: [], nodes: [], edges: [], placed: [], pans: [], zooms: [] };
  const renderer = {
    height: 800,
    screen: n => ({ x: n.x * 50, y: n.y * 50 }),
    hitNode(x, y, b) { return b.nodes.map(n => ({ node: n, d: Math.hypot(n.x * 50 - x, n.y * 50 - y) })).filter(n => n.d <= 22).sort((a, b) => a.d - b.d)[0]?.node || null; },
    hitEdge: (x, y) => Math.hypot(x - 150, y - 100) <= 12 ? board.edges[0] : null,
    world: (x, y) => ({ x: x / 50, y: y / 50 }),
    pan: (...args) => state.pans.push(args), zoomAt: (...args) => state.zooms.push(args)
  };
  const input = new Input(canvas, renderer, { board: () => board, tool: () => state.tool, active: () => state.active,
    connect: (...args) => state.connected.push(args), invalid: message => state.invalid.push(message),
    node: n => state.nodes.push(n.id), edge: e => state.edges.push(e.id), place: p => state.placed.push(p) });
  const tap = (x, y, props = {}) => { canvas.pointer('pointerdown', x, y, props); canvas.pointer('pointerup', x, y, props); };
  return { canvas, board, state, renderer, input, tap };
}

test('mouse cable drag validates the actual network and uses canvas-local coordinates', () => {
  const { canvas, input, state } = fixture();
  assert.equal(canvas.pointer('pointerdown', 50, 50).prevented, true);
  assert.deepEqual([...canvas.captured], [1]);
  canvas.pointer('pointermove', 200, 50);
  assert.deepEqual(input.drag, { fromId: 'g', point: { x: 200, y: 50 }, valid: true });
  canvas.pointer('pointerup', 200, 50);
  assert.deepEqual(state.connected, [['g', 'h']]); assert.equal(input.drag, null); assert.equal(canvas.captured.size, 0);
});

test('touch tap source then target connects, while tapping the selected source cancels', () => {
  const { input, state, tap } = fixture(), touch = { pointerType: 'touch', pointerId: 7 };
  tap(50, 50, touch); assert.equal(input.drag.fromId, 'g');
  tap(200, 50, touch); assert.deepEqual(state.connected, [['g', 'h']]); assert.equal(input.drag, null);
  tap(50, 50, touch); tap(50, 50, touch); assert.equal(input.drag, null); assert.equal(state.connected.length, 1);
});

test('invalid starts, duplicate connections and missed ports never dispatch connect', () => {
  const { input, state, tap, canvas } = fixture();
  tap(200, 50); assert.match(state.invalid.at(-1), /Start a cable/); assert.equal(input.drag, null);
  tap(100, 150); tap(200, 50); assert.ok(state.invalid.at(-1).length); assert.equal(input.drag.valid, false);
  input.cancel(); canvas.pointer('pointerdown', 50, 50); canvas.pointer('pointermove', 300, 300); canvas.pointer('pointerup', 300, 300);
  assert.match(state.invalid.at(-1), /destination port/); assert.equal(state.connected.length, 0);
});

test('two-touch pinch zooms around its moving center and suppresses actions until every finger lifts', () => {
  const { canvas, input, state, tap } = fixture(), t1 = { pointerType: 'touch', pointerId: 1 }, t2 = { pointerType: 'touch', pointerId: 2 };
  canvas.pointer('pointerdown', 50, 50, t1); canvas.pointer('pointerdown', 200, 50, t2);
  assert.equal(input.drag, null);
  canvas.pointer('pointermove', 250, 70, t2);
  assert.equal(state.zooms.length, 1); assert.ok(state.zooms[0][0] > 1); assert.deepEqual(state.zooms[0].slice(1), [150, 60]); assert.deepEqual(state.pans[0], [25, 10]);
  canvas.pointer('pointerup', 250, 70, t2); canvas.pointer('pointermove', 200, 50, t1); canvas.pointer('pointerup', 200, 50, t1);
  assert.equal(state.connected.length, 0); assert.equal(input.drag, null); assert.equal(canvas.captured.size, 0);
  tap(50, 50, t1); tap(200, 50, t1); assert.equal(state.connected.length, 1);
});

test('pointer cancel, lost capture, Escape and inactive overlays clear pending connections', () => {
  const { canvas, input, state, tap } = fixture();
  canvas.pointer('pointerdown', 50, 50); canvas.emit('pointercancel'); assert.equal(input.drag, null); assert.equal(canvas.captured.size, 0);
  canvas.pointer('pointerdown', 50, 50); canvas.emit('lostpointercapture'); assert.equal(input.drag, null);
  tap(50, 50); canvas.emit('keydown', { key: 'Escape' }); assert.equal(input.drag, null);
  tap(50, 50); state.active = false; tap(200, 50); assert.equal(input.drag, null); assert.equal(state.connected.length, 0);
  state.active = true; tap(200, 50); assert.equal(state.connected.length, 0);
});

test('background movement pans after the threshold and suppresses click inspection', () => {
  const { canvas, state } = fixture(); state.tool = 'inspect';
  canvas.pointer('pointerdown', 300, 300); canvas.pointer('pointermove', 303, 300); assert.equal(state.pans.length, 0);
  canvas.pointer('pointermove', 310, 300); canvas.pointer('pointerup', 310, 300); assert.deepEqual(state.pans, [[7, 0]]); assert.equal(state.nodes.length, 0);
  canvas.pointer('pointerdown', 50, 50); canvas.pointer('pointermove', 100, 50); canvas.pointer('pointerup', 100, 50); assert.equal(state.nodes.length, 0); assert.equal(state.pans.length, 1);
});

test('inspection prioritizes ports, placement passes world coordinates and tool changes discard queued sources', () => {
  const { state, tap, input } = fixture();
  tap(50, 50); assert.ok(input.drag); state.tool = 'inspect'; tap(50, 50); assert.equal(input.drag, null); assert.deepEqual(state.nodes, ['g']);
  tap(150, 100); assert.deepEqual(state.edges, ['existing']); state.tool = 'place'; tap(300, 250); assert.deepEqual(state.placed, [{ x: 6, y: 5 }]);
});

test('wheel zoom prevents page scrolling, bounds extreme deltas and is disabled under overlays', () => {
  const { canvas, state } = fixture();
  const wheel = canvas.emit('wheel', { clientX: 210, clientY: 120, deltaY: -100, deltaMode: 0 }); assert.equal(wheel.prevented, true); assert.ok(state.zooms[0][0] > 1); assert.deepEqual(state.zooms[0].slice(1), [200, 100]);
  canvas.emit('wheel', { deltaY: 100000, deltaMode: 2 }); assert.ok(state.zooms[1][0] > 0); state.active = false;
  const inactive = canvas.emit('wheel', { deltaY: -100 }); assert.equal(inactive.prevented, false); assert.equal(state.zooms.length, 2);
});

test('dispose releases captured touches, removes handlers and restores the original touch behavior', () => {
  const { canvas, input } = fixture(); canvas.pointer('pointerdown', 50, 50, { pointerType: 'touch' }); assert.equal(canvas.style.touchAction, 'none'); input.dispose();
  assert.equal(canvas.captured.size, 0); assert.equal(input.drag, null); assert.equal(canvas.style.touchAction, 'pan-y'); assert.equal([...canvas.listeners.values()].reduce((n, handlers) => n + handlers.size, 0), 0);
});
