const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs'),{Simulation,World,CONFIG,State}=load();
const silent=()=>{},zero={x:0,y:0};
test('burst activates along current facing, never reactivates on cooldown and recharges once',()=>{
 const s=new Simulation();s.player.angle=0;assert.equal(s.burst(),true);assert.equal(s.burst(),false);assert.equal(s.burstCount,1);assert.equal(s.disturbance,CONFIG.burstDisturbance);let ready=0;
 s.update(.25,zero,t=>{if(t==='ready')ready++;});assert.ok(s.player.vx>CONFIG.speed);assert.equal(s.burstRemaining>0,true);
 for(let i=0;i<25;i++)s.update(.01,zero,silent);s.update(.11,zero,silent);assert.equal(s.burstRemaining,0);
 const speed=Math.hypot(s.player.vx,s.player.vy);s.update(.01,zero,silent);assert.ok(Math.hypot(s.player.vx,s.player.vy)>0&&Math.hypot(s.player.vx,s.player.vy)<speed);
 for(let i=0;i<400;i++)s.update(.01,zero,t=>{if(t==='ready')ready++;});assert.equal(ready,1);assert.equal(s.burst(),true);
});
test('Space sonar retains its cooldown and stronger disturbance; quiet recovers after burst',()=>{
 const s=new Simulation();assert.equal(s.pulse(),true);assert.equal(s.pulse(),false);assert.equal(s.pulseCount,1);assert.ok(CONFIG.pulseDisturbance>CONFIG.burstDisturbance);s.burst();const d=s.disturbance;for(let i=0;i<400;i++)s.update(.01,zero,silent);assert.ok(s.disturbance<d);assert.equal(s.rings.length,0);
});
test('high-speed burst cannot tunnel through a thin circular obstacle or world boundary',()=>{
 const s=new Simulation();s.world.rocks=Array.from({length:21},(_,i)=>({x:1000,y:940+i*6,r:3,revealUntil:0,discovered:false}));s.world.reindex();Object.assign(s.player,{x:950,y:1000,vx:180,vy:0,angle:0});s.burst();for(let i=0;i<10;i++){s.update(.1,{x:1,y:0},silent);assert.ok(s.player.x<990);assert.ok(s.world.rocks.every(r=>Math.hypot(s.player.x-r.x,s.player.y-r.y)>=r.r+CONFIG.vesselRadius-.1));}assert.equal(s.player.integrity,3);
 Object.assign(s.player,{x:5980,y:4780,angle:Math.PI/4});for(let i=0;i<30;i++)s.update(.1,{x:1,y:1},silent);assert.ok(s.player.x<=5975&&s.player.y<=4775);
});
test('bounded steps give matching steering, turning and burst recovery at30/60/120Hz',()=>{
 const results=[];for(const hz of [30,60,120]){const s=new Simulation(42);s.player.angle=0;s.burst();for(let i=0;i<hz*2;i++)s.update(1/hz,{x:1,y:0},silent);results.push(s.player);}
 for(const p of results.slice(1)){assert.ok(Math.abs(p.x-results[0].x)<1);assert.ok(Math.abs(p.vx-results[0].vx)<1);assert.ok(Math.abs(p.angle-results[0].angle)<.02);}
});
test('echo shadows weaken distant sonar but keep discoveries and nearby safety',()=>{
 const s=new Simulation(),z=s.world.echoShadows[0];Object.assign(s.player,{x:z.x,y:z.y});s.pulse();assert.ok(s.rings[0].limit<CONFIG.pulseRadius);
 for(let i=0;i<120;i++)s.update(1/120,zero,silent);assert.equal(z.discovered,true);assert.equal(s.zoneStatus().kind,'shadow');
});
test('siltfall warns before acting, clears automatically and never adds impassable terrain',()=>{
 const s=new Simulation(),zone=s.world.siltfalls[0],count=s.world.rocks.length;s.world.beacons[0].active=true;Object.assign(s.player,{x:zone.x,y:zone.y});s.update(.01,zero,silent);assert.equal(zone.phase,'warning');assert.equal(s.zoneStatus().kind,'silt-warning');
 for(let i=0;i<300;i++)s.update(.01,zero,silent);assert.equal(zone.phase,'warning');for(let i=0;i<150;i++)s.update(.01,zero,silent);assert.equal(zone.phase,'active');assert.equal(s.world.rocks.length,count);
 for(let i=0;i<650;i++)s.update(.01,zero,silent);assert.equal(zone.phase,'cooldown');assert.equal(s.world.rocks.length,count);
});
test('existing threats warn before pursuit, are slower than cruise and retreat in safe water',()=>{
 const s=new Simulation(),h=s.world.shadows[0];s.disturbance=100;Object.assign(s.player,{x:h.x-350,y:h.y});s.update(.01,zero,silent);assert.equal(h.armed,true);assert.ok(h.warn>2.9);assert.equal(h.pursuing,false);
 for(let i=0;i<320;i++)s.update(.01,zero,silent);assert.ok(h.pursuing);assert.ok(CONFIG.shadowChaseSpeed<CONFIG.speed);
 Object.assign(s.player,s.world.harbor);s.update(.01,zero,silent);assert.equal(h.armed,false);assert.equal(h.pursuing,false);
});
test('reset clears all new run state and repeated bursts never exceed particle cap',()=>{
 const s=new Simulation();for(let k=0;k<8;k++){s.burst();for(let i=0;i<500;i++)s.update(.01,{x:1,y:0},silent);assert.ok(s.particles.length<=CONFIG.maxParticles);}
 s.reset();assert.equal(s.burstCount,0);assert.equal(s.burstRemaining,0);assert.equal(s.burstCooldown,0);assert.equal(s.disturbance,0);assert.equal(s.player.integrity,3);assert.equal(s.world.siltfalls.every(z=>z.phase==='idle'),true);assert.equal(s.particles.length,0);
});
test('normal steering turns smoothly and can overcome the strongest local current',()=>{
 const s=new Simulation();const angle=s.player.angle;s.update(.25,{x:1,y:0},silent);assert.ok(s.player.angle>angle+.3&&s.player.angle<.1);
 const c=s.world.currents[0];Object.assign(s.player,{x:c.x,y:c.y,vx:0,vy:0});s.disturbance=100;s.update(.25,zero,silent);assert.ok(s.player.vx>0);assert.equal(s.zoneStatus().kind,'current');
 for(let i=0;i<120;i++)s.update(1/120,{x:-1,y:0},silent);assert.ok(s.player.vx<0);assert.ok(Math.hypot(s.world.currentAt(c,0,100).x,s.world.currentAt(c,0,100).y)<CONFIG.speed);
});
test('the optional narrow channel can be crossed without burst or hull damage',()=>{
 const s=new Simulation();Object.assign(s.player,{x:1040,y:2680,vx:0,vy:0,angle:0});
 for(let i=0;i<390;i++){const dx=1530-s.player.x,dy=2680-s.player.y,d=Math.hypot(dx,dy);s.update(1/60,{x:dx/d,y:dy/d},silent);assert.ok(s.world.rocksNear(s.player).every(r=>Math.hypot(s.player.x-r.x,s.player.y-r.y)>=r.r+CONFIG.vesselRadius-.1));}
 assert.ok(s.player.x>1460);assert.equal(s.burstCount,0);assert.equal(s.player.integrity,3);
});
