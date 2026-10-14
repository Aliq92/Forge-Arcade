import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { Renderer } from '../games/god-in-a-jar/js/render.js';
import { createWorld } from '../games/god-in-a-jar/js/world.js';
import { createRequire } from 'node:module';
const W = createRequire(import.meta.url)('../games/wildform/simulation.js');
const read = p => readFile(new URL('../'+p, import.meta.url),'utf8');
function canvas(width=412,height=915) {
  const counts={ellipses:0,images:0,shadows:0};
  const ctx=new Proxy({}, {get: (o,k)=>k in o?o[k]:k.startsWith('create')?()=>({addColorStop(){}}):(...args)=>{if(k==='ellipse')counts.ellipses++;if(k==='drawImage')counts.images++;},set:(o,k,v)=>{if(k==='shadowBlur'&&v>0)counts.shadows++;o[k]=v;return true;}});
  return {width:0,height:0,counts,getContext:()=>ctx,getBoundingClientRect:()=>({width,height})};
}
function environment() {
  globalThis.window={addEventListener(){}};globalThis.devicePixelRatio=3;
  globalThis.document={createElement:()=>canvas()};
}
test('Jar canvas limits backing pixels on a high-density phone',()=>{
  environment();const cv=canvas(),r=new Renderer(cv);
  assert.ok(r.dpr<=1.5);assert.ok(cv.width*cv.height<=412*915*2.25);
});
test('Jar reuses plant artwork across frames instead of drawing blurred paths again',()=>{
  environment();const cv=canvas(),r=new Renderer(cv),w=createWorld('performance');
  const p=w.plants[0],q={x:100,y:100};
  r.plant(q,p,.8,1);const ellipses=cv.counts.ellipses;
  r.plant(q,p,.8,1.1);
  assert.equal(cv.counts.ellipses,ellipses);
  assert.equal(cv.counts.images,2);
  p.food=0;r.plant(q,p,.1,1.2);assert.equal(cv.counts.images,3);
});
test('Wildform draws only creatures intersecting the camera view',async()=>{
  const context={window:{},document:{createElement:()=>canvas()},Wildform:W,devicePixelRatio:3,performance};
  vm.runInNewContext(await read('games/wildform/renderer.js'),context);
  const r=new context.window.WildformRenderer(canvas()),w=W.createWorld();
  // Isolate creature dispatch from terrain rasterization.
  r.dirty=false;r.lastTerrain=w.time;r.camera={x:32,y:20,zoom:3.5};
  w.organisms=[{...w.organisms[0],x:32,y:20},{...w.organisms[1],x:.5,y:.5}];
  const drawn=[];r.drawCreature=(c,a)=>drawn.push(a.id);r.draw(w,0,1/60);
  assert.deepEqual(drawn,[w.organisms[0].id]);assert.ok(r.dpr<=1.5);
});
function frameFunction(source) {
  const start=source.lastIndexOf('function frame(now)');
  const indent=source.slice(source.lastIndexOf('\n',start)+1,start);
  const closing=new RegExp('\\n'+indent+'\\}').exec(source.slice(start));
  return source.slice(start,start+closing.index+closing[0].length);
}
test('Jar does no drawing or UI work while the document is hidden',async()=>{
  const source=await read('games/god-in-a-jar/js/main.js');let scheduled=0,draws=0;
  vm.runInNewContext(frameFunction(source)+'\nframe(200)',{
    document:{hidden:true},last:0,lastRender:0,state:{snapshot:null,world:{}},
    clock:{reset(){},advance:()=>({steps:0})},effectiveSteps:0,effectiveReal:0,uiAcc:0,lastSave:200,lastSavedEvent:0,autosaveDue:false,
    renderer:{render(){draws++;}},requestAnimationFrame(){scheduled++;},
  });
  assert.equal(scheduled,1);assert.equal(draws,0);
});
test('Wildform skips redundant frames on a 120Hz display without losing elapsed time',async()=>{
  const source=await read('games/wildform/script.js');let simulated=0,draws=0;
  const c={lastFrame:0,lastRender:0,lastUi:0,simulationMs:0,frameCounter:0,autosave:0,
    toastUntil:1000,lastEvent:null,windGain:null,world:{time:0,events:[]},
    document:{hidden:false},performance:{now:()=>0},S:{advance(w,dt){simulated+=dt;}},
    renderer:{draw(){draws++;}},requestAnimationFrame(){},$:()=>({hidden:false}),save(){}};
  vm.runInNewContext(frameFunction(source)+'\nframe(9);frame(18);frame(27);frame(36)',c);
  assert.equal(draws,2);assert.ok(Math.abs(simulated-.036)<1e-9);
});
