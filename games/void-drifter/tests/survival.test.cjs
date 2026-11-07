const test=require('node:test'),assert=require('node:assert/strict');const {load}=require('./harness.cjs');
test('seeded reward bags include every reward and make full refuels uncommon',()=>{
 const {api}=load(),a=new api.SurvivalDirector(7),b=new api.SurvivalDirector(7);
 const rewards=Array.from({length:30},()=>a.nextReward());assert.deepEqual(rewards,Array.from({length:30},()=>b.nextReward()));
 assert.equal(rewards.filter(r=>r==='full-refuel').length,3);
 for(const r of ['supply','shield','salvage','repair'])assert.ok(rewards.includes(r));
});
test('mystery boxes reward exactly once; full refuel restores upgraded tank and celebrates',()=>{
 const {game,api}=load();game.player.applyUpgrade('fuelTank');game.player.fuel=0;
 const box=new api.MysteryBox(0,0,'full-refuel','test');
 assert.equal(game.survival.claim(box,game),true);assert.equal(game.player.fuel,126);assert.equal(game.stats.mysteryBoxes,1);assert.equal(game.stats.celebrations,1);
 assert.equal(game.survival.claim(box,game),false);assert.equal(game.stats.mysteryBoxes,1);
});
test('all cargo rewards are useful and shield protection expires after twelve simulation seconds',()=>{
 const {api}=load(),p=new api.Player();p.fuel=2;p.energy=1;p.hull=5;
 api.applyMysteryReward('supply',p);assert.ok(p.fuel>=25&&p.energy>=30);
 api.applyMysteryReward('salvage',p);assert.ok(p.salvage>=50);
 api.applyMysteryReward('repair',p);assert.ok(p.hull>5);
 api.applyMysteryReward('shield',p);assert.equal(p.shieldBoostTime,12);assert.equal(p.applyDamage(30).hullDamage,0);
 for(let i=0;i<721;i++)p.update(1/60,{},{});assert.equal(p.temporaryShield,0);assert.equal(p.shieldBoostTime,0);
});
test('periodic boxes and zero-fuel canisters spawn safely within emergency reach',()=>{
 for(const seed of [4,5,6,7,8]){
  const {game}=load({seed});game.player.fuel=0;game.world.ensureChunksAround(0,0,1);
  for(let i=0;i<420;i++)game.update(1/60);
  assert.ok(game.survival.boxes.length>0);assert.ok(game.survival.emergencyFuel);
  for(const item of [...game.survival.boxes,game.survival.emergencyFuel]){
   assert.ok(Math.hypot(item.x-game.player.x,item.y-game.player.y)<350);
   assert.ok(game.world.supplyCorridorClear(game.player,item.x,item.y));
  }
 }
});
test('one optional mission completes once and refreshes after a brief cooldown',()=>{
 const {game}=load();game.update(1/60);assert.equal(game.survival.mission.type,'salvage');
 game.stats.salvageCollectedTotal=30;game.update(1/60);assert.equal(game.stats.missionsCompleted,1);
 game.update(1/60);assert.equal(game.stats.missionsCompleted,1);assert.equal(game.survival.mission,null);
 for(let i=0;i<601;i++)game.update(1/60);assert.ok(game.survival.mission);assert.equal(game.survival.mission.type,'cargo');
});
test('blocked recovery placement retries at a bounded rate rather than every physics tick',()=>{
 const {game}=load();game.player.fuel=0;let attempts=0;game.world.findSupplyPoint=()=>{attempts++;return null;};
 for(let i=0;i<60;i++)game.update(1/60);
 assert.ok(attempts<=2,`${attempts} placement searches in one second`);
});
