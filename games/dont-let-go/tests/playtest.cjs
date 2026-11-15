/* Run: node games/dont-let-go/tests/playtest.cjs
   Requires Playwright + Chromium. Test-only instrumentation is injected into the
   served HTML; no debug controls or completion shortcuts ship in the game. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.DLG_URL||'http://127.0.0.1:4173/games/dont-let-go/';
const dir=path.resolve(__dirname,'../qa');
const results=[];
const instrument=`
const renderForQA=renderer.render.bind(renderer);
window.__qa={
 snapshot:()=>({state,elapsed,gates:gatesPassed,cubes:cubesDestroyed,perfect:perfectGates,combo,best,x:camera.position.x,y:camera.position.y,z:camera.position.z,selected:selectedChallenge?.id,course:courseObjects.length,hazards:hazardObjects.length,medals:JSON.parse(JSON.stringify(medals)),reduced:reducedMotion(),portalAngle:environment.portals[0].rotation.z,mood:environment.mood,draws:renderer.info.render.calls,geometries:renderer.info.memory.geometries}),
 step(n,pilot=false){
  const old=renderer.render;renderer.render=()=>{};
  for(let i=0;i<n;i++){
   if(pilot&&state==='playing'){
    const goals=[...courseObjects.filter(o=>!o.checked).map(o=>({time:o.time,x:o.x,y:o.kind==='cube'?o.y+.62:o.y})),...hazardObjects.filter(o=>!o.checked).map(o=>({time:o.time,x:o.safeX,y:0}))].sort((a,b)=>a.time-b.time);
    const goal=goals[0]||{x:0,y:0};
    // Drive the actual pointermove handler, without assigning camera or scores.
    const dx=(goal.x-steerTargetX)/.018,dy=-(goal.y-steerTargetY)/.018;
    window.dispatchEvent(new PointerEvent('pointermove',{pointerId:flightPointerId??1,clientX:lastPX+dx,clientY:lastPY+dy}));
   }
   clock.getDelta=()=>1/60;animate();
  }
  renderer.render=old;renderForQA(scene,camera);return this.snapshot();
 },
 render(){renderForQA(scene,camera);},
 isolationProbe(){const before=courseObjects.length+hazardObjects.length;environment.group.visible=false;const hidden=this.collisionProbe();environment.group.visible=true;return {before,after:courseObjects.length+hazardObjects.length,hidden,visible:this.collisionProbe()};},
 collisionProbe(){shipBefore.set(0,0,0);shipAfter.set(0,0,-10);return [shipHitsCube(new THREE.Vector3(0,0,-5)),shipHitsCube(new THREE.Vector3(2,0,-5))];}
};
`;
async function main(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS',name);};
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.route('**/games/dont-let-go/',async route=>{const response=await route.fetch();const source=(await response.text()).replace('updateSector(0);\nresetWorld();\nrenderMissions();',instrument+'\nupdateSector(0);\nresetWorld();\nrenderMissions();');await route.fulfill({response,body:source});});
 await page.goto(base);await page.waitForFunction(()=>window.__qa);
 const snap=()=>page.evaluate(()=>__qa.snapshot());
 const step=(n,pilot=false)=>page.evaluate(([n,p])=>__qa.step(n,p),[n,pilot]);
 await check('startup and local dependency',async()=>{assert.equal((await snap()).state,'start');assert.equal(await page.locator('h1').first().innerText(),"DON'T LET GO");await step(1);await page.waitForTimeout(450);await page.screenshot({path:dir+'/after-desktop.png'});});
 await check('original hold, keyboard steering, release and legacy save',async()=>{
  await page.evaluate(()=>localStorage.setItem('dlg_best_time','123.4'));await page.reload();await page.keyboard.down('Space');await page.keyboard.down('ArrowRight');await step(60);await page.keyboard.up('ArrowRight');assert.ok((await snap()).x>3);await page.keyboard.up('Space');assert.equal((await snap()).state,'gameover');assert.equal((await snap()).best,123.4);
 });
 await check('original gate and swept cube collision',async()=>{assert.deepEqual(await page.evaluate(()=>__qa.collisionProbe()),[true,false]);await page.keyboard.down('Space');await step(960);assert.ok((await snap()).gates>=1);await page.keyboard.up('Space');});
 await check('pause freezes all simulation; resume requires hold; restart resets',async()=>{
  await page.keyboard.down('Space');await step(120);await page.keyboard.press('Escape');const before=await snap();await page.keyboard.up('Space');await step(120);assert.equal((await snap()).elapsed,before.elapsed);assert.equal((await snap()).z,before.z);await page.keyboard.down('Space');await step(30);assert.equal((await snap()).state,'playing');await page.keyboard.press('KeyR');assert.equal((await snap()).elapsed,0);assert.equal((await snap()).state,'start');await page.keyboard.up('Space');
 });
 for(let i=0;i<12;i++)await check(`mission ${i+1}: select, start, real-input completion, medal, replay once`,async()=>{
  if(i===0)await page.click('#chooseMissions');else await page.click('#completeMissions');
  await page.locator('.mission').nth(i).click();
  let s=await snap();assert.equal(s.state,'start');assert.equal(s.elapsed,0);assert.ok(s.course>=3);
  await page.locator('#gl').dispatchEvent('pointerdown',{pointerId:1,clientX:720,clientY:450});
  s=await step(60*47,true);assert.equal(s.state,'complete',JSON.stringify(s));assert.ok(s.medals[s.selected]?.medal);assert.equal(s.best,123.4);
  if([0,6,11].includes(i))await step(1);await page.waitForTimeout(450);await page.screenshot({path:dir+`/complete-${i+1}.png`});
  const medals=JSON.stringify(s.medals);await page.click('#completeRetry');await page.locator('#gl').dispatchEvent('pointerdown',{pointerId:1,clientX:720,clientY:450});s=await step(60*47,true);assert.equal(s.state,'complete');assert.equal(JSON.stringify(s.medals),medals);assert.match(await page.locator('#completeReward').innerText(),/Medal secured/);
 });
 await check('save and reload restores 12 medals without changing legacy record',async()=>{await page.reload();assert.equal(Object.keys((await snap()).medals).length,12);assert.equal((await snap()).best,123.4);});
 await check('hazard warning, collision failure and safe counterplay',async()=>{
  await page.click('#chooseMissions');await page.locator('.mission').nth(4).click();await page.keyboard.down('Space');await page.keyboard.down('ArrowRight');await step(360);await page.keyboard.up('ArrowRight');assert.equal(await page.locator('#eventWarning').isVisible(),true);await step(1);await page.waitForTimeout(450);await page.screenshot({path:dir+'/storm-warning.png'});await step(240);assert.equal((await snap()).state,'gameover');assert.match(await page.locator('#failureReason').innerText(),/Energy front hit/);await page.keyboard.up('Space');
 });
 await check('failure from incomplete objectives',async()=>{await page.click('#overMissions');await page.locator('.mission').nth(9).click();await page.keyboard.down('Space');await step(60*35);assert.equal((await snap()).state,'gameover');assert.match(await page.locator('#failureReason').innerText(),/Route ended/);await page.keyboard.up('Space');});
 await check('reduced motion respects OS and suppresses environmental rotation',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal((await snap()).reduced,true);await step(1);const a=(await snap()).portalAngle;await step(120);assert.equal((await snap()).portalAngle,a);await page.click('#overHome');await page.evaluate(()=>__qa.render());await step(1);await page.waitForTimeout(450);await page.screenshot({path:dir+'/reduced-motion.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('resize and portrait mission scroll',async()=>{
  await page.setViewportSize({width:390,height:844});await page.click('#chooseMissions');assert.equal(await page.locator('.mission').count(),12);await page.locator('.mission').nth(11).scrollIntoViewIfNeeded();await step(1);await page.waitForTimeout(450);await page.screenshot({path:dir+'/mobile-challenges.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.mission').nth(11).click();await step(1);await page.waitForTimeout(450);await page.screenshot({path:dir+'/mobile-portrait.png'});
 });
 await check('touch holding, drag steering, release and landscape layout',async()=>{
  await page.dispatchEvent('#gl','pointerdown',{pointerId:2,pointerType:'touch',clientX:195,clientY:420});await page.dispatchEvent('#gl','pointermove',{pointerId:2,pointerType:'touch',clientX:270,clientY:380});await step(60);assert.ok((await snap()).x>0);await page.dispatchEvent('#gl','pointerup',{pointerId:2,pointerType:'touch'});assert.equal((await snap()).state,'gameover');await page.setViewportSize({width:844,height:390});await page.click('#overHome');await step(1);await page.waitForTimeout(450);await page.screenshot({path:dir+'/mobile-landscape.png'});
 });
 await check('second touch does not release flight; touch pause suspends signal',async()=>{
  await page.dispatchEvent('#gl','pointerdown',{pointerId:2,pointerType:'touch',clientX:400,clientY:200});await step(30);await page.dispatchEvent('#pauseButton','pointerup',{pointerId:3,pointerType:'touch'});assert.equal((await snap()).state,'playing');await page.dispatchEvent('#pauseButton','pointerdown',{pointerId:3,pointerType:'touch'});assert.equal((await snap()).state,'paused');await page.dispatchEvent('#gl','pointerup',{pointerId:2,pointerType:'touch'});assert.equal((await snap()).state,'paused');await page.click('#pauseHome');
 });
 await check('blocked storage does not prevent startup or session rewards',async()=>{
  await page.evaluate(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')};});await page.click('#chooseMissions');await page.locator('.mission').nth(0).click();await page.locator('#gl').dispatchEvent('pointerdown',{pointerId:1,clientX:400,clientY:200});await step(60*20,true);assert.equal((await snap()).state,'complete');assert.match(await page.locator('#completeReward').innerText(),/Storage unavailable/);
 });
 await check('decorative layers are isolated from collision objects',async()=>{const s=await page.evaluate(()=>__qa.isolationProbe());assert.equal(s.before,s.after);assert.deepEqual(s.hidden,s.visible);});
 await check('WASD input, pointer cancel, focus loss and manual motion control',async()=>{
  await page.click('#completeMissions');await page.click('#closeMissions');await page.click('#freeFlight');await page.keyboard.down('Space');await page.keyboard.down('KeyA');await page.keyboard.down('KeyW');await step(60);await page.keyboard.up('KeyA');await page.keyboard.up('KeyW');assert.ok((await snap()).x<-3);assert.ok((await snap()).y>3);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await snap()).state,'paused');await page.keyboard.up('Space');await page.click('#pauseHome');await page.dispatchEvent('#gl','pointerdown',{pointerId:2,clientX:400,clientY:200});await page.dispatchEvent('#gl','pointercancel',{pointerId:2});assert.equal((await snap()).state,'gameover');await page.click('#motionButton');assert.equal((await snap()).reduced,true);
 });
 await check('no browser exceptions',async()=>assert.deepEqual(errors,[]));
 fs.writeFileSync(dir+'/browser-results.json',JSON.stringify({checks:results.length,results,errors},null,2));await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
