import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createCatalog} from '../src/discovery/catalog.mjs';import {ReactionStore} from '../src/reaction/store.mjs';
import {simulate} from '../src/reaction/chemistry.mjs';import {EXPERIMENTS} from '../src/reaction/experiments.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../src/data/${n}.json`,import.meta.url)));
const catalog=createCatalog(read('elements'),read('isotopes'),read('molecules'));
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};
const config={reagents:[{formId:'water',quantity:20},{formId:'salt',quantity:5}],temperature:25,vessel:'beaker',activation:false,solventFraction:1};
const result={valid:true,supported:true,process:'dissolution',ruleId:'salt-dissolution',effect:'dissolve',equation:'NaCl(s) → Na⁺(aq) + Cl⁻(aq)',explanation:'Salt dissolves.',observations:['Dissolution'],warnings:[],initial:[{speciesId:'NaCl',amount:5,state:'s'}],products:[{speciesId:'ion:Na:1',amount:5,state:'aq'},{speciesId:'ion:Cl:-1',amount:5,state:'aq'}],remaining:[],final:[{speciesId:'ion:Na:1',amount:5,state:'aq'},{speciesId:'ion:Cl:-1',amount:5,state:'aq'}],extent:5,limiting:[],conservation:{atoms:true,charge:true,massError:0,atomResiduals:{},chargeResidual:0},measurements:{massG:.2922,volumeMl:20,pH:null,temperature:25,pressure:null}};
test('reaction save is independent, inventory unlocks never create stock, session and setup are copied',()=>{
 const storage=memory();storage.map.set('elemental.progress.v1','old');const s=new ReactionStore(catalog,storage);
 assert.equal(s.data.inventory.length,10);assert.equal(s.addInventory('hydrogen'),true);assert.equal(s.addInventory('hydrogen'),false);assert.equal(s.addInventory('__proto__'),false);
 assert.equal(s.saveSession(config),true);const input=structuredClone(config);assert.equal(s.saveSetup('Salt study',input),true);input.reagents[0].quantity=199;
 assert.equal(s.data.setups[0].config.reagents[0].quantity,5); // normalized by stable form ID
 assert.equal(s.session.reagents.find(r=>r.formId==='water').quantity,20);
 assert.equal(s.saveSession({...config,temperature:Infinity}),false);assert.equal(s.session.temperature,25);
 assert.equal(new ReactionStore(catalog,storage).data.inventory.includes('hydrogen'),true);assert.equal(storage.map.get('elemental.progress.v1'),'old');
});
test('setup import bounds stocks, duplicates, solution volume, keys and special numbers',()=>{
 const s=new ReactionStore(catalog,memory());assert.deepEqual(s.parseSetup(s.exportSetup(config)),s.session??s.parseSetup(s.exportSetup(config)));
 const bad=[{...config,reagents:[{formId:'salt',quantity:101}]},{...config,reagents:[{formId:'acid',quantity:10},{formId:'base',quantity:10},{formId:'bicarbonate',quantity:10},{formId:'calcium',quantity:10},{formId:'carbonate',quantity:10},{formId:'water',quantity:1}]},{...config,reagents:[{formId:'salt',quantity:60},{formId:'salt',quantity:60}]},{...config,activation:'false'},{...config,reagents:[{formId:'unknown',quantity:1}]},{...config,reagents:[{formId:'salt',quantity:NaN}]}];
 for(const c of bad)assert.equal(s.saveSession(c),false);
 assert.throws(()=>s.parseSetup('{bad'));assert.throws(()=>s.parseSetup(JSON.stringify({v:2,config})));
 assert.throws(()=>s.parseSetup('{"v":1,"config":{"__proto__":{},"reagents":[]}}'));
 assert.equal(s.saveSession({...config,reagents:[{formId:'salt',quantity:50},{formId:'salt',quantity:50}]}),true);assert.equal(s.session.reagents[0].quantity,100);
});
test('journal deduplicates normalized trials, verifies completion, and rejects invalid result identities',()=>{
 const s=new ReactionStore(catalog,memory());assert.equal(s.recordRun('salt-dissolution',config,result),true);
 const reverse={...config,reagents:[...config.reagents].reverse()};assert.equal(s.recordRun('salt-dissolution',reverse,result),false);assert.deepEqual(s.data.completed,['salt-dissolution']);
 const unsupported={...result,supported:false,process:'unsupported',ruleId:null,effect:null};assert.equal(s.recordRun('free',{...config,vessel:'flask'},unsupported),true);assert.equal(s.data.completed.length,1);
 assert.equal(s.recordRun('neutralization',{...config,vessel:'sealed'},result),true);assert.equal(s.data.completed.length,1);
 assert.equal(s.recordRun('made-up',config,result),false);
 assert.equal(s.recordRun('free',config,{...result,products:[{speciesId:'evil',amount:1,state:'s'}]}),false);
 assert.equal(s.recordRun('free',config,{...result,products:[{speciesId:'NaCl',amount:Infinity,state:'s'}]}),false);
 assert.equal(s.recordRun('free',config,{...result,valid:false}),false);
 assert.equal(s.recordRun('free',config,{...result,conservation:{...result.conservation,atoms:false}}),true);
 assert.equal(s.data.completed.includes('free'),false);
});
test('actual guided outcomes persist including dilute threshold; mismatched process cannot complete',()=>{
 const storage=memory(),s=new ReactionStore(catalog,storage);
 for(const exp of EXPERIMENTS){const outcome=simulate(exp.config,catalog);assert.equal(s.recordRun(exp.id,exp.config,outcome),true,`${exp.id}: ${s.error}`);}
 assert.equal(s.data.completed.length,EXPERIMENTS.length);
 const loaded=new ReactionStore(catalog,storage);assert.equal(loaded.error,null);assert.equal(loaded.data.journal.length,EXPERIMENTS.length);
 const unsupported={...config,reagents:[{formId:'salt',quantity:1},{formId:'ethanol',quantity:10}]};assert.equal(s.recordRun('free',unsupported,simulate(unsupported,catalog)),true);
 const emptyWater={...config,reagents:[{formId:'water',quantity:20}]};const s2=new ReactionStore(catalog,memory());assert.equal(s2.recordRun('water-phase',emptyWater,simulate(emptyWater,catalog)),true);assert.equal(s2.data.completed.length,0);
});
test('valid nonambient unsupported mixtures persist and journal without claiming completion',()=>{
 const storage=memory(),s=new ReactionStore(catalog,storage),trial={...config,temperature:110};
 const outcome=simulate(trial,catalog);assert.equal(outcome.valid,true);assert.equal(outcome.supported,false);
 assert.equal(s.saveSession(trial),true);assert.equal(s.saveSetup('Unsupported temperature',trial),true);
 assert.equal(s.recordRun('free',trial,outcome),true);assert.equal(s.data.completed.length,0);
 const loaded=new ReactionStore(catalog,storage);assert.equal(loaded.error,null);assert.equal(loaded.session.temperature,110);assert.equal(loaded.data.journal[0].result.supported,false);
});
test('valid unsupported solvent settings can roundtrip setups and retain the actual unsupported observation',()=>{
 const storage=memory(),s=new ReactionStore(catalog,storage),trial={...config,reagents:[{formId:'water',quantity:20},{formId:'ethanol',quantity:10}],solventFraction:.5};
 const outcome=simulate(trial,catalog);assert.equal(outcome.valid,true);assert.equal(outcome.supported,false);
 assert.equal(s.saveSession(trial),true);assert.deepEqual(s.parseSetup(s.exportSetup(trial)),s.session);
 assert.equal(s.recordRun('miscible-liquids',trial,outcome),true);assert.deepEqual(s.data.completed,[]);
 const loaded=new ReactionStore(catalog,storage);assert.equal(loaded.error,null);assert.equal(loaded.session.solventFraction,.5);assert.equal(loaded.data.journal.length,1);
});
test('engine result configuration must match the normalized trial both when recording and loading',()=>{
 const storage=memory(),s=new ReactionStore(catalog,storage),outcome=simulate(config,catalog),changed={...config,vessel:'flask'};
 assert.equal(s.recordRun('salt-dissolution',changed,outcome),false);assert.equal(s.data.journal.length,0);assert.deepEqual(s.data.completed,[]);
 const reversed={...config,reagents:[...config.reagents].reverse()};assert.equal(s.recordRun('salt-dissolution',reversed,outcome),true);
 const data=JSON.parse(storage.map.get('elemental.reaction.v1'));data.journal[0].result.config.vessel='flask';const raw=JSON.stringify(data);storage.map.set('elemental.reaction.v1',raw);
 const loaded=new ReactionStore(catalog,storage);assert.ok(loaded.error);assert.equal(loaded.data.journal.length,0);assert.equal(storage.map.get('elemental.reaction.v1'),raw);
});
test('bounded journal/setups, schema guards, blocked storage and future saves remain safe',()=>{
 const storage=memory(),s=new ReactionStore(catalog,storage);
 for(let i=1;i<=110;i++)s.recordRun('free',{...config,reagents:[{formId:'water',quantity:i}]},result);
 assert.equal(s.data.journal.length,100);
 for(let i=0;i<10;i++)s.saveSetup('Setup '+i,config);assert.equal(s.data.setups.length,8);
 for(const raw of ['{bad',JSON.stringify({v:4}),JSON.stringify({...s.data,inventory:['bogus']})]){
 storage.map.set('elemental.reaction.v1',raw);const load=new ReactionStore(catalog,storage);assert.ok(load.error);assert.equal(storage.map.get('elemental.reaction.v1'),raw);assert.equal(load.data.journal.length,0);
 }
 const blocked=new ReactionStore(catalog,{getItem(){throw Error('denied');},setItem(){throw Error('denied');}});assert.ok(blocked.error);assert.doesNotThrow(()=>blocked.saveSession(config));assert.ok(blocked.error);
});
test('blocked localStorage property reports failed save while allowing in-memory work',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked property');}});
 try{const s=new ReactionStore(catalog);assert.ok(s.error);s.saveSession(config);assert.ok(s.error);assert.equal(s.save(),false);assert.equal(s.session.vessel,'beaker');}finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
