'use strict';
const {chromium}=require(process.env.FORGE_PLAYWRIGHT||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=new URL('games/outpost-orbit/',process.env.FORGE_URL||'http://127.0.0.1:8428/').href;
(async()=>{
 await fs.mkdir('test-results/outpost-orbit',{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),report=[];
 try{for(const [width,height,touch]of [[1440,900,false],[768,1024,true],[390,844,true],[320,740,true],[844,390,true]]){
  const c=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:2,reducedMotion:width===320?'reduce':'no-preference'});
  await c.addInitScript(()=>Date.now=()=>42);const p=await c.newPage(),errors=[],missing=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
  await p.goto(base);await p.waitForFunction(()=>window.outpost);assert.equal(await p.locator('#frontier-menu').evaluate(d=>d.open),true);assert.equal(await p.evaluate(()=>outpost.audioState),null);
  await p.screenshot({path:`test-results/outpost-orbit/after-menu-${width}.png`});
  await p.click('#start-colony');await p.locator('[data-speed="0"]').click();const start=await p.evaluate(()=>({time:outpost.state.time,x:outpost.camera.x,zoom:outpost.camera.zoom}));
  await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>outpost.state.time),start.time);
  if(touch){const cd=await c.newCDPSession(p);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:height*.55}]});await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:235,y:height*.58}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await p.locator('#world').click({position:{x:800,y:500}});await p.keyboard.press('ArrowRight');}
  assert.notEqual(await p.evaluate(()=>outpost.camera.x),start.x);await p.locator('#zoom-in').click();assert.ok(await p.evaluate(()=>outpost.camera.zoom)>start.zoom);await p.locator('#home').click();
  await p.locator('[data-panel="build"]').click();await p.locator('[data-build="habitat"]').click();const position=await p.evaluate(()=>outpost.screen(-130,0));await p.mouse.click(position.x,position.y);assert.equal(await p.evaluate(()=>outpost.state.buildings.filter(b=>b.type==='habitat').length),1);
  // Fast-forward the actual simulation, no inventory injection. Native controls above validate placement/input.
  await p.evaluate(async()=>{const {step}=await import('./simulation.js');for(let i=0;i<1000;i++)step(outpost.state,.1);});
  await p.locator('#mission-chip').click();await p.waitForFunction(()=>!document.getElementById('claim-mission').disabled);
  const stock=await p.evaluate(()=>outpost.state.resources.material);await p.locator('[data-upgrade="cargo"]').click();assert.equal(await p.evaluate(()=>outpost.state.frontier.upgrades.cargo),1);assert.equal(await p.evaluate(()=>outpost.state.resources.material),stock-12);
  await p.locator('#claim-mission').click();assert.equal(await p.evaluate(()=>outpost.state.frontier.mission),1);
  await p.locator('#focus-mission').click();assert.equal(await p.evaluate(()=>outpost.camera.x),0);
  await p.screenshot({path:`test-results/outpost-orbit/after-play-${width}.png`});await p.locator('#mission-chip').click();
  const panel=await p.locator('#panel').boundingBox();assert.ok(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height);await p.screenshot({path:`test-results/outpost-orbit/after-missions-${width}.png`});
  await p.locator('#close-panel').click();await p.locator('#settings').click();await p.locator('#sound').click();await p.locator('#calm').click();await p.locator('#save').click();
  const saved=await p.evaluate(()=>({resources:outpost.state.resources,frontier:outpost.state.frontier,buildings:outpost.state.buildings,muted:outpost.state.muted}));await p.reload();await p.waitForFunction(()=>window.outpost);
  assert.deepEqual(await p.evaluate(()=>({resources:outpost.state.resources,frontier:outpost.state.frontier,buildings:outpost.state.buildings,muted:outpost.state.muted})),saved);
  await p.locator('#continue-colony').click();await p.locator('[data-speed="0"]').click();
  if(width===1440){
   // Finish the same live colony through real work/purchases; mission rewards remain native button actions.
   const timings=[];
   for(let guard=0;guard<12&&!(await p.evaluate(()=>outpost.state.frontier.completed));guard++){
    const result=await p.evaluate(async()=>{
     const {step,place}=await import('./simulation.js'),{buyUpgrade,mission}=await import('./frontier.js'),s=outpost.state;
     let ticks=0;while(!mission(s).ready&&ticks++<18000){
      for(const type of ['habitat','garden','energy','workshop','research','storage'])if(!s.buildings.some(b=>b.type===type)){
       let done=false;for(let y=-180;y<=180&&!done;y+=60)for(let x=-240;x<=240&&!done;x+=60)done=place(s,type,x,y);
      }
      for(const id of ['cargo','energy','engine','scanner','station'])if(s.frontier.upgrades[id]<(id==='station'?2:1))buyUpgrade(s,id);
      step(s,.2);
     }
     return{mission:s.frontier.mission,time:s.time,ready:mission(s).ready};
    });assert.equal(result.ready,true);timings.push(result);await p.locator('#mission-chip').click();await p.locator('#claim-mission').click();if(await p.locator('#frontier-complete').evaluate(d=>d.open))break;await p.locator('#close-panel').click();
   }
   assert.equal(await p.evaluate(()=>outpost.state.frontier.completed),true);assert.equal(await p.locator('#frontier-complete').evaluate(d=>d.open),true);
   await p.screenshot({path:'test-results/outpost-orbit/after-complete.png'});await p.locator('#keep-exploring').click();await p.locator('[data-speed="0"]').click();
   await fs.writeFile('test-results/outpost-orbit/completed-colony.json',await p.evaluate(()=>JSON.stringify(outpost.state)));
   await p.locator('#home').click();await p.screenshot({path:'test-results/outpost-orbit/after-station.png'});report.push({progression:timings});
  }
  await p.locator('#settings').click();await p.locator('#new-colony').click();await p.locator('#keep').click();assert.equal(await p.evaluate(()=>outpost.state.frontier.mission)>0,true);await p.locator('#new-colony').click();await p.locator('#restart').click();await p.locator('[data-speed="0"]').click();assert.equal(await p.evaluate(()=>outpost.state.frontier.mission),0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await p.evaluate(()=>document.getElementById('world').width/innerWidth)<=1.5);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);report.push({width,height,touch,menu:true,movement:true,delivery:true,mission:true,save:true,pause:true,restart:true,errors,missing});await c.close();
 }
 await fs.writeFile(`test-results/outpost-orbit/browser-report${process.env.FORGE_URL?'-public':''}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
