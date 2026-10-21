/* NIGHT FREIGHT — fixed-step simulation. Matter velocities are per base tick. */
(() => {
'use strict';
const {Engine,Bodies,Body,Composite,Constraint,Vector,Query}=Matter;
const W=1200,H=760,STEP=1000/120;
const SHIPMENTS=[
 {name:'The night shift',note:'Five broad steel crates. Find your rhythm.',pieces:[[72,42,0],[72,42,0],[72,42,0],[72,42,0],[72,42,0]]},
 {name:'High water',note:'Tall machinery. Lift clear and let the swing fade.',pieces:[[68,64,0],[58,94,0],[76,46,0],[58,94,0],[68,64,0]]},
 {name:'Heavy industry',note:'Offset weight. The striped end carries more steel.',pieces:[[76,54,12],[58,102,-10],[78,46,-12],[60,90,10],[70,62,-10]]}
];
class Harbour {
 constructor(){this.onEvent=()=>{};this.rocking=true;this.reset(0,false);}
 reset(index=0,free=false){
  if(this.engine) Engine.clear(this.engine);
  this.engine=Engine.create({gravity:{x:0,y:1,scale:0.001},positionIterations:12,velocityIterations:10,constraintIterations:8,enableSleeping:false});
  this.world=this.engine.world;this.index=index;this.free=free;this.time=0;this.trolley={x:115,vx:0};this.length=150;this.on=false;this.attached=null;this.joint=null;this.stable=0;this.ready=false;this.failed=false;this.departing=false;this.departed=false;this.departTime=0;this.dispatchScore=0;this.retained=0;this.lost=0;this.nextId=1;this.particles=[];this.cargo=[];this.input={left:false,right:false,up:false,down:false};
  this.dock=Bodies.rectangle(220,609,460,78,{isStatic:true,friction:0.85,label:'dock'});
  this.deck=Bodies.rectangle(837,598,610,22,{isStatic:true,friction:0.95,frictionStatic:1,label:'deck'});
  this.magnet=Bodies.rectangle(this.trolley.x,140+this.length,38,16,{frictionAir:.035,inertia:Infinity,isSensor:true,label:'magnet',collisionFilter:{category:2,mask:0}});
  this.rope=Constraint.create({pointA:{x:this.trolley.x,y:140},bodyB:this.magnet,length:this.length,stiffness:1,damping:.075});
  Composite.add(this.world,[this.dock,this.deck,this.magnet,this.rope]);
  SHIPMENTS[index].pieces.forEach((p,i)=>this.spawn(i,p));
 }
 spawn(slot,spec){
  if(this.cargo.filter(c=>!c.lost).length>=20){
   if(!this.free)return;
   const oldest=this.cargo.find(c=>!c.lost&&c!==this.attached&&c.landed&&c.body.speed<.6);
   if(!oldest)return;
   oldest.lost=true;Composite.remove(this.world,oldest.body);this.onEvent('collected',oldest);
  }
  const [w,h,shift]=spec;const body=Bodies.rectangle(85+slot*82,570-h/2-1,w,h,{density:.0018,friction:.88,frictionStatic:1,frictionAir:.012,restitution:.015,chamfer:{radius:1},label:'cargo'});
  if(shift)Body.setCentre(body,{x:shift,y:0},true);
  const item={body,w,h,shift,slot,id:this.nextId++,lost:false,landed:false,impactCooldown:0};this.cargo.push(item);Composite.add(this.world,body);return item;
 }
 top(c){return Vector.add(c.body.position,Vector.rotate({x:-c.shift,y:-c.h/2},c.body.angle));}
 candidate(){let best=null,dist=44;for(const c of this.cargo){if(c.lost)continue;const p=this.top(c);const d=Vector.magnitude(Vector.sub(p,{x:this.magnet.position.x,y:this.magnet.position.y+8}));if(d<dist){dist=d;best=c;}}return best;}
 toggle(){if(this.failed||this.departing)return;this.on=!this.on;if(!this.on)this.release();else this.tryAttach();this.onEvent('magnet');}
 tryAttach(){if(!this.on||this.attached||this.failed)return;const c=this.candidate();if(!c)return;this.attached=c;this.joint=Constraint.create({bodyA:this.magnet,pointA:{x:0,y:8},bodyB:c.body,pointB:{x:-c.shift,y:-c.h/2},length:0,stiffness:.98,damping:.28});Composite.add(this.world,this.joint);this.stable=0;this.onEvent('attach',c);}
 release(){if(this.joint)Composite.remove(this.world,this.joint);this.joint=null;if(this.attached)this.onEvent('release',this.attached);this.attached=null;}
 clearInput(){for(const k in this.input)this.input[k]=false;}
 supportSet(){
  const supported=new Set();const pairs=this.engine.pairs.list.filter(p=>p.isActive);
  for(let pass=0;pass<6;pass++)for(const p of pairs){const a=p.bodyA.parent,b=p.bodyB.parent;if(a===this.deck||supported.has(a))supported.add(b);if(b===this.deck||supported.has(b))supported.add(a);}
  return supported;
 }
 aboard(c,supported){
  const bounds=c.body.bounds,span=bounds.max.x-bounds.min.x;
  const overlap=Math.max(0,Math.min(1142,bounds.max.x)-Math.max(532,bounds.min.x));
  return !c.lost&&c!==this.attached&&supported.has(c.body)&&overlap/span>=.75&&bounds.min.y<590&&bounds.max.y<620;
 }
 step(){
  const dt=STEP/1000;this.time+=dt;
  if(this.failed)return;
  if(this.departing){this.departTime+=dt;if(this.departTime>2.6&&!this.departed){this.departed=true;this.onEvent('departed');}return;}
  const direction=Number(this.input.right)-Number(this.input.left),hoist=Number(this.input.down)-Number(this.input.up);
  const target=direction*185;this.trolley.vx+=(target-this.trolley.vx)*Math.min(1,dt*5);this.trolley.x=Math.max(50,Math.min(1145,this.trolley.x+this.trolley.vx*dt));
  this.length=Math.max(64,Math.min(465,this.length+hoist*130*dt));this.rope.pointA.x=this.trolley.x;this.rope.length=this.length;
  const angle=this.rocking?Math.sin(this.time*.65)*.0075:0;Body.setAngle(this.deck,angle,true);
  Engine.update(this.engine,STEP);
  // A second positional solve bounds rope extension even while hoisting a heavy load.
  const delta=Vector.sub(this.magnet.position,this.rope.pointA),len=Vector.magnitude(delta);
  if(len>this.length+3)Body.translate(this.magnet,Vector.mult(delta,-(len-this.length-3)/len));
  this.tryAttach();
  const supported=this.supportSet();let stableCount=0;this.retained=0;
  for(const c of this.cargo){if(c.lost)continue;
   const b=c.body;const speed=Vector.magnitude(b.velocity);if(speed>14)Body.setVelocity(b,Vector.mult(b.velocity,14/speed));if(Math.abs(b.angularVelocity)>.15)Body.setAngularVelocity(b,Math.sign(b.angularVelocity)*.15);
   if(this.aboard(c,supported)){this.retained++;if(speed<.6&&Math.abs(b.angularVelocity)<.018)stableCount++;if(!c.landed){c.landed=true;this.onEvent('land',c);this.burst(b.position.x,b.bounds.max.y,'#cdb88a',8);}}
   else c.landed=false;
   if(b.position.y>682||b.position.x< -120||b.position.x>1320){this.lose(c);}
  }
  this.stable=!this.failed&&stableCount===5&&!this.attached?Math.min(3,this.stable+dt):0;
  this.ready=this.stable>=3;
  if(this.free){this.ready=false;for(let slot=0;slot<5;slot++){const active=this.cargo.some(c=>!c.lost&&c.slot===slot&&c.body.position.x<470&&c.body.position.y<650);if(!active)this.spawn(slot,SHIPMENTS[(this.nextId/5|0)%3].pieces[slot]);}if(this.cargo.length>30)this.cargo=this.cargo.filter(c=>!c.lost);}
  this.particles=this.particles.filter(p=>(p.life-=dt)>0);for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;}
 }
 lose(c){c.lost=true;this.lost++;if(c===this.attached){this.on=false;this.release();}Composite.remove(this.world,c.body);this.burst(c.body.position.x,678,'#78a9a4',20);this.onEvent('loss',c);if(!this.free){this.failed=true;this.ready=false;this.clearInput();}}
 burst(x,y,color,n){for(let i=0;i<n&&this.particles.length<100;i++)this.particles.push({x,y,vx:(Math.random()-.5)*160,vy:-Math.random()*95,life:.4+Math.random()*.6,color});}
 score(){const live=this.cargo.filter(c=>!c.lost&&c.landed);const accuracy=live.reduce((sum,c)=>{const targets=[590,712,834,956,1078];return sum+Math.max(0,1-Math.min(...targets.map(t=>Math.abs(c.body.position.x-t)))/61);},0)/5;return Math.round(live.length*160+accuracy*200);}
 dispatch(){if(!this.ready||this.free||this.failed)return false;this.dispatchScore=this.score();this.departing=true;this.clearInput();this.on=false;this.release();this.onEvent('dispatch');return true;}
 snapshot(){return{index:this.index,free:this.free,time:this.time,trolley:this.trolley.x,length:this.length,magnet:{x:this.magnet.position.x,y:this.magnet.position.y,on:this.on},attached:this.attached?.id??null,retained:this.retained,stable:this.stable,ready:this.ready,failed:this.failed,departing:this.departing,cargo:this.cargo.filter(c=>!c.lost).map(c=>({id:c.id,x:c.body.position.x,y:c.body.position.y,w:c.w,h:c.h,angle:c.body.angle,speed:c.body.speed,top:this.top(c)}))};}
}
window.NightFreight={Harbour,SHIPMENTS,W,H,STEP};
})();
