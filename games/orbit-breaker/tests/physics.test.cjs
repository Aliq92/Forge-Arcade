const { test } = require('node:test');
const assert = require('node:assert/strict');
let P;
try { P = require('../physics.js'); } catch { P = {}; }
test('physics engine exists', () => assert.equal(typeof P.stepBall, 'function'));
test('boundary reflects and separates a high speed ball', () => {
  if (!P.stepBall) return assert.fail('stepBall is missing');
  const b = P.ball(935, 500, 510, 0);
  for(let i=0;i<12;i++) P.stepBall(b,1/120,[],[],null);
  assert.ok(b.vx<0); assert.ok(Math.hypot(b.x-500,b.y-500)<=P.R-b.r+.001);
});
test('circle impact cannot tunnel at maximum speed', () => {
  if (!P.stepBall) return assert.fail('stepBall is missing');
  const b=P.ball(390,500,520,0), o={x:450,y:500,r:18};
  let hit=false;
  for(let i=0;i<40;i++) P.stepBall(b,1/120,[o],[],null,()=>hit=true);
  assert.ok(hit); assert.ok(b.vx<0);
});
test('gravity activation stress remains finite, mobile and bounded', () => {
  if (!P.stepBall) return assert.fail('stepBall is missing');
  const b=P.ball(500,650,190,-90); let distance=0;
  for(let i=0;i<120000;i++) {
    const old={x:b.x,y:b.y};
    const a=i%3?{x:i%7?500+360*Math.sin(i*.113):b.x,y:i%7?500+360*Math.cos(i*.091):b.y}:null;
    P.stepBall(b,1/120,[{x:500,y:420,r:34}],[],a);
    assert.ok([b.x,b.y,b.vx,b.vy].every(Number.isFinite));
    assert.ok(Math.hypot(b.vx,b.vy)<=P.MAX_SPEED+.01);
    assert.ok(Math.hypot(b.x-500,b.y-500)<=P.R-b.r+.01);
    distance+=Math.hypot(b.x-old.x,b.y-old.y);
  }
  assert.ok(distance>10000);
});
