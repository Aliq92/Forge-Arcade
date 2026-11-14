import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalog} from '../src/discovery/catalog.mjs';
import {simulate,normalizeConfig,REACTIONS} from '../src/reaction/chemistry.mjs';
import {EXPERIMENTS} from '../src/reaction/experiments.mjs';
const load=f=>JSON.parse(fs.readFileSync(new URL('../src/data/'+f,import.meta.url)));
const cat=createCatalog(load('elements.json'),load('isotopes.json'),load('molecules.json'));
const config=(pairs,extra={})=>({reagents:pairs.map(([formId,quantity])=>({formId,quantity})),temperature:25,vessel:'beaker',activation:false,solventFraction:1,...extra});
const run=(pairs,extra)=>simulate(config(pairs,extra),cat);
const amount=(r,id,state)=>r.final.filter(x=>x.speciesId===id&&(!state||state===x.state)).reduce((n,x)=>n+x.amount,0);
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('invalid configurations fail closed without coercing quantities',()=>{
 for(const x of [null,{},'{}',{reagents:[]},config([['water',NaN]]),config([['water','5']]),config([['water',-1]]),config([['water',201]]),config([['water',150],['water',60]]),config([['acid',10],['base',10],['calcium',10],['carbonate',10],['water',200]]),config([['water',1]],{temperature:30}),JSON.parse('{"__proto__":{},"reagents":[]}')])assert.equal(normalizeConfig(x,cat).ok,false);
 assert.equal(normalizeConfig(config([['water',20],['water',10]]),cat).config.reagents[0].quantity,30);
 assert.equal(run([['water',Number.MIN_VALUE]]).valid,false);
});
test('salt dissolution finite capacity and recovery conserve water including removed vapor',()=>{
 const r=run([['water',1],['salt',10]]),mm=cat.get('NaCl').molarMass;
 near(amount(r,'ion:Na:1'),360/mm);near(amount(r,'NaCl','s'),10-360/mm);assert.equal(r.process,'dissolution');
 const recovered=run([['water',10],['salt',10]],{solventFraction:.05});
 assert.equal(recovered.process,'crystallization');near(amount(recovered,'H2O','g'),9.5*1000/cat.get('H2O').molarMass);assert.ok(amount(recovered,'NaCl','s')>0);
 assert.ok(recovered.products.some(x=>x.speciesId==='NaCl'&&x.state==='s'&&x.amount>0));
 near(recovered.products.filter(x=>x.speciesId==='NaCl').reduce((s,x)=>s+x.amount,0)+recovered.remaining.filter(x=>x.speciesId==='NaCl').reduce((s,x)=>s+x.amount,0),amount(recovered,'NaCl'));
 const unsaturated=run([['water',100],['salt',1]],{solventFraction:.9});assert.equal(unsaturated.process,'solvent-recovery');assert.equal(unsaturated.effect,'evaporation');
});
test('dilute sugar retains molecular identity; liquids distinguish layers from miscibility',()=>{
 assert.equal(run([['water',50],['sugar',2]]).process,'dissolution');assert.equal(run([['water',.01],['sugar',100]]).supported,false);
 near(amount(run([['water',50],['sugar',2]]),'sucrose','aq'),2);
 assert.equal(run([['water',20],['ethanol',10]]).process,'mixing');assert.equal(run([['water',20],['hexane',10]]).effect,'layers');
});
test('strong neutralization gives limiting amount, excess, spectators and analytical pH',()=>{
 const r=run([['acid',2],['base',1]]);near(r.extent,1);near(amount(r,'ion:H:1'),1);near(amount(r,'ion:Na:1'),1);near(amount(r,'ion:Cl:-1'),2);near(r.measurements.pH,-Math.log10(1/30),1e-9);assert.deepEqual(r.limiting,['ion:OH:-1']);
 near(run([['acid',1],['base',1]]).measurements.pH,7);
});
test('bicarbonate gas formation follows limiting acid with full excess ledger',()=>{
 const r=run([['acid',1],['bicarbonate',2]]);near(amount(r,'CO2','g'),1);near(amount(r,'ion:HCO3:-1'),1);near(amount(r,'ion:Na:1'),2);assert.equal(r.measurements.pH,null);
});
test('reduced Ksp retains equilibrium ions and predicts no precipitation after sufficient dilution',()=>{
 const r=run([['calcium',1],['carbonate',1]]);const residual=Math.sqrt(8.7e-9)*.02*1000;
 near(amount(r,'ion:Ca:2'),residual);near(amount(r,'CaCO3','s'),1-residual);near(amount(r,'ion:Cl:-1'),2);near(amount(r,'ion:Na:1'),2);
 const dilute=run([['calcium',.001],['carbonate',.001],['water',100]]);assert.equal(dilute.process,'mixing');near(amount(dilute,'CaCO3'),0);
 const excess=run([['calcium',2],['carbonate',1]]);near(amount(excess,'ion:Ca:2')-amount(excess,'ion:CO3:-2'),1);
});
test('phase endpoints and virtual activated water formation conserve identity and excess',()=>{
 assert.equal(run([['water',10]],{temperature:-10}).final[0].state,'s');assert.equal(run([['water',10]],{temperature:110}).final[0].state,'g');
 near(run([['water',10]],{temperature:-10}).measurements.volumeMl,0);
 near(run([['water',10]],{temperature:110}).measurements.volumeMl,0);
 assert.equal(run([['hydrogen',3],['oxygen',1]]).supported,false);
 const r=run([['hydrogen',3],['oxygen',1]],{vessel:'sealed',activation:true});near(amount(r,'H2O'),2);near(amount(r,'H2'),1);assert.equal(r.measurements.pressure,null);
 near(r.measurements.volumeMl,2*cat.get('H2O').molarMass/1000);
});
test('unsupported third forms do not trigger partial reactions or fake outcome effects',()=>{
 const r=run([['acid',1],['base',1],['sugar',1]]);assert.equal(r.valid,true);assert.equal(r.supported,false);assert.equal(r.heading,'NO VERIFIED REACTION AVAILABLE');assert.equal(r.effect,null);assert.deepEqual(r.final,r.initial);assert.deepEqual(r.products,[]);
 assert.equal(run([['acid',1],['base',1]],{temperature:110}).supported,false);
});
test('curated equations balance independently from result checks',()=>{
 for(const rule of REACTIONS){const atoms={},charge=[0,0];for(const [side,sign]of [['reactants',-1],['products',1]])for(const x of rule[side]){const e=cat.get(x.speciesId);assert.ok(e,x.speciesId);for(const [s,n]of Object.entries(e.elements))atoms[s]=(atoms[s]||0)+sign*n*x.coefficient;charge[sign===-1?0:1]+=e.charge*x.coefficient;}for(const v of Object.values(atoms))near(v,0);near(charge[0],charge[1]);}
});
test('all guided trials use deterministic conserving engine endpoints',()=>{
 assert.ok(EXPERIMENTS.length>=8);for(const e of EXPERIMENTS){const before=JSON.stringify(e.config),r=simulate(e.config,cat);assert.equal(r.supported,true,e.id);assert.equal(r.process,e.expectedProcess,e.id);assert.equal(r.conservation.atoms,true,e.id);assert.equal(r.conservation.charge,true,e.id);assert.ok(Math.abs(r.conservation.massError)<1e-8,e.id);assert.ok(r.final.every(x=>Number.isFinite(x.amount)&&x.amount>0));assert.deepEqual(simulate(e.config,cat),r);assert.equal(JSON.stringify(e.config),before);}
});
test('stoichiometry conservation sweep with independent atom accumulation',()=>{
 for(const pair of [['acid','base'],['acid','bicarbonate'],['calcium','carbonate']])for(const a of [.0001,.1,1,9])for(const b of [.0001,.1,1,9]){const r=run([[pair[0],a],[pair[1],b]]);assert.equal(r.supported,true);const tally=list=>{const out={};for(const x of list)for(const [s,n]of Object.entries(cat.get(x.speciesId).elements))out[s]=(out[s]||0)+x.amount*n;return out;};const i=tally(r.initial),f=tally(r.final);for(const s of Object.keys(i))near(i[s],f[s],1e-7);assert.ok(r.final.every(x=>x.amount>0));}
});
