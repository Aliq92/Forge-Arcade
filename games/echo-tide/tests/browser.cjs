const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{planner}=require('./route.cjs');
const base=new URL('games/echo-tide/index.html?test',process.env.FORGE_URL||'http://127.0.0.1:8428/').href;
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),report=[];try{
 for(const [width,height,mobile]of [[1440,900,false],[768,1024,true],[390,844,true],[320,568,true],[844,390,true]]){
  const c=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:2,reducedMotion:width===320?'reduce':'no-preference'}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(base);await p.waitForFunction(()=>window.EchoTideTest);
  assert.equal(await p.evaluate(()=>EchoTideTest.game.audio.ctx),null);await p.screenshot({path:`test-results/echo-tide/surge-menu-${width}.png`});await p.locator('#start').click();
  if(mobile){
   const cd=await c.newCDPSession(p),j=await p.locator('#joystick').boundingBox(),sonar=await p.locator('#sonar-button').boundingBox(),burst=await p.locator('#burst-button').boundingBox();
   assert.ok(burst.width>=44&&burst.height>=44);assert.ok(j.x+j.width<=burst.x);assert.ok(burst.x+burst.width<=sonar.x);
   const touch=[{id:1,x:j.x+j.width*.8,y:j.y+j.height*.5}];await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch});await p.waitForTimeout(200);
   touch.push({id:2,x:sonar.x+sonar.width/2,y:sonar.y+sonar.height/2});await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch});
   touch.push({id:3,x:burst.x+burst.width/2,y:burst.y+burst.height/2});await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch});await p.waitForTimeout(140);
   assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.pulseCount),1);assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.burstCount),1);assert.ok(await p.evaluate(()=>EchoTideTest.game.input.joy.x)>.5);await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await p.evaluate(()=>EchoTideTest.game.input.joy.x),0);
  }else{await p.keyboard.down('d');await p.waitForTimeout(200);await p.keyboard.press('Space');await p.keyboard.press('Shift');await p.waitForTimeout(140);await p.keyboard.up('d');assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.pulseCount),1);assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.burstCount),1);}
  await p.screenshot({path:`test-results/echo-tide/surge-burst-${width}.png`});assert.ok(await p.evaluate(()=>Math.hypot(EchoTideTest.game.sim.player.vx,EchoTideTest.game.sim.player.vy))>84);
  await p.locator('#pause').click();const paused=await p.evaluate(()=>JSON.stringify({time:EchoTideTest.game.sim.time,p:EchoTideTest.game.sim.player,cool:EchoTideTest.game.sim.burstCooldown,remaining:EchoTideTest.game.sim.burstRemaining}));await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>JSON.stringify({time:EchoTideTest.game.sim.time,p:EchoTideTest.game.sim.player,cool:EchoTideTest.game.sim.burstCooldown,remaining:EchoTideTest.game.sim.burstRemaining})),paused);
  const reduced=await p.evaluate(()=>EchoTideTest.game.renderer.reduced);await p.locator('#motion').click();assert.equal(await p.evaluate(()=>EchoTideTest.game.renderer.reduced),!reduced);await p.locator('#resume').click();await p.locator('#chart-button').click();await p.locator('#close-chart').click();
  // Targeted environmental fixtures render real challenge systems, not whole-voyage claims.
  for(const scene of ['current','echo','silt','channel']){
   await p.evaluate(scene=>{const g=EchoTideTest.game,s=g.sim;g.start();let target={x:1040,y:2680};if(scene==='current')target=s.world.currents[0];if(scene==='echo')target=s.world.echoShadows[0];if(scene==='silt'){target=s.world.siltfalls[0];s.world.beacons[0].active=true;}
    Object.assign(s.player,{x:target.x,y:target.y,vx:0,vy:0,angle:0});g.renderer.track(s.player,0,true);g.pulse();if(scene==='channel')g.burst();
   },scene);await p.waitForTimeout(220);
   const kind=await p.locator('#hazard-status').getAttribute('data-kind');if(scene==='current')assert.equal(kind,'current');if(scene==='echo')assert.equal(kind,'shadow');if(scene==='silt')assert.equal(kind,'silt-warning');
   await p.screenshot({path:`test-results/echo-tide/surge-${scene}-${width}.png`});
  }
  // Recharge via actual simulation time while paused, then use native keyboard B.
  await p.locator('#pause').click();await p.evaluate(()=>{const s=EchoTideTest.game.sim;for(let i=0;i<480;i++)s.update(1/120,{x:0,y:0},()=>{});});await p.locator('#resume').click();assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.burstCooldown),0);await p.keyboard.press('b');assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.burstCount),2);
  if(width===1440){
   await p.addScriptTag({content:'window.EchoRoute='+planner.toString().replaceAll('CONFIG.vesselRadius','12')+';'});
   const voyage=await p.evaluate(()=>{
    const g=EchoTideTest.game;g.start();const s=g.sim,plan=window.EchoRoute(s.world);let steps=0;
    for(const target of [...s.world.beacons,s.world.sanctuary]){for(const point of plan(s.player,target)){let guard=0;while(Math.hypot(point.x-s.player.x,point.y-s.player.y)>12){if(guard++>1800)throw Error('Route stuck');const dx=point.x-s.player.x,dy=point.y-s.player.y,d=Math.hypot(dx,dy);if(s.time-s.lastPulse>12)s.pulse();if(d>240&&!s.burstCooldown&&Math.cos(s.player.angle)*dx/d+Math.sin(s.player.angle)*dy/d>.995)s.burst();s.update(1/30,{x:dx/d,y:dy/d},(t,text)=>g.emit(t,text));steps++;if(s.event==='GAME_OVER')throw Error('Lost hull');if(s.event==='VICTORY')break;}if(s.event==='VICTORY')break;}if(s.event==='VICTORY')break;}
    return{time:s.time,bursts:s.burstCount,hull:s.player.integrity,beacons:s.world.beacons.filter(b=>b.active).length,steps};
   });assert.equal(voyage.beacons,3);assert.ok(voyage.bursts>0&&voyage.hull>0);await p.waitForFunction(()=>EchoTideTest.game.state==='VICTORY');await p.screenshot({path:'test-results/echo-tide/surge-victory.png'});report.push({actualMovementVoyage:voyage});await p.locator('#end-panel .restart').click();
  }
  await p.keyboard.press('r');assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.burstCount),0);assert.equal(await p.evaluate(()=>EchoTideTest.game.sim.burstCooldown),0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await p.evaluate(()=>EchoTideTest.game.renderer.dpr)<=1.5);assert.deepEqual(errors,[]);
  report.push({width,height,mobile,burst:true,sonar:true,pause:true,recharge:true,environmentFixtures:true,restart:true,errors});await c.close();
 }
 await fs.writeFile(`test-results/echo-tide/surge-browser-report${process.env.FORGE_URL?'-public':''}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
