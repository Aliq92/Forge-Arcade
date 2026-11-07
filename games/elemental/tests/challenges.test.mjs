import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {CHALLENGES,checkChallenge,loadProgress,completeChallenge} from '../src/challenges.mjs';
const refs=JSON.parse(fs.readFileSync(new URL('../src/data/molecules.json',import.meta.url)));
test('exactly twelve progressive challenges check scientific state, not only completion clicks',()=>{
 assert.equal(CHALLENGES.length,12);const expected=[{answer:'O'},{atom:{z:6,a:12,q:0}},{isotopes:[{z:1,a:1,q:0},{z:1,a:2,q:0}]},{atom:{z:11,a:23,q:1}},{answer:'Mg'}];
 for(let id=1;id<=5;id++)assert.equal(checkChallenge(id,expected[id-1],refs).ok,true);
 for(const [id,key]of [[6,'H2'],[7,'H2O'],[8,'CO2'],[9,'NH3'],[10,'CH4']]){assert.equal(checkChallenge(id,{graph:refs.find(r=>r.id===key)},refs).ok,true);assert.equal(checkChallenge(id,{graph:{atoms:[],bonds:[]}},refs).ok,false);}
 assert.equal(checkChallenge(11,{answer:'three-two'},refs).ok,true);assert.equal(checkChallenge(12,{answer:'C2H4'},refs).ok,true);assert.equal(checkChallenge(1,{answer:'H'},refs).ok,false);
});
test('progress validates sequential completion and tolerates unavailable or corrupt storage',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};let p=loadProgress(storage);assert.equal(p.completed.length,0);
 assert.equal(completeChallenge(p,3,storage).completed.length,0);p=completeChallenge(p,1,storage);assert.deepEqual(loadProgress(storage).completed,[1]);
 assert.doesNotThrow(()=>completeChallenge(p,2,{setItem(){throw Error('blocked');}}));map.set('elemental.progress.v1','{broken');assert.equal(loadProgress(storage).completed.length,0);
 map.set('elemental.progress.v1',JSON.stringify({completed:[1,99,3]}));assert.deepEqual(loadProgress(storage).completed,[1]);
});
test('isotope and atomic challenges reject unverified or mismatched nuclear examples',()=>{
 assert.equal(checkChallenge(3,{isotopes:[{z:1,a:1,q:0},{z:1,a:3,q:0}]},refs).ok,false);
 assert.equal(checkChallenge(2,{atom:{z:6,a:399,q:0}},refs).ok,false);
});
