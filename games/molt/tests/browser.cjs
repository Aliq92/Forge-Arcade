const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),report={layouts:[],errors:[],performance:[],note:'Eating/molt/encounter fixtures position existing food and creatures through the inspection hook. Input uses real keyboard/touch.'};try{
for(const [width,height]of [[1440,900],[768,1024],[390,844],[320,740],[844,390]]){
 console.log(`Checking ${width}x${height}`); const mobile=width<=844,context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,reducedMotion:width===320?'reduce':'no-preference'}),page=await context.newPage();await page.addInitScript(()=>{let pending=0,maximum=0;const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name!=='loop')return raf(fn);pending++;maximum=Math.max(maximum,pending);return raf(t=>{pending--;fn(t);});};window.rafStats=()=>({pending,maximum});});
 page.on('pageerror',e=>{report.errors.push(e.message);console.error(e.stack);});page.on('console',m=>{if(m.type()==='error'){report.errors.push(m.text());console.error(m.text());}});
 await page.goto('http://127.0.0.1:8428/games/molt/');await page.bringToFront();await page.waitForFunction(()=>window.moltDebug);assert.equal(await page.evaluate(()=>moltDebug.inspect().audioActive),false);await page.screenshot({path:`test-results/molt/after-menu-${width}.png`});await page.locator('#btnStart').click();
 await page.waitForFunction(()=>moltDebug.inspect().state==='playing');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>{const s=moltDebug.inspect();s.npcs.forEach((n,i)=>{n.x=40+i*3;n.y=200;n.r=6;});});
 const before=await page.evaluate(()=>moltDebug.inspect().player.x);
 if(mobile){const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:55,y:height-100}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:105,y:height-100}]});await page.waitForTimeout(220);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');}
 assert.ok(await page.evaluate(x=>moltDebug.inspect().player.x>x+8,before));
 await page.locator('#pauseBtn').click();await page.waitForFunction(()=>moltDebug.inspect().state==='paused');const frozen=await page.evaluate(()=>JSON.stringify({p:moltDebug.inspect().player,n:moltDebug.inspect().npcs,t:moltDebug.inspect().survivalTime,v:moltDebug.inspect().art.time}));await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>JSON.stringify({p:moltDebug.inspect().player,n:moltDebug.inspect().npcs,t:moltDebug.inspect().survivalTime,v:moltDebug.inspect().art.time})),frozen);
 await page.locator('#btnResume').click();await page.waitForTimeout(300);await page.screenshot({path:`test-results/molt/after-play-${width}.png`});
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>moltDebug.inspect().state==='paused');await page.keyboard.press('Escape');await page.waitForFunction(()=>moltDebug.inspect().state==='playing');
 const stages=width===1440?11:1;for(let index=0;index<stages;index++){
  await page.evaluate(index=>{const s=moltDebug.inspect();s.npcs.forEach(n=>{n.x=20;n.y=200;n.r=6;});s.player.x=innerWidth/2;s.player.y=innerHeight/2;s.player.mass=s.CFG.moltThresholds[index]-2;s.motes.length=0;s.motes.push({x:s.player.x,y:s.player.y,phase:0});},index);
  await page.waitForFunction(()=>moltDebug.inspect().state==='molting');const state=await page.evaluate(()=>({stage:moltDebug.inspect().stage,shells:moltDebug.inspect().art.shells.length,mass:moltDebug.inspect().player.mass}));assert.equal(state.stage,index+1);assert.ok(state.shells>0);
  if(index===0){await page.keyboard.press('Escape');await page.waitForFunction(()=>moltDebug.inspect().state==='paused');await page.waitForTimeout(150);await page.keyboard.press('Escape');await page.waitForFunction(()=>moltDebug.inspect().state==='molting');}
  await page.waitForTimeout(180);await page.screenshot({path:`test-results/molt/molt-${width}-stage-${index+1}.png`});await page.waitForFunction(()=>moltDebug.inspect().state==='playing');
 }
 await page.evaluate(()=>{const s=moltDebug.inspect();s.player.hasSecondWind=false;s.player.traits=s.player.traits.filter(t=>t!=='wind');const n=s.npcs[0];n.r=9+Math.sqrt(s.player.mass)*1.55;n.r*=1.6;n.x=s.player.x;n.y=s.player.y;n.vx=n.vy=0;});await page.waitForFunction(()=>moltDebug.inspect().state==='dead');await page.screenshot({path:`test-results/molt/death-${width}.png`});
 await page.waitForTimeout(4000);assert.equal(await page.evaluate(()=>moltDebug.inspect().shakeMag),0);assert.equal(await page.evaluate(()=>moltDebug.inspect().particles.length),0);
 console.log('death settled',width);await page.locator('#btnContinue').click();await page.waitForFunction(()=>moltDebug.inspect().state==='playing');assert.equal(await page.evaluate(()=>moltDebug.inspect().generation),2);
 console.log('retry started',width);await page.locator('#pauseBtn').click();await page.locator('#btnRestart').click();assert.equal(await page.evaluate(()=>moltDebug.inspect().generation),2);assert.equal(await page.evaluate(()=>moltDebug.inspect().lastMoltIdx),-1);assert.equal(await page.evaluate(()=>moltDebug.inspect().art.shells.length),0);
 await page.locator('#muteBtn').click();assert.equal(await page.locator('#muteBtn').getAttribute('aria-pressed'),'true');await page.keyboard.press('Escape');await page.waitForFunction(()=>moltDebug.inspect().state==='paused');await page.keyboard.press('Escape');await page.waitForFunction(()=>moltDebug.inspect().state==='playing');
 for(const id of ['pauseBtn','muteBtn']){const r=await page.locator('#'+id).boundingBox();assert.ok(r.width>=44&&r.height>=44&&r.x+r.width<=width+1&&r.y>=0);}
 if(width===320)assert.equal(await page.evaluate(()=>moltDebug.inspect().art.reduced),true);
 await page.evaluate(()=>{const s=moltDebug.inspect();s.npcs.forEach(n=>{n.x=15;n.y=15;n.r=5;});});await page.waitForTimeout(1000);
 const performance=await page.evaluate(()=>{const s=moltDebug.inspect(),samples=[...s.frameCosts].filter(v=>v>0).sort((a,b)=>a-b);return {drawMeanMs:samples.reduce((a,b)=>a+b,0)/samples.length,drawP95Ms:samples[Math.floor(samples.length*.95)],particles:s.particles.length,raf:rafStats()};});assert.ok(performance.particles<=240);assert.ok(performance.raf.maximum<=1,'duplicate animation loops');report.performance.push({width,...performance});
 report.layouts.push({width,height,movement:true,pause:true,molts:stages,death:true,lineage:true,restart:true,mute:true});await context.close();
}
assert.deepEqual(report.errors,[]);await fs.writeFile('test-results/molt/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});


