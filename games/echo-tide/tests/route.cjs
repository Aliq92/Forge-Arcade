const load=require('./harness.cjs'),{Simulation,CONFIG,State}=load();
function planner(world){
 const cell=40,cols=150,rows=120,blocked=new Uint8Array(cols*rows);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const p={x:x*cell+20,y:y*cell+20};blocked[y*cols+x]=world.rocksNear(p).some(r=>Math.hypot(p.x-r.x,p.y-r.y)<r.r+CONFIG.vesselRadius+35)?1:0;}
 // Clearance checks include adjacent cells because the planner uses extra margin.
 for(const r of world.rocks){const radius=r.r+CONFIG.vesselRadius+35;for(let y=Math.max(0,Math.floor((r.y-radius)/cell));y<=Math.min(rows-1,Math.floor((r.y+radius)/cell));y++)for(let x=Math.max(0,Math.floor((r.x-radius)/cell));x<=Math.min(cols-1,Math.floor((r.x+radius)/cell));x++)if(Math.hypot(x*cell+20-r.x,y*cell+20-r.y)<radius)blocked[y*cols+x]=1;}
 return(from,to)=>{
  const ix=p=>Math.max(0,Math.min(cols-1,Math.floor(p.x/cell)))+Math.max(0,Math.min(rows-1,Math.floor(p.y/cell)))*cols,a=ix(from),b=ix(to),prev=new Int32Array(cols*rows).fill(-1),queue=[a];prev[a]=a;
  for(let i=0;i<queue.length&&prev[b]<0;i++){const p=queue[i],x=p%cols,y=Math.floor(p/cols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,n=yy*cols+xx;if(xx<0||xx>=cols||yy<0||yy>=rows||blocked[n]||prev[n]>=0)continue;prev[n]=p;queue.push(n);}}
  if(prev[b]<0)throw Error('Unreachable target '+JSON.stringify(to));let n=b;const points=[];while(n!==a){points.push({x:n%cols*cell+20,y:Math.floor(n/cols)*cell+20});n=prev[n];}points.reverse();
  return points.filter((p,i)=>!i||i===points.length-1||(p.x-points[i-1].x)!==(points[i+1].x-p.x)||(p.y-points[i-1].y)!==(points[i+1].y-p.y));
 };
}
function voyage(seed=4139,burst=false){
 const s=new Simulation(seed),route=planner(s.world),events=[];let steps=0;
 for(const target of [...s.world.beacons,s.world.sanctuary])for(const point of route(s.player,target)){
  let guard=0;while(Math.hypot(point.x-s.player.x,point.y-s.player.y)>12){
   if(guard++>1800)throw Error(`Stuck seed${seed} at ${JSON.stringify(point)} vessel${JSON.stringify(s.player)}; ${s.zoneStatus().kind}`);
   const dx=point.x-s.player.x,dy=point.y-s.player.y,d=Math.hypot(dx,dy),axis={x:dx/d,y:dy/d};
   if(s.time-s.lastPulse>12)s.pulse();
   if(burst&&d>240&&Math.cos(s.player.angle)*axis.x+Math.sin(s.player.angle)*axis.y>.995&&!s.burstCooldown)s.burst();
   s.update(1/30,axis,type=>{if(['damage','evade'].includes(type))events.push(type);});steps++;
   if(s.event===State.GAME_OVER)throw Error('Route lost hull on seed '+seed);
   if(s.event===State.VICTORY)break;
  }
  if(s.event===State.VICTORY)break;
 }
 if(!s.world.beacons.every(b=>b.active)||s.event!==State.VICTORY)throw Error('Voyage incomplete '+seed);
 return{seed,burst,seconds:+s.time.toFixed(2),bursts:s.burstCount,hull:s.player.integrity,peak:+s.peak.toFixed(2),currentCrossings:s.currentCrossings,escapes:s.escapes,events,steps};
}
module.exports={planner,voyage};
