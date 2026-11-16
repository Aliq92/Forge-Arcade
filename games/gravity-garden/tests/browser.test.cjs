const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {serve}=require('../../axiom/tests/preview.cjs');
const path=require('node:path');
for(const mobile of [false,true])test(mobile?'touch controls':'desktop controls',async()=>{
 const server=await serve(0,path.resolve(__dirname,'../../..'));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('gravityGardenSettings',JSON.stringify({boundary:'bounce',trail:'short',absorb:false,merge:false,speed:1})));
 await page.goto(`http://127.0.0.1:${server.address().port}/games/gravity-garden/`);
 const tap=async(x,y)=>mobile?page.touchscreen.tap(x,y):page.mouse.click(x,y);
 await page.locator('#btnPause').click();await page.locator('#clearWells').click();
 const types=['attractor','repulsor','vortex','pulse','orbit','chaos','binary'];
 for(let i=0;i<types.length;i++){
  await page.locator(`[data-well-type="${types[i]}"]`).click();await tap(mobile?60+i%3*110:140+i*150,mobile?130+Math.floor(i/3)*90:200);
  assert.equal(await page.locator('#wellCount').textContent(),String(i+1));assert.match(await page.locator('#inspTitle').textContent(),new RegExp(types[i].toUpperCase()));
  await page.locator('#parammass').fill('2');await page.locator('#paramradius').fill('400');
  assert.equal(await page.locator('#parammassValue').textContent(),'2');
  if(types[i]==='attractor'||types[i]==='repulsor'){await tap(mobile?60+i%3*110:140+i*150,mobile?130+Math.floor(i/3)*90:200);assert.match(await page.locator('#inspTitle').textContent(),new RegExp(types[i].toUpperCase()));}
  if(types[i]==='orbit'){await page.locator('#paramradius').fill('60');await page.locator('#paramorbitRadius').fill('300');assert.ok(Number(await page.locator('#paramradiusValue').textContent())>Number(await page.locator('#paramorbitRadiusValue').textContent()));}

 }
 await page.locator('#paramseparation').fill('160');
 const x=mobile?60:1040,y=mobile?310:200;
 if(mobile){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+25,y:y+35}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y+35,{steps:5});await page.mouse.up();}
 await tap(x+25+80,y+35);assert.match(await page.locator('#inspTitle').textContent(),/BINARY/);
 await page.locator('#inspEnabled').click();assert.equal(await page.locator('#inspEnabled').textContent(),'Enable');await page.locator('#inspEnabled').click();
await page.locator('#paramrotationRate').fill('0.5');
 await page.locator('#inspDup').click();assert.equal(await page.locator('#wellCount').textContent(),'8');
 await page.locator('#inspDel').click();assert.equal(await page.locator('#wellCount').textContent(),'7');
 await page.locator('#toolParticles').click();await page.locator('#pmSeed50').click();assert.ok(Number(await page.locator('#particleCount').textContent())>=50);
 await page.locator('#btnStep').click();await page.locator('#btnPause').click();await page.waitForTimeout(1200);await page.locator('#btnPause').click();
 await page.locator('#btnPresets').click();assert.equal(await page.locator('.preset-item').count(),9);await page.locator('.preset-item').first().click();assert.equal(await page.locator('#wellCount').textContent(),'2');
 await page.locator('#toolWell').click();
 for(const name of ['Fountain','Void Bloom']){await page.locator('#btnPresets').click();await page.locator('.preset-item').filter({hasText:name}).click();const point=name==='Fountain'?[mobile?195:640,mobile?489.52:464]:[mobile?195:640,mobile?422:400];await tap(...point);assert.match(await page.locator('#inspTitle').textContent(),/REPULSOR/);const mass=await page.locator('#massVal').textContent();await page.locator('#inspDup').click();assert.equal(await page.locator('#massVal').textContent(),mass);}
 await page.locator('#btnMore').click();await page.locator('#btnCinematic').click();await page.locator('#exitCinematic').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gravityGardenSettings')));assert.equal(saved.boundary,'bounce');assert.equal(saved.trail,'short');
 await page.waitForTimeout(350);await page.screenshot({path:path.join(__dirname,mobile?'touch.png':'desktop.png')});assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});


