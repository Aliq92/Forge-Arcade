import * as gravity from '../labs/gravity.js';
import * as motion from '../labs/motion.js';
import * as waves from '../labs/waves.js';
import * as electricity from '../labs/electricity.js';
export const LABS=[
 {id:'gravity',name:'Gravity & Orbits',color:'#b6a0ff',symbol:'◉',description:'Build worlds. Trace paths. Check energy.',module:gravity},
 {id:'motion',name:'Motion & Forces',color:'#ffb26c',symbol:'↗',description:'Change a force. Measure what moves.',module:motion},
 {id:'waves',name:'Waves & Oscillations',color:'#6be2ce',symbol:'∿',description:'Find a rhythm. See how waves combine.',module:waves},
 {id:'electricity',name:'Electricity & Circuits',color:'#f6da7b',symbol:'ϟ',description:'Connect a circuit. Account for every current.',module:electricity}
];
export const EXPERIMENTS=LABS.flatMap(l=>l.module.EXPERIMENTS);
export function labById(id){const lab=LABS.find(l=>l.id===id);if(!lab)throw Error('Unknown laboratory.');return lab;}
export function createModel(lab,mode,params={}){return labById(lab).module.createModel(mode,params);}
export function validateSetup(lab,mode,params){try{return labById(lab).module.normalizeConfig(mode,params);}catch{return {ok:false,config:null,errors:['Invalid experiment setup.']};}}
