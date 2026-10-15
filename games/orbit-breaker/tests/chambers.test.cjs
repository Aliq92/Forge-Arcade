const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,CHAMBERS}=require('../game.js');
const P=require('../physics.js');
// A repeatable pointer controller: aims a virtual hand ahead of the ball and
// releases once momentum already points toward the next objective. Never edits
// ball position, velocity, target state, or completion state.
function steer(g,step){
  const b=g.balls[0],targets=g.targets.filter(t=>!t.dead);
  targets.sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y));
  const target=targets[0];if(!target)return;
  const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy);
  const desiredSpeed=Math.min(240,Math.max(110,d*1.4));
  let ax=dx/Math.max(1,d)*desiredSpeed-b.vx,ay=dy/Math.max(1,d)*desiredSpeed-b.vy;
  for(const o of g.obstacles){const x=b.x-o.x,y=b.y-o.y,dist=Math.hypot(x,y);if(dist<o.r+75){ax+=x/Math.max(1,dist)*180;ay+=y/Math.max(1,dist)*180;}}
  const m=Math.hypot(ax,ay);
  g.attractor=m<20?null:{x:b.x+ax/Math.max(1,m)*120,y:b.y+ay/Math.max(1,m)*120};
  if(g.attractor){const x=g.attractor.x-500,y=g.attractor.y-500,d=Math.hypot(x,y);if(d>P.R){g.attractor.x=500+x/d*P.R;g.attractor.y=500+y/d*P.R;}}
}
for(let chamber=0;chamber<12;chamber++)test(`chamber ${chamber+1}: ${CHAMBERS[chamber].name} is solvable using gravity only`,()=>{
  const g=new Game('chambers',chamber);let steps=0;
  for(;steps<120*180&&g.phase==='playing';steps++){if(steps%4===0)steer(g,steps);g.update(P.STEP);}
  assert.equal(g.targets.filter(t=>!t.dead).length,0,`remaining targets after ${g.time.toFixed(1)} seconds`);
  assert.equal(g.phase,'ending');console.log(`  Chamber ${chamber+1} solved in ${g.time.toFixed(1)}s`);
});
