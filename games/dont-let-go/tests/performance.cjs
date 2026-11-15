/* Controlled flight benchmark and ablations. No production diagnostic hooks. */
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const url=process.env.DLG_URL||'http://127.0.0.1:4173/games/dont-let-go/';
const baseRef=process.env.DLG_BASE_REF||'f0a3a9d';
const original=execFileSync('git',['show',baseRef+':games/dont-let-go/index.html'],{encoding:'utf8'});
const current=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const vendor=path.resolve(__dirname,'../vendor/three.min.js');
const environment=fs.readFileSync(path.resolve(__dirname,'../environment.js'),'utf8');
const variants=process.env.DLG_VARIANTS?JSON.parse(process.env.DLG_VARIANTS):[
 {name:'fix22-high',original:true},{name:'highlands-high'},{name:'highlands-low',low:true}
];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report=[];
 try{
 for(const v of variants){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=22;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};});
 await page.route('**/environment.js',r=>r.fulfill({body:v.original?execFileSync('git',['show',baseRef+':games/dont-let-go/environment.js'],{encoding:'utf8'}):environment,contentType:'text/javascript'}));
 await page.route('**/three.min.js',r=>r.fulfill({path:vendor,contentType:'text/javascript'}));
 await page.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>r.fulfill({path:vendor,contentType:'text/javascript'}));
 await page.route('**/games/dont-let-go/',r=>{
 let source=v.original?original:current;
 const injection=`window.__bench={frames:[],js:[],last:0,active:false,info:()=>({draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,dpr:renderer.getPixelRatio(),state,elapsed})};
 ${`detailMode='high';${v.low?'setDetail(true);': ''}${v.noCity?'environment.group.visible=false;':''}`}
 ${v.dpr?`renderer.setPixelRatio(${v.dpr});`:''}
 const benchRender=renderer.render.bind(renderer);
 renderer.render=function(s,c){const a=performance.now();benchRender(s,c);if(__bench.active)__bench.js.push(performance.now()-a);};
 const benchRAF=requestAnimationFrame;
 window.requestAnimationFrame=fn=>benchRAF(t=>{if(__bench.active){if(__bench.last)__bench.frames.push(t-__bench.last);__bench.last=t;}fn(t);});`;
 source=source.replace('updateSector(0);\nresetWorld();',injection+'\nupdateSector(0);\nresetWorld();');
 if(v.noBlur)source=source.replace('</style>','*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}</style>');
 return r.fulfill({body:source,contentType:'text/html'});
 });
 await page.goto(url);await page.waitForFunction(()=>window.__bench);await page.keyboard.down('Space');await page.waitForTimeout(1500);await page.evaluate(()=>{__bench.active=true;});await page.waitForTimeout(5000);
 const result=await page.evaluate(()=>{__bench.active=false;const percentile=(arr,q)=>arr.length?[...arr].sort((a,b)=>a-b)[Math.floor((arr.length-1)*q)]:null;return {...__bench.info(),samples:__bench.frames.length,medianMs:percentile(__bench.frames,.5),p95Ms:percentile(__bench.frames,.95),medianJSRenderMs:percentile(__bench.js,.5)};});
 assert.deepEqual(errors,[]);assert.equal(result.state,'playing');assert.ok(result.samples>=15,'insufficient frames for a timing sample');
 const item={variant:v.name,...result,errors};report.push(item);console.log(JSON.stringify(item));await context.close();
 }
 fs.writeFileSync(path.resolve(__dirname,process.env.DLG_BENCH_OUT||'../qa/fix23/flight-performance.json'),JSON.stringify({baselineRef:baseRef,renderer:'Chromium SwiftShader software WebGL',viewport:'1440x900',warmupMs:1500,sampleMs:5000,variants:report},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
