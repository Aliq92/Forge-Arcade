import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html');
function registry() {
  const context = vm.createContext({document:{getElementById:()=>({})},window:{matchMedia:()=>({matches:true})}});
  vm.runInContext(read('app.js').split('heroStatus.textContent =')[0], context);
  vm.runInContext('renderFeaturedCollection=()=>{}; render=()=>{};', context);
  for (const [,path] of html.matchAll(/src="([^"?]+-register\.js)/g)) vm.runInContext(read(path), context);
  return context;
}
test('every active experience has a distinct local thumbnail in archive and featured cards', () => {
  const context = registry();
  if (fs.existsSync(new URL('../card-thumbnails.js',import.meta.url))) vm.runInContext(read('card-thumbnails.js'),context);
  const cards = vm.runInContext('GAMES.map(game=>({id:game.id,archive:cardHTML(game),featured:featuredCardHTML(game)}))',context);
  assert.equal(cards.length,39);
  const paths = new Set();
  for (const card of cards) {
    for (const markup of [card.archive,card.featured]) {
      const match = markup.match(/<img[^>]+src="(assets\/thumbnails\/[^" ]+\.svg)"/);
      assert.ok(match, `${card.id} needs illustrated artwork`);
      const svg = read(match[1]);
      assert.match(svg, /viewBox="0 0 640 360"/);
      assert.doesNotMatch(svg, /<script|<foreignObject|https?:\/\/(?!www.w3.org)/);
      paths.add(match[1]);
    }
  }
  assert.equal(paths.size,cards.length);
  assert.equal(new Set([...paths].map(read)).size,cards.length);
});
