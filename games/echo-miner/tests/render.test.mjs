import test from 'node:test';import assert from 'node:assert/strict';
import {createRun,updateRun} from '../src/state.mjs';import {renderFrame} from '../src/render.mjs';
test('scanner first-frame floating-point rounding never supplies a negative Canvas radius',()=>{
 let r=createRun({difficulty:'survey',seed:12});r.elapsed=.2-1/60;r=updateRun(r,{scanPressed:true},1/60);
 const ctx=new Proxy({arc(x,y,radius){assert.ok(radius>=0,'negative radius '+radius);}}, {get:(target,key)=>target[key]??(()=>{})});
 const renderer={ctx,width:960,height:540,scale:1,dpr:1,prevPlayer:null,prevHunter:null};
 assert.doesNotThrow(()=>renderFrame(renderer,r,1));
});
