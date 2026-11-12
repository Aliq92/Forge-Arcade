import test from 'node:test';
import assert from 'node:assert/strict';
import {UPGRADES,freshUpgrades,upgradeChoices,applyUpgrade} from '../upgrades.js';
const player=()=>({angle:0,shields:3,maxShields:3,keeperCharges:0});
test('six abilities have bounded levels and fresh independent resets',()=>{
  assert.deepEqual(UPGRADES.map(u=>u.id),['chain','pulse','time','wide','echo','keeper']);
  const a=freshUpgrades(), b=freshUpgrades();
  for(const u of UPGRADES) {
    const p=player();
    for(let i=0;i<u.maxLevel;i++) assert.equal(applyUpgrade(a,p,u.id).ok,true);
    const before=structuredClone({a,p});
    assert.equal(applyUpgrade(a,p,u.id).ok,false);
    assert.deepEqual({a,p},before);
    assert.equal(b[u.id],0);
  }
});
test('Pulse adds and repairs exactly one shield, bounded at five',()=>{
  const l=freshUpgrades(),p=player();p.shields=1;
  applyUpgrade(l,p,'pulse');assert.equal(p.shields,2);assert.equal(p.maxShields,4);
  applyUpgrade(l,p,'pulse');assert.equal(p.shields,3);assert.equal(p.maxShields,5);
});
test('Combo Keeper adds one charge per owned level, bounded at two',()=>{
  const l=freshUpgrades(),p=player();
  applyUpgrade(l,p,'keeper');assert.equal(p.keeperCharges,1);
  p.keeperCharges=0;applyUpgrade(l,p,'keeper');assert.equal(p.keeperCharges,1);
});
test('all 486 level combinations yield three distinct eligible nonmutating choices',()=>{
  for(let mask=0;mask<486;mask++) {
    let n=mask;const l=freshUpgrades(),p=player();
    for(const u of UPGRADES){l[u.id]=n%(u.maxLevel+1);n=Math.floor(n/(u.maxLevel+1));}
    const before=structuredClone({l,p});
    const choices=upgradeChoices(l,()=>.5,p);
    assert.equal(choices.length,3);assert.equal(new Set(choices.map(c=>c.id)).size,3);
    assert.deepEqual({l,p},before);
    for(const c of choices) {assert.ok(c.name&&c.description);assert.equal(applyUpgrade({...l},{...p},c.id).ok,true);}
  }
});
test('late Endless maintenance is valid, explicit and never silently wasted',()=>{
  const l=Object.fromEntries(UPGRADES.map(u=>[u.id,u.maxLevel]));const p=player();p.shields=5;p.maxShields=5;p.keeperCharges=2;
  const choices=upgradeChoices(l,()=>0,p);
  assert.deepEqual(new Set(choices.map(c=>c.id)),new Set(['repair','refresh','salvage']));
  for(const c of choices) {const result=applyUpgrade({...l},{...p},c.id);assert.ok(result.ok&&result.scoreBonus>0&&result.message);}
  p.shields=2;assert.equal(applyUpgrade(l,p,'repair').ok,true);assert.equal(p.shields,3);
  p.keeperCharges=0;assert.equal(applyUpgrade(l,p,'refresh').scoreBonus,250);assert.equal(p.keeperCharges,0);
});
test('invalid player state or ability ID rejects without mutation',()=>{
  for(const bad of [NaN,Infinity,-1,6]) {
    const l=freshUpgrades(),p=player();p.shields=bad;const before=structuredClone({l,p});
    assert.equal(applyUpgrade(l,p,'pulse').ok,false);assert.deepEqual({l,p},before);
  }
  const l=freshUpgrades(),p=player();assert.equal(applyUpgrade(l,p,'unknown').ok,false);
  assert.equal(l.pulse,0);assert.equal(p.shields,3);
});
test('full shield capacity excludes Pulse even when supplied levels have spare ranks',()=>{
  const l=freshUpgrades(),p=player();p.maxShields=5;p.shields=5;
  for(const value of [0,.2,.5,.9,1]) assert.ok(upgradeChoices(l,()=>value,p).every(c=>c.id!=='pulse'));
});
