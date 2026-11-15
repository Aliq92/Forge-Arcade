import * as established from './established.mjs';import * as modern from './modern.mjs';import * as frontiers from './frontiers.mjs';
const packs=[established,modern,frontiers];
export const EXPERIMENTS=packs.flatMap(p=>p.EXPERIMENTS);
export function experiment(id){return EXPERIMENTS.find(d=>d.id===id)||null;}
export function createModel(id,config={}){const pack=packs.find(p=>p.EXPERIMENTS.some(e=>e.id===id));if(!pack)throw Error('Unknown laboratory.');return pack.createModel(id,config);}
