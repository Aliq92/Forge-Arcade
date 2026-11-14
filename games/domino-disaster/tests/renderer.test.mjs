import test from 'node:test';
import assert from 'node:assert/strict';
import {Camera,hitTest,ParticlePool,Renderer} from '../renderer.js';

test('camera fit respects asymmetric HUD insets and screen/world round trips',()=>{
  const c=new Camera(),board={width:1000,height:620};c.fit(board,1440,900,{left:30,right:280,top:110,bottom:110});
  const a=c.screen({x:0,y:0}),b=c.screen({x:1000,y:620});
  assert.ok(a.x>=30&&a.y>=110&&b.x<=1160&&b.y<=790);
  const p={x:321.25,y:478.5},q=c.screen(p),r=c.world(q.x,q.y);
  assert.ok(Math.abs(r.x-p.x)<1e-9&&Math.abs(r.y-p.y)<1e-9);
});
test('zoom is anchored to cursor and pan uses CSS pixels',()=>{
  const c=new Camera();c.fit({width:1000,height:620},420,800,{left:16,right:16,top:150,bottom:170});
  const anchor=c.world(170,350);c.zoomAt(2,170,350);assert.deepEqual(c.screen(anchor),{x:170,y:350});
  const before=c.screen(anchor);c.pan(45,-18);assert.deepEqual(c.screen(anchor),{x:before.x+45,y:before.y-18});
  c.zoomAt(1e10,0,0);assert.equal(c.zoom,5);c.zoomAt(1e-10,0,0);assert.equal(c.zoom,.04);
});
test('hit targets follow rotated rectangle rather than unrotated box',()=>{
  const domino={id:'d',type:'domino',x:100,y:100,angle:Math.PI/2};
  assert.equal(hitTest(125,100,[domino],1),domino);
  assert.equal(hitTest(100,125,[domino],1),null);
  assert.equal(hitTest(100,115,[domino],1),domino);
  const other={id:'m',type:'marble',x:140,y:100};assert.equal(hitTest(138,100,[domino,other],1),other);
});
test('hit expansion is at least 22 CSS pixels at small scale',()=>{
  const d={id:'d',type:'domino',x:100,y:100};assert.equal(hitTest(140,100,[d],.25),d);assert.equal(hitTest(160,100,[d],.25),null);
});
test('particle pool remains bounded across repeated bursts and reuses expired items',()=>{
  const p=new ParticlePool();for(let i=0;i<1000;i++)p.emit(100,100,48,true);assert.equal(p.items.length,240);
  p.configure('low');assert.equal(p.items.length,60);for(let i=0;i<100;i++)p.update(.05);assert.equal(p.items.length,0);
  const recycled=p.free.length;p.emit(0,0,30);assert.equal(p.items.length,30);assert.equal(p.free.length,recycled-30);
  p.configure('high',true);p.emit(1,1,500);assert.equal(p.items.length,0);assert.equal(p.limit,0);
  p.emit(NaN,0);assert.equal(p.items.length,0);
});
test('renderer caps backing DPR and has no effect on board state',()=>{
  const old=globalThis.devicePixelRatio;globalThis.devicePixelRatio=3;
  try{const canvas={width:0,height:0,getContext:()=>({}),getBoundingClientRect:()=>({width:420,height:800})};const r=new Renderer(canvas);assert.equal(r.dpr,1.5);assert.equal(canvas.width,630);assert.equal(canvas.height,1200);const board={width:1000,height:620,objects:[{id:'d',type:'domino',x:100,y:100}]};const original=JSON.stringify(board);r.fit(board);const q=r.screen(board.objects[0]);assert.equal(r.hit(q.x,q.y,board).id,'d');assert.equal(JSON.stringify(board),original);}finally{globalThis.devicePixelRatio=old;}
});
test('spring hit geometry remains axis aligned when its launch direction is angled',()=>{
  const spring={id:'s',type:'spring',x:100,y:100,angle:-Math.PI/2};
  assert.equal(hitTest(126,100,[spring],1),spring);
  assert.equal(hitTest(100,126,[spring],1),null);
});
test('draw accepts every gadget and both snapshot state representations without mutating them',()=>{
  const context=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const canvas=()=>({width:800,height:600,getContext:context,getBoundingClientRect:()=>({width:800,height:600}),ownerDocument:{createElement:canvas}});
  const r=new Renderer(canvas()),types=['domino','marble','ramp','spring','gear','seesaw','switch','finish'];
  const board={width:1000,height:620,objects:types.map((type,i)=>({id:'g'+i,type,x:100+i*100,y:400,angle:i*.03,locked:i%2===0})),platforms:[{id:'p',x:500,y:550,w:980,h:20}],links:[{from:'g4',to:'g3'}],forbidden:[{x:100,y:50,w:80,h:60}],start:{id:'g0'}};
  const scene={bodies:board.objects.map(o=>({...o})),activated:['g4','g6'],gadgetStates:{g4:{rotation:2},g3:{compression:.5}}},before=JSON.stringify({board,scene});
  r.fit(board,{left:10,right:10,top:10,bottom:10});
  r.draw(board,scene,{selectedId:'g1',highlightId:'g6',ghost:{id:'ghost',type:'domino',x:300,y:300},valid:false});
  scene.activated=new Set(scene.activated);scene.gadgetStates=new Map(Object.entries(scene.gadgetStates));
  r.draw(board,scene,{reduced:true});assert.equal(r.metrics.objects,8);assert.equal(r.metrics.cacheBuilds,1);assert.ok(Number.isFinite(r.metrics.drawMs));
  scene.activated=[...scene.activated];scene.gadgetStates=Object.fromEntries(scene.gadgetStates);assert.equal(JSON.stringify({board,scene}),before);
});
