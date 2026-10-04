import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');

test('Outpost Orbit follows the existing game registry, category, featured and native launch conventions', async () => {
  const GAMES = [{ id: 'existing-game', featured: true }], before = JSON.stringify(GAMES[0]);
  let featuredRenders = 0, filter;
  const context = { GAMES, heroStatus: {}, footerCount: {}, renderFeaturedCollection: () => featuredRenders++, render: value => filter = value };
  vm.runInNewContext(await read('outpost-orbit-register.js'), context);
  assert.equal(JSON.stringify(GAMES[0]), before);
  assert.equal(GAMES.length, 2);
  const game = GAMES[1];
  assert.equal(game.id, 'outpost-orbit');
  assert.equal(game.title, 'Outpost Orbit');
  assert.equal(game.category, 'Simulations');
  assert.equal(game.featured, true);
  assert.deepEqual(Array.from(game.tags), ['Alien village', 'Living simulation', 'Colony', 'Autonomous AI']);
  assert.equal(game.artId, 'outpost-orbit');
  assert.equal(featuredRenders, 1);
  assert.equal(filter, 'All');
  assert.equal(context.footerCount.textContent, '2');
  const arcade = await read('index.html');
  assert.equal((arcade.match(/src="outpost-orbit-register.js"/g) || []).length, 1);
  assert.match(arcade, /outpost-orbit-card.css/);
  assert.match(await read('app.js'), /href="games\/\$\{game.id\}\/index.html"/);
});

test('Completed gameplay and save namespace are preserved byte for byte', async () => {
  const originalHashes = {
    'styles.css': 'a13b2ec29e280d7a47c00687ee5b1650b76483d1b772b4ce08c750bf8bc07afe',
    'script.js': 'd35066142cf739c2a5514fc4dc88793abf0bacf26330e1abd1f42f67cbf2ed79',
    'simulation.js': '60d108b81e496863dc5810e921ba93b071f77ca13d821d0bdd20bf78dc8829b9',
    'renderer.js': '453f724012e17cb97fa0e95da8aea231b74d79f263b15b0c74bc9d182ef4813f',
  };
  for (const [file, hash] of Object.entries(originalHashes)) {
    assert.equal(createHash('sha256').update(await read(`games/outpost-orbit/${file}`)).digest('hex'), hash, file);
  }
  assert.match(await read('games/outpost-orbit/script.js'), /key = 'outpost-orbit-v1'/);
  assert.doesNotMatch(await read('games/outpost-orbit/script.js'), /localStorage.clear/);
});

test('Native game page uses relative assets, one standard return link, and isolated card artwork', async () => {
  const game = await read('games/outpost-orbit/index.html');
  assert.equal((game.match(/id="forge-back-link"/g) || []).length, 1);
  assert.match(game, /href="\.\.\/\.\.\/index.html"/);
  assert.match(game, /href="arcade.css"/);
  assert.match(game, /type="module" src="script.js"/);
  assert.doesNotMatch(game, /localhost|\/workspace|<iframe/);
  for (const file of ['styles.css', 'arcade.css', 'script.js', 'simulation.js', 'renderer.js']) assert.ok((await read(`games/outpost-orbit/${file}`)).length);
  const art = await read('outpost-orbit-card.css');
  assert.match(art, /data:image\/svg\+xml/);
  assert.match(art, /\.art-custom-outpost-orbit/);
  assert.doesNotMatch(art, /(^|\n)(body|html|:root|button|\.card\s*\{)/);
});
