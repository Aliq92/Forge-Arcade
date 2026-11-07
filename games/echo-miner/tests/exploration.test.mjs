import test from 'node:test';
import assert from 'node:assert/strict';
import {createExploration,discoverArea,rememberDiscoveries,createScanner,scan,projectMapPoint,mapBounds,mapViewport} from '../src/exploration.mjs';
import {createRun,updateRun} from '../src/state.mjs';
import {createPulse} from '../src/sonar.mjs';
const cave={width:32,height:10,tiles:new Uint8Array(320).fill(1),lift:{x:1,y:4},hunterSpawn:{x:30,y:8},crystals:[{x:6,y:4},{x:22,y:4}]};
const position={x:48,y:144};
test('discovery starts local, never reveals the whole cave, and is permanent',()=>{
 const e=createExploration(cave,position);assert.ok(e.indices.length>0&&e.indices.length<50);
 assert.equal(e.seen[4*32+22],0);const n=e.indices.length;discoverArea(e,cave,position,256);
 assert.ok(e.indices.length>n);const revision=e.revision;discoverArea(e,cave,position,32);
 assert.equal(e.revision,revision);assert.equal(e.seen[4*32+6],1);
});
test('sonar geometry and visited passages remain recorded after its transient reveal fades',()=>{
 const r=createRun({difficulty:'survey',seed:1,cave});const pulse={...createPulse(position,0),radius:256};
 r.pulses=[pulse];rememberDiscoveries(r);const n=r.exploration.indices.length;
 r.pulses=[];r.elapsed=30;r.revealMap.clear();rememberDiscoveries(r);assert.equal(r.exploration.indices.length,n);
 assert.equal(r.exploration.crystals.has('crystal-0'),true);assert.equal(r.exploration.crystals.has('crystal-1'),false);
});
test('scanner detects crystals only within 400 units, keeps fog, and recharges after 15 seconds',()=>{
 const e=createExploration(cave,position),crystals=[{id:'edge',x:14,y:4},{id:'outside',x:15,y:4}];
 // Tile centers are 416 and 448 units away respectively from x=48; move to exact boundary origin x=64.
 const p={x:64,y:144},s=scan(cave,p,crystals,e,createScanner(),10);
 assert.deepEqual(s.crystals.map(c=>c.id),['edge']);assert.equal(s.cooldownUntil,25);assert.equal(s.highlightUntil,15);
 assert.equal(e.seen[4*32+14],0);assert.equal(e.crystals.has('edge'),true);
 assert.equal(scan(cave,p,crystals,e,s,24.99),s);assert.equal(scan(cave,p,crystals,e,s,25).serial,2);
});
test('scanner identifies real uncharted narrow passages without carving or revealing them',()=>{
 const tiles=new Uint8Array(200);for(let x=1;x<19;x++)tiles[5*20+x]=1;
 const c={...cave,width:20,height:10,tiles},e=createExploration(c,{x:48,y:176});
 const before=tiles.slice(),s=scan(c,{x:48,y:176},[],e,createScanner(),0);
 assert.ok(s.passages.length>0&&s.passages.length<=6);for(const p of s.passages){assert.equal(tiles[p.y*20+p.x],1);assert.equal(e.seen[p.y*20+p.x],0);}
 assert.deepEqual(tiles,before);
});
test('minimap projects world player position with aspect ratio and map boundaries',()=>{
 const b=mapBounds(cave,320,160,10);const p=projectMapPoint(cave,{x:16*32,y:5*32},b);
 assert.equal(p.x,160);assert.equal(p.y,80);const edge=projectMapPoint(cave,{x:0,y:0},b);assert.equal(edge.x,b.x);assert.equal(edge.y,b.y);
});
test('scanner is distinct from sonar and creates no Hunter sound event',()=>{
 let r=createRun({difficulty:'survey',seed:1,cave});r=updateRun(r,{scanPressed:true},1/60);
 assert.equal(r.scanner.serial,1);assert.equal(r.pulses.length,0);assert.equal(r.soundEvents.length,0);
 r=updateRun(r,{sonarPressed:true},1/60);assert.ok(r.pulses.length>0);assert.ok(r.soundEvents.some(e=>e.kind==='sonar'));
});
test('compact map fits known terrain, player, lift and discovered crystals without revealing distant cave',()=>{
 const c={...cave,width:120,height:120,tiles:new Uint8Array(14400).fill(1)},r=createRun({difficulty:'survey',seed:1,cave:c});
 const view=mapViewport(r,false);assert.ok(view.width>=24&&view.width<120);assert.ok(view.height>=24&&view.height<120);
 r.exploration.crystals.add('crystal-1');const wider=mapViewport(r,false);assert.ok(wider.x<=22&&wider.x+wider.width>22);
 assert.deepEqual(mapViewport(r,true),{x:0,y:0,width:120,height:120});
 r.tremor={...r.tremor,phase:'warning',tiles:[{x:40,y:40}]};const warningView=mapViewport(r,false);
 assert.ok(warningView.x+warningView.width>40&&warningView.y+warningView.height>40,'all warning markers must fit the compact view');
});
