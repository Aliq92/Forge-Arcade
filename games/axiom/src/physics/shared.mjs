// SI definitions and CODATA2022 point values; uncertainties/domains are documented.
export const C=299792458,H=6.62607015e-34,HBAR=H/(2*Math.PI),KB=1.380649e-23,E=1.602176634e-19,NA=6.02214076e23,R=KB*NA,G=6.67430e-11,EPS0=8.8541878188e-12,MU0=1.25663706127e-6,ME=9.1093837139e-31,MSUN=1.98847e30,AU=149597870700,PC=648000/Math.PI*AU,YEAR=31557600;
export const TAU=2*Math.PI,clone=v=>structuredClone(v);
export const num=(key,label,unit,min,max,step,value,scale='linear')=>({key,label,unit,min,max,step,default:value,type:'number',scale});
export const select=(key,label,options,value)=>({key,label,unit:'',type:'select',options:options.map(o=>typeof o==='string'?{value:o,label:o}:o),default:value});
export const bool=(key,label,value=false)=>({key,label,unit:'',type:'boolean',default:value});
export function normalize(input={},parameters=[]){
 if(!input||typeof input!=='object'||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw Error('Parameters must be a plain object.');
 if(Object.keys(input).some(key=>!parameters.some(p=>p.key===key)||['__proto__','constructor','prototype'].includes(key)))throw Error('Unknown parameter.');
 const output={};for(const p of parameters){const value=Object.hasOwn(input,p.key)?input[p.key]:p.default;
  if(p.type==='boolean'){if(typeof value!=='boolean')throw Error(p.label+' must be boolean.');}
  else if(p.type==='select'){if(!p.options.some(o=>o.value===value))throw Error('Unsupported '+p.label+'.');}
  else if(typeof value!=='number'||!Number.isFinite(value)||value<p.min||value>p.max)throw Error(p.label+' is outside its reliable domain.');
  if(p.integer&&!Number.isInteger(value))throw Error(p.label+' must be an integer.');output[p.key]=value;
 }return output;
}
export function makeModel(def,input={},hooks={}){
 const config=normalize(input,def.parameters),dt=typeof def.dt==='function'?def.dt(config):def.dt??1/240,clockRate=typeof def.clockRate==='function'?def.clockRate(config):def.clockRate??1;
 if(!(Number.isFinite(dt)&&dt>0&&Number.isFinite(clockRate)&&clockRate>0))throw Error('Invalid physical clock.');
 const model={id:def.id,config,parameters:def.parameters,time:0,dt,clockRate,dynamic:def.dynamic!==false,valid:true,complete:false,state:hooks.initial?.(config)??{},measurementMeta:{time:{label:'Physical time',unit:'s'},...def.outputs},sampleInterval:def.sampleInterval??dt*3,
  step(h=dt){if(!Number.isFinite(h)||h<=0||h>dt*4)throw Error('Step is outside the fixed-step domain.');if(!this.dynamic||!this.valid||this.complete)return;hooks.advance?.(this,h);this.time+=h;},
  measure(){const values={time:this.time,...(hooks.read?.(this)||{})};for(const [key,value]of Object.entries(values))if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)))throw Error('Nonfinite scientific reading: '+key);return values;},
  scene(){return hooks.scene?.(this)??{bounds:{x:-1,y:-1,w:2,h:2},unit:'',curves:[],points:[],caption:'Adjust parameters to inspect this model.'};},
  profile(){return hooks.profile?.(this)??null;},
  explain(){return hooks.explain?.(this)??def.explanation??'';},
  snapshot(){return clone({experimentId:this.id,config:this.config,time:this.time,state:this.state,readings:this.measure()});},
  get warnings(){return [...(def.warnings||[]),...(hooks.warnings?.(this)||[])];}
 };return model;
}
export function rk4(values,h,derivative,time=0){const a=derivative(values,time),b=derivative(values.map((v,i)=>v+h*a[i]/2),time+h/2),c=derivative(values.map((v,i)=>v+h*b[i]/2),time+h/2),d=derivative(values.map((v,i)=>v+h*c[i]),time+h);return values.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);}
export function curve(fn,min,max,count=201){return Array.from({length:count},(_,i)=>{const x=min+(max-min)*i/(count-1),y=fn(x);return {x,y:Number.isFinite(y)?y:null};});}
export const meta=(label,unit)=>({label,unit});
