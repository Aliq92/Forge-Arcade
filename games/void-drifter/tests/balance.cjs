const {load}=require('./harness.cjs'),fs=require('fs');
function scenario(baseline,seed,policy){
 const {game}=load({baseline,seed});const p=game.player;
 let immobile=null,loss=null,elapsed=0;
 for(let tick=0;tick<360*60;tick++){
  if(game.state==='upgrade'){game.skipUpgrade();}
  if(tick%12===0){
   const nearby=game.world.queryNearby(p.x,p.y,700);
   let turn=0,thrust=false,reverse=false;
   if(policy==='straight')thrust=true;
   else{
    let target=null,best=Infinity;
    const candidates=[...nearby.resources,...(game.survival?.boxes||[]),...(game.survival?.emergencyFuel?[game.survival.emergencyFuel]:[])];
    for(const r of candidates){if(r.collected)continue;if(r.type==='energy'&&p.energy>60)continue;if(r.type==='repair'&&p.hull>85)continue;
     const d=Math.hypot(r.x-p.x,r.y-p.y);if(d<best){best=d;target=r;}}
    let desired=target?Math.atan2(target.y-p.y,target.x-p.x):p.angle;
    // Deliberately low-speed exploration with two-second hazard lookahead.
    let avoidance=null,nearest=Infinity;
    for(const a of [...nearby.asteroids,...nearby.hazards]){
     if(a.dead||a.type==='ioncloud')continue;const dx=a.x-p.x,dy=a.y-p.y,d=Math.hypot(dx,dy);
     const ahead=dx*Math.cos(p.angle)+dy*Math.sin(p.angle);
     if(ahead>0&&ahead<220+(a.radius||15)&&d<220+(a.radius||15)&&d<nearest){nearest=d;avoidance=a;}
    }
    if(avoidance)desired=Math.atan2(p.y-avoidance.y,p.x-avoidance.x)+.5;
    let diff=(desired-p.angle+Math.PI*3)%(Math.PI*2)-Math.PI;
    turn=Math.abs(diff)>.08?Math.sign(diff):0;
    thrust=Math.abs(diff)<.45&&p.speed<(p.fuel<=0?45:105);
    reverse=p.speed>135;
    if(game.makeReserve&&p.fuel<8&&p.reserveCooldown<=0)game.makeReserve();
   }
   game.input.state={thrust,reverse,left:turn<0,right:turn>0};
  }
  game.update(1/60);elapsed=(tick+1)/60;
  if(p.fuel<=0&&p.speed<8&&immobile===null)immobile=elapsed;
  if(p.destroyed){loss=elapsed;break;}
 }
 return {baseline,seed,policy,simulatedSeconds:+elapsed.toFixed(2),hullLossSeconds:loss?+loss.toFixed(2):null,firstZeroFuelBelow8Speed:immobile?+immobile.toFixed(2):null,
  hull:+p.hull.toFixed(2),fuel:+p.fuel.toFixed(2),distanceKm:+(game.stats.maxDistancePx/400).toFixed(2),boxes:game.stats.mysteryBoxes??0,missions:game.stats.missionsCompleted??0};
}
const rows=[];
for(const policy of ['straight','explore'])for(const seed of [11,22,33])for(const baseline of [true,false])rows.push(scenario(baseline,seed,policy));
fs.mkdirSync('test-results/void-drifter',{recursive:true});fs.writeFileSync('test-results/void-drifter/balance.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
