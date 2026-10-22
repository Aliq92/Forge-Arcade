// Real game systems at fixed timesteps; inputs only, no resource/terrain grants.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 const errors=[];
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  // Seed chance only: all movement, spending, growth, weather and rewards stay real.
  await page.addInitScript(() => {
    let seed=12345;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  });
  await page.route('**/js/main.js*',async route=> {
   const response=await route.fetch();
   await route.fulfill({response,body:(await response.text()).replaceAll('requestAnimationFrame(loop);','/* test drives fixed timesteps */')});
  });
  await page.goto((process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8431')+'/games/starfall-garden/');
  await page.locator('#btn-howto').click();
  assert.equal(await page.locator('.howto-section').count(),3);
  assert.equal(await page.locator('#plant-guide .guide-plant').count(),4);
  await page.screenshot({path:'/tmp/starfall-help-desktop.png'});
  await page.locator('#btn-howto-close').click();
  await page.locator('#btn-begin').click();
  await page.keyboard.down('d');
  await page.evaluate(()=>{for(let i=0;i<10;i++) __starfallGame.update(.05)});
  await page.keyboard.up('d');
  assert.ok(await page.evaluate(()=>__starfallGame.player.x>30));
  const result=await page.evaluate(()=>{
   const g=__starfallGame, ids=['glowgrass','starflower','luminatree','shieldbloom'];
   const key=(code)=>{window.dispatchEvent(new KeyboardEvent('keydown',{code}));window.dispatchEvent(new KeyboardEvent('keyup',{code}));};
   const setMovement=(dx,dy)=> {
    for(const [code,on] of [['KeyD',dx>.12],['KeyA',dx<-.12],['KeyS',dy>.12],['KeyW',dy<-.12]]) {
     if(g.input.keys.has(code)!==on) window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code}));
    }
   };
   let target=null, impacts=0,maxScorched=0,spent=0,treeDrops=0;
   const original=g.resources.spawnBonusAt.bind(g.resources);
   g.resources.spawnBonusAt=(...args)=>{if(args[2]==='common')treeDrops++;return original(...args)};
   const impact=g.meteors._impact.bind(g.meteors);
   g.meteors._impact=(...args)=>{impacts++;return impact(...args)};
   const wanted=['glowgrass','glowgrass','starflower','luminatree','shieldbloom','glowgrass','starflower','shieldbloom'];
   for(let frame=0;frame<18000 && g.state!=='victory' && g.state!=='gameover';frame++) {
    if(g.state==='upgrade') {key('Digit1');continue;}
    const plants=g.world.patches.filter(p=>p.plant?.alive);
    const missing=ids.find(id=>!plants.some(p=>p.plant.type===id));
    const species=missing || wanted[plants.length%wanted.length];
    const cfg=SG.PLANT_TYPES[species];
    const cost=Math.max(1,Math.round(cfg.cost*g.player.plantCostMul));
    const needPlant=plants.length<8 || missing;
    const here=g.world.patchAtLocal(g.player.x,g.player.y);
    const before=g.player.fragments;
    if(needPlant && g.player.fragments>=cost && here && !here.plant && g.world.isUnlocked(here)) {
     key('Digit'+(ids.indexOf(species)+1));
     if(g.world.canRestore(here) && g.player.fragments>=cost+2) key('KeyE');
     if(SG.Plants.canPlant(here)) key('KeyE');
    }
    spent+=Math.max(0,before-g.player.fragments);
    const hazards=g.meteors.meteors.filter(m=>m.state==='warning'||m.state==='falling');
    const danger=hazards.find(m=>Math.hypot(m.x-g.player.x,m.y-g.player.y)<m.impactRadius+22);
    if(danger) {
     const dx=g.player.x-danger.x,dy=g.player.y-danger.y,d=Math.hypot(dx,dy)||1;
     target={x:g.player.x+dx/d*80,y:g.player.y+dy/d*80};
    } else if(!target || Math.hypot(target.x-g.player.x,target.y-g.player.y)<10 || frame%30===0) {
     const candidates=needPlant && g.player.fragments>=cost+2 ? g.world.patches.filter(p=>g.world.isUnlocked(p)&&!p.plant&&p.state!=='scorched') : g.resources.fragments.filter(f=>f.landed&&!f.magnetized);
     target=candidates.slice().sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0] || {x:0,y:0};
    }
    const dx=target.x-g.player.x,dy=target.y-g.player.y,d=Math.hypot(dx,dy)||1;
    setMovement(dx/d,dy/d);
    g.update(.05);
    maxScorched=Math.max(maxScorched,g.world.scorchEvents);
    if(frame%20===0) g.render(.05);
   }
   setMovement(0,0);g.render(.05);
   return {state:g.state,time:g.elapsedTime,restoration:g.world.restoreAreaPercent(),plants:g.objectives.matureCount,completed:g.objectives.completed,missing:g.objectives.missing,fragments:g.player.fragments,collected:g.runStats.fragmentsCollected,spent,treeDrops,impacts,maxScorched,nights:g.meteors.cyclesCompleted,health:g.player.health};
  });
  console.log(JSON.stringify(result,null,2));
  assert.ok(result.time >= 111.9*1.15,'longer sanctuary journey');
  assert.equal(result.state,'victory'); assert.equal(result.restoration,100); assert.ok(result.plants>=6);
  assert.ok(result.impacts>0);assert.ok(result.maxScorched>0);assert.ok(result.treeDrops>0);assert.ok(result.spent>30);assert.ok(result.collected>0);
  fs.mkdirSync('/tmp/starfall-evidence',{recursive:true});
  assert.ok(await page.locator('#victory-confetti .confetti-piece').count()>30,'victory confetti');
  // Seek CSS animation only to inspect the visible shower, without changing progress.
  await page.locator('#victory-confetti').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.currentTime=2500));
  await page.screenshot({path:'/tmp/starfall-evidence/victory.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.confetti-piece').first().evaluate(el=>getComputedStyle(el).animationName),'confetti-glow');
  await page.evaluate(()=>{__starfallGame.ui.save.settings.reducedMotion=true;__starfallGame.ui.celebrate();});
  assert.equal(await page.locator('#victory-confetti .confetti-piece').count(),12);
  assert.equal(await page.locator('.confetti-piece').first().evaluate(el=>getComputedStyle(el).animationName),'confetti-glow');
  await page.screenshot({path:'/tmp/starfall-evidence/victory-reduced.png'});
  await page.locator('#btn-endless-continue').click();
  assert.equal(await page.evaluate(()=>__starfallGame.endlessMode),true);
  assert.equal(await page.locator('#victory-confetti .confetti-piece').count(),0);
  await page.evaluate(()=>__starfallGame.render(.05));
  await page.screenshot({path:'/tmp/starfall-evidence/sanctuary.png'});
  await page.locator('#btn-pause').click();await page.locator('#btn-pause-restart').click();
  assert.deepEqual(await page.evaluate(()=>__starfallGame.objectives.completed),[false,false,false,false]);
  assert.equal(await page.evaluate(()=>__starfallGame.world.restoredCount),0);
  assert.equal(await page.evaluate(()=>__starfallGame.player.fragments),30);
  // Mobile touch controls: multi-touch movement + dash, then restore + plant.
  for(const size of [{width:375,height:812},{width:320,height:667},{width:812,height:375}]) {
   const mobile=await browser.newPage({viewport:size,hasTouch:true,isMobile:true});
   mobile.on('pageerror',e=>errors.push(e.message));
   mobile.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await mobile.goto((process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8431')+'/games/starfall-garden/');
   await mobile.locator('#btn-howto').tap();
   assert.equal(await mobile.locator('#plant-guide .guide-plant').count(),4);
   assert.equal(await mobile.locator('#forge-back-link').isVisible(),false);
   assert.ok(await mobile.locator('.howto-panel').evaluate(el=>el.scrollWidth<=el.clientWidth));
   await mobile.screenshot({path:`/tmp/starfall-help-${size.width}.png`});
   const helpTouch=await mobile.context().newCDPSession(mobile);
   const body=await mobile.locator('.howto-body').boundingBox();
   const swipeX=body.x+body.width/2,swipeY=body.y+body.height*.8;
   await helpTouch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:swipeX,y:swipeY,id:1}]});
   for(let i=1;i<=8;i++) await helpTouch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipeX,y:swipeY-body.height*.65*i/8,id:1}]});
   await helpTouch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await mobile.waitForFunction(()=>document.querySelector('.howto-body').scrollTop>0);
   await mobile.locator('.howto-body').evaluate(el=>el.scrollTop=el.scrollHeight);
   await mobile.screenshot({path:`/tmp/starfall-help-goals-${size.width}.png`});
   await mobile.locator('#btn-howto-close').tap();
   await mobile.locator('#btn-begin').tap();
   await mobile.locator('.plant-slot').nth(2).tap();
   await mobile.waitForFunction(()=>document.querySelector('#plant-detail').textContent.includes('Lumina Tree · 14'));
   assert.match(await mobile.locator('#plant-detail').innerText(),/Lumina Tree.*14/);
   await mobile.locator('.plant-slot').first().tap();
   const client=await mobile.context().newCDPSession(mobile);
   const joy=await mobile.locator('#joystick-zone').boundingBox(),dash=await mobile.locator('#btn-mobile-dash').boundingBox();
   const finger={x:joy.x+joy.width*.72,y:joy.y+joy.height/2,id:1};
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});
   await mobile.waitForFunction(()=>__starfallGame.player.x>5);
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,{x:dash.x+dash.width/2,y:dash.y+dash.height/2,id:2}]});
   await mobile.waitForFunction(()=>__starfallGame.player.energy<99);
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await mobile.locator('#btn-mobile-interact').tap();
   await mobile.locator('#btn-mobile-interact').tap();
   await mobile.waitForFunction(()=>__starfallGame.world.plantsAlive===1);
   await mobile.locator('.objective-tracker summary').tap();
   assert.match(await mobile.locator('#objective-list').innerText(),/six mature/);
   for(const selector of ['#plant-detail','#plant-tray','#btn-mobile-dash','#btn-mobile-interact','#joystick-zone','.objective-tracker']) {
    const box=await mobile.locator(selector).boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,selector);
   }
   const arcade=await mobile.locator('#forge-back-link').boundingBox();
   assert.ok(arcade.y+arcade.height<=dash.y,'Arcade link clear of dash');
   await mobile.screenshot({path:`/tmp/starfall-evidence/mobile-${size.width}.png`});
   await mobile.close();
  }
  assert.deepEqual(errors,[]);console.log('Full run, Endless, restart, and mobile controls passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
