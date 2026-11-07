import test from 'node:test';import assert from 'node:assert/strict';
import {createTremor,updateTremor,chooseObstructions,TREMOR} from '../src/tremor.mjs';
import {generateCave,validateCave} from '../src/cave.mjs';import {floodReachable} from '../src/pathfinding.mjs';import {createRun,updateRun} from '../src/state.mjs';
const world=p=>({x:(p.x+.5)*32,y:(p.y+.5)*32});
function context(cave,now){return {cave,player:world(cave.lift),hunter:world(cave.hunterSpawn),crystals:cave.crystals,now,enabled:true};}
test('seeded tremor scheduling stays at 90–150 seconds and suppresses the tutorial',()=>{
 for(let i=0;i<100;i++){const a=createTremor(i);assert.deepEqual(a,createTremor(i));assert.ok(a.nextAt>=90&&a.nextAt<=150);}
 const c=generateCave({seed:1,difficulty:'survey'}),t=createTremor(1);assert.equal(updateTremor(t,{...context(c,1000),enabled:false}).phase,'quiet');
});
test('warning precedes obstruction, then recovery restores the original collision grid',()=>{
 const c=generateCave({seed:4,difficulty:'survey'}),initial=createTremor(4);
 const warn=updateTremor(initial,context(c,initial.nextAt));assert.equal(warn.phase,'warning');assert.equal(warn.grid,null);assert.ok(warn.until-initial.nextAt>=4);
 const active=updateTremor(warn,context(c,warn.until));assert.equal(active.phase,'active');
 const recovery=updateTremor(active,context(c,active.until));assert.equal(recovery.phase,'recovery');assert.equal(recovery.grid,null);assert.deepEqual(c.tiles,generateCave({seed:4,difficulty:'survey'}).tiles);
 const quiet=updateTremor(recovery,context(c,recovery.until));assert.equal(quiet.phase,'quiet');assert.ok(quiet.nextAt-recovery.until>=90);
});
test('warning targets are revalidated when the player moves into the debris area',()=>{
 const width=30,height=30,tiles=new Uint8Array(width*height).fill(1),cave={width,height,tiles,lift:{x:2,y:2},crystals:[{x:25,y:25}],hunterSpawn:{x:26,y:3}};
 const ctx=context(cave,0),selected=chooseObstructions({...ctx,seed:2});assert.ok(selected.tiles.length>0);
 const target=selected.tiles[0],t={...createTremor(2),phase:'warning',until:4,tiles:[target]};
 const active=updateTremor(t,{...ctx,now:4,player:world(target)});assert.equal(active.tiles.length,0);
});
test('temporary debris is a real collision obstruction and can never close a sole corridor',()=>{
 const width=30,height=5,tiles=new Uint8Array(width*height);for(let x=1;x<29;x++)tiles[2*width+x]=1;
 const c={width,height,tiles,lift:{x:1,y:2},hunterSpawn:{x:28,y:2},crystals:[{x:20,y:2}]};
 assert.equal(chooseObstructions({...context(c,0),seed:1}).tiles.length,0);
 const r=createRun({difficulty:'survey',seed:1,cave:{...c,width:30,height:30,tiles:new Uint8Array(900).fill(1)}});
 r.player={...r.player,x:10*32-11,y:10.5*32};const grid={...r.cave,tiles:r.cave.tiles.slice()};grid.tiles[10*30+10]=0;
 r.tremor={...r.tremor,phase:'active',until:10,grid,tiles:[{x:10,y:10}]};
 const moved=updateRun(r,{moveX:1},1/60);assert.equal(moved.player.x,r.player.x);
});
test('all floors, lift and crystals remain reachable during tremors across 225 generated caves',()=>{
 let blocked=0;
 for(const difficulty of ['survey','descent','abyss'])for(let seed=0;seed<75;seed++){
  const cave=generateCave({difficulty,seed});assert.equal(validateCave(cave).valid,true);
  const before=cave.tiles.slice(),result=chooseObstructions({...context(cave,0),seed});const grid=result.grid||cave;
  const reachable=floodReachable(grid,cave.lift),floorCount=cave.tiles.reduce((a,b)=>a+(b===1),0);
  assert.equal(reachable.size,floorCount-result.tiles.length,`${difficulty}:${seed}`);
  for(const c of cave.crystals)assert.ok(reachable.has(c.y*cave.width+c.x));
  assert.deepEqual(cave.tiles,before);blocked+=result.tiles.length;
 }
 assert.ok(blocked>0);console.log('225 CAVES CHECKED; SAFE TEMPORARY BLOCKS '+blocked);
});
test('tremor activation preserves escape and objectives from explored positions away from the lift',()=>{
 let checked=0;
 for(const difficulty of ['survey','descent','abyss'])for(let seed=0;seed<25;seed++){
  const cave=generateCave({difficulty,seed}),cells=[...floodReachable(cave,cave.lift).keys()];
  for(const fraction of [.25,.5,.75]){
   const i=cells[Math.floor((cells.length-1)*fraction)],player=world({x:i%cave.width,y:Math.floor(i/cave.width)}),ctx={...context(cave,0),player};
   const initial=createTremor(seed),warn=updateTremor(initial,{...ctx,now:initial.nextAt});
   const active=updateTremor(warn,{...ctx,now:warn.until}),grid=active.grid||cave;
   const seen=floodReachable(grid,{x:Math.floor(player.x/32),y:Math.floor(player.y/32)});
   assert.equal(seen.size,cave.tiles.reduce((a,b)=>a+(b===1),0)-active.tiles.length);
   assert.ok(seen.has(cave.lift.y*cave.width+cave.lift.x));for(const c of cave.crystals)assert.ok(seen.has(c.y*cave.width+c.x));checked++;
  }
 }
 assert.equal(checked,225);console.log('225 AWAY-FROM-LIFT ACTIVATIONS CHECKED');
});
