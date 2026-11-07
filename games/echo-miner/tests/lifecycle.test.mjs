import test from 'node:test';import assert from 'node:assert/strict';
import {createGameState,transition,createRun,updateRun} from '../src/state.mjs';
import {createInputManager} from '../src/input.mjs';
import {createMemoryStorage,saveSettings,recordResult,loadRecords} from '../src/storage.mjs';
import {createHunter,updateHunter} from '../src/hunter.mjs';import {DIFFICULTIES} from '../src/config.mjs';import {findPath} from '../src/pathfinding.mjs';import {createSoundEvent} from '../src/sound-events.mjs';
test('expanded map safely suspends and returns to both expedition and tutorial screens',()=>{
 for(const screen of ['playing','tutorial']){
  const s={...createGameState(),screen};const open=transition(s,{type:'OPEN_MAP'});assert.equal(open.screen,'map');
  assert.equal(transition(open,{type:'CLOSE_MAP'}).screen,screen);
 }
});
test('pause and restart retain seed and difficulty while starting a clean expedition',()=>{
 const s={...createGameState(),screen:'playing',seed:12,difficulty:'abyss'},paused=transition(s,{type:'PAUSE'});
 const restart=transition(paused,{type:'RESTART',seed:s.seed});assert.equal(restart.screen,'playing');assert.equal(restart.seed,12);assert.equal(restart.difficulty,'abyss');
 const a=createRun({seed:12,difficulty:'abyss'});a.exploration.seen.fill(1);a.scanner.serial=9;
 const b=createRun({seed:12,difficulty:'abyss'});assert.equal(b.scanner.serial,0);assert.ok(b.exploration.indices.length<30);assert.equal(b.elapsed,0);
});
test('scanner key and touch actions are one-shot and released inputs never stick',()=>{
 const listeners=new Map(),target={addEventListener:(name,fn)=>{const v=listeners.get(name)||[];v.push(fn);listeners.set(name,v);},removeEventListener(){}};
 const button={...target,classList:{add(){},remove(){}}};const input=createInputManager(target,{scanButton:button});
 for(const fn of listeners.get('keydown'))fn({code:'KeyC',repeat:false,preventDefault(){}});
 assert.equal(input.getInput().scanPressed,true);assert.equal(input.getInput().scanPressed,false);
 input.reset();assert.equal(input.getInput().moveX,0);input.destroy();
});
test('v1 records and best results survive new settings and expedition restarts',()=>{
 const storage=createMemoryStorage();recordResult({difficulty:'survey',timeSeconds:99,crystals:8},storage);saveSettings({sound:false,reducedMotion:true},storage);
 createRun({difficulty:'survey',seed:3});const r=loadRecords(storage);assert.equal(r.byDifficulty.survey.bestTimeSeconds,99);assert.equal(r.settings.sound,false);assert.equal(r.settings.reducedMotion,true);
});
test('the original Hunter still investigates sonar and hunts on strong awareness',()=>{
 const cave={width:30,height:10,tiles:new Uint8Array(300).fill(1)},player={x:160,y:160},hunter=createHunter({x:240,y:160});
 const context={cave,player,soundEvents:[createSoundEvent(player,1,0,'sonar')],now:0,difficulty:DIFFICULTIES.descent,findPath};
 let h=updateHunter(hunter,context,1/60);assert.notEqual(h.state,'dormant');
 h=updateHunter({...h,awareness:1,state:'suspicious'},context,1/60);assert.equal(h.state,'hunting');assert.ok(h.x<240);
});
test('normal movement collects the crystal quota and completes extraction at the lift',()=>{
 const width=32,height=20,tiles=new Uint8Array(width*height);for(let y=1;y<19;y++)for(let x=1;x<31;x++)tiles[y*width+x]=1;
 const cave={width,height,tiles,lift:{x:2,y:10},crystals:[{x:7,y:10},{x:10,y:10}],hunterSpawn:{x:29,y:2}};
 let r=createRun({difficulty:'survey',seed:1,cave});let ticks=0;
 while(r.player.crystals<2&&ticks++<400)r=updateRun(r,{moveX:1,scanPressed:ticks===1},1/60);
 assert.equal(r.player.crystals,2);assert.equal(r.liftActive,true);
 while(!r.outcome&&ticks++<800)r=updateRun(r,{moveX:-1},1/60);
 assert.equal(r.outcome,'victory');assert.equal(r.result.crystals,2);
});
