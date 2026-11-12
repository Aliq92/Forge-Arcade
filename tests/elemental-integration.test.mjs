import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('Elemental stays registered but is hidden behind a native chemistry shortcut',()=>{
 const context={GAMES:[],heroStatus:{},footerCount:{},renderFeaturedCollection(){},render(){}};
 vm.runInNewContext(read('elemental-register.js'),context);assert.equal(context.GAMES.length,1);assert.equal(context.GAMES[0].id,'elemental');assert.equal(context.GAMES[0].category,'Experiments');
 assert.equal(context.GAMES[0].hidden,true);
 const app=read('app.js');assert.match(app,/id: 'beat-foundry',[\s\S]*?category: 'Experiments'/);
 const index=read('index.html');assert.equal([...index.matchAll(/src="elemental-register\.js(?:\?[^" ]*)?"/g)].length,1);
 assert.ok(index.indexOf('elemental-register.js')>index.indexOf('src="app.js'));assert.ok(fs.existsSync(new URL('games/elemental/index.html',root)));
 assert.ok(fs.existsSync(new URL('assets/thumbnails/pixel/elemental.webp',root)));assert.match(read('card-thumbnails.js'),/"elemental"/);
 assert.match(index,/<a[^>]+class="chemistry-shortcut"[^>]+href="games\/elemental\/index.html"[^>]+aria-label="Open chemistry lab"/);
 assert.match(index,/<svg[^>]+aria-hidden="true"/);
});
test('hidden entries never appear in any archive filter or featured collection',()=>{
 const nodes=new Map(),document={getElementById(id){if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},dispatchEvent(){}};
 const context=vm.createContext({document,window:{matchMedia:()=>({matches:true})},Event:class{}});
 vm.runInContext(read('card-thumbnails.js'),context);
 vm.runInContext(read('app.js').split('heroStatus.textContent =')[0],context);
 vm.runInContext(read('elemental-register.js'),context);
 for(const filter of ['All','Games','Simulations','Experiments','Featured']){
  vm.runInContext(`render('${filter}')`,context);
  assert.doesNotMatch(nodes.get('grid').innerHTML,/data-game="elemental"/);
 }
 vm.runInContext('renderFeaturedCollection()',context);assert.doesNotMatch(nodes.get('featured-grid').innerHTML,/data-game="elemental"/);
 vm.runInContext("render('Experiments')",context);assert.match(nodes.get('grid').innerHTML,/data-game="beat-foundry"/);
 assert.equal(nodes.get('footer-count').textContent,String(vm.runInContext('GAMES.filter(g=>!g.hidden).length',context)));
});
