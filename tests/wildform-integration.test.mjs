import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
const root=new URL('../',import.meta.url),read=file=>readFile(new URL(file,root),'utf8');
test('Wildform registers a featured simulation without changing existing games',async()=>{
 const existing={id:'existing',title:'Existing game',category:'Games',featured:false},GAMES=[existing];
 const context={GAMES,heroStatus:{},footerCount:{},renderFeaturedCollection(){},render(){}};
 vm.runInNewContext(await read('wildform-register.js'),context);
 assert.equal(GAMES.length,2);assert.equal(GAMES[0],existing);assert.equal(GAMES[1].id,'wildform');
 assert.equal(GAMES[1].category,'Simulations');assert.equal(GAMES[1].featured,true);
 assert.equal(context.footerCount.textContent,'2');
 assert.equal(context.heroStatus.textContent,'2 playable experiments');
});
test('Registered Wildform ships a valid, evolving static simulation',async()=>{
 const context={};vm.runInNewContext(await read('games/wildform/simulation.js'),context);
 const S=context.Wildform,w=S.createWorld(48271);assert.equal(w.organisms.length,76);
 for(let i=0;i<1000;i++)S.step(w);
 assert(w.counters.fed>0);assert(w.counters.births>0);assert(w.counters.migrations>0);
 assert(S.restore(S.serialize(w)));assert.equal(Object.keys(S.SPECIES).length,10);
 const html=await read('games/wildform/index.html');
 for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|svg))"/g)){
  assert(!match[1].startsWith('http'));assert((await read('games/wildform/'+match[1])).length>0);
 }
});
