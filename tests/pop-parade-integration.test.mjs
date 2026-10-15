import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Pop Parade uses the existing Games and Featured registry without changing other entries',()=>{
  const existing={id:'existing-game',category:'Experiments',featured:true};
  const GAMES=[existing];let renders=0,filter;
  const context={GAMES,heroStatus:{},footerCount:{},renderFeaturedCollection:()=>renders++,render:f=>filter=f};
  vm.runInNewContext(read('pop-parade-register.js'),context);
  assert.equal(GAMES.length,2);assert.equal(GAMES[0],existing);
  const game=GAMES[1];
  assert.equal(game.id,'pop-parade');assert.equal(game.title,'Pop Parade');
  assert.equal(game.category,'Games');assert.equal(game.metadata.category,'Arcade');assert.equal(game.featured,true);
  assert.equal(game.description,'Pop colorful balloons, trigger spectacular chain reactions, and chase your biggest celebration.');
  assert.deepEqual(Array.from(game.tags),['Chain Reaction','One-Touch','Casual Arcade']);
  assert.equal(game.artId,'pop-parade');assert.equal(renders,1);assert.equal(filter,'All');
  assert.equal(context.footerCount.textContent,'2');assert.equal(context.heroStatus.textContent,'2 playable experiments');
});
test('the launcher loads Pop Parade registration and scoped artwork exactly once',()=>{
  const html=read('index.html');
  assert.equal((html.match(/src="pop-parade-register.js"/g)||[]).length,1);
  assert.equal((html.match(/href="pop-parade-card.css"/g)||[]).length,1);
  assert.ok(html.indexOf('src="pop-parade-register.js"')>html.indexOf('src="app.js?'));
  const css=read('pop-parade-card.css');assert.match(css,/\.art-custom-pop-parade/);
  assert.doesNotMatch(css,/(^|\n)(body|html|:root|button|\.card\s*\{)/);
  assert.match(read('pop-parade-card.svg'),/<svg/);
});
test('the game launches with relative assets and has an accessible native return link',()=>{
  const html=read('games/pop-parade/index.html');
  assert.match(html,/id="forge-back-link"/);assert.match(html,/href="\.\.\/\.\.\/index.html"/);
  assert.match(html,/href="arcade.css"/);assert.match(html,/type="module" src="game.js"/);
  assert.doesNotMatch(html,/<iframe|localhost|\/workspace/);
  for(const file of ['style.css','arcade.css','game.js','engine.mjs'])assert.ok(read(`games/pop-parade/${file}`).length);
  assert.match(read('games/pop-parade/game.js'),/popParade_/);assert.doesNotMatch(read('games/pop-parade/game.js'),/localStorage.clear/);
});
