import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, missionProgress, startMission, updateMission } from '../games/terraform/campaign.mjs';
import {applyTool, step, TOOLS} from '../games/terraform/simulation.mjs';
import {saveSession, loadSession, markComplete, completedMissions} from '../games/terraform/storage.mjs';

const costs = new Map(TOOLS.map(tool => [tool.id, tool.cost]));
const budgets = [65,85,95,105,110,115,125,145,130,145,165,155,165,180,210];
const saves = new Map();
Object.defineProperty(globalThis,'localStorage',{value:{
  getItem:key => saves.get(key) ?? null, setItem:(key,value) => saves.set(key,value),
},configurable:true});

function solve(world) {
  const target = world.mission.target;
  const act = (id, dx = 0, dy = 0, times = 1) => {
    const region = target + dx + dy * world.width;
    for (let n = 0; n < times; n++) {
      const before = world.energy;
      assert.ok(applyTool(world,id,region), 'Available tool: ' + id);
      assert.equal(world.energy, before - costs.get(id));
    }
  };
  switch (world.mission.index) {
    case 0: act('moisten'); act('rain'); break;
    case 1: act('moisten'); act('grass',-1); act('grass',1); break;
    case 2: act('water',0,0,2); act('moisten'); break;
    case 3: act('warm',0,0,2); break;
    case 4: act('atmosphere',0,0,4); break;
    case 5: act('moisten'); act('forest',-1); act('forest',1); break;
    case 6: act('valley'); act('water',-1,0,2); break;
    case 7: act('warm',0,0,2); act('warm',4,0,4); act('warm',-5,0,3); break;
    case 8: act('moisten'); act('grass',-1); act('grass',1); break;
    case 9: act('herbivores'); act('predators'); break;
    case 10: act('cool'); act('moisten'); act('grass',-1); act('grass',1); break;
    case 11: act('drain',0,0,2); act('drain',0,1); act('water',0,-2); break;
    case 12: act('grass'); act('herbivores'); break;
    case 13: act('cool'); act('moisten'); act('rain'); act('raise'); act('grass'); break;
    case 14:
      act('atmosphere',0,0,2); act('herbivores'); act('predators');
      act('aquatic',0,-2); act('forest'); break;
  }
}

for (const [index, definition] of MISSIONS.entries()) {
  test(`campaign ${index + 1} · ${definition.name}`, () => {
    for (const seed of ['PELAGOS','ONYX','OCEAN-07']) {
      let world = startMission(index, seed);
      const initial = JSON.stringify(world);
      const settings = {speed:1,selected:world.mission.target,overlay:'surface'};
      assert.equal(world.energy,budgets[index]);
      assert.deepEqual(world.mission.allowed, definition.tools);
      assert.ok(world.mission.allowed.every(id => costs.has(id)));
      assert.ok(!world.mission.complete);
      for (const tool of TOOLS.filter(t => !definition.tools.includes(t.id))) {
        assert.equal(applyTool(world,tool.id,world.mission.target), false);
      }
      assert.equal(JSON.stringify(world), initial);
      solve(world);
      let payouts = 0;
      let resumed = false;
      for (let day = 0; day < 80 && !world.mission.complete; day++) {
        step(world);
        const budget = world.energy;
        if (updateMission(world)) {
          assert.equal(world.energy,budget+30);
          assert.ok(day >= definition.duration - 1);
          payouts++;
        }
        assert.equal(updateMission(world),false);
        if (!resumed && world.mission.hold >= 2) {
          saveSession(world,settings);
          const restored = loadSession().world;
          assert.deepEqual(restored,world);
          world = restored;
          resumed = true;
        }
      }
      assert.ok(world.mission.complete, seed + ' ' + missionProgress(world).label);
      assert.equal(payouts,1);
      assert.ok(resumed);
      assert.equal(missionProgress(world).fraction,1);
      saveSession(world,settings);
      assert.deepEqual(loadSession().world,world);
      markComplete(index);
      const reset = startMission(index,seed);
      assert.equal(JSON.stringify(reset),initial);
      assert.ok(completedMissions().includes(index));
    }
  });
}

test('stability streak resets after the biosphere leaves its target range', () => {
  const world = startMission(4,'ATMOS');
  solve(world);
  step(world); updateMission(world);
  assert.equal(world.mission.hold,1);
  world.pressure = .5;
  step(world); updateMission(world);
  assert.equal(world.mission.hold,0);
});

test('each challenge requires intervention during its opening 50 days', () => {
  for (const [index, definition] of MISSIONS.entries()) {
    const world = startMission(index,'SILENT');
    for (let day = 0; day < 50; day++) { step(world); updateMission(world); }
    assert.equal(world.mission.complete,false,definition.name);
  }
});
