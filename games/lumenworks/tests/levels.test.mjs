import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, validateLevels, createSandbox } from '../levels.js';
import { allocate, advanceBatteries, connectionError, validateNetwork } from '../network.js';
import { Game } from '../game.js';

const clone = value => structuredClone(value);
const TITLES = ['First Light', 'The Riverside', 'Wake the Market', 'The Broken Line', 'Battery Night', 'The Tram Returns', 'Citywide Balance', 'The Grand Illumination', 'Harbor Lights', 'Hilltop Relay', 'Glasshouse Quarter', 'Night Shift', 'Festival of Lights'];

function runReference(level) {
  const board = clone(level);
  const initialEnergy = board.nodes.filter(n => n.type === 'battery').reduce((s, n) => s + n.energy, 0);
  let spent = 0, elapsed = 0, step = 0;
  function check() {
    const state = allocate(board);
    assert.deepEqual(state.warnings, [], `${level.title}: warning at reference step ${step}`);
    for (const edge of board.edges) assert.ok(state.edges[edge.id].flow <= edge.capacity + 1e-8);
    for (const node of board.nodes.filter(n => ['generator', 'substation', 'switch'].includes(n.type))) {
      assert.ok(state.nodes[node.id].flow <= node.capacity + 1e-8, `${node.id} respects capacity`);
    }
    return state;
  }
  check();
  for (const action of level.solution) {
    step++;
    if (action.type === 'cable') {
      assert.equal(connectionError(board, action.from, action.to), null, `${level.title}: cable ${action.from} → ${action.to}`);
      board.edges.push({ id: `reference-${step}`, from: action.from, to: action.to, capacity: board.constraints.cableCapacity, enabled: true, damaged: false, removable: true });
    } else if (action.type === 'remove-edge') {
      const edge = board.edges.find(e => e.id === action.id);
      assert.ok(edge && edge.removable !== false);
      board.edges = board.edges.filter(e => e.id !== action.id);
    } else if (action.type === 'switch') {
      const node = board.nodes.find(n => n.id === action.id);
      assert.equal(node?.type, 'switch');
      node.closed = action.closed;
    } else if (action.type === 'battery') {
      const node = board.nodes.find(n => n.id === action.id);
      assert.equal(node?.type, 'battery');
      assert.ok(['off', 'charge', 'support'].includes(action.mode));
      node.mode = action.mode;
    } else if (action.type === 'wait') {
      for (let t = 0; t < action.seconds - 1e-8; t += 0.25) {
        const dt = Math.min(0.25, action.seconds - t);
        const state = advanceBatteries(board, dt);
        assert.deepEqual(state.warnings, [], `${level.title}: stable hold`);
        for (const id of level.objectives.required) assert.equal(state.served[id], true, `${id} powered throughout hold`);
        spent += state.batteryUsed * dt;
        elapsed += dt;
        for (const battery of board.nodes.filter(n => n.type === 'battery')) assert.ok(battery.energy >= -1e-8 && battery.energy <= battery.maxEnergy + 1e-8);
      }
    } else assert.fail(`Unknown reference action ${action.type}`);
    check();
  }
  const result = check();
  for (const id of level.objectives.required) assert.equal(result.served[id], true, `${level.title}: required ${id} powered`);
  assert.ok(elapsed >= (level.objectives.holdSeconds || 0));
  assert.ok(board.edges.length <= level.starBudget, `${level.title}: achievable three-star cable budget`);
  assert.ok(board.edges.length <= board.constraints.maxCables);
  const remaining = board.nodes.filter(n => n.type === 'battery').reduce((s, n) => s + n.energy, 0);
  assert.ok(Math.abs(initialEnergy - remaining - spent) < 1e-7, `${level.title}: finite energy conserved`);
  return { board, result, spent, elapsed, remaining };
}

test('thirteen authored levels have unique valid layouts, references and ordered lessons', () => {
  assert.deepEqual(LEVELS.map(l => l.title), TITLES);
  assert.equal(new Set(LEVELS.map(l => l.id)).size, TITLES.length);
  assert.deepEqual(validateLevels(), { ok: true, errors: [] });
  for (const level of LEVELS) {
    assert.deepEqual(validateNetwork(level), { ok: true, errors: [] }, level.title);
    assert.equal(level.width, 12);
    assert.equal(level.height, 10);
    assert.ok(level.tutorial.length > 0 && level.hint.length > 0);
    assert.ok(new Set(level.nodes.map(n => `${n.x},${n.y}`)).size === level.nodes.length);
    assert.ok(level.nodes.every(n => n.x >= 0 && n.y >= 0 && n.x < 12 && n.y < 10));
    assert.ok(level.objectives.required.length > 0);
    for (const id of level.objectives.required) assert.equal(level.nodes.find(n => n.id === id)?.type, 'building');
  }
  assert.deepEqual([...new Set(LEVELS.flatMap(l => l.nodes.filter(n => n.type === 'building').map(n => n.style)))].sort(), ['apartment', 'factory', 'house', 'market', 'public', 'shop', 'tram']);
  assert.ok(!LEVELS.slice(0, 2).some(l => l.nodes.some(n => n.type === 'substation')));
  assert.ok(!LEVELS.slice(0, 4).some(l => l.nodes.some(n => n.type === 'battery')));
});

for (const title of TITLES) test(`${title}: exact reference completes objectives with zero historical warnings and three stars`, () => {
  runReference(LEVELS.find(l => l.title === title));
});

test('every authored reference also completes through the real Game controller', () => {
  for (const level of LEVELS) {
    const game = new Game(level);
    assert.deepEqual(game.allocation.warnings, [], `${level.title}: initial state`);
    for (const action of level.solution) {
      const tool = action.type === 'remove-edge' ? 'inspect' : action.type;
      if (action.type !== 'wait') assert.ok(level.availableTools.includes(tool), `${level.title}: action tool available`);
      assert.equal(game.act(action).ok, true, `${level.title}: ${JSON.stringify(action)}`);
      assert.deepEqual(game.allocation.warnings, [], `${level.title}: clean controller state`);
      assert.equal(game.hadOverload, false, `${level.title}: no historical warning`);
    }
    assert.equal(game.ready, true, `${level.title}: ready after exact actions`);
    assert.equal(game.stars, 3, `${level.title}: three real stars`);
  }
});

test('expansion reserves are finite and the existing workshop branch needs isolation', () => {
  for (const index of [10, 12]) {
    const { board, spent, remaining } = runReference(LEVELS[index]);
    assert.equal(spent, index === 10 ? 12 : 32);
    assert.equal(remaining, 8);
    for (let i = 0; i < 24; i++) advanceBatteries(board, .25);
    assert.equal(board.nodes.find(n => n.type === 'battery').energy, 0);
    assert.ok(board.objectives.required.some(id => !allocate(board).served[id]));
  }
  const shift = LEVELS[11];
  assert.equal(allocate(shift).served['shift-old-workshop'], true);
  const { board, result } = runReference(shift);
  assert.equal(result.served['shift-old-workshop'], false);
  board.nodes.find(n => n.id === 'shift-workshop-gate').closed = true;
  assert.ok(allocate(board).warnings.length > 0, 'leaving optional workshop connected causes a capacity warning');
  assert.ok(connectionError(clone(LEVELS[12]), 'festival-north', 'festival-south-hub'), 'festival garden blocks a cross-city shortcut');
});

test('Battery Night has an eight-second finite reserve and untimed planning', () => {
  const level = LEVELS[4];
  assert.equal(level.objectives.holdSeconds, 8);
  const { spent, remaining, board } = runReference(level);
  assert.equal(spent, 32);
  assert.equal(remaining, 8);
  const energy = board.nodes.find(n => n.type === 'battery').energy;
  for (let i = 0; i < 20; i++) allocate(board);
  assert.equal(board.nodes.find(n => n.type === 'battery').energy, energy);
  for (let i = 0; i < 12; i++) advanceBatteries(board, 0.25);
  assert.ok(board.nodes.find(n => n.type === 'battery').energy === 0);
  assert.ok(board.objectives.required.some(id => !allocate(board).served[id]), 'finite energy eventually stops supplying the full district');
});

test('authored restrictions make damage, optional demand and impassable areas matter', () => {
  const river = runReference(LEVELS[1]);
  assert.equal(river.result.served['riverside-shop'], false, 'optional shop consumes scarce capacity and is not required');
  const damaged = runReference(LEVELS[3]);
  assert.equal(damaged.result.edges['broken-feeder'].flow, 0);
  assert.ok(connectionError(clone(LEVELS[3]), 'old-generator', 'library'), 'canal rejects a tempting diagonal shortcut');
  assert.ok(connectionError(clone(LEVELS[7]), 'north-generator', 'south-hub'), 'central garden rejects a cross-city shortcut');
});

test('sandbox starts independent, unconnected and editable with bounded capacities', () => {
  const first = createSandbox(), second = createSandbox();
  assert.deepEqual(validateNetwork(first), { ok: true, errors: [] });
  assert.equal(first.id, 'sandbox');
  assert.equal(first.edges.length, 0);
  assert.deepEqual(first.objectives.required, []);
  assert.equal(first.objectives.holdSeconds, 0);
  assert.deepEqual(first.nodes.map(n => n.type).sort(), ['building', 'generator', 'substation']);
  assert.ok(first.nodes.filter(n => n.capacity).every(n => Number.isFinite(n.capacity) && n.capacity <= 64));
  first.nodes[0].capacity = 1;
  assert.notEqual(first.nodes[0].capacity, second.nodes[0].capacity);
  assert.equal(allocate(first).totalServed, 0);
});
