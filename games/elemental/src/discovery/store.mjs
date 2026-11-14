const KEY='elemental.discovery.v1',SOURCES=['atomic-lab','reaction-lab'];
const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype&&!Object.keys(o).some(k=>['__proto__','constructor','prototype'].includes(k));
const date=s=>typeof s==='string'&&s.length<=40&&Number.isFinite(Date.parse(s));

export class DiscoveryStore{
 constructor(catalog,storage){
  this.catalog=catalog;this.records=[];this.error=null;this.unreadableSave=false;
  try{this.storage=storage===undefined?globalThis.localStorage:storage;const raw=this.storage?.getItem(KEY);if(!raw)return;
   this.unreadableSave=true;
   const data=JSON.parse(raw);if(!plain(data)||data.v!==1||!Array.isArray(data.records)||data.records.length>catalog.all.length)throw Error('Unsupported or invalid discovery save');
   const seen=new Set();
   for(const r of data.records){if(!plain(r)||!catalog.get(r.id)||seen.has(r.id)||!Array.isArray(r.sources)||r.sources.length<1||r.sources.length>2||new Set(r.sources).size!==r.sources.length||!r.sources.every(s=>SOURCES.includes(s))||!date(r.firstSeen)||Object.keys(r).some(k=>!['id','sources','firstSeen'].includes(k)))throw Error('Invalid discovery record');seen.add(r.id);}
   this.records=data.records.map(r=>({id:r.id,sources:[...r.sources],firstSeen:r.firstSeen}));this.unreadableSave=false;
  }catch(e){this.error=e.message;}
 }
 save(){try{if(!this.storage)throw Error('Browser storage is unavailable');this.storage.setItem(KEY,JSON.stringify({v:1,records:this.records}));this.error=null;return true;}catch(e){this.error=e.message;return false;}}
 has(id){return this.records.some(r=>r.id===id);}
 record(id,source){
  if(!this.catalog.get(id)||!SOURCES.includes(source))return false;
  const found=this.records.find(r=>r.id===id);
  if(found){if(!found.sources.includes(source)){found.sources.push(source);this.save();}return false;}
  this.records.push({id,sources:[source],firstSeen:new Date().toISOString()});this.save();return true;
 }
 available(){return this.records.map(r=>({...this.catalog.get(r.id),sources:[...r.sources],firstSeen:r.firstSeen}));}
 importForm(id){
  const entry=this.catalog.get(id);
  if(!entry||!this.has(id))return {ok:false,forms:[],reason:'Discover this scientific identity before importing it.'};
  const forms=entry.reactionForms.map(id=>this.catalog.reagent(id));
  return {ok:forms.length>0,forms,reason:forms.length?'Bulk virtual sample unlocked; no material quantity is transferred.':entry.category==='isotope'?'Isotope-specific bulk samples are not supported.':'This isolated or structural identity has no supported bulk reagent conversion.'};
 }
 discoverElement(symbol){return this.record(`element:${symbol}`,'atomic-lab');}
 discoverAtom(atom){
  if(!plain(atom)||![atom.z,atom.a,atom.q].every(Number.isInteger))return false;
  const isotope=this.catalog.all.find(e=>e.category==='isotope'&&e.z===atom.z&&e.massNumber===atom.a);if(!isotope)return false;
  const symbol=Object.keys(isotope.elements)[0],id=atom.q===0?`atom:${symbol}:${atom.a}`:`ion:${symbol}:${atom.q}`;
  if(!this.catalog.get(id))return false;
  if(atom.q===0)this.discoverElement(symbol);this.record(isotope.id,'atomic-lab');return this.record(id,'atomic-lab');
 }
 discoverMolecule(id){return this.catalog.get(id)?.referenceId?this.record(id,'atomic-lab'):false;}
 recordProducts(items){
  if(!Array.isArray(items)||items.length>100)return 0;
  let count=0;for(const item of items)if(plain(item)&&Number.isFinite(item.amount)&&item.amount>0&&item.amount<=1e9&&['s','l','g','aq'].includes(item.state)&&this.record(item.speciesId,'reaction-lab'))count++;return count;
 }
 migrateLegacy(progress){
  if(this.unreadableSave)return;
  if(!plain(progress)||!Array.isArray(progress.completed)||progress.completed.length>12)return;
  // The old key stores completion IDs, not the isotope used. Only the explicit
  // H-1/H-2 comparison proves isotope identities; carbon and sodium do not.
  const actions=[()=>this.discoverElement('O'),()=>this.discoverElement('C'),()=>{this.discoverAtom({z:1,a:1,q:0});this.discoverAtom({z:1,a:2,q:0});},()=>this.record('ion:Na:1','atomic-lab'),()=>this.discoverElement('Mg'),()=>this.discoverMolecule('H2'),()=>this.discoverMolecule('H2O'),()=>this.discoverMolecule('CO2'),()=>this.discoverMolecule('NH3'),()=>this.discoverMolecule('CH4'),()=>{this.discoverMolecule('O2');this.discoverMolecule('N2');},()=>this.discoverMolecule('C2H4')];
  for(let i=0;i<12&&progress.completed[i]===i+1;i++)actions[i]();
 }
}
