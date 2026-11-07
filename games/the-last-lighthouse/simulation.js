(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.LastLighthouseSimulation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TAU=Math.PI*2,DEG=Math.PI/180;
 const CONFIG=Object.freeze({fixedStep:1/60,maxFrameDelta:.25,beamWidth:38*DEG,rotationSpeed:115*DEG,beamRange:760,maxEnergy:100,energyDrain:8,energyRecharge:14,rechargeThreshold:18,rescueTarget:12,lossLimit:3,maxShips:4,firstSpawn:2,spawnInterval:41,spawnVariation:3,warningLookahead:13,confidenceDecay:.0115,waypointRadius:52});
 const WORLD={size:1000,lighthouse:{x:500,y:470},island:{x:500,y:480,r:40},harbor:{x:500,y:575,r:45},reefs:[{x:285,y:260,r:40},{x:715,y:270,r:40},{x:255,y:735,r:38},{x:745,y:735,r:38}],rocks:[{x:370,y:290,r:20},{x:630,y:310,r:21},{x:495,y:810,r:28},{x:520,y:190,r:24}],currents:[{x:250,y:430,r:130,angle:.85,strength:1.15},{x:760,y:430,r:130,angle:2.2,strength:1.15},{x:500,y:650,r:170,angle:.22,strength:.9}]};
 const SHIP_TYPES=Object.freeze({
  fishing:Object.freeze({label:'Fishing boat',speed:7,turnRate:.72,confidenceGain:.21,currentSensitivity:1,momentum:.5,radius:8,drift:.021}),
  sail:Object.freeze({label:'Sailing vessel',speed:8.2,turnRate:.38,confidenceGain:.165,currentSensitivity:1.65,momentum:1.15,radius:9,drift:.026}),
  cargo:Object.freeze({label:'Cargo ship',speed:7.5,turnRate:.145,confidenceGain:.115,currentSensitivity:.68,momentum:2.8,radius:12,drift:.015})
 });
 const CORRIDORS=[
  {x:45,y:720,threat:WORLD.reefs[2],route:[{x:340,y:620},{x:500,y:575}]},
  {x:45,y:250,threat:WORLD.reefs[0],route:[{x:350,y:430},{x:390,y:570},{x:500,y:575}]},
  {x:955,y:720,threat:WORLD.reefs[3],route:[{x:660,y:620},{x:500,y:575}]},
  {x:955,y:250,threat:WORLD.reefs[1],route:[{x:650,y:430},{x:610,y:570},{x:500,y:575}]}
 ];
 const TYPE_SEQUENCE=['fishing','fishing','sail','cargo','sail','fishing','cargo','sail','cargo','fishing','sail','cargo'];
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 function angleDifference(a,b){return ((a-b+Math.PI)%TAU+TAU)%TAU-Math.PI;}
 function normalize(a){return angleDifference(a,0);}
 function beamContains(sim,x,y){
  if(!sim.beamOn||sim.beamLocked)return false;
  const dx=x-WORLD.lighthouse.x,dy=y-WORLD.lighthouse.y;
  return dx*dx+dy*dy<=CONFIG.beamRange**2&&Math.abs(angleDifference(Math.atan2(dy,dx),sim.beamAngle))<=CONFIG.beamWidth/2+1e-12;
 }
 function segmentDistanceSquared(ax,ay,bx,by,cx,cy){const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy,t=length?clamp(((cx-ax)*dx+(cy-ay)*dy)/length,0,1):0;return (ax+t*dx-cx)**2+(ay+t*dy-cy)**2;}
 const HAZARDS=[WORLD.island,...WORLD.reefs,...WORLD.rocks];
 class Simulation{
  constructor(seed=71024){this.seed=Number.isFinite(Number(seed))?Number(seed)>>>0:71024;this.restart();}
  restart(){
   this._randomState=this.seed||1;this._ticks=0;this._accumulator=0;this._serial=0;
   this.state='PLAYING';this.time=0;this.ships=[];this.energy=CONFIG.maxEnergy;this.beamAngle=2.65;this.beamOn=true;this.beamLocked=false;
   this.storm=.1;this.rescued=0;this.lost=0;this.spawnTimer=CONFIG.firstSpawn;this.events=[];this.activeBeamSeconds=0;this.usefulBeamSeconds=0;
  }
  _random(){let n=this._randomState;n^=n<<13;n^=n>>>17;n^=n<<5;this._randomState=n>>>0;return this._randomState/4294967296;}
  _event(type,ship,extra={}){this.events.push({type,time:this.time,...(ship?{id:ship.id,x:ship.x,y:ship.y,shipType:ship.type}:{}),...extra});}
  toggleBeam(){if(this.state!=='PLAYING'||this.beamLocked)return false;this.beamOn=!this.beamOn;return true;}
  pause(){if(this.state==='PLAYING')this.state='PAUSED';}
  resume(){if(this.state==='PAUSED')this.state='PLAYING';}
  get efficiency(){return this.activeBeamSeconds?clamp(this.usefulBeamSeconds/this.activeBeamSeconds*100,0,100):0;}
  _spawn(){
   const serial=this._serial++,corridor=CORRIDORS[serial%CORRIDORS.length];
   const type=TYPE_SEQUENCE[serial%TYPE_SEQUENCE.length],spec=SHIP_TYPES[type];
   const x=corridor.x,y=corridor.y+(this._random()-.5)*30;
   const angle=Math.atan2(corridor.threat.y-y,corridor.threat.x-x)+(this._random()-.5)*.12;
   const ship={id:`ship-${serial+1}`,type,x,y,angle,speed:spec.speed,vx:Math.cos(angle)*spec.speed,vy:Math.sin(angle)*spec.speed,radius:spec.radius,confidence:0,illuminated:false,warning:false,danger:0,age:0,phase:this._random()*TAU,route:corridor.route.map(p=>({...p})),waypoint:0,currentX:0,currentY:0};
   this.ships.push(ship);this._event('spawn',ship);
   this.spawnTimer=CONFIG.spawnInterval+(this._random()-.5)*2*CONFIG.spawnVariation;
  }
  step(dt,input={}){
   if(this.state!=='PLAYING'||!Number.isFinite(dt)||dt<=0)return;
   this._accumulator+=Math.min(dt,CONFIG.maxFrameDelta);
   while(this._accumulator+1e-10>=CONFIG.fixedStep&&this.state==='PLAYING'){
    this._accumulator-=CONFIG.fixedStep;if(Math.abs(this._accumulator)<1e-10)this._accumulator=0;
    this._advance(CONFIG.fixedStep,input);
   }
  }
  _advance(dt,input){
   this._ticks++;this.time=this._ticks*CONFIG.fixedStep;
   const phase=(this.seed%997)/997*TAU;
   this.storm=clamp(.1+.72*(1-Math.exp(-this.time/480))+.025*(Math.sin(this.time/50+phase)-Math.sin(phase)),0,1);
   const aim=typeof input.aim==='number'&&Number.isFinite(input.aim)?input.aim:null;
   const turn=Number.isFinite(input.turn)?clamp(input.turn,-1,1):0;
   const amount=CONFIG.rotationSpeed*dt;
   this.beamAngle=normalize(this.beamAngle+(aim!==null?clamp(angleDifference(aim,this.beamAngle),-amount,amount):turn*amount));
   if(this.beamOn){
    this.activeBeamSeconds+=dt;this.energy=Math.max(0,this.energy-CONFIG.energyDrain*dt);
    if(this.energy<1e-9){this.energy=0;this.beamOn=false;this.beamLocked=true;this._event('exhausted');}
   }else{
    this.energy=Math.min(CONFIG.maxEnergy,this.energy+CONFIG.energyRecharge*dt);
    if(this.beamLocked&&this.energy>=CONFIG.rechargeThreshold){this.beamLocked=false;this._event('ready');}
   }
   this.spawnTimer-=dt;
   if(this.spawnTimer<=0&&this.ships.length<CONFIG.maxShips)this._spawn();
   let useful=false;
   for(let index=this.ships.length-1;index>=0;index--){
    const ship=this.ships[index];this._moveShip(ship,dt);useful ||=ship.illuminated;
    const harbor=WORLD.harbor;
    if(segmentDistanceSquared(ship.previousX,ship.previousY,ship.x,ship.y,harbor.x,harbor.y)<=(harbor.r-ship.radius)**2){
     this.rescued++;this.ships.splice(index,1);this._event('rescue',ship);
     if(this.rescued>=CONFIG.rescueTarget){this.state='VICTORY';this._event('victory',null,{rescued:this.rescued,lost:this.lost});break;}
     continue;
    }
    const hazard=HAZARDS.find(h=>segmentDistanceSquared(ship.previousX,ship.previousY,ship.x,ship.y,h.x,h.y)<=(h.r+ship.radius)**2);
    const boundary=ship.x<-ship.radius||ship.y<-ship.radius||ship.x>WORLD.size+ship.radius||ship.y>WORLD.size+ship.radius;
    if(hazard||boundary){
     this.lost++;this.ships.splice(index,1);this._event('loss',ship,{reason:boundary?'boundary':hazard===WORLD.island?'island':WORLD.reefs.includes(hazard)?'reef':'rock'});
     if(this.lost>=CONFIG.lossLimit){this.state='GAME_OVER';this._event('gameover',null,{rescued:this.rescued,lost:this.lost});break;}
     continue;
    }
    this._warning(ship);
   }
   if(useful&&this.beamOn)this.usefulBeamSeconds+=dt;
  }
  _moveShip(ship,dt){
   const spec=SHIP_TYPES[ship.type];ship.previousX=ship.x;ship.previousY=ship.y;ship.age+=dt;
   ship.illuminated=beamContains(this,ship.x,ship.y);
   ship.confidence=clamp(ship.confidence+(ship.illuminated?spec.confidenceGain:-CONFIG.confidenceDecay*(1+.65*this.storm))*dt,0,1);
   while(ship.waypoint<ship.route.length-1&&Math.hypot(ship.x-ship.route[ship.waypoint].x,ship.y-ship.route[ship.waypoint].y)<CONFIG.waypointRadius)ship.waypoint++;
   if(ship.confidence>.08){
    const target=ship.route[ship.waypoint],desired=Math.atan2(target.y-ship.y,target.x-ship.x);
    const speed=spec.turnRate*(ship.illuminated?.6+.4*ship.confidence:ship.confidence);
    ship.angle=normalize(ship.angle+clamp(angleDifference(desired,ship.angle),-speed*dt,speed*dt));
   }
   ship.angle=normalize(ship.angle+Math.sin(ship.phase+this.time*.07)*spec.drift*this.storm*(1-ship.confidence)**2*dt);
   ship.currentX=0;ship.currentY=0;
   for(const current of WORLD.currents){
    const distance=Math.hypot(ship.x-current.x,ship.y-current.y);
    if(distance>=current.r)continue;
    const strength=current.strength*(1-distance/current.r)*(1+this.storm*1.7)*spec.currentSensitivity;
    ship.currentX+=Math.cos(current.angle)*strength;ship.currentY+=Math.sin(current.angle)*strength;
   }
   const blend=1-Math.exp(-dt/spec.momentum);
   ship.vx+=(Math.cos(ship.angle)*ship.speed-ship.vx)*blend;ship.vy+=(Math.sin(ship.angle)*ship.speed-ship.vy)*blend;
   ship.x+=(ship.vx+ship.currentX)*dt;ship.y+=(ship.vy+ship.currentY)*dt;
  }
  _warning(ship){
   const vx=ship.vx+ship.currentX,vy=ship.vy+ship.currentY,horizon=CONFIG.warningLookahead;
   const nx=ship.x+vx*horizon,ny=ship.y+vy*horizon;
   let danger=0;
   for(const h of HAZARDS){
    const clearance=Math.hypot(ship.x-h.x,ship.y-h.y)-h.r-ship.radius;
    if(segmentDistanceSquared(ship.x,ship.y,nx,ny,h.x,h.y)<=(h.r+ship.radius+8)**2)danger=Math.max(danger,clamp(1-clearance/(Math.hypot(vx,vy)*horizon+1),.05,1));
   }
   const edgeTime=Math.min(vx<0?(-ship.radius-ship.x)/vx:vx>0?(WORLD.size+ship.radius-ship.x)/vx:Infinity,vy<0?(-ship.radius-ship.y)/vy:vy>0?(WORLD.size+ship.radius-ship.y)/vy:Infinity);
   if(edgeTime<horizon)danger=Math.max(danger,clamp(1-edgeTime/horizon,.05,1));
   const was=ship.warning;ship.danger=danger;ship.warning=danger>0;
   if(ship.warning&&!was)this._event('warning',ship,{danger});
  }
  snapshot(){
   return JSON.parse(JSON.stringify({seed:this.seed,state:this.state,time:this.time,ships:this.ships,energy:this.energy,beamAngle:this.beamAngle,beamOn:this.beamOn,beamLocked:this.beamLocked,storm:this.storm,rescued:this.rescued,lost:this.lost,spawnTimer:this.spawnTimer,events:this.events,activeBeamSeconds:this.activeBeamSeconds,usefulBeamSeconds:this.usefulBeamSeconds,randomState:this._randomState,ticks:this._ticks,accumulator:this._accumulator,serial:this._serial}));
  }
 }
 return {CONFIG,WORLD,SHIP_TYPES,Simulation,angleDifference,beamContains};
});
