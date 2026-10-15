import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../games/pop-parade/engine.mjs';

const settle = (game, seconds = 8) => { for (let t = 0; t < seconds; t += 1 / 60) game.update(1 / 60); };
const board = () => [
  { x: 100, y: 100, color: 0 }, { x: 155, y: 100, color: 0 },
  { x: 210, y: 100, color: 0 }, { x: 155, y: 155, color: 1 },
];
const fixture = (items = board()) => {
  const game = new Game({ width: 600, height: 400, seed: 12 });
  game.setBoard(items, 24, 75);
  return game;
};

test('generated boards are deterministic, bounded, and offer a chain immediately', () => {
  const a = new Game({ width: 1000, height: 500, seed: 12 });
  const b = new Game({ width: 1000, height: 500, seed: 12 });
  assert.deepEqual(a.balloons, b.balloons);
  assert.ok(a.balloons.length >= 30 && a.balloons.length <= 80);
  for (const p of a.balloons) assert.ok(p.x >= p.r && p.x <= a.width - p.r && p.y >= p.r && p.y <= a.height - p.r);
  a.tap(a.balloons[0].x, a.balloons[0].y); settle(a);
  assert.ok(a.bestChain >= 5);
});
test('a real tap propagates through same colors, leaves other colors, and counts once', () => {
  const g = fixture();
  assert.equal(g.tap(5, 5), false);
  assert.equal(g.taps, 3);
  assert.equal(g.tap(100, 100), true);
  assert.equal(g.tap(100, 100), false);
  settle(g);
  assert.equal(g.taps, 2);
  assert.equal(g.totalPopped, 3);
  assert.equal(g.bestChain, 3);
  assert.equal(g.balloons.filter(b => b.state === 'alive').length, 1);
  assert.ok(g.score > 0);
  const score = g.score; settle(g); assert.equal(g.score, score);
});
test('a wave cannot reach outside its maximum radius', () => {
  const g = fixture([{x:100,y:100,color:0},{x:220,y:100,color:0}]);
  g.tap(100,100); settle(g); assert.equal(g.totalPopped,1);
});

test('Classic waits for the third chain and all shockwaves before ending', () => {
  const g = fixture([{x:80,y:100,color:0},{x:220,y:100,color:1},{x:360,y:100,color:2}]);
  g.tap(80,100); g.tap(220,100); g.tap(360,100);
  assert.equal(g.ended,false); assert.equal(g.taps,0);
  g.update(.05); assert.equal(g.ended,false);
  settle(g); assert.equal(g.ended,true); assert.equal(g.totalPopped,3);
});
test('pause freezes the simulation, and restart resets the round', () => {
  const g = fixture(); g.tap(100,100); g.paused = true;
  const before = JSON.stringify(g.balloons); settle(g);
  assert.equal(JSON.stringify(g.balloons),before); assert.equal(g.score,0);
  g.paused = false; settle(g); assert.ok(g.score>0);
  g.reset(); assert.equal(g.score,0); assert.equal(g.taps,3); assert.equal(g.waves.length,0); assert.equal(g.ended,false);
});
test('lightning reaches farther but still obeys color, freeze holds nearby motion', () => {
  const g = fixture([{x:100,y:100,color:0,special:'lightning'},{x:220,y:100,color:0},{x:220,y:150,color:1}]);
  g.tap(100,100); settle(g); assert.equal(g.totalPopped,2);
  const f = fixture([{x:100,y:100,color:0,special:'freeze'},{x:155,y:150,color:1}]);
  f.tap(100,100); settle(f,.3);
  const p = f.balloons[1], pos = [p.x,p.y]; settle(f,1);
  assert.deepEqual([p.x,p.y],pos); settle(f,3); assert.notDeepEqual([p.x,p.y],pos);
});
test('rainbow connects both incoming and outgoing colors', () => {
  const g = fixture([{x:100,y:100,color:0},{x:165,y:100,color:1,special:'rainbow'},{x:230,y:100,color:2}]);
  g.tap(100,100); settle(g); assert.equal(g.totalPopped,3);
});
test('Zen replenishes and permits repeated play without ending', () => {
  const g = new Game({width:600,height:500,seed:30,mode:'zen'});
  for (let i=0;i<12;i++) {
    const p = g.balloons.find(b=>b.state==='alive'); assert.ok(p);
    assert.equal(g.tap(p.x,p.y),true); settle(g);
    assert.equal(g.ended,false); assert.ok(g.balloons.length<=80);
  }
  assert.ok(g.totalPopped>30);
});
test('overlapping waves reserve each balloon only once, with milestone and clear events', () => {
  const events=[];
  const g=new Game({onEvent:e=>events.push(e)});
  g.setBoard(Array.from({length:6},(_,i)=>({x:100+(i%3)*40,y:100+Math.floor(i/3)*40,color:0})),20,80);
  g.tap(100,100); settle(g);
  assert.equal(g.totalPopped,6); assert.equal(events.filter(e=>e.type==='pop').length,6);
  assert.equal(events.filter(e=>e.type==='milestone').length,1);
  assert.equal(events.filter(e=>e.type==='clear').length,1);
});

test('large displays stay under the balloon cap', () => {
  const g=new Game({width:1500,height:800});assert.ok(g.balloons.length<=80);
});
test('repeated viewport rotations do not inflate shockwave reach', () => {
  const g=new Game({width:1100,height:500});const range=g.range;
  for(let i=0;i<4;i++){g.resize(360,550);g.resize(1100,500);}
  assert.ok(Math.abs(g.range-range)<.001);
});
test('resizing a full desktop board reflows balloons into tappable mobile spacing',()=>{
  const g=new Game({width:1200,height:550,seed:12});g.resize(360,608);
  for(let i=0;i<g.balloons.length;i++)for(let j=i+1;j<g.balloons.length;j++){
    const a=g.balloons[i],b=g.balloons[j];
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=36);
  }
});

test('seeded boards vary connected cluster shapes while retaining rewarding opening chains',()=>{
  const signatures=new Set();
  for(let seed=1;seed<=36;seed++){
    const g=new Game({width:1000,height:500,seed});
    const palette=new Map();
    signatures.add(g.balloons.map(b=>{if(!palette.has(b.color))palette.set(b.color,palette.size);return palette.get(b.color);}).join(''));
    g.tap(g.balloons[0].x,g.balloons[0].y);settle(g);
    assert.ok(g.bestChain>=5,`seed ${seed} has an opening chain`);
  }
  assert.ok(signatures.size>=12,`only ${signatures.size} distinct arrangements`);
});

test('chain events expose their own identity, score, centroid, and completion exactly once',()=>{
  const events=[];const g=new Game({onEvent:e=>events.push(e)});
  g.setBoard(Array.from({length:6},(_,i)=>({x:100+i*45,y:100,color:0})),20,65);
  g.tap(100,100);settle(g);
  const start=events.find(e=>e.type==='chainStart');assert.ok(start);
  const finish=events.filter(e=>e.type==='chainEnd');assert.equal(finish.length,1);
  assert.equal(finish[0].chainId,start.chainId);assert.equal(finish[0].count,6);
  assert.equal(finish[0].score,975);assert.ok(finish[0].x>100&&finish[0].x<325);
  assert.equal(events.find(e=>e.type==='milestone').chainId,start.chainId);
  assert.equal(events.filter(e=>e.type==='pop').at(-1).chain.score,975);
});
