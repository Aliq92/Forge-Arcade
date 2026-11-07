import test from 'node:test';import assert from 'node:assert/strict';import {makeGame} from './harness.mjs';import {solveRoom} from './solutions.mjs';
for(let id=1;id<=19;id++)test('room '+id+' completes through real input, recording and replay',()=>{
 const {game:g}=makeGame(id);const result=solveRoom(g,id);assert.equal(g.state,'roomComplete');assert.equal(g.progress.unlockedLevel,Math.min(id+1,19));
 console.log('SOLUTION '+JSON.stringify({...result,trace:undefined}));
});
test('new-room solutions tolerate deliberate delays after echo materialization',()=>{
 for(const id of [15,16,17,18,19])for(const hesitation of [6,12,18,24]){
  const {game:g}=makeGame(id);solveRoom(g,id,{hesitation});assert.equal(g.state,'roomComplete');
 }
});
