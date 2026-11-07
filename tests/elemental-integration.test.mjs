import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('Elemental registers once beside Beat Foundry in Experiments with a native route',()=>{
 const context={GAMES:[],heroStatus:{},footerCount:{},renderFeaturedCollection(){},render(){}};
 vm.runInNewContext(read('elemental-register.js'),context);assert.equal(context.GAMES.length,1);assert.equal(context.GAMES[0].id,'elemental');assert.equal(context.GAMES[0].category,'Experiments');
 const app=read('app.js');assert.match(app,/id: 'beat-foundry',[\s\S]*?category: 'Experiments'/);
 const index=read('index.html');assert.equal([...index.matchAll(/src="elemental-register\.js(?:\?[^" ]*)?"/g)].length,1);
 assert.ok(index.indexOf('elemental-register.js')>index.indexOf('src="app.js'));assert.ok(fs.existsSync(new URL('games/elemental/index.html',root)));
 assert.ok(fs.existsSync(new URL('assets/thumbnails/pixel/elemental.webp',root)));assert.match(read('card-thumbnails.js'),/"elemental"/);
});
