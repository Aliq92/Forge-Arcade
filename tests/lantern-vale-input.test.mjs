import test from 'node:test';
import assert from 'node:assert/strict';
import { InputSystem, setupTouchControls } from '../games/lantern-vale/js/input.js';

function harness(run) {
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  class Element extends EventTarget {
    classList = { add() {}, remove() {} };
    style = {};
  }
  const elements = new Map();
  globalThis.window = new EventTarget();
  window.ontouchstart = null;
  window.PointerEvent = Event;
  globalThis.document = { body: new Element(), getElementById(id) {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  } };
  try {
    const input = new InputSystem(null);
    setupTouchControls(input);
    run(input, elements);
  } finally { globalThis.window = oldWindow; globalThis.document = oldDocument; }
}

test('pointer press queues exactly one flare while moving', () => harness((input, elements) => {
  input.touch.move = { active: true, dx: 1, dy: 0 };
  elements.get('touch-flare').dispatchEvent(new Event('pointerdown', { cancelable: true }));
  assert.equal(input.wantsFlare(), true);
  assert.equal(input.wantsFlare(), false);
  assert.deepEqual(input.getMoveAxis(), { x: 1, y: 0 });
}));

test('keyboard or assistive button click queues a flare', () => harness((input, elements) => {
  const click = new Event('click');
  Object.defineProperty(click, 'detail', { value: 0 });
  elements.get('touch-flare').dispatchEvent(click);
  assert.equal(input.wantsFlare(), true);
}));

import { UI } from '../games/lantern-vale/js/ui.js';
import { Lantern } from '../games/lantern-vale/js/lantern.js';

test('flare button explains cooldown and insufficient energy, then becomes ready', () => {
  const previous = globalThis.document;
  const elements = new Map();
  const label = { textContent: 'Flare' };
  const attrs = new Map();
  const button = { querySelector: () => label, setAttribute: (k, v) => attrs.set(k, v), classList: { toggle() {} } };
  globalThis.document = { getElementById(id) {
    if (id === 'touch-flare') return button;
    if (!elements.has(id)) elements.set(id, { style: {}, classList: { toggle() {} }, childElementCount: 0, children: [] });
    return elements.get(id);
  } };
  const ui = Object.create(UI.prototype);
  ui.game = { stats: { fireflies: 0 } };
  ui._drawMinimap = ui._updateCompass = () => {};
  const player = { lantern: new Lantern(), maxHealth: 0 };
  try {
    player.lantern.flareCooldown = 8.1;
    ui.updateHUD(player);
    assert.equal(label.textContent, '9s');
    assert.equal(attrs.get('aria-disabled'), 'true');
    player.lantern.flareCooldown = 0;
    player.lantern.energy = 10;
    ui.updateHUD(player);
    assert.equal(label.textContent, 'Low energy');
    player.lantern.energy = 100;
    ui.updateHUD(player);
    assert.equal(label.textContent, 'Flare');
    assert.equal(attrs.get('aria-disabled'), 'false');
  } finally { globalThis.document = previous; }
});

test('a compatibility click after pointerdown does not queue a second flare', () => harness((input, elements) => {
  const button = elements.get('touch-flare');
  button.dispatchEvent(new Event('pointerdown', { cancelable: true }));
  assert.equal(input.wantsFlare(), true);
  const click = new Event('click');
  Object.defineProperty(click, 'detail', { value: 1 });
  button.dispatchEvent(click);
  assert.equal(input.wantsFlare(), false);
}));

test('Use and Pause support pointer and assistive activation without duplicates', () => harness((input, elements) => {
  for (const [id, consume] of [['touch-interact', 'wantsInteract'], ['touch-pause', 'wantsPause']]) {
    const button = elements.get(id);
    button.dispatchEvent(new Event('pointerdown', { cancelable: true }));
    assert.equal(input[consume](), true, id);
    const click = new Event('click');
    Object.defineProperty(click, 'detail', { value: 1 });
    button.dispatchEvent(click);
    assert.equal(input[consume](), false);
    const assistive = new Event('click');
    Object.defineProperty(assistive, 'detail', { value: 0 });
    button.dispatchEvent(assistive);
    assert.equal(input[consume](), true);
  }
}));

test('losing focus clears movement and queued actions', () => harness(input => {
  input.keys.add('w');
  input.pressedOnce.add('e');
  input.touch.move = { active: true, dx: 1, dy: 0 };
  input.touch.flare = true;
  window.dispatchEvent(new Event('blur'));
  assert.deepEqual(input.getMoveAxis(), { x: 0, y: 0 });
  assert.equal(input.wantsInteract(), false);
  assert.equal(input.wantsFlare(), false);
}));
