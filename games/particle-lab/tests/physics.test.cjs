const test = require('node:test');
const assert = require('node:assert/strict');
const {World, ID, MATERIALS} = require('../materials.js');
test('registry and single-cell gravity are bounded to one move per tick',()=>{
 const w=new World(12,12); w.set(5,1,ID.sand); w.step(); assert.equal(w.get(5,2),ID.sand); assert.equal(w.count(ID.sand),1); assert.equal(MATERIALS.length,12);
});
test('phase changes conserve cells and locked fixtures can transform',()=>{
 const w=new World(12,12); w.set(2,2,ID.ice,20,true); w.set(4,2,ID.water,150); w.set(6,2,ID.steam,40); w.set(8,2,ID.lava,400); w.step();
 assert.equal(w.stats.melted,1);assert.equal(w.stats.boiled,1);assert.equal(w.stats.condensed,1);assert.equal(w.stats.cooled,1); assert.equal(w.cells.filter(Boolean).length,4);
});
test('visual hooks report real events and leave deterministic physics intact', () => {
 const world = new World(12, 12);
 world.set(2, 2, ID.sand);
 world.set(6, 6, ID.steam);
 world.set(9, 8, ID.ice, 20);
 const reference = world.clone();
 const moves = new Int8Array(world.cells.length).fill(9);
 const events = [];
 world.step((index, id, reaction) => events.push({index, id, reaction}), moves);
 reference.step();
 assert.deepEqual(world.export(), reference.export());
 assert.deepEqual(events, [{index:8*12+9, id:ID.water, reaction:'melted'}]);
 assert.equal(moves[2*12+2], 0);
 assert.equal(moves[3*12+2], 1);
 assert.equal(moves[5*12+6], -1);
});
test('a liquid landing on a flat fixture emits a splash at its occupied destination', () => {
 const world = new World(8, 8);
 world.line(0, 6, 7, 6, ID.stone);
 world.set(3, 4, ID.water);
 const impacts = [];
 world.step((index, id, event) => {
  if (event === 'impact') impacts.push({index, id, occupied:world.cells[index]});
 });
 assert.deepEqual(impacts, [{index:5*8+3, id:ID.water, occupied:ID.water}]);
});
test('heat crosses metal into ice and tools protect fixtures',()=>{
 const w=new World(8,8);w.set(2,5,ID.metal,500,true);w.set(3,5,ID.ice,-10,true); w.paint(2,5,ID.air,0,{overwrite:true});assert.equal(w.get(2,5),ID.metal);for(let i=0;i<8;i++)w.step();assert.ok(w.stats.melted>0);
});
test('oil floats, water flows, steam rises and solids stay fixed',()=>{
 const w=new World(8,8);w.rect(0,7,7,7,ID.stone);w.rect(2,4,2,6,ID.stone);w.rect(4,4,4,6,ID.stone);w.set(3,6,ID.oil);w.set(3,5,ID.water);w.set(6,5,ID.steam,120);w.set(1,1,ID.wood);w.step();assert.equal(w.get(3,6),ID.water);assert.equal(w.get(6,4),ID.steam);assert.equal(w.get(1,1),ID.wood);
});
test('combustion, extinguishing and finite lifetimes',()=>{
 const w=new World(10,10);w.set(2,5,ID.wood,500);w.set(7,5,ID.oil,500);w.step();assert.equal(w.stats.ignited,2);for(let i=0;i<240;i++)w.step();assert.equal(w.count(ID.fire)+w.count(ID.smoke),0);
 const a=new World(5,5);a.set(2,2,ID.fire);a.set(3,2,ID.water);a.step();assert.equal(a.count(ID.fire),0);
});
test('deterministic roundtrip, stable mass and malformed imports',()=>{
 const a=new World(24,16,23);a.rect(2,2,18,5,ID.sand);a.rect(2,7,18,10,ID.water);const b=a.clone();for(let i=0;i<60;i++){a.step();b.step();}assert.deepEqual(a.export(),b.export());assert.equal(a.count(ID.sand),68);assert.equal(a.count(ID.water),68);assert.equal(a.get(-1,0),-1);assert.equal(a.set(99,99,ID.sand),false);
 for(const v of [null,{}, {version:2,width:999999,height:2,cells:[]}, {...a.export(),cells:[255]}])assert.throws(()=>World.from(v));
});
test('tools reject nonfinite coordinates and bound distant strokes',()=>{
 const w=new World(8,8);assert.equal(w.paint(Infinity,2,ID.sand),0);assert.equal(w.line(NaN,0,3,3,ID.stone),0);assert.equal(w.heat(2,2,Infinity),0);w.line(-100000,2,100000,2,ID.stone);assert.equal(w.count(ID.stone),8);
 const save=w.export();save.cells[0]=ID.fire;assert.throws(()=>World.from(save));
});
test('actual fire and lava ignite ambient wood and oil by sustained contact',()=>{
 for(const source of [ID.fire,ID.lava])for(const fuel of [ID.wood,ID.oil]){
  const w=new World(12,12);w.rect(0,0,11,11,ID.stone);w.rect(2,2,8,8,source,true,{overwrite:true});w.set(9,5,fuel,20);
  for(let tick=0;tick<100;tick++)w.step();assert.ok(w.stats.ignited>0,`${MATERIALS[source].name} ignites ambient ${MATERIALS[fuel].name}`);
 }
});
