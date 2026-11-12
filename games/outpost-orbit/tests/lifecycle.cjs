const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const base='http://127.0.0.1:8428/games/outpost-orbit/';
(async()=>{
 const original=await import(pathToFileURL(path.resolve('games/outpost-orbit/tests/fixtures/original/simulation.js'))),old=original.create(42);for(let i=0;i<500;i++)original.step(old,.1);
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),report={},errors=[];
 try{
  const c=await browser.newContext({viewport:{width:1440,height:900}});await c.addInitScript(raw=>localStorage.setItem('outpost-orbit-v1',raw),JSON.stringify(old));const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base);await p.waitForFunction(()=>window.outpost);assert.deepEqual(await p.evaluate(()=>outpost.state.aliens),JSON.parse(JSON.stringify(old.aliens)));report.legacy=true;
  await p.click('#continue-colony');await p.click('[data-speed="0"]');await p.click('#cinematic');const before=await p.evaluate(()=>({camera:{...outpost.camera},time:outpost.state.time,frontier:JSON.stringify(outpost.state.frontier)}));await p.waitForTimeout(250);assert.deepEqual(await p.evaluate(()=>({camera:{...outpost.camera},time:outpost.state.time,frontier:JSON.stringify(outpost.state.frontier)})),before);await p.click('#cinematic');report.cinematicPause=true;
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const paused=await p.evaluate(()=>outpost.state.time);await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>outpost.state.time),paused);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await p.evaluate(()=>outpost.state.speed),0);report.visibilityFixture=true;
  await p.click('#settings');await p.click('#return-menu');await p.click('#start-colony');await p.keyboard.press('Escape');await p.waitForFunction(()=>document.getElementById('frontier-menu').open);await p.click('#continue-colony');report.cancelResetFromMenu=true;
  await p.click('[data-speed="0"]');await p.click('#settings');await p.click('#sound');assert.equal(await p.evaluate(()=>outpost.audioState),null);await p.click('#close-panel');await p.click('[data-speed="1"]');await p.evaluate(()=>{outpost.state.latestEvent={kind:'QA',message:'Audio cue test',time:outpost.state.time+1};});await p.waitForFunction(()=>outpost.audioState==='running');await p.click('[data-speed="0"]');await p.waitForFunction(()=>outpost.audioState==='suspended');report.audioGestureAndPause=true;
  const performanceResult=await p.evaluate(async completed=>{
   const {Renderer}=await import('./renderer.js'),{Renderer:OldRenderer}=await import('./tests/fixtures/original/renderer.js');
   const measurements=[];for(const [name,Type]of[['original',OldRenderer],['frontier',Renderer]]){
    const r=new Type(document.createElement('canvas')),s=completed,before=JSON.stringify(s);const times=[],intervals=[];let last=0;
    for(let i=0;i<140;i++){const now=await new Promise(requestAnimationFrame),start=performance.now();r.render(s,now,null,null,1);if(i>=20){times.push(performance.now()-start);intervals.push(now-last);}last=now;}
    times.sort((a,b)=>a-b);intervals.sort((a,b)=>a-b);if(JSON.stringify(s)!==before)throw Error('Renderer changed simulation');measurements.push({name,scene:'completed colony, 1440x900, DPR1, 120 paced draws',mean:times.reduce((a,b)=>a+b)/times.length,median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],frameIntervalP95:intervals[Math.floor(intervals.length*.95)],pixelRatio:r.canvas.width/innerWidth,cacheCanvases:r.sky?1:0});
   }return measurements;
  },JSON.parse(await fs.readFile('test-results/outpost-orbit/completed-colony.json','utf8')));report.performance=performanceResult;await c.close();
  for(const mode of ['malformed','blocked','completed']){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
   if(mode==='malformed')await context.addInitScript(()=>localStorage.setItem('outpost-orbit-v1','{broken'));
   if(mode==='blocked')await context.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
   if(mode==='completed'){const raw=JSON.parse(await fs.readFile('test-results/outpost-orbit/completed-colony.json','utf8'));raw.frontier.acknowledged=false;await context.addInitScript(raw=>localStorage.setItem('outpost-orbit-v1',raw),JSON.stringify(raw));}
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.outpost);
   if(mode==='completed'){
    assert.equal(await page.locator('#frontier-complete').evaluate(d=>d.open),false);await page.click('#continue-colony');await page.waitForFunction(()=>document.getElementById('frontier-complete').open);await page.click('#keep-exploring');assert.equal(await page.evaluate(()=>outpost.state.frontier.acknowledged),true);
   }else{
    if(mode==='malformed')assert.equal(await page.evaluate(()=>localStorage.getItem('outpost-orbit-v1-recovery')),'{broken');await page.click('#start-colony');await page.click('[data-speed="0"]');assert.equal(await page.evaluate(()=>outpost.state.aliens.length),5);
   }
   report[mode]=true;await context.close();
  }
  assert.deepEqual(errors,[]);report.errors=errors;await fs.writeFile('test-results/outpost-orbit/lifecycle-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
