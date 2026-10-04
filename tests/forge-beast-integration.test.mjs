import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ArcadeGameHost } from '../game-host.mjs';
import { createBeastStorage, SAVE_KEY } from '../games/forge-beast/storage.mjs';
import { FORGE_BEAST_METADATA, readForgeBeastSummary } from '../games/forge-beast/module/launcher.js';
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
function setup(loadOverride) {
  const document = new EventTarget(); document.hidden = false;
  const calls = []; let options;
  const game = Object.fromEntries(['mount', 'pause', 'resume', 'destroy'].map(name => [name, (...args) => calls.push([name, ...args])]));
  game.save = () => { calls.push(['save']); return true; };
  game.getStateSummary = () => ({ gameId: 'forge-beast' });
  const host = new ArcadeGameHost({ container: {}, document,
    load: loadOverride || (() => ({ createForgeBeast: input => { options = input; return game; } })),
    onExit: () => calls.push(['exit']), onError: (error, fatal) => calls.push(['error', error, fatal]),
  });
  return { document, host, calls, game, options: () => options };
}
test('Forge Beast uses the existing registry and native page loading with matching metadata', () => {
  const games = []; const noop = () => {};
  vm.runInNewContext(read('forge-beast-register.js'), { GAMES: games, heroStatus: {}, footerCount: {}, renderFeaturedCollection: noop, render: noop });
  assert.equal(games.length, 1); assert.equal(games[0].id, FORGE_BEAST_METADATA.id);
  for (const key of ['version', 'category', 'orientation', 'supportsPause', 'supportsPersistentSave']) assert.equal(games[0].metadata[key], FORGE_BEAST_METADATA[key]);
  assert.equal(typeof games[0].loadSummary, 'function');
  assert.match(read('index.html'), /forge-beast-register.js/);
  assert.match(read('games/forge-beast/host.mjs'), /load: \(\) => import\('\.\/module\/forge-beast.js'\)/);
  assert.doesNotMatch(read('index.html'), /forge-beast\.css|module\/forge-beast\.js/);
});
test('host lazy loads once, mounts embedded, pauses, resumes, saves and destroys idempotently', async () => {
  const { host, calls, document, options } = setup();
  assert.equal(calls.length, 0); assert.equal(host.open(), host.open()); await host.open();
  assert.equal(options().mode, 'embedded'); assert.equal(options().debug, false);
  host.pause(); document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls.at(-1)[0], 'pause'); host.resume(); assert.equal(calls.at(-1)[0], 'resume');
  assert.equal(host.save(), true); assert.deepEqual(host.getStateSummary(), { gameId: 'forge-beast' });
  host.close(); host.close(); assert.equal(calls.filter(c => c[0] === 'destroy').length, 1);
  const count = calls.length; document.dispatchEvent(new Event('visibilitychange')); assert.equal(calls.length, count);
  assert.equal(host.game, null); assert.equal(host.container, null); assert.equal(host.getStateSummary(), null);
});
test('repeated open/close has one listener and one destruction per session', async () => {
  const document = new EventTarget(); document.hidden = false;
  let listeners = 0, mounts = 0, destroys = 0;
  const add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document);
  document.addEventListener = (...args) => { listeners++; add(...args); };
  document.removeEventListener = (...args) => { listeners--; remove(...args); };
  for (let i = 0; i < 20; i++) {
    const host = new ArcadeGameHost({ container: {}, document, load: async () => ({ createForgeBeast: () => ({ mount: () => mounts++, destroy: () => destroys++, pause() {}, resume() {}, save: () => true, getStateSummary: () => ({}) }) }) });
    await host.open(); assert.equal(listeners, 1); host.pause(); host.resume(); host.close(); assert.equal(listeners, 0);
  }
  assert.equal(mounts, 20); assert.equal(destroys, 20);
});
test('exit-requested belongs to Arcade, saves and cleans up before navigating', async () => {
  const { host, options, calls } = setup(); await host.open();
  options().onEvent({ type: 'exit-requested', payload: {} });
  assert.deepEqual(calls.slice(-3).map(c => c[0]), ['save', 'destroy', 'exit']);
  options().onEvent({ type: 'exit-requested', payload: {} }); assert.equal(calls.filter(c => c[0] === 'exit').length, 1);
});
test('a late lazy import cannot mount after exit, and import/mount failure is contained', async () => {
  let resolve; const lazy = new Promise(r => { resolve = r; });
  const first = setup(() => lazy); const pending = first.host.open(); await Promise.resolve(); first.host.close();
  resolve({ createForgeBeast: () => { throw new Error('should not instantiate'); } }); await pending; assert.equal(first.calls.length, 0);
  const rejected = setup(() => { throw new Error('network'); }); await rejected.host.open();
  assert.equal(rejected.host.closed, true); assert.equal(rejected.calls.at(-1)[2], true);
  const partial = setup(); partial.game.mount = () => { throw new Error('mount failed'); }; await partial.host.open();
  assert.equal(partial.calls.filter(c => c[0] === 'destroy').length, 1);
});
test('hidden initialization starts paused and explicit host pause is retained', async () => {
  const { document, host, calls } = setup(); document.hidden = true; await host.open();
  assert.equal(calls[0][0], 'pause'); assert.equal(calls[1][0], 'mount');
  host.pause(); document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls.at(-1)[0], 'pause'); host.close();
});
test('launcher summary reads save without modifying it and adapter removal never clears unrelated games', () => {
  const data = new Map([[SAVE_KEY, '{malformed'], ['arcade.settings', 'keep'], ['another.game', 'keep']]);
  const storage = createBeastStorage({ getItem: key => data.get(key) ?? null, setItem: (k,v) => data.set(k,v), removeItem: key => data.delete(key) });
  const before = new Map(data); const summary = readForgeBeastSummary({ storage, saveKey: SAVE_KEY });
  assert.equal(summary.hasSave, false); assert.deepEqual(data, before);
  storage.remove(SAVE_KEY); assert.equal(data.get('arcade.settings'), 'keep'); assert.equal(data.get('another.game'), 'keep');
});
test('Arcade debug is explicitly disabled and native navigation belongs to host', () => {
  assert.match(read('games/forge-beast/host.mjs'), /debug: false/);
  assert.doesNotMatch(read('games/forge-beast/host.mjs'), /URLSearchParams|\.clear\(/);
  assert.doesNotMatch(read('games/forge-beast/index.html'), /src\/host.css/);
  assert.match(read('games/forge-beast/index.html'), /href="\.\.\/\.\.\/index.html"/);
});
