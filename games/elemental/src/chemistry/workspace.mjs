import {defaultPairs} from './molecular.mjs';
export class Workspace{
 constructor(){this.graph={atoms:[],bonds:[],charge:0};this.history=[];this.next=1;}
 commit(change){this.history.push(structuredClone(this.graph));if(this.history.length>50)this.history.shift();change(this.graph);}
 load(m){this.commit(()=>this.graph=structuredClone({atoms:m.atoms,bonds:m.bonds,charge:m.charge||0}));this.next=100;}
 add(symbol){if(this.graph.atoms.length>=24)throw Error('24-atom limit reached');if(!(symbol in defaultPairs))throw Error('Unsupported builder element');const id='new'+this.next++;this.commit(g=>g.atoms.push({id,symbol,lonePairs:defaultPairs[symbol],unpaired:0}));return id;}
 bond(a,b,order){if(a===b||!this.graph.atoms.some(x=>x.id===a)||!this.graph.atoms.some(x=>x.id===b)||![0,1,2,3].includes(order))return;const existing=this.graph.bonds.find(x=>(x.a===a&&x.b===b)||(x.b===a&&x.a===b));if(!existing&&this.graph.bonds.length>=36)return;this.commit(g=>{g.bonds=g.bonds.filter(x=>x!==existing);if(order)g.bonds.push({a,b,order});});}
 edit(id,values){this.commit(g=>Object.assign(g.atoms.find(a=>a.id===id),values));}
 deleteAtom(id){this.commit(g=>{g.atoms=g.atoms.filter(a=>a.id!==id);g.bonds=g.bonds.filter(b=>b.a!==id&&b.b!==id);});}
 reset(){this.commit(()=>this.graph={atoms:[],bonds:[],charge:0});}
 undo(){if(this.history.length)this.graph=this.history.pop();}
}
