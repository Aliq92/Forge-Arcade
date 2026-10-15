import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('Orbit Breaker uses the existing Games and Featured registry and preserves existing entries',()=>{
  const existing={id:'preserved-game',category:'Experiments',featured:true};
  const GAMES=[existing];let renders=0,filter;
  const context={GAMES,heroStatus:{},footerCount:{},renderFeaturedCollection:()=>renders++,render:f=>filter=f};
  vm.runInNewContext(read('orbit-breaker-register.js'),context);
  assert.equal(GAMES.length,2);assert.equal(GAMES[0],existing);
  const game=GAMES[1];assert.equal(game.id,'orbit-breaker');assert.equal(game.title,'Orbit Breaker');
  assert.equal(game.category,'Games');assert.equal(game.metadata.category,'Arcade');assert.equal(game.featured,true);
  assert.equal(game.description,'Bend gravity, perform orbital slingshots, smash glowing targets, and unleash spectacular chain reactions.');
  assert.deepEqual(Array.from(game.tags),['Gravity','One-Touch','Physics Arcade']);
  assert.equal(game.artId,'orbit-breaker');assert.equal(renders,1);assert.equal(filter,'All');
  assert.equal(context.heroStatus.textContent,'2 playable experiments');assert.equal(context.footerCount.textContent,'2');
});
test('the launcher loads registration and isolated artwork once, after app initialization',()=>{
  const html=read('index.html');assert.equal((html.match(/src="orbit-breaker-register.js"/g)||[]).length,1);
  assert.equal((html.match(/href="orbit-breaker-card.css"/g)||[]).length,1);
  assert.ok(html.indexOf('src="orbit-breaker-register.js"')>html.indexOf('src="app.js?'));
  const css=read('orbit-breaker-card.css');assert.match(css,/\.art-custom-orbit-breaker/);
  assert.doesNotMatch(css,/(^|\n)(body|html|:root|button|\.card\s*\{)/);assert.match(read('orbit-breaker-card.svg'),/<svg/);
});
test('game uses native relative navigation and every local runtime asset exists',()=>{
  const html=read('games/orbit-breaker/index.html');assert.equal((html.match(/id="forge-back-link"/g)||[]).length,1);
  assert.match(html,/href="\.\.\/\.\.\/index.html"/);assert.match(html,/aria-label="Back to Forge Arcade"/);
  assert.doesNotMatch(html,/<iframe|localhost|\/workspace/);
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g))assert.ok(read('games/orbit-breaker/'+match[1]).length);
  assert.match(read('games/orbit-breaker/script.js'),/orbitBreaker_save/);
  assert.doesNotMatch(read('games/orbit-breaker/script.js'),/localStorage.clear/);
});
test('all three modes and all twelve chambers ship with the actual tested engine',()=>{
  const context={};vm.runInNewContext(read('games/orbit-breaker/physics.js'),context);
  vm.runInNewContext(read('games/orbit-breaker/chambers.js'),context);
  vm.runInNewContext(read('games/orbit-breaker/game.js'),context);
  assert.equal(context.OrbitChambers.length,12);
  for(const mode of ['arcade','chambers','chaos']){
    const g=new context.OrbitGame.Game(mode);for(let i=0;i<120;i++)g.update(1/120);
    assert.ok(g.balls.every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)));
    assert.ok(g.targets.length>0);
  }
});
