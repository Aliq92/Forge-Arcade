const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./harness.cjs');
const Treasure=require('../treasure.js');
test('old mineral ids and prices are preserved; new metals and gemstones have distinct categories',()=>{
 const a=harness({original:true}),meta=JSON.parse(JSON.stringify(a.META));Treasure.install(meta);
 for(const id of [7,8,9,10,14,15])assert.equal(meta[id].sell,a.META[id].sell);
 assert.equal(meta[17].sell,15);assert.equal(meta[18].sell,120);assert.equal(meta[19].sell,180);assert.equal(meta[20].sell,220);assert.equal(meta[21].sell,400);assert.equal(meta[18].kind,'ore');assert.equal(meta[19].kind,'gemstone');
});
test('500 seeded mineral worlds are reproducible, bounded, valid and meaningfully rare',()=>{
 const a=harness({original:true});for(let seed=0;seed<500;seed++){a.World.generate(seed);const original=Array.from(a.World.grid),grid=Treasure.enrich(original,34,98,5,seed);assert.deepEqual(grid,Treasure.enrich(original,34,98,5,seed));let counts={};
 for(let i=0;i<grid.length;i++){counts[grid[i]]=(counts[grid[i]]||0)+1;const old=original[i];if([0,6,7,11,12,13,14,15].includes(old))assert.equal(grid[i],old);if(grid[i]>=17){assert.ok([2,3,4,5,8,9,10].includes(old));assert.ok(Math.floor(i/34)>5);}}
 assert.equal(counts[17],32);assert.equal(counts[18],10);assert.equal(counts[19],7);assert.equal(counts[20],6);assert.equal(counts[21],2);
 const common=counts[7]+counts[17],uncommon=counts[8],rare=counts[9]+counts[18],epic=counts[10]+counts[19]+counts[20];assert.ok(common>uncommon&&uncommon>rare&&rare>epic&&epic>counts[21]);
 const diamonds=grid.flatMap((id,i)=>id===21?[Math.floor(i/34)-5]:[]);assert.ok(Math.min(...diamonds)>=16&&Math.min(...diamonds)<=28);assert.ok(Math.max(...diamonds)>28);
 }});
test('hydraulic joints remain connected and point at actual adjacent dig targets without NaN',()=>{
 for(const facing of [-1,1])for(const dir of ['left','right','up','down',null])for(const t of [0,.1,.5,1,100]){const pose=Treasure.armPose({x:100,y:100,w:22,h:22,facing,digging:dir?{c:dir==='left'?2:dir==='right'?4:3,r:dir==='up'?2:dir==='down'?4:3,progress:t%1,total:1,dir}:null},t,false);assert.ok(Object.values(pose).every(v=>Number.isFinite(v)));assert.ok(Math.abs(Math.hypot(pose.ex-pose.sx,pose.ey-pose.sy)-pose.boom)<.001);assert.ok(Math.abs(Math.hypot(pose.bx-pose.ex,pose.by-pose.ey)-pose.stick)<.001);}
});
test('calm hydraulic poses freeze decorative recoil and the particle pool drains at its cap',()=>{
 const p={x:0,y:0,w:22,h:22,facing:1,digging:null};assert.deepEqual(Treasure.armPose(p,0,true),Treasure.armPose(p,100,true));const pool=new Treasure.Pool(180);for(let i=0;i<1000;i++)pool.spawn(i,0,0,1,.5,'#fff',2);assert.equal(pool.list.length,180);pool.update(2);assert.equal(pool.list.length,0);assert.equal(pool.free.length,180);
});
test('articulated arm eases into digging and returns without changing simulation coordinates',()=>{
 const a=new Treasure.Art(),p={x:100,y:100,w:22,h:22,facing:1,digging:null};a.advance(1/60,p);const rest={...a.armTarget};p.digging={c:3,r:4,progress:0,total:1};const before=JSON.stringify(p);a.advance(1/60,p);assert.notDeepEqual(a.armTarget,rest);assert.equal(JSON.stringify(p),before);const digging={...a.armTarget};p.digging=null;for(let i=0;i<120;i++)a.advance(1/60,p);assert.ok(Math.hypot(a.armTarget.dx-rest.dx,a.armTarget.dy-rest.dy)<.001);assert.notDeepEqual(digging,a.armTarget);
});
test('all nine mineral icons differ in geometry even when their colors are ignored',()=>{
 const shapes=Treasure.minerals.map(m=>{const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});Treasure.mineral(ctx,m,0,0,10);return JSON.stringify(calls);});assert.equal(new Set(shapes).size,9);
});
