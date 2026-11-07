import test from 'node:test';import assert from 'node:assert/strict';import {InputManager} from '../js/input.js';
function harness(){const listeners={},keys={};globalThis.window={innerWidth:390,innerHeight:844,addEventListener:(k,f)=>keys[k]=f};
 const i=new InputManager({addEventListener:(k,f)=>listeners[k]=f,setPointerCapture(){}});return {i,listeners,keys};}
test('cancelled or unrelated touch never fires a correction; reset clears queued/stale input',()=>{
 const h=harness();h.listeners.pointerdown({pointerId:1,clientX:0,clientY:0});
 h.listeners.pointerup({pointerId:2,clientX:100,clientY:100});assert.equal(h.i.dragging,true);
 h.listeners.pointercancel({pointerId:1,clientX:100,clientY:100});assert.deepEqual(h.i.pollEvents(),[]);
 h.i.lastAimVector={dx:90,dy:0};h.i.events.push({type:'emergency'});h.i.reset();assert.equal(h.i.lastAimVector,null);assert.deepEqual(h.i.pollEvents(),[]);
});
test('keyboard provides all four directions and brake without scrolling',()=>{
 const h=harness();let prevented=0;
 for(const code of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyS'])h.keys.keydown({code,preventDefault(){prevented++;}});
 assert.deepEqual(h.i.keys,{left:true,right:true,up:true,down:true,brake:true});assert.equal(prevented,5);
 h.keys.blur();assert.ok(Object.values(h.i.keys).every(v=>!v));
});
