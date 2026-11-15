import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {serve}=createRequire(import.meta.url)('./preview.cjs');
test('preview defaults to game root and supports a confined workspace root for arcade navigation',async()=>{
 for(const [directory,start]of [[undefined,'/'],[fileURLToPath(new URL('../../..',import.meta.url)),'/games/axiom/']]){const server=await serve(0,directory),base='http://127.0.0.1:'+server.address().port;try{assert.match(await (await fetch(base+start)).text(),/AXIOM — The Physics/);if(directory){const html=await (await fetch(base+'/index.html')).text();assert.match(html,/Forge Arcade/);assert.doesNotMatch(html,/<title>AXIOM/);}for(const pathname of ['/%2e%2e%2fpackage.json','/.git/config','/%2e%2e%5cpackage.json'])assert.equal((await fetch(base+pathname)).status,404,pathname);}finally{await new Promise(r=>server.close(r));}}
});
