import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, createSandbox } from '../levels.js';
import { Game } from '../game.js';
import { freshProgress, recordWin, saveProgress, loadProgress, SAVE_KEY } from '../storage.js';
import { AudioEngine } from '../audio.js';

test('real Game executes every authored reference for three stars and persists the completed campaign', () => {
  const authored = structuredClone(LEVELS);
  const values = new Map([['unrelated-game', 'preserved']]);
  const store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  let progress = freshProgress();
  for (const level of LEVELS) {
    const game = new Game(level);
    assert.equal(game.ready, false, `${level.title} begins asleep`);
    assert.equal(progress.unlocked, level.id);
    for (const action of level.solution) {
      if (action.type === 'wait') {
        assert.equal(game.startTest(), true);
        for (let t = 0; t < Math.round(action.seconds * 10); t++) game.tick(.1);
        assert.ok(game.stableTime + 1e-7 >= action.seconds, `${level.title} holds for the actual objective`);
        assert.equal(game.running, false, 'successful check stops advancing time');
      } else {
        assert.equal(game.act(action).ok, true, `${level.title}: ${JSON.stringify(action)}`);
      }
      assert.deepEqual(game.allocation.warnings, [], `${level.title} has no intermediate warning`);
    }
    assert.equal(game.ready, true);
    assert.equal(game.hadOverload, false);
    assert.equal(game.stars, 3);
    const energy = game.board.nodes.filter(n => n.type === 'battery').map(n => n.energy);
    for (let i = 0; i < 200; i++) game.tick(.1);
    assert.deepEqual(game.board.nodes.filter(n => n.type === 'battery').map(n => n.energy), energy, 'energy freezes as soon as completed hold is reached');
    const win = game.complete();
    assert.equal(win.stars, 3);
    assert.equal(win.levelId, level.id);
    assert.ok(win.objectives.includes('powered') && win.objectives.includes('no-overload'));
    if (level.objectives.holdSeconds) assert.ok(win.objectives.includes('stable'));
    assert.equal(game.complete(), null, 'completion is awarded once');
    assert.equal(recordWin(progress, win), true);
    assert.equal(saveProgress(progress, store), true);
    progress = loadProgress(store).data;
    assert.equal(progress.unlocked, Math.min(LEVELS.length, level.id + 1));
    assert.equal(progress.bestStars[level.id - 1], 3);
    game.reset();
    assert.deepEqual(game.board, level);
    assert.equal(game.completed, false);
    assert.equal(game.ready, false);
    assert.equal(game.stableTime, 0);
  }
  assert.deepEqual(progress.bestStars, Array(LEVELS.length).fill(3));
  assert.equal(progress.unlocked, LEVELS.length);
  assert.ok(values.has(SAVE_KEY));
  assert.equal(values.get('unrelated-game'), 'preserved');
  assert.deepEqual(LEVELS, authored, 'campaign source remains independent of every game and reset');
});

test('sandbox initial state and reset are independent of campaign and other sandbox games', () => {
  const a = new Game(createSandbox(), 'sandbox'), b = new Game(createSandbox(), 'sandbox');
  const initial = structuredClone(a.board);
  assert.equal(a.act({ type: 'cable', from: 'sandbox-generator', to: 'sandbox-hub' }).ok, true);
  assert.equal(a.act({ type: 'cable', from: 'sandbox-hub', to: 'sandbox-house' }).ok, true);
  assert.equal(a.allocation.served['sandbox-house'], true);
  assert.deepEqual(b.board, initial);
  assert.equal(a.complete(), null);
  a.reset();
  assert.deepEqual(a.board, initial);
  assert.equal(a.board.edges.length, 0);
  assert.equal(a.running, false);
});

test('audio stays opt-in, bounds voices, applies volume and silences paused/disabled sound', t => {
  const previous = globalThis.AudioContext;
  let contexts = 0, starts = 0, stops = 0;
  class FakeParam { setValueAtTime(v) { this.value = v; } linearRampToValueAtTime(v) { this.value = v; } exponentialRampToValueAtTime(v) { this.value = v; } cancelScheduledValues() {} }
  class FakeAudioContext {
    constructor() { contexts++; this.currentTime = 0; this.state = 'suspended'; this.destination = {}; }
    createGain() { return { gain: new FakeParam(), connect() {}, disconnect() {} }; }
    createOscillator() { return { frequency: new FakeParam(), type: 'sine', connect() {}, disconnect() {}, start() { starts++; }, stop() { stops++; } }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  globalThis.AudioContext = FakeAudioContext;
  t.after(() => { if (previous === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = previous; });
  const audio = new AudioEngine();
  assert.equal(contexts, 0);
  assert.equal(audio.cue('connect'), false);
  audio.resume();
  assert.equal(contexts, 0, 'resume does not opt into sound');
  audio.configure({ sound: true, volume: .4 });
  assert.equal(contexts, 0, 'settings do not create audio before a gesture cue');
  assert.equal(audio.cue('connect'), true);
  assert.equal(contexts, 1);
  assert.ok(Math.abs(audio.master.gain.value - .056) < 1e-8);
  audio.configure({ volume: 2 });
  assert.equal(audio.master.gain.value, .14, 'volume is clamped to its quiet maximum');
  audio.configure({ volume: .4 });
  for (let i = 0; i < 20; i++) { audio.context.currentTime += .2; audio.cue('victory'); }
  assert.ok(audio.voices.size <= 8);
  assert.ok(starts > 8 && stops > 0);
  audio.pause();
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.context.state, 'suspended');
  assert.equal(audio.cue('switch'), false);
  audio.resume();
  assert.equal(audio.cue('switch'), true);
  audio.configure({ sound: false });
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.cue('power'), false);
});

test('unavailable or failing native audio never interrupts gameplay', t => {
  const previous = globalThis.AudioContext, webkit = globalThis.webkitAudioContext;
  t.after(() => { if (previous === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = previous; if (webkit === undefined) delete globalThis.webkitAudioContext; else globalThis.webkitAudioContext = webkit; });
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  const unavailable = new AudioEngine({ sound: true });
  assert.equal(unavailable.cue('connect'), false);
  assert.doesNotThrow(() => { unavailable.pause(); unavailable.resume(); });
  globalThis.AudioContext = class { constructor() { throw Error('disabled by browser'); } };
  assert.equal(new AudioEngine({ sound: true }).cue('victory'), false);
});

test('optional city ambience is gesture-gated, quiet, bounded and removed on pause, mute or ambient-off', t => {
  const previous = globalThis.AudioContext;
  let contexts = 0, starts = 0, stops = 0;
  class Param { setValueAtTime(v) { this.value = v; } linearRampToValueAtTime(v) { this.value = v; } exponentialRampToValueAtTime(v) { this.value = v; } cancelScheduledValues() {} }
  class Context {
    constructor() { contexts++; this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
    createOscillator() { return { frequency: new Param(), connect() {}, disconnect() {}, start() { starts++; }, stop() { stops++; } }; }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  globalThis.AudioContext = Context;
  t.after(() => { if (previous === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = previous; });
  const defaultAudio = new AudioEngine({ sound: true });
  assert.equal(defaultAudio.settings.ambient, false);
  const audio = new AudioEngine({ sound: true, ambient: true });
  audio.configure({ ambient: true });
  assert.equal(contexts, 0, 'ambient opt-in alone never creates a context');
  assert.equal(audio.resume(), true);
  assert.equal(contexts, 1);
  assert.equal(audio.ambientVoices.size, 2);
  assert.equal(starts, 2);
  for (const voice of audio.ambientVoices) {
    assert.equal(voice.oscillator.type, 'sine');
    assert.ok(voice.oscillator.frequency.value >= 80 && voice.oscillator.frequency.value <= 140);
    assert.ok(voice.gain.gain.value <= .02, 'ambient gain is far below a cue');
  }
  for (let i = 0; i < 20; i++) audio.configure({ ambient: true });
  assert.equal(starts, 2, 'reconfiguration never duplicates ambient sources');
  for (let i = 0; i < 10; i++) audio.cue('victory');
  assert.ok(audio.voices.size <= 8);
  assert.equal(audio.ambientVoices.size, 2, 'two ambient sources are separate from the eight-cue bound');
  audio.configure({ ambient: false });
  assert.equal(audio.ambientVoices.size, 0);
  assert.ok(audio.voices.size > 0, 'ambient-off preserves active feedback cues');
  audio.configure({ ambient: true });
  assert.equal(audio.ambientVoices.size, 2);
  audio.pause();
  assert.equal(audio.ambientVoices.size, 0);
  assert.equal(audio.voices.size, 0);
  audio.configure({ ambient: true });
  assert.equal(audio.ambientVoices.size, 0, 'settings cannot bypass pause');
  audio.resume();
  assert.equal(audio.ambientVoices.size, 2);
  audio.configure({ sound: false });
  assert.equal(audio.ambientVoices.size, 0);
  assert.ok(stops > 0);
  audio.configure({ sound: true, volume: 0 });
  assert.equal(audio.ambientVoices.size, 0, 'zero volume has no running ambient sources');
});
