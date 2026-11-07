import {Game} from '../js/game.js';
const noop=()=>{};
export function harness(seed='checks'){
 const g=Object.create(Game.prototype);
 g.settings={previewDefault:true};g.audio=new Proxy({},{get:()=>noop});
 g.ui=new Proxy({},{get:(target,key)=>target[key]??noop});g.input={keys:{},dragging:false,setEnabled:noop,reset:noop,dragVector:()=>null};
 g.renderer={camera:{follow:noop},worldToScreen:(x,y)=>({x,y}),addShake:noop};
 g.particles={clear:noop,spawnBudget:()=>0,spawn:noop};
 g._emitTailParticles=noop;g._emitFragmentParticles=noop;g._startRun(seed,true);return g;
}
