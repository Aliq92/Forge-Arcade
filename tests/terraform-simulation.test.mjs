import test from 'node:test';
import assert from 'node:assert/strict';
import {applyTool, createWorld, DISASTERS, HEIGHT, metrics, neighbors, step,
  terrainSampler, TOOLS, triggerDisaster, WIDTH} from '../games/terraform/simulation.mjs';

const center = Math.floor(HEIGHT/2)*WIDTH + Math.floor(WIDTH/2);
const advance = (world, count) => { for (let i=0; i<count; i++) step(world); };
function localHabitat(world, index=center) {
  for (const i of [index, ...neighbors(world,index)]) {
    Object.assign(world.cells[i], {elevation:.55, moisture:.7, water:0, ice:0, temperature:21, grass:.75, forest:.5});
  }
}

test('seed reproduces dimensions, regional terrain and spherical seam/poles', () => {
  const a=createWorld('Hesperia'), b=createWorld('Hesperia'), c=createWorld('Vesper');
  assert.deepEqual(a,b); assert.notDeepEqual(a.cells,c.cells);
  const sample=terrainSampler(a.seed);
  const i=322, x=i%WIDTH, y=Math.floor(i/WIDTH);
  assert.equal(a.cells[i].elevation, sample(2*Math.PI*((x+.5)/WIDTH-.5),Math.PI*(.5-(y+.5)/HEIGHT)));
  assert.ok(Math.abs(sample(-Math.PI,.2)-sample(Math.PI,.2))<1e-12);
  assert.ok(Math.abs(sample(0,Math.PI/2)-sample(1,Math.PI/2))<1e-12);
  assert.ok(neighbors(a,0).includes(WIDTH-1));
  assert.ok(neighbors(a,0).includes(WIDTH/2));
  assert.equal(metrics(a).vegetation,0);
});
test('tools bill the advertised amount exactly once and preserve state on rejection', () => {
  const w=createWorld('billing'); w.energy=200;
  for (const tool of TOOLS) {
    const prior=w.energy;
    assert.equal(applyTool(w,tool.id,center),true);
    assert.equal(w.energy, prior-tool.cost,tool.id);
  }
  w.energy=0;
  const before=structuredClone(w);
  for (const args of [['rain',center],['rain',-1],['?',0],['grass',.5]]) assert.equal(applyTool(w,...args),false);
  assert.deepEqual(w,before);
  w.mode='sandbox'; for (const tool of TOOLS) assert.equal(applyTool(w,tool.id,center),true);
  assert.equal(w.energy,0);
  w.mode='campaign'; w.energy=100; w.mission={allowed:['grass']};
  assert.equal(applyTool(w,'rain',center),false);
  assert.equal(applyTool(w,'grass',center),true);
});
test('rain zone condenses vapor, wets soil, and keeps raining over multiple intervals', () => {
  const w=createWorld('water cycle','sandbox'), control=structuredClone(w);
  localHabitat(w); localHabitat(control);
  const c=w.cells[center];
  applyTool(w,'rain',center);
  let intervals=0;
  for (let i=0;i<24;i++) { step(w); step(control); if(c.rain>.008) intervals++; }
  assert.ok(intervals>=16);
  assert.ok(c.moisture>control.cells[center].moisture+.1);
  assert.ok(c.rainZone<1);
});
test('terrain edits redirect runoff into new low basins', () => {
  const w=createWorld('runoff','sandbox'), a=w.cells[center], down=neighbors(w,center)[1];
  for (const c of w.cells) Object.assign(c,{water:0, ice:0, elevation:.6, moisture:.5, cloud:0});
  applyTool(w,'lower',down);
  a.water=.30; const downstreamHeight=w.cells[down].elevation;
  step(w);
  assert.equal(a.downstream,down);
  assert.ok(a.flow>.01 && w.cells[down].water>.01);
  advance(w,10); assert.equal(w.cells[down].elevation,downstreamHeight);
});
test('warming melts ice, severe cold freezes free water and damages vegetation', () => {
  const w=createWorld('ice','sandbox'), cold=structuredClone(w);
  localHabitat(w); localHabitat(cold);
  for (const world of [w,cold]) Object.assign(world.cells[center],{water:.25,ice:.25});
  for (let i=0;i<8;i++) { applyTool(w,'warm',center); applyTool(cold,'cool',center); }
  advance(w,8); advance(cold,8);
  assert.ok(cold.cells[center].ice>w.cells[center].ice+.1);
  assert.ok(cold.cells[center].temperature<0 && w.cells[center].temperature>35);
  assert.ok(cold.cells[center].grass<.75);
});
test('suitable soil allows reproduction, grazers migrate, predators require prey and plants exchange gases', () => {
  const w=createWorld('ecology','sandbox');
  for (const c of w.cells) Object.assign(c,{elevation:.6,temperature:21,moisture:.8,water:0,ice:0,cloud:.3});
  applyTool(w,'grass',center); applyTool(w,'forest',center); applyTool(w,'herbivores',center);
  const fed=structuredClone(w), hungry=structuredClone(w);
  for (const c of hungry.cells) c.herbivores=0;
  applyTool(fed,'predators',center); applyTool(hungry,'predators',center);
  const control=createWorld('ecology','sandbox');
  for (const world of [w,fed,hungry,control]) advance(world,24);
  const outside=center+3;
  assert.ok(w.cells[outside].grass>0 && w.cells[outside].forest>0);
  const hunters=world=>world.cells.reduce((n,c)=>n+c.predators,0);
  assert.ok(hunters(fed)>hunters(hungry));
  assert.ok(w.oxygen>control.oxygen && w.co2<control.co2);
});
test('survival warns, lands a disaster and reproduces after JSON round trip at any playback grouping', () => {
  const w=createWorld('survival clocks','survival');
  advance(w,w.nextEvent-8);
  assert.ok(w.warning);
  const copy=JSON.parse(JSON.stringify(w));
  advance(w,48);
  for(let i=0;i<12;i++) advance(copy,4);
  assert.deepEqual(w,copy);
  assert.ok(DISASTERS.includes(w.event.type));
  assert.equal(w.warning,null);
  const idle=createWorld('resupply','campaign'); idle.energy=0;
  advance(idle,40); assert.ok(idle.energy>=8);
});
test('every disaster changes its target and fire consumes nearby fuel', () => {
  for (const type of DISASTERS) {
    const w=createWorld(type,'sandbox');
    localHabitat(w);
    Object.assign(w.cells[center],{moisture:.2,grass:.9,forest:.7,temperature:25,elevation:.6,water:.07});
    const before=structuredClone(w.cells[center]);
    assert.equal(triggerDisaster(w,type,center),true);
    assert.notDeepEqual(w.cells[center],before,type);
    if (type==='wildfire') {
      advance(w,5); assert.ok(w.cells[center].grass<.6);
      advance(w,100); assert.ok(w.cells[center].fire<.02);
    }
  }
});
test('hundreds of intervals and extreme interventions keep all populations and physical fields bounded', () => {
  const w=createWorld('stability','survival');
  for(let i=0;i<500;i++) {
    if (i%7===0) {
      const index=(i*17)%w.cells.length;
      triggerDisaster(w,DISASTERS[i%DISASTERS.length],index);
      applyTool(w,TOOLS[i%TOOLS.length].id,index);
    }
    step(w);
  }
  for(const c of w.cells) {
    for(const [key,value] of Object.entries(c)) {
      assert.ok(Number.isFinite(value),key);
      if(!['anomaly','temperature','downstream'].includes(key)) assert.ok(value>=0 && value<=1,key);
    }
  }
  for(const value of Object.values(metrics(w))) assert.ok(Number.isFinite(value));
});

test('wildlife health measures species-specific habitat and food availability', () => {
  const w=createWorld('refuge','sandbox');
  const c=w.cells[center];
  Object.assign(c,{aquatic:.4,temperature:18,water:.4,ice:0,heat:0});
  assert.ok(metrics(w).wildlife>95);
  for (const cell of w.cells) Object.assign(cell,{water:0,ice:0,cloud:0,moisture:.1});
  assert.equal(metrics(w).wildlife,0);
  advance(w,20); assert.ok(c.aquatic<.1);
});

test('survival is achievable through ordinary seedings and habitat management', () => {
  const w=createWorld('ORISON','survival');
  let disturbances=0;
  for(let t=0;t<180;t++) {
    if(t%6===0) {
      const sites=w.cells.map((c,i)=>({c,i})).filter(({c})=>
        c.temperature>10 && c.temperature<26 && c.elevation>.43 && c.water<.04);
      sites.sort((a,b)=>(b.c.moisture-.35*b.c.grass) - (a.c.moisture-.35*a.c.grass));
      if(sites.length && w.energy>5) applyTool(w,'grass',sites[0].i);
      if(t%24===0 && sites.length) {
        sites.sort((a,b)=>b.c.grass*b.c.moisture - a.c.grass*a.c.moisture);
        applyTool(w,'herbivores',sites[0].i);
      }
    }
    step(w);
    if(w.event?.tick===w.tick) disturbances++;
  }
  assert.ok(disturbances>=2);
  assert.ok(w.stableTicks>=12);
  assert.ok(metrics(w).wildlife>22);
});
