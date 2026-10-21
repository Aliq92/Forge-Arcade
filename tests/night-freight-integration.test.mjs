import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('NIGHT FREIGHT registers in Games and Featured without replacing existing entries', () => {
  const original = { id: 'preserved-game', category: 'Experiments' };
  const context = { GAMES: [original], heroStatus: {}, footerCount: {}, renderFeaturedCollection() {}, render() {} };
  vm.runInNewContext(read('night-freight-register.js'), context);
  assert.equal(context.GAMES[0], original);
  const game = context.GAMES[1];
  assert.equal(game.id, 'night-freight');
  assert.equal(game.category, 'Games');
  assert.equal(game.featured, true);
  assert.equal(game.artId, 'night-freight');
  assert.equal(game.metadata.supportsPause, true);
  assert.equal(game.metadata.supportsPersistentSave, true);
  assert.equal(context.heroStatus.textContent, '2 playable experiments');
  assert.equal(context.footerCount.textContent, '2');
});

test('launcher loads the registration and scoped card art exactly once, without game physics', () => {
  const html = read('index.html');
  assert.equal((html.match(/src="night-freight-register.js\?v=1"/g) || []).length, 1);
  assert.equal((html.match(/href="night-freight-card.css"/g) || []).length, 1);
  assert.ok(html.indexOf('night-freight-register.js') > html.indexOf('src="app.js?'));
  assert.ok(html.indexOf('night-freight-register.js') < html.indexOf('src="game-summaries.js'));
  assert.doesNotMatch(html, /matter\.min\.js|games\/night-freight\/src/);
  assert.match(read('night-freight-card.svg'), /<svg/);
  assert.doesNotMatch(read('night-freight-card.css'), /(^|\n)(body|html|:root|button|\.card\s*\{)/);
});

test('native game page returns to Arcade and ships all runtime dependencies locally', () => {
  const html = read('games/night-freight/index.html');
  assert.equal((html.match(/id="forge-back-link"/g) || []).length, 1);
  assert.match(html, /href="\.\.\/\.\.\/index.html"/);
  assert.match(html, /aria-label="Back to Forge Arcade"/);
  assert.doesNotMatch(html, /<iframe|https?:\/\/|\/workspace|localhost/);
  for (const match of html.matchAll(/(?:src|href)="([^"?#]+)"/g)) {
    if (match[1].startsWith('../../')) continue;
    assert.ok(read('games/night-freight/' + match[1]).length, match[1]);
  }
  assert.match(read('games/night-freight/src/app.js'), /forge-arcade:night-freight:v1/);
  assert.doesNotMatch(read('games/night-freight/src/app.js'), /localStorage\.clear/);
  assert.match(read('games/night-freight/vendor/MATTER-LICENSE.txt'), /MIT License/);
});

test('all three five-piece shipments and the bundled engine are runnable', () => {
  const context = { window: {}, console, setTimeout, clearTimeout };
  vm.runInNewContext(read('games/night-freight/vendor/matter.min.js'), context);
  vm.runInNewContext(read('games/night-freight/src/simulation.js'), context);
  const { Harbour, SHIPMENTS } = context.window.NightFreight;
  assert.equal(SHIPMENTS.length, 3);
  for (let index = 0; index < 3; index++) {
    const game = new Harbour(); game.reset(index);
    assert.equal(game.cargo.length, 5);
    for (let i = 0; i < 240; i++) game.step();
    assert.equal(game.failed, false);
    assert.ok(game.cargo.every(c => Number.isFinite(c.body.position.x) && Number.isFinite(c.body.position.y)));
    assert.ok(game.cargo.every(c => c.body.position.y < 570));
  }
});
