const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),harness=require('./harness.cjs');
function art(){const s={window:{},Math};vm.createContext(s);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../living-world.js'),'utf8'),s);return s.window.MoltPresentation;}
test('small-size player rendering remains simple at all twelve stages and still draws two eyes',()=>{
 const Art=art(),a=new Art();a.reduced=true;
 for(let i=0;i<12;i++){let paths=0,eyes=0;const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),beginPath(){paths++;},fill(){if(this.fillStyle==='#fffdf1')eyes++;}},{get:(o,k)=>o[k]??(()=>{})});a.creature(ctx,0,0,16,i,0,0);assert.ok(paths<=18,`Stage ${i} uses ${paths} paths`);assert.equal(eyes,2);}
});
test('starting food changes placement only, keeps six motes and uses no additional gameplay randomness',()=>{
 const a=harness(true,42).api,b=harness(false,42).api;a.start();b.start();const old=a.get(),next=b.get();assert.equal(next.motes.length,6);assert.deepEqual(JSON.parse(JSON.stringify(next.npcs)),JSON.parse(JSON.stringify(old.npcs)));assert.deepEqual(Array.from(next.motes,m=>m.phase),Array.from(old.motes,m=>m.phase));assert.ok(next.motes.slice(0,4).every(m=>Math.hypot(m.x-next.player.x,m.y-next.player.y)<=120));assert.equal(next.player.mass,22);
});
test('a steering player can eat the four opening algae and reach the first molt promptly',()=>{
 for(const seed of [1,7,42,123,987]){const {api}=harness(false,seed);api.start();let ticks=0;
  // Leave actual NPCs active: the trail must be reachable with the real update.
  for(;ticks<600&&api.get().state==='playing';ticks++){const s=api.get(),p=s.player;const targets=s.motes.filter(m=>Math.hypot(m.x-p.x,m.y-p.y)<180);if(!targets.length)break;targets.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));const m=targets[0],dx=m.x-p.x,dy=m.y-p.y,d=Math.hypot(dx,dy)||1;api.input(dx/d,dy/d);api.update(1/60);}
  assert.equal(api.get().state,'molting',`seed ${seed}, mass ${api.get().player.mass}`);assert.equal(api.get().lastMoltIdx,0);assert.ok(ticks<480);
 }
});
test('core movement, food rewards, mutations, collision and enemy AI remain byte-identical to Fix05',()=>{
 const before=fs.readFileSync(path.resolve(__dirname,'fixtures/fix05.html'),'utf8').replace(/\r/g,''),now=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8').replace(/\r/g,'');
 const body=(s,name)=>{const start=s.indexOf(`function ${name}(`),brace=s.indexOf('{',start);let n=1,i=brace+1;for(;n&&i<s.length;i++){if(s[i]==='{')n++;if(s[i]==='}')n--;}return s.slice(start,i);};
 for(const name of ['radiusForMass','spawnNpc','spawnMote','update','newPlayer','triggerMolt','checkMolt','die','currentInputVector'])assert.equal(body(now,name),body(before,name),name);
});
test('swimming away from a pursuing predator increases clearance without contact',()=>{
 const {api}=harness(false,42);api.start();const s=api.get(),p=s.player,r=api.radiusForMass(p.mass);const n={...s.npcs[0],x:p.x+100,y:p.y,r:r*1.5,vx:0,vy:0,wanderTimer:20,packId:null};api.set({npcs:[n],motes:[]});for(let i=0;i<240;i++){api.input(-1,0);api.update(1/60);}assert.equal(api.get().state,'playing');assert.ok(Math.hypot(n.x-p.x,n.y-p.y)>150);
});
