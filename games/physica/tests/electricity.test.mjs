import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, normalizeConfig, solveCircuit, EXPERIMENTS } from '../labs/electricity.js';
const close = (a,b,t=1e-10) => assert.ok(Math.abs(a-b)<=t, `${a} != ${b}`);
const nodes = (...ids) => ids.map((id,i)=>({id,x:i%11,y:1+Math.floor(i/11)}));
const circuit = (components, ids=['0','p','q']) => ({nodes:nodes(...ids),components,ground:'0'});
const source = {id:'s',type:'source',a:'p',b:'0',value:12};
const resistor = {id:'r',type:'resistor',a:'q',b:'0',value:100};

test('actual C10/C11/C12 models and all guided experiment contents',()=>{
  const a=createModel('ohm',{voltage:6,resistance:100});
  const b=createModel('series',{voltage:12,resistance:200,resistance2:100});
  const c=createModel('power',{voltage:9,resistance:81});
  for(const m of [a,b,c]) { assert.equal(m.valid,true); for(let i=0;i<12;i++)m.step(); close(m.time,.6); }
  close(a.measure().current,.06);close(b.measure().outputVoltage,4);close(c.measure().power,1);
  assert.deepEqual(EXPERIMENTS.map(e=>e.id),['E1','E2','E3','E4']);
  for(const e of EXPERIMENTS) { for(const k of ['title','objective','prediction','explanation'])assert.ok(e[k]);assert.ok(createModel(e.mode,e.defaults).valid); }
});
test('ideal series ammeter and parallel voltmeter are part of solved topology',()=>{
  const r=solveCircuit(circuit([source,{id:'a',type:'ammeter',a:'p',b:'q'},resistor,{id:'v',type:'voltmeter',a:'q',b:'0'}]));
  assert.equal(r.valid,true);close(r.meters.a,.12);close(r.meters.v,12);close(r.branchCurrents.v,0);close(r.branchCurrents.s,-.12);
  close(r.branchPowers.s,-1.44);close(r.branchPowers.r,1.44);close(r.kclResidual,0);close(r.kvlResidual,0);close(r.powerResidual,0);
});
test('mixed network agrees with analytical KCL and output potential',()=>{
  const r=solveCircuit(circuit([source,{id:'r1',type:'resistor',a:'p',b:'q',value:100},{...resistor,value:200},{id:'r3',type:'resistor',a:'q',b:'0',value:200}]));
  assert.equal(r.valid,true);close(r.nodeVoltages.q,6);close(r.branchCurrents.r1,.06);close(r.branchCurrents.r,.03);
});
test('open switch has zero current while grounded disconnected load remains defined',()=>{
  const m=createModel('ohm',{closed:false});assert.equal(m.valid,true);close(m.measure().current,0);close(m.measure().power,0);close(m.state.result.branchCurrents.switch,0);
});
test('short/conflict/redundant ideal loops and floating nodes fail with explanations',()=>{
  const cases=[
    circuit([source,{id:'w',type:'wire',a:'p',b:'0'}],['0','p']),
    circuit([source,{...source,id:'s2',value:9}],['0','p']),
    circuit([source,{...source,id:'s2'}],['0','p']),
    circuit([source,{...resistor,a:'q',b:'z'}],['0','p','q','z']),
    circuit([source,{id:'v',type:'voltmeter',a:'p',b:'q'}])
  ];
  for(const c of cases){const r=solveCircuit(c);assert.equal(r.valid,false);assert.ok(r.errors.length);assert.deepEqual(r.nodeVoltages,{});}
});
test('parallel ammeter is an ideal short, not a decorative readout',()=>{
 const r=solveCircuit(circuit([source,{id:'a',type:'ammeter',a:'p',b:'0'}],['0','p']));assert.equal(r.valid,false);
});
test('resistance scale extremes retain small currents and correct powers',()=>{
  for(const value of [.1,1,1e3,1e6])for(const voltage of [0,.001,6,24]) {
    const m=createModel('ohm',{resistance:value,voltage});assert.equal(m.valid,true);close(m.measure().current,voltage/value,1e-9);close(m.measure().power,voltage**2/value,1e-8);
  }
  const r=solveCircuit(circuit([source,{id:'r1',type:'resistor',a:'p',b:'q',value:.1},{...resistor,value:1e6}]));assert.equal(r.valid,true);close(r.nodeVoltages.q,12*1e6/(1e6+.1),1e-10);
});
test('invalid input, unsafe IDs, bounds, counts and unknown fields are rejected without throwing',()=>{
  for(const input of [null,[],{}, {nodes:[],components:[],ground:'0'},circuit([{...source,value:Infinity}]),circuit([{...source,id:'__proto__'}]),circuit([{...source,a:'missing'}]),circuit([{...source,value:25}]),circuit([{...resistor,value:0}]),circuit([{...source,extra:1}]),circuit([source],Array.from({length:13},(_,i)=>String(i))),{...circuit([source]),components:Array(25).fill(source)}]) {
   assert.doesNotThrow(()=>solveCircuit(input));assert.equal(solveCircuit(input).valid,false);
  }
  for(const params of [null,[],{voltage:'6'},{voltage:NaN},{voltage:25},{unknown:1},{closed:1}])assert.equal(normalizeConfig('ohm',params).ok,false);
  assert.equal(normalizeConfig('constructor',{}).ok,false);assert.throws(()=>createModel('ohm',{resistance:-1}),/resistance/i);
});
test('free circuit snapshots and normalized initial configuration are detached',()=>{
 const m=createModel('free');assert.equal(m.valid,true);const snapshot=m.snapshot();snapshot.circuit.nodes[0].x=9;assert.notEqual(m.state.circuit.nodes[0].x,9);
 const initial=JSON.stringify(m.config);m.step();assert.equal(JSON.stringify(m.config),initial);close(m.measure().time,m.time);
 const bad=createModel('free',{circuit:circuit([source],['0','p','q'])});assert.equal(bad.valid,false);assert.equal(bad.measure().current,null);bad.step();close(bad.time,0);
});
test('parallel preset currents add and reversing meter terminals changes readout sign',()=>{
 const m=createModel('parallel');close(m.measure().current,.18);close(m.measure().power,2.16);close(m.measure().resistance,200/3);
 close(m.state.result.branchCurrents.resistor,.12);close(m.state.result.branchCurrents.resistor2,.06);
 const r=solveCircuit(circuit([source,{id:'a',type:'ammeter',a:'q',b:'p'},resistor,{id:'v',type:'voltmeter',a:'0',b:'q'}]));
 assert.equal(r.valid,true);close(r.meters.a,-.12);close(r.meters.v,-12);
});
test('multiple ideal sources satisfy non-grounded voltage constraints',()=>{
 const r=solveCircuit(circuit([source,{id:'s2',type:'source',a:'q',b:'p',value:6},resistor]));
 assert.equal(r.valid,true);close(r.nodeVoltages.q,18);close(r.branchCurrents.r,.18);close(r.branchPowers.s,-2.16);close(r.branchPowers.s2,-1.08);close(r.powerResidual,0);
});
test('fixed resistance lamps and a wire carry real solved current',()=>{
 const r=solveCircuit(circuit([source,{id:'w',type:'wire',a:'p',b:'q'},{...resistor,type:'lamp',value:144}]));
 assert.equal(r.valid,true);close(r.branchCurrents.w,1/12);close(r.branchPowers.r,1);
});
test('all permitted topology sizes solve without exceeding bounded matrix dimensions',()=>{
 const ids=Array.from({length:12},(_,i)=>String(i));
 const components=[{id:'s',type:'source',a:'1',b:'0',value:24}];
 for(let i=1;i<11;i++)components.push({id:`r${i}`,type:'resistor',a:String(i),b:String(i+1),value:100});
 components.push({id:'last',type:'resistor',a:'11',b:'0',value:100});
 for(let i=0;i<12;i++)components.push({id:`v${i}`,type:'voltmeter',a:String(i),b:'0'});
 const r=solveCircuit(circuit(components,ids));assert.equal(r.valid,true);close(r.branchCurrents.last,24/1100);close(r.nodeVoltages['11'],24/11);
});
