import type { Upgrades } from './progression.js';
export type Grade='EARLY'|'GOOD'|'GREAT'|'PERFECT'|'CRITICAL';
export type Phase='ready'|'burn'|'coast'|'apogee'|'failed';
export const grade=(fuel:number,guidance:number):Grade=>fuel<0?'CRITICAL':fuel<=.03+guidance*.0015?'PERFECT':fuel<=.1+guidance*.002?'GREAT':fuel<=.25?'GOOD':'EARLY';
export interface Stage { dry:number; fuel:number; thrust:number; duration:number }
export interface Separation { grade:Grade; stage:number; velocity:number; altitude:number }
export class Flight {
 phase:Phase='ready'; altitude=0; velocity=0; acceleration=0; gravity=9.81; drag=0; elapsed=0; highestVelocity=0; stage=0; fuelFraction=1; stages:Stage[];
 grades:Record<Grade,number>={EARLY:0,GOOD:0,GREAT:0,PERFECT:0,CRITICAL:0};
 constructor(public upgrades:Upgrades,random= Math.random){
  const n=3+Math.min(5,upgrades.staging), power=Math.pow(1.22,upgrades.engine);
  this.stages=Array.from({length:n},(_,i)=>({dry:(120+35*(n-i))*(1-.012*upgrades.structure),fuel:(200+60*(n-i))*(1+upgrades.fuel*.015),thrust:(n-i)*12500*power,duration:(4.5+i*.45)*(1+.6*upgrades.fuel/(upgrades.fuel+8))*(.965+random()*.07)}));
 }
 get mass(){return 100+this.stages.slice(this.stage).reduce((m,s,i)=>m+s.dry+s.fuel*(i===0?Math.max(0,this.fuelFraction):1),0);}
 get current(){return this.stages[this.stage];}
 start(){this.phase='burn';}
 separate():Separation|null{
  if(this.phase!=='burn'||this.stage===this.stages.length-1)return null;
  const quality=grade(this.fuelFraction,this.upgrades.guidance);this.grades[quality]++;
  const event={grade:quality,stage:this.stage,velocity:this.velocity,altitude:this.altitude};
  this.velocity+=({EARLY:3,GOOD:14,GREAT:27,PERFECT:46,CRITICAL:0}[quality])*Math.pow(1.12,this.upgrades.engine);
  this.stage++;this.fuelFraction=1;return event;
 }
 step(dt:number){
  if(this.phase!=='burn'&&this.phase!=='coast')return;
  this.elapsed+=dt;
  if(this.phase==='burn'){
   this.fuelFraction-=dt/this.current.duration;
   if(this.fuelFraction<=0&&this.stage===this.stages.length-1){this.phase='coast';this.fuelFraction=0;}
   else if(this.fuelFraction<-.075){this.phase='failed';return;}
  }
  // Compressed flight time preserves a readable 20–90 second arcade arc.
  const density=1.225*Math.exp(-this.altitude/8500);
  this.gravity=9.81/Math.pow(1+this.altitude/6371000,2);
  this.drag=.5*density*this.velocity*Math.abs(this.velocity)*.055/(1+this.upgrades.aero*.2);
  const thrust=this.phase==='burn'&&this.fuelFraction>0?this.current.thrust:0;
  this.acceleration=thrust/this.mass-this.gravity*(this.phase==='coast'?1.8:1)-this.drag/this.mass;
  if(this.phase==='coast'&&this.elapsed>60)this.acceleration=Math.min(this.acceleration,-this.velocity/Math.max(.005,84-this.elapsed));
  const oldV=this.velocity;this.velocity+=this.acceleration*dt;
  const travelTime=this.phase==='coast'&&this.velocity<0&&this.acceleration<0?Math.min(dt,-oldV/this.acceleration):dt;
  this.altitude=Math.max(0,this.altitude+(oldV+oldV+this.acceleration*travelTime)*.5*travelTime*32);
  this.highestVelocity=Math.max(this.highestVelocity,this.velocity);
  if(this.phase==='coast'&&this.velocity<=0){this.velocity=0;this.phase='apogee';}
  // At extreme upgrades, gently compress time spent coasting, never skip the apex.

 }
}
