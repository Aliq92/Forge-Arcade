(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ParticleLabPhysics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const STEP=1/120,CAPACITY=1500,QUEUE_LIMIT=64,FIELD_LIMIT=8,CORE=9,MAX_SPEED=500;
 const TYPES=['attractor','repulsor','vortex','rainbow'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 function params(input={}){return {strength:clamp(Number(input.strength)||650,50,2000),radius:clamp(Number(input.radius)||190,30,450),rotation:input.rotation===-1?-1:1,delay:clamp(Number(input.delay)||.35,.08,3),burst:clamp(Number(input.burst)||190,20,500),intensity:clamp(Number.isFinite(input.intensity)?input.intensity:90,0,100)};}
 class ParticleWorld{
  constructor(width=800,height=600,{random=Math.random}={}){this.width=width;this.height=height;this.random=random;this.active=[];this.fields=[];this.free=Array.from({length:CAPACITY},()=>({}));this.nextParticle=1;this.nextField=1;this.running=true;this.speed=1;this.accumulator=0;this.time=0;this.solidAt=null;this.onStep=null;}
  get total(){return CAPACITY-this.free.length;}
  spawn(count,x,y,spread=30){let added=0;for(let i=0;i<Math.min(CAPACITY,Math.max(0,Math.floor(count)));i++){const p=this.free.pop();if(!p)break;const angle=this.random()*Math.PI*2,offset=this.random()*spread;
    Object.assign(p,{id:this.nextParticle++,x:clamp(x==null?this.random()*this.width:x+Math.cos(angle)*offset,2,this.width-2),y:clamp(y==null?this.random()*this.height:y+Math.sin(angle)*offset,2,this.height-2),vx:Math.cos(angle)*22,vy:Math.sin(angle)*22,mass:1,radius:1.4+this.random()*1.1,hue:[180,265,325,40,160][i%5],saturation:65,immunity:0,owner:null,remaining:0});this.active.push(p);added++;}return added;}
  setCount(count){const target=clamp(Math.round(Number(count)||0),0,CAPACITY);if(target>this.total)this.spawn(target-this.total);else{while(this.total>target&&this.active.length)this.free.push(this.active.pop());for(const f of this.fields)while(this.total>target&&f.queue.length)this.free.push(f.queue.pop());}return this.total;}
  addField(type,x,y,input={}){if(!TYPES.includes(type)||this.fields.length>=FIELD_LIMIT)return null;const f={id:this.nextField++,type,x:clamp(x,24,this.width-24),y:clamp(y,24,this.height-24),...params(input),queue:[],hue:0,pulse:0,absorbPulse:0,releases:0,absorptions:0};this.fields.push(f);return f;}
  removeField(id){const index=this.fields.findIndex(f=>f.id===id);if(index<0)return false;const f=this.fields[index];while(f.queue.length)this.release(f,f.queue.pop(),false);this.fields.splice(index,1);return true;}
  release(f,p,transform=true){const angle=(f.hue+137.508)*Math.PI/180;f.hue=(f.hue+137.508)%360;p.x=clamp(f.x+Math.cos(angle)*(CORE+10),2,this.width-2);p.y=clamp(f.y+Math.sin(angle)*(CORE+10),2,this.height-2);p.vx=Math.cos(angle)*f.burst;p.vy=Math.sin(angle)*f.burst;p.immunity=.8;p.owner=null;p.remaining=0;if(transform){p.hue=f.hue;p.saturation=f.intensity;f.releases++;}f.pulse=1;this.active.push(p);}
  tick(dt){
   this.time+=dt;for(const f of this.fields){f.pulse=Math.max(0,f.pulse-dt*2.5);f.absorbPulse=Math.max(0,f.absorbPulse-dt*4);for(let i=f.queue.length-1;i>=0;i--){const p=f.queue[i];p.remaining-=dt;if(p.remaining<=1e-9){f.queue.splice(i,1);this.release(f,p);}}}
   let write=0;for(let i=0;i<this.active.length;i++){const p=this.active[i];p.immunity=Math.max(0,p.immunity-dt);let ax=0,ay=0,absorbed=false;
    for(const f of this.fields){const dx=f.x-p.x,dy=f.y-p.y,d=Math.hypot(dx,dy);if(f.type==='rainbow'&&d<=CORE&&p.immunity<=0&&f.queue.length<QUEUE_LIMIT){p.owner=f.id;p.remaining=f.delay;f.queue.push(p);f.absorbPulse=1;f.absorptions++;absorbed=true;break;}if(d>=f.radius)continue;
     const soft=Math.max(12,d),nx=dx/soft,ny=dy/soft,force=f.strength*Math.pow(1-d/f.radius,.7);
     if(f.type==='repulsor'){ax-=nx*force;ay-=ny*force;}
     else if(f.type==='vortex'){ax+=(ny*f.rotation+nx*.12)*force;ay+=(-nx*f.rotation+ny*.12)*force;}
     else if(f.type==='rainbow'){ax+=(nx*.95+ny*.22)*force;ay+=(ny*.95-nx*.22)*force;}
     else{ax+=nx*force;ay+=ny*force;}
    }
    if(absorbed)continue;const acceleration=Math.hypot(ax,ay);if(acceleration>1000){ax*=1000/acceleration;ay*=1000/acceleration;}p.vx+=ax*dt;p.vy+=ay*dt;const speed=Math.hypot(p.vx,p.vy);if(speed>MAX_SPEED){p.vx*=MAX_SPEED/speed;p.vy*=MAX_SPEED/speed;}
    const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;
    if(this.solidAt&&this.solidAt(nx,p.y,p.x,p.y))p.vx*=-.65;else p.x=nx;
    if(this.solidAt&&this.solidAt(p.x,ny,p.x,p.y))p.vy*=-.65;else p.y=ny;
    if(p.x<2){p.x=2;p.vx=Math.abs(p.vx)*.8;}if(p.x>this.width-2){p.x=this.width-2;p.vx=-Math.abs(p.vx)*.8;}if(p.y<2){p.y=2;p.vy=Math.abs(p.vy)*.8;}if(p.y>this.height-2){p.y=this.height-2;p.vy=-Math.abs(p.vy)*.8;}this.active[write++]=p;
   }this.active.length=write;if(this.onStep)this.onStep(dt);
  }
  advance(realDt){if(!this.running||!Number.isFinite(realDt)||realDt<=0)return 0;this.accumulator+=Math.min(.1,realDt)*clamp(this.speed,.25,2);let steps=0;while(this.accumulator+1e-10>=STEP&&steps<24){this.tick(STEP);this.accumulator-=STEP;steps++;}if(Math.abs(this.accumulator)<1e-10)this.accumulator=0;return steps;}
  clear(){while(this.active.length)this.free.push(this.active.pop());for(const f of this.fields)while(f.queue.length)this.free.push(f.queue.pop());this.fields.length=0;this.accumulator=0;}
  reset(){this.clear();this.running=true;this.speed=1;this.time=0;this.nextField=this.nextParticle=1;}
  resize(width,height){const sx=width/this.width,sy=height/this.height;for(const p of [...this.active,...this.fields.flatMap(f=>f.queue)]){p.x=clamp(p.x*sx,2,width-2);p.y=clamp(p.y*sy,2,height-2);}for(const f of this.fields){f.x=clamp(f.x*sx,24,width-24);f.y=clamp(f.y*sy,24,height-24);}this.width=width;this.height=height;}
  export(){return {version:1,width:this.width,height:this.height,speed:this.speed,running:this.running,time:this.time,accumulator:this.accumulator,nextParticle:this.nextParticle,nextField:this.nextField,fields:this.fields.map(({queue,...f})=>({...f})),particles:[...this.active,...this.fields.flatMap(f=>f.queue)].map(p=>({...p}))};}
  static from(data){
   if(!data||data.version!==1||!finite(data.width,48,10000)||!finite(data.height,48,10000)||!finite(data.speed,.25,2)||typeof data.running!=='boolean'||!finite(data.time,0,1e9)||!finite(data.accumulator,0,.21)||!Array.isArray(data.fields)||data.fields.length>FIELD_LIMIT||!Array.isArray(data.particles)||data.particles.length>CAPACITY)throw Error('Invalid particle experiment');
   const w=new ParticleWorld(data.width,data.height),ids=new Set();w.speed=data.speed;w.running=data.running;w.time=data.time;w.accumulator=data.accumulator;
   for(const f of data.fields){if(!Number.isSafeInteger(f.id)||f.id<1||ids.has(f.id)||!TYPES.includes(f.type)||!finite(f.x,0,w.width)||!finite(f.y,0,w.height)||!finite(f.strength,50,2000)||!finite(f.radius,30,450)||![-1,1].includes(f.rotation)||!finite(f.delay,.08,3)||!finite(f.burst,20,500)||!finite(f.intensity,0,100)||!finite(f.hue,0,360)||!finite(f.pulse,0,1)||!finite(f.releases,0,1e12)||!finite(f.absorptions,0,1e12))throw Error('Invalid force field');ids.add(f.id);w.fields.push({id:f.id,type:f.type,x:f.x,y:f.y,...params(f),hue:f.hue,pulse:f.pulse,absorbPulse:finite(f.absorbPulse,0,1)?f.absorbPulse:0,releases:f.releases,absorptions:f.absorptions,queue:[]});}
   ids.clear();for(const p of data.particles){if(!Number.isSafeInteger(p.id)||p.id<1||ids.has(p.id)||!finite(p.x,0,w.width)||!finite(p.y,0,w.height)||!finite(p.vx,-500,500)||!finite(p.vy,-500,500)||!finite(p.mass,.01,1000)||!finite(p.radius,.5,8)||!finite(p.hue,0,360)||!finite(p.saturation,0,100)||!finite(p.immunity,0,1)||!finite(p.remaining,0,3)||(p.owner!==null&&!Number.isSafeInteger(p.owner)))throw Error('Invalid particle');ids.add(p.id);const copy=w.free.pop();Object.assign(copy,{id:p.id,x:p.x,y:p.y,vx:p.vx,vy:p.vy,mass:p.mass,radius:p.radius,hue:p.hue,saturation:p.saturation,immunity:p.immunity,owner:p.owner,remaining:p.remaining});if(p.owner===null)w.active.push(copy);else{const field=w.fields.find(f=>f.id===p.owner&&f.type==='rainbow');if(!field||field.queue.length>=QUEUE_LIMIT)throw Error('Invalid transformation queue');field.queue.push(copy);}}
   const nextP=Math.max(0,...data.particles.map(p=>p.id))+1,nextF=Math.max(0,...w.fields.map(f=>f.id))+1;if(!Number.isSafeInteger(data.nextParticle)||data.nextParticle<nextP||!Number.isSafeInteger(data.nextField)||data.nextField<nextF)throw Error('Invalid identifiers');w.nextParticle=data.nextParticle;w.nextField=data.nextField;return w;
  }
 }
 return {ParticleWorld,STEP,CAPACITY,QUEUE_LIMIT,FIELD_LIMIT,CORE,params};
});
