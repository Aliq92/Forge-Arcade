import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const load=f=>JSON.parse(fs.readFileSync(new URL('../src/data/'+f,import.meta.url)));
const elements=load('elements.json'),isotopes=load('isotopes.json'),molecules=load('molecules.json');
test('118 unique numbered elements have source-backed weights and valid table positions',()=>{
 assert.equal(elements.length,118);assert.equal(new Set(elements.map(e=>e.symbol)).size,118);
 elements.forEach((e,i)=>{assert.equal(e.z,i+1);assert.match(e.weight,/^[\d\[]/);assert.ok(e.period>=1&&e.period<=7);assert.ok(e.column>=1&&e.column<=18);});
 for(const [symbol,z]of [['H',1],['C',6],['O',8],['Na',11]])assert.equal(elements.find(e=>e.symbol===symbol).z,z);
 assert.equal(elements.find(e=>e.symbol==='Tc').weightKind,'mass-number');assert.match(elements[0].weight,/,/);
});
test('isotopes retain verified integer particle relationships and stability',()=>{
 for(const i of isotopes){assert.equal(i.z+i.neutrons,i.a);assert.ok(['stable','radioactive'].includes(i.stability));assert.match(i.source,/iaea/);}
 assert.equal(isotopes.find(i=>i.symbol==='H'&&i.a===2).stability,'stable');assert.equal(isotopes.find(i=>i.symbol==='C'&&i.a===14).stability,'radioactive');
});
test('documented NIST correction places lawrencium electron in 7p and calculated states remain predictions',()=>{
 assert.match(elements[102].configuration,/7p1/);assert.doesNotMatch(elements[102].configuration,/6d1\b/);assert.equal(elements[108].configurationStatus,'prediction');
});
test('all nine geometry records have real source identifiers and finite coordinates',()=>{
 assert.equal(molecules.length,9);for(const m of molecules){assert.match(m.source,/casno=\d+/);for(const a of m.atoms)assert.ok(a.position.every(Number.isFinite));}
 const water=molecules.find(m=>m.id==='H2O'),[o,h1,h2]=water.atoms.map(a=>a.position),v=h1.map((x,i)=>x-o[i]),w=h2.map((x,i)=>x-o[i]);const angle=Math.acos(v.reduce((s,x,i)=>s+x*w[i],0)/Math.hypot(...v)/Math.hypot(...w))*180/Math.PI;assert.ok(Math.abs(angle-104.478)<.02);
});
test('reference geometry preserves linear, tetrahedral, pyramidal and planar features',()=>{
 const get=id=>molecules.find(m=>m.id===id),norm=p=>Math.hypot(...p),angle=(a,b)=>Math.acos(a.reduce((n,x,i)=>n+x*b[i],0)/norm(a)/norm(b))*180/Math.PI;
 assert.ok(Math.abs(angle(get('CO2').atoms[1].position,get('CO2').atoms[2].position)-180)<.01);
 assert.ok(Math.abs(angle(get('CH4').atoms[1].position,get('CH4').atoms[2].position)-109.4712)<.01);
 assert.ok(Math.abs(angle(get('NH3').atoms[1].position,get('NH3').atoms[2].position)-106.7)<1);
 assert.ok(get('C2H4').atoms.every(a=>a.position[0]===0));assert.ok(get('C2H2').atoms.every(a=>a.position[0]===0&&a.position[1]===0));
 const lengths={H2:.7414,O2:1.2075,N2:1.0976};for(const [id,length]of Object.entries(lengths)){const [a,b]=get(id).atoms.map(a=>a.position);assert.ok(Math.abs(norm(a.map((v,i)=>v-b[i]))-length)<1e-4);}
});
