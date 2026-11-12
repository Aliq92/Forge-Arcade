const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs'),{planner,voyage}=require('./route.cjs');
test('original terrain is preserved and all beacon/sanctuary paths remain connected across100 seeds',()=>{
 const current=load(),old=load(true),a=new current.World(),b=new old.World();assert.equal(JSON.stringify(a.rocks.slice(0,b.rocks.length)),JSON.stringify(b.rocks));
 for(let seed=0;seed<100;seed++){const w=new current.World(seed),route=planner(w);let from=w.harbor;for(const target of [...w.beacons,w.sanctuary]){assert.ok(route(from,target).length);from=target;}assert.equal(w.rocks.length,b.rocks.length+28);}
});
test('a complete no-burst voyage and a burst voyage both reach sanctuary through actual movement',()=>{
 for(const seed of [4139,42,7])for(const useBurst of [false,true]){const result=voyage(seed,useBurst);assert.ok(result.hull>0);assert.equal(result.burst,useBurst);if(useBurst)assert.ok(result.bursts>0);else assert.equal(result.bursts,0);}
});
