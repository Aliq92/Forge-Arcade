const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../js/10-trials-core.js');
test('12 unique trials, 4 categories per tier, valid objectives and fixed loaners',()=>{
 assert.equal(C.trials.length,12);assert.equal(new Set(C.trials.map(c=>c.id)).size,12);
 for(let tier=1;tier<=3;tier++){const group=C.trials.filter(c=>c.tier===tier);assert.equal(group.length,4);assert.equal(new Set(group.map(c=>c.category)).size,4)}
 for(const c of C.trials){const s=C.create(c);for(const [k,n]of Object.entries(c.goals)){assert.ok(k in s);assert.ok(n>0)}assert.ok(c.mission);assert.ok(c.reward);assert.ok(c.spec.engine<=8);assert.ok(C.goalText(c).length);assert.ok(C.limitText(c).includes('No burnout'))}
});
for(const c of C.trials)test(c.name+': objectives, failure, optional reward and best result',()=>{
 const s=C.create(c),p=C.fresh();assert.equal(C.assess(c,s),'active');Object.assign(s,c.goals,{elapsed:25});assert.equal(C.assess(c,s),'complete');
 C.award(c,s,p);assert.ok(p.records[c.id].reward);assert.equal(p.records[c.id].best,25);s.elapsed=30;C.award(c,s,p);assert.equal(p.records[c.id].best,25);s.elapsed=20;C.award(c,s,p);assert.equal(p.records[c.id].best,20);
 assert.deepEqual(C.create(c),C.create(c));for(const [k,n]of Object.entries(c.limits)){const bad={...s,[k]:n+1,failed:''};assert.equal(C.assess(c,bad),'failed')}
 s.failed='burnout';assert.equal(C.assess(c,s),'failed');
});
test('tier unlocking needs any three prior clears, optional missions never gate it',()=>{const p=C.fresh();assert.equal(C.unlocked(C.trials[4],p),false);for(const c of C.trials.slice(0,3))p.records[c.id]={complete:true,mission:false};assert.equal(C.unlocked(C.trials[4],p),true);assert.equal(C.unlocked(C.trials[8],p),false)});
test('gates warn two seconds, sweep smoothly, provide a reachable gap, expire',()=>{for(const c of C.trials){for(let i=0;i<5;i++){const g=C.gate(c,i,2+i*5);assert.ok(g.warning);assert.ok(!g.active);assert.ok(C.gate(c,i,4+i*5).active);assert.ok(C.gate(c,i,6+i*5).passed);for(let t=0;t<30;t+=.1){const a=C.gate(c,i,t),b=C.gate(c,i,t+.1);assert.ok(Math.abs(a.center-b.center)<=.48*.45*.1+1e-9);assert.ok(Math.abs(a.center)+a.gap<1)}}}});
test('save validation rejects malformed or incompatible records and preserves earned insignia',()=>{for(const x of [null,[],{}, {version:2,records:{}},{version:1,records:{'teal-ignition':{complete:true,best:NaN}}}])assert.deepEqual(C.sanitize(x),C.fresh());const p=C.fresh(),c=C.trials[0];C.award(c,{elapsed:2,early:0},p);p.equipped=c.id;assert.deepEqual(C.sanitize(JSON.parse(JSON.stringify(p))),p)});

test('precision optional mission adds a distinct condition and invalid equipped IDs are rejected',()=>{const c=C.trials.find(c=>c.id==='unbroken-signal'),s=C.create(c);Object.assign(s,c.goals,{perfects:4});assert.equal(C.assess(c,s),'complete');assert.equal(C.optional(c,s),false);s.lowFuelPerfects=4;assert.equal(C.optional(c,s),true);assert.equal(C.sanitize({version:1,records:{},equipped:'constructor'}).equipped,'')});
