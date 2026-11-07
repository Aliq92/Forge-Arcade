import {atomCounts} from './chemistry/atomic.mjs';import {validateGraph} from './chemistry/molecular.mjs';
export const CHALLENGES=[
 ['Proton signature','Which element has eight protons?','The proton count is its atomic number.','Eight protons identify oxygen.'],
 ['Neutral carbon','Create a neutral carbon atom in the Atom Explorer, then check your work.','Choose carbon, a verified isotope, and charge 0.','Carbon has six protons; a neutral carbon atom has six electrons.'],
 ['Same element, different mass','Compare hydrogen-1 and hydrogen-2. What changes?','Choose two hydrogen isotopes with different neutron counts.','Isotopes have the same proton count but different neutron counts.'],
 ['A sodium ion','Construct Na⁺ in the Atom Explorer.','Sodium has Z=11. Removing one electron leaves ten.','Na⁺ has eleven protons and ten electrons; its electron configuration matches neon.'],
 ['Configuration detective','Identify the element with [Ne] 3s².','The neon core has ten electrons; add two.','Twelve electrons in a neutral atom identify magnesium.'],
 ['A shared pair','Build H₂ in the Molecule Builder.','Connect two hydrogen atoms with one single bond.','A single bond shares one electron pair. Each hydrogen reaches a duet.'],
 ['Water works','Build H₂O.','Connect oxygen to two hydrogens using single bonds; oxygen needs two lone pairs.','Water has two O–H bonds and a bent molecular geometry.'],
 ['Carbon in a line','Build CO₂.','Place carbon between two oxygens with double bonds; each oxygen has two lone pairs.','CO₂ is linear; each C=O double bond shares two electron pairs in the Lewis model.'],
 ['The lone pair','Build NH₃.','Use three N–H bonds and one lone pair on nitrogen.','Ammonia is trigonal pyramidal. The lone pair is not an atom at a pyramid corner.'],
 ['Four directions','Build CH₄.','Connect carbon to four explicit hydrogen atoms with single bonds.','Methane is tetrahedral, not a flat cross. Its ideal angle is about 109.47°.'],
 ['Two versus three','Compare oxygen O₂ and nitrogen N₂: how many shared pairs does each Lewis bond represent?','O=O is a double bond; N≡N is triple. Oxygen’s true triplet state needs a molecular-orbital treatment.','N₂: three bonding pairs. O₂: two in its Lewis double bond. This does not reproduce O₂ spin or paramagnetism.'],
 ['Identify the molecule','Clues: C₂H₄; approximately planar around each carbon. Which reference molecule fits?','A carbon–carbon double bond constrains the local arrangement.','Ethene has formula C₂H₄ with a C=C double bond and approximately planar carbon environments.'],
].map(([title,prompt,hint,explanation],i)=>({id:i+1,title,prompt,hint,explanation}));
export function checkChallenge(id,state,refs){
 let ok=false;try{
 if(id===1)ok=state.answer==='O';
 if(id===2){const a=state.atom,c=atomCounts(a.z,a.a,a.q);ok=a.z===6&&[12,13,14].includes(a.a)&&c.electrons===6&&c.charge===0;}
 if(id===3){const a=state.isotopes.map(i=>atomCounts(i.z,i.a,i.q));ok=state.isotopes.every(i=>i.z===1)&&state.isotopes.map(i=>i.a).sort().join(',')==='1,2'&&a[0].neutrons!==a[1].neutrons;}
 if(id===4){const a=state.atom,c=atomCounts(a.z,a.a,a.q);ok=a.z===11&&c.electrons===10&&c.charge===1;}
 if(id===5)ok=state.answer==='Mg';
 if(id>=6&&id<=10){const v=validateGraph(state.graph,refs);ok=v.status==='SUPPORTED'&&v.reference.id===['H2','H2O','CO2','NH3','CH4'][id-6];}
 if(id===11)ok=state.answer==='three-two'&&['O2','N2'].every(key=>validateGraph(refs.find(r=>r.id===key),refs).status==='SUPPORTED');
 if(id===12)ok=state.answer==='C2H4'&&refs.some(r=>r.id===state.answer&&r.geometry==='planar around each carbon');
 }catch{}
 return {ok,message:ok?CHALLENGES[id-1]?.explanation:'Not yet. '+(CHALLENGES[id-1]?.hint||'Choose a challenge.')};
}
export function loadProgress(storage){try{const data=JSON.parse(storage?.getItem('elemental.progress.v1')||'{}'),completed=[];for(let i=1;i<=12;i++){if(data.completed?.includes(i))completed.push(i);else break;}return {completed};}catch{return {completed:[]};}}
export function completeChallenge(progress,id,storage){const completed=[...progress.completed];if(id===completed.length+1&&id<=12)completed.push(id);const next={completed};try{storage?.setItem('elemental.progress.v1',JSON.stringify(next));}catch{}return next;}
