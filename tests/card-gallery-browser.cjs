const { chromium } = require(process.env.FORGE_PLAYWRIGHT || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
(async()=>{
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});
  const server=http.createServer(async(req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}
    catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.FORGE_URL || `http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.FORGE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const report={base,viewports:[],links:[],errors:[]};
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.route('https://hits.sh/**',route=>route.abort());
    // Registration scripts render between parser-blocking loads; network idle alone
    // can occur before the parser has reached the last registration.
    await page.goto(base,{waitUntil:'load'});
    const games=await page.evaluate(()=>GAMES.filter(game=>!game.hidden).map(({id,category,featured})=>({id,category,featured})));
    assert.equal(games.length,38);
    const loadArt=async()=>{
      await page.locator('.game-thumbnail').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
      assert.equal(await page.locator('#grid .game-thumbnail').count(),await page.locator('#grid .card').count());
      assert.equal(await page.locator('#featured-grid .game-thumbnail').count(),await page.locator('#featured-grid .f-card').count());
      const images=await page.locator('.game-thumbnail').evaluateAll(imgs=>imgs.map(img=>({src:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight})));
      for(const img of images){
        assert.ok(new URL(img.src).pathname.includes('/assets/thumbnails/pixel/'),`pixel artwork was not selected: ${img.src}`);
        assert.equal(img.width,960,img.src);
        assert.equal(img.height,540,img.src);
      }
    };
    await loadArt();
    for(const size of [{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
      await page.setViewportSize(size);
      for(const category of ['Games','Simulations','Experiments','Featured','All']){
        await page.getByRole('tab',{name:category,exact:true}).click();
        const count=games.filter(g=>category==='All'||(category==='Featured'?g.featured:g.category===category)).length;
        assert.equal(await page.locator('#grid .card').count(),count);
        await loadArt();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${size.width} ${category}`);
        assert.equal(await page.locator('#grid .card').evaluateAll(cards=>cards.every(card=>{
          const art=card.querySelector('.card-art').getBoundingClientRect();
          const body=card.querySelector('.card-body').getBoundingClientRect();
          return art.right<=body.left+1 || art.bottom<=body.top+1;
        })),true,`art overlaps text ${size.width} ${category}`);
      }
      await page.locator('#main').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(root,`test-results/gallery-${size.width}.png`)});
      report.viewports.push({...size,filters:'all 5 passed',thumbnails:'all pixel WebP decoded at 960x540',overflow:false});
    }
    await page.getByRole('tab',{name:'All',exact:true}).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab',{name:'Featured',exact:true}).getAttribute('aria-selected'),'true');
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab',{name:'All',exact:true}).getAttribute('aria-selected'),'true');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(parseFloat(await page.locator('.game-thumbnail').first().evaluate(el=>getComputedStyle(el).transitionDuration))<=.00001);
    for(const game of games){
      const response=await page.request.get(new URL(`games/${game.id}/index.html`,base).href);
      assert.equal(response.status(),200,game.id);
      report.links.push(game.id);
    }
    // Contact sheet: inspect all original scenes at once, with no game rendering involved.
    await page.setViewportSize({width:1440,height:1000});
    await page.setContent(`<body style="margin:0;padding:25px;background:#0c111b;color:#ddd;font:15px Arial;display:grid;grid-template-columns:repeat(5,1fr);gap:16px">${games.map(g=>`<div><img style="width:100%;border-radius:8px;image-rendering:pixelated" src="${new URL('assets/thumbnails/pixel/'+g.id+'.webp',base)}"><p>${g.id}</p></div>`).join('')}</body>`);
    await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    await page.screenshot({path:path.join(root,'test-results/thumbnail-contact-sheet.png'),fullPage:true});
    for(const mobile of [false,true]){
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
      context.setDefaultTimeout(15000);
      context.setDefaultNavigationTimeout(15000);
      const game=await context.newPage();
      game.on('pageerror',e=>report.errors.push(e.message));
      await game.route('https://hits.sh/**',route=>route.abort());
      await game.goto(new URL('games/echo-tide/index.html?test',base).href);
      await game.locator('#start').click();
      assert.equal(await game.locator('#hud').isVisible(),true);
      const before=await game.evaluate(()=>EchoTideTest.game.sim.player.x);
      if(mobile){await game.locator('#sonar-button').tap();}
      else{await game.keyboard.down('d');await game.waitForTimeout(250);await game.keyboard.up('d');await game.keyboard.press('Space');assert.notEqual(await game.evaluate(()=>EchoTideTest.game.sim.player.x),before);}
      await game.locator('#pause').click();
      assert.equal(await game.locator('#pause-panel').isVisible(),true);
      await game.locator('#resume').click();
      await game.screenshot({path:path.join(root,`test-results/echo-tide-${mobile?'mobile':'desktop'}.png`)});
      await game.locator('#forge-back-link').click();
      await game.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===39);
      await game.waitForSelector('#grid .game-thumbnail');
      for(const origin of ['#grid .card','#featured-grid .f-card']){
        console.log(`Checking Lighthouse ${mobile?'mobile':'desktop'} ${origin}`);
        for(const category of ['Games','Featured']){
          await game.getByRole('tab',{name:category,exact:true}).click();
          assert.equal(await game.locator('#grid [data-game="the-last-lighthouse"]').count(),1);
        }
        const card=game.locator(`${origin}[data-game="the-last-lighthouse"]`);
        await card.locator('img').evaluate(img=>{img.loading='eager';return img.decode();});
        await card.screenshot({path:path.join(root,`test-results/lighthouse-card-${mobile?'mobile':'desktop'}-${origin.includes('featured')?'featured':'archive'}.png`)});
        await card.click();
        console.log('Lighthouse page opened');
        await game.locator('#start-button').click();
        await game.waitForFunction(()=>document.body.dataset.state==='PLAYING');
        await game.locator('#beam-button').click();
        assert.equal(await game.locator('#beam-button').getAttribute('aria-pressed'),'false');
        await game.locator('#pause-button').click();
        await game.waitForFunction(()=>document.body.dataset.state==='PAUSED');
        await game.locator('#resume-button').click();
        await game.waitForFunction(()=>document.body.dataset.state==='PLAYING');
        await game.getByRole('link',{name:'Back to Forge Arcade',exact:true}).click();
        await game.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===39);
        await game.waitForSelector('#grid .game-thumbnail');
        assert.equal(await game.locator('#grid .card').count(),38);
      }
      await context.close();
    }
    assert.deepEqual(report.errors,[]);
    report.keyboard='passed';report.reducedMotion='passed';report.echoTide='desktop movement, sonar, pause, resume, return; mobile sonar, pause, resume, return';
    report.lighthouse='desktop/mobile archive and featured cards, Games/Featured filters, pixel thumbnail, start, beam toggle, pause/resume, native return';
    await fs.writeFile(path.join(root,process.env.FORGE_URL?'test-results/public-browser-report.json':'test-results/browser-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();server.close();server.closeAllConnections();}
})().catch(e=>{console.error(e);process.exitCode=1;});
