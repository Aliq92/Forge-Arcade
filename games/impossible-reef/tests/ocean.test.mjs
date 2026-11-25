import test from 'node:test';import assert from 'node:assert/strict';
import ocean from '../ocean.js';
const {Ocean,REGIONS,FLORA,TREASURE_TYPES}=ocean;
const advance=(o,ticks,input)=>{for(let i=0;i<ticks;i++)o.step(1/60,input);};
function visit(o,x,y,radius=9){
 o.target={x,y};
 for(let i=0;i<800&&Math.hypot(o.probe.x-x,o.probe.y-y)>radius;i++)o.step(1/60);
 assert.ok(Math.hypot(o.probe.x-x,o.probe.y-y)<=radius,`Destination ${x},${y} in ${o.region}: ${o.probe.x},${o.probe.y}`);
}
function guidedVisit(o,x,y){
 const grid=10, at=p=>[Math.round(p.x/grid)*grid,Math.round(p.y/grid)*grid];
 const start=at(o.probe), end=at({x,y}), queue=[start], prev=new Map([[start.join(),null]]);
 for(let i=0;i<queue.length;i++){
  const [a,b]=queue[i];
  if(a===end[0]&&b===end[1])break;
  for(const [dx,dy] of [[0,grid],[grid,0],[-grid,0],[0,-grid]]){
   const point=[a+dx,b+dy], key=point.join();
   if(point[0]<20||point[0]>980||point[1]<30||point[1]>620||prev.has(key)||o.solidAt(...point,14))continue;
   prev.set(key,queue[i]);queue.push(point);
  }
 }
 assert.ok(prev.has(end.join()),`No navigable route to ${x},${y}`);
 const path=[];
 for(let p=end;p&&prev.get(p.join());p=prev.get(p.join()))path.push(p);
 path.reverse();
 const compressed=path.filter((p,i)=>!path[i+1]||!path[i-1]||(p[0]-path[i-1][0])!==(path[i+1][0]-p[0]));
 for(const [a,b] of compressed)visit(o,a,b,6);
 visit(o,x,y);
}
function activate(o){
 const g=o.gate;
 if(g.type==='pearl')for(const m of o.markers.filter(m=>m.kind==='pearl'))visit(o,m.x,m.y);
 if(g.type==='resonance')for(const m of o.markers.filter(m=>m.kind==='resonance'))visit(o,m.x,m.y);
 if(g.type==='current'){
  visit(o,305,215);
  visit(o,590,215);
 }
 if(g.type==='bloom'||g.type==='pearl'){
  visit(o,747,o.secret.y);
  advance(o,100);
 }
 assert.equal(o.gateOpen(),true,g.type);
}

test('four deterministic regions contain eight distinct flora and bounded decorative life',()=>{assert.equal(REGIONS.length,4);assert.equal(FLORA.length,8);for(let r=0;r<4;r++){const a=new Ocean(17017),b=new Ocean(17017);a.setRegion(r);b.setRegion(r);assert.deepEqual(a.decorations,b.decorations);assert.deepEqual(a.treasures,b.treasures);assert.ok(a.decorations.length>=120);assert.deepEqual(new Set(a.decorations.map(p=>p.type)),new Set(FLORA));assert.ok(a.life.length<=64);assert.ok(a.life.some(c=>c.type==='crab'));assert.ok(a.life.some(c=>c.type==='jelly'));assert.ok(a.life.filter(c=>c.type==='fish').length>=24);assert.ok(a.decorations.every(p=>p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=650));}});
test('treasures have defined rarity/reward and accessible bounded positions',()=>{for(let r=0;r<4;r++){const o=new Ocean();o.setRegion(r);assert.equal(o.treasures.length,8);assert.equal(o.treasures.filter(t=>t.rare).length,1);for(const t of o.treasures){assert.ok(TREASURE_TYPES[t.type].points>0);assert.ok(t.x>=35&&t.x<=965&&t.y>=45&&t.y<=605);assert.ok(!o.solidAt(t.x,t.y,0),'treasure never inside gate');}}});
test('collection requires real proximity in Survey, rewards once and restores safely',()=>{const o=new Ocean(),t=o.treasures[0];assert.equal(o.collect(t.id),false);o.survey=true;assert.equal(o.collect(t.id),false);o.probe.x=t.x;o.probe.y=t.y;assert.equal(o.collect(t.id),true);const points=o.journal.points;assert.ok(points>0);assert.equal(o.collect(t.id),false);assert.equal(o.journal.points,points);const restored=new Ocean(17017,o.serialize());restored.survey=true;restored.probe.x=t.x;restored.probe.y=t.y;assert.equal(restored.collect(t.id),false);assert.equal(restored.journal.points,points);});
test('currents and periodic vents have visible predictable vectors and can be counteracted',()=>{const o=new Ocean();o.survey=true;const zone=o.current;o.probe.x=zone.x+zone.w/2;o.probe.y=zone.y+zone.h/2;const force=o.flowAt(o.probe.x,o.probe.y);assert.notEqual(force.x,0);const x=o.probe.x;for(let i=0;i<30;i++)o.step(1/60,{x:-Math.sign(force.x),y:0});assert.ok((o.probe.x-x)*force.x<0,'thrust overcomes current');const v=o.vent;o.time=1;assert.ok(o.flowAt(v.x,v.y).y<0);o.time=4;assert.equal(o.flowAt(v.x,v.y).y,0);});
test('all four gates block before activation, then allow entry and safe exit',()=>{
 for(let r=0;r<4;r++){
  const o=new Ocean();o.survey=true;o.setRegion(r);
  visit(o,742,o.secret.y);
  o.target={x:817,y:o.secret.y};advance(o,20);
  assert.ok(o.probe.x<o.gate.x);assert.equal(o.gateOpen(),false);
  assert.ok(o.solidAt(o.gate.x+5,o.secret.y));
  assert.ok(o.solidAt(900,o.secret.y-68)&&o.solidAt(900,o.secret.y+68)&&o.solidAt(957,o.secret.y));
  o.restartSurvey();
  activate(o);
  visit(o,739,o.secret.y);visit(o,818,o.secret.y);visit(o,o.secret.x,o.secret.y);
  assert.ok(o.journal.secrets.includes(o.secret.id));
  assert.ok(o.journal.found.includes(o.treasures.find(t=>t.rare).id));
  visit(o,818,o.secret.y);visit(o,739,o.secret.y);advance(o,80);
  assert.ok(o.probe.x<o.gate.x&&o.gateOpen());
  const restored=new Ocean(17017,o.serialize());
  assert.equal(restored.region,r);assert.equal(restored.gate.state,'completed');
 }
});
test('all 32 treasures and four habitats are accessible by ordinary steering',()=>{
 const o=new Ocean();o.survey=true;
 for(let r=0;r<4;r++){
  o.setRegion(r);
  for(const t of o.treasures.filter(t=>!t.rare)){
   guidedVisit(o,t.x,t.y);
   assert.ok(o.journal.found.includes(t.id),`region ${r} ${t.id} reachable`);
  }
  o.restartSurvey();activate(o);
  visit(o,745,o.secret.y);visit(o,o.secret.x,o.secret.y);
  assert.ok(o.journal.secrets.includes(o.secret.id));
  assert.ok(o.journal.challenges.includes('region-'+r));
 }
 assert.equal(o.journal.found.length,32);
});
test('rare pearls, clean collection, currents and all-secrets challenges are optional and persisted',()=>{const o=new Ocean();o.survey=true;for(let r=0;r<4;r++){o.setRegion(r);activate(o);for(const t of o.treasures){o.probe.x=t.x;o.probe.y=t.y;o.step(1/60);}o.probe.x=o.secret.x;o.probe.y=o.secret.y;o.step(1/60);}assert.ok(o.journal.challenges.includes('rare-pearls'));assert.ok(o.journal.challenges.includes('all-secrets'));assert.ok(o.journal.challenges.includes('clean-discovery'));assert.ok(o.journal.milestones.length>=2);const p=o.journal.points;o.restartSurvey();assert.equal(o.journal.points,p);assert.equal(o.journal.found.length,32);});
test('pause, Garden mode, restart and large delta preserve original progression and finite state',()=>{const o=new Ocean();o.survey=true;o.step(.1,{x:1,y:1});o.paused=true;const before=o.serialize(),time=o.time,probe={...o.probe};o.step(10,{x:1});assert.equal(o.time,time);assert.deepEqual(o.probe,probe);assert.deepEqual(o.serialize(),before);o.paused=false;o.survey=false;o.step(.05,{x:1,y:1});assert.deepEqual(o.probe,probe);o.survey=true;o.step(Infinity);assert.ok(Number.isFinite(o.probe.x));o.restartSurvey();assert.equal(o.probe.x,90);assert.equal(o.time,0);});
test('journal import rejects forged rewards, unknown IDs and oversized malformed collections',()=>{for(const data of [null,{}, {v:9}, {v:1,found:['__proto__'],points:1e20},{v:1,found:Array(500).fill('bad')},{v:1,region:Infinity,found:[null,{}]}]){const o=new Ocean(17017,data);assert.equal(o.journal.points,0);assert.equal(o.journal.found.length,0);assert.ok(Number.isFinite(o.probe.x));}const o=new Ocean();o.survey=true;const t=o.treasures[0];o.probe.x=t.x;o.probe.y=t.y;o.collect(t.id);const data=o.serialize();data.points=1e20;const restored=new Ocean(17017,data);assert.equal(restored.journal.points,TREASURE_TYPES[t.type].points);});
test('decorations and animals do not collide; populations and feedback remain bounded',()=>{const o=new Ocean();o.survey=true;for(let i=0;i<4000;i++)o.step(1/60,{x:Math.sin(i),y:Math.cos(i)});assert.ok(o.life.length<=64);assert.ok(o.effects.length<=120);assert.ok(o.life.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)));for(const p of o.decorations)assert.equal(p.solid,undefined);});
test('fish form coherent small seeded schools and flee a nearby probe',()=>{const o=new Ocean(),control=new Ocean(),school=o.life.filter(c=>c.type==='fish'&&c.school===0);assert.equal(school.length,6);assert.ok(Math.max(...school.map(c=>c.x))-Math.min(...school.map(c=>c.x))<100);assert.ok(school.every(c=>Math.sign(c.vx)===Math.sign(school[0].vx)));o.survey=true;const fish=school[0];o.probe.x=fish.x-8;o.probe.y=fish.y;for(let i=0;i<15;i++){o.step(1/60);control.step(1/60);}assert.ok(fish.vx>control.life[fish.id].vx,'nearby probe changes velocity away from it');});
test('completing a regional survey emits a single explicit completion reward message',()=>{const o=new Ocean();o.survey=true;activate(o);for(const t of o.treasures){o.probe.x=t.x;o.probe.y=t.y;o.collect(t.id);}const events=o.drainEvents();assert.equal(events.filter(e=>e.type==='complete').length,1);o.collect(o.treasures[0].id);assert.equal(o.drainEvents().filter(e=>e.type==='complete').length,0);});
test('upstream badge persists even before collecting a treasure',()=>{const o=new Ocean();o.survey=true;o.probe.x=600;o.probe.y=280;for(let i=0;i<150;i++)o.step(1/60,{x:-1,y:0});assert.ok(o.journal.challenges.includes('upstream'));assert.equal(o.journal.found.length,0);const restored=new Ocean(17017,o.serialize());assert.ok(restored.journal.challenges.includes('upstream'));});
test('regions offer different exploration routes and habitat positions',()=>{const o=new Ocean(),secretPositions=new Set();o.setRegion(0);const first=o.treasures[0].x;for(let r=0;r<4;r++){o.setRegion(r);secretPositions.add(o.secret.x+':'+o.secret.y);if(r===1)assert.ok(Math.abs(o.treasures[0].x-first)>80);}assert.equal(secretPositions.size,4);});

test('habitat restoration changes state, awards points and unlocks a following companion once',()=>{
 const o=new Ocean();o.survey=true;
 for(let r=0;r<4;r++){
  o.setRegion(r);activate(o);visit(o,745,o.secret.y);visit(o,o.secret.x,o.secret.y);
  assert.equal(o.habitat.state,'discovered');
  const before=o.journal.points;
  const markers=o.markers.filter(m=>m.habitat);
  visit(o,markers[0].x,markers[0].y);
  if(markers[0].kind==='creature'){assert.ok(o.escort);visit(o,o.secret.x,o.secret.y);advance(o,55);}
  assert.equal(o.habitat.state,'restoring');assert.equal(o.habitat.progress,1);
  visit(o,markers[1].x,markers[1].y);
  assert.equal(o.habitat.state,'restored');assert.equal(o.habitat.progress,2);
  assert.equal(o.journal.points,before+20);
  assert.equal(o.companion.id,ocean.COMPANIONS[r].id);
  const position=o.companion.x;
  visit(o,816,o.secret.y);visit(o,705,o.secret.y);advance(o,60);
  assert.notEqual(o.companion.x,position);
  assert.ok(!o.solidAt(o.companion.x,o.companion.y,4));
  o.restartSurvey();assert.equal(o.habitat.state,'restored');assert.equal(o.journal.points,before+20);
 }
 const loaded=new Ocean(17017,o.serialize());
 assert.deepEqual(loaded.journal.restored,o.journal.restored);
 assert.deepEqual(loaded.journal.companions,o.journal.companions);
 assert.equal(loaded.journal.points,o.journal.points);
});
test('v1 migration retains seed, exact legacy score, treasure badges and access without granting restoration',()=>{
 const saved={v:1,seed:7,region:1,found:['sunlit-0','kelp-3'],secrets:['secret-1'],encounters:['fish'],challenges:['clean-discovery','upstream']};
 const o=new Ocean(17017,saved);
 assert.equal(o.seed,7);assert.equal(o.journal.points,40);assert.equal(o.gateOpen(),true);
 assert.deepEqual(o.journal.found,saved.found);assert.deepEqual(o.journal.restored,[]);
 assert.equal(o.habitat.state,'discovered');assert.ok(o.journal.challenges.includes('clean-discovery'));
 assert.equal(o.serialize().v,2);
 const restored=new Ocean(17017,o.serialize());
 assert.deepEqual(restored.journal,o.journal);
});
test('ordered optional routes give a persistent activity once without affecting treasure values',()=>{
 const o=new Ocean();o.survey=true;
 for(const id of ['bubble-journey','pearl-trail','current-rider']){
  const route=ocean.ACTIVITIES.find(a=>a.id===id);
  o.setRegion(route.region);
  const markers=o.markers.filter(m=>m.route===id);
  if(id==='bubble-journey'){visit(o,640,380);advance(o,370);visit(o,640,260);}
  else if(id==='current-rider'){visit(o,305,245);visit(o,590,245);}
  else{
   visit(o,markers[2].x,markers[2].y);
   assert.ok(!o.journal.activities.includes(id));
   for(const m of markers)visit(o,m.x,m.y);
  }
  assert.ok(o.journal.activities.includes(id),id);
  assert.equal(o.journal.activities.filter(a=>a===id).length,1);
  assert.equal(new Ocean(17017,o.serialize()).journal.activities.filter(a=>a===id).length,1);
 }
});
test('partial habitat work survives reload and the final reward is granted only once',()=>{
 const first=new Ocean();first.survey=true;activate(first);
 visit(first,745,first.secret.y);visit(first,first.secret.x,first.secret.y);
 const fragment=first.markers.find(m=>m.habitat);
 visit(first,fragment.x,fragment.y);
 const reloaded=new Ocean(first.seed,first.serialize());reloaded.survey=true;
 assert.equal(reloaded.habitat.state,'restoring');
 assert.equal(reloaded.habitat.progress,1);
 assert.equal(reloaded.companion,null);
 assert.equal(reloaded.gate.state,'completed');
 const before=reloaded.journal.points;
 visit(reloaded,745,reloaded.secret.y);visit(reloaded,reloaded.secret.x,reloaded.secret.y);
 const last=reloaded.markers.find(m=>m.habitat&&!m.collected);
 visit(reloaded,last.x,last.y);advance(reloaded,120);
 assert.equal(reloaded.journal.points,before+20);
 assert.equal(reloaded.drainEvents().filter(e=>e.type==='restored').length,1);
 assert.equal(new Ocean(first.seed,reloaded.serialize()).journal.points,before+20);
});
