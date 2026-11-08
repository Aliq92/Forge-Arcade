const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
module.exports=function harness(original=false,seed=17){let state=seed>>>0;const math=Object.create(Math);math.random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);const values=new Map(),timers=[],arcs=[];
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),arc(x,y,r){arcs.push({x,y,r});}},{get:(o,k)=>o[k]??(()=>{})});
 const sandbox={Math:math,Date:{now:()=>100000},console,performance:{now:()=>0},matchMedia:()=>({matches:false}),devicePixelRatio:1,document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){}};sandbox.window=sandbox;vm.createContext(sandbox);
 const root=path.resolve(__dirname,original?'fixtures/original/js':'../js');for(const file of ['utils.js','chromatic.js','storage.js','orb.js','ripples.js','obstacles.js','levels.js','renderer.js']){const p=path.join(root,file);if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),sandbox,{filename:file});}
 sandbox.RR.Audio=new Proxy({}, {get:()=>()=>{}});vm.runInContext(fs.readFileSync(path.join(root,'game.js'),'utf8'),sandbox,{filename:'game.js'});sandbox.RR.Game.init(800,500);
 return {R:sandbox.RR,sandbox,values,arcs,ctx,timers,flushTimers(){while(timers.length)timers.shift().fn();}};
};
