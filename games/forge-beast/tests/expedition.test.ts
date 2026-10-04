import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/systems/Engine';
import { createCreature } from '../src/creatures/Creature';
import { createExploration } from '../src/creatures/Exploration';
import { ZONES, ZONE_IDS, OUTCOME_IDS, OUTCOMES, EXPEDITION_LIMITS } from '../src/data/expeditions';
import { ITEM_IDS, ITEMS } from '../src/data/items';
import { startExpedition, completeExpedition, outcomeWeights, selectExpeditionOutcome, expeditionEnergy } from '../src/systems/ExpeditionSystem';
import { addItem, removeItem, setItemQuantity } from '../src/systems/InventorySystem';
import { useItem } from '../src/systems/ItemSystem';
import { Persistence, migrateSave, validState } from '../src/systems/Persistence';
import { newEggState } from '../src/systems/ResetFlow';
import { DeviceNavigation } from '../src/components/DeviceNavigation';
import { expeditionMarkup } from '../src/components/ExplorationView';
import type { PersonalityId } from '../src/data/personalities';
function baby(personality: PersonalityId = 'curious') {
  const engine = new Engine(null, () => .99); engine.debugHatch(); engine.state.personality = personality;
  return engine;
}
function store() {
  const map = new Map<string,string>();
  return new Persistence({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}},'expedition-test');
}
test('three zones have increasing configurable active durations, risk and energy cost', () => {
  assert.deepEqual(ZONE_IDS.map(id=>ZONES[id].duration),[20,30,40]);
  assert.ok(ZONES.greenfield.energy < ZONES['scrap-yard'].energy);
  assert.ok(ZONES['scrap-yard'].energy < ZONES['dark-grove'].energy);
});
test('valid expedition reserves energy once, records departure and tracks active/wall timestamps', () => {
  const e=baby(), s=e.state, before=s.stats.energy;
  const result=e.explore('greenfield'); assert.equal(result.success,true);
  assert.equal(s.stats.energy,before-expeditionEnergy(s,'greenfield'));
  assert.equal(s.exploration.active!.endsAge-s.exploration.active!.startedAge,ZONES.greenfield.duration);
  assert.ok(s.exploration.active!.startedAt>0); assert.equal(s.exploration.statistics.started,1);
  assert.match(s.eventHistory.at(-1)!.message,/explored Greenfield/);
  const snapshot=structuredClone(s); assert.equal(e.explore('dark-grove').success,false); assert.deepEqual(s,snapshot);
});
test('egg, sleeping, poor health, hungry, insufficient energy and cooldown block departure without side effects', () => {
  const states=[createCreature(), ...['sleep','health','hunger','energy','cooldown'].map(kind=>{
    const s=baby().state;
    if(kind==='sleep'){s.sleeping=true;s.life.sleepStartedAge=s.age;}
    if(kind==='health')s.stats.health=10;
    if(kind==='hunger')s.stats.hunger=10;
    if(kind==='energy')s.stats.energy=10;
    if(kind==='cooldown')s.lastActionAge=s.age;
    return s;
  })];
  for(const s of states){const before=structuredClone(s);assert.equal(startExpedition(s,'dark-grove').success,false);assert.deepEqual(s,before);}
});
test('care and item use are blocked while away, preventing sleep/training or consuming items remotely', () => {
  const e=baby(); addItem(e.state,'snack');e.explore('greenfield');
  const before=structuredClone(e.state);
  for(const action of ['feed','train','play','sleep'] as const)assert.equal(e.action(action).success,false);
  assert.equal(e.useItem('snack').success,false);assert.deepEqual(e.state,before);
});
test('clock completion grants one reward and creates a saved result; extra ticks never duplicate it', () => {
  const e=baby();e.explore('greenfield');e.advance(19);assert.ok(e.state.exploration.active);
  e.advance(1);assert.equal(e.state.exploration.active,null);assert.ok(e.state.exploration.result);
  assert.equal(e.state.exploration.statistics.completed,1);assert.equal(e.state.exploration.discoveries.length,1);
  const inventory={...e.state.exploration.inventory};e.advance(10);
  assert.deepEqual(e.state.exploration.inventory,inventory);assert.equal(e.state.exploration.statistics.completed,1);
  assert.equal(completeExpedition(e.state),null);
  assert.equal(e.explore('greenfield').success,false);e.acknowledgeExpedition();assert.equal(e.explore('greenfield').success,true);
});
test('all data-driven outcomes are reachable, apply bounded effects and maintain zone statistics', () => {
  for(const id of OUTCOME_IDS){
    const e=baby();e.explore('dark-grove');const before={...e.state.stats};
    const r=completeExpedition(e.state,()=>0,id)!; assert.equal(r.outcome,id);
    assert.equal(r.rare,!!OUTCOMES[id].rare);assert.equal(r.failed,!!OUTCOMES[id].failed);
    assert.equal(e.state.exploration.statistics.zones['dark-grove'],1);
    assert.ok(e.state.stats.hunger<before.hunger);
    for(const n of Object.values(e.state.stats))assert.ok(n>=0&&n<=100);
    if(r.item)assert.equal(e.state.exploration.inventory[r.item],1);
    for(const [key,value] of Object.entries(OUTCOMES[id].effects)){
      if(key==='mood')continue;
      assert.equal(e.state.stats[key as keyof typeof before],Math.max(0,Math.min(100,before[key as keyof typeof before]+value)));
    }
    assert.equal(validState(e.state),true);
  }
});
test('outcome selection skips zero weights and supports finite, clamped random sources', () => {
  const s=baby('calm').state;
  assert.equal(selectExpeditionOutcome(s,'greenfield',()=>0),'common-item');
  assert.equal(selectExpeditionOutcome(s,'greenfield',()=>1),'nothing');
  assert.ok(OUTCOME_IDS.includes(selectExpeditionOutcome(s,'greenfield',()=>NaN)));
  const selected=new Set(Array.from({length:1000},(_,i)=>selectExpeditionOutcome(s,'dark-grove',()=>i/1000)));
  assert.deepEqual([...selected].sort(),[...OUTCOME_IDS].sort());
  assert.equal(Array.from({length:1000},(_,i)=>selectExpeditionOutcome(s,'greenfield',()=>i/1000)).includes('injury'),false);
});
test('Bold favors successful risky outcomes and Curious increases rare/unusual weights', () => {
  const base=baby('playful').state, bold=baby('bold').state, curious=baby('curious').state;
  const weights=(s:typeof base)=>Object.fromEntries(outcomeWeights(s,'dark-grove').map(e=>[e.id,e.weight]));
  assert.ok(weights(bold).injury<weights(base).injury);assert.ok(weights(bold).training>weights(base).training);
  assert.ok(weights(curious)['rare-item']>weights(base)['rare-item']);assert.ok(weights(curious).unusual>weights(base).unusual);
});
test('Calm pays less energy and Playful gains more mood from an identical journey', () => {
  const calm=baby('calm').state, normal=baby('curious').state, playful=baby('playful').state;
  for(const s of [calm,normal,playful]){s.stats.mood=40;startExpedition(s,'dark-grove',()=>.99);completeExpedition(s,()=>0,'joy');}
  assert.ok(calm.stats.energy>normal.stats.energy);assert.ok(playful.stats.mood>normal.stats.mood);
});
test('Stubborn can choose a safer detour; actual route controls cost, duration and rewards', () => {
  const s=baby('stubborn').state, before=s.stats.energy;
  assert.equal(startExpedition(s,'dark-grove',()=>0).success,true);
  assert.equal(s.exploration.active!.requestedZone,'dark-grove');assert.equal(s.exploration.active!.zone,'greenfield');
  assert.equal(s.exploration.active!.detoured,true);assert.equal(before-s.stats.energy,ZONES.greenfield.energy);
  assert.equal(s.exploration.active!.endsAge-s.age,ZONES.greenfield.duration);
  const r=completeExpedition(s,()=>0,'food')!;assert.equal(r.zone,'greenfield');
  const direct=baby('stubborn').state;startExpedition(direct,'dark-grove',()=>.99);assert.equal(direct.exploration.active!.detoured,false);
});
test('inventory stacks are bounded; add, remove and set reject malformed quantities and unknown IDs', () => {
  const s=baby().state;assert.equal(addItem(s,'snack',100),99);assert.equal(addItem(s,'snack'),0);
  assert.equal(removeItem(s,'snack',100),false);assert.equal(removeItem(s,'snack',99),true);
  assert.equal(setItemQuantity(s,'toy',5.9),true);assert.equal(s.exploration.inventory.toy,5);
  assert.equal(setItemQuantity(s,'toy',NaN),false);assert.equal(addItem(s,'toy',-1),0);
  assert.equal(removeItem(s,'toy',1.5),false);assert.equal(addItem(s,'unknown' as any),0);
  assert.equal(setItemQuantity(s,'toy',-5),true);assert.equal(s.exploration.inventory.toy,0);
});
test('each consumable applies only its definition and removes exactly one unit', () => {
  for(const id of ITEM_IDS.filter(id=>ITEMS[id].consumable)){
    const s=baby().state;for(const key of Object.keys(s.stats) as (keyof typeof s.stats)[])s.stats[key]=50;
    addItem(s,id,2);const before={...s.stats};const result=useItem(s,id);assert.equal(result.success,true);
    assert.equal(s.exploration.inventory[id],1);
    for(const key of Object.keys(s.stats) as (keyof typeof s.stats)[])assert.equal(s.stats[key],before[key]+(ITEMS[id].effects[key]??0));
    assert.equal(useItem(s,id).success,false);assert.equal(s.exploration.inventory[id],1);
  }
});
test('Strange Fragment inspection retains quantity and has no immediate stat effect', () => {
  const s=baby().state;addItem(s,'strange-fragment');const stats={...s.stats};
  assert.equal(useItem(s,'strange-fragment').success,true);assert.deepEqual(s.stats,stats);
  assert.equal(s.exploration.inventory['strange-fragment'],1);assert.match(s.eventHistory.at(-1)!.message,/quiet glow/);
});
test('unavailable, sleeping and egg item use never consume an item', () => {
  const egg=createCreature();addItem(egg,'snack');assert.equal(useItem(egg,'snack').success,false);
  const s=baby().state;assert.equal(useItem(s,'snack').success,false);addItem(s,'snack');s.sleeping=true;
  assert.equal(useItem(s,'snack').success,false);assert.equal(s.exploration.inventory.snack,1);
});
test('full inventory explicitly reports the find could not be stored', () => {
  const s=baby().state;setItemQuantity(s,'strange-fragment',99);startExpedition(s,'dark-grove');
  const r=completeExpedition(s,()=>0,'rare-item')!;assert.equal(r.stored,false);assert.match(r.message,/Stack full/);
  assert.equal(s.exploration.inventory['strange-fragment'],99);assert.equal(s.exploration.statistics.rare,1);
});
test('inventory, active expedition and timestamps round-trip; refresh resumes without charging energy twice', () => {
  const p=store(), e=baby();addItem(e.state,'toy',3);e.explore('scrap-yard');e.advance(7);p.save(e.state);
  const loaded=p.load()!;assert.deepEqual(loaded,e.state);const energy=loaded.stats.energy;
  const restored=new Engine(loaded,()=>.01);assert.equal(restored.animation,null);assert.equal(restored.state.stats.energy,energy);
  restored.advance(22);assert.ok(restored.state.exploration.active);restored.advance(1);assert.equal(restored.state.exploration.active,null);
  assert.equal(restored.state.exploration.statistics.completed,1);p.save(restored.state);
  const returned=new Engine(p.load()!);returned.advance(60);assert.equal(returned.state.exploration.statistics.completed,1);
  assert.deepEqual(returned.state.exploration.inventory,restored.state.exploration.inventory);
});
test('V0.3/V0.2 saves gain empty exploration state without losing creature progress or settings', () => {
  const old:any=structuredClone(baby().state);delete old.exploration;old.muted=true;old.hapticsEnabled=true;
  const migrated=migrateSave(old)!;assert.deepEqual(migrated.exploration,createExploration());
  assert.deepEqual(migrated.stats,old.stats);assert.deepEqual(migrated.eventHistory,old.eventHistory);
  assert.equal(migrated.personality,old.personality);assert.equal(migrated.hapticsEnabled,true);assert.equal(migrated.muted,true);
  delete old.hapticsEnabled;assert.equal(migrateSave(old)!.hapticsEnabled,false);
});
test('malformed exploration saves reject negative quantities, invalid routes, counters and result text', () => {
  const s=baby().state;
  const invalids=[(x:typeof s)=>{x.exploration.inventory.snack=-1;},(x:typeof s)=>{x.exploration.inventory.toy=1.5;},(x:typeof s)=>{x.exploration.statistics.completed=3;},(x:typeof s)=>{(x.exploration as any).active={zone:'moon'};},(x:typeof s)=>{(x.exploration as any).discoveries=[{message:'oops'}];}];
  for(const mutate of invalids){const copy=structuredClone(s);mutate(copy);assert.equal(migrateSave(copy),null);}
});
test('discovery history is bounded, and player reset clears trips, quantities and expedition statistics', () => {
  const s=baby().state;
  for(let i=0;i<30;i++){s.stats.energy=100;s.stats.hunger=100;s.lastActionAge=-100;startExpedition(s,'greenfield');completeExpedition(s,()=>0,'food');s.exploration.result=null;}
  assert.equal(s.exploration.discoveries.length,EXPEDITION_LIMITS.history);assert.equal(s.exploration.statistics.completed,30);
  s.stats.energy=100;startExpedition(s,'dark-grove');s.muted=true;
  const fresh=newEggState(s,{keepSettings:true});assert.deepEqual(fresh.exploration,createExploration());assert.equal(fresh.muted,true);
});
test('departure, return, success, rare and failed animations use distinct phases and debug can finish at departure', () => {
  const e=baby();e.explore('greenfield');assert.equal(e.animation!.kind,'depart');e.advance(2);assert.equal(e.animation,null);
  assert.equal(e.debugCompleteExpedition('rare-item'),true);assert.equal(e.animation!.kind,'rare');assert.equal(e.animation!.phase,'return');
  e.advance(1.2);assert.equal(e.animation!.phase,'rare');e.advance(2);assert.equal(e.animation,null);
  e.acknowledgeExpedition();e.explore('greenfield');assert.equal(e.debugCompleteExpedition('fatigue'),true);assert.equal(e.animation!.kind,'failure');
  e.advance(4);e.acknowledgeExpedition();e.state.stats.energy=90;e.state.stats.hunger=90;e.explore('greenfield');assert.equal(e.debugCompleteExpedition('food'),true);assert.equal(e.animation!.kind,'discover');
});
test('A/B/C selects zones, confirms departure, browses items and acknowledges results without moving old actions', () => {
  const nav=new DeviceNavigation();for(let i=0;i<5;i++)nav.press('select',0);nav.press('confirm',0);assert.equal(nav.expeditionPage,'zones');
  nav.press('select',0);assert.equal(nav.zoneIndex,1);nav.press('confirm',0);assert.equal(nav.expeditionPage,'confirm');
  assert.equal(nav.press('confirm',0).explore,'scrap-yard');nav.press('back',0);assert.equal(nav.expeditionPage,'zones');nav.press('back',0);
  nav.press('select',0);nav.press('confirm',0);assert.equal(nav.inventoryOpen,true);nav.press('confirm',0);assert.equal(nav.itemConfirm,true);
  assert.equal(nav.press('confirm',0).item,'snack');nav.press('back',0);assert.equal(nav.itemConfirm,false);
  nav.reset();nav.expeditionPage='result';assert.equal(nav.press('back',0).acknowledge,true);
});
test('result presentation escapes persisted text', () => {
  const s=baby().state;startExpedition(s,'greenfield');completeExpedition(s,()=>0,'food');
  s.exploration.result!.message='<img src=x onerror=alert(1)>';
  assert.ok(expeditionMarkup(s,'result',0)!.includes('&lt;img'));assert.ok(!expeditionMarkup(s,'result',0)!.includes('<img'));
});
