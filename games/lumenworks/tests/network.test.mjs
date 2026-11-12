import test from 'node:test';
import assert from 'node:assert/strict';
import { allocate, advanceBatteries, validateNetwork, connectionError } from '../network.js';

const node = (id, type, value = 8, extra = {}) => ({id,type,x:1,y:1,...(type === 'building' ? {demand:value} : {capacity:value}),...extra});
const edge = (from,to,capacity=8,extra={}) => ({id:`${from}-${to}`,from,to,capacity,enabled:true,damaged:false,removable:true,...extra});
const board = (nodes=[],edges=[],extra={}) => ({id:'test',width:12,height:10,nodes,edges,obstacles:[],constraints:{maxCables:96,maxLength:20,cableCapacity:8},objectives:{required:[]},...extra});
const battery = (id,mode='support',energy=8,extra={}) => node(id,'battery',8,{mode,energy,maxEnergy:16,dischargeRate:4,chargeRate:3,...extra});
function conservation(b,r) {
  assert.ok(Math.abs(r.generatorUsed+r.batteryUsed-r.totalServed-r.chargePower)<1e-7);
  for (const e of b.edges) assert.ok(r.edges[e.id].flow >= -1e-8 && r.edges[e.id].flow <= e.capacity+1e-8);
  for (const n of b.nodes) {
    const incoming = b.edges.filter(e=>e.to===n.id).reduce((s,e)=>s+r.edges[e.id].flow,0);
    const outgoing = b.edges.filter(e=>e.from===n.id).reduce((s,e)=>s+r.edges[e.id].flow,0);
    if (n.type==='substation'||n.type==='switch') { assert.ok(Math.abs(incoming-outgoing)<1e-7); assert.ok(outgoing<=n.capacity+1e-7); }
    if (n.type==='building') assert.equal(incoming,r.served[n.id] ? n.demand : 0);
    if(n.type==='battery') assert.ok(Math.abs(incoming-outgoing-r.nodes[n.id].chargePower+r.nodes[n.id].dischargePower)<1e-7);
  }
}

test('empty sandbox is valid and allocation is empty',()=>{
  const b=board(); assert.equal(validateNetwork(b).ok,true); assert.equal(allocate(b).totalSupply,0);
});
test('load priority is deterministic, shared bottlenecks hard-limit and partial loads roll back',()=>{
  const b=board([node('g','generator',20),node('s','substation',6),node('a','building',4),node('b','building',3),node('c','building',2)],
    [edge('g','s',10),edge('s','a'),edge('s','b'),edge('s','c')]);
  const r=allocate(b); assert.deepEqual(r.served,{a:true,b:false,c:true}); assert.equal(r.edges['s-b'].flow,0); assert.equal(r.totalServed,6); assert.ok(r.warnings.length); assert.equal(r.nodes.s.constrained,true); conservation(b,r);
  const reverse=structuredClone(b); reverse.nodes.reverse(); reverse.edges.reverse(); assert.deepEqual(allocate(reverse),r);
  b.nodes.find(n=>n.id==='b').priority=-1; assert.deepEqual(allocate(b).served,{b:true,a:false,c:true});
});
test('residual rerouting preserves earlier load and finds alternate path without warnings',()=>{
  const b=board([node('g','generator',8),node('x','substation',4),node('y','substation',4),node('a','building',4),node('b','building',4)],
    [edge('g','x',4),edge('g','y',4),edge('x','a',4),edge('y','a',4),edge('x','b',4)]);
  const r=allocate(b); assert.equal(r.totalServed,8); assert.equal(r.edges['x-a'].flow,0); assert.equal(r.edges['y-a'].flow,4); assert.deepEqual(r.warnings,[]); conservation(b,r);
});
test('multiple sources and cyclic paths cannot duplicate supply',()=>{
  const b=board([node('g','generator',3),node('h','generator',3),node('x','substation',10),node('y','substation',10),node('a','building',5),node('b','building',2)],
    [edge('g','x'),edge('h','y'),edge('x','y'),edge('y','x'),edge('x','a'),edge('y','b')]);
  const r=allocate(b); assert.equal(r.totalServed,5); assert.equal(r.served.b,false); conservation(b,r);
});
test('parallel paths combine capacity instead of causing false overload warnings',()=>{
  const b=board([node('g','generator',10),node('x','substation',5),node('y','substation',5),node('a','building',10)],
    [edge('g','x',5),edge('g','y',5),edge('x','a',5),edge('y','a',5)]);
  assert.equal(allocate(b).served.a,true); assert.deepEqual(allocate(b).warnings,[]);
});
test('open switches, disabled and damaged cables interrupt routes without overload warnings',()=>{
  const b=board([node('g','generator'),node('s','switch',8,{closed:false}),node('a','building',4)], [edge('g','s'),edge('s','a')]);
  for(const state of ['open','damaged','disabled']) {
    b.nodes[1].closed=state!=='open'; b.edges[0].damaged=state==='damaged'; b.edges[0].enabled=state!=='disabled';
    const r=allocate(b); assert.equal(r.totalServed,0); assert.deepEqual(r.warnings,[]); conservation(b,r);
  }
  b.edges[0].enabled=true; assert.equal(allocate(b).served.a,true);
});
test('cable and generator capacity produce meaningful constrained warnings',()=>{
  for(const [supply,cable] of [[8,3],[3,8]]) {
    const b=board([node('g','generator',supply),node('a','building',4)],[edge('g','a',cable)]); const r=allocate(b);
    assert.equal(r.served.a,false); assert.equal(r.totalServed,0); assert.ok(r.warnings.some(w=>w.id===(supply===3?'g':'g-a'))); conservation(b,r);
  }
});
test('allocation is pure; timestep caps finite battery output and advance changes only energy',()=>{
  const b=board([battery('b','support',3),node('a','building',2)],[edge('b','a')]); const before=structuredClone(b);
  assert.equal(allocate(b).served.a,true); assert.equal(allocate(b,2).served.a,false); assert.deepEqual(b,before);
  const r=advanceBatteries(b,1); assert.equal(r.batteryUsed,2); assert.equal(r.batteryDelta.b,-2); assert.equal(b.nodes[0].energy,1); before.nodes[0].energy=1; assert.deepEqual(b,before);
  assert.equal(advanceBatteries(b,1).served.a,false); assert.equal(b.nodes[0].energy,1);
  b.nodes[1].demand=1; advanceBatteries(b,1); assert.equal(b.nodes[0].energy,0); assert.equal(allocate(b).served.a,false);
});
test('charging uses only residual generator capacity and finite rate/room',()=>{
  const b=board([node('g','generator',8),node('s','substation',6),node('a','building',4),battery('b','charge',15)], [edge('g','s'),edge('s','a'),edge('s','b')]);
  const r=advanceBatteries(b,2); assert.equal(r.totalServed,4); assert.equal(r.chargePower,0.5); assert.equal(r.generatorUsed,4.5); assert.equal(b.nodes[3].energy,16); conservation(b,r);
  assert.equal(allocate(b).chargePower,0);
  b.nodes[3].energy=0; assert.equal(allocate(b,1).chargePower,2);
});
test('battery modes prevent battery-to-battery energy transfer and pass-through routing',()=>{
  const b=board([battery('a','support',8),battery('b','charge',0),node('h','building',2)],[edge('a','b'),edge('b','h')]);
  let r=advanceBatteries(b,1); assert.equal(r.batteryUsed,0); assert.equal(r.chargePower,0); assert.equal(r.served.h,false);
  b.nodes[0].mode='off'; b.edges.push(edge('a','h')); r=allocate(b); assert.equal(r.served.h,false);
});
test('mixed generator and battery supplies conserve energy through shared charging router',()=>{
  const b=board([node('g','generator',4),battery('b','support',8),battery('c','charge',0),node('s','substation',20),node('h','building',6)],
    [edge('g','s'),edge('b','s'),edge('s','h'),edge('s','c')]);
  const r=advanceBatteries(b,1); assert.equal(r.totalServed,6); assert.equal(r.generatorUsed,4); assert.equal(r.batteryUsed,2); assert.equal(r.chargePower,0); conservation(b,r);
});
test('connection restrictions include direction, duplicates, length, budget, allowed links and obstacles',()=>{
  const b=board([node('g','generator',8,{x:1,y:1}),node('a','building',4,{x:8,y:1})]);
  assert.equal(connectionError(b,'g','a'),null);
  for(const [from,to] of [['a','g'],['g','g'],['missing','a']]) assert.ok(connectionError(b,from,to));
  b.constraints.maxLength=5; assert.ok(connectionError(b,'g','a')); b.constraints.maxLength=20;
  b.obstacles=[{x:3,y:0,w:1,h:2}]; assert.ok(connectionError(b,'g','a')); b.obstacles=[];
  b.constraints.allowedLinks=[]; assert.ok(connectionError(b,'g','a')); b.constraints.allowedLinks=[['g','a']];
  b.constraints.maxCables=0; assert.ok(connectionError(b,'g','a')); b.constraints.maxCables=96;
  b.edges=[edge('g','a')]; assert.ok(connectionError(b,'g','a'));
});
test('strict save validation rejects invalid fields, unsafe IDs and topology',()=>{
  const valid=board([node('g','generator'),node('a','building',4)],[edge('g','a')]); assert.equal(validateNetwork(valid).ok,true);
  const mutations=[b=>b.nodes[0].id='__proto__',b=>b.nodes[0].id='constructor',b=>b.nodes[0].capacity=Infinity,b=>b.nodes[0].x=-1,b=>b.nodes[1].demand=0,b=>b.nodes[1].type='unknown',b=>b.edges[0].to='ghost',b=>b.edges[0].enabled='true',b=>b.edges.push({...b.edges[0],id:'duplicate'}),b=>b.nodes.push({...b.nodes[0]}),b=>b.width=NaN,b=>b.constraints.maxCables=1.5,b=>b.objectives.required=['g'],b=>b.obstacles=[{x:0,y:0,w:-1,h:1}],b=>b.nodes.push(battery('bad','wrong',0)),b=>b.nodes.push(battery('bad','support',17)),b=>b.nodes.push(battery('bad','support',0,{chargeRate:-1})),b=>b.nodes[1].priority=NaN,b=>b.nodes[0].capacity='8'];
  for(const mutate of mutations) { const b=structuredClone(valid); mutate(b); assert.equal(validateNetwork(b).ok,false,String(mutate)); }
  assert.equal(validateNetwork(null).ok,false); assert.equal(validateNetwork({...valid,nodes:null}).ok,false);
  const large=board(Array.from({length:49},(_,i)=>node(`n${i}`,'generator'))); assert.equal(validateNetwork(large).ok,false);
});
test('invalid timesteps and malformed boards fail before mutating battery state',()=>{
  const b=board([battery('b')]); const before=structuredClone(b);
  for(const dt of [-1,0,NaN,Infinity,61]) assert.throws(()=>advanceBatteries(b,dt));
  for(const dt of [-1,NaN,Infinity]) assert.throws(()=>allocate(b,dt));
  assert.deepEqual(b,before); assert.throws(()=>allocate(board([node('bad','generator',-1)])));
});

test('save validation rejects inherited-property IDs and invalid metadata or unused numeric fields',()=>{
  for(const id of ['toString','valueOf','hasOwnProperty']) assert.equal(validateNetwork(board([node(id,'generator')])).ok,false);
  for(const patch of [{energy:NaN},{demand:'4'},{dischargeRate:-1}]) assert.equal(validateNetwork(board([node('g','generator',8,patch)])).ok,false);
  assert.equal(validateNetwork({...board(),id:{malformed:true}}).ok,false);
});

test('min-cut enumeration independently verifies priority decisions in varied cyclic networks',()=>{
  let seed=6273; const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed%n;};
  // Enumerate every possible cut rather than reimplementing augmenting paths.
  function feasible(b,loads) {
    const vertices=['go','xi','xo','yi','yo','ai','bi'];
    const arcs=[['S','go',b.nodes[0].capacity],['xi','xo',b.nodes[1].capacity],['yi','yo',b.nodes[2].capacity]];
    for(const e of b.edges) arcs.push([`${e.from}o`,`${e.to}i`,e.capacity]);
    for(const n of loads) arcs.push([`${n.id}i`,'T',n.demand]);
    const required=loads.reduce((s,n)=>s+n.demand,0);
    for(let mask=0;mask<128;mask++) {
      const sourceSide=new Set(['S',...vertices.filter((_,i)=>(mask>>i)&1)]);
      let capacity=0; for(const [a,z,c] of arcs) if(sourceSide.has(a)&&!sourceSide.has(z)) capacity+=c;
      if(capacity<required) return false;
    }
    return true;
  }
  for(let fixture=0;fixture<120;fixture++) {
    const ns=[node('g','generator',1+rand(9)),node('x','substation',1+rand(8)),node('y','substation',1+rand(8)),node('a','building',1+rand(6)),node('b','building',1+rand(6))];
    const links=[['g','x'],['g','y'],['x','y'],['y','x'],['x','a'],['y','a'],['x','b'],['y','b']];
    const b=board(ns,links.filter(()=>rand(4)!==0).map(([a,z])=>edge(a,z,1+rand(8))));
    const r=allocate(b),accepted=[];
    for(const n of ns.slice(3)) { const possible=feasible(b,[...accepted,n]); assert.equal(r.served[n.id],possible,`fixture ${fixture}, load ${n.id}`); if(possible) accepted.push(n); }
    conservation(b,r);
  }
});

test('repeated mixed battery cycles conserve cumulative EU without charge amplification',()=>{
  const b=board([node('g','generator',5),node('s','substation',10),node('t','substation',10),battery('b','support',10),battery('c','charge',0),node('h','building',6)],
    [edge('g','s'),edge('s','t'),edge('t','s'),edge('b','s'),edge('s','c'),edge('t','h')]);
  let generated=0,consumed=0;
  for(let i=0;i<80;i++) { const r=advanceBatteries(b,0.25); generated+=r.generatorUsed*0.25; consumed+=r.totalServed*0.25; conservation(b,r); }
  assert.ok(Math.abs(10+generated-consumed-b.nodes[3].energy-b.nodes[4].energy)<1e-7);
  assert.ok(b.nodes[3].energy>=0); assert.ok(b.nodes[4].energy<=16);
});
