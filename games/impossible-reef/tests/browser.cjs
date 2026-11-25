const http=require('http'),fs=require('fs/promises'),path=require('path'),assert=require('assert/strict');const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const root=path.resolve(__dirname,'../../..'),out=path.join(root,'test-results/impossible-reef-fix29'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{await fs.mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});await page.addInitScript(()=>{if(!localStorage.getItem('impossible_reef_save_v1'))localStorage.setItem('impossible_reef_save_v1',JSON.stringify({v:1,organisms:Array.from({length:24},(_,i)=>({species:['glass_branch','spiral_tube','lumen_fan','pearl_bloom','floating_polyp','geometric_anemone'][i%6],x:80+(i%12)*115,y:600+Math.floor(i/12)*55,seed:i+1,growth:1})),prefs:{sound:false},firstPlantDone:true}));});const url=process.env.REEF_URL||`http://127.0.0.1:${server.address().port}/games/impossible-reef/`;await page.goto(url);await page.waitForTimeout(400);console.log('startup',await page.evaluate(()=>({garden:ReefLab.state.organisms.length,flora:ReefLab.ocean.decorations.length,cache:ReefLab.renderer.cache.size})));await page.screenshot({path:path.join(out,'after-desktop.png')});assert.equal(await page.evaluate(()=>ReefLab.state.organisms.length),24);assert.equal(await page.locator('#species-row button').count(),14);
await page.mouse.click(500,480);assert.equal(await page.evaluate(()=>ReefLab.state.organisms.length),25);await page.mouse.click(500,452);await page.locator('#btn-nurture').click();assert.ok(await page.evaluate(()=>ReefLab.state.organisms.at(-1).growth>.06));await page.locator('#btn-remove').click();assert.equal(await page.evaluate(()=>ReefLab.state.organisms.length),24);
await page.locator('#btn-pause').click();const frozen=await page.evaluate(()=>({time:ReefLab.state.time,growth:ReefLab.state.organisms[0].growth,life:ReefLab.ocean.life[0].x}));await page.waitForTimeout(180);assert.deepEqual(await page.evaluate(()=>({time:ReefLab.state.time,growth:ReefLab.state.organisms[0].growth,life:ReefLab.ocean.life[0].x})),frozen);await page.locator('#btn-pause').click();
await page.evaluate(()=>{const [a,b]=ReefLab.state.organisms;a.x=200;b.x=250;a.y=b.y=600;a.growth=b.growth=1;ReefLab.state.lastCross=4;globalThis.originalRandom=Math.random;Math.random=()=>.12;});await page.waitForFunction(()=>ReefLab.state.organisms.length===25);await page.evaluate(()=>{Math.random=originalRandom;ReefLab.saveState();});assert.equal(await page.evaluate(()=>ReefLab.state.organisms.at(-1).isHybrid),true);
await page.locator('#btn-survey').click();assert.equal(await page.evaluate(()=>ReefLab.ocean.survey),true);const start=await page.evaluate(()=>ReefLab.ocean.probe.x);assert.equal(await page.evaluate(()=>document.activeElement.id),'reef-canvas');await page.keyboard.down('d');await page.waitForTimeout(180);await page.keyboard.up('d');assert.ok(await page.evaluate(x=>ReefLab.ocean.probe.x>x,start));
async function swim(x,y) {
 const point=await page.evaluate(({x,y})=>ReefLab.renderer.screen({x,y}),{x,y});
 await page.mouse.click(point.x,point.y);
 const outcome=await page.evaluate(({x,y})=>{
  const o=ReefLab.ocean;
  if (!o.target && Math.hypot(o.probe.x-x,o.probe.y-y)>12) return {blocked:true};
  for(let i=0;i<850&&Math.hypot(o.probe.x-x,o.probe.y-y)>11;i++)o.step(1/60);
  return {x:o.probe.x,y:o.probe.y};
 },{x,y});
 assert.ok(Math.hypot(outcome.x-x,outcome.y-y)<=13,JSON.stringify({x,y,outcome}));
}
async function advance(seconds) {
 await page.evaluate(seconds=>{for(let i=0;i<Math.ceil(seconds*60);i++)ReefLab.ocean.step(1/60);},seconds);
}
for(let r=0;r<4;r++){
 await page.locator('#region-select').selectOption(String(r));
 const {gate,habitat,markers,treasures}=await page.evaluate(()=>{
  const o=ReefLab.ocean;return {gate:o.gate,habitat:o.habitat,markers:o.markers,treasures:o.treasures};
 });
 if(r===1)await swim(690,112);
 if(r===2){await swim(290,215);await swim(598,215);}
 if(r===3)for(const marker of markers.filter(m=>m.kind==='resonance'))await swim(marker.x,marker.y);
 await swim(744,habitat.y);
 if(r===0||r===1)await advance(1.6);
 assert.equal(await page.evaluate(()=>ReefLab.ocean.gateOpen()),true,gate.name);
 await swim(820,habitat.y);
 await swim(habitat.x,habitat.y);
 for(const marker of markers.filter(m=>m.habitat)){
  await swim(marker.x,marker.y);
  if(marker.kind==='creature'){await swim(habitat.x,habitat.y);await advance(1);}
 }
 await page.waitForFunction(()=>ReefLab.ocean.habitat.state==='restored');
 assert.ok(await page.evaluate(()=>ReefLab.ocean.companion));
 await page.screenshot({path:path.join(out,`restored-${r}.png`)});
 await swim(840,habitat.y);
 await swim(740,habitat.y);
 for(const t of treasures.filter(t=>!t.rare)){
  await swim(730,habitat.y);
  await swim(730,t.y);
  await swim(t.x,t.y);
 }
 assert.equal(await page.evaluate(()=>ReefLab.ocean.regionProgress(ReefLab.ocean.region).treasures),8);
 console.log('Opened, restored, and collected region',r);
}
await page.locator('#btn-journal').click();assert.match(await page.locator('#journal-summary').innerText(),/32\/32/);assert.match(await page.locator('#journal-summary').innerText(),/4\/4 restored/);
const journalText=await page.locator('#journal-regions').innerText();
assert.equal((journalText.match(/Rare pearl found/g)||[]).length,4);
for(const description of await page.evaluate(()=>ReefOcean.COMPANIONS.map(c=>c.description)))assert.ok(journalText.includes(description));
await page.locator('#ocean-journal [data-ocean-close]').click();const savedCount=await page.evaluate(()=>{ReefLab.saveState();ReefLab.saveOcean();return ReefLab.state.organisms.length;});await page.reload();assert.equal(await page.evaluate(()=>ReefLab.ocean.journal.found.length),32);assert.equal(await page.evaluate(()=>ReefLab.ocean.journal.restored.length),4);assert.equal(await page.evaluate(()=>ReefLab.ocean.journal.gates.length),4);assert.equal(await page.evaluate(()=>ReefLab.state.organisms.length),savedCount);assert.equal(await page.evaluate(()=>ReefLab.state.organisms.some(o=>o.isHybrid)),true);await page.locator('#btn-survey').click();await page.locator('#btn-ocean-menu').click();await page.locator('#ocean-quality').selectOption('low');await page.locator('#btn-survey-restart').click();assert.equal(await page.evaluate(()=>ReefLab.ocean.journal.found.length),32);assert.equal(await page.evaluate(()=>ReefLab.state.quality),'low');
for(const size of [{width:390,height:844},{width:844,height:390},{width:320,height:740}]){await page.setViewportSize(size);await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,`after-${size.width}x${size.height}.png`)});}
assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify({url,errors,legacyGarden:true,originalTending:true,hybrids:true,fullSurvey:32,secrets:4,pause:true,viewports:4},null,2));await browser.close();server.close();console.log('BROWSER PASS');})().catch(e=>{console.error(e);process.exit(1);});
