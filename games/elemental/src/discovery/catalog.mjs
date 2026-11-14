import {supportedIons} from '../chemistry/atomic.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

/** The sole identity/composition registry. Reagent forms represent virtual bulk samples. */
export function createCatalog(elements,isotopes,refs){
 const bySymbol=new Map(elements.map(e=>[e.symbol,e])),entries=new Map(),forms=new Map();
 const weight=e=>{const numbers=String(e.weight).replace(/\s/g,'').match(/\d+(?:\.\d+)?/g)?.map(Number)||[];return String(e.weight).includes(',')?(numbers[0]+numbers[1])/2:numbers[0];};
 const compose=formula=>{
  const result={};let consumed='';
  for(const match of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)){const [,symbol,n]=match;if(!bySymbol.has(symbol))throw Error('Unknown element');result[symbol]=(result[symbol]||0)+(n?Number(n):1);consumed+=match[0];}
  if(consumed!==formula||!consumed)throw Error('Invalid catalogue formula');return result;
 };
 const add=(id,name,formula,category,charge=0,representation='molecule',extra={})=>{
  const composition=compose(formula);
  entries.set(id,{id,name,formula,category,elements:composition,charge,representation,reactionForms:[],notes:'',molarMass:Object.entries(composition).reduce((sum,[s,n])=>sum+weight(bySymbol.get(s))*n,0),...extra});
 };
 for(const e of elements)add(`element:${e.symbol}`,e.name,e.symbol,'element',0,'element',{notes:e.propertyNote||''});
 for(const i of isotopes){
  if(!bySymbol.has(i.symbol))continue;
  add(`isotope:${i.symbol}:${i.a}`,`${bySymbol.get(i.symbol).name}-${i.a}`,i.symbol,'isotope',0,'isotope',{massNumber:i.a,z:i.z,notes:`${i.stability}; verified isotope. Molar mass uses a mass-number approximation, not an exact isotopic mass. Isotope-specific bulk samples are not modeled.`,molarMass:i.a});
  add(`atom:${i.symbol}:${i.a}`,`${bySymbol.get(i.symbol).name}-${i.a} atom`,i.symbol,'atom',0,'atom',{massNumber:i.a,z:i.z,molarMass:i.a,notes:'Neutral isolated atom; molar mass uses the mass-number approximation. Bulk reagent conversion unlocks the natural-abundance substance, without transferring an isotope-specific sample.'});
 }
 for(const [symbol,charges]of Object.entries(supportedIons))for(const charge of charges.filter(Boolean))add(`ion:${symbol}:${charge}`,`${bySymbol.get(symbol).name} ion`,symbol,'ion',charge,'ion',{notes:'Simplified isolated ion identity; not an independently available bulk reagent.'});
 for(const ref of refs)add(ref.id,ref.name,ref.formula,'molecule',ref.charge||0,'molecule',{referenceId:ref.id,notes:ref.caveat||ref.geometryStatus||''});
 for(const [id,name,formula,representation] of [
  ['NaCl','Sodium chloride','NaCl','formula-unit'],['sucrose','Sucrose','C12H22O11','molecule'],['ethanol','Ethanol','C2H6O','molecule'],['hexane','Hexane','C6H14','molecule'],['HCl','Hydrogen chloride','HCl','molecule'],['NaOH','Sodium hydroxide','NaOH','formula-unit'],['NaHCO3','Sodium bicarbonate','NaHCO3','formula-unit'],['CaCl2','Calcium chloride','CaCl2','formula-unit'],['Na2CO3','Sodium carbonate','Na2CO3','formula-unit'],['CaCO3','Calcium carbonate','CaCO3','formula-unit']
 ])add(id,name,formula,'compound',0,representation,{notes:representation==='formula-unit'?'Formula unit of an ionic compound; not a discrete molecule.':'Composition model; no validated Atomic Lab geometry is available.'});
 for(const [formula,name,charge]of [['OH','Hydroxide',-1],['HCO3','Bicarbonate',-1],['CO3','Carbonate',-2]])add(`ion:${formula}:${charge}`,`${name} ion`,formula,'ion',charge,'ion');
 const specs=[
  ['water','H2O','l',true,'#62c9ff','liquid',1],['salt','NaCl','s',true,'#eef7ff','crystals'],['sugar','sucrose','s',true,'#fff5dc','granules'],
  ['ethanol','ethanol','l',true,'#c6a9ff','liquid',.789],['hexane','hexane','l',true,'#ffd473','liquid',.659],
  ['acid','HCl','aq',true,'#ff909c','solution'],['base','NaOH','aq',true,'#959fff','solution'],['bicarbonate','NaHCO3','aq',true,'#77ddd0','solution'],['calcium','CaCl2','aq',true,'#cfedff','solution'],['carbonate','Na2CO3','aq',true,'#abefbf','solution'],
  ['hydrogen','H2','g',false,'#d8f4ff','gas'],['oxygen','O2','g',false,'#ffb3ba','gas'],['nitrogen','N2','g',false,'#aebcff','gas'],['carbon-dioxide','CO2','g',false,'#cbd9e1','gas'],['ammonia','NH3','g',false,'#ccabff','gas'],['methane','CH4','g',false,'#9effca','gas'],['ethene','C2H4','g',false,'#ffd59e','gas'],['ethyne','C2H2','g',false,'#ffa9d9','gas']
 ];
 for(const [id,speciesId,state,starter,color,texture,density]of specs){
  const maxQuantity=state==='l'?200:state==='s'?100:10;
  const form={id,speciesId,state,unit:state==='l'?'mL':'mmol',defaultQuantity:state==='l'?20:state==='s'?10:1,maxQuantity,stock:maxQuantity,starter,color,texture,...(density?{density}:{}),...(state==='aq'?{concentration:.1}:{})};
  forms.set(id,form);entries.get(speciesId).reactionForms.push(id);
 }
 for(const [symbol,form]of [['H','hydrogen'],['O','oxygen'],['N','nitrogen']]){
  entries.get(`element:${symbol}`).reactionForms.push(form);
  for(const entry of entries.values())if(entry.id.startsWith(`atom:${symbol}:`))entry.reactionForms.push(form);
 }
 const all=freeze([...entries.values()]),reagents=freeze([...forms.values()]);
 return Object.freeze({all,reagents,get:id=>entries.get(id)||null,reagent:id=>forms.get(id)||null});
}
