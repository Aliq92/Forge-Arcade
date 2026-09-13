import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
test('APOGEE registration follows the existing launcher contract',()=>{
 const GAMES=[];let renders=0;const ctx={GAMES,heroStatus:{},footerCount:{},renderFeaturedCollection:()=>renders++,render:()=>renders++};
 vm.runInNewContext(read('apogee-register.js'),ctx);assert.equal(GAMES[0].id,'apogee');assert.equal(renders,2);assert.ok(read('index.html').indexOf('apogee-register.js')>read('index.html').indexOf('app.js'));
});
test('production page and relative assets exist without runtime CDN dependencies',()=>{
 const html=read('games/apogee/index.html');const paths=[...html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)].map(m=>m[1]);assert.ok(paths.length>=2);for(const p of paths)assert.ok(existsSync(fileURLToPath(new URL('games/apogee/'+p,root))));assert.doesNotMatch(html,/(?:src|href)="https?:\/\/|\/src\/main/);
});
