import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';
const tick=(g,t)=>{for(let i=0;i<Math.ceil(t*120);i++)g.advance(1/120);};
test('boss perimeter armor rejects strikes and real in-range windows cap damage',()=>{
 const g=new Game();g.start();g.waveNumber=10;g._beginWave();g.aim(g.boss.angle);g.strike();assert.equal(g.boss.hp,12);
 tick(g,5.21);assert.equal(g.boss.vulnerable,true);assert.equal(g.boss.r,104);
 for(let i=0;i<5;i++){g.aim(g.boss.angle);g.strike();tick(g,.33);}
 assert.equal(g.boss.hp,9);assert.equal(g.boss.vulnerable,false);
});
test('boss has no passive victory and state freezes while paused',()=>{
 const g=new Game();g.start();g.waveNumber=10;g._beginWave();tick(g,15);assert.equal(g.boss.hp,12);assert.equal(g.state,'playing');
 g.pause();const before=JSON.stringify(g.boss);tick(g,10);assert.equal(JSON.stringify(g.boss),before);
});
test('winning active strike cannot be overwritten by simultaneous escape damage',()=>{
 const g=new Game();g.start();g.waveNumber=10;g._beginWave();g.boss.hp=1;g.boss.phaseTime=5.199;g.boss.cycle=0;g.player.shields=1;
 g.targets.push({id:99,type:'spark',angle:Math.PI,r:30,speed:40,hp:1,maxHp:1,radius:9,age:0});
 g.aim(0);g.strike();g.advance(1/120);assert.equal(g.state,'intermission');assert.equal(g.lastWave.number,10);assert.equal(g.completedLevels,10);assert.equal(g.targets.length,0);assert.equal(g.boss,null);assert.equal(g.player.shields,1);assert.equal(g.drainEvents().filter(e=>e.type==='bossDefeat').length,1);tick(g,.9);assert.equal(g.waveNumber,11);
});

test('Forge Hearts recur with capped HP and relative phase thresholds',()=>{
 for(const [level,hp] of [[10,12],[20,14],[30,16],[40,18],[1000,18]]){
  const g=new Game();g.start();g.waveNumber=level;g._beginWave();assert.equal(g.boss.maxHp,hp);assert.equal(g.boss.hp,hp);
  g.boss.hp=hp*2/3;g.advance(1/120);assert.equal(g.boss.phase,2);g.boss.hp=hp/3;g.advance(1/120);assert.equal(g.boss.phase,3);
 }
});
