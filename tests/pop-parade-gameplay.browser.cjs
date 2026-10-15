// Browser-only instrumentation appends exports without changing shipped source.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const url = (process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8420') + '/games/pop-parade/';
const artifacts = '/tmp/pop-parade-gameplay-regression';
(async () => {
  fs.mkdirSync(artifacts, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage(), errors = [], checks = [];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/game.js',async route=>{
    const response = await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nexport { game, particles, floats, audio, muted, soundCount, handleEvent };'});
  });
  await page.goto(url); await page.waitForTimeout(250);
  const state = () => page.evaluate(async()=>{
    const m=await import('/games/pop-parade/game.js'),g=m.game;window.currentGame=g;window.gameModule=m;
    return {score:g.score,taps:g.taps,best:g.bestChain,total:g.totalPopped,mode:g.mode,ended:g.ended,paused:g.paused,
      balloons:g.balloons, particles:m.particles.length,floats:m.floats.length,time:g.time,
      muted:m.muted,audio:m.audio?.state,voices:m.soundCount,waves:g.waves.length};
  });
  const tap = async (special) => {
    const s=await state(),b=s.balloons.find(b=>b.state==='alive'&&(!special||b.special===special));
    assert.ok(b,'there is a live target');
    const bounds=await page.locator('canvas').boundingBox();
    await page.mouse.click(bounds.x+b.x,bounds.y+b.y);return b;
  };
  const settle = () => page.evaluate(async()=>{const {game}=await import('/games/pop-parade/game.js');for(let i=0;i<900;i++)game.update(1/60);});
  assert.ok((await state()).balloons.length>=20);checks.push('loads a live board');
  const emptyBefore=(await state()).taps;
  const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+3,box.y+3);
  assert.equal((await state()).taps,emptyBefore);checks.push('missed taps do not consume a turn');
  const first=await tap();await page.waitForFunction(()=>window.currentGame.totalPopped>0);
  const firstState=await state();assert.ok(firstState.total>=1);assert.ok(firstState.particles>0);
  assert.ok(await page.evaluate(async({x,y})=>{const {particles}=await import('/games/pop-parade/game.js');return particles.every(p=>Math.hypot(p.x-x,p.y-y)<100);},first));
  checks.push('pointer pop produces localized confetti and score');
  await page.screenshot({path:path.join(artifacts,'chain.png')});
  assert.equal((await state()).audio,'running');checks.push('WebAudio unlocks after interaction');
  await page.click('#pause');const paused=await state();await page.waitForTimeout(400);const still=await state();
  assert.equal(still.time,paused.time);assert.deepEqual(still.balloons,paused.balloons);assert.equal(still.particles,paused.particles);
  await page.click('#resume');await page.waitForTimeout(100);assert.ok((await state()).time>still.time);checks.push('pause freezes motion, waves, and particles; resume continues');
  await settle();assert.ok((await state()).best>=5);checks.push('same-color chain propagates');
  for(let round=0;round<5;round++){
    if(round)await page.click('#restart');
    let safety=0;
    while(!(await state()).ended && safety++<4){
      if((await state()).taps>0)await tap();await settle();
    }
    assert.equal((await state()).ended,true);assert.equal((await state()).waves,0);
    assert.equal(await page.locator('#result-overlay').isVisible(),true);
    assert.equal(await page.locator('#final-score').textContent(),(await state()).score.toLocaleString('en-US'));
  }
  checks.push('five Classic rounds end after reactions settle, results match scores');
  await page.screenshot({path:path.join(artifacts,'results.png')});
  const bestSaved=await page.evaluate(()=>Number(localStorage.getItem('popParade_bestScore')));
  assert.ok(bestSaved>0);await page.reload();await page.waitForTimeout(150);
  assert.equal((await state()).score,0);assert.equal(await page.locator('#record').textContent(),bestSaved.toLocaleString('en-US'));
  assert.ok(Number(await page.locator('#best-chain').textContent())>=5);checks.push('best score and largest chain survive reload');
  await page.click('#sound');assert.equal((await state()).muted,true);
  await page.reload();await page.waitForTimeout(100);assert.equal((await state()).muted,true);
  await page.click('#sound');assert.equal((await state()).muted,false);checks.push('mute toggle and sound preference persistence');
  await page.click('#zen');
  for(let i=0;i<12;i++){await tap();await settle();assert.equal((await state()).ended,false);assert.ok((await state()).balloons.some(b=>b.state==='alive'));}
  assert.ok((await state()).total>30);checks.push('Zen survives twelve chains with automatic replenishment');
  await page.reload();await page.waitForTimeout(100);assert.equal((await state()).mode,'zen');checks.push('preferred mode survives reload');
  for(const special of ['lightning','freeze','rainbow']){
    await page.click('#restart');
    await page.evaluate(async special=>{const {game}=await import('/games/pop-parade/game.js');window.lastSpecial=null;const onEvent=game.onEvent;game.onEvent=e=>{if(e.type==='pop'&&e.balloon.special===special)window.lastSpecial={wave:{...game.waves.at(-1)},range:game.range,frozen:game.balloons.filter(b=>b.frozenUntil>game.time).length};onEvent(e);};},special);
    await tap(special);await page.waitForFunction(()=>window.lastSpecial!==null);
    const details=await page.evaluate(()=>window.lastSpecial);
    assert.ok(details.wave,`${special} has its own shockwave`);
    if(special==='lightning')assert.ok(details.wave.max>details.range*1.8);
    if(special==='rainbow')assert.equal(details.wave.rainbow,true);
    if(special==='freeze')assert.ok(details.frozen>0);
    await settle();
  }
  checks.push('all three specials activate from real pointer input');
  await page.waitForFunction(()=>window.gameModule.particles.length===0,null,{timeout:6000});assert.equal((await state()).particles,0);assert.equal((await state()).floats,0);checks.push('particles and floating scores expire');
  // Controlled long chain exercises milestone feedback and the all-clear path.
  await page.click('#classic');
  await page.evaluate(async()=>{const {game}=await import('/games/pop-parade/game.js');game.setBoard(Array.from({length:30},(_,i)=>({x:150+i%6*50,y:150+Math.floor(i/6)*50,color:0})),22,78);});
  await tap();await settle();assert.equal((await state()).total,30);assert.equal((await state()).ended,true);
  assert.match(await page.locator('#chain-callout').textContent(),/clean sweep/);assert.ok((await state()).particles<=650);checks.push('25-chain milestone, full clear bonus, and particle bound');
  await page.click('#restart');assert.equal((await state()).score,0);assert.equal((await state()).taps,3);assert.equal((await state()).particles,0);checks.push('restart resets score, taps, effects, and overlays');
  const liveCount=(await state()).balloons.length;
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(150);
    assert.equal((await state()).balloons.length,liveCount);
    const s=await state();for(let i=0;i<s.balloons.length;i++)for(let j=i+1;j<s.balloons.length;j++){
      const a=s.balloons[i],b=s.balloons[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>30);
    }
  }
  checks.push('live boards reflow across repeated portrait and landscape resizing without losing balloons');
  for(const viewport of [{width:390,height:844},{width:320,height:740},{width:844,height:390},{width:1280,height:720}]){
    await page.setViewportSize(viewport);await page.click('#restart');await page.waitForTimeout(100);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
    const size=await page.locator('canvas').boundingBox();
    for(const b of (await state()).balloons){assert.ok(b.x-b.r>=0&&b.x+b.r<=size.width);assert.ok(b.y-b.r*1.14>=0&&b.y+b.r*1.14<=size.height);}
    await tap();await settle();assert.ok((await state()).total>0);
    await page.click('#restart');
    await page.screenshot({path:path.join(artifacts,`layout-${viewport.width}.png`),fullPage:true});
  }
  checks.push('320px and 390px portrait, 844px landscape, and laptop layouts remain playable without overflow');
  await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await settle();assert.ok((await state()).total>0);
  await page.keyboard.press('p');assert.equal((await state()).paused,true);await page.keyboard.press('p');assert.equal((await state()).paused,false);
  checks.push('keyboard selection, pop, and pause shortcuts work');
  // A real touch context also checks Pointer Events (mouse emulation alone does not).
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const tp=await touch.newPage();await tp.route('**/game.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nexport { game };'});});
  await tp.goto(url);const target=await tp.evaluate(async()=>{const {game}=await import('/games/pop-parade/game.js');window.touchGame=game;return game.balloons[0];});
  const tb=await tp.locator('canvas').boundingBox();await tp.touchscreen.tap(tb.x+target.x,tb.y+target.y);await tp.waitForFunction(()=>window.touchGame.totalPopped>0);
  assert.ok(await tp.evaluate(async()=>(await import('/games/pop-parade/game.js')).game.totalPopped>0));checks.push('mobile touch input pops balloons');
  assert.deepEqual(errors,[]);checks.push('no browser console or JavaScript errors');
  const report={passed:checks.length,checks,errors};fs.writeFileSync(path.join(artifacts,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
