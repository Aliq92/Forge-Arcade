import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,normalizeAngle} from '../game.js';

// Real controls only: a 120Hz observation loop, finite-speed keyboard aim,
// deliberate strikes once a threat enters reach, and no state mutation.
export function policyStep(g,keyboard=false){
 if(g.state==='upgrade'){g.chooseUpgrade(g.choices.find(c=>c.id==='wide')?.id||g.choices[0].id);return;}
 if(g.state==='intermission'){g.advance(1/120);return;}
 if(g.state!=='playing')return;
 const threats=g.targets.filter(t=>t.hp>0).sort((a,b)=>(a.r-30)/a.speed-(b.r-30)/b.speed);
 const near=threats.find(t=>t.r<=140);
 const boss=g.boss?.vulnerable?g.boss:null;
 const goal=near||(boss?boss:threats[0]||(g.boss?.telegraph?g.boss:null));
 if(goal){const d=normalizeAngle(goal.angle-g.player.angle);if(keyboard)g.setRotation(Math.abs(d)>.025?Math.sign(d):0);else g.aim(goal.angle);
   if(Math.abs(d)<.25||!keyboard){if((goal===boss&&boss.vulnerable)||(goal!==boss&&goal.r<=124))g.strike();}}
 g.advance(1/120);
}

function playThrough(g,last,{keyboard=true,cadence=1,maxSeconds=1800}={}){
 let frames=0;const bosses=[],phases=new Set(),summaries=[];let cleared=0;
 while(g.completedLevels<last&&g.state!=='gameover'&&frames++<120*maxSeconds){
  if(frames%cadence===0||g.state!=='playing')policyStep(g,keyboard);else g.advance(1/120);
  if(g.boss)phases.add(g.boss.phase);
  assert.ok(g.targets.length<=g.wave.maxTargets);assert.ok(g.pendingChildren.length<=72);assert.ok(g.targets.every(t=>t.speed<=78));assert.ok(g.echoes.length<=4);
  if(g.completedLevels!==cleared){assert.equal(g.completedLevels,cleared+1);cleared=g.completedLevels;summaries.push({...g.lastWave});assert.equal(g.state,'intermission');}
  for(const e of g.drainEvents()){assert.notEqual(e.type,'victory');if(e.type==='bossDefeat')bosses.push(e.value);}
 }
 assert.equal(g.completedLevels,last,'seed '+g.seed+' keyboard '+keyboard+' cadence '+cadence+' stopped at '+g.waveNumber+' damage '+g.stats.damage);
 assert.equal(g.stats.damage,0,'feasibility policy never needs shield repairs');
 return {bosses,phases,summaries};
}
test('seeded mouse and finite keyboard controls complete through both recurring bosses truthfully',()=>{
 for(const keyboard of [false,true])for(const seed of [1,42,987]){
  const g=new Game({seed});assert.equal(g.start(),true);const result=playThrough(g,21,{keyboard});
  assert.deepEqual(result.bosses,[10,20]);assert.deepEqual([...result.phases],[1,2,3]);assert.equal(result.summaries.length,21);assert.ok(result.summaries.every((w,i)=>w.number===i+1&&w.bonus===250+(i+1)*50));assert.ok(g.stats.attempts>=g.stats.successfulStrikes);
 }
});
test('Endless has no unlock gate and finite keyboard control reaches capped challenge',()=>{
 const g=new Game({mode:'endless',endlessUnlocked:false,seed:122});assert.equal(g.start(),true);playThrough(g,61,{maxSeconds:3600});assert.ok(g.wave.spawns.every(s=>s.speed===78));
});
test('100ms keyboard observation cadence completes through bosses 10 and 20 naturally',()=>{
 const g=new Game({seed:77});g.start();const result=playThrough(g,21,{cadence:12});assert.deepEqual(result.bosses,[10,20]);
});
