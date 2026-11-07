const test=require('node:test'),assert=require('node:assert/strict');const {load}=require('./harness.cjs');
test('zero fuel retains momentum and allows only weak energy-limited thrust, never normal boost',()=>{
 const {api}=load(),p=new api.Player();p.fuel=0;p.vx=200;p.angle=0;
 p.update(1/60,{},{});assert.ok(p.vx>195);assert.equal(p.lowPower,true);
 const q=new api.Player();q.fuel=0;q.angle=0;for(let i=0;i<3600;i++)q.update(1/60,{thrust:true,boost:true},{});
 assert.ok(q.speed>1&&q.speed<=55.001);assert.equal(q.boosting,false);assert.ok(q.energy<100);
});
test('energy recharges from empty and onboard reserve recovers without salvage or a random pickup',()=>{
 const {api}=load(),p=new api.Player();p.fuel=0;p.energy=0;
 for(let i=0;i<240;i++)p.update(1/60,{},{});assert.ok(p.energy>=25);
 assert.equal(p.fabricateReserve(),12);assert.equal(p.fuel,12);assert.ok(p.energy>=0);
 assert.equal(p.fabricateReserve(),0,'cooldown blocks repeated reserve');
});
test('salvage provides a distinct reserve recipe and normal propulsion still costs fuel',()=>{
 const {api}=load(),p=new api.Player();p.fuel=0;p.salvage=20;p.energy=0;
 assert.equal(p.fabricateReserve(),25);assert.equal(p.salvage,10);
 p.update(1,{thrust:true},{});assert.ok(p.fuel<25&&p.fuel>0);
});
test('compatible upgrades improve fuel efficiency, auxiliary capacity and repair yield',()=>{
 const {api}=load(),a=new api.Player(),b=new api.Player();
 b.applyUpgrade('fuelTank');b.applyUpgrade('boostUp');b.applyUpgrade('hullUp');
 const before=a.fuel,beforeB=b.fuel;for(let i=0;i<600;i++){a.update(1/60,{thrust:true},{});b.update(1/60,{thrust:true},{});}
 assert.ok(beforeB-b.fuel<before-a.fuel);assert.ok(b.maxEnergy>a.maxEnergy);
 b.hull=1;a.hull=1;b.collect('repair',24);a.collect('repair',24);assert.ok(b.hull>a.hull);
});
