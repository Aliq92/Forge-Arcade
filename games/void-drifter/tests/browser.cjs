const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright');const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve('test-results/void-drifter');
const base=process.env.FORGE_ARCADE_URL||'http://127.0.0.1:8428/';
(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report={layouts:[],errors:[],checks:[]};
 try{
 for(const [width,height]of [[1440,900],[768,1024],[390,844],[320,740],[844,390]]){
  const mobile=width<=844,context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,reducedMotion:width===320?'reduce':'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(base);await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===36);
  await page.locator('#grid [data-game="void-drifter"]').click();await page.waitForLoadState('load');await page.bringToFront();await page.waitForFunction(()=>window.__VD_DEBUG?.game);
  await page.locator('#btnStart').click();if(await page.locator('#tutorialScreen').isVisible())await page.locator('#btnTutClose').click();
  await page.waitForFunction(()=>__VD_DEBUG.game.state==='playing');
  await page.evaluate(()=>__VD_DEBUG.game.startRun('standard',123));await page.waitForTimeout(200);
  for(const selector of ['.mission-panel','.hud-bars','#btnReserve','#btnHudPause',...(mobile?['#touchThrust','#touchBoost','#touchLeft']:[])]){
   const r=await page.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,selector+' outside '+width);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(out,`playing-${width}x${height}.png`)});
  if(!mobile){await page.keyboard.down('KeyW');await page.waitForTimeout(250);await page.keyboard.up('KeyW');assert.ok(await page.evaluate(()=>__VD_DEBUG.game.player.fuel<100));
   await page.keyboard.down('Space');await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>__VD_DEBUG.game.player.boosting));await page.keyboard.up('Space');}
  if(width===390){
   const cdp=await context.newCDPSession(page),r=await page.locator('#touchThrust').boundingBox();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await page.waitForTimeout(250);
   assert.equal(await page.locator('#touchThrust').getAttribute('aria-pressed'),'true');assert.ok(await page.evaluate(()=>__VD_DEBUG.game.player.speed>5));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.locator('#touchThrust').getAttribute('aria-pressed'),'false');
   assert.equal(await page.evaluate(()=>scrollY),0);
  }
  await page.evaluate(()=>{const g=__VD_DEBUG.game;g.startRun('standard',123);g.player.fuel=0;g.player.energy=0;});
  await page.waitForTimeout(100);await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');
  assert.ok(await page.evaluate(()=>__VD_DEBUG.game.player.lowPower));assert.ok((await page.locator('#powerStatus').textContent()).includes('LOW POWER'));
  await page.screenshot({path:path.join(out,`low-power-${width}.png`)});
  await page.evaluate(()=>{const g=__VD_DEBUG.game;g.player.energy=30;g.player.reserveCooldown=0;});
  await page.waitForTimeout(60);await page.getByRole('button',{name:'Make emergency fuel reserve',exact:true}).click();
  assert.ok(await page.evaluate(()=>__VD_DEBUG.game.player.fuel>0));
  // Collect a real box by moving through its radius, not calling the reward function.
  await page.evaluate(()=>{const g=__VD_DEBUG.game;g.startRun('standard',123);g.player.angle=0;g.player.fuel=3;g.survival.boxes=[new MysteryBox(100,0,'full-refuel','browser')];});
  await page.keyboard.down('KeyW');await page.waitForTimeout(1050);await page.keyboard.up('KeyW');
  const refuel=await page.evaluate(()=>({fuel:__VD_DEBUG.game.player.fuel,boxes:__VD_DEBUG.game.stats.mysteryBoxes,confetti:__VD_DEBUG.game.particles.particles.filter(p=>p.alive&&p.kind==='confetti').length}));
  assert.ok(refuel.fuel>95,JSON.stringify(refuel));assert.equal(refuel.boxes,1);assert.ok(refuel.confetti>0);
  assert.equal(await page.locator('#rewardText').textContent(),'FULL REFUEL!');await page.screenshot({path:path.join(out,`refuel-${width}.png`)});
  if(width===320){assert.equal(await page.evaluate(()=>__VD_DEBUG.game.settings.reducedMotion),true);assert.ok(refuel.confetti<=4);await page.waitForTimeout(1400);assert.equal(await page.locator('#rewardText').textContent(),'');}
  await page.evaluate(()=>{const g=__VD_DEBUG.game;for(let i=0;i<3;i++){const p=new Pickup(g.player.x,g.player.y,'salvage',()=>.5);p.value=15;g.world.injectPickup(p);}});
  await page.waitForFunction(()=>__VD_DEBUG.game.stats.missionsCompleted===1);
  await page.locator('#btnHudPause').click();const before=await page.evaluate(()=>JSON.stringify({p:__VD_DEBUG.game.player,time:__VD_DEBUG.game.time,stats:__VD_DEBUG.game.stats}));
  await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify({p:__VD_DEBUG.game.player,time:__VD_DEBUG.game.time,stats:__VD_DEBUG.game.stats})),before);
  await page.locator('#btnResume').click();await page.waitForFunction(()=>__VD_DEBUG.game.state==='playing');
  await page.locator('#btnHudPause').click();await page.locator('#btnRestart').click();assert.equal(await page.evaluate(()=>__VD_DEBUG.game.stats.mysteryBoxes),0);
  await page.locator('#btnHudPause').click();await page.locator('#btnPauseSettings').click();await page.locator('#reducedMotion').check();await page.locator('#btnSettingsClose').click();await page.locator('#btnResume').click();
  assert.equal(await page.evaluate(()=>__VD_DEBUG.game.settings.reducedMotion),true);
  await page.locator('#forge-back-link').click();assert.ok(page.url().includes('index.html'));
  report.layouts.push({width,height,overflow:false});report.checks.push({width,emergency:true,refuel,mission:true,pause:true,restart:true,settings:true});await context.close();
 }
 const privateContext=await browser.newContext();await privateContext.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}}));
 const privatePage=await privateContext.newPage();privatePage.on('pageerror',e=>report.errors.push(e.message));
 await privatePage.goto(new URL('games/void-drifter/',base).href);await privatePage.waitForFunction(()=>window.__VD_DEBUG?.game);await privatePage.locator('#btnStart').click();await privatePage.locator('#btnTutClose').click();await privatePage.waitForFunction(()=>__VD_DEBUG.game.state==='playing');report.blockedStorage='passed';await privateContext.close();
 assert.deepEqual(report.errors,[]);report.base=base;await fs.writeFile(path.join(out,process.env.FORGE_ARCADE_URL?'public-browser-report.json':'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
