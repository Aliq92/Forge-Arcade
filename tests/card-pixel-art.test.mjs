import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const manifest=JSON.parse(read('artwork/card-prompts.json'));
const artworkPath=id=>`assets/thumbnails/pixel/${id}.webp`;

function registry(){
 const context=vm.createContext({document:{getElementById:()=>({})},window:{matchMedia:()=>({matches:true})}});
 vm.runInContext(read('app.js').split('heroStatus.textContent =')[0],context);
 vm.runInContext('renderFeaturedCollection=()=>{}; render=()=>{};',context);
 for(const [,path]of read('index.html').matchAll(/src="([^"?]+-register\.js)/g))vm.runInContext(read(path),context);
 vm.runInContext(read('card-thumbnails.js'),context);
 return context;
}

// Read the real container/frame headers without browser or native dependencies.
// VP8L stores 14-bit width-1 and height-1 packed after its 0x2f signature.
function webpMetadata(buffer){
 assert.ok(buffer.length>=20,'WebP container is truncated');
 assert.equal(buffer.toString('ascii',0,4),'RIFF');
 assert.equal(buffer.toString('ascii',8,12),'WEBP');
 assert.equal(buffer.readUInt32LE(4)+8,buffer.length,'RIFF length must match file');
 let extended=null,lossless=null;
 for(let offset=12;offset+8<=buffer.length;){
  const kind=buffer.toString('ascii',offset,offset+4),length=buffer.readUInt32LE(offset+4),data=offset+8;
  assert.ok(data+length<=buffer.length,`${kind} chunk is truncated`);
  if(kind==='VP8X'){
   assert.ok(length>=10);extended={width:buffer.readUIntLE(data+4,3)+1,height:buffer.readUIntLE(data+7,3)+1};
  }
  if(kind==='VP8L'){
   assert.ok(length>=5);assert.equal(buffer[data],0x2f,'VP8L frame signature');
   const bits=buffer.readUInt32LE(data+1);lossless={width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};
  }
  offset=data+length+(length&1);
 }
 assert.ok(lossless,'artwork must contain a lossless WebP frame');
 if(extended)assert.deepEqual(extended,lossless,'canvas and frame dimensions must agree');
 return lossless;
}

test('pixel artwork manifest covers exactly the 36 currently playable experiences',()=>{
 const ids=manifest.map(item=>item.id),context=registry();
 const registered=Array.from(vm.runInContext('GAMES.map(game=>game.id)',context));
 assert.equal(ids.length,36);assert.equal(new Set(ids).size,36);assert.deepEqual([...ids].sort(),registered.sort());
});

test('all 36 distinct pixel illustrations exist as lossless 960 by 540 WebP files',()=>{
 const missing=manifest.filter(item=>!fs.existsSync(new URL(artworkPath(item.id),root))).map(item=>item.id);
 assert.deepEqual(missing,[],`Missing pixel illustrations: ${missing.join(', ')}`);
 const fingerprints=new Set();
 for(const {id}of manifest){
  const buffer=fs.readFileSync(new URL(artworkPath(id),root));
  assert.deepEqual(webpMetadata(buffer),{width:960,height:540},id);
  fingerprints.add(createHash('sha256').update(buffer).digest('hex'));
 }
 assert.equal(fingerprints.size,36,'every experience needs its own illustration');
});

test('archive and featured cards select pixel WebP sources while preserving original SVG fallback',()=>{
 const context=registry();
 const cards=vm.runInContext('GAMES.map(game=>({id:game.id,archive:cardHTML(game),featured:featuredCardHTML(game)}))',context);
 assert.equal(cards.length,36);
 for(const {id,archive,featured}of cards)for(const markup of [archive,featured]){
  assert.match(markup,/<picture(?:\s|>)/,`${id} needs responsive image selection`);
  const sources=[...markup.matchAll(/<source\b([^>]+)>/g)].map(match=>match[1]);
  assert.ok(sources.some(source=>/\btype="image\/webp"/.test(source)&&source.includes(`srcset="${artworkPath(id)}`)),`${id} needs a WebP source`);
  const image=markup.match(/<img\b([^>]+)>/)?.[1]||'';
  assert.ok(image.includes(`src="assets/thumbnails/${id}.svg"`),`${id} must preserve its SVG fallback`);
  assert.match(image,/\bclass="[^"]*\bgame-thumbnail\b/);
  assert.match(image,/\balt=""/,'decorative artwork must not repeat the linked title');
 }
});

test('unregistered future experiences retain their existing initial-letter artwork',()=>{
 const context=registry();
 const markup=vm.runInContext('cardArtworkHTML({id:"future-uncharted-game",title:"Future Voyage"})',context);
 assert.match(markup,/<span class="art-code">F<\/span>/);
 assert.doesNotMatch(markup,/<(?:img|picture|source)\b/);
});
