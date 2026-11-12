import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Echo Tide registers in Games and Featured without changing existing registry objects', () => {
  const original = { id: 'preserved', category: 'Experiments', featured: true };
  const GAMES = [original];
  const context = { GAMES, heroStatus: {}, footerCount: {}, renderFeaturedCollection: () => {}, render: filter => assert.equal(filter, 'All') };
  vm.runInNewContext(read('echo-tide-register.js'), context);
  assert.equal(GAMES.length, 2);
  assert.equal(GAMES[0], original);
  assert.equal(GAMES[1].id, 'echo-tide');
  assert.equal(GAMES[1].title, 'Echo Tide');
  assert.equal(GAMES[1].category, 'Games');
  assert.equal(GAMES[1].featured, true);
  assert.equal(GAMES[1].metadata.supportsPause, true);
  assert.equal(GAMES[1].metadata.supportsPersistentSave, false);
  assert.equal(context.heroStatus.textContent, '2 playable experiments');
  assert.equal(context.footerCount.textContent, '2');
});

test('launcher loads Echo Tide once after app initialization and before summary initialization', () => {
  const html = read('index.html');
  assert.equal((html.match(/src="echo-tide-register\.js\?v=16"/g) || []).length, 1);
  assert.equal((html.match(/href="echo-tide-card\.css\?v=1"/g) || []).length, 1);
  assert.ok(html.indexOf('echo-tide-register.js') > html.indexOf('src="app.js?'));
  assert.ok(html.indexOf('echo-tide-register.js') < html.indexOf('src="game-summaries.js'));
  const css = read('echo-tide-card.css');
  assert.match(css, /\.art-custom-echo-tide/);
  assert.doesNotMatch(css, /(^|\n)(body|html|:root|button|\.card\s*\{)/);
  assert.doesNotMatch(css, /url\(/);
});

test('Echo Tide ships all local assets and a native project-relative return link', () => {
  const html = read('games/echo-tide/index.html');
  assert.equal((html.match(/id="forge-back-link"/g) || []).length, 1);
  assert.match(html, /href="\.\.\/\.\.\/index.html"/);
  assert.match(html, /aria-label="Back to Forge Arcade"/);
  assert.doesNotMatch(html, /<iframe|localhost|\/workspace|https?:\/\/(?!www\.w3\.org)/);
  const dependencies = [...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:\?[^" ]*)?"/g)].map(m => m[1]);
  assert.deepEqual(dependencies.sort(), ['arcade.css', 'game.js', 'style.css', 'surge.css']);
  for (const path of dependencies) assert.ok(read('games/echo-tide/' + path).length);
  const runtime = read('games/echo-tide/game.js');
  assert.doesNotMatch(runtime, /localStorage\.clear|fetch\(|https?:\/\//);
  assert.match(runtime, /\$\('start'\)\.disabled=false/);
});

test('native Arcade return control remains touch-sized and above the game overlays', () => {
  const css = read('games/echo-tide/arcade.css');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /z-index:\s*10/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /#hud\s*\{\s*top:/);
});
