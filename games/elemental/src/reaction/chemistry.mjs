// Curated equilibrium endpoints, not kinetics or a general mixture solver.
export const KSP_CACO3 = 8.7e-9;
const term=(speciesId,coefficient,state)=>({speciesId,coefficient,state});
export const REACTIONS = Object.freeze([
 {id:'salt-dissolution',reactants:[term('NaCl',1,'s')],products:[term('ion:Na:1',1,'aq'),term('ion:Cl:-1',1,'aq')]},
 {id:'sugar-dissolution',reactants:[term('sucrose',1,'s')],products:[term('sucrose',1,'aq')]},
 {id:'neutralization',reactants:[term('ion:H:1',1,'aq'),term('ion:OH:-1',1,'aq')],products:[term('H2O',1,'l')]},
 {id:'bicarbonate-gas',reactants:[term('ion:H:1',1,'aq'),term('ion:HCO3:-1',1,'aq')],products:[term('CO2',1,'g'),term('H2O',1,'l')]},
 {id:'carbonate-precipitation',reactants:[term('ion:Ca:2',1,'aq'),term('ion:CO3:-2',1,'aq')],products:[term('CaCO3',1,'s')]},
 {id:'water-phase',reactants:[term('H2O',1,'l')],products:[term('H2O',1,'g')]},
 {id:'salt-recovery',reactants:[term('ion:Na:1',1,'aq'),term('ion:Cl:-1',1,'aq')],products:[term('NaCl',1,'s')]},
 {id:'hydrogen-water',reactants:[term('H2',2,'g'),term('O2',1,'g')],products:[term('H2O',2,'l')]}
].map(x=>Object.freeze({...x,balanced:true,conditions:'Curated forms only; see REACTION-SCIENCE.md'})));
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const safe=x=>plain(x)&&!Object.keys(x).some(k=>['__proto__','prototype','constructor'].includes(k));
export function normalizeConfig(value,catalog){
 const errors=[];const bad=s=>errors.push(s);
 if(!safe(value))return {ok:false,config:null,errors:['Configuration must be a plain object.']};
 if(!Array.isArray(value.reagents)||!value.reagents.length||value.reagents.length>100)bad('Choose 1–6 distinct reagent forms.');
 const quantities=new Map();let volume=0;
 for(const x of Array.isArray(value.reagents)?value.reagents:[]){
  if(!safe(x)||typeof x.formId!=='string'||!catalog.reagent(x.formId)){bad('Unknown reagent form.');continue;}
  if(typeof x.quantity!=='number'||!Number.isFinite(x.quantity)||x.quantity<1e-6){bad('Quantities must be finite numbers ≥ 0.000001 in the form unit.');continue;}
  quantities.set(x.formId,(quantities.get(x.formId)||0)+x.quantity);
 }
 if(quantities.size>6)bad('At most six distinct forms are allowed.');
 for(const [id,q]of quantities){const f=catalog.reagent(id);if(q>Math.min(f.maxQuantity,f.stock))bad(`${id} exceeds finite trial stock.`);if(f.unit==='mL')volume+=q;else if(f.state==='aq')volume+=q/(f.concentration||.1);}
 if(volume>500)bad('Combined solution/liquid volume exceeds 500 mL.');
 const temperature=value.temperature??25,vessel=value.vessel??'beaker',activation=value.activation??false,solventFraction=value.solventFraction??1;
 if(![-10,25,110].includes(temperature))bad('Temperature setting must be −10, 25 or 110 °C.');
 if(!['beaker','flask','sealed'].includes(vessel))bad('Unknown vessel.');
 if(typeof activation!=='boolean')bad('Activation must be boolean.');
 if(typeof solventFraction!=='number'||!Number.isFinite(solventFraction)||solventFraction<.05||solventFraction>1)bad('Solvent fraction must be 0.05–1.');
 return {ok:!errors.length,config:errors.length?null:{reagents:[...quantities].sort(([a],[b])=>a.localeCompare(b)).map(([formId,quantity])=>({formId,quantity})),temperature,vessel,activation,solventFraction},errors};
}
const dissociation={acid:[['ion:H:1',1],['ion:Cl:-1',1]],base:[['ion:Na:1',1],['ion:OH:-1',1]],bicarbonate:[['ion:Na:1',1],['ion:HCO3:-1',1]],calcium:[['ion:Ca:2',1],['ion:Cl:-1',2]],carbonate:[['ion:Na:1',2],['ion:CO3:-2',1]]};
const ledger=()=>new Map();const key=(id,state)=>`${id}|${state}`;
const add=(m,id,n,state)=>m.set(key(id,state),(m.get(key(id,state))||0)+n);
const rows=m=>[...m].filter(([,amount])=>amount>1e-14).map(([k,amount])=>{const [speciesId,state]=k.split('|');return {speciesId,amount,state};}).sort((a,b)=>a.speciesId.localeCompare(b.speciesId)||a.state.localeCompare(b.state));
const clone=m=>new Map(m);
function conservation(initial,final,catalog){
 const atoms={},charge=[0,0],mass=[0,0];for(const [i,list]of [initial,final].entries())for(const x of list){const e=catalog.get(x.speciesId);for(const [s,n]of Object.entries(e.elements))atoms[s]=(atoms[s]||0)+(i?1:-1)*n*x.amount;charge[i]+=e.charge*x.amount;mass[i]+=e.molarMass*x.amount/1000;}
 const chargeResidual=charge[1]-charge[0];return {atoms:Object.values(atoms).every(n=>Math.abs(n)<1e-7),charge:Math.abs(chargeResidual)<1e-7,massError:mass[1]-mass[0],atomResiduals:atoms,chargeResidual};
}
export function simulate(value,catalog){
 const normalized=normalizeConfig(value,catalog);
 if(!normalized.ok)return {valid:false,supported:false,errors:normalized.errors,products:[],final:[],observations:[],warnings:[]};
 const config=normalized.config,m=ledger();let volume=0;const q=Object.fromEntries(config.reagents.map(x=>[x.formId,x.quantity]));
 for(const {formId,quantity:n}of config.reagents){const f=catalog.reagent(formId);if(dissociation[formId]){for(const [id,k]of dissociation[formId])add(m,id,n*k,'aq');const v=n/(f.concentration||.1);volume+=v;add(m,'H2O',v*1000/catalog.get('H2O').molarMass,'l');}else{const amount=f.unit==='mL'?n*(f.density||1)*1000/catalog.get(f.speciesId).molarMass:n;add(m,f.speciesId,amount,f.state);if(f.unit==='mL')volume+=n;}}
 const initial=rows(m),before=clone(m);let process=null,ruleId=null,effect=null,equation='',explanation='',extent=0,recoveredSalt=0,limiting=[],pH=null,observations=[],warnings=[];
 const ids=Object.keys(q).sort();const matches=(...allowed)=>ids.every(id=>allowed.includes(id));const pair=(a,b)=>q[a]&&q[b];
 const consume=(id,n,state='aq')=>add(m,id,-n,state);
 const convert=(rule,n)=>{extent=n;for(const t of rule.reactants)consume(t.speciesId,n*t.coefficient,t.state);for(const t of rule.products)add(m,t.speciesId,n*t.coefficient,t.state);};
 const aqueousPair=(a,b)=>matches(a,b,'water')&&pair(a,b);
 const stoich=(a,b)=>{const na=m.get(key(a,'aq')),nb=m.get(key(b,'aq'));limiting=na<nb?[a]:nb<na?[b]:[a,b];return Math.min(na,nb);};
 const find=id=>REACTIONS.find(x=>x.id===id);
 if(config.temperature!==25&&!matches('water'))explanation='Phase endpoints at nonambient settings are supported only for pure water.';
 else if(config.solventFraction!==1&&!(pair('water','salt')&&matches('water','salt')&&config.temperature===25))explanation='Solvent recovery is supported only for salt and water at 25 °C.';
 else if(matches('water')&&q.water){
  ruleId='water-phase';process=config.temperature===25?'mixing':'phase-change';effect=config.temperature===25?'mixing':'phase';const state=config.temperature<0?'s':config.temperature>100?'g':'l';const n=m.get(key('H2O','l'));consume('H2O',n,'l');add(m,'H2O',n,state);extent=state==='l'?0:n;equation=`H₂O(l) → H₂O(${state})`;explanation='Pure-water equilibrium endpoint at nominal 1 atm; heating/cooling time and latent heat are not modeled.';observations=[state==='s'?'Ice endpoint.':state==='g'?'Water vapor endpoint.':'Liquid water endpoint.'];
 }else if(pair('water','salt')&&matches('water','salt')){
  ruleId=config.solventFraction<1?'salt-recovery':'salt-dissolution';const waterG=q.water,capacity=waterG*.36*1000/catalog.get('NaCl').molarMass;const dissolved=Math.min(q.salt,capacity*config.solventFraction);consume('NaCl',dissolved,'s');add(m,'ion:Na:1',dissolved,'aq');add(m,'ion:Cl:-1',dissolved,'aq');recoveredSalt=Math.min(q.salt,capacity)-dissolved;extent=config.solventFraction<1?recoveredSalt:dissolved;const removed=(1-config.solventFraction)*waterG*1000/catalog.get('H2O').molarMass;consume('H2O',removed,'l');add(m,'H2O',removed,'g');volume=q.water*config.solventFraction;process=config.solventFraction<1?(recoveredSalt>0?'crystallization':'solvent-recovery'):'dissolution';effect=config.solventFraction<1?(recoveredSalt>0?'crystals':'evaporation'):'dissolve';equation=config.solventFraction<1?'Na⁺(aq) + Cl⁻(aq) ⇌ NaCl(s); H₂O(l) → H₂O(g)':'NaCl(s) ⇌ Na⁺(aq) + Cl⁻(aq)';explanation='Finite 25 °C NaCl capacity: 36 g per 100 g water. Dissociated salt and undissolved/recovered solid are tracked; removed water remains in the vapor ledger.';observations=[`${dissolved.toFixed(3)} mmol salt remains dissolved.`,`${Math.max(0,q.salt-dissolved).toFixed(3)} mmol solid remains.`];
 }else if(pair('water','sugar')&&matches('water','sugar')){
  const grams=q.sugar*catalog.get('sucrose').molarMass/1000;
  if(grams/q.water<=.1){ruleId='sugar-dissolution';process='dissolution';effect='dissolve';convert(find(ruleId),q.sugar);equation='C₁₂H₂₂O₁₁(s) → C₁₂H₂₂O₁₁(aq)';explanation='Dilute sucrose dissolution preserves individual molecules. The model is restricted to ≤0.10 g sugar per g water; it does not predict saturation.';observations=['Sugar dissolves without forming a new chemical identity.'];}else explanation='Sugar model domain is ≤0.10 g sucrose per g water; no extrapolated saturation prediction.';
 }else if((pair('water','ethanol')&&matches('water','ethanol'))||(pair('water','hexane')&&matches('water','hexane'))){
  const miscible=!!q.ethanol;ruleId=miscible?'miscible-liquids':'immiscible-liquids';process='mixing';effect=miscible?'mixing':'layers';equation='Physical mixture — no chemical equation';explanation=miscible?'Water and ethanol form one liquid phase. Volumes are approximately additive; contraction is not modeled.':'Water and hexane form two liquid phases. Mutual solubility is neglected; hexane is represented above water by its lower density.';observations=[miscible?'One homogeneous liquid phase.':'Two liquid layers.'];
 }else if(aqueousPair('acid','base')){
  ruleId='neutralization';process='neutralization';effect='indicator';convert(find(ruleId),stoich('ion:H:1','ion:OH:-1'));const excess=(q.acid-q.base)/volume;const h=excess>=0?(excess+Math.hypot(excess,2e-7))/2:2e-14/(Math.hypot(excess,2e-7)-excess);pH=-Math.log10(h);equation='H⁺(aq) + OH⁻(aq) → H₂O(l)';explanation='Ideal dilute strong-acid/strong-base endpoint at 25 °C. Sodium and chloride remain spectators. pH uses net strong-ion excess and Kw = 10⁻¹⁴; heat and activity corrections are not predicted.';observations=['Water forms; excess reagent controls pH.',`Ideal pH ${pH.toFixed(2)}.`];
 }else if(aqueousPair('acid','bicarbonate')){
  ruleId='bicarbonate-gas';process='gas-formation';effect='bubbles';convert(find(ruleId),stoich('ion:H:1','ion:HCO3:-1'));equation='H⁺(aq) + HCO₃⁻(aq) → CO₂(g) + H₂O(l)';explanation='Ideal stoichiometric gas-evolution endpoint. CO₂ is assigned to the gas ledger; dissolved CO₂, carbonate speciation, kinetics and pH are outside this model.';observations=['Carbon dioxide gas forms; spectators and excess bicarbonate or acid remain.'];
 }else if(aqueousPair('calcium','carbonate')){
  ruleId='carbonate-precipitation';const a=q.calcium,b=q.carbonate,L=volume/1000;const target=KSP_CACO3*(L*1000)**2;
  // Stable smaller quadratic root for (a-x)(b-x)=Ksp*(1000L)^2.
  extent=a*b>target?2*(a*b-target)/(a+b+Math.sqrt((a-b)**2+4*target)):0;
  convert(find(ruleId),extent);process=extent>0?'precipitation':'mixing';effect=extent>0?'precipitate':'mixing';limiting=a<b?['ion:Ca:2']:b<a?['ion:CO3:-2']:['ion:Ca:2','ion:CO3:-2'];equation='Ca²⁺(aq) + CO₃²⁻(aq) ⇌ CaCO₃(s)';explanation='Reduced free-ion model at 25 °C: Ksp = 8.7 × 10⁻⁹. Residual ions satisfy Ksp when solid forms. Carbonate protonation, activities, complexes and atmospheric CO₂ are omitted, so this is not a complete aqueous equilibrium prediction.';observations=[extent>0?'Calcium carbonate solid forms; residual dissolved ions remain.':'Free-ion product is at or below Ksp; no precipitate in this reduced model.'];
 }else if(pair('hydrogen','oxygen')&&matches('hydrogen','oxygen')&&config.vessel==='sealed'&&config.activation){
  ruleId='hydrogen-water';process='synthesis';effect='formation';extent=Math.min(q.hydrogen/2,q.oxygen);convert(find(ruleId),extent);limiting=q.hydrogen/2<q.oxygen?['H2']:q.oxygen<q.hydrogen/2?['O2']:['H2','O2'];equation='2 H₂(g) + O₂(g) → 2 H₂O(l)';explanation='Abstract activated stoichiometric endpoint in a virtual sealed chamber. No real-world procedure, ignition, kinetics, final temperature or pressure is modeled.';observations=['The virtual activated model forms water; excess gas remains.'];
 }
 const supported=!!ruleId,final=supported?rows(m):initial.map(x=>({...x}));
 // Existing solution models use approximate additive/constant liquid volume.
 // A pure phase endpoint has no liquid volume when its final state is ice/gas;
 // a gas-only synthesis obtains liquid volume from its newly formed water.
 if(!final.some(x=>x.state==='l'||x.state==='aq'))volume=0;
 else if(ruleId==='hydrogen-water')volume=final.filter(x=>x.speciesId==='H2O'&&x.state==='l').reduce((sum,x)=>sum+x.amount*catalog.get('H2O').molarMass/1000,0);
 if(!supported){explanation=explanation||'The current curated engine has no verified rule for these forms and conditions. This does not establish that the real substances are inert.';warnings.push('No reaction, yield or safety conclusion can be drawn from an unsupported combination.');}
 if(supported)warnings.push('Educational endpoint model; no measured yield, kinetics, final temperature or pressure prediction.');
 const products=supported?final.flatMap(x=>{const delta=x.amount-(before.get(key(x.speciesId,x.state))||0);return delta>1e-12?[{...x,amount:delta}]:[];}):[];
 if(recoveredSalt>1e-12)products.push({speciesId:'NaCl',state:'s',amount:recoveredSalt});
 const remaining=initial.flatMap(x=>{const n=final.find(f=>f.speciesId===x.speciesId&&f.state===x.state)?.amount||0;const recovered=x.speciesId==='NaCl'&&x.state==='s'?recoveredSalt:0;const amount=Math.max(0,Math.min(x.amount,n)-recovered);return amount>1e-14?[{...x,amount}]:[];});
 const checks=conservation(initial,final,catalog);return {valid:true,supported,heading:supported?process.toUpperCase().replaceAll('-',' '):'NO VERIFIED REACTION AVAILABLE',process,ruleId,effect,equation,explanation,observations,warnings,initial,products,remaining,final,extent,limiting,conservation:checks,measurements:{massG:initial.reduce((n,x)=>n+x.amount*catalog.get(x.speciesId).molarMass/1000,0),volumeMl:volume,pH,temperature:config.temperature,pressure:null},config};
}
