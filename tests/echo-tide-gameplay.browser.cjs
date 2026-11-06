/* Optional development-only test runner: npm install --no-save playwright elsewhere,
   then ECHO_URL=http://localhost:8080 node tests/echo-tide-gameplay.browser.cjs. No shipping dependency. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage(),errors=[],requests=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const url=process.env.ECHO_URL || require('node:url').pathToFileURL(require('node:path').join(__dirname,'../games/echo-tide/index.html')).href;
 await page.goto(url+(url.includes('?')?'&':'?')+'test');
 await page.waitForFunction(()=>window.EchoTideTest);
 const out=process.env.ECHO_ARTIFACTS||'/tmp/echo-tide-qa';fs.mkdirSync(out,{recursive:true});
 await page.waitForTimeout(800);await page.screenshot({path:out+'/menu.png'});
 await page.click('#start');assert.equal(await page.evaluate(()=>EchoTideTest.game.state),'PLAYING');
 const start=await page.evaluate(()=>({...EchoTideTest.game.sim.player}));
 await page.keyboard.down('KeyD');await page.waitForTimeout(700);await page.keyboard.up('KeyD');
 assert.ok(await page.evaluate(x=>EchoTideTest.game.sim.player.x>x+20,start.x),'keyboard moves');
 await page.keyboard.press('Space');await page.waitForTimeout(600);
 assert.equal(await page.evaluate(()=>EchoTideTest.game.sim.pulseCount),1);
 assert.ok(await page.evaluate(()=>EchoTideTest.game.sim.disturbance>0));
 await page.screenshot({path:out+'/harbor-sonar.png'});
 await page.keyboard.press('KeyP');const paused=await page.evaluate(()=>({time:EchoTideTest.game.sim.time,x:EchoTideTest.game.sim.player.x}));await page.waitForTimeout(300);
 assert.deepEqual(await page.evaluate(()=>({time:EchoTideTest.game.sim.time,x:EchoTideTest.game.sim.player.x})),paused);
 await page.keyboard.press('KeyP');await page.keyboard.press('KeyM');assert.equal(await page.locator('#chart').isVisible(),true);await page.keyboard.press('KeyM');
 const simResults=await page.evaluate(()=>{
   const {Simulation,CONFIG,State}=EchoTideTest,results=[];const ok=(condition,label)=>{if(!condition)throw Error(label);results.push(label);};const noop=()=>{};
   const sim=new Simulation();const w=sim.world;
   ok(JSON.stringify(w.rocks)===JSON.stringify(new Simulation().world.rocks),'deterministic map');
   sim.pulse();ok(!sim.pulse(),'pulse cooldown');
   for(let i=0;i<100;i++)sim.update(1/60,{x:0,y:0},noop);
   ok(w.rocks.some(r=>r.discovered),'sonar reveals rocks');
   for(const type of ['beacons','currents','details']){const s=new Simulation(),o=s.world[type][0];s.player.x=o.x+100;s.player.y=o.y;s.pulse();for(let i=0;i<80;i++)s.update(1/60,{x:0,y:0},noop);ok(s.world[type][0].discovered,'sonar reveals '+type);}
   {const s=new Simulation(),o=s.world.sanctuary;s.player.x=o.x+200;s.player.y=o.y;s.pulse();for(let i=0;i<80;i++)s.update(1/60,{x:0,y:0},noop);ok(o.discovered,'sonar reveals sanctuary');}
   // Disk clearance pathfinding verifies the complete journey by actual movement.
   const cell=40,cols=150,rows=120,blocked=new Uint8Array(cols*rows);
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const px=x*cell+20,py=y*cell+20;blocked[y*cols+x]=w.rocks.some(r=>Math.hypot(px-r.x,py-r.y)<r.r+CONFIG.vesselRadius+35)?1:0;}
   function route(from,to){const ix=p=>Math.max(0,Math.min(cols-1,Math.floor(p.x/cell)))+Math.max(0,Math.min(rows-1,Math.floor(p.y/cell)))*cols,a=ix(from),b=ix(to),prev=new Int32Array(cols*rows).fill(-1),queue=[a];prev[a]=a;for(let i=0;i<queue.length&&prev[b]<0;i++){const p=queue[i],x=p%cols,y=Math.floor(p/cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,n=yy*cols+xx;if(xx<0||xx>=cols||yy<0||yy>=rows||blocked[n]||prev[n]>=0)continue;prev[n]=p;queue.push(n);}}
     if(prev[b]<0)throw Error('unreachable '+JSON.stringify(to));const out=[];let n=b;while(n!==a){out.push({x:(n%cols)*cell+20,y:Math.floor(n/cols)*cell+20});n=prev[n];}return out.reverse();}
   const voyage=new Simulation();let steps=0;
   for(const target of [...voyage.world.beacons,voyage.world.sanctuary]){
     const path=route(voyage.player,target);for(const point of path){let watchdog=0;while(Math.hypot(point.x-voyage.player.x,point.y-voyage.player.y)>12){if(watchdog++>600)throw Error('vessel stuck '+JSON.stringify(point));const dx=point.x-voyage.player.x,dy=point.y-voyage.player.y,d=Math.hypot(dx,dy);if(voyage.time-voyage.lastPulse>6)voyage.pulse();voyage.update(1/30,{x:dx/d,y:dy/d},noop);steps++;}}
   }
   ok(voyage.world.beacons.every(b=>b.active),'all beacons reached through movement');ok(voyage.world.sanctuary.unlocked,'sanctuary unlock');ok(voyage.event===State.VICTORY,'complete voyage victory');results.push('charted route time '+Math.round(voyage.time)+' seconds');
   // Stable rock collision never costs hull points.
   {const s=new Simulation(),r=s.world.rocks[0];s.player.x=r.x-r.r-5;s.player.y=r.y;s.player.vx=80;s.update(1/60,{x:1,y:0},noop);ok(Math.hypot(s.player.x-r.x,s.player.y-r.y)>=r.r+CONFIG.vesselRadius-.1,'rock separation');ok(s.player.integrity===3,'rock contact is forgiving');}
   // Shadows arm from a safe distance and have a full warning before harm.
   {const s=new Simulation(),h=s.world.shadows[0];s.disturbance=100;s.player.x=h.x;s.player.y=h.y;s.update(1/60,{x:0,y:0},noop);ok(!h.armed&&s.player.integrity===3,'no hazard activates on vessel');
    s.player.x=h.cx+1500;s.player.y=h.cy;s.update(1/60,{x:0,y:0},noop);ok(h.armed&&h.warn>2.9,'shadow warning before danger');
    s.player.x=h.x;s.player.y=h.y;s.update(1/60,{x:0,y:0},noop);ok(s.player.integrity===3,'warning is harmless');
    h.warn=0;s.player.x=h.x;s.player.y=h.y;s.update(1/60,{x:0,y:0},noop);ok(s.player.integrity===2,'shadow collision damage');
    const hurtUntil=s.player.invulnerable;s.player.x=h.x;s.player.y=h.y;s.update(1/60,{x:0,y:0},noop);ok(s.player.integrity===2&&hurtUntil>2.9,'damage invulnerability');
    for(let hit=0;hit<2;hit++){s.player.invulnerable=0;s.player.x=h.x;s.player.y=h.y;s.update(1/60,{x:0,y:0},noop);}ok(s.event===State.GAME_OVER,'three hits cause failure');
    s.reset();ok(s.time===0&&s.peak===0&&s.pulseCount===0&&s.player.integrity===3&&!s.world.beacons.some(b=>b.active)&&!s.world.sanctuary.unlocked&&!s.rings.length&&!s.particles.length&&!s.path.length,'restart fully resets simulation');}
   {const s=new Simulation();s.disturbance=60;for(let i=0;i<600;i++)s.update(1/60,{x:0,y:0},noop);ok(s.disturbance<43,'quiet recovers disturbance');s.player.x=-20;s.player.y=50000;s.update(1/60,{x:0,y:0},noop);ok(s.player.x>=25&&s.player.y<=CONFIG.worldHeight-25,'world boundaries');}
   return results;
 });
 console.log(simResults.join('\n'));
 await page.keyboard.down('KeyW');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 assert.equal(await page.evaluate(()=>EchoTideTest.game.state),'PAUSED');assert.equal(await page.evaluate(()=>EchoTideTest.game.input.keys.size),0);await page.keyboard.up('KeyW');await page.click('#resume');
 // Trigger the actual game-loop transitions and verify their DOM surfaces.
 await page.evaluate(()=>EchoTideTest.game.start());
 for(let i=0;i<3;i++){
  await page.evaluate(i=>{const g=EchoTideTest.game,b=g.sim.world.beacons[i];g.sim.player.x=b.x;g.sim.player.y=b.y;},i);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(i=>EchoTideTest.game.sim.world.beacons[i].active,i),true);
 }
 assert.equal(await page.evaluate(()=>EchoTideTest.game.sim.world.sanctuary.unlocked),true);
 await page.evaluate(()=>{const g=EchoTideTest.game,s=g.sim.world.sanctuary;g.sim.player.x=s.x;g.sim.player.y=s.y;g.renderer.track(g.sim.player,0,true);});
 await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>EchoTideTest.game.state),'VICTORY');
 await page.screenshot({path:out+'/victory.png'});await page.click('#end-panel .restart');
 for(let i=0;i<3;i++){
  await page.evaluate(()=>{const g=EchoTideTest.game,s=g.sim,h=s.world.shadows[0];s.disturbance=100;h.armed=true;h.warn=0;s.player.x=h.x;s.player.y=h.y;s.player.invulnerable=0;g.renderer.track(s.player,0,true);});
  await page.waitForTimeout(100);
 }
 assert.equal(await page.evaluate(()=>EchoTideTest.game.state),'GAME_OVER');await page.waitForTimeout(700);
 await page.screenshot({path:out+'/game_over.png'});await page.click('#end-panel .restart');
 assert.equal(await page.evaluate(()=>EchoTideTest.game.state),'PLAYING');assert.equal(await page.evaluate(()=>EchoTideTest.game.sim.pulseCount),0);
 await page.evaluate(()=>{const g=EchoTideTest.game;g.sim.player.x=1320;g.sim.player.y=2460;g.renderer.track(g.sim.player,0,true);g.pulse();});await page.waitForTimeout(1050);await page.screenshot({path:out+'/beacon-sonar.png'});
 await page.evaluate(()=>{document.body.classList.add('touch');EchoTideTest.game.ui.toastUntil=0;});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.screenshot({path:out+'/portrait.png'});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);await page.screenshot({path:out+'/landscape.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Dispatch independent touch pointer streams: joystick stays held while sonar fires.
 await page.evaluate(()=>{const g=EchoTideTest.game;g.start();document.body.classList.add('touch');});
 const joy=await page.locator('#joystick').boundingBox(),btn=await page.locator('#sonar-button').boundingBox();assert.ok(joy&&btn);
 await page.evaluate(({joy,btn})=>{
  const fire=(el,type,id,x,y)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true}));
  const j=document.getElementById('joystick');
  // Synthetic events lack browser pointer capture; neutralize just capture for this test.
  const capture=j.setPointerCapture;j.setPointerCapture=()=>{};fire(j,'pointerdown',11,joy.x+joy.width*.8,joy.y+joy.height*.5);j.setPointerCapture=capture;
  fire(document.getElementById('sonar-button'),'pointerdown',12,btn.x+btn.width/2,btn.y+btn.height/2);
 },{joy,btn});
 await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>EchoTideTest.game.sim.pulseCount),1);assert.ok(await page.evaluate(()=>EchoTideTest.game.input.joy.x>.5));assert.ok(await page.evaluate(()=>EchoTideTest.game.sim.player.x>670));
 await page.evaluate(()=>document.getElementById('joystick').dispatchEvent(new PointerEvent('pointercancel',{pointerId:11,pointerType:'touch',bubbles:true})));
 assert.equal(await page.evaluate(()=>EchoTideTest.game.input.joy.x),0);
 // Actual Chromium touch input, including capture and simultaneous fingers.
 const cdp=await context.newCDPSession(page);
 const tx=joy.x+joy.width*.8,ty=joy.y+joy.height*.5,sx=btn.x+btn.width/2,sy=btn.y+btn.height/2;
 await page.waitForTimeout(600);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty,id:1},{x:sx,y:sy,id:2}]});
 await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>EchoTideTest.game.input.joy.x>.5));assert.equal(await page.evaluate(()=>EchoTideTest.game.sim.pulseCount),2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>EchoTideTest.game.input.joy.x),0);
 await page.click('#sound');await page.keyboard.press('Space');await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>EchoTideTest.game.audio.ctx?.state),'running');
 await page.keyboard.press('KeyR');assert.equal(await page.evaluate(()=>EchoTideTest.game.sim.pulseCount),0);
 assert.deepEqual(errors,[]);console.log('PASS browser boot, keyboard, sonar, pause, chart, restart, end screens, resizing, portrait/landscape, synthetic + real multitouch, audio unlock, zero console errors.');
 // Small phone menu, landscape menu, and high-disturbance screenshot review.
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(()=>{const g=EchoTideTest.game;g.state='MENU';g.ui.state();});await page.waitForTimeout(750);
 await page.screenshot({path:out+'/small-phone-menu.png'});
 assert.ok(await page.locator('#start').isVisible());
 const startBounds=await page.locator('#start').boundingBox();assert.ok(startBounds.y+startBounds.height<=568,'small-phone start visible');
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await page.screenshot({path:out+'/landscape-menu.png'});
 await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>{const g=EchoTideTest.game;g.start();document.body.classList.remove('touch');const h=g.sim.world.shadows[0];g.sim.disturbance=95;g.sim.player.x=h.x-180;g.sim.player.y=h.y;h.armed=true;h.warn=2;g.renderer.track(g.sim.player,0,true);g.pulse();});
 await page.waitForTimeout(700);await page.screenshot({path:out+'/awakened.png'});
 // Measure steady-state RAF pacing on this machine (not a physical-phone benchmark).
 const perf=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last=performance.now();function sample(now){samples.push(now-last);last=now;if(samples.length<90)requestAnimationFrame(sample);else resolve({averageMs:samples.reduce((a,b)=>a+b,0)/samples.length,maxMs:Math.max(...samples)});}requestAnimationFrame(sample);}));
 console.log('Local browser frame timing: '+JSON.stringify(perf));
 assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith(new URL(url).origin)||u.startsWith('data:')),'no external network requests');console.log('PASS focus-loss pause and no external network requests.');console.log('Screenshots: '+out);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
