import test from 'node:test';import assert from 'node:assert/strict';
import {SceneCanvas} from '../src/ui/scene.mjs';import {createModel} from '../src/physics/registry.mjs';
globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.devicePixelRatio=1;
const context=new Proxy({},{get:()=>()=>{}});
const canvas=()=>({width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({width:600,height:350})});
test('mixed-unit quantum profile fits both independent scientific axes',()=>{const view=new SceneCanvas(canvas()),scene=createModel('particle-box').scene();view.draw(scene);const curve=scene.curves[0].points,screen=curve.map(p=>view.screen(p)),xs=screen.map(p=>p.x),ys=screen.map(p=>p.y);assert.ok(Math.max(...xs)-Math.min(...xs)>400,'position should fill horizontal axis');assert.ok(Math.max(...ys)-Math.min(...ys)>150,'density should fill vertical axis');view.destroy();});
test('spatial scenes preserve equal world scales in both directions',()=>{const view=new SceneCanvas(canvas());view.draw({bounds:{x:-2,y:-2,w:4,h:4},unit:'m'});const o=view.screen({x:0,y:0}),x=view.screen({x:1,y:0}),y=view.screen({x:0,y:1});assert.equal(x.x-o.x,o.y-y.y);view.destroy();});
