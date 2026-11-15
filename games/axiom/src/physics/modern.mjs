// Pure SI model pack. No renderer, DOM, storage or remote requests.
import * as relativity from './modern/relativity.mjs';
import * as gravity from './modern/gravity.mjs';
import * as quantum from './modern/quantum.mjs';
import * as particle from './modern/particle.mjs';
import * as cosmology from './modern/cosmology.mjs';
const packs=[relativity,gravity,quantum,particle,cosmology];
export const EXPERIMENTS=packs.flatMap(pack=>pack.experiments);
export function createModel(id,params={}){
 const pack=packs.find(p=>p.experiments.some(d=>d.id===id));if(!pack)throw Error('Unknown modern experiment: '+id);
 return pack.create(id,params);
}
export function validate(id,params={}){return createModel(id,params).config;}
