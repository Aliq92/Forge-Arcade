/* Run against a local static server: node games/apogee/tests/browser.cjs */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const baseUrl=process.env.APOGEE_BASE_URL||'http://127.0.0.1:8765';
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.addInitScript(()=>{window.requestAnimationFrame=()=>1});
await page.goto(baseUrl+'/games/apogee/');
await page.evaluate(()=>{document.querySelectorAll('.faded').forEach(e=>e.classList.remove('faded'));save.isMuted=true;draw()});
assert.equal(await page.locator('#menu').isVisible(),true);
await page.screenshot({path:path.resolve('games/apogee/qa/garage-desktop.png')});
await page.click('#trialsBtn');assert.equal(await page.locator('[data-trial]').count(),12);assert.equal(await page.locator('[data-trial]:disabled').count(),8);
await page.screenshot({path:path.resolve('games/apogee/qa/trials-desktop.png')});
await page.click('[data-trial="teal-ignition"]');assert.match(await page.locator('#trialBrief').textContent(),/Optional/);
await page.click('#startTrialBtn');await page.waitForTimeout(240);
const careerBefore=await page.evaluate(()=>JSON.stringify(save));
await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>trialRun.early),1);
await page.keyboard.press('p');const pausedState=await page.evaluate(()=>{const t=trialRun.elapsed;update(.5);return {paused,unchanged:trialRun.elapsed===t}});assert.deepEqual(pausedState,{paused:true,unchanged:true});
await page.click('#resumeBtn');await page.keyboard.press('r');assert.equal(await page.evaluate(()=>trialRun.early),0);
await page.evaluate(()=>{selectedTrial=ApogeeTrials.trials[3];initFlight();separate();update(1/60);if(!trialRun.failed.includes('EARLY'))throw Error('early failure');restartFlight();flight.fuel=.001;update(.016);if(!flight.endedByExplosion)throw Error('burnout');endRun();if($('trialOutcome').textContent!=='TRY AGAIN')throw Error('failure report');restartFlight();if(trialRun.elapsed!==0||trialRun.seen.length||flight.impacts||flight.endedByExplosion)throw Error('stale restart state')});await page.waitForTimeout(1100);assert.ok(await page.evaluate(()=>state===STATE.FLIGHT),'old explosion callback cannot end restarted flight');
// Fixed-step reference pilot: uses normal fuel thresholds and real steering acceleration.
const referencePilot=()=>{
 const output=[];
 for(const c of ApogeeTrials.trials){
  selectedTrial=c;initFlight();let steps=0,largest=0;
  while(state===STATE.FLIGHT&&steps++<7200){
   if(flight.activeStage>1&&flight.fuel/flight.maxFuel<=(c.id==='unbroken-signal'?.06:.10))separate();
   if(flight.deepSpaceActive){const t=trialRun.seconds;let target=0;
    const gates=c.pattern==='open'?[]:Array.from({length:5},(_,i)=>ApogeeTrials.gate(c,i,t));
    const active=gates.find(g=>g.active||(g.warning&&g.age>1.25));
    if(active)target=active.center;else{
      const b=Array.from({length:4},(_,i)=>({...ApogeeTrials.signal(i),id:i})).find(b=>t>=b.at-.5&&t<b.at+b.duration&&!trialRun.seen.includes('b'+b.id));if(b)target=b.lane;
    }
    flight.pointerSteer=true;flight.steerTarget=target*Math.max(34,W*.38);
   }
   update(window.referenceStep||1/60);largest=Math.max(largest,flight.particles.length);
  }
  if(state===STATE.EXPLODING)endRun();
  output.push({id:c.id,complete:!!trialProgress.records[c.id],mission:!!trialProgress.records[c.id]?.mission,seconds:trialRun.elapsed,coast:trialRun.seconds,alt:trialRun.alt,perfects:trialRun.perfects,beacons:trialRun.beacons,gates:trialRun.gates,impacts:trialRun.impacts,failed:trialRun.failed,particles:largest});
 }
 draw();document.querySelectorAll('.faded').forEach(e=>e.classList.remove('faded'));return output;
};
const runs=await page.evaluate(referencePilot);
console.log(JSON.stringify(runs,null,2));
for(const r of runs){assert.ok(r.complete,r.id+' must have a physics completion path');assert.ok(r.mission,r.id+' optional mission path')}
assert.equal(await page.evaluate(()=>JSON.stringify(save)),careerBefore,'trial runs preserve career save');
await page.waitForTimeout(1050);await page.screenshot({path:path.resolve('games/apogee/qa/completion-desktop.png')});
await page.click('#retryTrialBtn');assert.equal(await page.evaluate(()=>trialRun.elapsed),0);assert.equal(await page.evaluate(()=>flight.impacts),0);
await page.evaluate(()=>{selectedTrial=ApogeeTrials.trials[9];initFlight();for(let i=0;i<270;i++)update(1/60);draw()});
await page.waitForTimeout(1050);await page.screenshot({path:path.resolve('games/apogee/qa/anomaly-gate-desktop.png')});
const failed=await page.evaluate(()=>{flight.x=-W*.38;for(let i=0;i<130&&state===STATE.FLIGHT;i++)update(1/60);return trialRun.failed});assert.match(failed,/Impact/);
await page.evaluate(()=>{trialProgress.equipped='teal-ignition';persistTrials()});await page.reload();assert.equal(await page.evaluate(()=>Object.keys(trialProgress.records).length),12);assert.equal(await page.evaluate(()=>trialProgress.equipped),'teal-ignition');
await page.click('#trialsBtn');await page.selectOption('#insigniaSelect','teal-ignition');await page.screenshot({path:path.resolve('games/apogee/qa/rewards-desktop.png')});await page.click('#closeTrialsBtn');await page.evaluate(()=>{selectedTrial=null;initFlight();flight.fuel=flight.maxFuel*.1});await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>flight.perfects),1);
await page.evaluate(()=>{flight.activeStage=1;flight.alt=65000;flight.vel=1000;update(.016)});await page.keyboard.down('ArrowRight');await page.evaluate(()=>update(.2));await page.keyboard.up('ArrowRight');assert.ok(await page.evaluate(()=>flight.x>0));
assert.ok(await page.evaluate(()=>{const v=flight.vel;flight.impactCooldown=0;impactHazard({x:rocketScreenX(),y:rocketScreenY(),hit:false});return flight.vel<v&&flight.impacts===1}));
const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const touch=await mobile.newPage();touch.on('pageerror',e=>errors.push(e.message));await touch.addInitScript(()=>{window.requestAnimationFrame=()=>1});await touch.goto(baseUrl+'/games/apogee/');await touch.evaluate(()=>{save.isMuted=true;draw()});await touch.tap('#trialsBtn');await touch.screenshot({path:path.resolve('games/apogee/qa/trials-mobile.png')});await touch.tap('[data-trial="sideband-survey"]');await touch.tap('#startTrialBtn');await touch.waitForTimeout(240);await touch.evaluate(()=>{update(.016);draw()});
const cdp=await mobile.newCDPSession(touch);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:450}]});await touch.evaluate(()=>update(.2));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await touch.evaluate(()=>flight.x>0));
await touch.tap('#pauseBtn');assert.ok(await touch.evaluate(()=>paused));await touch.tap('#pauseRestartBtn');assert.equal(await touch.evaluate(()=>trialRun.seconds),0);
await touch.evaluate(()=>{selectedTrial=ApogeeTrials.trials[5];initFlight();for(let i=0;i<210;i++)update(1/60);draw()});await touch.waitForTimeout(1050);await touch.screenshot({path:path.resolve('games/apogee/qa/flight-mobile.png')});
await touch.setViewportSize({width:844,height:390});await touch.waitForTimeout(100);await touch.evaluate(()=>{resize();draw()});await touch.screenshot({path:path.resolve('games/apogee/qa/flight-landscape.png')});assert.ok(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await touch.evaluate(()=>{leaveFlight();selectedTrial=null;initFlight();flight.fuel=flight.maxFuel*.1});await touch.waitForTimeout(240);await touch.touchscreen.tap(400,230);assert.equal(await touch.evaluate(()=>flight.perfects),1);
await touch.setViewportSize({width:390,height:844});await touch.waitForTimeout(100);await touch.evaluate(()=>{window.referenceStep=1/30});const mobileRuns=await touch.evaluate(referencePilot);for(const r of mobileRuns){assert.ok(r.complete,'mobile '+r.id);assert.ok(r.mission,'mobile optional '+r.id)};console.log('PASS: 12 mobile physics paths');
await page.setViewportSize({width:2560,height:1440});await page.waitForTimeout(100);const wideRuns=await page.evaluate(referencePilot);for(const r of wideRuns){assert.ok(r.complete,'wide '+r.id);assert.ok(r.mission,'wide optional '+r.id)};console.log('PASS: 12 wide-desktop physics paths');await page.evaluate(()=>{localStorage.setItem(TRIAL_SAVE_KEY,'{broken')});await page.reload();assert.equal(await page.evaluate(()=>Object.keys(trialProgress.records).length),0);assert.ok(await page.evaluate(()=>save.engine>=1));
const live=await browser.newPage({viewport:{width:1280,height:800}});live.on('pageerror',e=>errors.push(e.message));await live.goto(baseUrl+'/games/apogee/');assert.ok(await live.evaluate(()=>ac===null),'audio stays dormant before interaction');await live.click('#launchBtn');await live.waitForTimeout(600);assert.ok(await live.evaluate(()=>flight.alt>0));await live.screenshot({path:path.resolve('games/apogee/qa/career-flight-desktop.png')});await live.click('#audioBtn');await live.waitForTimeout(350);assert.ok(await live.evaluate(()=>save.isMuted&&(!engGain||engGain.gain.value<.02)),'mute silences running engine');const stagesBefore=await live.evaluate(()=>flight.activeStage);await live.keyboard.press('Space');assert.equal(await live.evaluate(()=>flight.activeStage),stagesBefore-1,'keyboard remains responsive after mute');await live.keyboard.press('p');assert.ok(await live.evaluate(()=>paused));await live.keyboard.press('r');assert.ok(await live.evaluate(()=>!paused&&flight.activeStage===flight.totalStages));
await live.evaluate(()=>{save.isMuted=true});await live.evaluate(()=>selfTest());assert.equal(await live.locator('#test-status').textContent(),'PASS');
if(fs.existsSync('/tmp/games/apogee/index.html')){const baseline=await browser.newPage({viewport:{width:1280,height:800}});await baseline.route('**/baseline-apogee/**',async route=>{const rel=new URL(route.request().url()).pathname.split('/baseline-apogee/')[1]||'index.html';const file=path.resolve('/tmp/games/apogee',rel);if(!file.startsWith('/tmp/games/apogee/'))return route.abort();await route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'})});await baseline.goto(baseUrl+'/baseline-apogee/index.html');await baseline.click('#launchBtn');await baseline.waitForTimeout(600);await baseline.screenshot({path:path.resolve('games/apogee/qa/baseline-career-desktop.png')});}
fs.writeFileSync('games/apogee/qa/playthroughs.json',JSON.stringify({desktop:runs,mobile:mobileRuns,wide:wideRuns},null,2)+'\n');
assert.deepEqual(errors,[]);console.log('PASS: 12 physics playthroughs, desktop/touch controls, selection, pause/restart, failure, collisions, rewards, persistence, career isolation; no page errors.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
