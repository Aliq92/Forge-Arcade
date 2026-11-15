// Run against a local static server. No remote resources or test-only game paths.
const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=process.env.JUDGMENT_URL||'http://127.0.0.1:8428/games/button-that-judges-you/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 const report={layouts:[],errors:[],checks:[]};
 try{
  for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,740],[390,667],[844,390],[667,375]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   await page.goto(base);await page.locator('#enter').click();await page.locator('#the-button').blur();
   console.log('Neon layout',width,height);
   const sign=await page.locator('#sigil-sign').boundingBox(),speech=await page.locator('#speech').boundingBox();
   assert.ok(sign.x>=0&&sign.y>=60&&sign.x+sign.width<=width&&sign.y+sign.height<height-50,'sign visible');
   const separated=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
   assert.ok(separated(sign,speech),'sign must not overlap speech');
   assert.equal(await page.locator('#neon-room').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
   const button=await page.locator('#the-button').boundingBox();
   assert.ok(separated(sign,button),'sign must not cover button');
   await page.touchscreen.tap(button.x+button.width/2,button.y+button.height/2);
   assert.equal(await page.evaluate(()=>judgmentDebug.inspect().game.count),1);
   await page.screenshot({path:`test-results/judgment/neon-${width}-${height}.png`});
   await page.evaluate(()=>{judgmentDebug.inspect().game.message=[...Object.values(JudgmentContent.messages).flat(),...Object.values(JudgmentContent.legacy.messages).flat()].sort((a,b)=>b.length-a.length)[0];judgmentDebug.sync();});
   const text=await page.locator('#judgment').boundingBox();
   assert.ok(text.y>=60&&text.y+text.height<=height-55,'long judgment stays above footer');
   assert.ok(separated(sign,text),'long judgment stays clear of sign');
   assert.ok(separated(text,button),'long judgment stays clear of button');
   if(width===1440){
    // Seek the real CSS animation deterministically to sample all six hues.
    const colors=await page.locator('#neon-room').evaluate(e=>{const a=e.getAnimations()[0];a.pause();return [0,1700,3400,5100,6800,8400].map(t=>{a.currentTime=t;return getComputedStyle(e).getPropertyValue('--neon').trim();});});
    assert.equal(new Set(colors).size,6);
    const interpolation=await page.locator('#neon-room').evaluate(e=>{const a=e.getAnimations()[0];a.currentTime=850;return getComputedStyle(e).getPropertyValue('--neon').trim();});
    assert.ok(!colors.includes(interpolation),'palette interpolates between stops');
    assert.ok(await page.locator('.led-panel i').first().evaluate(e=>e.getAnimations().length)>0);
    for(const category of Object.keys(await page.evaluate(()=>JudgmentLogic.CATEGORY_WEIGHTS))){
     const tone=await page.evaluate(category=>{const g=judgmentDebug.inspect().game;g.category=category;g.pressPulse=1;judgmentDebug.sync();const e=document.getElementById('neon-room');return {tone:e.style.getPropertyValue('--reaction'),pulse:e.style.getPropertyValue('--room-pulse')};},category);
     assert.ok(tone.tone.startsWith('#'));assert.equal(tone.pulse,'1');
    }
    for(const id of await page.evaluate(()=>JudgmentLogic.EVENTS.map(e=>e.id))){
     await page.evaluate(id=>judgmentDebug.fire(id),id);
     assert.equal(await page.locator('#chamber').getAttribute('data-event'),id);
     if(['golden','rare','celebration','disco'].includes(id))assert.equal(await page.locator('#neon-room').getAttribute('data-celebrating'),'true');
    }
    await page.evaluate(()=>{judgmentDebug.inspect().game.advance(5);judgmentDebug.sync();});
    assert.equal(await page.locator('#neon-room').getAttribute('data-celebrating'),'false');
    await page.locator('#notes').click();assert.ok(await page.locator('#chamber').evaluate(e=>e.classList.contains('room-paused')));
    const states=await page.locator('.led-panel i').first().evaluate(e=>e.getAnimations().map(a=>a.playState));assert.ok(states.every(s=>s==='paused'));
    await page.locator('#closeNotes').click();
    await page.locator('#effects').click();
    assert.equal(await page.locator('#neon-room').evaluate(e=>e.getAnimations().length),0);
    assert.equal(await page.locator('.led-panel i').first().evaluate(e=>e.getAnimations().length),0);
    await page.locator('#reset').click();await page.locator('#confirmReset').click();
    assert.equal(await page.locator('#neon-room').evaluate(e=>e.style.getPropertyValue('--room-pulse')),'0');
    assert.equal(await page.evaluate(()=>judgmentDebug.inspect().confetti.active.length),0);
    // OS setting takes priority over stored full effects, including live changes.
    await page.locator('#effects').click();await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!judgmentDebug.inspect().game.effects);
    assert.equal(await page.evaluate(()=>judgmentDebug.inspect().game.effects),false);
    await page.locator('#effects').click();assert.equal(await page.evaluate(()=>judgmentDebug.inspect().game.effects),false);
    await page.evaluate(()=>{const r=judgmentDebug.inspect().game.record();r.effects=true;localStorage.setItem(JudgmentLogic.KEY,JSON.stringify(r));});
    await page.reload();await page.locator('#enter').click();
    assert.equal(await page.evaluate(()=>judgmentDebug.inspect().game.effects),false);
    assert.equal(await page.locator('#neon-room').evaluate(e=>e.getAnimations().length),0);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#effects').click();
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
    assert.ok(await page.locator('#sigil-sign').isVisible());
    report.checks.push('six palette stops + interpolation','LED animations','six actual category reactions','all 27 special events','rare lighting cleanup','dialog animation pause','calm effects','OS reduced motion live and persisted','reset cleanup','desktop resize');
   }
   report.layouts.push({width,height,signVisible:true,noSignOverlap:true,touchResponds:true});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);await fs.writeFile('test-results/judgment/neon-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
