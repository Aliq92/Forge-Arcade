import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalog} from '../src/discovery/catalog.mjs';
import {DiscoveryStore} from '../src/discovery/store.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../src/data/${n}.json`,import.meta.url)));
const catalog=createCatalog(read('elements'),read('isotopes'),read('molecules'));
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};
test('catalogue derives scientific identities, immutable formula composition and bounded forms',()=>{
 assert.equal(catalog.get('element:O').name,'Oxygen');assert.deepEqual(catalog.get('H2O').elements,{H:2,O:1});
 assert.ok(Math.abs(catalog.get('H2O').molarMass-18.015)<.01);
 assert.deepEqual(catalog.get('CaCO3').elements,{Ca:1,C:1,O:3});
 assert.equal(catalog.get('ion:Cl:-1').charge,-1);assert.equal(catalog.get('atom:H:99'),null);
 assert.equal(catalog.get('atom:H:2').molarMass,catalog.get('isotope:H:2').molarMass);
 assert.equal(catalog.get('__proto__'),null);assert.equal(catalog.reagent('acid').concentration,.1);
 assert.equal(catalog.reagent('salt').stock,100);assert.equal(catalog.reagent('water').density,1);
 assert.throws(()=>{catalog.get('H2O').elements.H=9;});
 assert.equal(catalog.all.filter(x=>x.referenceId).length,9);
});
test('atomic identities unlock appropriate bulk forms without copying live state',()=>{
 const s=new DiscoveryStore(catalog,memory()),atom={z:1,a:1,q:0,position:{x:5}};
 s.discoverAtom(atom);assert.ok(s.has('atom:H:1'));assert.ok(s.has('isotope:H:1'));
 assert.deepEqual(s.importForm('element:H').forms.map(x=>x.id),['hydrogen']);
 assert.equal(s.importForm('isotope:H:1').ok,false);s.discoverAtom({z:1,a:999,q:0});assert.equal(s.has('atom:H:999'),false);
 assert.equal(s.importForm('NaCl').ok,false);s.discoverElement('Na');assert.equal(s.importForm('element:Na').ok,false);
 assert.equal(s.record('H2O','invalid-source'),false);assert.equal(s.discoverMolecule('H2O'),true);assert.equal(s.discoverMolecule('H2O'),false);
 atom.position.x=99;assert.equal(JSON.stringify(s.records).includes('position'),false);
 assert.equal(s.recordProducts([{speciesId:'CaCO3',amount:2,state:'s'},{speciesId:'NaCl',amount:0,state:'s'},{speciesId:'evil',amount:1,state:'l'}]),1);
 assert.equal(s.available().find(x=>x.id==='CaCO3').sources[0],'reaction-lab');
 const ions=new DiscoveryStore(catalog,memory());ions.discoverAtom({z:1,a:1,q:1});assert.equal(ions.has('ion:H:1'),true);assert.equal(ions.importForm('element:H').ok,false);
});
test('blocked browser localStorage property remains an observable write error',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Browser storage blocked');}});
 try{const s=new DiscoveryStore(catalog);assert.ok(s.error);s.discoverElement('H');assert.ok(s.error);assert.equal(s.save(),false);}finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
test('migration maps only validated sequential progress and never writes atomic progress',()=>{
 const storage=memory();storage.map.set('elemental.progress.v1','keep-me');const s=new DiscoveryStore(catalog,storage);
 s.migrateLegacy({completed:[1,2,3,4,5,6,7,9]});assert.ok(s.has('H2O'));assert.equal(s.has('CO2'),false);assert.ok(s.has('ion:Na:1'));
 const count=s.records.length;s.migrateLegacy({completed:[1,2,3,4,5,6,7,9]});assert.equal(s.records.length,count);
 assert.equal(storage.map.get('elemental.progress.v1'),'keep-me');
});
test('automatic legacy migration preserves an unreadable or newer shared discovery record',()=>{
 for(const raw of ['{broken',JSON.stringify({v:99,records:[]})]){const storage=memory();storage.map.set('elemental.discovery.v1',raw);const s=new DiscoveryStore(catalog,storage);s.migrateLegacy({completed:[1,2,3,4,5,6,7]});assert.equal(storage.map.get('elemental.discovery.v1'),raw);assert.ok(s.error);}
});
test('legacy completions preserve known identities without guessing unrecorded carbon or sodium isotopes',()=>{
 const storage=memory(),s=new DiscoveryStore(catalog,storage),legacy={completed:[1,2,3,4]};
 s.migrateLegacy(legacy);assert.equal(s.has('element:C'),true);assert.equal(s.has('ion:Na:1'),true);
 for(const a of [12,13,14]){assert.equal(s.has(`atom:C:${a}`),false);assert.equal(s.has(`isotope:C:${a}`),false);}
 assert.equal(s.has('isotope:Na:23'),false);assert.equal(s.has('atom:Na:23'),false);
 for(const a of [1,2]){assert.equal(s.has(`atom:H:${a}`),true);assert.equal(s.has(`isotope:H:${a}`),true);}
 const before=JSON.stringify(s.records);s.migrateLegacy(legacy);assert.equal(JSON.stringify(s.records),before);
});
test('discovery persistence validates entire schema, tolerates blocked getters and preserves corrupt/future text',()=>{
 for(const raw of ['{bad',JSON.stringify({v:9,records:[]}),JSON.stringify({v:1,records:[{id:'H2O',sources:['x'],firstSeen:'no'}]})]){
 const storage=memory();storage.map.set('elemental.discovery.v1',raw);const s=new DiscoveryStore(catalog,storage);
 assert.equal(s.records.length,0);assert.ok(s.error);assert.equal(storage.map.get('elemental.discovery.v1'),raw);
 s.discoverMolecule('H2O');assert.equal(new DiscoveryStore(catalog,storage).has('H2O'),true);
 }
 const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const s=new DiscoveryStore(catalog,storage);assert.ok(s.error);assert.doesNotThrow(()=>s.discoverElement('H'));assert.ok(s.error);
});
