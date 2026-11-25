const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {serve}=require('../../axiom/tests/preview.cjs');
const {LEVELS}=require('../challenges.js');
const out=path.resolve(process.env.ELEMENTERRA_QA_DIR||path.join(__dirname,'../../../test-results/elementerra'));fs.mkdirSync(out,{recursive:true});
// The existing Arcade visit counter is independent of local gameplay.
function stubVisitCounter(context){
  return context.route('https://hits.sh/aliq92.github.io/Forge-Arcade.svg?*',route=>
    route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}));
}
(async()=>{const server=await serve(8473,path.resolve(__dirname,'../../..'));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,ignoreDefaultArgs:["--disable-back-forward-cache"]});const report={layouts:[],errors:[],challenges:[],performance:[]};
try{
for(const [width,height,mobile] of [[320,568,true],[360,640,true],[393,852,true],[412,915,true],[667,375,true],[768,1024,true],[1920,1080,false]]){
console.log('Layout',width,height);const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,reducedMotion:width===320?'reduce':'no-preference'}),page=await context.newPage();await stubVisitCounter(context);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await page.goto('http://127.0.0.1:8473/games/particle-lab/');await page.waitForFunction(()=>window.particleLabDebug);assert.match(await page.title(),/ELEMENTERRA/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===320)assert.equal(await page.evaluate(()=>particleLabDebug.inspect().reducedMotion),true);
if(width===667)assert.equal(await page.evaluate(()=>{
  const canvas=document.querySelector('#sim').getBoundingClientRect();
  const pause=document.querySelector('#pause').getBoundingClientRect();
  return canvas.bottom<=innerHeight&&pause.bottom<=innerHeight;
}),true,'landscape canvas and pause are both visible on entry');
const state=()=>page.evaluate(()=>particleLabDebug.inspect());await page.locator('#pause').click();
async function openPalette(){if(await page.locator('#paletteBody').isHidden())await page.locator('#paletteToggle').click();}
await openPalette();
async function draw(x,y,x2=x,y2=y){await page.locator('#sim').scrollIntoViewIfNeeded();const box=await page.locator('#sim').boundingBox(),p=(xx,yy)=>({x:box.x+(xx+.5)/96*box.width,y:box.y+(yy+.5)/64*box.height});const a=p(x,y),b=p(x2,y2);if(mobile){const cd=await context.newCDPSession(page);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});if(width===320){
  await page.locator('#sim').dispatchEvent('pointercancel',{pointerType:'touch',pointerId:999});
}await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();}}
await page.locator('[data-material="3"]').click();await page.locator('[data-tool="line"]').click();await draw(20,40,70,40);assert.ok((await state()).world.cells.filter(v=>v===3).length>=50);const frozen=(await state()).world;await page.waitForTimeout(150);assert.deepEqual((await state()).world,frozen);await page.locator('#step').click();assert.equal((await state()).world.tick,frozen.tick+1);await page.locator('#undo').click();assert.ok((await state()).world.cells.filter(v=>v===3).length<10);
await page.locator('[data-material="8"]').click();await page.locator('[data-tool="rect"]').click();await draw(30,30,35,35);assert.ok((await state()).world.cells.includes(8));await page.locator('[data-tool="heat"]').click();await page.locator('#brush').fill('6');await draw(33,33);await page.locator('#step').click();assert.ok((await state()).world.stats.melted>0);await page.locator('[data-tool="inspect"]').click();await draw(33,33);assert.match(await page.locator('#cursorReadout').innerText(),/°C/);
await page.locator('#save').click();const saved=(await state()).world;await page.locator('#clear').click();await page.locator('#load').click();assert.deepEqual((await state()).world,saved);const beforeImport=(await state()).world;await page.locator('#importFile').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});assert.deepEqual((await state()).world,beforeImport);assert.match(await page.locator('#status').innerText(),/compatible/);
await page.locator('#challengeMode').click();assert.equal((await state()).session.index,0);assert.equal((await state()).running,false);await page.locator('#levelSelect').click();assert.equal(await page.locator('[data-level="1"]').isDisabled(),true);await page.locator('#closeLevels').click();await page.locator('#hintToggle').click();assert.match(await page.locator('#hint').innerText(),/recipe/);await page.locator('[data-tool="line"]').click();await draw(36,12,59,12);await page.locator('#speed').selectOption('4');await page.locator('#pause').click();await page.waitForFunction(()=>particleLabDebug.inspect().session.status==='won',{timeout:10000});assert.equal(await page.locator('#completion').isVisible(),true);assert.ok((await state()).completed.includes(0));await page.locator('#nextLevel').click();assert.equal((await state()).session.index,1);await page.locator('#reset').click();assert.equal((await state()).world.tick,0);assert.equal((await state()).session.edits,0);await page.locator('#sandboxMode').click();assert.deepEqual((await state()).world,saved);await page.reload();assert.ok((await state()).completed.includes(0));
await page.locator('#help').click();assert.match(await page.locator('#tourTitle').innerText(),/Make/);await page.locator('#pause').click();await draw(40,45);assert.match(await page.locator('#tourTitle').innerText(),/Freeze/);await page.locator('#tourClose').click();const beforeRotate=(await state()).world;await page.setViewportSize({width:height,height:width});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual((await state()).world,beforeRotate);await page.setViewportSize({width,height});
await openPalette();
await page.locator('#brush').fill('0');
await page.locator('[data-tool="brush"]').click();
await draw(8,10,85,10);
const painted=(await state()).world;
assert.ok(painted.cells.slice(968,1046).every(value=>value===1),'fast sweep paints every cell');
await page.locator('[data-tool="erase"]').click();
await draw(8,10,85,10);
assert.ok((await state()).world.cells.slice(968,1046).every(value=>value===0),'fast sweep erases without gaps');
await page.locator('#paletteToggle').click();
assert.equal(await page.locator('#paletteBody').isHidden(),true);
await page.locator('#template').selectOption('basin');await page.locator('#pause').click();await page.waitForTimeout(400);report.performance.push({width,...(await state()).performance});await page.screenshot({path:path.join(out,`sandbox-${width}.png`),fullPage:true});await page.evaluate(()=>{window.addEventListener("pageshow",e=>window.__restored=e.persisted);});await page.locator("#forge-back-link").click();await page.evaluate(()=>history.back());await page.waitForFunction(()=>window.particleLabDebug);if((await state()).running)await page.locator("#pause").click();const restoredTick=(await state()).world.tick;await page.locator("#step").click();assert.equal((await state()).world.tick,restoredTick+1);await openPalette();await page.getByRole("button",{name:"Sand",exact:true}).click();await page.locator("[data-tool=brush]").click();await draw(10,10);assert.ok((await state()).world.cells.includes(1));report.layouts.push({width,height,touch:mobile,passed:true,bfcacheRestored:await page.evaluate(()=>window.__restored===true)});await context.close();}
// Challenge solution recipes use actual visible toolbar, pointer gestures and simulation controls.
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();await stubVisitCounter(context);page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:8473/games/particle-lab/');await page.locator('#challengeMode').click();
for(let index=0;index<LEVELS.length;index++){const level=LEVELS[index];for(const a of level.solution){if(a.wait){await page.locator('#speed').selectOption('4');if(!await page.evaluate(()=>particleLabDebug.inspect().running))await page.locator('#pause').click();const start=await page.evaluate(()=>particleLabDebug.inspect().world.tick);await page.waitForFunction(({target})=>{const s=particleLabDebug.inspect();return s.world.tick>=target||s.session.status!=='playing';},{target:start+a.wait},{timeout:20000});if(await page.evaluate(()=>particleLabDebug.inspect().running))await page.locator('#pause').click();}else{if(a.material!=null)await page.locator(`[data-material="${a.material}"]`).click();await page.locator(`[data-tool="${a.tool}"]`).click();await page.locator('#brush').fill(String(a.radius||0));await page.locator('#sim').scrollIntoViewIfNeeded();const box=await page.locator('#sim').boundingBox(),p=(x,y)=>({x:box.x+(x+.5)/96*box.width,y:box.y+(y+.5)/64*box.height});const from=p(a.x,a.y),to=p(a.x2??a.x,a.y2??a.y);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:5});await page.mouse.up();}}
const s=await page.evaluate(()=>particleLabDebug.inspect());assert.equal(s.session.status,'won',level.name+' visible-tool recipe: '+s.session.progress);report.challenges.push({name:level.name,ticks:s.world.tick,edits:s.session.edits});await page.screenshot({path:path.join(out,`challenge-${index+1}.png`),fullPage:true,animations:'disabled'});if(index<11)await page.locator('#nextLevel').click();}
await context.close();
const legacy=await browser.newContext();
await stubVisitCounter(legacy);
const legacyPage=await legacy.newPage();
legacyPage.on('pageerror',e=>report.errors.push(e.message));
const { World, ID }=require('../materials.js');
const { encode, KEY, PROGRESS_KEY }=require('../experiment.js');
const legacyWorld=new World();
legacyWorld.paint(30,40,ID.metal,3);
legacyWorld.paint(37,40,ID.water,2);
legacyWorld.paint(42,42,ID.lava,2);
const raw=encode(legacyWorld), progress=JSON.stringify({version:2,completed:[0,1,2]});
await legacyPage.addInitScript(({key,raw,progressKey,progress})=>{
  if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);
  if(localStorage.getItem(progressKey)===null)localStorage.setItem(progressKey,progress);
},{key:KEY,raw,progressKey:PROGRESS_KEY,progress});
await legacyPage.goto('http://127.0.0.1:8473/');
const card=legacyPage.locator('.card[data-game="particle-lab"]');
assert.equal(await card.count(),1);
assert.equal(await card.locator('.card-title').innerText(),'ELEMENTERRA');
assert.equal(await card.getAttribute('href'),'games/particle-lab/index.html');
await card.scrollIntoViewIfNeeded();
await legacyPage.waitForFunction(()=>{
  const image=document.querySelector('.card[data-game="particle-lab"] img');
  return image?.complete&&image.naturalWidth===960&&image.currentSrc.includes('.webp');
});
await card.click();
await legacyPage.locator('#menuOpen').click();
await legacyPage.screenshot({path:path.join(out,'menu.png')});
await legacyPage.locator('#quality').selectOption('low');
await legacyPage.locator('#rate').selectOption('1');
await legacyPage.locator('#menuContinue').click();
assert.deepEqual(await legacyPage.evaluate(()=>particleLabDebug.inspect().world),legacyWorld.export());
assert.equal(await legacyPage.evaluate(key=>localStorage.getItem(key),KEY),raw);
for(const quality of ['low','auto','high']){
  await legacyPage.locator('#menuOpen').click();
  await legacyPage.locator('#quality').selectOption(quality);
  await legacyPage.locator('form button[aria-label="Close menu"]').click();
  await legacyPage.locator('#load').click();
  await legacyPage.locator('#step').click();
  assert.deepEqual(await legacyPage.evaluate(()=>particleLabDebug.inspect().world),legacyWorld.clone().step().export());
}
await legacyPage.reload();
assert.equal(await legacyPage.evaluate(()=>particleLabDebug.inspect().quality),'high');
assert.equal(await legacyPage.locator('#rate').inputValue(),'1');
await legacyPage.locator('#challengeMode').click();
assert.equal(await legacyPage.evaluate(()=>particleLabDebug.inspect().session.index),3);
assert.equal(await legacyPage.evaluate(key=>localStorage.getItem(key),PROGRESS_KEY),progress);
report.compatibility={legacySave:true,legacyProgress:true,qualityParity:true,arcadeCard:true};
await legacy.close();
const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.getItem=function(){throw Error('blocked');};Storage.prototype.setItem=function(){throw Error('blocked');};});const bp=await blocked.newPage();await bp.goto('http://127.0.0.1:8473/games/particle-lab/');await bp.locator('#save').click();assert.match(await bp.locator('#status').innerText(),/storage/);await bp.locator('#load').click();assert.match(await bp.locator('#status').innerText(),/storage/);await blocked.close();assert.deepEqual(report.errors,[]);report.passed=true;fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
