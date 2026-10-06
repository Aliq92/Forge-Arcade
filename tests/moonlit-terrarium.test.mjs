import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../games/moonlit-terrarium/script.js', import.meta.url), 'utf8');
function fixture() {
  const nodes = new Map(), storage = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, addEventListener() {}, focus() {} });
    return nodes.get(id);
  }
  const context = vm.createContext({ console, Math, JSON, Number, String, Date,
    document: { readyState: 'loading', hidden: false, addEventListener() {}, getElementById: node },
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    confirm: () => false, window: {} });
  vm.runInContext(source.replace('  if (document.readyState', `  cacheDom();
    globalThis.game = { get state() { return state; }, beginGame, update, decideActivity, placeIntervention,
      advanceNight, saveGame, readSave, restore() { savedRun = readSave(); restoreRun(); },
      togglePause, restartGame, get preferences() { return preferences; } };
    if (document.readyState`), context);
  return { game: context.game, storage, context, nodes };
}

test('a social Mote with no wander target resumes safely, and care does not linger after satisfaction', () => {
  const { game } = fixture();
  const m = game.state.motes[0];
  m.activity = 'gatheringMote'; m.gatherBuddy = game.state.motes[1]; m.wanderTarget = null; m.wanderTimer = 0;
  game.decideActivity(m, 0.1);
  assert(Number.isFinite(m.x));
  m.activity = 'resting'; m.lockedType = 'shelter'; m.energy = 90;
  game.decideActivity(m, 0.1);
  assert.notEqual(m.activity, 'resting');
});

test('one gift per night, care improves needs, and dawn removes the old gift', () => {
  const { game } = fixture(); game.beginGame();
  const m = game.state.motes[0]; m.hunger = 95; m.x = 480; m.y = 300;
  game.placeIntervention('food', 480, 300);
  game.placeIntervention('water', 480, 300);
  assert.equal(game.state.interventions.length, 1);
  game.update(1); assert(m.hunger < 95);
  game.advanceNight(); assert.equal(game.state.interventions.length, 0);
  assert.equal(game.state.interventionUsedThisNight, false);
  assert.equal(game.state.summaries.length, 1);
});

test('cyclic social references save safely, restore exact progress, and reject corrupted saves', () => {
  const { game, storage } = fixture(); game.beginGame();
  game.state.motes[0].gatherBuddy = game.state.motes[1];
  game.state.motes[1].gatherBuddy = game.state.motes[0];
  game.placeIntervention('water', 480, 300);
  game.state.timeLeft = 17.25; game.togglePause();
  assert.equal(game.saveGame(), true);
  game.restore();
  assert.equal(game.state.timeLeft, 17.25);
  assert.equal(game.state.paused, true);
  assert.equal(game.state.interventions[0].type, 'water');
  const key = [...storage.keys()][0], data = JSON.parse(storage.get(key));
  data.motes[0].energy = 'broken'; storage.set(key, JSON.stringify(data));
  assert.equal(game.readSave(), null);
});

test('a shelter-assisted seven-night run wins and an unattended run loses', () => {
  for (const care of [true, false]) {
    const { game } = fixture(); game.beginGame();
    for (let step = 0; step < 2820 && !game.state.ended; step++) {
      if (care && !game.state.interventionUsedThisNight) game.placeIntervention('shelter', 480, 300);
      game.update(0.1);
    }
    assert.equal(game.state.outcome, care ? 'victory' : 'loss');
    assert.equal(game.readSave().outcome, game.state.outcome);
    assert.equal(game.state.night <= 7, true);
  }
});

test('restart cancellation preserves progress and storage denial stays non-blocking', () => {
  const { game, context } = fixture(); game.beginGame(); game.update(3);
  const time = game.state.timeLeft; game.restartGame(); assert.equal(game.state.timeLeft, time);
  context.localStorage.setItem = () => { throw new Error('blocked'); };
  assert.equal(game.saveGame(), false);
  game.update(0.1); assert(game.state.timeLeft < time);
});
