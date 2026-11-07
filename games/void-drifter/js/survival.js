// Seeded recovery opportunities and a single optional mission; no extra animation loop.
class MysteryBox {
  constructor(x,y,reward,id){this.x=x;this.y=y;this.radius=14;this.reward=reward;this.id=id;this.collected=false;this.life=90;this.color='255,207,112';}
  draw(ctx,camera,w,h,time,reduced){
    if(this.collected)return;const x=this.x-camera.x+w/2,y=this.y-camera.y+h/2;
    if(x<-40||x>w+40||y<-40||y>h+40)return;
    ctx.save();ctx.translate(x,y);ctx.rotate(reduced?.12:Math.sin(time*.7)*.18);
    ctx.fillStyle='rgba(38,29,15,.95)';ctx.strokeStyle='#ffcf70';ctx.lineWidth=2;
    ctx.shadowColor='#ffcf70';ctx.shadowBlur=reduced?5:8+Math.sin(time*3)*3;
    ctx.fillRect(-12,-12,24,24);ctx.strokeRect(-12,-12,24,24);ctx.shadowBlur=0;
    ctx.strokeStyle='#fff0ba';ctx.lineWidth=1;ctx.strokeRect(-7,-7,14,14);
    ctx.fillStyle='#ffcf70';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',0,0);ctx.restore();
  }
}
function applyMysteryReward(reward,p){
  // If a consumable would be entirely wasted, bank useful salvage instead.
  if((reward==='full-refuel'&&p.fuel>=p.maxFuel)||(reward==='repair'&&p.hull>=p.maxHull)||(reward==='supply'&&p.fuel>=p.maxFuel&&p.energy>=p.maxEnergy))reward='salvage';
  if(reward==='salvage'&&p.salvage>=p.maxCargo)reward='shield';
  const labels={'full-refuel':'FULL REFUEL!','supply':'EMERGENCY SUPPLY','shield':'SHIELD BOOST · 12s','salvage':'SALVAGE JACKPOT','repair':'REPAIR KIT'};
  switch(reward){
    case 'full-refuel':p.fuel=p.maxFuel;break;
    case 'supply':p.collect('fuel',30);p.collect('energy',40);break;
    case 'shield':p.temporaryShield=40;p.shieldBoostTime=12;break;
    case 'salvage':p.collect('salvage',60);break;
    case 'repair':p.collect('repair',40);break;
  }
  return {type:reward,label:labels[reward],rare:reward==='full-refuel'||reward==='salvage'};
}
function supplyOverlap(player,item){
  const cp=closestPointOnSegment(player.prevX,player.prevY,player.x,player.y,item.x,item.y);
  return dist2(cp.x,cp.y,item.x,item.y)<=(player.radius+item.radius)**2;
}
class SurvivalDirector {
  constructor(seed){
    this.rng=mulberry32(hashSeed(seed,'survival'));this.bag=[];this.boxes=[];
    this.emergencyFuel=null;this.supplyTimer=6;this.rescueTimer=0;this.serial=0;
    this.mission=null;this.missionDelay=0;this.missionIndex=0;this.nextMilestone=60;
  }
  nextReward(){
    if(!this.bag.length){
      this.bag=['full-refuel','supply','supply','supply','shield','shield','salvage','salvage','repair','repair'];
      for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}
    }
    return this.bag.pop();
  }
  spawnBox(game){
    const p=game.player,spot=game.world.findSupplyPoint(p,p.lowPower?100:170,this.rng);
    if(!spot)return null;
    const box=new MysteryBox(spot.x,spot.y,this.nextReward(),'cargo-'+this.serial++);
    if(this.boxes.length>=3)this.boxes.shift();this.boxes.push(box);return box;
  }
  claim(box,game){
    if(box.collected)return false;box.collected=true;
    const before=game.player.salvage,result=applyMysteryReward(box.reward,game.player);
    game.stats.salvageCollectedTotal+=game.player.salvage-before;game.stats.mysteryBoxes++;
    game.ui.toast(result.label,'Cargo secured.');
    game.sound.playPickup(result.type==='full-refuel'?'fuel':'rarecore');
    if(result.rare)game.celebrate(result.label);
    else game.particles.burst(box.x,box.y,game.settings.reducedMotion?3:12,{speedMin:15,speedMax:70,lifeMin:.2,lifeMax:.5,sizeMin:1,sizeMax:2,color:box.color});
    return true;
  }
  _newMission(game){
    const index=this.missionIndex%3,p=game.player;
    if(index===0)this.mission={type:'salvage',label:'SALVAGE RUN',target:30,base:game.stats.salvageCollectedTotal,progress:0};
    if(index===1)this.mission={type:'cargo',label:'SUPPLY RECOVERY',target:1,base:game.stats.mysteryBoxes,progress:0};
    if(index===2){
      const spot=game.world.findSupplyPoint(p,200,this.rng);if(!spot){this.missionDelay=2;return;}
      this.mission={type:'return',label:'SAFE RETURN',target:1,progress:0,x:spot.x,y:spot.y};
    }
    this.missionIndex++;
  }
  skipMission(){this.mission=null;this.missionDelay=10;}
  update(dt,game){
    const p=game.player;this.rescueTimer=Math.max(0,this.rescueTimer-dt);this.supplyTimer-=dt;
    this.boxes=this.boxes.filter(b=>!b.collected&&(b.life-=dt)>0&&distance(b.x,b.y,p.x,p.y)<1600);
    if(this.supplyTimer<=0){this.supplyTimer=this.spawnBox(game)?24:2;}
    if(this.emergencyFuel&&(this.emergencyFuel.collected||distance(this.emergencyFuel.x,this.emergencyFuel.y,p.x,p.y)>500))this.emergencyFuel=null;
    if(p.fuel<8&&!this.emergencyFuel&&this.rescueTimer<=0){
      const spot=game.world.findSupplyPoint(p,90+Math.min(170,p.speed*.6),this.rng);
      this.rescueTimer=2;
      if(spot){this.emergencyFuel=new Pickup(spot.x,spot.y,'fuel',this.rng);this.emergencyFuel.value=22;this.emergencyFuel.vx=0;this.emergencyFuel.vy=0;this.rescueTimer=20;}
    }
    for(const b of this.boxes)if(supplyOverlap(p,b))this.claim(b,game);
    const fuel=this.emergencyFuel;
    if(fuel&&!fuel.collected){fuel.update(dt,p,p.magnetRadius,game.time);if(supplyOverlap(p,fuel))game._collectPickup(fuel);}
    this.missionDelay=Math.max(0,this.missionDelay-dt);
    if(!this.mission&&this.missionDelay<=0)this._newMission(game);
    const m=this.mission;
    if(m){
      if(m.type==='salvage')m.progress=game.stats.salvageCollectedTotal-m.base;
      if(m.type==='cargo')m.progress=game.stats.mysteryBoxes-m.base;
      if(m.type==='return'&&supplyOverlap(p,{x:m.x,y:m.y,radius:35}))m.progress=1;
      if(m.progress>=m.target){
        this.mission=null;this.missionDelay=10;game.stats.missionsCompleted++;
        p.collect('fuel',18);p.collect('energy',20);p.collect('salvage',20);
        game.celebrate('MISSION COMPLETE');game.ui.toast(m.label+' COMPLETE','+18 fuel · +20 energy · +20 salvage');
      }
    }
    if(game.stats.survivalTime>=this.nextMilestone){game.celebrate('SURVIVED '+Math.round(this.nextMilestone/60)+' MIN');this.nextMilestone+=60;}
  }
  markers(){
    const markers=this.boxes.filter(b=>!b.collected).map(b=>({x:b.x,y:b.y,color:'255,207,112',label:'MYSTERY CARGO'}));
    if(this.emergencyFuel&&!this.emergencyFuel.collected)markers.push({...this.emergencyFuel,color:'255,179,71',label:'FUEL SUPPLY'});
    if(this.mission?.type==='return')markers.push({...this.mission,color:'109,255,176',label:'SAFE RETURN'});
    return markers;
  }
  draw(ctx,camera,w,h,time,reduced){
    for(const b of this.boxes)b.draw(ctx,camera,w,h,time,reduced);
    if(this.emergencyFuel&&!this.emergencyFuel.collected)this.emergencyFuel.draw(ctx,camera,w,h,time);
    if(this.mission?.type==='return'){
      const m=this.mission,x=m.x-camera.x+w/2,y=m.y-camera.y+h/2;
      ctx.save();ctx.strokeStyle='#6dffb0';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(x,y,35,0,TAU);ctx.stroke();ctx.restore();
    }
  }
}
