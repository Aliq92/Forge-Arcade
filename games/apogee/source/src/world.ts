import Phaser from 'phaser';
import { Flight, type Separation } from './simulation.js';
export interface WorldBridge {flight:Flight|null;tier:number;paused:boolean;shake:boolean;reduced:boolean;tick:(dt:number)=>void;}
interface Particle{x:number;y:number;vx:number;vy:number;life:number;max:number;size:number;color:number;}
interface Debris{x:number;y:number;vx:number;vy:number;angle:number;spin:number;width:number;height:number;}
const mix=(a:number,b:number,t:number)=>Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a),Phaser.Display.Color.ValueToColor(b),1,Phaser.Math.Clamp(t,0,1)).color;
export class World extends Phaser.Scene {
 bridge!:WorldBridge;private g!:Phaser.GameObjects.Graphics;private rocket!:Phaser.GameObjects.Graphics;private fx!:Phaser.GameObjects.Graphics;private stars:{x:number;y:number;r:number}[]=[];
 private particles:Particle[]=Array.from({length:180},()=>({x:0,y:0,vx:0,vy:0,life:0,max:1,size:1,color:0}));private cursor=0;private debris:Debris[]=[];private ambientTime=0;private screenY=0;private lastY=0;private ring=0;private ringX=0;private ringY=0;private exploding=0;private exhaustClock=0;
 constructor(){super('World');}
 create(){this.g=this.add.graphics();this.rocket=this.add.graphics();this.fx=this.add.graphics();let seed=417;for(let i=0;i<95;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed/4294967296;seed=(seed*1664525+1013904223)>>>0;this.stars.push({x,y:seed/4294967296,r:i%7===0?1.4:.7});}this.screenY=this.scale.height*.64;}
 reset(){this.debris.length=0;this.particles.forEach(p=>p.life=0);this.exploding=0;this.ring=0;}
 separate(e:Separation){const x=this.scale.width*.5,y=this.screenY,perfect=e.grade==='PERFECT';this.debris.push({x,y:y+38,vx:perfect?28:18,vy:-Math.min(180,e.velocity*.35),angle:0,spin:1.6,width:20+this.bridge.tier*2,height:27});this.burst(x,y+35,perfect?35:16,0xffb75e,perfect?160:85);if(perfect){this.ring=1;this.ringX=x;this.ringY=y+28;}if(this.bridge.shake&&!this.bridge.reduced)this.cameras.main.shake(perfect?130:65,perfect?.003:.0015);}
 explode(){this.exploding=1;this.burst(this.scale.width*.5,this.screenY,90,0xffac62,230);for(let i=0;i<8;i++)this.debris.push({x:this.scale.width*.5,y:this.screenY,vx:(Math.random()-.5)*190,vy:-Math.random()*170,angle:Math.random()*6,spin:(Math.random()-.5)*7,width:7,height:12});if(this.bridge.shake&&!this.bridge.reduced)this.cameras.main.shake(260,.009);}
 celebrate(){this.ring=1;this.ringX=this.scale.width*.5;this.ringY=this.scale.height*.42;this.burst(this.ringX,this.ringY,40,0xd8e6d6,100);}
 private burst(x:number,y:number,n:number,color:number,speed:number){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=Math.random()*speed;this.emit(x,y,Math.cos(a)*s,Math.sin(a)*s,1+Math.random()*.7,1+Math.random()*3,color);}}
 private emit(x:number,y:number,vx:number,vy:number,life:number,size:number,color:number){const p=this.particles[this.cursor++%this.particles.length];Object.assign(p,{x,y,vx,vy,life,max:life,size,color});}
 update(_time:number,ms:number){
  if(!this.g||!this.bridge)return;const dt=Math.min(ms/1000,.05);this.bridge.tick(dt);if(this.bridge.paused)return;this.ambientTime+=dt;
  const f=this.bridge.flight,alt=f?.altitude??0,km=alt/1000,v=f?.velocity??0,w=this.scale.width,h=this.scale.height,g=this.g;g.clear();
  const space=Phaser.Math.Clamp(km/110,0,1),top=mix(0x15384e,0x040912,space),bottom=mix(0xbe8970,0x0c1a2a,space);
  g.fillGradientStyle(top,top,bottom,bottom,1);g.fillRect(0,0,w,h);
  const starAlpha=Phaser.Math.Clamp((km-25)/70,0,1);for(const s of this.stars){g.fillStyle(0xd7e5f2,starAlpha*(.45+Math.sin(this.ambientTime*.4+s.x*99)*.18));g.fillCircle(s.x*w,(s.y*h+Math.log1p(km)*13)%h,s.r);}
  // Planet limb evolves continuously into a full, shrinking Earth.
  const earthRadius=w*(2.7/(1+km/1500)+.07),earthY=h*.85+earthRadius*.86-Math.min(.15,km/2000)*h;
  if(km>7){g.fillStyle(0x669caf,Math.min(.2,km/200));g.fillCircle(w*.5,earthY,earthRadius+9);g.fillStyle(0x407e96,.55);g.fillCircle(w*.5,earthY,earthRadius+3);g.fillStyle(mix(0x34535d,0x15344e,space),1);g.fillCircle(w*.5,earthY,earthRadius);g.lineStyle(1,0x9ac9d1,.3);g.strokeCircle(w*.5,earthY,earthRadius);if(km>1600){g.fillStyle(0x567c75,.5);g.fillEllipse(w*.5-earthRadius*.15,earthY-earthRadius*.3,earthRadius*.7,earthRadius*.3);g.fillEllipse(w*.5+earthRadius*.3,earthY+earthRadius*.04,earthRadius*.3,earthRadius*.7);}}
  if(km>700){const moonAlpha=Math.min(1,(km-700)/6000),r=12+Math.min(58,km/7000);g.fillStyle(0xc6c9ce,moonAlpha);g.fillCircle(w*.78,h*.22,r);g.fillStyle(0x939da8,moonAlpha*.5);g.fillCircle(w*.78-r*.2,h*.22-r*.15,r*.25);g.fillStyle(0x080f19,moonAlpha*.8);g.fillCircle(w*.78+r*.45,h*.22-r*.1,r*.85);}
  const ground=h*.65-Math.min(h*1.2,alt*.023);if(ground>-120){g.fillStyle(0x182c36);g.fillPoints([{x:0,y:ground+8},{x:w*.17,y:ground-26},{x:w*.34,y:ground-12},{x:w*.6,y:ground-36},{x:w*.85,y:ground-7},{x:w,y:ground-22},{x:w,y:h},{x:0,y:h}],true);g.fillStyle(0x0c1a23);g.fillRect(0,ground+28,w,h);g.fillStyle(0x27353b);g.fillRect(w*.5-61,ground+19,122,8);g.fillStyle(0x7e8077);g.fillRect(w*.5-42,ground-155,4,174);g.lineStyle(1,0x626c69,.7);for(let i=0;i<8;i++){g.lineBetween(w*.5-55,ground-155+i*21,w*.5-30,ground-134+i*21);g.lineBetween(w*.5-30,ground-155+i*21,w*.5-55,ground-134+i*21);}g.fillStyle(0xffb470,.5+Math.sin(this.ambientTime*2)*.3);g.fillCircle(w*.5-40,ground-157,2);}
  if(km<60){for(let i=0;i<7;i++){const cx=((i*.31*w+this.ambientTime*(3+i*.2))%(w+200))-100,cy=h*(.24+i*.079)-(alt*.008)%(h+180);g.fillStyle(0xd5b9a3,.07*(1-km/60));g.fillEllipse(cx,cy,130+i*12,18+i*3);}}
  this.lastY=this.screenY;const target=f&&f.phase!=='ready'?h*(.59-Math.min(.08,v/5000)):h*.65-22;this.screenY+= (target-this.screenY)*(1-Math.exp(-dt*3));
  const r=this.rocket;r.clear();r.setPosition(w*.5,this.screenY);const zoom=1-Math.min(.17,v/3500);r.setScale(zoom);const tier=this.bridge.tier,width=18+tier*2,remaining=f?f.stages.length-f.stage:3;
  const burning=f?.phase==='burn'&&f.fuelFraction>0;
  if(!this.exploding){
   const bodyHeight=Math.min(95,30+remaining*17),base=bodyHeight*.45;
   if(burning){const flicker=.85+Math.random()*.3,len=35+Math.min(60,v*.05);r.fillStyle(0xe9743e,.18);r.fillTriangle(-width*.7,base,width*.7,base,0,base+len*1.4*flicker);r.fillStyle(0xffa755,.8);r.fillTriangle(-width*.37,base,width*.37,base,0,base+len*flicker);r.fillStyle(0xffeed3);r.fillTriangle(-width*.19,base,width*.19,base,0,base+len*.52*flicker);}
   r.fillStyle(0xb6c0bf);r.fillRect(-width/2,-bodyHeight*.55,width,bodyHeight);r.fillStyle(0xe6e4d9);r.fillRect(-width/2,-bodyHeight*.55,width*.4,bodyHeight);r.fillStyle(0x53636b);r.fillRect(width*.25,-bodyHeight*.55,width*.25,bodyHeight);
   r.fillStyle(tier>=3?0xb98e62:0xd5d8d0);r.fillTriangle(-width/2,-bodyHeight*.55,width/2,-bodyHeight*.55,0,-bodyHeight*.55-20-tier*2);
   r.fillStyle(0x192c37);r.fillCircle(0,-bodyHeight*.4,3);r.fillStyle(0x8bb6bd,.8);r.fillCircle(-1,-bodyHeight*.41,1.5);
   for(let i=1;i<remaining;i++){const y=base-i*17;r.fillStyle(0x283b44);r.fillRect(-width/2-1,y,width+2,3);r.fillStyle(0xb99262);r.fillRect(-width/2,y+3,3,3);}
   r.fillStyle(0x9c6b49);r.fillTriangle(-width/2,base-18,-width/2,base,-width/2-9,base+3);r.fillTriangle(width/2,base-18,width/2,base,width/2+9,base+3);r.fillStyle(0x3c4b51);r.fillRect(-width*.3,base,width*.6,5);if(tier>2){r.fillRect(-width*.7,base-2,5,7);r.fillRect(width*.45,base-2,5,7);}
  }
  this.fx.clear();this.exhaustClock+=dt;
  if(burning&&this.exhaustClock>.025){this.exhaustClock=0;this.emit(w*.5+(Math.random()-.5)*9,this.screenY+45, (Math.random()-.5)*14,45+Math.random()*60,.35+Math.random()*.3,2+Math.random()*3,0xffb66c);if(km<15)this.emit(w*.5,this.screenY+65,(Math.random()-.5)*32,30,1.8,5+Math.random()*5,0x9e9690);}
  for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;this.fx.fillStyle(p.color,Math.max(0,p.life/p.max)*.65);this.fx.fillCircle(p.x,p.y,p.size*(1+.7*(1-p.life/p.max)));}
  for(let i=this.debris.length-1;i>=0;i--){const d=this.debris[i];d.vy+=140*dt;d.x+=d.vx*dt;d.y+=d.vy*dt+this.screenY-this.lastY;d.angle+=d.spin*dt;this.fx.save();this.fx.translateCanvas(d.x,d.y);this.fx.rotateCanvas(d.angle);this.fx.fillStyle(0x9eabae);this.fx.fillRect(-d.width/2,-d.height/2,d.width,d.height);this.fx.fillStyle(0x364956);this.fx.fillRect(-d.width/2,d.height/2-4,d.width,4);this.fx.restore();if(d.y>h+100||d.x<-100||d.x>w+100)this.debris.splice(i,1);}
  if(this.ring>0){this.ring-=dt*1.6;this.fx.lineStyle(1.5,0xffd29b,Math.max(0,this.ring)*.6);this.fx.strokeCircle(this.ringX,this.ringY,12+(1-this.ring)*150);}
  if(this.exploding>0){this.exploding=Math.max(.001,this.exploding-dt*3);if(this.exploding>.1){this.fx.fillStyle(0xffd9ac,this.exploding*.3);this.fx.fillRect(0,0,w,h);}}
 }
}
