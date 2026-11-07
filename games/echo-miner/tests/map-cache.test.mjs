import test from 'node:test';import assert from 'node:assert/strict';
import {createMapRenderer,renderMap} from '../src/map.mjs';import {createRun} from '../src/state.mjs';import {discoverArea} from '../src/exploration.mjs';
test('map terrain paints only new discoveries and resets its cache for a new expedition',()=>{
 const ctx=new Proxy({}, {get:()=>()=>{}}),canvas=()=>({width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:160,height:132})});
 globalThis.document={createElement:canvas};globalThis.window={devicePixelRatio:1};
 const renderer=createMapRenderer(canvas()),r=createRun({difficulty:'survey',seed:12});
 renderMap(renderer,r);assert.equal(renderer.geometryUpdates,1);const initial=renderer.painted;
 for(let i=0;i<20;i++)renderMap(renderer,r);assert.equal(renderer.geometryUpdates,1);
 discoverArea(r.exploration,r.cave,r.player,256);renderMap(renderer,r);assert.equal(renderer.geometryUpdates,2);assert.ok(renderer.painted>initial);
 const fresh=createRun({difficulty:'survey',seed:12});renderMap(renderer,fresh);assert.equal(renderer.geometryUpdates,3);assert.equal(renderer.painted,initial);assert.equal(renderer.exploration,fresh.exploration);
});
