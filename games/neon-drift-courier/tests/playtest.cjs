// Run from the repository root with a static server on port 8420:
// node games/neon-drift-courier/tests/playtest.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const base = process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8420';
  const artifacts = path.join(__dirname, 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });
  const results = [], errors = [];
  try {
    for (const [width, height] of [[320,568], [360,640], [412,915], [640,360], [1280,800]]) {
      const context = await browser.newContext({ viewport: {width,height}, hasTouch: true, deviceScaleFactor: width < 500 ? 2 : 1, reducedMotion: width === 412 ? 'reduce' : 'no-preference' });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      // Offline fonts verify the existing fallback, while keeping test runs reproducible.
      await page.route('https://fonts.googleapis.com/**', r => r.abort());
      // Drive the actual requestAnimationFrame callback with a controlled clock.
      await page.addInitScript(() => {
        let frame, timestamp=0;
        window.requestAnimationFrame=fn=>{frame=fn;return 1};
        window.advance=seconds=>{for(let i=0;i<Math.round(seconds*60);i++){timestamp+=1000/60;frame(timestamp)}};
      });
      await page.goto(base+'/index.html');
      await page.locator('#grid a[data-game="neon-drift-courier"]').click();
      await page.waitForURL('**/games/neon-drift-courier/index.html');
      await page.evaluate(()=>advance(.1));
      await page.screenshot({path:path.join(artifacts,`menu-${width}.png`)});
      await page.locator('#go').click();
      await page.evaluate(()=>{advance(.1);spawnD=Infinity});
      // All visible controls fit and retain at least 44px touch targets.
      for (const selector of ['#toolbar a','#sound','#pause','#boost','[data-control="left"]','[data-control="right"]','[data-control="drift"]','[data-control="brake"]']) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, selector);
        assert.ok(box.x >= 0 && box.y >= 0 && box.x+box.width <= width+1 && box.y+box.height <= height+1, selector+' fits');
      }
      const client=await context.newCDPSession(page);
      const point=async(selector,id)=>{const box=await page.locator(selector).boundingBox();return {x:box.x+box.width/2,y:box.y+box.height/2,id}};
      const right=await point('[data-control="right"]',1), drift=await point('[data-control="drift"]',2);
      const initialX=await page.evaluate(()=>P.x);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right]});
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right,drift]});
      await page.evaluate(()=>advance(.2));
      assert.ok(await page.evaluate(()=>drifting)); assert.ok(await page.evaluate(()=>P.x)>initialX);
      await page.screenshot({path:path.join(artifacts,`drift-${width}.png`)});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[right]});
      assert.ok(await page.evaluate(()=>pressed('drift')&&!pressed('right')));
      await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      assert.equal(await page.evaluate(()=>held.size),0);
      // Keyboard boost and brake work independently of steering.
      await page.keyboard.down('ArrowUp'); await page.evaluate(()=>advance(.5));
      const boosted=await page.evaluate(()=>speed);assert.ok(boosted>5);
      await page.keyboard.down('ArrowDown'); await page.evaluate(()=>advance(.5));
      assert.ok(await page.evaluate(()=>speed)<boosted);assert.equal(await page.evaluate(()=>boostActive),false);
      await page.keyboard.up('ArrowDown');await page.keyboard.up('ArrowUp');
      // Losing focus must clear held input and require an explicit resume.
      await page.keyboard.down('ArrowLeft');
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      assert.equal(await page.evaluate(()=>state),'PAUSED');
      assert.equal(await page.evaluate(()=>K.arrowleft),false);
      await page.keyboard.up('ArrowLeft');await page.locator('#go').click();
      // Place pickups/gates in reach; collisions and rewards run through the real loop.
      for(let i=0;i<3;i++)await page.evaluate(()=>{pks=[{k:'p',x:P.x,y:P.y,c:'#00ffff'}];advance(1/60)});
      assert.equal(await page.evaluate(()=>cargo),3);
      assert.match(await page.locator('#objective').textContent(),/DELIVER/);
      await page.evaluate(()=>{P.x=gate.x;gate.y=P.y-90;advance(1/60)});
      await page.screenshot({path:path.join(artifacts,`gate-${width}.png`)});
      await page.locator('#pause').click();
      const paused=await page.evaluate(()=>JSON.stringify({t,score,cargo,gate}));
      await page.evaluate(()=>advance(2));
      assert.equal(await page.evaluate(()=>JSON.stringify({t,score,cargo,gate})),paused);
      await page.screenshot({path:path.join(artifacts,`pause-${width}.png`)});
      await page.locator('#go').click();
      await page.evaluate(()=>{gate.y=P.y-3;advance(1/60)});
      assert.equal(await page.evaluate(()=>deliveries),1);assert.equal(await page.evaluate(()=>cargo),0);
      await page.screenshot({path:path.join(artifacts,`delivery-${width}.png`)});
      await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
      await page.locator('#pause').click();await page.locator('#restart').click();
      assert.equal(await page.evaluate(()=>cargo+deliveries+score+t),0);
      assert.equal(await page.evaluate(()=>state),'PLAYING');
      // A real obstacle collision produces the game-over screen and preserves scores.
      await page.evaluate(()=>{score=210;localStorage.setItem('another.game','keep');obs=[{x:P.x,y:P.y,w:64,h:42,hw:32,hh:21,off:0,c:'#ff3355',k:'b'}];advance(.05);advance(1)});
      assert.equal(await page.evaluate(()=>state),'DEAD');assert.equal(await page.locator('#go').textContent(),'Reboot system');
      await page.screenshot({path:path.join(artifacts,`gameover-${width}.png`)});
      await page.locator('#go').click();assert.equal(await page.evaluate(()=>score),0);
      await page.setViewportSize({width:height,height:width});
      await page.evaluate(()=>advance(.1));
      assert.ok(await page.evaluate(()=>Number.isFinite(P.x)&&P.x>=L&&P.x<=R));
      await page.locator('#toolbar a').click();await page.waitForURL('**/index.html');
      assert.equal(await page.title(),'Forge Arcade');
      await page.locator('#grid a[data-game="neon-drift-courier"]').click();
      assert.equal(await page.locator('#bs').textContent(),'210');
      assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
      assert.equal(await page.evaluate(()=>localStorage.getItem('another.game')),'keep');
      assert.equal(await page.evaluate(()=>scrollY),0);
      results.push({viewport:`${width}×${height}`,driving:true,multitouch:true,delivery:true,pause:true,restart:true,gameover:true,arcadeReturn:true,saves:true});
      await context.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify({results,errors},null,2));
    console.log(JSON.stringify({results,errors},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
