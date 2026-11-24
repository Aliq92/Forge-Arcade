import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('the archive and featured collection launch the native TERRAFORM document', () => {
  const scripts = [...read('index.html').matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(match => match[1]);
  assert.equal(scripts.filter(path => path === 'terraform-register.js').length, 1);
  assert.ok(scripts.indexOf('terraform-register.js') < scripts.indexOf('game-summaries.js'));

  const context = vm.createContext({
    document: { getElementById: () => ({}) },
    window: { matchMedia: () => ({matches: true}) },
  });
  vm.runInContext(read('app.js').split('heroStatus.textContent =')[0], context);
  vm.runInContext('renderFeaturedCollection = () => {}; render = () => {};', context);
  for (const script of scripts.filter(path => path.endsWith('-register.js'))) {
    vm.runInContext(read(script), context);
  }
  vm.runInContext(read('card-thumbnails.js'), context);
  const cards = vm.runInContext(`
    const entries = GAMES.filter(game => game.id === 'terraform');
    const entry = entries[0];
    ({
      length: entries.length, title: entry.title, category: entry.category,
      featured: entry.featured, archive: cardHTML(entry), showcase: featuredCardHTML(entry),
      visible: GAMES.filter(game => !game.hidden).length, footer: footerCount.textContent,
    });
  `, context);
  assert.equal(cards.length, 1);
  assert.equal(cards.title, 'TERRAFORM: A Living Planet');
  assert.equal(cards.category, 'Simulations');
  assert.equal(cards.featured, true);
  assert.equal(cards.footer, String(cards.visible));
  for (const markup of [cards.archive, cards.showcase]) {
    assert.match(markup, /href="games\/terraform\/index\.html"/);
    assert.match(markup, /srcset="assets\/thumbnails\/pixel\/terraform\.webp"/);
    assert.match(markup, /src="assets\/thumbnails\/terraform\.svg"/);
  }
  assert.match(read('games/terraform/index.html'), /href="\.\.\/\.\.\/index\.html"/);
});
