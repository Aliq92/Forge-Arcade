import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, validateLevels, createSandbox } from '../levels.js';
import { Simulation, validateBoard, placementError } from '../gadgets.js';
import { Editor } from '../editor.js';
import { Game } from '../game.js';

export function solvedBoard(level){const e=new Editor(level);for(const a of level.solution){const r=e.act(a);assert.equal(r.ok,true,`${level.id} ${JSON.stringify(a)}: ${r.message}`);}return e.board;}
function run(board){const sim=new Simulation(board);assert.equal(sim.start().ok,true);for(let i=0;i<board.timeLimit*120+2&&sim.status==='running';i++)sim.step();return sim;}
test('twelve authored puzzles validate, in the specified order',()=>{assert.equal(LEVELS.length,12);assert.deepEqual(LEVELS.map(b=>b.id),Array.from({length:12},(_,i)=>i+1));assert.deepEqual(validateLevels(),{ok:true,errors:[]});});
for(const level of LEVELS)test(`${level.id}: ${level.title} real-engine reference is valid, repeatable and three-star efficient`,()=>{
  const board=solvedBoard(level);assert.equal(validateBoard(board).ok,true);
  for(const object of board.objects)assert.equal(placementError(board,object,object.id),null,`${level.id}: ${object.id} starting geometry`);
  const first=run(board),second=run(board);assert.equal(first.status,'success',`${first.reason}; activated ${[...first.activated]}`);assert.equal(second.status,'success');assert.deepEqual(first.snapshot(),second.snapshot());
  for(const id of board.objectives.required)assert.ok(first.activated.has(id),`${level.id}: missing objective ${id}`);
  assert.ok(board.objects.filter(o=>!o.locked).length<=board.starBudget.three);
  const game=new Game(level);for(const action of level.solution)assert.ok(game.edit(action).ok);assert.ok(game.push().ok);while(game.state==='running')game.advance(1/30);assert.equal(game.result.stars,3);assert.equal(game.result.levelId,level.id);
});
test('mechanical progression requires seesaws, gear outputs and both reaction branches',()=>{
  for(const id of [5,10,12])assert.ok(LEVELS[id-1].objectives.required.some(key=>LEVELS[id-1].objects.find(o=>o.id===key)?.type==='seesaw'));
  for(const id of [6,10,12])assert.ok(LEVELS[id-1].objectives.required.some(key=>LEVELS[id-1].objects.find(o=>o.id===key)?.type==='gear'));
  assert.equal(LEVELS[6].objectives.required.filter(key=>LEVELS[6].objects.find(o=>o.id===key)?.type==='switch').length,2);
});
test('sandbox has independent editable starter chain, all gadgets and safe limits',()=>{const a=createSandbox(),b=createSandbox();assert.equal(validateBoard(a).ok,true);assert.equal(a.maxObjects,120);assert.equal(a.timeLimit,60);assert.equal(a.objectives.required.length,0);assert.ok(a.objects.every(o=>!o.locked));assert.ok(Object.values(a.inventory).every(n=>n===120));a.objects[0].x=999;assert.notEqual(a.objects[0].x,b.objects[0].x);});

test('incomplete starting puzzles cannot finish without player edits',()=>{for(const level of LEVELS)assert.equal(run(level).status,'stopped',`${level.id}: unfinished setup unexpectedly wins`);});
test('placement solutions tolerate a visibly different +3 pixel arrangement',()=>{for(const level of LEVELS.filter(l=>l.solution.some(a=>a.type==='place'))){const editor=new Editor(level);for(const original of level.solution){const action=structuredClone(original);if(action.type==='place')action.object.x+=3;assert.ok(editor.act(action).ok,`${level.id}: alternative placement invalid`);}assert.equal(run(editor.board).status,'success',`${level.id}: alternative arrangement fails`);}});
test('the marble-mayhem landing ramp physically carries the handoff',()=>{const board=solvedBoard(LEVELS[8]);board.objects=board.objects.filter(o=>o.id!=='landing-ramp');assert.equal(run(board).status,'stopped');});
