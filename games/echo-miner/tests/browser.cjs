const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const out=path.resolve(process.env.ECHO_MINER_RESULTS||'test-results/echo-miner'),base=process.env.FORGE_MINER_URL||'http://127.0.0.1:8428/games/echo-miner/';
(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const report={layouts:[],errors:[],note:'Tremor clocks accelerated through inspection hook; gameplay input uses real keyboard and touch.'};
 try{for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,740],[844,390]]){
  const mobile=width<=844,context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,reducedMotion:width===320?'reduce':'no-preference'});
  await context.addInitScript(()=>{Math.random=()=>.125;localStorage.setItem('echoMiner.v1',JSON.stringify({version:1,settings:{sound:false,vibration:false},byDifficulty:{survey:{bestTimeSeconds:99,highestHaul:8}}}));});
  const page=await context.newPage();page.on('pageerror',e=>{report.errors.push(e.message);console.error('BROWSER ERROR:',e.stack);});page.on('console',m=>{if(m.type()==='error'){report.errors.push(m.text());console.error('CONSOLE:',m.text(),m.location());}});page.on('response',r=>{if(r.status()>=400)console.error('HTTP:',r.status(),r.url());});
  await page.goto(base);await page.bringToFront();await page.locator('#btn-start').click();await page.waitForFunction(()=>__echoMinerDebug().gameState.screen==='playing');
  const game=()=>page.evaluate(()=>__echoMinerDebug().currentRun);assert.equal(await page.locator('#minimap-button').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===320)assert.equal(await page.evaluate(()=>document.body.classList.contains('reduced-motion')),true);
  for(const id of ['btn-scan','btn-pause','btn-map-toggle','btn-map-expand']){const r=await page.locator('#'+id).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,id+' viewport '+width);assert.ok(r.width>=44&&r.height>=44,id+' target');}
  await page.screenshot({path:path.join(out,`chamber-${width}.png`)});
  const before=await page.evaluate(()=>__echoMinerDebug().currentRun.player.x);
  if(mobile){const pad=await page.locator('#move-pad').boundingBox(),session=await context.newCDPSession(page),x=pad.x+40,y=pad.y+pad.height*.6;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});await page.waitForTimeout(220);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.keyboard.down('KeyD');await page.waitForTimeout(220);await page.keyboard.up('KeyD');}
  assert.ok(await page.evaluate(x=>__echoMinerDebug().currentRun.player.x>x+8,before));
  const discovered=await page.evaluate(()=>__echoMinerDebug().currentRun.exploration.indices.length);
  if(mobile)await page.locator('#btn-sonar').tap();else await page.keyboard.press('Space');
  await page.waitForFunction(n=>__echoMinerDebug().currentRun.exploration.indices.length>n+15,discovered);
  if(mobile)await page.locator('#btn-scan').tap();else await page.keyboard.press('KeyC');
  await page.waitForFunction(()=>__echoMinerDebug().currentRun.scanner.serial===1);assert.equal(await page.locator('#btn-scan').isDisabled(),true);
  await page.screenshot({path:path.join(out,`scanner-${width}.png`)});
  await page.locator('#btn-map-toggle').click();assert.equal(await page.locator('#minimap-button').isVisible(),false);await page.locator('#btn-map-toggle').click();
  if(mobile)await page.locator('#minimap-button').tap();else await page.keyboard.press('Tab');
  await page.waitForFunction(()=>__echoMinerDebug().gameState.screen==='map');const frozen=await page.evaluate(()=>JSON.stringify({p:__echoMinerDebug().currentRun.player,t:__echoMinerDebug().currentRun.elapsed,s:__echoMinerDebug().currentRun.scanner}));
  await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>JSON.stringify({p:__echoMinerDebug().currentRun.player,t:__echoMinerDebug().currentRun.elapsed,s:__echoMinerDebug().currentRun.scanner})),frozen);
  await page.screenshot({path:path.join(out,`map-${width}.png`)});await page.locator('#btn-map-close').click();
  const resumedAt=await page.evaluate(()=>__echoMinerDebug().currentRun.elapsed);await page.waitForTimeout(100);assert.ok((await page.evaluate(()=>__echoMinerDebug().currentRun.elapsed))-resumedAt<.3,'map resume must not simulate a backlog');
  await page.evaluate(()=>{const r=__echoMinerDebug().currentRun;r.scanner.cooldownUntil=r.elapsed;});await page.waitForFunction(()=>!document.getElementById('btn-scan').disabled);
  if(mobile)await page.locator('#btn-scan').tap();else await page.keyboard.press('KeyC');await page.waitForFunction(()=>__echoMinerDebug().currentRun.scanner.serial===2);
  await page.evaluate(()=>{const r=__echoMinerDebug().currentRun;r.tremor.nextAt=r.elapsed;});await page.waitForFunction(()=>__echoMinerDebug().currentRun.tremor.phase==='warning');assert.equal(await page.locator('#tremor-warning').isVisible(),true);
  await page.screenshot({path:path.join(out,`warning-${width}.png`)});
  await page.evaluate(()=>{const r=__echoMinerDebug().currentRun;r.tremor.until=r.elapsed;});await page.waitForFunction(()=>__echoMinerDebug().currentRun.tremor.phase==='active');
  const connectivity=await page.evaluate(async()=>{const {floodReachable}=await import('./src/pathfinding.mjs');const r=__echoMinerDebug().currentRun,c=r.tremor.grid||r.cave,seen=floodReachable(c,{x:Math.floor(r.player.x/32),y:Math.floor(r.player.y/32)});return {reachable:seen.size,expected:r.cave.tiles.reduce((a,b)=>a+(b===1),0)-r.tremor.tiles.length};});assert.equal(connectivity.reachable,connectivity.expected);
  await page.screenshot({path:path.join(out,`active-${width}.png`)});
  await page.locator('#btn-pause').click();await page.waitForFunction(()=>__echoMinerDebug().gameState.screen==='paused');const elapsed=await page.evaluate(()=>__echoMinerDebug().currentRun.elapsed);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__echoMinerDebug().currentRun.elapsed),elapsed);
  await page.locator('#btn-resume').click();await page.evaluate(()=>{const r=__echoMinerDebug().currentRun;r.tremor.until=r.elapsed;});await page.waitForFunction(()=>__echoMinerDebug().currentRun.tremor.phase==='recovery');assert.equal(await page.evaluate(()=>__echoMinerDebug().currentRun.tremor.grid),null);
  const seed=await page.evaluate(()=>__echoMinerDebug().currentRun.seed);await page.locator('#btn-pause').click();await page.locator('#btn-restart').click();assert.equal(await page.evaluate(()=>__echoMinerDebug().currentRun.seed),seed);assert.equal(await page.evaluate(()=>__echoMinerDebug().currentRun.scanner.serial),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('echoMiner.v1')).byDifficulty.survey.bestTimeSeconds),99);
  // Controlled close encounter checks the real Hunter contact/outcome path, not a forced screen change.
  await page.evaluate(()=>{const r=__echoMinerDebug().currentRun;Object.assign(r.hunter,{x:r.player.x,y:r.player.y,state:'hunting',awareness:1});});
  await page.waitForFunction(()=>__echoMinerDebug().gameState.screen==='defeat');assert.equal(await page.locator('#screen-defeat').isVisible(),true);
  await page.locator('#btn-defeat-restart').click();await page.waitForFunction(()=>__echoMinerDebug().gameState.screen==='playing');
  await page.locator('#btn-pause').click();await page.locator('#btn-quit').click();await page.locator('#btn-tutorial').click();
  if(mobile)await page.locator('#btn-sonar').tap();else await page.keyboard.press('Space');await page.waitForFunction(()=>__echoMinerDebug().tutorialRun.hunter.state!=='dormant');
  await page.evaluate(()=>{const r=__echoMinerDebug().tutorialRun;r.tremor.nextAt=0;});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>__echoMinerDebug().tutorialRun.tremor.phase),'quiet');
  await page.locator('#btn-map-expand').click();await page.locator('#btn-map-close').click();assert.equal(await page.evaluate(()=>__echoMinerDebug().gameState.screen),'tutorial');
  report.layouts.push({width,height,movement:true,sonar:true,map:true,scanner:true,tremor:true,connectivity,pause:true,restart:true,creature:true,records:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
