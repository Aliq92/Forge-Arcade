import * as classical from './established/classical.mjs';
import * as thermal from './established/thermal.mjs';
import * as em from './established/electromagnetism.mjs';
import * as optics from './established/optics.mjs';
const packs=[classical,thermal,em,optics];
export const EXPERIMENTS=packs.flatMap(p=>p.EXPERIMENTS);
export function createModel(id,params={}){const pack=packs.find(p=>p.EXPERIMENTS.some(d=>d.id===id));if(!pack)throw Error('Unknown established laboratory.');return pack.create(id,params);}
export function validate(id,params={}){try{return {ok:true,config:createModel(id,params).config,errors:[]};}catch(error){return {ok:false,config:null,errors:[error.message]};}}
