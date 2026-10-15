// Headless DOM adapter exercises the real script.js event handlers and game.
// Browser screenshots separately verify actual layout and rendering.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const P=require('../physics.js'),OG=require('../game.js');
function boot(storage=new Map()) {
  const els=new Map(),instances=[],winEvents={},docEvents={};let frame;
  const gradient={addColorStop(){}};
  const ctx=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});
  class Element {
    constructor(id){this.id=id;this.events={};this.style={};this.dataset={};this.value=100;this.hidden=false;this.captured=null;this.textContent='';this.classList={add(){},remove(){},toggle(){}};}
    addEventListener(n,f){(this.events[n]??=[]).push(f);}
    emit(n,e={}){for(const f of this.events[n]||[])f({button:0,pointerId:1,clientX:500,clientY:400,preventDefault(){},...e});}
    click(){this.onclick?.({target:this});this.emit('click');}
    setAttribute(n,v){this[n]=v;}
    getContext(){return ctx;}
    getBoundingClientRect(){return {left:0,top:0,width:1000,height:600};}
    setPointerCapture(id){this.captured=id;}
    hasPointerCapture(id){return id===this.captured;}
    releasePointerCapture(){this.captured=null;}
    focus(){}
    querySelector(){return {focus(){}};}
    querySelectorAll(){return [];}
  }
  const $=id=>{if(!els.has(id))els.set(id,new Element(id));return els.get(id);};
  const modes=['arcade','chambers','chaos'].map(m=>{const e=new Element(m);e.dataset.mode=m;return e;});
  const doc={getElementById:$,body:new Element('body'),hidden:false,querySelectorAll:()=>modes,addEventListener:(n,f)=>docEvents[n]=f};
  const context={OrbitPhysics:P,OrbitChambers:OG.CHAMBERS,OrbitGame:{...OG,Game:class extends OG.Game{constructor(...args){super(...args);instances.push(this);}}},document:doc,window:{addEventListener:(n,f)=>winEvents[n]=f},innerWidth:1000,devicePixelRatio:1,matchMedia:()=>({matches:false}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},ResizeObserver:class{observe(){}},requestAnimationFrame:f=>frame=f,setTimeout:()=>1,clearTimeout(){},HTMLInputElement:class{},HTMLButtonElement:class{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../script.js'),'utf8'),context,{filename:'script.js'});
  return {$,modes,doc,winEvents,docEvents,storage,get g(){return instances.at(-1);},tick(now){frame(now);}};
}
test('startup runs in Arcade with a moving ball and populated targets',()=>{const f=boot();assert.equal(f.g.mode,'arcade');assert.equal(f.g.targets.length,8);assert.ok(Math.hypot(f.g.balls[0].vx,f.g.balls[0].vy)>100);});
test('pointer press, drag, release and cancellation clear the real attractor',()=>{const f=boot(),c=f.$('arena');for(const ending of ['pointerup','pointercancel','lostpointercapture']){c.emit('pointerdown');assert.ok(f.g.attractor);const x=f.g.attractor.x;c.emit('pointermove',{clientX:550});assert.notEqual(f.g.attractor.x,x);c.emit(ending);assert.equal(f.g.attractor,null);assert.equal(c.captured,null);}});
test('a second finger does not steal or cancel the active pointer',()=>{const f=boot(),c=f.$('arena');c.emit('pointerdown');const a=f.g.attractor;c.emit('pointerdown',{pointerId:2,clientX:650});c.emit('pointerup',{pointerId:2});assert.equal(f.g.attractor,a);c.emit('pointerup');assert.equal(f.g.attractor,null);});
test('window blur releases gravity and pauses; resume avoids time jumps',()=>{const f=boot();f.$('arena').emit('pointerdown');f.winEvents.blur();assert.equal(f.g.attractor,null);assert.equal(f.g.paused,true);const before=f.g.time;f.tick(1000000);assert.equal(f.g.time,before);f.$('resume').click();f.tick(2000000);assert.ok(f.g.time-before<=.06);});
test('hidden tab pauses and cannot keep applying gravity',()=>{const f=boot();f.$('arena').emit('pointerdown');f.doc.hidden=true;f.docEvents.visibilitychange();assert.equal(f.g.paused,true);assert.equal(f.g.attractor,null);});
test('restart resets score, shields, ball state and pause',()=>{const f=boot();f.g.score=900;f.g.shields=1;f.$('pause').click();f.$('restart').click();assert.equal(f.g.score,0);assert.equal(f.g.shields,3);assert.equal(f.g.paused,false);});
test('mute preference survives reload',()=>{const f=boot();f.$('sound').click();const again=boot(f.storage);assert.equal(again.$('sound')['aria-label'],'Enable sound');});
test('chamber success saves unlock, completion, and best result',()=>{const f=boot();f.modes[1].click();f.$('picker-back').click();for(const t of f.g.targets)f.g.hit(t,f.g.balls[0]);for(let i=0;i<120;i++)f.g.update(P.STEP);f.tick(1000);const saved=JSON.parse(f.storage.get('orbitBreaker_save'));assert.ok(saved.completed.includes(0));assert.equal(saved.unlocked,2);assert.ok(saved.results[0]);const again=boot(f.storage);again.modes[1].click();assert.equal(again.g.chamber,1);});
test('invalid and blocked save storage do not prevent startup',()=>{const f=boot(new Map([['orbitBreaker_save','{bad json']]));assert.equal(f.g.mode,'arcade');const again=boot({get(){throw Error('blocked');},set(){throw Error('blocked');}});again.$('sound').click();assert.ok(again.g);});
test('Chaos toolbar changes ball count, reset restores three balls and gravity',()=>{const f=boot();f.modes[2].click();f.$('add-ball').click();assert.equal(f.g.balls.length,4);f.$('strength').oninput({target:{value:150}});assert.equal(f.g.strength,1.5);f.$('restart').click();assert.equal(f.g.balls.length,3);assert.equal(f.g.strength,1);assert.equal(f.$('strength').value,100);});
test('personal best and largest combo persist immediately after an Arcade hit',()=>{const f=boot();f.g.hit(f.g.targets.find(t=>t.type==='chain'),f.g.balls[0]);f.tick(1000);const data=JSON.parse(f.storage.get('orbitBreaker_save')||'{}');assert.equal(data.best,f.g.score);assert.equal(data.combo,f.g.bestCombo);});
