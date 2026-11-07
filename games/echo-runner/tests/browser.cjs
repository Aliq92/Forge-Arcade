const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const out=path.resolve(process.env.ECHO_RUNNER_RESULTS||'test-results/echo-runner');
const base=(process.env.FORGE_ARCADE_URL||'http://127.0.0.1:8428/').replace(/\/?$/,'/');
(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const report={layouts:[],errors:[],solutions:[]};
 try{
 for(const [width,height]of [[1440,900],[768,1024],[390,844],[320,740],[844,390]]){
  const mobile=width<=844,context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:width===320?'reduce':'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(base+'games/echo-runner/');await page.waitForFunction(()=>window.echoRunnerDebug?.game);
  assert.equal(await page.evaluate(()=>echoRunnerDebug.audio.ctx),null,'audio must await a gesture');
  await page.locator('#btn-begin').click();await page.waitForFunction(()=>echoRunnerDebug.game.state==='playing');
  await page.evaluate(()=>{const g=echoRunnerDebug.game;g.progress.unlockedLevel=19;g.loadLevel(15);});await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const selector of mobile?['#tc-record','#tc-pause','#tc-left','#tc-jump','#tc-replay','#timeline-wrap']:['#timeline-wrap']){
   const r=await page.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,selector+' outside viewport '+width);
   if(selector.startsWith('#tc'))assert.ok(r.width>=44&&r.height>=44,'small touch target');
  }
  await page.screenshot({path:path.join(out,`chamber-${width}x${height}.png`)});
  if(!mobile){
   const x=await page.evaluate(()=>echoRunnerDebug.game.player.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(230);await page.keyboard.up('ArrowRight');
   assert.ok(await page.evaluate(x=>echoRunnerDebug.game.player.x>x+20,x));await page.keyboard.press('Space');await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>echoRunnerDebug.game.player.vy<0));
   await page.keyboard.press('KeyR');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>echoRunnerDebug.game.recorder.isRecording),true);
   await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');await page.keyboard.press('KeyR');
  }else{
   await page.locator('#tc-record').tap();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>echoRunnerDebug.game.recorder.isRecording),true);
   const session=await context.newCDPSession(page),r=await page.locator('#tc-right').boundingBox();
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await page.waitForTimeout(500);
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#tc-record').tap();
  }
  await page.waitForFunction(()=>echoRunnerDebug.game.echoes.length===1&&!echoRunnerDebug.game.transition);
  await page.screenshot({path:path.join(out,`echo-${width}.png`)});
  if(mobile)await page.locator('#tc-pause').tap();else await page.keyboard.press('Escape');
  await page.waitForFunction(()=>echoRunnerDebug.game.state==='paused');const before=await page.evaluate(()=>JSON.stringify({p:echoRunnerDebug.game.player,t:echoRunnerDebug.game.attemptTick}));await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>JSON.stringify({p:echoRunnerDebug.game.player,t:echoRunnerDebug.game.attemptTick})),before);
  await page.locator('#btn-resume').click();
  // Accelerated input-only solutions exercise the actual browser-owned Game controller.
  for(const id of width===1440?[15,16,17,18,19]:[19]){
   const result=await page.evaluate(async id=>{
    const {solveRoom}=await import('./tests/solutions.mjs');const g=echoRunnerDebug.game;g.loadLevel(id);
    const r=solveRoom(g,id);return {id,ticks:r.ticks,echoes:r.echoes,state:g.state,confetti:g.confetti.count};
   },id);
   assert.equal(result.state,'roomComplete');assert.ok(result.confetti>0);report.solutions.push({width,...result});
   assert.equal(await page.locator('#screen-room-complete').isVisible(),true);assert.ok(await page.locator('#rc-title').textContent());
   const button=await page.locator('#btn-rc-next').boundingBox();assert.ok(button&&button.y>=0&&button.y+button.height<=height);
   await page.screenshot({path:path.join(out,`complete-${width}-level-${id}.png`)});
   if(id===19){
    assert.ok((await page.locator('#rc-title').textContent()).includes('FINAL ECHO'));await page.locator('#btn-rc-replay').click();assert.equal(await page.evaluate(()=>echoRunnerDebug.game.levelDef.id),19);
    await page.evaluate(async()=>{const {solveRoom}=await import('./tests/solutions.mjs');solveRoom(echoRunnerDebug.game,19);});
    await page.locator('#btn-rc-next').click();assert.equal(await page.locator('.level-tile.locked').count(),0);
    await page.locator('.level-tile').last().click();assert.equal(await page.evaluate(()=>echoRunnerDebug.game.state),'playing');
   }
   else {await page.locator('#btn-rc-next').click();assert.equal(await page.evaluate(()=>echoRunnerDebug.game.levelDef.id),id+1);}
  }
  await page.evaluate(()=>{echoRunnerDebug.game.pause();});await page.locator('#btn-pause-restart').click();assert.equal(await page.evaluate(()=>echoRunnerDebug.game.echoes.length),0);
  await page.evaluate(()=>echoRunnerDebug.game.pause());await page.locator('#btn-pause-settings').click();await page.locator('#set-sound-enabled').uncheck();assert.equal(await page.evaluate(()=>echoRunnerDebug.game.settings.muted),true);await page.locator('#btn-set-back').click();await page.locator('#btn-pause-levelselect').click();assert.equal(await page.locator('.level-tile').count(),19);
  await page.locator('#forge-back-link').click();assert.ok(page.url().includes('index.html'));
  report.layouts.push({width,height,overflow:false,recording:true,replay:true,pause:true,restart:true});await context.close();
 }
 const context=await browser.newContext();await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked storage');}}));const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'games/echo-runner/');await page.waitForFunction(()=>window.echoRunnerDebug);await page.locator('#btn-begin').click();await page.evaluate(()=>{const g=echoRunnerDebug.game;g._completeRoom();g.saveSettings();});assert.equal(await page.locator('#screen-room-complete').isVisible(),true);report.blockedStorage='passed';await context.close();
 assert.deepEqual(report.errors,[]);await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
