import {makeModel,normalize,curve,meta} from '../shared.mjs';
export {num,select,bool,curve,meta,rk4,TAU,G,R,KB,EPS0,C} from '../shared.mjs';
export const point=(x,y,label,color)=>({x,y,label,color});
export const segment=(x1,y1,x2,y2,label)=>({a:{x:x1,y:y1},b:{x:x2,y:y2},label});
export function descriptor(id,title,subject,parameters,outputs,equationIds,explanation,extra={}){
 return {id,title,subject,kind:'B',status:'established',question:`How do the controls change ${title.toLowerCase()}?`,parameters,outputs:Object.fromEntries(Object.entries(outputs).map(([k,v])=>[k,typeof v==='string'?meta(k.replace(/[A-Z]/g,a=>' '+a.toLowerCase()),v):v])),equationIds,references:[subject==='classical'?'openstax1':subject==='optics'?'openstax3':'openstax2'],assumptions:[],explanation,graph:{x:'time',y:Object.keys(outputs)[0]},presets:[{name:'Reference setup',config:{}}],...extra};
}
export function model(def,input,hooks){
 const m=makeModel(def,input,hooks);if(!m.dynamic)m.step=(h=m.dt)=>{if(!Number.isFinite(h)||h<=0||h>m.dt*4)throw Error('Step is outside the fixed-step domain.');};return m;
}
export function plot(points,xLabel,xUnit,yLabel,yUnit,label=yLabel){return {points,x:{label:xLabel,unit:xUnit},y:{label:yLabel,unit:yUnit},label};}
export function graphScene(profile,caption=profile.label){
 const finite=profile.points.filter(p=>Number.isFinite(p.y)),xs=finite.map(p=>p.x),ys=finite.map(p=>p.y),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(0,...ys),ymax=Math.max(0,...ys),dx=xmax-xmin||1,dy=ymax-ymin||1;
 return {aspect:'independent',bounds:{x:xmin-dx*.05,y:ymin-dy*.1,w:dx*1.1,h:dy*1.2},unit:`${profile.x.unit} horizontal; ${profile.y.unit} vertical`,caption,curves:[{points:profile.points,label:profile.label}]};
}
export function adapter(def,input,create,mode,hooks){
 const config=normalize(input,def.parameters),m=create(mode,config),step=m.step.bind(m);m.id=def.id;m.dynamic=def.dynamic!==false;m.sampleInterval=m.dt*3;
 m.measurementMeta=Object.fromEntries(Object.entries(m.measurementMeta).map(([k,v])=>[k,{...v,unit:v.unit||'1'}]));
 m.step=(h=m.dt)=>{if(!Number.isFinite(h)||h<=0||h>m.dt)throw Error('Use a positive step no larger than the fixed physical step.');step(h);};
 m.snapshot=()=>structuredClone({experimentId:m.id,config:m.config,time:m.time,state:m.state,readings:m.measure()});m.profile=()=>hooks.profile(m);m.scene=()=>hooks.scene(m);m.explain=()=>def.explanation;return m;
}
