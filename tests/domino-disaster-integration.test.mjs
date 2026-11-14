import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('Domino Disaster registers once with native route, shared artwork and visible counts',()=>{
 const html=read('index.html');assert.equal([...html.matchAll(/src="domino-disaster-register\.js\?v=1"/g)].length,1);assert.ok(html.indexOf('domino-disaster-register')<html.indexOf('game-summaries'));
 const c=vm.createContext({document:{getElementById:()=>({})},window:{matchMedia:()=>({matches:true})}});vm.runInContext(read('app.js').split('heroStatus.textContent =')[0],c);vm.runInContext('renderFeaturedCollection=()=>{};render=()=>{};',c);
 for(const [,p]of html.matchAll(/src="([^"?]+-register\.js)/g))vm.runInContext(read(p),c);vm.runInContext(read('card-thumbnails.js'),c);
 const result=JSON.parse(vm.runInContext('JSON.stringify({all:GAMES.length,visible:GAMES.filter(g=>!g.hidden).length,game:GAMES.filter(g=>g.id==="domino-disaster"),elemental:GAMES.find(g=>g.id==="elemental").hidden,markup:cardHTML(GAMES.find(g=>g.id==="domino-disaster"))})',c));
 assert.equal(result.all,40);assert.equal(result.visible,39);assert.equal(result.game.length,1);assert.equal(result.elemental,true);assert.equal(result.game[0].category,'Games');assert.equal(result.game[0].featured,true);assert.match(result.markup,/games\/domino-disaster\/index\.html/);assert.match(result.markup,/pixel\/domino-disaster\.webp/);assert.match(result.markup,/thumbnails\/domino-disaster\.svg/);
});
test('gallery art matches prepared game assets and all game ES module imports resolve locally',()=>{
 for(const [a,b]of [['games/domino-disaster/assets/card.svg','assets/thumbnails/domino-disaster.svg'],['games/domino-disaster/assets/card.webp','assets/thumbnails/pixel/domino-disaster.webp']])assert.deepEqual(fs.readFileSync(new URL(a,root)),fs.readFileSync(new URL(b,root)));
 const game=new URL('games/domino-disaster/',root);for(const f of fs.readdirSync(game).filter(f=>f.endsWith('.js'))){const text=fs.readFileSync(new URL(f,game),'utf8');for(const [,p]of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){assert.ok(p.startsWith('./'));assert.ok(fs.existsSync(new URL(p,game)),`${f}: ${p}`);}}
 assert.match(read('games/domino-disaster/index.html'),/href="\.\.\/\.\.\/index\.html"/);
});
