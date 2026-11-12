'use strict';
const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.FORGE_URL||'http://127.0.0.1:8428/';
(async()=>{
 const dir=path.resolve(__dirname,'../../../test-results/tiny-excavator');await fs.mkdir(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report={base,layouts:[],errors:[]};
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('https://hits.sh/**',r=>r.abort());
  await page.goto(base);await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===37);
  for(const filter of ['All','Games','Featured']){
   await page.getByRole('tab',{name:filter,exact:true}).click();assert.equal(await page.locator('#grid [data-game="tiny-excavator"]').count(),1);
  }
  for(const selector of ['#grid [data-game="tiny-excavator"]','#featured-grid [data-game="tiny-excavator"]']){
   const card=page.locator(selector);await card.scrollIntoViewIfNeeded();
   assert.match(await card.textContent(),/nine minerals/);
   const image=card.locator('img');await image.evaluate(async img=>{img.loading='eager';await img.decode();});assert.match(await image.evaluate(img=>img.currentSrc),/pixel\/tiny-excavator.webp/);
   await card.click();await page.waitForURL('**/games/tiny-excavator/index.html');
   assert.match(await page.locator('body').textContent(),/Dig deeper\. Discover more\./);
   if(await page.locator('#btnContinue').isEnabled())await page.locator('#btnContinue').click();else await page.locator('#btnNewGame').click();
   for(let i=0;i<4&&await page.locator('#tutNext').isVisible();i++)await page.locator('#tutNext').click();
   await page.locator('#journalBtn').click();assert.equal(await page.locator('#journalScreen').isVisible(),true);
   assert.match(await page.locator('#journalScreen').textContent(),/Diamond/);
   await page.keyboard.press('Escape');await page.locator('#pauseBtn').click();
   await page.screenshot({path:path.join(dir,`integration-${process.env.FORGE_URL?'public':'local'}-${mobile?'mobile':'desktop'}.png`)});
   await page.locator('a.arcade-link').click();await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===37);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  report.layouts.push({mobile,archive:true,featured:true,filters:true,pixelArt:true,start:true,journal:true,return:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(path.join(dir,`integration-${process.env.FORGE_URL?'public':'local'}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
