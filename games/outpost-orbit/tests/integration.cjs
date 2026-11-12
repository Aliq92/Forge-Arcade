'use strict';
const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=process.env.FORGE_URL||'http://127.0.0.1:8428/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report={base,layouts:[],errors:[]};
 try{for(const mobile of [false,true]){
  const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.route('https://hits.sh/**',r=>r.abort());
  await p.goto(base);await p.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===37);
  for(const filter of ['All','Simulations','Featured']){await p.getByRole('tab',{name:filter,exact:true}).click();assert.equal(await p.locator('#grid [data-game="outpost-orbit"]').count(),1);}
  assert.equal(await p.locator('[data-game="elemental"]').count(),0);assert.equal(await p.getByRole('link',{name:'Open chemistry lab',exact:true}).count(),1);
  for(const selector of ['#grid [data-game="outpost-orbit"]','#featured-grid [data-game="outpost-orbit"]']){
   const card=p.locator(selector);await card.scrollIntoViewIfNeeded();assert.match(await card.textContent(),/nine missions/);const img=card.locator('img');await img.evaluate(async i=>{i.loading='eager';await i.decode();});assert.match(await img.evaluate(i=>i.currentSrc),/pixel\/outpost-orbit.webp/);
   await card.click();await p.waitForFunction(()=>window.outpost);assert.equal(await p.locator('#frontier-menu').evaluate(d=>d.open),true);
   if(await p.locator('#continue-colony').isVisible())await p.click('#continue-colony');else await p.click('#start-colony');await p.click('[data-speed="0"]');
   await p.click('#mission-chip');assert.match(await p.locator('#panel').textContent(),/Station modules/);assert.equal(await p.locator('[data-upgrade]').count(),5);await p.click('#close-panel');
   await p.click('#settings');await p.click('#save');await p.click('#close-panel');await p.screenshot({path:`test-results/outpost-orbit/integration-${process.env.FORGE_URL?'public':'local'}-${mobile?'mobile':'desktop'}.png`});
   await p.click('#forge-back-link');await p.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===37);assert.equal(await p.locator('#grid .card').count(),36);assert.equal(await p.locator('[data-game="elemental"]').count(),0);
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);report.layouts.push({mobile,archive:true,featured:true,filters:true,pixelArt:true,start:true,modules:true,saveContinue:true,return:true,elementalHidden:true});await c.close();
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(`test-results/outpost-orbit/integration-${process.env.FORGE_URL?'public':'local'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
