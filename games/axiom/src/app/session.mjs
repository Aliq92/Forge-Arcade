export class ExperimentSession{
 constructor(model){this.model=model;this.history=[];this.running=false;this.speed=1;this.accumulator=0;this.nextSample=0;this.frozen=false;this.lagging=false;this.error='';this.record(true);}
 record(force=false){if(this.frozen)return;if(force||this.model.time+Math.abs(this.model.dt)*1e-7>=this.nextSample){this.history.push({...this.model.measure()});if(this.history.length>600)this.history.shift();this.nextSample=this.model.time+(this.model.sampleInterval||this.model.dt*3);}}
 tick(){if(this.model.valid===false||this.model.complete)return false;try{const before=this.model.time;this.model.step(this.model.dt);if(this.model.time===before)return false;this.record();return true;}catch(error){this.error=error.message;this.running=false;return false;}}
 advance(delta){if(!this.running||!Number.isFinite(delta)||delta<=0)return;const requested=this.accumulator+Math.min(delta,.25)*this.speed*this.model.clockRate,cap=this.model.dt*256;this.lagging=requested>cap;this.accumulator=Math.min(requested,cap);let steps=0;while(this.accumulator+this.model.dt*1e-8>=this.model.dt&&steps++<256){if(!this.tick()){this.running=false;break;}this.accumulator-=this.model.dt;}}
 play(){if(this.model.dynamic!==false&&this.model.valid!==false&&!this.model.complete)this.running=true;}
 pause(){this.running=false;}
 step(){this.pause();if(this.model.dynamic!==false){this.tick();this.record(true);}}
 setSpeed(value){if([.25,.5,1,2,4].includes(+value))this.speed=+value;}
 clear(){this.history=[];this.nextSample=0;}
}
