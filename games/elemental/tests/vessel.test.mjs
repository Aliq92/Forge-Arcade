import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalog} from '../src/discovery/catalog.mjs';
import {simulate} from '../src/reaction/chemistry.mjs';
import {VesselView} from '../src/reaction/vessel.mjs';

const load=file=>JSON.parse(fs.readFileSync(new URL('../src/data/'+file,import.meta.url)));
const catalog=createCatalog(load('elements.json'),load('isotopes.json'),load('molecules.json'));
const config=(pairs,extra={})=>({reagents:pairs.map(([formId,quantity])=>({formId,quantity})),temperature:25,vessel:'beaker',activation:false,solventFraction:1,...extra});

// Capture material drawing at the Canvas boundary; chemistry and VesselView are real.
function render(preparation,result=null){
 const scene={solids:[],gases:[],liquids:[]},stack=[];
 let translated=false,arcs=[];
 const context={
  setTransform(){},clearRect(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},clip(){},rotate(){},fill(){},fillText(){},
  beginPath(){arcs=[];},
  save(){stack.push({translated,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle});},
  restore(){const saved=stack.pop();translated=saved.translated;this.fillStyle=saved.fillStyle;this.strokeStyle=saved.strokeStyle;},
  translate(){translated=true;},
  fillRect(x,y,width,height){if(translated)scene.solids.push({width,height});},
  arc(x,y,radius){arcs.push({x,y,radius});},
  stroke(){scene.gases.push(...arcs);},
  createLinearGradient(){const stops=[];scene.liquids.push(stops);return {addColorStop(offset,color){stops.push({offset,color});}};}
 };
 const globals={ResizeObserver:class {observe(){} disconnect(){}},devicePixelRatio:1,matchMedia:()=>({matches:true})};
 const previous=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 try{
  for(const [key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true});
  const canvas={getBoundingClientRect:()=>({width:400,height:360}),getContext:()=>context};
  const view=new VesselView(canvas,catalog);
  view.update(preparation,result);
  return scene;
 }finally{
  for(const [key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
 }
}

test('unsupported salt and ethanol retain prepared solid without implying dissolution or new liquid colour',()=>{
 const preparation=config([['salt',5],['ethanol',20]]),result=simulate(preparation,catalog);
 assert.equal(result.supported,false);
 assert.deepEqual(result.final,result.initial);
 const before=render(preparation),after=render(preparation,result);
 assert.ok(before.solids.length>0,'prepared salt is visible');
 assert.ok(after.solids.length>0,'unchanged salt remains visible after unsupported trial');
 assert.equal(after.gases.length,0,'no gas is fabricated');
 assert.deepEqual(after.liquids,before.liquids,'unsupported outcome does not add a reaction colour change');
});

test('prepared gas is visible both before and after unsupported gas trials',()=>{
 for(const pairs of [[['hydrogen',2]],[['hydrogen',2],['oxygen',1]]]){
  const preparation=config(pairs),result=simulate(preparation,catalog);
  assert.equal(result.supported,false);
  assert.deepEqual(result.final,result.initial);
  for(const [stage,scene]of [['prepared',render(preparation)],['unsupported',render(preparation,result)]]){
   assert.ok(scene.gases.length>0,`${stage} gas is visible`);
   assert.equal(scene.solids.length,0,'gas preparation does not fabricate precipitate');
   assert.equal(scene.liquids.length,0,'gas preparation does not fabricate liquid');
  }
 }
});

test('supported dissolution removes fully consumed solid while retaining undissolved excess',()=>{
 for(const [water,expectSolid]of [[50,false],[.1,true]]){
  const preparation=config([['water',water],['salt',5]]),result=simulate(preparation,catalog);
  assert.equal(result.supported,true);
  assert.equal(result.process,'dissolution');
  assert.ok(render(preparation).solids.length>0);
  const after=render(preparation,result);
  assert.equal(after.solids.length>0,expectSolid);
  assert.ok(after.liquids.length>0);
 }
});

test('supported ice and vapor endpoints render their final phase without starting liquid',()=>{
 for(const [temperature,solid,gas]of [[-10,true,false],[110,false,true]]){
  const preparation=config([['water',10]],{temperature}),result=simulate(preparation,catalog);
  assert.equal(result.supported,true);
  assert.equal(result.measurements.volumeMl,0);
  const after=render(preparation,result);
  assert.equal(after.solids.length>0,solid);
  assert.equal(after.gases.length>0,gas);
  assert.equal(after.liquids.length,0);
 }
});
