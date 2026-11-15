/* Uninstrumented rendering/input smoke plus read-only renderer diagnostics. */
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const url=process.env.DLG_URL||'http://127.0.0.1:4173/games/dont-let-go/';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report=[];
 for(const mobile of [false,true]){
 const context=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('Console: '+m.text());});page.on('requestfailed',r=>errors.push('Request failed: '+r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()}: ${r.url()}`);});
 await page.route('**/games/dont-let-go/',async r=>{const res=await r.fetch();let source=await res.text();source=source.replace('updateSector(0);\nresetWorld();\nrenderMissions();',`window.__live=()=>({state,elapsed,x:camera.position.x,y:camera.position.y,z:camera.position.z,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,dpr:renderer.getPixelRatio(),mood:environment.mood});\nupdateSector(0);\nresetWorld();\nrenderMissions();`);await r.fulfill({response:res,body:source});});
 await page.addInitScript(()=>{window.frameTimes=[];const raf=requestAnimationFrame;window.requestAnimationFrame=cb=>raf(t=>{frameTimes.push(t);if(frameTimes.length>300)frameTimes.shift();cb(t);});});
 await page.goto(url);await page.waitForTimeout(1500);assert.equal((await page.evaluate(()=>__live())).state,'start');
 await page.screenshot({path:path.resolve(__dirname,`../qa/fix23/live-${mobile?'mobile':'desktop'}-menu.png`)});
 if(mobile){const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:420,id:1}]});await page.waitForTimeout(700);await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:250,y:390,id:1}]});await page.waitForTimeout(700);assert.ok((await page.evaluate(()=>__live())).x>.3);await page.screenshot({path:path.resolve(__dirname,'../qa/fix23/live-mobile-flight.png')});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await page.evaluate(()=>__live())).state,'gameover');}
 else {await page.mouse.move(720,450);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.move(800,420);await page.waitForTimeout(1200);assert.ok((await page.evaluate(()=>__live())).x>.5);await page.screenshot({path:path.resolve(__dirname,'../qa/fix23/after-flight.png')});await page.mouse.up();assert.equal((await page.evaluate(()=>__live())).state,'gameover');}
 await page.click('#overHome');await page.waitForTimeout(500);await page.click('#audioButton');assert.equal(await page.locator('#audioButton').innerText(),'Sound: on');await page.click('#audioButton');assert.equal(await page.locator('#audioButton').innerText(),'Sound: off');
 const memory=[];for(let i=0;i<8;i++){await page.click('#chooseMissions');await page.locator('.mission').nth(11).click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));memory.push(await page.evaluate(()=>__live()));await page.click('#freeFlight');}
 assert.ok(memory.at(-1).geometries<=memory[1].geometries+2,'no course geometry growth');assert.ok(memory.at(-1).textures<=memory[1].textures,'no texture growth');
 await page.evaluate(()=>frameTimes=[]);await page.waitForTimeout(5000);
 const metrics=await page.evaluate(()=>{const deltas=frameTimes.slice(1).map((t,i)=>t-frameTimes[i]).sort((a,b)=>a-b);return {...__live(),medianFrameMs:deltas[Math.floor(deltas.length/2)],p95FrameMs:deltas[Math.floor(deltas.length*.95)],sampleFrames:deltas.length};});
 if(mobile){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(700);await page.screenshot({path:path.resolve(__dirname,'../qa/fix23/live-mobile-landscape.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.click('#chooseMissions');await page.locator('.mission').nth(11).click();await page.waitForTimeout(500);
 const actions=await page.locator('#startScreen .actions').boundingBox();assert.ok(actions.y+actions.height<=335);
 await page.screenshot({path:path.resolve(__dirname,'../qa/fix23/landscape-mission-brief.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:path.resolve(__dirname,'../qa/fix23/mobile-portrait.png')});
 }
 assert.deepEqual(errors,[]);report.push({viewport:mobile?'390×844 / 844×390':'1440×900',renderer:'Chromium / SwiftShader software WebGL',metrics,firstCourse:memory[1],lastCourse:memory.at(-1),errors});await context.close();
 }
 fs.writeFileSync(path.resolve(__dirname,'../qa/fix23/performance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
