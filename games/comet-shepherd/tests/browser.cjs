const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');
const out=path.resolve('test-results/comet-shepherd');
const base=process.env.FORGE_ARCADE_URL||'http://127.0.0.1:8428/';
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report={layouts:[],errors:[],controls:[],progression:[],limitations:['Touch emulation; no physical device measurements.','Accelerated progression uses the same fixed-step game update, not human playtesting.']};
 try{
 for(const [width,height]of [[1440,900],[768,1024],[390,844],[320,740],[844,390]]){
  const mobile=width<=844;const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(base);await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===36);
  await page.locator('#grid [data-game="comet-shepherd"]').click();await page.waitForLoadState('load');await page.bringToFront();await page.waitForFunction(()=>window.game);
  if(width===1440){
   await page.getByRole('button',{name:'HOW TO PLAY',exact:true}).click();await page.getByRole('button',{name:'GOT IT',exact:true}).click();
   await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.locator('#set-reduced').check();await page.getByRole('button',{name:'DONE',exact:true}).click();
   assert.equal(await page.evaluate(()=>game.reducedMotion),true);
   await page.getByRole('button',{name:'BEST RUN',exact:true}).click();await page.getByRole('button',{name:'BACK',exact:true}).click();
  }
  await page.getByRole('button',{name:'CHALLENGE',exact:true}).click();await page.locator('#challenge-seed').fill('browser-route');
  await page.getByRole('button',{name:'BEGIN CHALLENGE',exact:true}).click();await page.waitForFunction(()=>game.state==='playing');
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const selector of ['.objective-panel','#pause-btn',...(mobile?['.steer-controls','.mobile-controls']:[])]){
   const r=await page.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,selector+' out of viewport '+width);
  }
  await page.screenshot({path:path.join(out,`playing-${width}x${height}.png`)});
  if(width===1440){
   const before=await page.evaluate(()=>({vx:game.comet.vx,vy:game.comet.vy,energy:game.comet.energy}));
   await page.keyboard.down('ArrowUp');await page.waitForTimeout(250);await page.keyboard.up('ArrowUp');
   assert.ok(await page.evaluate(vy=>game.comet.vy<vy-5,before.vy));
   await page.mouse.move(700,450);await page.mouse.down();await page.mouse.move(790,410,{steps:4});
   await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>game._previewPts.length>20));await page.mouse.up();await page.waitForTimeout(80);
   assert.ok(await page.evaluate(e=>game.comet.energy<e,before.energy));
   const speed=await page.evaluate(()=>game.comet.speed);await page.keyboard.down('KeyS');await page.waitForTimeout(300);await page.keyboard.up('KeyS');
   assert.ok(await page.evaluate(s=>game.comet.speed<s,speed));report.controls.push('keyboard four-direction nudge, brake, mouse drag preview/correction');
  }
  if(width===390){
   const cdp=await context.newCDPSession(page),r=await page.getByRole('button',{name:'Nudge up',exact:true}).boundingBox();
   const before=await page.evaluate(()=>game.comet.vy);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await page.waitForTimeout(300);
   assert.equal(await page.getByRole('button',{name:'Nudge up',exact:true}).getAttribute('aria-pressed'),'true');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await page.evaluate(v=>game.comet.vy<v-5,before));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:370}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:245,y:320}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
   assert.ok(await page.evaluate(()=>game.input.lastAimVector?.dx>50));
   await page.getByRole('button',{name:'Emergency burst',exact:true}).tap();await page.waitForTimeout(80);
   const burst=await page.evaluate(()=>({cooldown:game.comet.emergencyCooldown,energy:game.comet.energy,state:game.state,aim:game.input.lastAimVector}));
   assert.ok(burst.cooldown>0,JSON.stringify(burst));assert.equal(await page.evaluate(()=>scrollY),0);
   report.controls.push('real emulated touch hold/release, drag correction, emergency burst, no scrolling');
  }
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const paused=await page.evaluate(()=>JSON.stringify({comet:game.comet,stats:game.stats,angle:game.system.planets[0].angle}));
  await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify({comet:game.comet,stats:game.stats,angle:game.system.planets[0].angle})),paused);
  await page.getByRole('button',{name:'RETRY SECTOR',exact:true}).click();assert.equal(await page.locator('#gem-count').textContent(),'0 / 8');
  // Reach the real objective by the safe first-sector coast route; no teleportation.
  const result=await page.evaluate(()=>{for(let i=0;i<2600&&game.state==='playing';i++)game._updatePlaying(1/120);return {state:game.state,gems:game.sectorGems,score:game.stats.gemScore,chickens:game.stats.chickens};});
  assert.equal(result.state,'sector-complete');assert.equal(result.gems,8);assert.equal(result.score,120);assert.equal(result.chickens,0);
  await page.screenshot({path:path.join(out,`complete-${width}.png`)});
  await page.getByRole('button',{name:'NEXT SECTOR',exact:true}).click();await page.locator('.upgrade-card').first().click();
  assert.equal(await page.evaluate(()=>game.systemNumber),2);assert.equal(await page.evaluate(()=>game.stats.gemScore),120);
  // Chicken collision uses the real collision handler; position the optional bonus at the comet.
  const chicken=await page.evaluate(()=>{game.comet.invulnTimer=0;game.comet.previousX=game.comet.x;game.comet.previousY=game.comet.y;Object.assign(game.spaceChicken,{x:game.comet.x,y:game.comet.y,previousX:game.comet.x,previousY:game.comet.y});game._checkCollisions();game._checkCollisions();return {count:game.stats.chickens,score:game.stats.chickenScore,gems:game.sectorGems,active:game.spaceChicken.active};});
  assert.deepEqual(chicken,{count:1,score:150,gems:0,active:false});
  report.progression.push({width,...result,chicken});report.layouts.push({width,height,overflow:false});
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'RESUME',exact:true}).click();
  assert.equal(await page.evaluate(()=>game.state),'playing');
  await page.locator('#forge-back-link').click();assert.ok(page.url().includes('/index.html'));
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.base=base;await fs.writeFile(path.join(out,process.env.FORGE_ARCADE_URL?'public-browser-report.json':'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
