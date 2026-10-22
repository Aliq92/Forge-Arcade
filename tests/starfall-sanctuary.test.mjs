import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function load() {
  const ctx = vm.createContext({ console, Math });
  for (const f of ['constants','utils','world','player','resources','plants','meteors','upgrades','objectives','game']) {
    const path = new URL(`../games/starfall-garden/js/${f}.js`, import.meta.url);
    if (fs.existsSync(path)) vm.runInContext(fs.readFileSync(path, 'utf8'), ctx);
  }
  return vm.runInContext('SG', ctx);
}
const particles = { burst() {} };
function plant(S, w, type, x = 0, y = 0) {
  const p = w.patchAtLocal(x,y), keeper = new S.Player(); keeper.fragments = 100;
  w.restorePatch(p); S.Plants.tryPlant(w,p,type,keeper); p.plant.growth = 1; return p;
}
test('Glowgrass reclaims ground faster than every other species', () => {
  const S = load(); const counts = Object.keys(S.PLANT_TYPES).map(type => {
    const w = new S.World(260); plant(S,w,type);
    for (let i=0;i<120;i++) S.Plants.update(.05,w,particles);
    return w.restoredCount;
  });
  assert.ok(counts.slice(1).every(n => counts[0] > n));
});
test('mature Starflowers heal and replenish energy only within their aura', () => {
  const S=load(), w=new S.World(260); const p=plant(S,w,'starflower');
  const a=S.Plants.getAuraEffects(w,p.x,p.y);
  assert.ok(a.healBonus > 0); assert.ok(a.energyRegenBonus > 0);
  assert.equal(S.Plants.getAuraEffects(w,250,0).healBonus,0);
  p.plant.growth=.5; assert.equal(S.Plants.getAuraEffects(w,p.x,p.y).healBonus,0);
});
test('Lumina Trees renew fragments after maturity', () => {
  const S=load(),w=new S.World(260),r=new S.ResourceManager(w); plant(S,w,'luminatree');
  for(let i=0;i<321;i++) S.Plants.update(.05,w,particles,r);
  assert.ok(r.fragments.length >= 1); assert.ok(r.fragments[0].value <= 3);
});
test('Shield Blooms reduce plant damage and terrain scorching', () => {
  const S=load();
  function impact(shield) {
    const w=new S.World(260),keeper=new S.Player(); keeper.x=200;
    const p=plant(S,w,'luminatree'); if(shield) plant(S,w,'shieldbloom',40,0);
    const m=new S.MeteorManager(w);
    m._impact({typeKey:'small',x:p.x-22,y:p.y,impactRadius:34,damage:12,color:'#fff'},keeper,particles,null,{});
    return { health:p.plant.health,scorched:w.scorchEvents };
  }
  const bare=impact(false), protectedGarden=impact(true);
  assert.ok(protectedGarden.health > bare.health); assert.ok(protectedGarden.scorched < bare.scorched);
});
test('milestones persist but victory requires restoration and living diversity together', () => {
  const S=load(),w=new S.World(260),o=new S.Objectives(); w.update(60,100);
  for(const p of w.patches.slice(0,Math.ceil(w.totalPatches*.3))) w.restorePatch(p);
  const mature=[];
  Object.keys(S.PLANT_TYPES).forEach((type,i)=> { const p=w.patches[i]; p.plant={type,alive:true,growth:1}; mature.push(p); });
  o.update(w,1); assert.ok(o.completed.slice(0,3).every(Boolean));
  assert.equal(o.update(w,1).length,0);
  mature[0].plant=null; w.scorchPatch(w.patches[10]); o.update(w,1);
  assert.ok(o.completed.slice(0,3).every(Boolean)); assert.equal(o.ready,false);
  for(const p of w.patches) { if(p.state===S.TERRAIN.SCORCHED) p.state=S.TERRAIN.DEAD; w.restorePatch(p); }
  w.restoredCount=w.totalPatches;
  o.update(w,1); assert.equal(o.ready,false); assert.match(o.missing.join(' '),/Glowgrass/);
  for(let i=0;i<6;i++) w.patches[i].plant={type:Object.keys(S.PLANT_TYPES)[i%4],alive:true,growth:1};
  o.update(w,1); assert.equal(o.ready,true); assert.equal(o.completed[3],true);
});
test('a mature tree pulls landed fragments toward its roots outside keeper range', () => {
 const S=load(),w=new S.World(260),r=new S.ResourceManager(w),keeper=new S.Player();
 const p=plant(S,w,'luminatree'); keeper.x=-100;keeper.y=-100;
 r.spawnBonusAt(p.x+85,p.y,'common');r.spawnTimer=10;
 const before=r.fragments[0].x;
 r.update(.1,S.PHASE.CALM,keeper,10,particles,()=>{});
 assert.ok(r.fragments[0].x<before);
});
test('Shield Blooms preserve keeper protection and lose their aura when destroyed', () => {
 const S=load(),w=new S.World(260),p=plant(S,w,'shieldbloom');
 assert.ok(S.Plants.getAuraEffects(w,p.x,p.y).damageReduction>=.5);
 S.Plants.damage(w,p,1000,particles);
 assert.equal(S.Plants.getAuraEffects(w,p.x,p.y).damageReduction,0);
});
test('dead or immature plants never satisfy the final living garden requirement', () => {
 const S=load(),w=new S.World(260),o=new S.Objectives();w.update(60,100);
 for(const p of w.patches) w.restorePatch(p);
 for(let i=0;i<6;i++) w.patches[i].plant={type:Object.keys(S.PLANT_TYPES)[i%4],alive:true,growth:1};
 o.update(w,1);assert.equal(o.ready,true);
 w.patches[0].plant.alive=false;w.patches[1].plant.growth=.9;
 o.update(w,1);assert.equal(o.ready,false);assert.equal(o.matureCount,4);assert.ok(o.completed.every(Boolean));
});

test('keeper receives shield protection even when that impact destroys the bloom', () => {
 const S=load(),w=new S.World(260),p=plant(S,w,'shieldbloom'),keeper=new S.Player();
 p.plant.health=1;keeper.x=p.x;keeper.y=p.y;
 new S.MeteorManager(w)._impact({typeKey:'small',x:p.x,y:p.y,impactRadius:34,damage:12,color:'#fff'},keeper,particles,null,{});
 assert.equal(p.plant,null);assert.ok(keeper.health>88);
});
test('Starflower aura actually heals and replenishes the keeper during game updates', () => {
 const S=load();
 function sample(near) {
  const g=Object.create(S.Game.prototype);
  g.world=new S.World(260);g.world.hardMode=true;
  const p=plant(S,g.world,'starflower');
  g.player=new S.Player();g.player.health=50;g.player.energy=20;
  g.player.x=near?p.x:-100;g.player.y=near?p.y:-100;
  g.resources=new S.ResourceManager(g.world);g.resources.spawnTimer=100;
  g.meteors=new S.MeteorManager(g.world);g.meteors.spawningDisabled=true;
  g.objectives=new S.Objectives();g.upgrades=new S.UpgradeManager();
  g.state=S.STATE.PLAYING;g.hardMode=true;g.elapsedTime=0;g.timeBloomTimer=0;
  g.input={getMoveVector:()=>({x:0,y:0})};g.selectedPlant='glowgrass';
  g.particles={burst(){},update(){}};g.audio={};
  g.update(1);return g.player;
 }
 const near=sample(true),far=sample(false);
 assert.ok(near.health>50);assert.equal(far.health,50);assert.ok(near.energy>far.energy);
});
test('maturity is remembered even if the plant dies in the same game frame', () => {
 const S=load(),w=new S.World(260),o=new S.Objectives(),p=plant(S,w,'glowgrass');
 p.plant.growth=.99;
 S.Plants.update(.05,w,particles);
 assert.equal(p.plant.growth,1);
 S.Plants.damage(w,p,1000,particles);
 o.update(w,0);
 assert.ok(o.speciesGrown.has('glowgrass'));
 w.reset();const fresh=new S.Objectives();fresh.update(w,0);assert.equal(fresh.speciesGrown.size,0);
});
test('roomier garden keeps at least 15% more terrain with a 20% wider world', () => {
 const S=load(),w=new S.World(S.CONFIG.worldRadius);
 assert.equal(w.radius,312);
 assert.ok(w.totalPatches>=240*1.15);
 assert.ok(w.totalPatches<=240*1.25);
});
