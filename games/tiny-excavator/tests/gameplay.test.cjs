const test=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./harness.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
const setup=g=>{g.World.generate(42);g.Player.reset();g.Game.state='playing';};
test('legacy terrain geometry, movement, fuel, digging and collision traces agree for matching worlds',()=>{
 const a=harness({original:true}),b=harness();setup(a);setup(b);b.World.grid=plain(a.World.grid);
 for(let i=0;i<900;i++){const code=i<100?'KeyD':i<400?'KeyS':i<600?'KeyW':'KeyA';for(const g of [a,b]){g.Input.keys={[code]:true};g.Game.updatePlayer(1/60);}assert.deepEqual(plain(b.Player),plain(a.Player),'tick '+i);assert.deepEqual(plain(b.World.grid),plain(a.World.grid));}
});
test('legacy save remains loadable and does not regenerate its terrain or prices',()=>{
 const a=harness({original:true});setup(a);a.Player.cargo.push({name:'Copper Ore',sell:12,color:'#c97a3d'});a.Player.credits=987;a.Player.upgrades.dig=2;a.Player.fragments[1]=true;const saved=plain(a.Save.build());const b=harness({saved});b.Game.continueGame();assert.deepEqual(plain(b.World.grid),saved.grid);assert.equal(b.Player.credits,987);assert.equal(b.Player.cargo[0].sell,12);assert.equal(b.Player.upgrades.dig,2);assert.equal(b.Player.fragments[1],true);assert.equal(b.Game.finds[7],1);
});
test('all mineral collection values stay in cargo until sold and discoveries count exactly once',()=>{
 const b=harness();setup(b);for(const id of [7,8,9,10,17,18,19,20,21]){b.Player.cargo=[];const credits=b.Player.credits;b.World.set(10,20,id);assert.equal(b.Player.tryCollectOrPass(10,20),true);assert.equal(b.Player.cargo[0].sell,b.META[id].sell);assert.equal(b.Player.credits,credits);assert.equal(b.Game.finds[id],1);assert.equal(b.World.get(10,20),0);}
 b.Game.sellAll(400,{Diamond:{count:1,sell:400,color:'#caf8ff'}});assert.equal(b.Player.credits,440);assert.equal(b.Game.finds[21],1);
});
test('cargo full leaves deposit intact and gives no reward or journal entry',()=>{
 const b=harness();setup(b);b.Player.cargo=Array.from({length:8},()=>({name:'Copper Ore',sell:12,color:'#c97a3d'}));b.World.set(10,20,21);assert.equal(b.Player.tryCollectOrPass(10,20),false);assert.equal(b.World.get(10,20),21);assert.equal(b.Player.credits,40);assert.ok(!b.Game.finds[21]);
});
test('discovery metadata round-trips; corrupted optional metadata cannot break a valid save',()=>{
 const b=harness();setup(b);b.World.set(10,20,21);b.Player.tryCollectOrPass(10,20);b.Save.save();const saved=b.Save.load();assert.equal(saved.finds[21],1);saved.finds={constructor:8,'21':-4,'17':'many'};const c=harness({saved});assert.ok(c.Save.load());c.Game.continueGame();assert.ok(!c.Game.finds[21]);
});
test('depot purchases retain costs, caps, useful rewards and insufficient-credit checks',()=>{
 const b=harness();setup(b);const defs=[{key:'cargo',name:'Cargo Bay',base:45}];b.Game.buyUpgrade('cargo',defs);assert.equal(b.Player.upgrades.cargo,0);b.Player.credits=100;b.Game.buyUpgrade('cargo',defs);assert.equal(b.Player.credits,55);assert.equal(b.Player.cargoCap,12);assert.equal(b.Player.upgrades.cargo,1);b.Game.buySupport();assert.equal(b.Player.credits,35);assert.equal(b.Player.supportsCarried,3);
});
test('all fragments, cargo handling, rescue and depot-only victory remain functional',()=>{
 const b=harness();setup(b);for(const [id,r]of[[11,27],[12,55],[13,85]]){b.World.set(10,r,id);b.Player.tryCollectOrPass(10,r);}assert.equal(b.Player.fragmentCount(),3);assert.equal(b.Player.credits,1340);b.Game.deliverVictory();assert.equal(b.Player.won,false);b.Game.state='depot';b.Game.deliverVictory();assert.equal(b.Player.won,true);assert.equal(b.Game.state,'victory');
});
test('pause freezes active animation and clears inputs; restart produces a fresh playable world',()=>{
 const b=harness();setup(b);b.Input.keys.KeyD=true;b.Input.touch.down=true;b.Game.togglePause();assert.equal(b.Game.state,'paused');assert.equal(b.Input.right(),false);assert.equal(b.Input.down(),false);const p=plain(b.Player),time=b.Game.time;b.Game.loop(1000);b.Game.loop(2000);assert.deepEqual(plain(b.Player),p);assert.equal(b.Game.time,time);b.storage.set('tinyExcavatorTutorialSeen','1');b.Game.startNewGame();assert.equal(b.Player.credits,40);assert.equal(b.Player.cargo.length,0);assert.equal(b.Game.state,'playing');
});
test('Escape resumes from pause even when the calm-motion checkbox has focus',()=>{
 const b=harness();setup(b);b.Game.togglePause();for(const f of b.events.keydown)f({code:'Escape',repeat:false,target:{tagName:'INPUT'},preventDefault(){}});assert.equal(b.Game.state,'playing');
});
