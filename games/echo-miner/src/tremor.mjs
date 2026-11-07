import {TILE_SIZE} from './config.mjs';
import {createRng} from './random.mjs';
import {floodReachable} from './pathfinding.mjs';

export const TREMOR=Object.freeze({warning:4,active:6,recovery:3,minInterval:90,maxInterval:150,maxBlocks:3});
const interval=(seed,cycle)=>createRng(`${seed}:tremor:${cycle}`).float(TREMOR.minInterval,TREMOR.maxInterval);
export function createTremor(seed){return {seed,cycle:0,phase:'quiet',nextAt:interval(seed,0),until:0,tiles:[],grid:null};}
const center=p=>({x:(p.x+.5)*TILE_SIZE,y:(p.y+.5)*TILE_SIZE});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// Check the complete remaining floor graph, not just a path to the nearest objective.
// The baseline grid is immutable; the transient grid is shared by player and Hunter.
export function chooseObstructions({cave,player,hunter,crystals,seed,candidates}){
 const protectedPoints=[{...player,clearance:96},{...hunter,clearance:96},{...center(cave.lift),clearance:96},...crystals.map(c=>({...center(c),clearance:64}))];
 let pool=candidates;
 if(!pool){
  pool=[];const px=Math.floor(player.x/TILE_SIZE),py=Math.floor(player.y/TILE_SIZE);
  for(let y=Math.max(1,py-13);y<Math.min(cave.height-1,py+14);y++)for(let x=Math.max(1,px-13);x<Math.min(cave.width-1,px+14);x++){
   if(cave.tiles[y*cave.width+x]===1&&distance(center({x,y}),player)<=400)pool.push({x,y});
  }
  pool=createRng(`${seed}:blocks`).shuffle(pool).slice(0,48);
 }
 const tiles=[],grid={...cave,tiles:cave.tiles.slice()},start={x:Math.floor(player.x/TILE_SIZE),y:Math.floor(player.y/TILE_SIZE)};
 const count=cave.tiles.reduce((n,t)=>n+(t===1),0);
 for(const p of pool){
  if(tiles.length>=TREMOR.maxBlocks)break;
  const pos=center(p),i=p.y*cave.width+p.x;
  if(grid.tiles[i]!==1||protectedPoints.some(q=>distance(pos,q)<q.clearance))continue;
  grid.tiles[i]=0;
  if(floodReachable(grid,start).size===count-tiles.length-1)tiles.push({x:p.x,y:p.y});else grid.tiles[i]=1;
 }
 return {tiles,grid:tiles.length?grid:null};
}

export function updateTremor(t,context){
 if(!context.enabled)return t;
 const {now}=context;
 if(t.phase==='quiet'&&now>=t.nextAt){
  const selected=chooseObstructions({...context,seed:`${t.seed}:${t.cycle}`});
  return {...t,phase:'warning',until:now+TREMOR.warning,tiles:selected.tiles,grid:null};
 }
 if(t.phase==='warning'&&now>=t.until){
  // The warning is a promise: only warned cells can close, and occupied/unsafe ones are dropped.
  const selected=chooseObstructions({...context,seed:t.seed,candidates:t.tiles});
  return {...t,phase:'active',until:now+TREMOR.active,...selected};
 }
 if(t.phase==='active'&&now>=t.until)return {...t,phase:'recovery',until:now+TREMOR.recovery,grid:null};
 if(t.phase==='recovery'&&now>=t.until){const cycle=t.cycle+1;return {...t,cycle,phase:'quiet',nextAt:now+interval(t.seed,cycle),tiles:[],grid:null};}
 return t;
}
