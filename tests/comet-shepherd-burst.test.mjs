import test from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../games/comet-shepherd/js/game.js';
import { InputManager } from '../games/comet-shepherd/js/input.js';

function createInputHarness(){
  const listeners = new Map();
  const oldWindow = globalThis.window;
  globalThis.window = {
    innerWidth: 390,
    innerHeight: 844,
    addEventListener(){},
  };
  const canvas = {
    addEventListener(type, fn){ listeners.set(type, fn); },
    setPointerCapture(){},
  };
  const input = new InputManager(canvas);
  return {
    input,
    emit(type, event){ listeners.get(type)(event); },
    restore(){ globalThis.window = oldWindow; },
  };
}

test('completed touch aim keeps its direction for the mobile burst button', () => {
  const h = createInputHarness();
  try{
    h.emit('pointerdown', { pointerId:1, clientX:120, clientY:280 });
    h.emit('pointermove', { pointerId:1, clientX:185, clientY:230 });
    h.emit('pointerup', { pointerId:1, clientX:185, clientY:230 });

    assert.deepEqual(h.input.lastAimVector, { dx:65, dy:-50 });
  } finally {
    h.restore();
  }
});

test('mobile burst uses the saved aim vector instead of the stale screen point', () => {
  const applied = [];
  const actions = {};
  const game = Object.create(Game.prototype);
  game.comet = {
    vx:20,
    vy:0,
    applyCorrection(...args){ applied.push(args); return true; },
  };
  game.input = {
    pointerScreen:{ x:-500, y:500 },
    lastAimVector:{ dx:65, dy:-50 },
  };
  game.renderer = {
    worldToScreen(){ return { x:0, y:0 }; },
    addShake(){},
  };
  game.audio = { emergency(){} };
  game.screenShakeOn = false;
  game.settings = {};
  game.ui = {
    on(action, fn){ actions[action] = fn; },
    bindSettingsInputs(){},
  };
  const oldDocument = globalThis.document;
  globalThis.document = { addEventListener(){} };

  try{
    game._bindActions();
    actions['mobile-burst']();
  } finally {
    globalThis.document = oldDocument;
  }

  assert.deepEqual(applied, [[65, -50, 1, true]]);
});
