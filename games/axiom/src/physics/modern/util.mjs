import {curve} from '../shared.mjs';

export const profile=(fn,min,max,xLabel,xUnit,yLabel,yUnit,label,count=201)=>({points:curve(fn,min,max,count),x:{label:xLabel,unit:xUnit},y:{label:yLabel,unit:yUnit},label});
export function plotScene(p,caption,extras={}){
 const finite=p.points.filter(v=>Number.isFinite(v.x)&&Number.isFinite(v.y));
 const xs=finite.map(v=>v.x),ys=finite.map(v=>v.y),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(0,...ys),ymax=Math.max(0,...ys);
 const w=xmax-xmin||1,h=ymax-ymin||1;
 return {aspect:'independent',bounds:{x:xmin-.05*w,y:ymin-.08*h,w:1.1*w,h:1.16*h},unit:`x: ${p.x.unit||'dimensionless'}; y: ${p.y.unit||'dimensionless'}`,caption,curves:[{points:p.points,label:p.label}],...extras};
}
export const descriptor=(d)=>({kind:'B',status:'established',dynamic:false,graph:{x:'time',y:Object.keys(d.outputs)[0]},presets:[{name:'Reference configuration',config:{}}],...d});
export const samplePath=(path,max=401)=>path.length<=max?path:Array.from({length:max},(_,i)=>path[Math.round(i*(path.length-1)/(max-1))]);
export const integer=p=>({...p,integer:true});
