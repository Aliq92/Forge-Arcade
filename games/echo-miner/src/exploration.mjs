import {TILE_SIZE} from './config.mjs';

export const SCANNER=Object.freeze({radius:400,cooldown:15,highlight:5});

export function createExploration(cave,player){
 const exploration={seen:new Uint8Array(cave.tiles.length),indices:[],revision:0,crystals:new Set(),hunter:null,bounds:null};
 discoverArea(exploration,cave,player,TILE_SIZE*2.1);
 return exploration;
}

// Only newly discovered cells enter the compact list. Rendering can append them to a cache.
export function discoverArea(e,cave,position,radius){
 const minX=Math.max(0,Math.floor((position.x-radius)/TILE_SIZE)),maxX=Math.min(cave.width-1,Math.floor((position.x+radius)/TILE_SIZE));
 const minY=Math.max(0,Math.floor((position.y-radius)/TILE_SIZE)),maxY=Math.min(cave.height-1,Math.floor((position.y+radius)/TILE_SIZE));
 let changed=0;
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const i=y*cave.width+x;
  if(!e.seen[i]&&Math.hypot((x+.5)*TILE_SIZE-position.x,(y+.5)*TILE_SIZE-position.y)<=radius){
   e.seen[i]=1;e.indices.push(i);changed++;
   if(!e.bounds)e.bounds={minX:x,maxX:x,minY:y,maxY:y};
   else{e.bounds.minX=Math.min(x,e.bounds.minX);e.bounds.maxX=Math.max(x,e.bounds.maxX);e.bounds.minY=Math.min(y,e.bounds.minY);e.bounds.maxY=Math.max(y,e.bounds.maxY);}
  }
 }
 if(changed)e.revision++;return changed;
}

export function rememberDiscoveries(run){
 const e=run.exploration;
 discoverArea(e,run.cave,run.player,TILE_SIZE*2.1);
 for(const pulse of run.pulses)discoverArea(e,run.cave,pulse.position,pulse.radius);
 for(const c of run.remainingCrystals)if(e.seen[c.y*run.cave.width+c.x])e.crystals.add(c.id);
 const seenAt=run.revealMap.get('hunter');
 // Store an observation, never an invisible live location. Sonar's entity reveal lasts six seconds.
 if(seenAt!==undefined&&run.elapsed-seenAt<=6)e.hunter={x:run.hunter.x,y:run.hunter.y,time:run.elapsed};
}

export function createScanner(){return {serial:0,cooldownUntil:0,highlightUntil:0,origin:null,crystals:[],passages:[]};}

export function scan(cave,player,crystals,e,scanner,now){
 if(now+1e-9<scanner.cooldownUntil)return scanner;
 const nearby=crystals.filter(c=>Math.hypot((c.x+.5)*TILE_SIZE-player.x,(c.y+.5)*TILE_SIZE-player.y)<=SCANNER.radius);
 for(const c of nearby)e.crystals.add(c.id);
 const passages=[];
 const floor=(x,y)=>x>=0&&y>=0&&x<cave.width&&y<cave.height&&cave.tiles[y*cave.width+x]===1;
 const r=Math.ceil(SCANNER.radius/TILE_SIZE),cx=Math.floor(player.x/TILE_SIZE),cy=Math.floor(player.y/TILE_SIZE);
 for(let y=Math.max(1,cy-r);y<Math.min(cave.height-1,cy+r+1);y++)for(let x=Math.max(1,cx-r);x<Math.min(cave.width-1,cx+r+1);x++){
  if(e.seen[y*cave.width+x]||!floor(x,y))continue;
  const d=Math.hypot((x+.5)*TILE_SIZE-player.x,(y+.5)*TILE_SIZE-player.y);if(d>SCANNER.radius)continue;
  const narrow=(floor(x-1,y)&&floor(x+1,y)&&!floor(x,y-1)&&!floor(x,y+1))||(floor(x,y-1)&&floor(x,y+1)&&!floor(x-1,y)&&!floor(x+1,y));
  if(narrow)passages.push({x,y,distance:d});
 }
 passages.sort((a,b)=>a.distance-b.distance);
 const spaced=[];for(const p of passages){if(spaced.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=4))spaced.push(p);if(spaced.length===6)break;}
 return {serial:scanner.serial+1,cooldownUntil:now+SCANNER.cooldown,highlightUntil:now+SCANNER.highlight,origin:{x:player.x,y:player.y},crystals:nearby,passages:spaced};
}

export function mapBounds(cave,width,height,padding=12){
 const scale=Math.min((width-padding*2)/cave.width,(height-padding*2)/cave.height);
 return {x:(width-cave.width*scale)/2,y:(height-cave.height*scale)/2,width:cave.width*scale,height:cave.height*scale,scale};
}
export function projectMapPoint(cave,point,bounds){return {x:bounds.x+(point.x/TILE_SIZE-(bounds.originX||0))*bounds.scale,y:bounds.y+(point.y/TILE_SIZE-(bounds.originY||0))*bounds.scale};}

export function mapViewport(run,expanded){
 const {cave,exploration:e}=run;
 if(expanded)return {x:0,y:0,width:cave.width,height:cave.height};
 let {minX,maxX,minY,maxY}=e.bounds||{minX:cave.lift.x,maxX:cave.lift.x,minY:cave.lift.y,maxY:cave.lift.y};
 const include=p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);};
 include(cave.lift);include({x:run.player.x/TILE_SIZE,y:run.player.y/TILE_SIZE});
 for(const c of run.remainingCrystals)if(e.crystals.has(c.id))include(c);
 if(run.scanner.highlightUntil>run.elapsed)for(const p of run.scanner.passages)include(p);
 if(run.tremor.phase==='warning'||run.tremor.phase==='active')for(const p of run.tremor.tiles)include(p);
 if(e.hunter&&run.elapsed-e.hunter.time<30)include({x:e.hunter.x/TILE_SIZE,y:e.hunter.y/TILE_SIZE});
 const width=Math.min(cave.width,Math.max(24,maxX-minX+7)),height=Math.min(cave.height,Math.max(24,maxY-minY+7));
 return {x:Math.max(0,Math.min(cave.width-width,(minX+maxX+1-width)/2)),y:Math.max(0,Math.min(cave.height-height,(minY+maxY+1-height)/2)),width,height};
}
