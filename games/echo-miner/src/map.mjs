import {TILE_SIZE} from './config.mjs';
import {mapBounds,projectMapPoint,mapViewport} from './exploration.mjs';

export function createMapRenderer(canvas){return {canvas,ctx:canvas.getContext('2d'),exploration:null,cache:null,painted:0,geometryUpdates:0};}

export function renderMap(renderer,run,expanded=false){
 const {canvas,ctx}=renderer,e=run.exploration,cave=run.cave;
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 if(renderer.exploration!==e){
  renderer.exploration=e;renderer.cache=document.createElement('canvas');renderer.cache.width=cave.width*3;renderer.cache.height=cave.height*3;renderer.painted=0;
 }
 if(renderer.painted<e.indices.length){
  const cache=renderer.cache.getContext('2d');
  for(let j=renderer.painted;j<e.indices.length;j++){
   const i=e.indices[j],x=i%cave.width,y=Math.floor(i/cave.width);
   if(cave.tiles[i]===1){cache.fillStyle='#164754';cache.fillRect(x*3,y*3,3,3);}
   else{cache.strokeStyle='#38c8d4';cache.lineWidth=.6;cache.strokeRect(x*3+.5,y*3+.5,2,2);}
  }
  renderer.painted=e.indices.length;renderer.geometryUpdates++;
 }
 ctx.fillStyle='#050d15';ctx.fillRect(0,0,width,height);
 const view=mapViewport(run,expanded),bounds={...mapBounds(view,width,height,(expanded?20:8)*dpr),originX:view.x,originY:view.y};
 ctx.imageSmoothingEnabled=false;ctx.drawImage(renderer.cache,view.x*3,view.y*3,view.width*3,view.height*3,bounds.x,bounds.y,bounds.width,bounds.height);
 ctx.strokeStyle='#326170';ctx.lineWidth=dpr;ctx.strokeRect(bounds.x-2,bounds.y-2,bounds.width+4,bounds.height+4);
 const point=p=>projectMapPoint(cave,p,bounds),tile=p=>point({x:(p.x+.5)*TILE_SIZE,y:(p.y+.5)*TILE_SIZE});
 const diamond=(p,color,size,fill=true)=>{ctx.beginPath();ctx.moveTo(p.x,p.y-size);ctx.lineTo(p.x+size,p.y);ctx.lineTo(p.x,p.y+size);ctx.lineTo(p.x-size,p.y);ctx.closePath();ctx.strokeStyle=color;ctx.fillStyle=color;fill?ctx.fill():ctx.stroke();};
 const size=(expanded?4:2.5)*dpr;
 diamond(tile(cave.lift),'#ffc867',size+1);
 if(expanded){const p=tile(cave.lift);ctx.fillStyle='#ffc867';ctx.font=`${10*dpr}px system-ui`;ctx.fillText('LIFT',p.x+7*dpr,p.y-4*dpr);}
 for(const c of run.remainingCrystals)if(e.crystals.has(c.id))diamond(tile(c),'#ffc867',size);
 if(run.scanner.highlightUntil>run.elapsed)for(const p of run.scanner.passages)diamond(tile(p),'#55f2d5',size+1,false);
 if(e.hunter&&run.elapsed-e.hunter.time<30){
  const p=point(e.hunter);ctx.globalAlpha=Math.max(.25,1-(run.elapsed-e.hunter.time)/30);diamond(p,'#c99cff',size+2,false);ctx.globalAlpha=1;
  if(expanded){ctx.fillStyle='#c99cff';ctx.font=`${9*dpr}px system-ui`;ctx.fillText('LAST SEEN',p.x+7*dpr,p.y+9*dpr);}
 }
 if(run.tremor.phase==='warning'||run.tremor.phase==='active')for(const t of run.tremor.tiles){const p=tile(t);ctx.strokeStyle='#c99cff';ctx.lineWidth=2*dpr;ctx.beginPath();ctx.moveTo(p.x-size,p.y-size);ctx.lineTo(p.x+size,p.y+size);ctx.moveTo(p.x-size,p.y+size);ctx.lineTo(p.x+size,p.y-size);ctx.stroke();}
 const p=point(run.player);ctx.strokeStyle='#55f2d5';ctx.lineWidth=dpr;ctx.beginPath();ctx.arc(p.x,p.y,6*dpr,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,2.7*dpr,0,Math.PI*2);ctx.fill();
 ctx.font=`bold ${10*dpr}px system-ui`;ctx.fillStyle='#9bc3cb';ctx.fillText('N ↑',width-32*dpr,14*dpr);
}
