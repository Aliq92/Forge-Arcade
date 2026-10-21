/* Browser acceptance tests: pilot uses only mapped keyboard and DOM controls.
   Test mode advances the real fixed-step simulation without wall-clock waits. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'evidence'),{recursive:true});let server;
 let base=process.env.QA_BASE;
 if(!base){server=http.createServer((req,res)=>{const relative=decodeURIComponent(req.url.split('?')[0]);const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});
 const results=[];const check=(name,condition)=>{assert.ok(condition,name);results.push(name);console.log('PASS',name);};
 try{
 await page.goto(base+'/?test=1');await page.screenshot({path:path.join(root,'evidence/intro-desktop.png'),fullPage:true});await page.locator('[data-action=begin]').click();
 // Browser-input pilot; never sets transforms, velocities, constraints, cargo or rules.
 await page.evaluate(()=>{
 const api=__NF,g=api.game;
 const key=(k,on)=>window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{key:k,code:k===' '?'Space':undefined,bubbles:true}));const step=n=>api.advance(n);
 function move(x){for(let i=0;i<250;i++){const delta=x-(g.trolley.x+g.trolley.vx/5);key('a',delta< -2);key('d',delta>2);step(12);if(Math.abs(x-g.trolley.x)<3&&Math.abs(g.trolley.vx)<2)break;}key('a',false);key('d',false);step(600);}
 function cable(length){for(let i=0;i<500;i++){const delta=length-g.length;if(Math.abs(delta)<1.2)break;key('w',delta<0);key('s',delta>0);step(1);}key('w',false);key('s',false);step(240);}
 const toggle=()=>{key(' ',true);key(' ',false);};
 window.pilot={move,cable,toggle,step,key,pick(id){const cargo=g.cargo.find(c=>!c.lost&&c.id===id);if(!cargo)throw Error('Cargo unavailable '+id);cable(90);move(g.top(cargo).x);cable(g.top(cargo).y-156);toggle();step(60);if(g.attached?.id!==id)throw Error('Attachment failed '+id);cable(90);return {w:cargo.w,h:cargo.h};},place(id,x,bottom=579){const c=this.pick(id);move(x);cable(bottom-c.h-148);toggle();step(480);if(g.failed)throw Error('Cargo lost '+id);return api.snapshot();}};
 });
 const scores=[];
 for(let index=0;index<3;index++){
 const states=[];
 for(let id=1;id<=5;id++)states.push(await page.evaluate(({id})=>pilot.place(id,590+(id-1)*122),{id}));
 fs.writeFileSync(path.join(root,`evidence/shipment-${index+1}-states.json`),JSON.stringify(states,null,2));
 await page.evaluate(()=>pilot.step(600));const loaded=await page.evaluate(()=>__NF.snapshot());
 check(`Shipment ${index+1}: five physical pickups, releases and landings`,states.every((s,i)=>s.attached===null&&s.retained===i+1));
 check(`Shipment ${index+1}: stable for three seconds and Dispatch enabled`,loaded.stable===3&&loaded.ready&&await page.locator('#dispatch').isEnabled());
 check(`Shipment ${index+1}: cargo remains within deck, no tunnelling`,loaded.cargo.every(c=>c.y<590&&c.speed<.6));
 await page.screenshot({path:path.join(root,`evidence/shipment-${index+1}-loaded.png`),fullPage:true});
 await page.locator('#dispatch').click();
 if(index===0){await page.locator('#pause').click();const departureTime=await page.evaluate(()=>__NF.game.departTime);await page.evaluate(()=>__NF.advance(120));check('Pause also freezes outbound barge animation',await page.evaluate(t=>__NF.snapshot().paused&&__NF.game.departTime===t,departureTime));await page.locator('[data-action=resume]').click();}
 await page.evaluate(()=>__NF.advance(330));
 const done=await page.evaluate(()=>({s:__NF.snapshot(),score:__NF.game.dispatchScore,best:__NF.saved.best}));scores.push(done.score);
 check(`Shipment ${index+1}: Dispatch departs and persists score`,done.s.overlayKind==='complete'&&done.score>=800&&done.best[index]===done.score);
 if(index<2)await page.locator('[data-action=next]').click();
 }
 await page.screenshot({path:path.join(root,'evidence/all-shipments-complete.png'),fullPage:true});
 await page.locator('[data-action=again]').click();
 // Stack two pieces using the same crane controls, on top of one another.
 await page.evaluate(()=>pilot.place(1,834));const baseTop=await page.evaluate(()=>__NF.game.top(__NF.game.cargo[0]).y);
 await page.evaluate(y=>pilot.place(2,834,y-7),baseTop);await page.evaluate(()=>pilot.step(600));
 const stacked=await page.evaluate(()=>__NF.snapshot());check('Two-piece stack is retained through cargo-to-cargo support',stacked.retained===2&&Math.abs(stacked.cargo[0].x-stacked.cargo[1].x)<40&&stacked.cargo[1].y<stacked.cargo[0].y-30);
 await page.screenshot({path:path.join(root,'evidence/stacked.png'),fullPage:true});
 // Resize while holding a load; logical positions must not change.
 await page.evaluate(()=>pilot.pick(3));const beforeResize=await page.evaluate(()=>__NF.snapshot());
 await page.setViewportSize({width:390,height:844});const afterResize=await page.evaluate(()=>__NF.snapshot());
 check('Portrait resize preserves current shipment and attached cargo',JSON.stringify(beforeResize.cargo)===JSON.stringify(afterResize.cargo)&&beforeResize.attached===afterResize.attached);
 await page.screenshot({path:path.join(root,'evidence/mobile-attached.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#restart').click();const reset=await page.evaluate(()=>__NF.snapshot());check('Restart restores the exact handcrafted arrangement',reset.cargo.length===5&&reset.cargo.every((c,i)=>c.x===85+i*82)&&reset.attached===null&&reset.retained===0);
 // Drop between the dock and deck to verify water loss and quick retry.
 await page.evaluate(()=>{pilot.pick(1);pilot.move(490);pilot.toggle();pilot.step(1500);});
 const loss=await page.evaluate(()=>__NF.snapshot());check('Water loss ends shipment and offers retry',loss.failed&&loss.overlayKind==='loss'&&loss.cargo.length===4);
 await page.screenshot({path:path.join(root,'evidence/water-loss.png'),fullPage:true});await page.locator('[data-action=retry]').click();
 check('Quick retry uses the same five positions',await page.evaluate(()=>__NF.snapshot().cargo.every((c,i)=>c.x===85+i*82)));
 // Hold controls, cancellation, pause and hidden-page lifecycle.
 await page.setViewportSize({width:390,height:844});const right=page.locator('[data-hold=right]');const x0=await page.evaluate(()=>__NF.snapshot().trolley);
 const cancelBox=await right.boundingBox();await page.mouse.move(cancelBox.x+cancelBox.width/2,cancelBox.y+cancelBox.height/2);await page.mouse.down();await page.evaluate(()=>__NF.advance(120));
 // Synthetic pointer capture may be rejected; real mouse pointer is tested below too.
 await right.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});const cancelled=await page.evaluate(()=>__NF.snapshot());await page.mouse.up();
 check('Pointer cancellation releases held directional input',!cancelled.input.right);
 const box=await right.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.evaluate(()=>__NF.advance(120));await page.mouse.up();
 check('Press-and-hold directional button moves trolley',await page.evaluate(x=>__NF.snapshot().trolley>x+80,x0));
 await page.locator('#magnet').click();check('Separate mobile magnet button toggles state',await page.evaluate(()=>__NF.snapshot().magnet.on));await page.locator('#magnet').click();
 await page.locator('#pause').click();const pausedTime=await page.evaluate(()=>__NF.snapshot().time);await page.evaluate(()=>__NF.advance(600));check('Pause freezes simulation',await page.evaluate(t=>__NF.snapshot().time===t,pausedTime));await page.locator('[data-action=resume]').click();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});check('Hidden page pauses and clears input',await page.evaluate(()=>__NF.snapshot().paused&&Object.values(__NF.snapshot().input).every(v=>!v)));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.locator('[data-action=resume]').click();
 // Free Lift uses renewable supplies and preferences.
 await page.locator('#mode').click();await page.evaluate(()=>{pilot.pick(1);pilot.move(834);pilot.cable(389);pilot.toggle();pilot.step(600);});
 const free=await page.evaluate(()=>__NF.snapshot());check('Free Lift replenishes moved cargo',free.free&&free.cargo.length===6&&free.retained===1);
 await page.locator('#rock').uncheck();check('Optional rocking can be disabled',await page.evaluate(()=>!__NF.game.rocking));
 await page.locator('#restart').click();check('Free Lift reset preserves rocking preference',await page.evaluate(()=>__NF.snapshot().free&&!__NF.game.rocking&&__NF.snapshot().cargo.length===5));
 await page.screenshot({path:path.join(root,'evidence/mobile-free-lift.png'),fullPage:true});
 // Real animation loop smoke test after controlled test-mode checks.
 await page.goto(base+'/');await page.locator('[data-action=begin]').click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(900);await page.keyboard.up('ArrowRight');await page.locator('#sound').click();check('Sound enables only after interaction',await page.locator('#sound').innerText()==='Sound on');await page.locator('#sound').click();
 await page.locator('#pause').click();await page.screenshot({path:path.join(root,'evidence/mobile-pause.png'),fullPage:true});
 await page.reload();check('Best scores survive reload',await page.evaluate(()=>JSON.parse(localStorage.getItem('forge-arcade:night-freight:v1')).best.every(s=>s>=800)));
 check('No external runtime requests',remote.length===0);
 // Storage denial must not prevent boot or play.
 const denied=await browser.newContext();const deniedPage=await denied.newPage();await deniedPage.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('denied')};Storage.prototype.setItem=()=>{throw Error('denied')};});await deniedPage.goto(base+'/?test=1');await deniedPage.locator('[data-action=begin]').click();await deniedPage.locator('#mode').click();await deniedPage.locator('#rock').uncheck();check('Storage failure is tolerated',await deniedPage.evaluate(()=>__NF.snapshot().free));await denied.close();
 // Chromium's real touch-input pipeline, including a two-finger cancel.
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const touchPage=await mobile.newPage();touchPage.on('pageerror',e=>errors.push(e.message));await touchPage.goto(base+'/?test=1');await touchPage.locator('[data-action=begin]').tap();
 const cdp=await mobile.newCDPSession(touchPage);const rb=await touchPage.locator('[data-hold=right]').boundingBox(),db=await touchPage.locator('[data-hold=down]').boundingBox();const touches=[{x:rb.x+rb.width/2,y:rb.y+rb.height/2,id:1},{x:db.x+db.width/2,y:db.y+db.height/2,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});await touchPage.evaluate(()=>__NF.advance(120));const touching=await touchPage.evaluate(()=>__NF.snapshot());
 check('Real touch events hold travel and cable controls together',touching.trolley>190&&touching.length>270&&touching.input.right&&touching.input.down);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});check('Touch cancellation clears both held directions',await touchPage.evaluate(()=>!__NF.snapshot().input.right&&!__NF.snapshot().input.down));
 await touchPage.locator('#magnet').tap();check('Touch tap activates magnet',await touchPage.evaluate(()=>__NF.snapshot().magnet.on));
 await touchPage.locator('#sound').tap();await touchPage.reload();check('Saved sound preference starts muted before interaction',await touchPage.locator('#sound').innerText()==='Sound off');await touchPage.locator('[data-action=begin]').tap();check('Sound preference restores after user interaction',await touchPage.locator('#sound').innerText()==='Sound on');await mobile.close();
 check('No browser runtime exceptions',errors.length===0);
 fs.writeFileSync(path.join(root,'evidence/qa-results.json'),JSON.stringify({date:new Date().toISOString(),browser:await browser.version(),results,scores,errors,remote,limitations:['Headless Chromium only; no physical touch device or Safari pass.','Controlled playthroughs advance fixed steps through the test harness; additional real-time input smoke pass included.']},null,2));
 console.log(`${results.length} acceptance checks passed. Scores: ${scores.join(', ')}`);
 }catch(e){await page.screenshot({path:path.join(root,'evidence/failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
