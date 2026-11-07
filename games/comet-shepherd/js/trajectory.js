import {stepFlight,cloneFlightSystem,flightCollision} from './physics.js';
import {CONFIG} from './config.js';
import {Comet,applySteering} from './comet.js';

// Quality changes horizon, never numerical precision. Live and predicted bodies move identically.
export function computeTrajectory(comet,system,pendingImpulse,qualityMult=1,controls=null){
 const horizon=Math.min(12,(6+comet.previewLevel*1.2)*(1+comet.gravitySenseLevel*.12)*qualityMult);
 const count=Math.min(1440,Math.round(horizon/CONFIG.PHYSICS_DT)),future=cloneFlightSystem(system);
 const c=Object.assign(new Comet(comet.x,comet.y,comet.vx,comet.vy),comet);
 c.vx+=pendingImpulse?.x||0;c.vy+=pendingImpulse?.y||0;
 if(pendingImpulse){c.energy-=pendingImpulse.cost||0;c.correctionCooldown=CONFIG.CORRECTION_COOLDOWN;}
 const pts=[{x:c.x,y:c.y,step:0,danger:false}];
 for(let i=1;i<=count;i++){
  if(controls)applySteering(c,controls,CONFIG.PHYSICS_DT);
  stepFlight(c,future,CONFIG.PHYSICS_DT);
  const overlap=flightCollision(c,future),collision=c.invulnTimer>0?null:overlap;
  const danger=!!overlap||Math.hypot(c.x-system.star.x,c.y-system.star.y)<system.star.dangerRadius;
  c.update(CONFIG.PHYSICS_DT,0,false);
  if(i%4===0||collision||i===count)pts.push({x:c.x,y:c.y,step:i,danger});
  if(collision){pts.collided=collision;break;}
 }
 return pts;
}
