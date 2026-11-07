const cores={He:'1s2',Ne:'1s2 2s2 2p6',Ar:'1s2 2s2 2p6 3s2 3p6',Kr:'1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6',Xe:'1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6',Rn:'1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p6'};
export function parseConfiguration(text){
 const expanded=text.replace(/\[([A-Z][a-z]?)\]/g,(_,s)=>{if(!cores[s])throw Error('Unknown core');return cores[s]+' ';});
 const result=[...expanded.matchAll(/([1-7][spdf])(\d+)/g)].map(m=>({orbital:m[1],count:+m[2]}));
 for(const o of result)if(o.count>2*(2*'spdf'.indexOf(o.orbital[1])+1))throw Error('Orbital capacity exceeded');
 return result.sort((a,b)=>+a.orbital[0]-b.orbital[0]||'spdf'.indexOf(a.orbital[1])-'spdf'.indexOf(b.orbital[1]));
}
export const supportedIons={H:[-1,0,1],N:[-3,0],O:[-2,0],F:[-1,0],Na:[0,1],Mg:[0,2],Cl:[-1,0],K:[0,1],Ca:[0,2]};
export function atomCounts(z,a,q){if(![z,a,q].every(Number.isInteger)||z<1||z>118||a<z||z-q<0)throw Error('Particle counts require integer Z, A ≥ Z and nonnegative electrons');return {protons:z,neutrons:a-z,electrons:z-q,massNumber:a,charge:q};}
export function ionConfiguration(element,q,elements){
 if(q===0)return {supported:true,orbitals:parseConfiguration(element.configuration),label:element.configuration,status:element.configurationStatus};
 if(!supportedIons[element.symbol]?.includes(q))return {supported:false,orbitals:[],label:'Not established in this milestone: ion configuration unsupported',status:'unsupported'};
 const n=element.z-q,reference=elements.find(e=>e.z===n);return {supported:true,orbitals:n?parseConfiguration(reference.configuration):[],label:n?reference.configuration:'No electrons',status:'simplified main-group ion model'};
}
export function orbitalBoxes({orbital,count}){const n=2*'spdf'.indexOf(orbital[1])+1;if(!Number.isInteger(count)||count<0||count>n*2)throw Error('Invalid occupancy');return Array.from({length:n},(_,i)=>i<count?(count>n+i?'↑↓':'↑'):'');}
