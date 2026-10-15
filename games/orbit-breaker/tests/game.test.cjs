const {test}=require('node:test');
const assert=require('node:assert/strict');
let Game;try{Game=require('../game.js').Game;}catch{}
function game(mode='arcade',chamber=0){assert.equal(typeof Game,'function','Game is missing');return new Game(mode,chamber);}
test('targets score, chain and build combos',()=>{const g=game();const t=g.targets.find(t=>t.type==='chain');g.hit(t,g.balls[0]);assert.ok(g.score>=100);assert.ok(g.combo>=2);assert.ok(g.particles.length>0);});
test('shield contacts are warned, gated and end the run',()=>{const g=game();g.time=30;const b=g.balls[0];for(let i=0;i<3;i++){b.invulnerable=0;g.hit({type:'wall',angle:g.hazardAngle(),x:930,y:500},b);}assert.equal(g.shields,0);assert.equal(g.phase,'ending');});
test('pause freezes every simulated object',()=>{const g=game();g.paused=true;const before=JSON.stringify(g);g.update(1/120);assert.equal(JSON.stringify(g),before);});
test('confetti bends toward the active field and expires',()=>{const g=game();g.particles=[];g.burst(500,500,20,true);const p=g.particles[0];p.x=400;p.y=500;p.vx=0;p.vy=0;g.attractor={x:600,y:500};g.update(1/120);assert.ok(p.vx>0);g.attractor=null;for(let i=0;i<650;i++)g.update(1/120);assert.ok(!g.particles.includes(p));assert.ok(g.particles.length<=g.particleCap);});
test('Chaos ball count is capped and survives long simulation',()=>{const g=game('chaos');for(let i=0;i<20;i++)g.addBall();assert.equal(g.balls.length,5);for(let i=0;i<36000;i++){g.attractor={x:500+330*Math.sin(i*.017),y:500+330*Math.cos(i*.021)};g.update(1/120);}assert.ok(g.balls.every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)));assert.ok(g.particles.length<=g.particleCap);for(let i=0;i<10;i++)g.removeBall();assert.equal(g.balls.length,1);});
test('moving geometry begins continuously without a first-frame impulse',()=>{const g=game('chaos');g.update(1/120);assert.ok(g.obstacles.every(o=>Math.hypot(o.vx,o.vy)<60),'initial obstacle velocity exceeds intended movement');});
