import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseConfiguration,ionConfiguration,orbitalBoxes,atomCounts} from '../src/chemistry/atomic.mjs';
import {formula,validateGraph,recognize,formalCharges} from '../src/chemistry/molecular.mjs';
import {Workspace} from '../src/chemistry/workspace.mjs';
const load=f=>JSON.parse(fs.readFileSync(new URL('../src/data/'+f,import.meta.url))),elements=load('elements.json'),refs=load('molecules.json');
test('all neutral configurations sum to Z, including neutral exceptions and predictions',()=>{for(const e of elements)assert.equal(parseConfiguration(e.configuration).reduce((s,o)=>s+o.count,0),e.z,e.symbol);});
test('supported ions have correct electron configurations; transition ion configurations stay unsupported',()=>{
 for(const [s,q,n]of [['Na',1,10],['Mg',2,10],['Ca',2,18],['Cl',-1,18],['O',-2,10]]){const e=elements.find(e=>e.symbol===s);assert.equal(ionConfiguration(e,q,elements).orbitals.reduce((a,o)=>a+o.count,0),n);assert.equal(atomCounts(e.z,e.z+10,q).electrons,n);}
 assert.equal(ionConfiguration(elements[25],2,elements).supported,false);assert.throws(()=>atomCounts(6,5,0));assert.throws(()=>atomCounts(6,12,7));
});
test('Hund occupancy singly fills degenerate boxes before pairing',()=>{assert.deepEqual(orbitalBoxes({orbital:'2p',count:4}),['↑↓','↑','↑']);});
test('reference formulas, formal charges, recognition and validation agree',()=>{for(const m of refs){assert.equal(formula(m),m.id==='NH3'?'H3N':m.id);assert.equal(validateGraph(m,refs).status,'SUPPORTED',m.id);assert.ok(formalCharges(m).every(a=>a.charge===0));const reordered={...m,atoms:[...m.atoms].reverse()};assert.equal(recognize(reordered,refs)?.reference.id,m.id);}});
test('formula uses Hill ordering, distinguishes empirical formula and counts graph atoms',()=>{const m=refs.find(m=>m.id==='C2H4');assert.equal(formula(m,true),'CH2');assert.equal(formula(refs.find(m=>m.id==='NH3')),'H3N');});
test('bad endpoints, duplicate bonds and hydrogen overbonding fail within model',()=>{
 const h=structuredClone(refs[0]);h.bonds.push({...h.bonds[0]});assert.equal(validateGraph(h,refs).status,'INVALID WITHIN MODEL');h.bonds=[{a:'a0',b:'missing',order:1}];assert.equal(validateGraph(h,refs).status,'INVALID WITHIN MODEL');h.bonds=[{a:'a0',b:'a1',order:2}];assert.equal(validateGraph(h,refs).status,'INVALID WITHIN MODEL');
});
test('unfamiliar but correctly counted charged species are warnings, not called impossible',()=>{
 const m=structuredClone(refs.find(m=>m.id==='NH3'));m.atoms[0].lonePairs=0;m.atoms.push({id:'extra',symbol:'H',lonePairs:0,unpaired:0});m.bonds.push({a:m.atoms[0].id,b:'extra',order:1});m.charge=1;
 assert.equal(formalCharges(m)[0].charge,1);assert.equal(validateGraph(m,refs).status,'MODEL WARNING');
});
test('formula alone cannot establish supported identity or chemical validity',()=>{const m=structuredClone(refs.find(m=>m.id==='H2O'));m.bonds=[{a:'a0',b:'a1',order:2}];assert.equal(recognize(m,refs),null);assert.equal(validateGraph(m,refs).status,'INVALID WITHIN MODEL');});
test('undo restores deletion, bond order and reset with bounded history',()=>{
 const w=new Workspace();w.load(refs[0]);w.bond('a0','a1',2);assert.equal(w.graph.bonds[0].order,2);w.undo();assert.equal(w.graph.bonds[0].order,1);w.deleteAtom('a0');assert.equal(w.graph.bonds.length,0);w.undo();assert.equal(w.graph.atoms.length,2);w.reset();w.undo();assert.equal(w.graph.atoms.length,2);
});
test('explicit non-finite particle accounting never becomes a supported neutral molecule',()=>{
 const m=structuredClone(refs[0]);m.charge=NaN;assert.equal(validateGraph(m,refs).status,'INVALID WITHIN MODEL');m.charge=0;m.atoms[0].unpaired=NaN;assert.equal(validateGraph(m,refs).status,'INVALID WITHIN MODEL');
});
test('reference recognition survives fully renamed atom identifiers',()=>{
 for(const ref of refs){const m=structuredClone(ref),ids=new Map(m.atoms.map((a,i)=>[a.id,'renamed'+i]));m.atoms.forEach(a=>a.id=ids.get(a.id));m.bonds.forEach(b=>{b.a=ids.get(b.a);b.b=ids.get(b.b);});assert.equal(validateGraph(m,refs).reference?.id,ref.id);}
});

