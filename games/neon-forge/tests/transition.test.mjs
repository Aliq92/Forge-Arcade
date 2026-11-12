import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../game.js';import {UPGRADES} from '../upgrades.js';
test('late-Endless calibration delivers a real reward through the next-wave transition',()=>{const g=new Game({mode:'endless',endlessUnlocked:true});g.start();for(const u of UPGRADES)g.upgrades[u.id]=u.maxLevel;g.player.maxShields=5;g.player.shields=5;g.player.keeperCharges=0;g.waveNumber=12;g.state='intermission';assert.equal(g.nextWave(),true);assert.equal(g.state,'upgrade');assert.ok(g.choices.some(u=>u.id==='refresh'));const score=g.stats.score;assert.equal(g.chooseUpgrade('refresh'),true);assert.equal(g.stats.score-score,250);assert.equal(g.player.keeperCharges,2);assert.equal(g.waveNumber,13);assert.equal(g.state,'playing');});

const tick=(g,t)=>{for(let i=0;i<Math.round(t*120);i++)g.advance(1/120);};
function clearFixture(g){g.wave.spawns=[];g.targets=[];g.advance(1/120);}
test('legacy modes start unlocked Endless with explicit truthful progress',()=>{
 for(const mode of [undefined,'campaign','endless','unknown']){
  const g=new Game({mode,endlessUnlocked:false});assert.equal(g.mode,'endless');assert.equal(g.completedLevels,0);assert.equal(g.start(),true);assert.equal(g.completedLevels,0);
  clearFixture(g);assert.equal(g.state,'intermission');assert.equal(g.completedLevels,1);assert.equal(g.lastWave.number,1);const score=g.stats.score;
  tick(g,.89);assert.equal(g.state,'intermission');assert.equal(g.stats.score,score);tick(g,1/120);assert.equal(g.state,'playing');assert.equal(g.waveNumber,2);assert.equal(g.completedLevels,1);
  g.restart();assert.equal(g.completedLevels,0);assert.equal(g.waveNumber,1);
 }
});
test('intermission preserves rotation and survival, pause preserves its remaining timer',()=>{
 const g=new Game();g.start();g.setRotation(1);clearFixture(g);const angle=g.player.angle,time=g.time;
 tick(g,.3);assert.ok(g.time>time);assert.notEqual(g.player.angle,angle);const remaining=g.intermissionRemaining;g.pause();assert.equal(g.state,'paused');const paused=g.time;tick(g,2);assert.equal(g.time,paused);assert.equal(g.intermissionRemaining,remaining);g.resume();assert.equal(g.state,'intermission');tick(g,remaining);assert.equal(g.state,'playing');assert.equal(g.waveNumber,2);assert.equal(g._rotation,0);
 const h=new Game();h.start();h.setRotation(1);clearFixture(h);tick(h,.9);assert.equal(h._rotation,1);const resumed=h.player.angle;tick(h,.1);assert.notEqual(h.player.angle,resumed);
});
test('every third completed level automatically waits for deliberate upgrade selection',()=>{
 const g=new Game();g.start();for(let level=1;level<=3;level++){clearFixture(g);assert.equal(g.completedLevels,level);assert.equal(g.state,'intermission');g.setRotation(1);tick(g,.9);}
 assert.equal(g.state,'upgrade');assert.equal(g._rotation,0);assert.equal(g.choices.length,3);assert.equal(g.waveNumber,3);assert.equal(g.chooseUpgrade(g.choices[0].id),true);assert.equal(g.waveNumber,4);assert.equal(g.completedLevels,3);
});

test('intermission is threat-free and cannot strike or grant completion twice',()=>{
 const g=new Game();g.start();clearFixture(g);const attempts=g.stats.attempts,score=g.stats.score;
 assert.equal(g.strike(),false);assert.equal(g.stats.attempts,attempts);assert.equal(g.targets.length,0);assert.equal(g.pendingChildren.length,0);assert.equal(g.echoes.length,0);assert.equal(g.player.attack,null);
 tick(g,.5);assert.equal(g.completedLevels,1);assert.equal(g.stats.score,score);g.aim(1.3);assert.ok(Math.abs(g.player.angle-1.3)<1e-8);
});
