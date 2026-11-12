// Pure, directed fictional power allocation. PU × active seconds = stored EU.
const EPS = 1e-9;
const LIMIT = 1e6;
const TYPES = new Set(['generator','substation','switch','battery','building']);
const STYLES = new Set(['house','apartment','market','shop','tram','factory','public']);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const record = o => !!o && typeof o === 'object' && !Array.isArray(o) && (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
const safeID = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id) && !own(Object.prototype,id) && id!=='prototype';
const number = (v,min=0,max=LIMIT) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const positive = v => number(v) && v > 0;
const order = (a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const clean = n => Math.abs(n) < EPS ? 0 : n;

// Closed rectangles include their boundary: cables may not graze restricted areas.
function intersects(a,b,r) {
  let lo=0, hi=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,r.x,r.x+r.w],[a.y,b.y-a.y,r.y,r.y+r.h]]) {
    if(Math.abs(delta)<EPS) { if(start<min || start>max) return false; }
    else { const t1=(min-start)/delta,t2=(max-start)/delta; lo=Math.max(lo,Math.min(t1,t2)); hi=Math.min(hi,Math.max(t1,t2)); if(lo>hi) return false; }
  }
  return true;
}

function linkError(board,a,b) {
  if(!a || !b) return 'Choose two existing components.';
  if(a.id===b.id) return 'A component cannot connect to itself.';
  if(a.type==='building') return 'Buildings receive power; start at a supply or router.';
  if(b.type==='generator') return 'Generators supply power; choose a router or load as the destination.';
  const c=board.constraints || {};
  if(c.allowedLinks && !c.allowedLinks.some(p=>p[0]===a.id && p[1]===b.id)) return 'This route is unavailable in this district.';
  if(Math.hypot(a.x-b.x,a.y-b.y)>(c.maxLength??Infinity)+EPS) return 'These components are beyond the cable length limit.';
  if((board.obstacles||[]).some(r=>intersects(a,b,r))) return 'The cable crosses a restricted area.';
  return null;
}

export function connectionError(board,from,to) {
  if(!record(board) || !Array.isArray(board.nodes) || !Array.isArray(board.edges)) return 'Invalid city layout.';
  const a=board.nodes.find(n=>n?.id===from),b=board.nodes.find(n=>n?.id===to);
  const error=linkError(board,a,b);
  if(error) return error;
  if(board.edges.some(e=>e.from===from && e.to===to)) return 'That directed cable already exists.';
  if(board.edges.length>=Math.min(96,board.constraints?.maxCables??96)) return 'The district cable limit has been reached.';
  return null;
}

export function validateNetwork(board) {
  const errors=[];
  const error=s=>errors.push(s);
  if(!record(board)) return {ok:false,errors:['Layout must be an object.']};
  for(const key of ['__proto__','prototype','constructor']) if(own(board,key)) error('Unsafe layout property.');
  if(board.id!==undefined && !safeID(board.id) && !(Number.isInteger(board.id)&&number(board.id))) error('Invalid layout ID.');
  for(const key of ['title','hint','tutorial']) if(board[key]!==undefined && (typeof board[key]!=='string'||board[key].length>4000)) error(`Invalid layout ${key}.`);
  if(!positive(board.width)||!positive(board.height)||board.width>1000||board.height>1000) error('Invalid city bounds.');
  if(!Array.isArray(board.nodes)||!Array.isArray(board.edges)) return {ok:false,errors:[...errors,'Nodes and edges must be arrays.']};
  if(board.nodes.length>48) error('A city can contain at most 48 components.');
  if(board.edges.length>96) error('A city can contain at most 96 cables.');
  const ids=new Map();
  for(const n of board.nodes) {
    if(!record(n)) { error('Invalid component.'); continue; }
    if(!safeID(n.id)||ids.has(n.id)) error('Component IDs must be unique safe strings.'); else ids.set(n.id,n);
    if(!TYPES.has(n.type)) error(`Unknown component type: ${n.id}.`);
    if(!number(n.x,0,board.width)||!number(n.y,0,board.height)) error(`Component outside city bounds: ${n.id}.`);
    for(const key of ['name','district','style']) if(own(n,key) && (typeof n[key]!=='string'||n[key].length>200)) error(`Invalid ${key}: ${n.id}.`);
    if(n.type==='building' && n.style!==undefined && !STYLES.has(n.style)) error(`Unknown building style: ${n.id}.`);
    if(n.priority!==undefined && !number(n.priority,-LIMIT)) error(`Invalid priority: ${n.id}.`);
    if(['generator','substation','switch'].includes(n.type) && !positive(n.capacity)) error(`Invalid component capacity: ${n.id}.`);
    if(n.capacity!==undefined && !number(n.capacity)) error(`Invalid capacity: ${n.id}.`);
    for(const key of ['demand','energy','maxEnergy','chargeRate','dischargeRate']) if(n[key]!==undefined && !number(n[key])) error(`Invalid ${key}: ${n.id}.`);
    if(n.type==='building' && !positive(n.demand)) error(`Invalid building demand: ${n.id}.`);
    if(n.closed!==undefined && typeof n.closed!=='boolean') error(`Invalid switch state: ${n.id}.`);
    if(n.type==='battery') {
      if(!['off','charge','support'].includes(n.mode)) error(`Invalid battery mode: ${n.id}.`);
      if(!positive(n.maxEnergy)||!number(n.energy,0,n.maxEnergy)||!number(n.chargeRate)||!number(n.dischargeRate)) error(`Invalid battery energy or rates: ${n.id}.`);
    }
    for(const key of ['__proto__','prototype','constructor']) if(own(n,key)) error(`Unsafe component property: ${n.id}.`);
  }
  const c=board.constraints;
  if(c!==undefined && !record(c)) error('Invalid constraints.');
  if(record(c)) {
    if(c.maxCables!==undefined && (!Number.isInteger(c.maxCables)||c.maxCables<0||c.maxCables>96)) error('Invalid cable budget.');
    if(c.cableCapacity!==undefined && !positive(c.cableCapacity)) error('Invalid default cable capacity.');
    if(c.maxLength!==undefined && !positive(c.maxLength)) error('Invalid cable length limit.');
    if(c.allowedLinks!==undefined) {
      if(!Array.isArray(c.allowedLinks)||c.allowedLinks.length>2304) error('Invalid allowed links.');
      else for(const pair of c.allowedLinks) if(!Array.isArray(pair)||pair.length!==2||!ids.has(pair[0])||!ids.has(pair[1])||pair[0]===pair[1]) error('Invalid allowed link reference.');
    }
    if(board.edges.length>(c.maxCables??96)) error('Cable budget exceeded.');
  }
  if(board.obstacles!==undefined) {
    if(!Array.isArray(board.obstacles)||board.obstacles.length>96) error('Invalid restricted areas.');
    else for(const r of board.obstacles) if(!record(r)||!number(r.x,0,board.width)||!number(r.y,0,board.height)||!positive(r.w)||!positive(r.h)||r.x+r.w>board.width||r.y+r.h>board.height) error('Invalid restricted area bounds.');
  }
  const edgeIDs=new Set(),pairs=new Set();
  for(const e of board.edges) {
    if(!record(e)) { error('Invalid cable.'); continue; }
    if(!safeID(e.id)||edgeIDs.has(e.id)||ids.has(e.id)) error('Cable IDs must be unique safe strings, distinct from component IDs.');
    edgeIDs.add(e.id);
    if(!ids.has(e.from)||!ids.has(e.to)) error(`Unknown cable endpoint: ${e.id}.`);
    if(!positive(e.capacity)) error(`Invalid cable capacity: ${e.id}.`);
    for(const key of ['enabled','damaged','removable']) if(e[key]!==undefined&&typeof e[key]!=='boolean') error(`Invalid cable ${key}: ${e.id}.`);
    const pair=`${e.from}|${e.to}`; if(pairs.has(pair)) error('Duplicate directed cable.'); pairs.add(pair);
    if(errors.length===0) { const why=linkError(board,ids.get(e.from),ids.get(e.to)); if(why) error(`${e.id}: ${why}`); }
  }
  if(board.objectives!==undefined) {
    const o=board.objectives;
    if(!record(o)) error('Invalid objectives.');
    else {
      if(o.required!==undefined && (!Array.isArray(o.required)||new Set(o.required).size!==o.required.length||o.required.some(id=>ids.get(id)?.type!=='building'))) error('Objectives must reference unique buildings.');
      if(o.noOverload!==undefined && typeof o.noOverload!=='boolean') error('Invalid overload objective.');
      if(o.holdSeconds!==undefined && !number(o.holdSeconds,0,3600)) error('Invalid hold period.');
    }
  }
  return {ok:errors.length===0,errors};
}

// Residual arcs retain their original direction and a signed reverse partner.
class FlowGraph {
  constructor() { this.adj=new Map(); this.arcs=[]; }
  add(from,to,cap,meta={}) {
    const forward={from,to,cap,flow:0,meta,reverse:false};
    const reverse={from:to,to:from,cap:0,flow:0,meta,reverse:true};
    forward.back=reverse; reverse.back=forward;
    if(!this.adj.has(from)) this.adj.set(from,[]); if(!this.adj.has(to)) this.adj.set(to,[]);
    this.adj.get(from).push(forward); this.adj.get(to).push(reverse); this.arcs.push(forward);
    return forward;
  }
  reachable(source) {
    const seen=new Set([source]),queue=[source];
    for(let i=0;i<queue.length;i++) for(const a of this.adj.get(queue[i])||[]) if(a.cap-a.flow>EPS&&!seen.has(a.to)) { seen.add(a.to); queue.push(a.to); }
    return seen;
  }
  augment(source,sink,limit) {
    let total=0;
    while(total<limit-EPS) {
      const prev=new Map([[source,null]]),queue=[source];
      for(let i=0;i<queue.length&&!prev.has(sink);i++) for(const a of this.adj.get(queue[i])||[]) {
        if(a.cap-a.flow>EPS&&!prev.has(a.to)) { prev.set(a.to,a); queue.push(a.to); }
      }
      if(!prev.has(sink)) break;
      let amount=limit-total;
      for(let v=sink;v!==source;) { const a=prev.get(v); amount=Math.min(amount,a.cap-a.flow); v=a.from; }
      for(let v=sink;v!==source;) { const a=prev.get(v); a.flow+=amount; a.back.flow-=amount; v=a.from; }
      total+=amount;
    }
    return total;
  }
  snapshot() { return this.arcs.map(a=>a.flow); }
  restore(snapshot) { this.arcs.forEach((a,i)=>{a.flow=snapshot[i]??0; a.back.flow=-a.flow;}); }
}

const input=id=>`i:${id}`,output=id=>`o:${id}`;
const active=n=>n.type!=='switch'||n.closed!==false;
function supply(n,dt) {
  if(n.type==='generator') return n.capacity;
  if(n.type==='battery'&&n.mode==='support'&&n.energy>EPS) return Math.min(n.dischargeRate,dt>0?n.energy/dt:Infinity);
  return 0;
}
function room(n,dt) { return n.mode==='charge'&&n.maxEnergy-n.energy>EPS ? Math.min(n.chargeRate,dt>0?(n.maxEnergy-n.energy)/dt:Infinity) : 0; }
function transmitting(e,nodes) {
  const a=nodes.get(e.from),b=nodes.get(e.to);
  return e.enabled!==false&&!e.damaged&&active(a)&&active(b)&&(a.type!=='battery'||a.mode==='support')&&(b.type!=='battery'||b.mode==='charge');
}

export function allocate(board,dt=0) {
  if(!number(dt,0,Number.MAX_VALUE)) throw new RangeError('Simulation interval must be finite and nonnegative.');
  const valid=validateNetwork(board); if(!valid.ok) throw new TypeError(valid.errors.join(' '));
  const ns=[...board.nodes].sort(order),es=[...board.edges].sort(order),byID=new Map(ns.map(n=>[n.id,n]));
  const result={nodes:{},edges:{},served:{},totalDemand:0,totalServed:0,totalSupply:0,generatorUsed:0,batteryUsed:0,chargePower:0,warnings:[],batteryDelta:{}};
  const graph=new FlowGraph(),sources=new Map(),transit=new Map(),cables=new Map();
  for(const n of ns) {
    const capacity=n.type==='building'?0:n.type==='battery'?supply(n,dt):n.capacity;
    result.nodes[n.id]={flow:0,capacity,demand:n.type==='building'?n.demand:0,powered:false,constrained:false};
    if(n.type==='battery') { Object.assign(result.nodes[n.id],{chargePower:0,dischargePower:0}); result.batteryDelta[n.id]=0; }
    if(n.type==='substation'||n.type==='switch') transit.set(n.id,graph.add(input(n.id),output(n.id),active(n)?n.capacity:0,{id:n.id,kind:n.type}));
  }
  // Generators precede batteries on equal-length augmenting routes.
  for(const n of [...ns.filter(n=>n.type==='generator'),...ns.filter(n=>n.type==='battery'&&n.mode==='support')]) {
    const cap=supply(n,dt); sources.set(n.id,graph.add('$source',output(n.id),cap,{id:n.id,kind:'supply'})); result.totalSupply+=cap;
  }
  for(const e of es) {
    result.edges[e.id]={flow:0,capacity:e.capacity,enabled:e.enabled!==false,damaged:!!e.damaged,constrained:false};
    // Charging terminals are excluded until every building has been considered.
    if(transmitting(e,byID)&&byID.get(e.to).type!=='battery') cables.set(e.id,graph.add(output(e.from),input(e.to),e.capacity,{id:e.id,kind:'cable'}));
  }
  const structural=new Set(sources.keys()),pending=[...structural];
  for(let i=0;i<pending.length;i++) for(const e of es) if(e.from===pending[i]&&transmitting(e,byID)&&byID.get(e.to).type!=='battery'&&!structural.has(e.to)) { structural.add(e.to); pending.push(e.to); }
  const failures=[];
  for(const n of ns.filter(n=>n.type==='building').sort((a,b)=>(a.priority??0)-(b.priority??0)||order(a,b))) {
    result.totalDemand+=n.demand;
    const saved=graph.snapshot(),sink=graph.add(input(n.id),'$sink',n.demand,{id:n.id,kind:'load'});
    const added=graph.augment('$source','$sink',n.demand);
    const served=added>=n.demand-EPS; result.served[n.id]=served;
    if(served) result.totalServed+=n.demand;
    else {
      if(structural.has(n.id)) {
        const reached=graph.reachable('$source');
        const cut=graph.arcs.filter(a=>reached.has(a.from)&&!reached.has(a.to)&&a.meta.kind!=='load'&&a.cap-a.flow<=EPS);
        failures.push({building:n,available:added,cut:cut.map(a=>({...a.meta,capacity:a.cap}))});
      }
      graph.restore(saved); sink.cap=0;
    }
  }
  // Preserve every building flow. Charging uses forward residual throughput only,
  // rooted solely in unused generator output: no battery-to-battery transfers.
  const charging=new FlowGraph(),chargeSources=new Map(),chargeTransit=new Map(),chargeEdges=new Map(),sinks=new Map();
  for(const n of ns) {
    if(n.type==='generator') chargeSources.set(n.id,charging.add('$source',output(n.id),Math.max(0,n.capacity-(sources.get(n.id)?.flow??0))));
    if(n.type==='substation'||n.type==='switch') chargeTransit.set(n.id,charging.add(input(n.id),output(n.id),Math.max(0,(active(n)?n.capacity:0)-(transit.get(n.id)?.flow??0))));
  }
  for(const e of es) if(transmitting(e,byID)&&byID.get(e.from).type!=='battery'&&byID.get(e.to).type!=='building') chargeEdges.set(e.id,charging.add(output(e.from),input(e.to),Math.max(0,e.capacity-(cables.get(e.id)?.flow??0))));
  for(const n of ns.filter(n=>n.type==='battery'&&n.mode==='charge')) {
    const cap=room(n,dt); const sink=charging.add(input(n.id),'$sink',cap); sinks.set(n.id,sink); charging.augment('$source','$sink',cap);
  }
  for(const n of ns) {
    const r=result.nodes[n.id];
    if(n.type==='generator') { r.flow=clean((sources.get(n.id)?.flow??0)+(chargeSources.get(n.id)?.flow??0)); result.generatorUsed+=r.flow; }
    else if(n.type==='substation'||n.type==='switch') r.flow=clean((transit.get(n.id)?.flow??0)+(chargeTransit.get(n.id)?.flow??0));
    else if(n.type==='building') r.flow=result.served[n.id]?n.demand:0;
    else {
      r.chargePower=clean(sinks.get(n.id)?.flow??0); r.dischargePower=clean(sources.get(n.id)?.flow??0); r.flow=r.chargePower+r.dischargePower;
      r.capacity=n.mode==='charge'?room(n,dt):supply(n,dt);
      result.chargePower+=r.chargePower; result.batteryUsed+=r.dischargePower;
      result.batteryDelta[n.id]=clean((r.chargePower-r.dischargePower)*dt);
    }
    r.powered=r.flow>EPS;
  }
  for(const e of es) result.edges[e.id].flow=clean((cables.get(e.id)?.flow??0)+(chargeEdges.get(e.id)?.flow??0));
  for(const f of failures) {
    result.nodes[f.building.id].constrained=true;
    for(const cut of f.cut) {
      const status=result.edges[cut.id]||result.nodes[cut.id]; if(status) status.constrained=true;
      result.warnings.push({id:cut.id,kind:cut.kind,requested:f.building.demand,capacity:cut.capacity,message:`${f.building.name||f.building.id} needs ${f.building.demand} PU; only ${clean(f.available)} PU additional supply can reach it. ${cut.id} carries ${status?.flow??0}/${cut.capacity} PU; this load is withheld.`});
    }
  }
  return result;
}

export function advanceBatteries(board,dt) {
  if(!positive(dt)||dt>60) throw new RangeError('Active simulation steps must be greater than zero and at most 60 seconds.');
  const result=allocate(board,dt);
  for(const n of board.nodes) if(n.type==='battery') n.energy=Math.min(n.maxEnergy,Math.max(0,n.energy+result.batteryDelta[n.id]));
  return result;
}
