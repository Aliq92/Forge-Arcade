import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';
import {freshProgress,decodeProgress,loadProgress,saveProgress,recordWin} from '../storage.js';
const board=()=>({id:1,title:'Test',width:10,height:8,nodes:[{id:'gen',type:'generator',x:1,y:1,name:'Glow source',capacity:6},{id:'home',type:'building',x:4,y:3,name:'Little home',demand:3,style:'house',district:'Test'}],edges:[],obstacles:[],constraints:{maxCables:4,cableCapacity:6,maxLength:12},objectives:{required:['home'],noOverload:true,holdSeconds:0},starBudget:1});
test('game actions power a real building, reject duplicates, undo and deterministic reset',()=>{
 const g=new Game(board());assert.equal(g.ready,false);assert.equal(g.act({type:'cable',from:'gen',to:'home'}).ok,true);assert.equal(g.allocation.served.home,true);assert.equal(g.ready,true);assert.equal(g.act({type:'cable',from:'gen',to:'home'}).ok,false);assert.equal(g.history.length,1);assert.equal(g.undo(),true);assert.equal(g.ready,false);g.act({type:'cable',from:'gen',to:'home'});g.reset();assert.deepEqual(g.board,board());assert.equal(g.history.length,0);
});
test('completion scores efficient current topology and does not reward an unfinished puzzle',()=>{
 const g=new Game(board());assert.equal(g.complete(),null);g.act({type:'cable',from:'gen',to:'home'});const win=g.complete();assert.equal(win.stars,3);assert.equal(win.levelId,1);assert.equal(g.completed,true);
});
test('finite battery check consumes energy only in active time; pause and undo cannot refill it',()=>{
 const b=board();b.nodes[0].capacity=1;b.nodes.push({id:'cell',type:'battery',x:4,y:1,name:'Reserve',energy:20,maxEnergy:20,dischargeRate:2,chargeRate:2,mode:'off'});b.objectives.holdSeconds=4;b.starBudget=2;
 const g=new Game(b);g.act({type:'cable',from:'cell',to:'home'});g.act({type:'battery',id:'cell',mode:'support'});g.act({type:'cable',from:'gen',to:'home'});assert.equal(g.ready,false);assert.equal(g.board.nodes[2].energy,20);assert.equal(g.startTest(),true);
 for(let i=0;i<20;i++)g.tick(.1);const charge=g.board.nodes[2].energy;assert.ok(charge<20&&charge>=15.9);g.paused=true;g.tick(.2);assert.equal(g.board.nodes[2].energy,charge);g.paused=false;g.undo();assert.equal(g.board.nodes[2].energy,charge);assert.equal(g.stableTime,0);assert.equal(g.running,false);
 g.reset();assert.equal(g.board.nodes[2].energy,20);
});
test('sandbox supports all components, removal/undo and the same capacity model',()=>{
 const b={...board(),id:'sandbox',nodes:[],objectives:{required:[]}};const g=new Game(b,'sandbox');
 for(const [kind,x,y]of[['generator',1,1],['substation',4,2],['switch',6,2],['battery',7,5],['building',4,6]])assert.equal(g.act({type:'place',kind,x,y,style:'market'}).ok,true);
 assert.equal(g.board.nodes.length,5);assert.equal(g.board.nodes.find(n=>n.type==='battery').energy,0);const id=g.board.nodes[2].id;assert.equal(g.act({type:'remove-node',id}).ok,true);assert.equal(g.board.nodes.length,4);assert.equal(g.undo(),true);assert.equal(g.board.nodes.length,5);assert.equal(g.complete(),null);
});
test('progress is versioned, validates sandbox and preserves unrelated storage',()=>{
 const p=freshProgress();recordWin(p,{levelId:1,stars:3,objectives:['powered']});assert.equal(p.unlocked,2);recordWin(p,{levelId:1,stars:1,objectives:['powered']});assert.equal(p.bestStars[0],3);
 const map=new Map([['another-game','keep']]),store={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};p.sandbox={...board(),id:'sandbox',objectives:{required:[]}};assert.equal(saveProgress(p,store),true);const loaded=loadProgress(store).data;assert.equal(loaded.bestStars[0],3);assert.equal(loaded.sandbox.nodes.length,2);assert.equal(map.get('another-game'),'keep');
 assert.equal(decodeProgress('{broken'),null);assert.equal(decodeProgress(JSON.stringify({version:99})),null);p.sandbox.nodes[1].id=p.sandbox.nodes[0].id;assert.equal(decodeProgress(JSON.stringify(p)).sandbox,null);const broken={getItem(){throw Error('unavailable')},setItem(){throw Error('unavailable')}};assert.equal(loadProgress(broken).data.unlocked,1);assert.equal(saveProgress(p,broken),false);
});
test('overload history survives repair and undo, resets explicitly, and saved achievements accumulate',()=>{
 const b=board();b.nodes.push({id:'extra',type:'building',name:'Extra',x:6,y:6,style:'house',demand:4});b.starBudget=2;
 const g=new Game(b);g.act({type:'cable',from:'gen',to:'home'});g.act({type:'cable',from:'gen',to:'extra'});assert.equal(g.hadOverload,true);g.undo();assert.equal(g.ready,true);assert.equal(g.stars,1);g.reset();assert.equal(g.hadOverload,false);
 const p=freshProgress();recordWin(p,{levelId:1,stars:3,objectives:['powered','no-overload','stable']});recordWin(p,{levelId:1,stars:1,objectives:['powered','invalid']});assert.deepEqual(p.completedObjectives[1],['powered','no-overload','stable']);
});
test('reference wait dispatch advances actual bounded simulation and rejects invalid duration',()=>{
 const b=board();b.objectives.holdSeconds=1;const g=new Game(b);g.act({type:'cable',from:'gen',to:'home'});assert.equal(g.act({type:'wait',seconds:1}).ok,true);assert.equal(g.ready,true);assert.equal(g.act({type:'wait',seconds:Infinity}).ok,false);assert.equal(g.act({type:'wait',seconds:61}).ok,false);
});
