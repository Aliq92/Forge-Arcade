const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function load({baseline=false,seed=123,reducedMotion=false}={}){
 let n=seed;const math=Object.create(Math);math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const storage=new Map(),noop=()=>{};
 const context=vm.createContext({console,Math:math,Date,performance,window:{addEventListener:noop,matchMedia:()=>({matches:reducedMotion})},document:{getElementById:()=>({})},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout:noop,clearTimeout:noop});
 const html=baseline?cp.execFileSync('git',['show','2a4c907:games/void-drifter/index.html'],{encoding:'utf8'}):fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const [,p]of html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)){
  if(p==='js/main.js')continue;
  const source=baseline?cp.execFileSync('git',['show','2a4c907:games/void-drifter/'+p],{encoding:'utf8'}):fs.readFileSync(path.join(root,p),'utf8');
  vm.runInContext(source,context,{filename:p});
 }
 vm.runInContext(`
  const no=()=>{}; UIManager=class {constructor(){return new Proxy({titleBest:{textContent:''}},{get:(t,k)=>t[k]??no});}};
  InputManager=class {constructor(){this.state={};}getState(){return this.state;}clearHeld(){this.state={};}onPause(){}onInteract(){}onAnyKey(){}};
  SoundEngine=class {constructor(){return new Proxy({},{get:()=>no});}};StarField=class{};
  globalThis.API={Player,World,Pickup,Game,EventManager,SaveData,rollUpgradeChoices,ParticlePool,
   SurvivalDirector:typeof SurvivalDirector==='undefined'?null:SurvivalDirector,
   MysteryBox:typeof MysteryBox==='undefined'?null:MysteryBox,
   applyMysteryReward:typeof applyMysteryReward==='undefined'?null:applyMysteryReward};
 `,context);
 const game=vm.runInContext('new Game()',context);game.startRun('standard',seed);
 if(baseline)game.world=new context.API.World(seed,'standard');
 return {context,game,api:context.API,storage};
}
module.exports={load};
