import {overlapsFlight} from './physics.js';
import {makeRng, TAU} from './utils.js';

export const GEM_TARGET=8;
export const GEM_TYPES={
 CYAN:{points:10,color:'#62efff',rgb:'98,239,255',sides:4},
 AMBER:{points:30,color:'#ffc15b',rgb:'255,193,91',sides:6},
 VIOLET:{points:50,color:'#be8bff',rgb:'190,139,255',sides:3},
};

// Spread collectible gems around the entire solar system instead of putting them
// on a single predicted flight line. Generated positions are repeatable per seed.
export function prepareGemRoute(system){
 const rng=makeRng(`${system.seed}-scattered-gems-v1`);
 const spawnR=Math.hypot(system.spawn.x,system.spawn.y);
 const nx=system.spawn.x/spawnR,ny=system.spawn.y/spawnR;
 const tangent=45+Math.min(30,(system.systemNumber-1)*4);
 // Preserve the original, tested starting flight characteristics.
 system.vel={x:nx*55-ny*tangent,y:ny*55+nx*tangent};

 const star=system.star;
 const outerRadius=system.bounds.radius;
 const innerRadius=Math.max(star.dangerRadius+145,star.radius+280,390);
 const maxRadius=Math.max(innerRadius+650,outerRadius-280);
 const count=12; // Eight needed to win; four more allow route choices.
 const gems=[];
 const startAngle=Math.atan2(system.spawn.y,system.spawn.x);

 function safe(x,y,spacing){
  const radial=Math.hypot(x-star.x,y-star.y);
  if(radial<innerRadius||radial>maxRadius)return false;
  if(Math.hypot(x-system.spawn.x,y-system.spawn.y)<430)return false;
  if(Math.hypot(x-system.gate.x,y-system.gate.y)<130)return false;
  // Planets move, so avoid their *entire orbital bands*, not just current positions.
  for(const planet of system.planets){
   if(Math.abs(radial-planet.orbitRadius)<planet.radius+75)return false;
  }
  for(const belt of system.belts){
   // Belt structure can vary; its radial orbit is not guaranteed to be exposed.
   const br=belt.radius??belt.orbitRadius;
   if(Number.isFinite(br)&&Math.abs(radial-br)<95)return false;
  }
  return gems.every(g=>Math.hypot(x-g.x,y-g.y)>=spacing);
 }

 for(let i=0;i<count;i++){
  const type=i===3||i===9?'AMBER':i===5||i===11?'VIOLET':'CYAN';
  let chosen=null;
  // A different angular slice for each gem, with variable radius within it.
  // If a slice is crowded by orbital hazards, allow nearby sectors on retry.
  for(let attempt=0;attempt<1800;attempt++){
   const slice=i*TAU/count;
   const spread=attempt<500?0.43:attempt<1100?0.9:1.5;
   const angle=startAngle+slice+(rng()-0.5)*TAU/count*spread;
   const t=0.09+0.83*rng();
   const radius=innerRadius+(maxRadius-innerRadius)*t;
   const x=star.x+Math.cos(angle)*radius;
   const y=star.y+Math.sin(angle)*radius;
   const spacing=attempt<800?380:attempt<1400?280:210;
   if(safe(x,y,spacing)){chosen={x,y};break;}
  }
  // Very crowded or custom systems: relax orbital clearance before giving up.
  if(!chosen){
   for(let attempt=0;attempt<3000;attempt++){
    const angle=rng()*TAU,r=innerRadius+(maxRadius-innerRadius)*rng();
    const x=star.x+Math.cos(angle)*r,y=star.y+Math.sin(angle)*r;
    if(Math.hypot(x-system.spawn.x,y-system.spawn.y)<350)continue;
    if(gems.every(g=>Math.hypot(x-g.x,y-g.y)>210)){
     chosen={x,y};break;
    }
   }
  }
  if(!chosen)throw new Error('Unable to place scattered gems in this system');
  gems.push({id:`gem-${i}`,type,x:chosen.x,y:chosen.y,radius:type==='VIOLET'?10:12,collected:false});
 }
 system.gems=gems;
 system.gemTarget=GEM_TARGET;
 return gems;
}

export function collectGems(gems,comet,onCollect){
 for(const gem of gems){
  if(gem.collected||!overlapsFlight(comet,gem,comet.radius+gem.radius))continue;
  gem.collected=true;onCollect(gem);
 }
}
