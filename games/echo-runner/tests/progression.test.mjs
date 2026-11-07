import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,tick} from './harness.mjs';
import {InputTracker} from '../js/player.js';

test('v1 final-room saves retain scores and unlock the new chapter sequentially',()=>{
 const completed={1:{bestTimeSec:4,bestEchoes:0},14:{bestTimeSec:24,bestEchoes:3}};
 const {game:g,memory}=makeGame(15,{'echoRunner.progress.v1':JSON.stringify({unlockedLevel:14,completed})});
 assert.deepEqual(g.progress.completed,completed);assert.equal(g.progress.unlockedLevel,15);
 assert.equal(g.isLevelUnlocked(16),false);g._completeRoom();assert.equal(g.progress.unlockedLevel,16);
 assert.deepEqual(JSON.parse(memory.get('echoRunner.progress.v1')).completed[14],completed[14]);
});

test('restart clears only the current room attempt and recordings, retaining progress and settings',()=>{
 const {game:g}=makeGame(15);g.progress.completed[3]={bestTimeSec:8,bestEchoes:1};g.settings.muted=true;
 g.toggleRecording();for(let i=0;i<20;i++)tick(g,{right:true});g.toggleRecording();
 for(let i=0;i<11;i++)g.update(.05);assert.equal(g.echoes.length,1);
 g.restartRoom();assert.equal(g.levelDef.id,15);assert.equal(g.echoes.length,0);assert.equal(g.attemptTick,0);
 assert.equal(g.player.x,g.levelDef.spawn.x);assert.equal(g.settings.muted,true);assert.equal(g.progress.completed[3].bestTimeSec,8);
});

test('pause freezes recording, room timers and world state and clears held inputs on resume',()=>{
 const {game:g}=makeGame(18);g.toggleRecording();for(let i=0;i<20;i++)tick(g,{right:true});
 g.input.keys.add('ArrowRight');g.input.pendingJump=true;g.pause();
 const before=JSON.stringify({player:g.player,runtime:g.roomRuntime,tick:g.attemptTick,elapsed:g.roomElapsedTicks,buffer:g.recorder.buffer});
 for(let i=0;i<120;i++)g.update(1/60);
 assert.equal(JSON.stringify({player:g.player,runtime:g.roomRuntime,tick:g.attemptTick,elapsed:g.roomElapsedTicks,buffer:g.recorder.buffer}),before);
 g.resume();assert.equal(g.input.keys.size,0);assert.equal(g.input.pendingJump,false);assert.equal(g.recorder.isRecording,true);
});

test('recording expiry discards the failed take and preserves previous echoes',()=>{
 const {game:g}=makeGame(17);g.toggleRecording();tick(g);g.toggleRecording();for(let i=0;i<11;i++)g.update(.05);
 const original=g.recorder.echoes[0];g.toggleRecording();g.recorder.maxTicks=3;
 for(let i=0;i<3;i++)tick(g);assert.equal(g.recorder.isRecording,false);
 assert.equal(g.recorder.echoes.length,1);assert.equal(g.recorder.echoes[0],original);assert.equal(g.attemptTick,0);
 assert.equal(g.toast.text,'RECORDING EXPIRED');
});

test('quick keyboard taps between ticks produce exactly one jump and record action',()=>{
 const input=new InputTracker();const listeners={};input.bind({addEventListener:(key,fn)=>listeners[key]=fn});
 const event=code=>({code,key:code,repeat:false,preventDefault(){}});
 listeners.keydown(event('Space'));listeners.keyup(event('Space'));
 assert.equal(input.sampleTick().jumpPressed,true);assert.equal(input.sampleTick().jumpPressed,false);
 listeners.keydown(event('KeyR'));listeners.keyup(event('KeyR'));
 const edges=new Set();assert.equal(input.wasJustPressed('KeyR',edges),true);assert.equal(input.wasJustPressed('KeyR',edges),false);
});

test('echo replay matches recorded positions at 30, 60 and 144 rendering FPS',()=>{
 for(const fps of [30,60,144]){
  const {game:g}=makeGame(3);g.toggleRecording();const path=[];const originalTick=g._tick.bind(g);
  g._tick=()=>{originalTick();path.push({x:g.player.x,y:g.player.y});};
  g.input.sampleTick=()=>({left:false,right:g.attemptTick<35,jumpPressed:g.attemptTick===12,jumpHeld:g.attemptTick>=12&&g.attemptTick<32,interactPressed:false});
  for(let i=0;i<fps;i++)g.update(1/fps);assert.equal(path.length,60);
  g.toggleRecording();for(let i=0;i<11;i++)g.update(.05);
  let index=0,error=0;g.input.sampleTick=()=>({left:false,right:false,jumpPressed:false,jumpHeld:false,interactPressed:false});
  g._tick=()=>{originalTick();const p=path[index++];error=Math.max(error,Math.hypot(g.echoes[0].x-p.x,g.echoes[0].y-p.y));};
  for(let i=0;i<fps;i++)g.update(1/fps);
  assert.equal(index,60);assert.ok(error<1e-7,`${fps} FPS replay error ${error}`);
 }
});

test('rejected record commands still advance echo playback and the environment clock exactly once',()=>{
 const run=withRejectedCommand=>{
  const {game:g}=makeGame(15);g.toggleRecording();for(let i=0;i<30;i++)tick(g,{right:true});g.toggleRecording();
  for(let i=0;i<11;i++)g.update(.05);
  for(let i=0;i<15;i++){if(withRejectedCommand)g.input.pressed.add('KeyR');tick(g);}
  return {tick:g.attemptTick,x:g.echoes[0].x,y:g.echoes[0].y};
 };
 assert.deepEqual(run(true),run(false));
});
