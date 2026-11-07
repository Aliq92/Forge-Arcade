const test=require('node:test'),assert=require('node:assert/strict'),harness=require('./harness.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
const snapshot=api=>{const {particles,floatingTexts,...data}=api.get();return plain(data);};
test('simulation configuration, trait definitions and collision dimensions match original',()=>{
 const a=harness(true).api,b=harness().api;assert.deepEqual(plain(b.CFG),plain(a.CFG));for(const m of [0,22,40,160,850,2500])assert.equal(a.radiusForMass(m),b.radiusForMass(m));assert.deepEqual(plain(a.TRAITS.map(t=>({id:t.id,name:t.name,desc:t.desc}))),plain(b.TRAITS.map(t=>({id:t.id,name:t.name,desc:t.desc}))));
});
test('seeded movement, hunger, NPC steering, spawning and bounds match original over 600 simulation ticks',()=>{
 const a=harness(true,987).api,b=harness(false,987).api;a.start();b.start();
 for(let i=0;i<600;i++){const x=Math.sin(i*.019),y=Math.cos(i*.027);a.input(x,y);b.input(x,y);a.update(1/60);b.update(1/60);assert.deepEqual(snapshot(b),snapshot(a),'tick '+i);if(a.get().state==='dead')break;}
});
test('food gain and every existing threshold preserve mutations and progression',()=>{
 const a=harness(true,44).api,b=harness(false,44).api;a.start();b.start();
 for(const threshold of a.CFG.moltThresholds){for(const api of [a,b]){const s=api.get();api.set({npcs:[],motes:[{x:s.player.x,y:s.player.y,phase:0}]});s.player.mass=threshold-2;api.update(1/60);}assert.deepEqual(snapshot(b),snapshot(a));assert.equal(b.get().state,'molting');}
});
test('fatal bites, second wind and lineage inheritance match original',()=>{
 for(const wind of [false,true]){const a=harness(true,52).api,b=harness(false,52).api;a.start();b.start();for(const api of [a,b]){const s=api.get();api.set({npcs:[],motes:[]});if(wind){s.player.hasSecondWind=true;s.player.traits=['wind'];}api.die('eaten');}assert.deepEqual(snapshot(b),snapshot(a));if(!wind){a.next();b.next();assert.deepEqual(snapshot(b),snapshot(a));}}
});
test('nearby hunting predators alert packmates outside the individual detection range',()=>{
 const a=harness(true,81).api,b=harness(false,81).api;for(const api of [a,b]){api.start();const s=api.get(),r=api.radiusForMass(s.player.mass);const base={...s.npcs[0],r:r*1.5,wanderTimer:1,vx:0,vy:0,packId:2};api.set({npcs:[{...base,x:s.player.x+100,y:s.player.y},{...base,x:s.player.x+220,y:s.player.y}],motes:[]});api.update(1/60);assert.equal(api.get().npcs[0].hunting,true);assert.equal(api.get().npcs[1].hunting,true);}assert.deepEqual(snapshot(b),snapshot(a));
});
test('actual algae/prey collision gain and dangerous contact agree with the original controller',()=>{
 for(const kind of ['algae','prey','predator']){const a=harness(true,29).api,b=harness(false,29).api;for(const api of [a,b]){api.start();const s=api.get(),r=api.radiusForMass(s.player.mass),base={...s.npcs[0],x:s.player.x,y:s.player.y,r:kind==='prey'?6:r*1.6,wanderTimer:1,vx:0,vy:0,packId:null};api.set({npcs:kind==='algae'?[]:[base],motes:kind==='algae'?[{x:s.player.x,y:s.player.y,phase:0}]:[]});api.update(1/60);}assert.deepEqual(snapshot(b),snapshot(a));if(kind==='predator')assert.equal(b.get().state,'dead');else assert.ok(b.get().player.mass>22);}
});
test('pause freezes simulation and restart resets the current generation without adding generations',()=>{
 const {api}=harness();api.start();assert.equal(typeof api.pause,'function');api.input(1,0);api.pause();const frozen=snapshot(api);api.frame(1000);assert.deepEqual(snapshot(api),frozen);api.resume();api.update(1/60);api.restart();assert.equal(api.get().generation,1);assert.equal(api.get().survivalTime,0);assert.equal(api.get().player.mass,api.CFG.massStart);
});
test('movement and Escape still work after a HUD button has keyboard focus',()=>{
 const {api,events}=harness();api.start();api.set({npcs:[],motes:[]});const x=api.get().player.x;
 const event=key=>({key,target:{tagName:'BUTTON'},repeat:false,preventDefault(){}});
 for(const fn of events.keydown)fn(event('ArrowRight'));api.update(1/60);assert.ok(api.get().player.x>x);
 for(const fn of events.keydown)fn(event('Escape'));assert.equal(api.get().state,'paused');
 for(const fn of events.keydown)fn(event('Escape'));assert.equal(api.get().state,'playing');
});
test('death effects drain without frozen velocity producing new trails',()=>{
 const {api,sandbox}=harness();api.start();api.set({npcs:[],motes:[]});api.input(1,0);api.update(1/60);api.die('eaten');
 for(let i=1;i<=300;i++)api.frame(i*1000/60);
 const s=sandbox.moltDebug.inspect();assert.equal(s.state,'dead');assert.equal(s.shakeMag,0);assert.equal(s.particles.length,0);
});
test('visibility loss pauses play and clears held movement until fresh input',()=>{
 const {api,sandbox,events}=harness();api.start();api.set({npcs:[],motes:[]});api.input(1,0);sandbox.document.hidden=true;
 for(const fn of events.visibilitychange)fn();assert.equal(api.get().state,'paused');
 const x=api.get().player.x;api.resume();api.update(1/60);assert.equal(api.get().player.x,x);
});
