/* Native launcher + game integration. Serve the repository, then run this file.
   ARCADE_TEST_URL may contain a project subdirectory, matching GitHub Pages. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = (process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8420').replace(/\/$/, '');
const out = process.env.ECHO_ARTIFACTS || '/tmp/echo-tide-integration';
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  try {
    fs.mkdirSync(out, {recursive:true});
    const errors = [];
    const setup = async context => {
      await context.route('https://hits.sh/**', r => r.fulfill({status:204, body:''}));
      context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    };
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    await setup(context);const page = await context.newPage(),requests=[];
    page.on('request', r => requests.push(r.url()));
    await page.goto(base + '/index.html');
    await page.waitForSelector('#grid [data-game="echo-tide"]');
    const ids = await page.locator('#grid [data-game]').evaluateAll(els => els.map(el=>el.dataset.game));
    assert.equal(ids.filter(id=>id==='echo-tide').length, 1);
    assert.ok(ids.includes('echo-miner') && ids.includes('night-freight') && ids.includes('forge-beast'));
    assert.equal(await page.locator('#featured-grid [data-game="echo-tide"]').count(), 1);
    assert.equal(await page.locator('#footer-count').textContent(), String(ids.length));
    assert.equal(await page.locator('#spotlight [data-game]').getAttribute('data-game'), 'digital-ant-colony');
    assert.ok(!requests.some(u=>u.includes('/games/echo-tide/')), 'launcher does not load game runtime');
    for (const [filter,count] of [['Games',1],['Simulations',0],['Experiments',0],['Featured',1],['All',1]]) {
      await page.click(`[data-cat="${filter}"]`);
      assert.equal(await page.locator('#grid [data-game="echo-tide"]').count(), count);
    }
    const card = page.locator('#grid [data-game="echo-tide"]');
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({path:out+'/card.png'});
    await page.evaluate(()=>localStorage.setItem('echo-tide-unrelated-test','keep'));
    await card.click();await page.waitForURL(base+'/games/echo-tide/index.html');
    assert.equal(await page.evaluate(()=>typeof window.EchoTideTest), 'undefined');
    await page.waitForFunction(()=>!document.getElementById('start').disabled);
    assert.equal(await page.locator('#forge-back-link').getAttribute('href'), '../../index.html');
    await page.screenshot({path:out+'/desktop-menu.png'});
    await page.click('#start');assert.equal(await page.locator('#overlay').isVisible(),false);
    await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');await page.keyboard.press('Space');
    await page.waitForFunction(()=>Number(document.getElementById('disturbance-value').textContent)>0);
    await page.keyboard.press('KeyP');assert.equal(await page.locator('#pause-panel').isVisible(),true);
    await page.click('#resume');await page.keyboard.press('KeyR');
    await page.waitForFunction(()=>document.getElementById('disturbance-value').textContent==='0');
    await page.screenshot({path:out+'/desktop-game.png'});
    await page.click('#forge-back-link');await page.waitForURL(base+'/index.html');
    assert.deepEqual(await page.locator('#grid [data-game]').evaluateAll(els=>els.map(e=>e.dataset.game)), ids);
    assert.equal(await page.evaluate(()=>localStorage.getItem('echo-tide-unrelated-test')),'keep');
    await page.goBack();await page.waitForURL(base+'/games/echo-tide/index.html');
    assert.equal(await page.locator('#forge-back-link').count(),1);
    await context.close();
    const mobile = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3});
    await setup(mobile);const phone = await mobile.newPage();
    await phone.goto(base+'/games/echo-tide/index.html?test');
    await phone.waitForFunction(()=>window.EchoTideTest);
    await phone.click('#start');
    assert.equal(await phone.locator('#joystick').isVisible(),true);
    const link = await phone.locator('#forge-back-link').boundingBox();
    const hud = await phone.locator('#hud').boundingBox();
    assert.ok(link.height>=44&&link.y+link.height<=hud.y,'return link clears HUD');
    const cdp = await mobile.newCDPSession(phone);
    const joy = await phone.locator('#joystick').boundingBox(), sonar = await phone.locator('#sonar-button').boundingBox();
    const a={x:joy.x+joy.width*.8,y:joy.y+joy.height*.5,id:1}, b={x:sonar.x+sonar.width/2,y:sonar.y+sonar.height/2,id:2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
    await phone.waitForFunction(()=>EchoTideTest.game.sim.player.x>665);
    assert.equal(await phone.evaluate(()=>EchoTideTest.game.sim.pulseCount),1);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await phone.evaluate(()=>EchoTideTest.game.input.joy.x),0);
    assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await phone.evaluate(()=>EchoTideTest.game.renderer.dpr),1.5);
    await phone.screenshot({path:out+'/portrait.png'});
    await phone.setViewportSize({width:844,height:390});await phone.waitForTimeout(200);
    const overlap=await phone.evaluate(()=>{const a=document.getElementById('forge-back-link').getBoundingClientRect(),b=document.getElementById('hud').getBoundingClientRect();return a.bottom>b.top;});
    assert.equal(overlap,false);await phone.screenshot({path:out+'/landscape.png'});
    await phone.setViewportSize({width:320,height:568});await phone.reload();
    await phone.waitForFunction(()=>window.EchoTideTest);
    await phone.waitForTimeout(700);
    const menuBounds=await phone.locator('#menu-panel').boundingBox(), backBounds=await phone.locator('#forge-back-link').boundingBox(), startBounds=await phone.locator('#start').boundingBox();
    assert.ok(menuBounds.y>=backBounds.y+backBounds.height,'small-phone menu clears return link');
    assert.ok(startBounds.y+startBounds.height<=568,'small-phone START fits screen');
    await phone.screenshot({path:out+'/small-phone-menu.png'});
    await phone.click('#start');
    assert.equal(await phone.evaluate(()=>{const hud=document.getElementById('hud').getBoundingClientRect();return hud.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;}),true);
    await phone.click('#pause');assert.equal(await phone.locator('#pause-panel').isVisible(),true);
    await phone.click('#forge-back-link');await phone.waitForURL(base+'/index.html');
    assert.equal(await phone.locator('#grid [data-game="echo-tide"]').count(),1);
    for(const path of ['index.html','style.css','arcade.css','game.js']) {
      const response=await phone.request.get(base+'/dist/games/echo-tide/'+path);
      assert.equal(response.status(),200,'production asset '+path);
    }
    await phone.goto(base+'/dist/index.html');
    await phone.locator('#grid [data-game="echo-tide"]').click();
    await phone.waitForURL(base+'/dist/games/echo-tide/index.html');
    await phone.click('#start');assert.equal(await phone.locator('#overlay').isVisible(),false);
    await phone.click('#forge-back-link');await phone.waitForURL(base+'/dist/index.html');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({status:'PASS',catalogCount:ids.length,checks:['Games/Featured/All filters','scoped artwork','no game runtime in launcher','native launch and sonar','pause/restart','return link and browser back','unrelated storage retained','actual simultaneous touch','portrait/landscape and DPR cap','GitHub Pages project-relative paths','production build launch/return','zero JavaScript errors'],screenshots:out},null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
