import test from 'node:test';import assert from 'node:assert/strict';
import {makeGame,tick,neutral} from './harness.mjs';
import {LEVELS} from '../js/levels.js';import {createHash} from 'node:crypto';
import {createRoomRuntime,evaluateTriggers,movingPlatformRectAt} from '../js/objects.js';
import {makeEntityPhysicsState,stepEntity,DT} from '../js/physics.js';
test('all original 14 level definitions remain unchanged',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(LEVELS.slice(0,14))).digest('hex'),'afc2a8136f968ed7c615dfe03423f517a7926f831c15b7eaf7e9f87632545fd9');
});
test('recording always starts at identical spawn state and tick zero, including after movement',()=>{
 const {game:g}=makeGame(3);for(let i=0;i<25;i++)tick(g,{right:true});assert.ok(g.player.x>100);
 g.toggleRecording();assert.equal(g.attemptTick,0);assert.equal(g.player.x,g.levelDef.spawn.x);assert.equal(g.player.vx,0);assert.equal(g.recorder.isRecording,true);
});
test('recorded positions exactly match replay from the same room origin',()=>{
 const {game:g}=makeGame(3);g.toggleRecording();const path=[];
 for(let i=0;i<100;i++){tick(g,{right:i<35,jumpPressed:i===12,jumpHeld:i>=12&&i<32});path.push({x:g.player.x,y:g.player.y});}
 g.toggleRecording();for(let i=0;i<11;i++)g.update(.05);assert.equal(g.echoes.length,1);
 let error=0;for(const p of path){tick(g);error=Math.max(error,Math.hypot(g.echoes[0].x-p.x,g.echoes[0].y-p.y));}
 assert.ok(error<1e-7,`echo replay error ${error}`);console.log('ECHO REPLAY ERROR '+error+' world units');
});
test('timed door expires while its triggering toggle remains on',()=>{
 const def=LEVELS[4],rt=createRoomRuntime(def);rt.switches.s1.on=true;
 evaluateTriggers(def,rt,[],new Map(),0,[]);assert.equal(rt.doors.d1.open,true);
 evaluateTriggers(def,rt,[],new Map(),301,[]);assert.equal(rt.doors.d1.open,false);
});
test('hazard contact cannot also complete a level',()=>{
 const {game:g}=makeGame(1);g.levelDef={...g.levelDef,exit:{x:60,y:430,w:50,h:60},hazards:[{x:60,y:430,w:50,h:60}]};
 tick(g);assert.equal(g.state,'playing');assert.equal(g.attemptCount,2);assert.equal(g.progress.completed[1],undefined);
});
test('blocked storage never prevents saving settings or completing gameplay',()=>{
 const {game:g}=makeGame();globalThis.localStorage.setItem=()=>{throw Error('blocked');};
 assert.doesNotThrow(()=>g.saveSettings());assert.doesNotThrow(()=>g._completeRoom());assert.equal(g.state,'roomComplete');
});
test('coyote time, jump buffering and platform position stay deterministic',()=>{
 const p=makeEntityPhysicsState(50,446);p.grounded=true;stepEntity(p,neutral(),[]);stepEntity(p,{...neutral(),jumpPressed:true,jumpHeld:true},[]);assert.ok(p.vy<0);
 const mp=LEVELS[5].movingPlatforms[0];assert.deepEqual(movingPlatformRectAt(mp,0),movingPlatformRectAt(mp,0));
 assert.equal(movingPlatformRectAt(mp,0).x,310);assert.ok(movingPlatformRectAt(mp,180).x>310);
});
test('physics and echo clocks agree at 30, 60 and 144 rendered frames per second',()=>{
 const states=[];for(const fps of [30,60,144]){const {game:g}=makeGame(3);g.input.keys.add('ArrowRight');for(let i=0;i<fps;i++)g.update(1/fps);states.push([g.player.x,g.player.y,g.attemptTick]);}
 for(const p of states.slice(1))p.forEach((v,i)=>assert.ok(Math.abs(v-states[0][i])<1e-7,JSON.stringify(states)));
});
