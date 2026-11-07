const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const report=[];for(const [width,height] of [[1440,900],[390,844],[320,740]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<500,isMobile:width<500}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.FORGE_URL||'http://127.0.0.1:8428/');await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===37);await page.getByRole('tab',{name:'Experiments',exact:true}).click();
  assert.equal(await page.locator('#grid [data-game="beat-foundry"]').count(),1);const card=page.locator('#grid [data-game="elemental"]');assert.equal(await card.count(),1);
  await card.locator('img').evaluate(async img=>{img.loading='eager';await img.decode();});assert.equal(await card.locator('img').evaluate(img=>img.naturalWidth),960);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#grid').screenshot({path:`test-results/elemental/experiments-${width}.png`});await card.click();await page.waitForFunction(()=>window.elementalDebug);assert.equal(await page.locator('.element-cell').count(),118);
  await page.getByRole('link',{name:'Back to Forge Arcade',exact:true}).click();await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===37);assert.deepEqual(errors,[]);report.push({width,height,section:'Experiments',beatFoundry:true,elemental:true,artwork:true,launch:true,return:true});await context.close();
 }await fs.writeFile('test-results/elemental/gallery-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
