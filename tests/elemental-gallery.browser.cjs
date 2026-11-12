const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const report=[];for(const [width,height] of [[1440,900],[390,844],[320,740]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<500,isMobile:width<500}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.FORGE_URL||'http://127.0.0.1:8428/');await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===38);
  for(const filter of ['All','Featured','Games','Simulations','Experiments']){
   await page.getByRole('tab',{name:filter,exact:true}).click();assert.equal(await page.locator('[data-game="elemental"]').count(),0);
  }
  assert.equal(await page.locator('#grid [data-game="beat-foundry"]').count(),1);assert.equal(await page.locator('#footer-count').textContent(),'37');
  const shortcut=page.getByRole('link',{name:'Open chemistry lab',exact:true});assert.equal(await shortcut.count(),1);
  await shortcut.scrollIntoViewIfNeeded();const box=await shortcut.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await shortcut.focus();await page.screenshot({path:`test-results/elemental/secret-${process.env.FORGE_URL?'public':'local'}-${width}.png`});
  if(width<500)await shortcut.tap();else await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.elementalDebug);assert.equal(await page.locator('.element-cell').count(),118);
  await page.getByRole('link',{name:'Back to Forge Arcade',exact:true}).click();await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===38);assert.equal(await page.locator('[data-game="elemental"]').count(),0);assert.deepEqual(errors,[]);report.push({width,height,hiddenInAllFilters:true,beatFoundry:true,flask:true,launch:true,return:true});await context.close();
 }await fs.writeFile('test-results/elemental/gallery-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
