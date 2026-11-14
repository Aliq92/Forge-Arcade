// Persistence owns only virtual setup/identity data; it never imports or mutates either lab model.
import {EXPERIMENTS,CHALLENGES} from './experiments.mjs';
const KEY='elemental.reaction.v1';
const RULES=['salt-dissolution','sugar-dissolution','miscible-liquids','immiscible-liquids','neutralization','bicarbonate-gas','carbonate-precipitation','water-phase','salt-recovery','hydrogen-water'];
const EXPERIMENT_IDS=EXPERIMENTS.map(e=>e.id),ACHIEVEMENTS=CHALLENGES.map(c=>c.id);
const clone=value=>JSON.parse(JSON.stringify(value));
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const keys=(value,allowed)=>plain(value)&&Object.keys(value).every(k=>allowed.includes(k));
const text=(s,max=2000)=>typeof s==='string'&&s.length<=max;
const date=s=>text(s,40)&&Number.isFinite(Date.parse(s));
const unique=(a,max,valid)=>Array.isArray(a)&&a.length<=max&&new Set(a).size===a.length&&a.every(valid);
const finite=(n,min=-1e9,max=1e9)=>Number.isFinite(n)&&n>=min&&n<=max;
function safeTree(value,depth=0){
 if(depth>15)return false;
 if(value===null||typeof value==='boolean')return true;
 if(typeof value==='number')return Number.isFinite(value);
 if(typeof value==='string')return value.length<=10000;
 if(Array.isArray(value))return value.length<=1000&&value.every(v=>safeTree(v,depth+1));
 return plain(value)&&Object.keys(value).length<=100&&!Object.keys(value).some(k=>['__proto__','prototype','constructor'].includes(k))&&Object.values(value).every(v=>safeTree(v,depth+1));
}

export class ReactionStore{
 constructor(catalog,storage){
  this.catalog=catalog;this.error=null;
  this.data={v:1,inventory:catalog.reagents.filter(f=>f.starter).map(f=>f.id),setups:[],journal:[],completed:[],achievements:[],tutorial:false,session:null};
  try{
   this.storage=storage===undefined?globalThis.localStorage:storage;
   const raw=this.storage?.getItem(KEY);if(!raw)return;
   if(raw.length>2000000)throw Error('Reaction save exceeds size limit');
   const data=JSON.parse(raw);this.validateData(data);this.data=clone(data);if(!Object.hasOwn(this.data,'session'))this.data.session=null;
  }catch(e){this.error=e.message;}
 }
 get session(){return this.data.session?clone(this.data.session):null;}
 /** Local strict schema validation; permits an empty preparation while editing. */
 config(value){
  if(!safeTree(value)||!keys(value,['reagents','temperature','vessel','activation','solventFraction'])||!Array.isArray(value.reagents)||value.reagents.length>50)throw Error('Invalid setup schema');
  if(![-10,25,110].includes(value.temperature)||!['beaker','flask','sealed'].includes(value.vessel)||typeof value.activation!=='boolean'||!finite(value.solventFraction,.05,1))throw Error('Invalid virtual conditions');
  const merged=new Map();
  for(const item of value.reagents){
   if(!keys(item,['formId','quantity'])||!this.catalog.reagent(item.formId)||!finite(item.quantity,1e-6))throw Error('Unknown reagent or invalid quantity');
   merged.set(item.formId,(merged.get(item.formId)||0)+item.quantity);
  }
  if(merged.size>6)throw Error('At most six distinct forms are supported');
  let volume=0;
  for(const [id,quantity]of merged){const form=this.catalog.reagent(id);if(quantity>Math.min(form.maxQuantity,form.stock))throw Error('Quantity exceeds virtual trial stock');volume+=form.state==='aq'?quantity/form.concentration:form.unit==='mL'?quantity:0;}
  if(volume>500+1e-9)throw Error('Trial volume exceeds 500 mL');
  const reagents=[...merged].sort(([a],[b])=>a.localeCompare(b)).map(([formId,quantity])=>({formId,quantity}));
  // Whether these legal settings have a verified model belongs to the engine.
  // Unsupported trials remain valid observations that can be saved and revisited.
  return {reagents,temperature:value.temperature,vessel:value.vessel,activation:value.activation,solventFraction:value.solventFraction};
 }
 result(value){
  if(!safeTree(value)||!plain(value)||value.valid!==true||typeof value.supported!=='boolean'||!(value.process===null||text(value.process,100))||!(value.ruleId===null||RULES.includes(value.ruleId)))throw Error('Invalid reaction result');
  if(value.supported&&!RULES.includes(value.ruleId))throw Error('Unknown verified reaction');
  for(const field of ['equation','explanation'])if(!text(value[field]))throw Error('Invalid reaction description');
  if(!(value.effect===null||text(value.effect,100)))throw Error('Invalid effect');
  for(const field of ['observations','warnings'])if(!Array.isArray(value[field])||value[field].length>30||!value[field].every(s=>text(s)))throw Error('Invalid observations');
  for(const field of ['initial','products','remaining','final']){
   if(!Array.isArray(value[field])||value[field].length>100)throw Error('Invalid material ledger');
   for(const item of value[field])if(!keys(item,['speciesId','amount','state'])||!this.catalog.get(item.speciesId)||!finite(item.amount,0,1e9)||!['aq','l','s','g'].includes(item.state))throw Error('Invalid ledger species or quantity');
  }
  if(!finite(value.extent,0)||!Array.isArray(value.limiting)||value.limiting.length>20||!value.limiting.every(s=>this.catalog.get(s)||this.catalog.reagent(s)))throw Error('Invalid reaction extent');
  const c=value.conservation;
  if(!plain(c)||typeof c.atoms!=='boolean'||typeof c.charge!=='boolean'||!finite(c.massError)||!finite(c.chargeResidual)||!plain(c.atomResiduals)||!Object.entries(c.atomResiduals).every(([symbol,n])=>this.catalog.get(`element:${symbol}`)&&finite(n)))throw Error('Invalid conservation report');
  const m=value.measurements;
  if(!keys(m,['massG','volumeMl','pH','temperature','pressure'])||!finite(m.massG,0)||!finite(m.volumeMl,0)||!(m.pH===null||finite(m.pH,-5,19))||![-10,25,110].includes(m.temperature)||!(m.pressure===null||finite(m.pressure,0)))throw Error('Invalid measurements');
  return clone(value);
 }
 verified(result){
  if(!result.supported||!result.conservation.atoms||!result.conservation.charge||Math.abs(result.conservation.massError)>1e-6||Math.abs(result.conservation.chargeResidual)>1e-6)return false;
  // Independently check the supplied ledgers rather than trusting flags alone.
  const sums=items=>{const atoms=new Map();let charge=0,mass=0;for(const i of items){const entry=this.catalog.get(i.speciesId);for(const [s,n]of Object.entries(entry.elements))atoms.set(s,(atoms.get(s)||0)+n*i.amount);charge+=entry.charge*i.amount;mass+=entry.molarMass*i.amount/1000;}return {atoms,charge,mass};};
  const a=sums(result.initial),b=sums(result.final),tolerance=1e-7;
  return Math.abs(a.charge-b.charge)<=tolerance&&Math.abs(a.mass-b.mass)<=1e-6&&[...new Set([...a.atoms.keys(),...b.atoms.keys()])].every(s=>Math.abs((a.atoms.get(s)||0)-(b.atoms.get(s)||0))<=tolerance);
 }
 signature(experimentId,config){return JSON.stringify([experimentId,config]);}
 bindResult(config,result){
  if(result.measurements.temperature!==config.temperature)throw Error('Result temperature does not match the trial');
  // Current engine results include their immutable input. Older result summaries
  // may omit it, but an included configuration must never contradict the trial.
  if(Object.hasOwn(result,'config')&&JSON.stringify(this.config(result.config))!==JSON.stringify(config))throw Error('Result configuration does not match the trial');
 }
 completed(experimentId,result){const experiment=EXPERIMENTS.find(e=>e.id===experimentId);return !!experiment&&result.ruleId===(experimentId==='dilute-carbonate'?'carbonate-precipitation':experimentId)&&result.process===experiment.expectedProcess&&this.verified(result);}
 validateData(data){
  if(!safeTree(data)||!keys(data,['v','inventory','setups','journal','completed','achievements','tutorial','session'])||data.v!==1)throw Error('Unsupported or invalid reaction save');
  if(!unique(data.inventory,this.catalog.reagents.length,id=>!!this.catalog.reagent(id))||!Array.isArray(data.setups)||data.setups.length>8||!Array.isArray(data.journal)||data.journal.length>100||!unique(data.completed,EXPERIMENT_IDS.length,id=>EXPERIMENT_IDS.includes(id))||!unique(data.achievements,ACHIEVEMENTS.length,id=>ACHIEVEMENTS.includes(id))||typeof data.tutorial!=='boolean')throw Error('Invalid reaction progression');
  if(data.session!=null)this.config(data.session);
  for(const setup of data.setups)if(!keys(setup,['name','config','savedAt'])||!text(setup.name,80)||!setup.name.trim()||!date(setup.savedAt)||!this.config(setup.config))throw Error('Invalid saved setup');
  const seen=new Set();
  for(const run of data.journal){
   if(!keys(run,['signature','experimentId','config','result','createdAt','completed'])||!['free',...EXPERIMENT_IDS].includes(run.experimentId)||!date(run.createdAt)||typeof run.completed!=='boolean')throw Error('Invalid journal record');
   const config=this.config(run.config),result=this.result(run.result),signature=this.signature(run.experimentId,config);
   this.bindResult(config,result);
   if(signature!==run.signature||seen.has(signature)||run.completed!==this.completed(run.experimentId,result))throw Error('Invalid journal signature or completion');seen.add(signature);
  }
 }
 save(){try{this.validateData(this.data);if(!this.storage)throw Error('Browser storage is unavailable');this.storage.setItem(KEY,JSON.stringify(this.data));this.error=null;return true;}catch(e){this.error=e.message;return false;}}
 addInventory(id){if(!this.catalog.reagent(id)||this.data.inventory.includes(id))return false;this.data.inventory.push(id);this.save();return true;}
 saveSession(config){try{const normalized=this.config(config);this.data.session=normalized;this.save();return true;}catch(e){this.error=e.message;return false;}}
 saveSetup(name,config){try{if(!text(name,80)||!name.trim())throw Error('Use a setup name of 1–80 characters');const normalized=this.config(config),record={name:name.trim(),config:normalized,savedAt:new Date().toISOString()};this.data.setups=this.data.setups.filter(s=>s.name!==record.name);this.data.setups.push(record);this.data.setups=this.data.setups.slice(-8);this.save();return true;}catch(e){this.error=e.message;return false;}}
 exportSetup(config){return JSON.stringify({v:1,config:this.config(config)},null,2);}
 parseSetup(input){if(!text(input,20000))throw Error('Setup exceeds size limit');const data=JSON.parse(input);if(!safeTree(data)||!keys(data,['v','config'])||data.v!==1)throw Error('Unsupported setup schema');return this.config(data.config);}
 importSetup(input){const config=this.parseSetup(input);this.saveSession(config);return clone(config);}
 recordRun(experimentId,config,result){
  try{
   if(!['free',...EXPERIMENT_IDS].includes(experimentId))throw Error('Unknown experiment');
   const normalized=this.config(config),outcome=this.result(result),signature=this.signature(experimentId,normalized);
   this.bindResult(normalized,outcome);
   if(this.data.journal.some(r=>r.signature===signature))return false;
   const completed=this.completed(experimentId,outcome);
   this.data.journal.push({signature,experimentId,config:normalized,result:outcome,createdAt:new Date().toISOString(),completed});this.data.journal=this.data.journal.slice(-100);
   if(completed&&!this.data.completed.includes(experimentId))this.data.completed.push(experimentId);
   if(this.verified(outcome))for(const challenge of CHALLENGES)if(challenge.check(outcome)&&!this.data.achievements.includes(challenge.id))this.data.achievements.push(challenge.id);
   this.save();return true;
  }catch(e){this.error=e.message;return false;}
 }
}
