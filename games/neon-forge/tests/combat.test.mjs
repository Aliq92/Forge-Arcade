import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, normalizeAngle } from '../game.js';
const tick=(g,t)=>{for(let i=0;i<Math.ceil(t*120);i++)g.advance(1/120);};
const target=(g,extra={})=>{const t={id:900+g.targets.length,type:'spark',angle:0,r:100,speed:40,hp:1,maxHp:1,radius:9,cracked:false,age:0,...extra};g.targets.push(t);return t;};
test('edge strike, exact reach/arc, frozen direction and successful-strike accuracy',()=>{
 const g=new Game();g.start();g.wave.spawns=[{at:1e6,type:'spark',angle:0,speed:40}];target(g);target(g,{angle:1});target(g,{r:133});
 assert.equal(g.strike(),true);assert.equal(g.strike(),false);g.aim(Math.PI);g.advance(1/120);
 assert.equal(g.stats.hits,1);assert.equal(g.stats.successfulStrikes,1);assert.equal(g.stats.attempts,1);assert.equal(g.targets.length,2);
 tick(g,.32);assert.equal(g.strike(),true);
});
test('perfect band, bulwark durability, splinter child safety and capped secondary effects',()=>{
 const g=new Game();g.start();g.wave.spawns=[{at:1e6,type:'spark',angle:0,speed:40}];target(g,{type:'bulwark',hp:2,maxHp:2,r:86});
 g.strike();g.advance(1/120);assert.equal(g.targets[0].hp,1);assert.equal(g.targets[0].cracked,true);assert.equal(g.stats.perfects,1);
 tick(g,.33);g.strike();tick(g,.11);assert.equal(g.targets.length,0);
 const h=new Game();h.start();h.wave.spawns=[{at:1e6,type:'spark',angle:0,speed:40}];target(h,{type:'splinter',r:86});h.strike();
 assert.equal(h.targets.length,2);assert.ok(h.targets.every(t=>t.child&&t.r>=154));assert.equal(h.stats.hits,1);
});
test('escape removes once, invulnerability, keeper, whiff, death and clean restart',()=>{
 const g=new Game();g.start();g.wave.spawns=[{at:1e6,type:'spark',angle:0,speed:40}];g.stats.combo=8;g.upgrades.keeper=1;g.player.keeperCharges=1;
 target(g,{r:30});target(g,{r:30});g.advance(1/120);assert.equal(g.player.shields,2);assert.equal(g.targets.length,0);assert.equal(g.stats.combo,0);
 target(g,{r:30});g.advance(1/120);assert.equal(g.player.shields,2);
 tick(g,.8);target(g,{r:30});g.advance(1/120);tick(g,.8);target(g,{r:30});g.advance(1/120);
 assert.equal(g.state,'gameover');assert.equal(g.drainEvents().filter(e=>e.type==='gameover').length,1);
 g.restart();assert.equal(g.player.shields,3);assert.equal(g.stats.attempts,0);assert.equal(g.upgrades.keeper,0);
});
test('pause freezes timers, finite input guards and bounded catch-up/events',()=>{
 const g=new Game();g.start();g.aim(100);assert.ok(Math.abs(g.player.angle)<=Math.PI);g.aim(NaN);assert.ok(Number.isFinite(g.player.angle));
 g.setRotation(1);g.advance(.25);assert.ok(Math.abs(normalizeAngle(g.player.angle-(normalizeAngle(100)+.875)))<1e-8);
 g.pause();const before=JSON.stringify([g.time,g.player,g.targets]);g.advance(1e6);assert.equal(JSON.stringify([g.time,g.player,g.targets]),before);g.resume();
 g.advance(NaN);g.advance(-1);g.advance(1e6);assert.ok(g.time<=.51);for(let i=0;i<200;i++)g._emit('hit');assert.ok(g.drainEvents().length<=128);
});
test('wide arc, chain range, time cooldown and nonrecursive half-damage echo',()=>{
 const g=new Game();g.start();g.wave.spawns=[{at:1e6,type:'spark',angle:0,speed:40}];g.upgrades.wide=2;g.upgrades.chain=2;g.upgrades.time=2;g.upgrades.echo=1;
 target(g,{r:86});target(g,{angle:.5,r:86});target(g,{angle:1.2,r:86,hp:2,maxHp:2,type:'bulwark'});
 g.strike();g.advance(1/120);assert.equal(g.stats.successfulStrikes,1);assert.ok(g.stats.hits>=2);assert.ok(g.slowRemaining>1);assert.ok(g.slowCooldown>2.9);
 const h=new Game();h.start();h.wave.spawns=[{at:1e6,type:'spark',angle:0,speed:40}];h.upgrades.echo=1;target(h,{r:86,type:'bulwark',hp:2,maxHp:2});h.strike();tick(h,.2);
 assert.equal(h.targets[0].hp,.5);assert.equal(h.stats.attempts,1);assert.equal(h.echoes.length,0);
});
test('splinter children respect alive cap without silently dropping the second child',()=>{
 const g=new Game();g.start();g.wave.spawns=[];g.wave.maxTargets=1;target(g,{type:'splinter'});g.strike();
 assert.equal(g.targets.length,1);assert.equal(g.pendingChildren.length,1);tick(g,.33);g.aim(g.targets[0].angle);tick(g,1.5);g.strike();tick(g,.11);
 assert.equal(g.targets.length,1);assert.equal(g.pendingChildren.length,0);assert.equal(g.state,'playing');
});
test('chain grants at most two additional hits and does not waste budget on primary arc victims',()=>{
 const g=new Game();g.start();g.wave.spawns=[];g.upgrades.chain=2;
 for(const angle of [-.4,0,.4,.8,1,1.2])target(g,{angle,r:100});
 g.strike();assert.equal(g.stats.hits,5);assert.equal(g.targets.length,1);assert.equal(g.stats.successfulStrikes,1);
});
test('pause suspends pending echo and time bend; echo keeps its original direction',()=>{
 const g=new Game();g.start();g.upgrades.echo=1;g.upgrades.time=1;target(g,{r:86,type:'bulwark',hp:2,maxHp:2});g.strike();g.advance(1/120);
 g.pause();const slow=g.slowRemaining,delay=g.echoes[0].delay;tick(g,2);assert.equal(g.slowRemaining,slow);assert.equal(g.echoes[0].delay,delay);assert.equal(g.targets[0].hp,1);
 g.resume();g.aim(Math.PI);tick(g,.18);assert.equal(g.targets[0].hp,.5);assert.equal(g.stats.perfects,1);assert.equal(g.stats.attempts,1);assert.ok(g.slowCooldown>2.7);
});
test('whiff consumes one keeper charge then resets combo without shield damage',()=>{
 const g=new Game();g.start();g.stats.combo=12;g.player.keeperCharges=1;g.strike();tick(g,.11);assert.equal(g.stats.combo,12);assert.equal(g.player.keeperCharges,0);tick(g,.23);g.strike();tick(g,.11);assert.equal(g.stats.combo,0);assert.equal(g.stats.misses,2);assert.equal(g.player.shields,3);
});
