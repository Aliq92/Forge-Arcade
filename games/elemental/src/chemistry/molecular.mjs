export const valence={H:1,C:4,N:5,O:6,F:7,Cl:7,S:6,P:5};
export const defaultPairs={H:0,C:0,N:1,O:2,F:3,Cl:3,S:2,P:1};
export function formula(graph,empirical=false){
 const counts={};for(const a of graph.atoms)counts[a.symbol]=(counts[a.symbol]||0)+1;
 const symbols=Object.keys(counts).sort();const order=counts.C?['C',...(counts.H?['H']:[]),...symbols.filter(s=>!['C','H'].includes(s))]:symbols;
 const gcd=(a,b)=>b?gcd(b,a%b):a,divisor=empirical?Object.values(counts).reduce(gcd,0)||1:1;
 return order.map(s=>s+(counts[s]/divisor===1?'':counts[s]/divisor)).join('');
}
export function formalCharges(graph){return graph.atoms.map(a=>({id:a.id,charge:valence[a.symbol]-2*a.lonePairs-(a.unpaired??0)-graph.bonds.reduce((n,b)=>n+((b.a===a.id||b.b===a.id)?b.order:0),0)}));}
function adjacency(graph){const adj=new Map(graph.atoms.map(a=>[a.id,new Map()]));for(const b of graph.bonds){adj.get(b.a)?.set(b.b,b.order);adj.get(b.b)?.set(b.a,b.order);}return adj;}
export function recognize(graph,references){
 const adj=adjacency(graph);
 for(const reference of references){
  if(reference.atoms.length!==graph.atoms.length||reference.bonds.length!==graph.bonds.length||reference.charge!==(graph.charge??0)||formula(reference)!==formula(graph))continue;
  const refAdj=adjacency(reference),mapping=new Map(),used=new Set(),atoms=[...graph.atoms].sort((a,b)=>(adj.get(b.id)?.size||0)-(adj.get(a.id)?.size||0));
  const match=index=>{if(index===atoms.length)return true;const a=atoms[index];for(const b of reference.atoms){
   if(used.has(b.id)||a.symbol!==b.symbol||a.lonePairs!==b.lonePairs||(a.unpaired??0)!==(b.unpaired||0)||adj.get(a.id)?.size!==refAdj.get(b.id)?.size)continue;
   if([...mapping].some(([id,rid])=>adj.get(a.id)?.get(id)!==refAdj.get(b.id)?.get(rid)))continue;
   mapping.set(a.id,b.id);used.add(b.id);if(match(index+1))return true;mapping.delete(a.id);used.delete(b.id);
  }return false;};
  if(match(0))return {reference,mapping};
 }
 return null;
}
export function validateGraph(graph,references=[]){
 const errors=[],warnings=[];if(!graph.atoms.length)return {status:'MODEL WARNING',reasons:['Add atoms and connect them. Only nine reference structures are confirmed in v0.1.'],charges:[],reference:null};
 if(graph.atoms.length>24||graph.bonds.length>36)errors.push('Workspace limit: 24 atoms and 36 bonds.');
 const ids=new Set();for(const a of graph.atoms){if(ids.has(a.id))errors.push('Duplicate atom identifiers.');ids.add(a.id);if(!(a.symbol in valence))errors.push('Element outside the construction domain.');if(!Number.isInteger(a.lonePairs)||a.lonePairs<0||a.lonePairs>4||!Number.isInteger(a.unpaired??0)||(a.unpaired??0)<0||(a.unpaired??0)>2)errors.push('Invalid explicit nonbonding-electron count.');}
 const edges=new Set();for(const b of graph.bonds){const key=[b.a,b.b].sort().join(':');if(!ids.has(b.a)||!ids.has(b.b)||b.a===b.b||edges.has(key)||![1,2,3].includes(b.order))errors.push('Bond endpoints, uniqueness or order are inconsistent.');edges.add(key);}
 if(!Number.isInteger(graph.charge??0)||Math.abs(graph.charge??0)>6)errors.push('Net charge must be an integer from −6 to +6 in this workspace.');
 if(errors.length)return {status:'INVALID WITHIN MODEL',reasons:[...new Set(errors)],charges:[],reference:null};
 const charges=formalCharges(graph),expected=graph.atoms.reduce((n,a)=>n+valence[a.symbol],0)-(graph.charge??0),assigned=graph.bonds.reduce((n,b)=>n+2*b.order,0)+graph.atoms.reduce((n,a)=>n+2*a.lonePairs+(a.unpaired??0),0);
 if(assigned!==expected)errors.push(`Electron accounting: assigned ${assigned}, expected ${expected}. Check bond orders, lone pairs, charge and missing hydrogens.`);
 for(const a of graph.atoms){const bonds=graph.bonds.filter(b=>b.a===a.id||b.b===a.id).reduce((n,b)=>n+b.order,0),occupancy=2*bonds+2*a.lonePairs+(a.unpaired??0);
  if((a.symbol==='H'&&occupancy>2)||(['C','N','O','F'].includes(a.symbol)&&occupancy>8))errors.push(`${a.symbol}: exceeds the supported duet/octet electron count.`);
  if(['P','S','Cl'].includes(a.symbol)&&occupancy>8)warnings.push('Expanded-valence main-group structures require models outside this milestone.');
  if(a.unpaired)warnings.push('Radical electron structures need additional electronic-state treatment.');
 }
 if(errors.length)return {status:'INVALID WITHIN MODEL',reasons:[...new Set(errors)],charges,reference:null,expected,assigned};
 const found=recognize(graph,references);
 if(found)return {status:'SUPPORTED',reasons:['Connectivity and explicit Lewis electron accounting match '+found.reference.name+'.',...(found.reference.caveat?[found.reference.caveat]:[])],charges,reference:found.reference,mapping:found.mapping,expected,assigned};
 return {status:'MODEL WARNING',reasons:[...new Set(warnings),'Electron accounting is consistent, but this graph is outside the nine verified structures. This is not a claim that it is impossible or stable. Resonance, spin, energetics and coordination are not resolved.'],charges,reference:null,expected,assigned};
}

