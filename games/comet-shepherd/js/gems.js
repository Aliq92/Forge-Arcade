import {stepFlight,cloneFlightSystem,overlapsFlight} from './physics.js';
import {CONFIG} from './config.js';
export const GEM_TARGET=8;
export const GEM_TYPES={
 CYAN:{points:10,color:'#62efff',rgb:'98,239,255',sides:4},
 AMBER:{points:30,color:'#ffc15b',rgb:'255,193,91',sides:6},
 VIOLET:{points:50,color:'#be8bff',rgb:'190,139,255',sides:3},
};
// Validated teaching lane outside all body/belt orbits; later amber gems require
// small intentional corrections. Existing inner-system exploration remains intact.
export function prepareGemRoute(system){
 const r=Math.hypot(system.spawn.x,system.spawn.y),nx=system.spawn.x/r,ny=system.spawn.y/r;
 const tangent=45+Math.min(30,(system.systemNumber-1)*4);
 system.vel={x:nx*55-ny*tangent,y:ny*55+nx*tangent};
 const future=cloneFlightSystem(system),c={...system.spawn,vx:system.vel.x,vy:system.vel.y,radius:9};
 const gems=[];let next=180;
 for(let step=1;step<=2100;step++){
  stepFlight(c,future,CONFIG.PHYSICS_DT);
  if(step===next){
   const i=gems.length,type=i===3||i===7?'AMBER':'CYAN';
   const offset=type==='AMBER'?Math.min(34,(system.systemNumber-1)*5):0;
   gems.push({id:'gem-'+i,type,x:c.x-ny*offset,y:c.y+nx*offset,radius:12,collected:false});
   next+=240;
  }
 }
 // Distinct, optional high-value challenges alongside the primary lane.
 for(const i of [2,5]){
  const g=gems[i];gems.push({id:'violet-'+i,type:'VIOLET',x:g.x-ny*95,y:g.y+nx*95,radius:10,collected:false});
 }
 system.gems=gems;system.gemTarget=GEM_TARGET;
 return gems;
}
export function collectGems(gems,comet,onCollect){
 for(const gem of gems){
  if(gem.collected||!overlapsFlight(comet,gem,comet.radius+gem.radius))continue;
  gem.collected=true;onCollect(gem);
 }
}
