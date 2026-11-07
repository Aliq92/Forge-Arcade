import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('The Last Lighthouse ships a self-contained classic-script Canvas document',()=>{
  assert.ok(fs.existsSync(new URL('games/the-last-lighthouse/index.html',root)),'standalone game page missing');
  const html=read('games/the-last-lighthouse/index.html');
  assert.match(html,/<canvas/);assert.match(html,/aria-label="Back to Forge Arcade"/);assert.match(html,/href="\.\.\/\.\.\/index.html"/);
  assert.doesNotMatch(html,/(?:src|href)="https?:|<iframe|type="module"/);
  for(const [,asset]of html.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css|svg))"/g))assert.ok(read('games/the-last-lighthouse/'+asset).length,asset);
  for(const name of ['simulation','rendering','audio'])assert.ok(html.indexOf(`src="${name}.js"`)<html.indexOf('src="game.js"'));
});
test('The Last Lighthouse registers once in Games and Featured without changing existing entries',()=>{
  assert.ok(fs.existsSync(new URL('the-last-lighthouse-register.js',root)),'arcade registration missing');
  const original={id:'existing',featured:true},GAMES=[original];
  const context={GAMES,heroStatus:{},footerCount:{},renderFeaturedCollection(){},render(filter){assert.equal(filter,'All');}};
  vm.runInNewContext(read('the-last-lighthouse-register.js'),context);
  assert.equal(GAMES.length,2);assert.equal(GAMES[0],original);
  assert.equal(GAMES[1].id,'the-last-lighthouse');assert.equal(GAMES[1].category,'Games');assert.equal(GAMES[1].featured,true);
  assert.equal(context.footerCount.textContent,'2');
  const html=read('index.html');
  assert.equal([...html.matchAll(/src="the-last-lighthouse-register\.js(?:\?[^" ]*)?"/g)].length,1);
  assert.ok(html.indexOf('the-last-lighthouse-register.js')>html.indexOf('src="app.js'));
  assert.ok(html.indexOf('the-last-lighthouse-register.js')<html.indexOf('src="game-summaries.js'));
  assert.match(read('card-thumbnails.js'),/"the-last-lighthouse"/);
  assert.equal(read('assets/thumbnails/the-last-lighthouse.svg'),read('games/the-last-lighthouse/thumbnail.svg'));
});
