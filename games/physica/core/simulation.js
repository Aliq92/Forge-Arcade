import {History} from './measurements.js';
// At least about 12 samples per fastest wave cycle after fixed-step rounding;
// slow waves retain the ordinary 30-second rolling graph window.
function waveFrequency(m){return Math.max(m.config.frequency||0,m.config.driveFrequency||0,m.theory.frequency||0,1/(m.theory.period||Infinity),...(m.models||[]).map(o=>waveFrequency(o.model)));}
export class Simulation{
 constructor(model,challenge=null){this.model=model;this.challenge=challenge;this.running=false;this.speed=1;this.accumulator=0;this.history=new History();this.graphPaused=false;this.steps=0;this.sampleAt=0;this.hold=0;this.challengeComplete=false;this.feedback='Change a variable, predict, then run.';this.trails=new Map();this.record(true);}
 record(force=false){const m=this.model;if(this.graphPaused)return;const interval=m.lab==='waves'?Math.min(.05,1/(16*waveFrequency(m))):Math.max(.05,m.clockRate/20);if(force||m.time+1e-12>=this.sampleAt){this.history.add(m.measure());this.sampleAt=m.time+interval;for(const b of m.state.bodies||[]){const points=this.trails.get(b.id)||[];points.push({x:b.x,y:b.y});if(points.length>240)points.shift();this.trails.set(b.id,points);}}}
 tick(){const m=this.model;if(!m.valid||m.complete)return false;const before=m.time;m.step(m.dt);if(m.time===before)return false;this.steps++;this.record();if(this.challenge&&!this.challengeComplete){const result=this.challenge.check(m);this.feedback=result.message;if(result.ok){this.hold+=m.time-before;if(this.hold>=this.challenge.hold){this.challengeComplete=true;this.feedback='Challenge complete. '+result.message;}}else this.hold=0;}if(!m.valid||m.complete)this.running=false;return true;}
 advance(delta){if(!this.running||!Number.isFinite(delta)||delta<=0)return;this.accumulator=Math.min(this.model.dt*128,this.accumulator+Math.min(.25,delta)*this.speed*this.model.clockRate);let steps=0;while(this.accumulator+1e-12>=this.model.dt&&steps++<128){if(!this.tick()){this.running=false;break;}this.accumulator-=this.model.dt;}}
 play(){if(this.model.valid&&!this.model.complete)this.running=true;}
 pause(){this.running=false;}
 step(){this.pause();this.tick();this.record(true);}
 setSpeed(speed){if([.25,.5,1,2,4].includes(+speed))this.speed=+speed;}
}
