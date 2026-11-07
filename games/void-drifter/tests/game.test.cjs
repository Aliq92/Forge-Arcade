const test=require('node:test'),assert=require('node:assert/strict');const {load}=require('./harness.cjs');
test('fixed simulation agrees at 30, 60 and 144 render fps including resources and cargo timing',()=>{
 const values=[];
 for(const fps of [30,60,144]){
  const {game}=load({seed:44});game.input.state={thrust:true};
  for(let i=0;i<fps*8;i++)game.update(1/fps);
  values.push([game.player.x,game.player.y,game.player.fuel,game.player.energy,game.stats.survivalTime,game.survival.boxes.length]);
 }
 for(const v of values.slice(1))v.forEach((n,i)=>assert.ok(Math.abs(n-values[0][i])<1e-7,JSON.stringify(values)));
});
test('zero-fuel zero-energy ships recover by a reachable canister using emergency thrust',()=>{
 const results=[];
 for(const seed of [11,22,33,44,55]){
  const {game}=load({seed});game.player.fuel=0;game.player.energy=0;game.input.state={thrust:true};
  for(let i=0;i<30*60&&game.player.fuel<=0;i++)game.update(1/60);
  assert.ok(game.player.fuel>0,`seed ${seed}`);assert.equal(game.player.destroyed,false);
  results.push({seed,seconds:game.stats.survivalTime,fuel:game.player.fuel});
 }
 console.log('ZERO FUEL RECOVERY '+JSON.stringify(results));
});
test('coasting recharges enough reserve energy even inside an ion cloud at zero fuel',()=>{
 const {game,context}=load();game.player.fuel=0;game.player.energy=0;
 const cloud=vmRun(context,'new IonCloud(0,0,()=>.5)');cloud.vx=cloud.vy=0;
 game.world.chunks.get('0,0').hazards.push(cloud);
 for(let i=0;i<360;i++)game.update(1/60);
 assert.ok(game.player.energy>=25);assert.equal(game.makeReserve(),12);assert.ok(game.player.fuel>0);
});
function vmRun(context,code){return require('node:vm').runInContext(code,context);}
test('pause freezes time, cargo, energy and boosts; restart resets run state deterministically',()=>{
 const {game,api}=load({seed:89});game.player.fuel=0;api.applyMysteryReward('shield',game.player);
 game.update(1/60);game._handleEscape();const before=JSON.stringify({time:game.time,p:game.player,mission:game.survival.mission,stats:game.stats});
 for(let i=0;i<60;i++)game.update(1/30);
 assert.equal(JSON.stringify({time:game.time,p:game.player,mission:game.survival.mission,stats:game.stats}),before);
 game.resumeFromPause();game.update(1/60);assert.ok(game.player.shieldBoostTime<12);
 game.startRun('standard',89);assert.equal(game.time,0);assert.equal(game.stats.missionsCompleted,0);assert.equal(game.player.fuel,100);assert.equal(game.player.reserveCooldown,0);assert.equal(game.survival.boxes.length,0);
});
test('legacy storage and all upgrade keys remain compatible',()=>{
 const {api,storage}=load();storage.set('vd_best_distance_km','23.5');storage.set('vd_settings',JSON.stringify({soundVolume:22,reducedMotion:true}));
 assert.equal(api.SaveData.getBestDistanceKm('standard'),23.5);assert.equal(api.SaveData.getSettings().soundVolume,22);
 const p=new api.Player();for(const key of Object.keys(p.upgrades))p.applyUpgrade(key);
 assert.ok(Object.values(p.upgrades).every(v=>v===1));assert.ok(Number.isFinite(p.maxFuel)&&Number.isFinite(p.maxEnergy));
});
test('reduced-motion celebrations stay within the existing particle pool and milestone fires once',()=>{
 const {game}=load();game.settings.reducedMotion=true;game.stats.survivalTime=60;
 game.survival.update(1/60,game);const count=game.particles.particles.filter(p=>p.alive&&p.kind==='confetti').length;
 assert.equal(count,4);assert.equal(game.stats.celebrations,1);game.survival.update(1/60,game);assert.equal(game.stats.celebrations,1);assert.equal(game.particles.particles.length,500);
});
test('system reduced-motion preference is honored by celebration particles',()=>{
 const {game}=load({reducedMotion:true});assert.equal(game.settings.reducedMotion,true);
 game.celebrate('SUPPLY');assert.equal(game.particles.particles.filter(p=>p.alive).length,4);
});
test('safe-return optional mission can be reached through normal flight and rewards only once',()=>{
 const {game}=load();game.survival.missionIndex=2;game.update(1/60);assert.equal(game.survival.mission.type,'return');
 game.input.state={thrust:true};for(let i=0;i<300&&game.stats.missionsCompleted===0;i++)game.update(1/60);
 assert.equal(game.stats.missionsCompleted,1);game.update(1/60);assert.equal(game.stats.missionsCompleted,1);
});
