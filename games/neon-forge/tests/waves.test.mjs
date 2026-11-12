import test from 'node:test';
import assert from 'node:assert/strict';
import { WAVES, getWave, validateWaves, isUpgradeWave } from '../waves.js';

const distance = (a,b) => Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
// Serve whole lane groups after entering reach; include repeat hits and splinter children.
// Deadlines use center collision, without shields, upgrades or mouse teleport aiming.
function keyboardSchedule(wave) {
  let clock=0, angle=0,previousDrift=0;
  for (const s of wave.spawns) {
    const entry=s.at+138/s.speed;
    const drift=s.type==='drifter'?.12:0;
    clock=Math.max(entry,clock+(distance(angle,s.angle)+drift+previousDrift)/3.5);
    const hits=s.type==='bulwark'?2:s.type==='splinter'?2:1;
    clock+=(hits-1)*.32;
    assert.ok(clock<s.at+240/s.speed-.1, `wave${wave.number} ${s.type} deadline`);
    clock+=.32;
    angle=s.angle;
    previousDrift=drift;
  }
}
function checkTimeline(w) {
  let previous=-Infinity,burst=0;
  for(const s of w.spawns) {
    assert.ok(['spark','drifter','bulwark','splinter'].includes(s.type));
    assert.ok(Number.isFinite(s.at)&&s.at>=0&&s.at>=previous);
    assert.ok(Number.isFinite(s.angle)&&Math.abs(s.angle)<=Math.PI);
    assert.ok(Number.isFinite(s.speed)&&s.speed>0);
    if(s.at===previous) burst++;else {assert.ok(s.at-previous>=.8);burst=1;}
    assert.ok(burst<=2);
    previous=s.at;
  }
}
test('frozen authored templates retain target introductions and the boss reference',()=>{
  assert.equal(WAVES.length,10);
  assert.equal(WAVES[0].name,'FIRST SPARK');
  assert.equal(WAVES[9].name,'THE FORGE HEART');
  assert.ok(WAVES.slice(0,3).every(w=>w.spawns.every(s=>s.type!=='bulwark')));
  assert.ok(WAVES[3].spawns.some(s=>s.type==='bulwark'));
  assert.ok(WAVES.slice(0,5).every(w=>w.spawns.every(s=>s.type!=='splinter')));
  assert.ok(WAVES[5].spawns.some(s=>s.type==='splinter'));
  assert.ok(new Set(WAVES[6].spawns.map(s=>s.speed)).size>1);
  assert.equal(WAVES[9].boss,true);
  assert.equal(getWave(11).number,11);
  assert.deepEqual(validateWaves(),{ok:true,errors:[]});
});
test('authored timelines span 25–60 seconds and keyboard deadlines are feasible',()=>{
  for(const w of WAVES) {
    checkTimeline(w);
    keyboardSchedule(w);
    assert.ok(w.spawns.length<=24);
    assert.ok(w.maxTargets<=12);
    if(!w.boss) {
      const end=Math.max(...w.spawns.map(s=>s.at+240/s.speed));
      assert.ok(end>=25&&end<=60);
      assert.ok(w.spawns.at(-1).at>=21);
    }
  }
});
test('Endless is seeded, isolated and bounded across 240 varied schedules',()=>{
  for(let seed=1;seed<=12;seed++) for(const number of [1,3,6,12,30,100,1000,1000000,2,7,20,70,300,400,500,700,900,999,1234,99999]) {
    const a=getWave(number,'endless',seed);
    checkTimeline(a);
    assert.deepEqual(a,getWave(number,'endless',seed));
    assert.ok(a.spawns.length<=36&&a.maxTargets<=16);
    assert.ok(a.spawns.every(s=>s.speed>0&&s.speed<=78));
    keyboardSchedule(a);
    a.spawns[0].speed=-1;
    assert.ok(getWave(number,'endless',seed).spawns[0].speed>0);
  }
  assert.notDeepEqual(getWave(21,'endless',1),getWave(21,'endless',2));
  const a=getWave(1); a.spawns[0].speed=-1; assert.ok(getWave(1).spawns[0].speed>0);
  assert.equal(getWave(0),null); assert.equal(getWave(NaN),null);
});
test('upgrade milestones are every third level for all mode inputs',()=>{
  assert.deepEqual(Array.from({length:10},(_,i)=>i+1).filter(n=>isUpgradeWave(n)),[3,6,9]);
  assert.deepEqual(Array.from({length:12},(_,i)=>i+1).filter(n=>isUpgradeWave(n,'endless')),[3,6,9,12]);
});

test('all modes share bounded recurring Endless progression with gradual challenge',()=>{
 for(const n of [1,2,3,9,10,11,20,21,40,1001]){
  const w=getWave(n);for(const mode of ['campaign','endless','unknown',undefined])assert.deepEqual(getWave(n,mode,42),getWave(n,'endless',42));
  assert.equal(w.boss,n%10===0);assert.equal(w.maxTargets,w.boss?8:16);
 }
 assert.equal(getWave(1).spawns[0].speed,50);const late=getWave(1001);assert.equal(late.spawns[0].speed,78);
 const beats=[...new Set(late.spawns.map(s=>s.at))];assert.ok(beats[1]-beats[0]>=2);assert.ok(beats[1]-beats[0]<2.8);
});
