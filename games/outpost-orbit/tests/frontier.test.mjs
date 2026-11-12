import test from 'node:test';
import assert from 'node:assert/strict';
import {create,step,place} from '../simulation.js';
import {initFrontier,mission,claimMission,buyUpgrade,upgradeCost,relief,repair,eventFactor,navigation,tickFrontier,onDelivery,onDiscover,UPGRADES} from '../frontier.js';
import {loadState} from '../persistence.js';
import * as original from './fixtures/original/simulation.js';

test('startup preserves five autonomous villagers and the original default movement model',()=>{
 const old=original.create(42),s=original.create(42);
 for(let i=0;i<200;i++){original.step(old,.1);step(s,.1);}
 assert.deepEqual(s,old);assert.equal(create(42).frontier.mission,0);
});
test('deliveries advance only actual delivered loads; mission rewards are once only',()=>{
 const s=create(42),before={...s.resources};assert.equal(claimMission(s),false);
 onDelivery(s,'material',8);assert.equal(mission(s).ready,true);
 assert.equal(s.resources.material,before.material);assert.equal(claimMission(s),true);const amount=s.resources.material;
 assert.equal(claimMission(s),false);assert.equal(s.resources.material,amount);assert.equal(s.frontier.mission,1);
 onDelivery(s,'food',8,{x:90,y:50});assert.equal(s.frontier.flash.x,90);assert.equal(s.frontier.flash.y,50);
});
test('all upgrades have finite costs, caps and atomic purchase checks',()=>{
 for(const id of Object.keys(UPGRADES)){
  const s=create(42);s.frontier.stage=3;for(const k in s.resources)s.resources[k]=200;
  const cost=upgradeCost(s,id),before={...s.resources};assert.equal(buyUpgrade(s,id),true);assert.equal(s.frontier.upgrades[id],1);
  for(const k in cost)assert.equal(s.resources[k],before[k]-cost[k]);
  assert.equal(buyUpgrade(s,id),true);assert.equal(buyUpgrade(s,id),false);assert.equal(s.frontier.upgrades[id],2);
 }
 const s=create(1);s.resources.material=0;const before=JSON.stringify(s);assert.equal(buyUpgrade(s,'cargo'),false);assert.equal(JSON.stringify(s),before);assert.equal(buyUpgrade(s,'nope'),false);
});
test('relief and timed events recover from shortages without repeated rewards',()=>{
 const s=create(17);for(const k in s.resources)s.resources[k]=0;
 assert.equal(relief(s),true);assert.equal(relief(s),false);assert.ok(s.resources.material>0&&s.resources.food>0&&s.resources.energy>0);
 const copy=structuredClone(s);for(let i=0;i<400;i++){tickFrontier(s,.5);tickFrontier(copy,.5);}assert.deepEqual(s,copy);
 s.frontier.event={kind:'solar',start:s.frontier.elapsed+8,end:s.frontier.elapsed+28,applied:false};assert.equal(eventFactor(s),1);tickFrontier(s,9);assert.ok(eventFactor(s)<1);tickFrontier(s,20);assert.equal(eventFactor(s),1);
 s.frontier.event={kind:'malfunction',start:0,end:s.frontier.elapsed+20};s.resources.material=4;assert.equal(repair(s),true);assert.equal(repair(s),false);
});
test('discoveries reward once and navigation points to a real target',()=>{
 const s=create(42),d=s.discoveries[1],before=s.resources.energy;
 onDiscover(s,d);onDiscover(s,d);assert.equal(s.resources.energy,before+8);
 const n=navigation(s,{x:0,y:0});assert.equal(n.id,'salvage');assert.ok(n.distance>0&&Number.isFinite(n.x)&&Number.isFinite(n.y));
});
test('old saves retain their colony, invalid and hostile metadata are rejected or bounded',()=>{
 const old=original.create(84);for(let i=0;i<100;i++)original.step(old,.1);const loaded=loadState(JSON.stringify(old));
 assert.ok(loaded);const serialized=JSON.parse(JSON.stringify(old));for(const k of ['aliens','buildings','resources','seed','time','discoveries'])assert.deepEqual(loaded[k],serialized[k]);assert.equal(loaded.frontier.mission,0);
 assert.equal(loadState('{'),null);assert.equal(loadState(JSON.stringify({saveVersion:1,aliens:[{}]})),null);
 loaded.frontier.mission=999;loaded.frontier.upgrades.cargo=999;const checked=loadState(JSON.stringify(loaded));assert.equal(checked.frontier.mission,0);assert.ok(checked.frontier.upgrades.cargo<=2);
 const fresh=create(84);assert.equal(fresh.frontier.completed,false);assert.equal(fresh.frontier.mission,0);
});
test('real crew gathering delivers cargo; upgraded transit, sensors and power affect simulation',()=>{
 const baseline=create(12),upgraded=create(12);upgraded.frontier.upgrades.engine=2;upgraded.frontier.upgrades.cargo=2;upgraded.frontier.upgrades.scanner=2;upgraded.frontier.upgrades.energy=2;
 for(let i=0;i<1800;i++){step(baseline,.1);step(upgraded,.1);}
 assert.ok(upgraded.frontier.deliveries.material>0);assert.ok(upgraded.frontier.deliveries.material>baseline.frontier.deliveries.material);
 assert.ok(upgraded.resources.energy>baseline.resources.energy);assert.ok(upgraded.revealed.some(p=>p.r>125));
});
test('damaged resource nodes, carried loads and social records cannot crash a restored colony',()=>{
 for(const mutate of [
  s=>s.nodes.forEach(n=>n.kind='food'),
  s=>s.aliens[0].relationships='bad',
  s=>s.aliens[0].carrying={kind:'nope',amount:8},
  s=>s.aliens[0].relationships={'999':80},
  s=>s.buildings[1].id=s.buildings[0].id,
  s=>s.discoveries[1].id=s.discoveries[0].id,
  s=>s.metrics={},
 ]){const s=create(42);mutate(s);assert.equal(loadState(JSON.stringify(s)),null);}
});
test('valid large legacy colonies are preserved instead of rejected by a new building cap',()=>{
 const s=original.create(42);
 // Persistence fixture: same valid object format as the unlimited original builder.
 for(let i=3;i<=110;i++)s.buildings.push({id:i,type:'storage',x:(i%12)*60-360,y:Math.floor(i/12)*50-250,progress:1});
 s.nextId=111;const loaded=loadState(JSON.stringify(s));assert.ok(loaded);assert.equal(loaded.buildings.length,110);
});
test('a legacy save taken on an arrival tick retains the colony and clamps original over-range needs',()=>{
 const s=original.create(42),a=structuredClone(s.aliens[0]);a.id=11;a.needs={hunger:70,rest:81,social:102};s.aliens.push(a);
 const loaded=loadState(JSON.stringify(s));assert.ok(loaded);assert.equal(loaded.aliens.length,6);assert.deepEqual(loaded.aliens.at(-1).needs,{hunger:70,rest:81,social:100});
});
test('full seeded campaign uses real simulation work, purchases and exploration, with no injected resources',()=>{
 for(const seed of [1,42,181]){
  const s=create(seed);let ticks=0;
  const structures=['habitat','garden','energy','workshop','research','storage'];
  while(!s.frontier.completed&&ticks++<18000){
   for(const type of structures){
    if(s.buildings.some(b=>b.type===type))continue;
    let placed=false;
    for(let y=-180;y<=180&&!placed;y+=60)for(let x=-240;x<=240&&!placed;x+=60)placed=place(s,type,x,y);
   }
   for(const id of ['cargo','energy','engine','scanner','station'])if(s.frontier.upgrades[id]<(id==='station'?2:1))buyUpgrade(s,id);
   claimMission(s);step(s,.2);
  }
  assert.equal(s.frontier.completed,true,`seed ${seed} stuck at ${mission(s).title}, t=${s.time}`);
  assert.equal(s.frontier.stage,3);assert.equal(s.frontier.mission,9);assert.ok(s.frontier.deliveries.material>=8&&s.frontier.deliveries.food>=8);
  const snapshot=JSON.stringify(s.frontier);claimMission(s);assert.equal(JSON.stringify(s.frontier),snapshot);
  const saved=loadState(JSON.stringify(s));assert.equal(saved.frontier.completed,true);step(saved,.1);assert.ok(saved.time>s.time);
 }
});
test('each module changes its actual crew or station operation',()=>{
 const setup=()=>{const s=create(4);s.aliens=s.aliens.slice(0,1);const a=s.aliens[0];a.x=0;a.y=0;a.px=0;a.py=0;a.task={kind:'gather',target:{x:100,y:0,id:'salvage'},phase:'walk',remaining:10,elapsed:0,waypoints:[{x:100,y:0}]};return s;};
 const base=setup(),engine=setup();engine.frontier.upgrades.engine=1;step(base,.1);step(engine,.1);assert.ok(Math.abs(engine.aliens[0].x/base.aliens[0].x-1.2)<1e-9);
 const load=setup(),cargo=setup();load.aliens[0].task.phase=cargo.aliens[0].task.phase='work';load.aliens[0].task.remaining=cargo.aliens[0].task.remaining=.05;cargo.frontier.upgrades.cargo=1;step(load,.1);step(cargo,.1);assert.equal(cargo.aliens[0].carrying.amount-load.aliens[0].carrying.amount,4);
 const normal=setup(),scanner=setup();for(const s of [normal,scanner]){const d=s.discoveries[1],a=s.aliens[0];a.x=d.x-100;a.y=d.y;a.task.kind='explore';}scanner.frontier.upgrades.scanner=1;step(normal,.1);step(scanner,.1);assert.equal(normal.discoveries[1].found,false);assert.equal(scanner.discoveries[1].found,true);
 const power=setup(),station=setup(),plain=setup();power.frontier.upgrades.energy=1;station.frontier.upgrades.station=1;step(power,1);step(station,1);step(plain,1);assert.ok(Math.abs(power.resources.energy-plain.resources.energy-.06)<1e-8);assert.ok(Math.abs(station.resources.material-plain.resources.material-.025)<1e-8);
});
