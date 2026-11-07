const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.ELEMENTAL_URL||'http://127.0.0.1:8428/games/elemental/',out=path.resolve(process.env.ELEMENTAL_RESULTS||'test-results/elemental'),origin=new URL(base).origin;
(async()=>{await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-unsafe-swiftshader']});const report={layouts:[],errors:[],externalRequests:[],challenges:0};
try{
 for(const [width,height]of [[1440,1000],[768,1024],[390,844],[320,740],[844,390]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<900,isMobile:width<900});const page=await context.newPage();page.on('pageerror',e=>{report.errors.push(e.message);console.error(e.stack);});page.on('console',m=>{if(m.type()==='error'){report.errors.push(m.text());console.error(m.text());}});page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('data:'))report.externalRequests.push(r.url());});
 await page.goto(base);await page.waitForFunction(()=>window.elementalDebug);assert.equal(await page.locator('.element-cell').count(),118);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(out,`periodic-${width}.png`),fullPage:true});
 await page.locator('#element-search').fill('oxygen');assert.equal(await page.locator('.element-cell:not(.dim)').count(),1);await page.locator('[data-z="8"]').click();assert.equal(await page.locator('.element-name').textContent(),'Oxygen');await page.locator('#element-search').fill('');
 await page.locator('#trend').selectOption('electronegativity');assert.ok(await page.locator('.missing').count()>0);
 await page.locator('#category-filter').selectOption('Noble gas');assert.equal(await page.locator('.element-cell:not(.dim)').count(),7);await page.locator('#category-filter').selectOption('all');
 if(!(await page.locator('#element-details').evaluate(el=>el.open)))await page.locator('#element-details>summary').click();
 await page.locator('#compare-element').selectOption('11');await page.locator('#compare').click();assert.ok((await page.locator('#compare-panel').textContent()).includes('Na'));
 await page.locator('[data-module="atom"]').click();await page.locator('#atom-element').selectOption('17');await page.locator('#isotope').selectOption('37');await page.locator('#ion-charge').selectOption('-1');assert.equal(await page.evaluate(()=>elementalDebug.atom.state().a),37);assert.ok((await page.locator('#atom-readout').textContent()).includes('18'));
 await page.locator('#atom-view').selectOption('orbital');assert.ok(await page.locator('.orbital-box').count()>0);await page.screenshot({path:path.join(out,`atom-${width}.png`),fullPage:true});
 await page.locator('[data-module="builder"]').click();await page.waitForFunction(()=>elementalDebug.builder);await page.evaluate(()=>elementalDebug.builder.view.ready);const webgl=await page.evaluate(()=>!elementalDebug.builder.view.fallback);
 await page.locator('#reset-workspace').click();await page.locator('[data-add="H"]').click();await page.locator('[data-add="H"]').click();await page.locator('[data-atom]').nth(0).click();
 await page.locator('#connect').click();assert.ok((await page.locator('#validation').textContent()).includes('SUPPORTED'));
 await page.locator('#bond-order').selectOption('2');await page.locator('#connect').click();assert.ok((await page.locator('#validation').textContent()).includes('INVALID WITHIN MODEL'));await page.locator('#undo').click();
 await page.locator('#remove-bond').click();assert.equal(await page.evaluate(()=>elementalDebug.builder.workspace.graph.bonds.length),0);await page.locator('#undo').click();
 await page.locator('#delete-atom').click();assert.equal(await page.locator('[data-atom]').count(),1);await page.locator('#undo').click();
 await page.locator('#example').selectOption('H2O');await page.locator('#molecule-view').scrollIntoViewIfNeeded();const view=await page.locator('#molecule-view').boundingBox(),yaw=await page.evaluate(()=>elementalDebug.builder.view.targetYaw);
 if(webgl)assert.equal(await page.locator('#molecule-view>svg').isVisible(),false,'SVG fallback must not ghost under WebGL');
 await page.mouse.move(view.x+view.width/2,view.y+view.height/2);await page.mouse.down();await page.mouse.move(view.x+view.width/2+80,view.y+view.height/2+30,{steps:8});await page.mouse.up();assert.notEqual(await page.evaluate(()=>elementalDebug.builder.view.targetYaw),yaw);
 await page.locator('#zoom-in').click();await page.locator('#camera-reset').click();await page.screenshot({path:path.join(out,`molecule-${width}.png`),fullPage:true});
 if(width===1440){
  if(webgl){await page.evaluate(()=>{window.testGL=elementalDebug.builder.view.renderer.getContext().getExtension('WEBGL_lose_context');testGL.loseContext();});await page.waitForFunction(()=>elementalDebug.builder.view.lost);assert.equal(await page.locator('#molecule-view>svg').isVisible(),true);await page.waitForTimeout(250);await page.evaluate(()=>testGL.restoreContext());await page.waitForFunction(()=>!elementalDebug.builder.view.lost);report.contextRecovery=true;}
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await page.evaluate(()=>elementalDebug.builder.view.destroyed),false);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));assert.equal(await page.evaluate(()=>elementalDebug.builder.view.active),true);report.cachedPageLifecycle=true;
  for(let id=1;id<=12;id++){
   if(id===1)await page.locator('#challenge-answer').selectOption('O');
   if(id===2){await page.locator('#atom-element').selectOption('6');await page.locator('#isotope').selectOption('12');await page.locator('#ion-charge').selectOption('0');}
   if(id===3)await page.locator('#isotope-two').selectOption('2');
   if(id===4){await page.locator('#atom-element').selectOption('11');await page.locator('#ion-charge').selectOption('1');}
   if(id===5)await page.locator('#challenge-answer').selectOption('Mg');
   if(id>=6&&id<=10)await page.locator('#example').selectOption(['H2','H2O','CO2','NH3','CH4'][id-6]);
   if(id===11)await page.locator('#challenge-answer').selectOption('three-two');if(id===12)await page.locator('#challenge-answer').selectOption('C2H4');
   await page.locator('#check-challenge').click();assert.equal(await page.evaluate(()=>elementalDebug.progress.completed.length),id,'challenge '+id);if(id<12)await page.locator('#next-challenge').click();
  }
  report.challenges=12;await page.reload();await page.waitForFunction(()=>window.elementalDebug);assert.equal(await page.evaluate(()=>elementalDebug.progress.completed.length),12);
 }
 await page.setViewportSize({width:width>600?600:800,height:height>700?600:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 report.layouts.push({width,height,webgl,table:true,isotope:true,ions:true,bonds:true,undo:true,rotation:true,resize:true});await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}});const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'||type==='webgl')return null;return original.call(this,type,...args);};});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.elementalDebug);await page.locator('[data-module="builder"]').click();await page.waitForFunction(()=>elementalDebug.builder);await page.evaluate(()=>elementalDebug.builder.view.ready);assert.equal(await page.evaluate(()=>elementalDebug.builder.view.fallback),true);assert.ok((await page.locator('#validation').textContent()).includes('SUPPORTED'));await page.screenshot({path:path.join(out,'fallback.png'),fullPage:true});await context.close();report.fallback=true;
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
