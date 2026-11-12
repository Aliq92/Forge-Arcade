import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';
import {LEVELS,createSandbox} from '../levels.js';
import {nextHint} from '../hints.js';
import {decodeProgress,freshProgress,recordWin} from '../storage.js';

test('hint-only play completes every district safely for three stars without mutating state',()=>{
 for(const level of LEVELS){const g=new Game(level);let steps=0;while(!g.ready&&steps++<100){const before=JSON.stringify(g),h=nextHint(g);assert.equal(JSON.stringify(g),before,'asking never changes game');assert.deepEqual(nextHint(g),h,'repeated request stays on the same step');assert.ok(h.action,`${level.title}: ${h.message}`);assert.equal(g.act(h.action).ok,true,`${level.title}: ${h.message}`);assert.deepEqual(g.allocation.warnings,[]);}assert.equal(g.ready,true,level.title);assert.equal(g.stars,3);assert.equal(nextHint(g).kind,'complete');}
});
test('connection hint names both exact ports and skips already completed or undone connections',()=>{
 const g=new Game(LEVELS[0]),h=nextHint(g);assert.equal(h.kind,'cable');assert.ok(h.from&&h.to);for(const id of [h.from,h.to])assert.ok(h.message.includes(g.board.nodes.find(n=>n.id===id).name));g.act(h.action);assert.notDeepEqual(nextHint(g).action,h.action);g.undo();assert.deepEqual(nextHint(g),h);
});
test('hint repairs an isolated reference cable and depleted reserve never promises a successful hold',()=>{
 const g=new Game(LEVELS[0]),h=nextHint(g);g.act(h.action);const e=g.board.edges[0];g.act({type:'toggle-edge',id:e.id});assert.equal(nextHint(g).action.type,'toggle-edge');
 const battery=new Game(LEVELS[4]);for(const a of battery.board.solution)if(a.type!=='wait')battery.act(a);battery.board.nodes.find(n=>n.type==='battery').energy=1;battery.recalculate();const advice=nextHint(battery);assert.equal(advice.kind,'reset');assert.match(advice.message,/reserve|energy/i);
});
test('completed alternative does not force authored connections; sandbox hints are legal and bounded',()=>{
 const g=new Game(LEVELS[0]);for(const a of g.board.solution)g.act(a);assert.equal(nextHint(g).kind,'complete');const sandbox=new Game(createSandbox(),'sandbox'),h=nextHint(sandbox);assert.equal(h.kind,'cable');assert.equal(sandbox.act(h.action).ok,true);const empty=createSandbox();empty.nodes=[];assert.equal(nextHint(new Game(empty,'sandbox')).kind,'info');
});
test('hint recovers from an optional overload route without recommending duplicate or illegal cables',()=>{
 const g=new Game(LEVELS[1]);g.act({type:'cable',from:'river-generator',to:'riverside-shop'});let steps=0,sawRemoval=false;
 while(!g.ready&&steps++<30){const h=nextHint(g);assert.ok(h.action,h.message);if(h.action.type==='remove-edge')sawRemoval=true;assert.equal(g.act(h.action).ok,true);}
 assert.equal(g.ready,true);assert.equal(sawRemoval,true);assert.equal(g.board.edges.some(e=>e.to==='riverside-shop'),false);
});
test('legacy eight-district save preserves stars, achievements, preferences and sandbox; opens district nine',()=>{
 const old={version:1,unlocked:8,bestStars:[3,2,1,3,2,3,3,3],completedObjectives:{8:['powered','stable']},settings:{sound:true,volume:.2,reducedMotion:true},sandbox:createSandbox()};const p=decodeProgress(JSON.stringify(old));assert.equal(p.bestStars.length,13);assert.deepEqual(p.bestStars.slice(0,8),old.bestStars);assert.deepEqual(p.bestStars.slice(8),[0,0,0,0,0]);assert.equal(p.unlocked,9);assert.deepEqual(p.completedObjectives[8],old.completedObjectives[8]);assert.equal(p.settings.volume,.2);assert.equal(p.sandbox.nodes.length,3);
 const fresh=freshProgress();for(let id=1;id<=13;id++)assert.equal(recordWin(fresh,{levelId:id,stars:3,objectives:['powered']}),true);assert.equal(fresh.unlocked,13);assert.equal(recordWin(fresh,{levelId:14,stars:3}),false);
});
