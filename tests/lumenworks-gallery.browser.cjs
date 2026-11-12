const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.FORGE_URL||'http://127.0.0.1:8428/';
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),report={base,layouts:[],errors:[]};try{
 for(const [width,height]of [[1440,1000],[1024,768],[768,1024],[390,844],[320,740],[844,390]]){
  const mobile=width<500,context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.route('https://hits.sh/**',r=>r.abort());await page.goto(base,{waitUntil:'load'});await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===38);assert.equal(await page.locator('[data-game="elemental"]').count(),0);
  for(const filter of ['All','Games','Featured']){
   await page.getByRole('tab',{name:filter,exact:true}).click();assert.equal(await page.locator('#grid [data-game="lumenworks"]').count(),1);
   for(const [selector,art,body]of [['#grid .card','.card-art','.card-body'],['#featured-grid .f-card','.f-card-art','.f-card-body']]){
    const card=page.locator(selector+'[data-game="lumenworks"]');await card.locator('img').evaluate(i=>{i.loading='eager';return i.decode();});
    const geometry=await page.locator(selector).evaluateAll((cards,{art,body})=>cards.map(card=>{const box=card.getBoundingClientRect(),a=card.querySelector(art).getBoundingClientRect(),b=card.querySelector(body).getBoundingClientRect(),play=card.querySelector('.card-play').getBoundingClientRect(),img=card.querySelector('img'),css=getComputedStyle(card);return{id:card.dataset.game,x:box.x,y:box.y,w:box.width,h:box.height,artY:a.y,artW:a.width,artH:a.height,bodyY:b.y,playY:play.y,padding:getComputedStyle(card.querySelector(body)).padding,font:getComputedStyle(card.querySelector('h3')).fontSize,display:css.display,img:img.currentSrc,nw:img.naturalWidth,nh:img.naturalHeight};}),{art,body});
    const item=geometry.find(c=>c.id==='lumenworks'),others=geometry.filter(c=>c.id!=='lumenworks');assert.match(item.img,/assets\/thumbnails\/pixel\/lumenworks\.webp/);assert.equal(item.nw,960);assert.equal(item.nh,540);assert.ok(Math.abs(item.artW/item.artH-16/9)<.03);assert.ok(others.some(c=>Math.abs(c.w-item.w)<1));assert.ok(others.every(c=>c.padding===item.padding&&c.font===item.font&&c.display===item.display));
    for(const peer of others.filter(c=>Math.abs(c.y-item.y)<1)){assert.ok(Math.abs(peer.h-item.h)<1,'same-row card bottoms');assert.ok(Math.abs(peer.artH-item.artH)<1,'same-row art heights');assert.ok(Math.abs(peer.bodyY-item.bodyY)<1,'same-row body tops');assert.ok(Math.abs(peer.playY-item.playY)<1,'same-row play links');}
    if(filter==='All')await card.screenshot({path:`test-results/lumenworks/card-${process.env.FORGE_URL?'public':'local'}-${width}-${selector.includes('featured')?'featured':'archive'}.png`});
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#footer-count').textContent(),'37');
  await page.getByRole('tab',{name:'Games',exact:true}).click();for(const selector of ['#grid .card','#featured-grid .f-card']){await page.locator(selector+'[data-game="lumenworks"]').click();await page.waitForURL(/games\/lumenworks\/index.html/);await page.click('#play');assert.equal(await page.evaluate(()=>window.lumenworks.game.board.nodes.length>0),true);await page.click('#hintButton');assert.match(await page.locator('#hintMessage').textContent(),/Connect .* → /);await page.getByRole('link',{name:'← Arcade',exact:true}).click();await page.waitForFunction(()=>typeof GAMES!=='undefined'&&GAMES.length===38);assert.equal(await page.locator('#grid .card').count(),37);}
  report.layouts.push({width,height,aligned:true,pixelArt:true,filters:true,bothCardsLaunch:true,hint:true,nativeReturn:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(`test-results/lumenworks/gallery-${process.env.FORGE_URL?'public':'local'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
