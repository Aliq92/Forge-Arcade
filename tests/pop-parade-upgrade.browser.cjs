const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.ARCADE_TEST_URL||'http://127.0.0.1:8420';
const output='/tmp/pop-parade-upgrade';
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const passed=[],failed=[],errors=[];
  const check=async(name,fn)=>{try{await fn();passed.push(name);}catch(e){failed.push({name,error:e.message});}};
  try{
    fs.mkdirSync(output,{recursive:true});
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.audit={gradients:0,frames:0,writes:0};
      for(const [name,key] of [['createRadialGradient','gradients'],['clearRect','frames']]){
        const original=CanvasRenderingContext2D.prototype[name];
        CanvasRenderingContext2D.prototype[name]=function(...args){window.audit[key]++;return original.apply(this,args);};
      }
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(/popParade_(bestScore|zenBestScore|largestChain)$/.test(key))window.audit.writes++;return original.call(this,key,value);};
    });
    await page.route('**/games/pop-parade/game.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nexport {game,particles,floats,soundCount,atlas};'});});
    await page.goto(base+'/games/pop-parade/index.html');await page.waitForTimeout(500);
    const state=()=>page.evaluate(async()=>{const m=await import('./game.js');return {score:m.game.score,taps:m.game.taps,total:m.game.totalPopped,ended:m.game.ended,paused:m.game.paused,time:m.game.time,particles:m.particles.length,voices:m.soundCount,balloons:m.game.balloons};});
    const tap=async(special)=>{
      const s=await state(),b=s.balloons.find(b=>b.state==='alive'&&(!special||b.special===special));assert.ok(b);
      const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+b.x,box.y+b.y);return b;
    };
    const settle=()=>page.evaluate(async()=>{const {game}=await import('./game.js');for(let i=0;i<900;i++)game.update(1/60);});
    await page.screenshot({path:output+'/portrait.png',fullPage:true});
    const before=await page.evaluate(()=>({...audit}));await page.waitForTimeout(900);const after=await page.evaluate(()=>({...audit}));
    await check('balloon artwork is cached during play',()=>assert.ok(after.gradients-before.gradients<=4,`${after.gradients-before.gradients} gradients rebuilt`));
    await check('mobile controls have 44px targets',async()=>{for(const id of ['pause','sound','restart','classic','zen']){const r=await page.locator('#'+id).boundingBox();assert.ok(r.width>=44&&r.height>=44,`${id}: ${r.width}×${r.height}`);}});
    await page.click('#pause');await page.waitForTimeout(200);const frozen=await page.evaluate(()=>({...audit})),time=(await state()).time;
    await page.waitForTimeout(700);const frozenAfter=await page.evaluate(()=>({...audit}));
    await check('pause stops canvas redraw and simulation',async()=>{assert.equal(frozenAfter.frames,frozen.frames);assert.equal((await state()).time,time);});
    await page.click('#resume');await page.waitForTimeout(100);
    await check('resume wakes rendering',async()=>assert.ok((await page.evaluate(()=>audit.frames))>frozenAfter.frames));
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForTimeout(100);const hiddenFrames=await page.evaluate(()=>audit.frames);await page.waitForTimeout(350);
    await check('hidden documents stop rendering and auto-pause',async()=>{assert.equal(await page.evaluate(()=>audit.frames),hiddenFrames);assert.equal((await state()).paused,true);});
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.click('#resume');
    await page.click('#restart');
    await page.evaluate(async()=>{const {game}=await import('./game.js');game.setBoard(Array.from({length:6},(_,i)=>({x:55+(i%3)*75,y:135+Math.floor(i/3)*75,color:0})),24,105);audit.writes=0;window.origins=[];const onEvent=game.onEvent;game.onEvent=e=>{if(e.type==='pop')origins.push({x:e.balloon.x,y:e.balloon.y});if(e.type==='milestone'||e.type==='clear')origins.push({x:e.x,y:e.y});onEvent(e);};});
    await tap();await page.waitForTimeout(450);
    await check('live chain counter follows actual pops',async()=>{assert.equal(await page.locator('#live-chain-count').count(),1);await page.waitForFunction(()=>Number(document.getElementById('live-chain-count').textContent)>=2,null,{timeout:3000});assert.ok(await page.evaluate(async()=>{const {game}=await import('./game.js');return Number(document.getElementById('live-chain-count').textContent)===Math.max(...[...game.chains.values()].map(c=>c.count));}));assert.equal(await page.locator('#chain-meter').isVisible(),true);});
    await check('confetti retains its real interaction origins',async()=>assert.ok(await page.evaluate(async()=>{const {particles}=await import('./game.js');return particles.length>0&&particles.every(p=>Number.isFinite(p.originX)&&Number.isFinite(p.originY)&&origins.some(b=>Math.hypot(b.x-p.originX,b.y-p.originY)<8));})));
    await page.screenshot({path:output+'/chain.png',fullPage:true});await settle();await page.waitForTimeout(350);
    await check('record writes are batched per reaction',async()=>assert.ok(await page.evaluate(()=>audit.writes<=4),`${await page.evaluate(()=>audit.writes)} storage writes`));
    for(const special of ['lightning','freeze','rainbow']){
      await page.click('#restart');await tap(special);await page.waitForTimeout(150);
      await check(`${special} has readable activation feedback`,async()=>{assert.equal(await page.locator('#special-feedback').count(),1);assert.match(await page.locator('#special-feedback').textContent(),new RegExp(special,'i'));});
      await settle();
    }
    for(let round=0;round<4;round++){
      await page.click('#restart');let guard=0;
      while(!(await state()).ended&&guard++<4){if((await state()).taps>0)await tap();await settle();}
      await check(`Classic round ${round+1} settles correctly`,async()=>{assert.equal((await state()).ended,true);assert.equal(await page.locator('#result-overlay').isVisible(),true);});
    }
    const record=await page.locator('#record').textContent();await page.reload();await page.waitForTimeout(150);
    await check('existing record namespace survives reload',async()=>assert.equal(await page.locator('#record').textContent(),record));
    await page.click('#zen');for(let i=0;i<10;i++){await tap();await settle();}
    await check('Zen remains endless after ten chains',async()=>{assert.equal((await state()).ended,false);assert.ok((await state()).balloons.some(b=>b.state==='alive'));});
    await check('sprite cache remains bounded across repeated rounds',async()=>assert.ok(await page.evaluate(async()=>(await import('./game.js')).atlas.sprites.size<=20)));
    await page.waitForTimeout(3500);await check('effects expire and voices stay bounded',async()=>{assert.equal((await state()).particles,0);assert.ok((await state()).voices<=6);});
    for(const viewport of [{width:320,height:740},{width:844,height:390},{width:1440,height:1000}]){
      await page.setViewportSize(viewport);await page.click('#restart');await page.waitForTimeout(200);
      await check(`${viewport.width}px layout stays playable`,async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await tap();await settle();assert.ok((await state()).total>0);});
      await page.click('#restart');await page.screenshot({path:output+`/layout-${viewport.width}.png`,fullPage:true});
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await tap();await page.waitForTimeout(400);
    await check('reduced motion remains playable',async()=>assert.ok((await state()).total>0));
    await check('no JavaScript errors',()=>assert.deepEqual(errors,[]));
    const report={passed,failed,errors,metrics:{gradientRebuildsDuringPlay:after.gradients-before.gradients,pausedRedraws:frozenAfter.frames-frozen.frames},screenshots:output};
    fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
    if(failed.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
