'use strict';
const {Simulation,WORLD,SHIP_TYPES,angleDifference,CONFIG}=require('../games/the-last-lighthouse/simulation.js');
// Keeper policy reads only public positions, confidence, warning, beam/charge
// indicators. It rotates and toggles the REAL beam; never edits ships or energy.
function chooseInput(sim){
 const {WORLD,CONFIG,angleDifference}=globalThis.LastLighthouseSimulation;
 const needy=sim.ships.filter(s=>s.confidence<.83);
 needy.sort((a,b)=>{
  const score=s=>{
   const angle=Math.atan2(s.y-WORLD.lighthouse.y,s.x-WORLD.lighthouse.x);
   return (s.warning?1.1+s.danger:0)+(1-s.confidence)+Math.min(s.age,30)/200+(s.type==='cargo'?.08:0)-Math.abs(angleDifference(angle,sim.beamAngle))*.6;
  };
  return score(b)-score(a)||a.id.localeCompare(b.id);
 });
 const target=needy[0];
 if(!target)return {turn:0,aim:null,beam:false};
 const aim=Math.atan2(target.y-WORLD.lighthouse.y,target.x-WORLD.lighthouse.x);
 const centered=Math.abs(angleDifference(aim,sim.beamAngle))<CONFIG.beamWidth*.44;
 return {turn:0,aim,beam:centered&&(sim.beamOn?sim.energy>7:sim.energy>42)};
}
function driveWinningRun(seed=71024,{limit=780,dt=1/30,initialFleet=0,decisionInterval=0}={}){
 const sim=new Simulation(seed),born=new Map(),warnings=new Map();let maxShips=0,earliestLoss=Infinity,minimumWarningLead=Infinity,exhaustions=0;
 // Stress fixtures use the ordinary spawn routine to introduce four real
 // corridor entries together. The winning policy still controls only the beam.
 for(let i=0;i<initialFleet;i++)sim._spawn();
 const losses=[];let input=chooseInput(sim),nextDecision=0;
 while(sim.state==='PLAYING'&&sim.time<limit){
  if(sim.time+1e-8>=nextDecision){input=chooseInput(sim);nextDecision=sim.time+decisionInterval;if(input.beam!==sim.beamOn&&!sim.beamLocked)sim.toggleBeam();}
  sim.step(dt,input);maxShips=Math.max(maxShips,sim.ships.length);
  for(const e of sim.events.splice(0)){
   if(e.type==='spawn')born.set(e.id,sim.time);
   if(e.type==='warning'&&!warnings.has(e.id))warnings.set(e.id,sim.time);
   if(e.type==='exhausted')exhaustions++;
   if(e.type==='loss'){earliestLoss=Math.min(earliestLoss,sim.time-born.get(e.id));minimumWarningLead=Math.min(minimumWarningLead,sim.time-(warnings.get(e.id)??sim.time));losses.push(e);}
  }
 }
 return {seed,state:sim.state,time:Math.round(sim.time*100)/100,rescued:sim.rescued,lost:sim.lost,maxShips,efficiency:Math.round(sim.efficiency*100)/100,activeBeamSeconds:Math.round(sim.activeBeamSeconds*100)/100,exhaustions,earliestLoss:Number.isFinite(earliestLoss)?Math.round(earliestLoss*100)/100:null,minimumWarningLead:Number.isFinite(minimumWarningLead)?Math.round(minimumWarningLead*100)/100:null,losses};
}
module.exports={chooseInput,driveWinningRun};
if(require.main===module){
 let failure=false;
 for(const seed of [71024,1,42,2026,99173]){const result=driveWinningRun(seed);console.log(JSON.stringify({scenario:'normal',...result}));if(result.state!=='VICTORY')failure=true;}
 for(const [scenario,options]of [['four-ship stress fixture',{initialFleet:4}],['one-second keeper decisions',{decisionInterval:1}]]){const result=driveWinningRun(71024,options);console.log(JSON.stringify({scenario,...result}));if(result.state!=='VICTORY')failure=true;}
 process.exitCode=failure?1:0;
}
