import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const s=readFileSync(new URL('../games/terrain-flyover/assets/index-JdOCPcFP.js',import.meta.url),'utf8');
const a=s.indexOf('function Rc('),b=s.indexOf('},qc=',a);
const ctx=vm.createContext({});
vm.runInContext(s.slice(a,b+1)+';this.Field=Kc;',ctx);
test('river channels remain submerged across seeds and world length',async()=>{
 const module=await import('../games/terrain-flyover/scenery.mjs').catch(()=>null);
 assert.ok(module,'Scenery module exists');
 module.installRiver(ctx.Field);
 for(const seed of [0,42,999,4294967295]){
  const f=new ctx.Field(seed);
  for(let z=-1000;z<=1000;z+=20){
   const x=module.riverCenter(f,z);
   assert.ok(f.height(x,z)<-7.5,'river bed below water');
   assert.equal(f.height(x,z),new ctx.Field(seed).height(x,z));
  }
 }
});
