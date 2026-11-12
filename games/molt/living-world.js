(function(){
 'use strict';
 const forms=[
  ['Hatchling','#52d8c3','#c7fff0','#a4f1df',0,1],['Ripplebud','#83e5b0','#dcffe2','#4ac9a9',1,1.05],['Coralback','#f2a0a6','#ffe0d2','#ffd6ab',2,1.1],['Mossling','#8cd4ae','#e3f7c2','#6abab1',3,1.1],['Velvetfin','#b4a2ec','#ece1ff','#dac7f5',4,1.15],['Lanterntail','#f0cb68','#fff1b7','#9ee4d2',5,1.2],['Ambergill','#efb27a','#ffe5bf','#a8dccf',6,1.2],['Bloomback','#e8a3cc','#ffe1ed','#c7aef2',7,1.25],['Aurorafin','#68cfd1','#c5fff0','#a1e9cd',8,1.25],['Mooncrest','#95c1ee','#e2f2ff','#d0b9ef',9,1.3],['Prismshell','#b7a9ed','#f5dff2','#a1e7d8',10,1.3],['Elderlight','#f4d582','#fff8d1','#9ce5c9',11,1.35],
 ].map(([name,body,belly,fin,pattern,antenna])=>({name,body,belly,fin,pattern,antenna}));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class Pool{
  constructor(capacity=240){this.capacity=capacity;this.free=Array.from({length:capacity},()=>({}));this.active=[];}
  spawn(data){const p=this.free.pop();if(!p)return false;Object.assign(p,data);p.originX=data.x;p.originY=data.y;this.active.push(p);return true;}
  update(dt){let write=0;const damping=Math.pow(.92,dt*60);for(let i=0;i<this.active.length;i++){const p=this.active[i];p.life-=dt;if(p.life<=0){this.free.push(p);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=damping;p.vy*=damping;this.active[write++]=p;}this.active.length=write;}
  clear(){while(this.active.length)this.free.push(this.active.pop());}
 }
 class Presentation{
  static forms=forms;
  constructor(){this.pool=new Pool();this.shells=[];this.time=0;this.seed=41713;this.poses=new WeakMap();this.eat=0;this.hurt=0;this.growth=0;this.escape=0;this.wasDanger=false;this.trailTimer=0;this.cache=null;this.flora=[];this.reduced=false;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  react(type){if(type==='eat'){this.eat=.42;this.growth=Math.max(this.growth,.4);}if(type==='hurt')this.hurt=.75;if(type==='growth')this.growth=1;if(type==='escape')this.escape=.65;}
  molt(p,r,stage){this.shells.push({x:p.x,y:p.y,r,stage,life:3.8,maxLife:3.8,angle:this.poses.get(p)?.angle||0});if(this.shells.length>12)this.shells.shift();this.growth=1.7;for(let i=0;i<(this.reduced?8:24);i++){const a=i/24*Math.PI*2;this.pool.spawn({x:p.x,y:p.y,vx:Math.cos(a)*(35+this.random()*75),vy:Math.sin(a)*(35+this.random()*75),life:.7+this.random()*.7,maxLife:1.4,color:i%2?'141,236,212':'244,207,147'});}}
  advance(dt,snapshot){this.time+=dt;this.eat=Math.max(0,this.eat-dt);this.hurt=Math.max(0,this.hurt-dt);this.growth=Math.max(0,this.growth-dt);this.escape=Math.max(0,this.escape-dt);this.pool.update(dt);for(let i=this.shells.length-1;i>=0;i--){this.shells[i].life-=dt;if(this.shells[i].life<=0)this.shells.splice(i,1);}
   if(!snapshot)return;const p=snapshot.player;this.pose(p,dt);for(const n of snapshot.npcs)this.pose(n,dt);
   const danger=snapshot.npcs.some(n=>n.hunting&&Math.hypot(n.x-p.x,n.y-p.y)<180);if(this.wasDanger&&!danger)this.escape=.65;this.wasDanger=danger;
   this.trailTimer-=dt;if(snapshot.state==='playing'&&!this.reduced&&Math.hypot(p.vx,p.vy)>15&&this.trailTimer<=0){this.trailTimer=.09;this.pool.spawn({x:p.x-p.vx*.16,y:p.y-p.vy*.16,vx:-p.vx*.05,vy:-p.vy*.05,life:.4,maxLife:.4,color:'132,218,197'});}
  }
  pose(entity,dt){let pose=this.poses.get(entity);if(!pose){pose={angle:0,r:null};this.poses.set(entity,pose);}const speed=Math.hypot(entity.vx,entity.vy);if(speed>2){const target=Math.atan2(entity.vy,entity.vx),delta=Math.atan2(Math.sin(target-pose.angle),Math.cos(target-pose.angle));pose.angle+=delta*(1-Math.exp(-dt*10));}return pose;}
  clear(){this.pool.clear();this.shells.length=0;this.poses=new WeakMap();this.eat=this.hurt=this.growth=this.escape=0;this.wasDanger=false;this.trailTimer=0;}
  backdrop(ctx,w,h,player){
   if(!this.cache||this.cache.width!==Math.round(w)||this.cache.height!==Math.round(h)){
    this.cache=document.createElement('canvas');this.cache.width=Math.round(w);this.cache.height=Math.round(h);const c=this.cache.getContext('2d');if(!c)return;
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#08272c');g.addColorStop(.45,'#123b3d');g.addColorStop(1,'#09282f');c.fillStyle=g;c.fillRect(0,0,w,h);
    const glow=c.createRadialGradient(w*.47,h*.34,0,w*.47,h*.34,Math.max(w,h)*.68);glow.addColorStop(0,'#548c6c35');glow.addColorStop(1,'#061e2600');c.fillStyle=glow;c.fillRect(0,0,w,h);
    c.fillStyle='#badfbe08';for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*(.1+i*.22),0);c.lineTo(w*(.4+i*.2),h);c.lineTo(w*(.28+i*.2),h);c.lineTo(w*(.04+i*.22),0);c.fill();}
    for(let i=0;i<40;i++){const x=((i*137.71)%w),y=((i*97.31)%h),r=20+(i*23)%67;c.fillStyle=i%2?'#7a9c7620':'#5c89971b';c.beginPath();c.ellipse(x,y,r,r*.52,i*.7,0,Math.PI*2);c.fill();c.strokeStyle='#79a48c15';c.beginPath();c.ellipse(x,y,r*.72,r*.35,i*.7,0,Math.PI*2);c.stroke();}
    this.flora=Array.from({length:24},(_,i)=>({x:(i*173.41+20)%w,y:h*(.68+(i%5)*.064),height:18+(i*17)%54,phase:i*.83,color:i%3?'#6cbb9860':'#a3a1c14a'}));
   }
   ctx.drawImage(this.cache,0,0,w,h);const t=this.reduced?0:this.time;
   for(const f of this.flora){const d=player?Math.hypot(f.x-player.x,f.y-player.y):999,reaction=d<90?(1-d/90)*(player.vx||0)*.13:0,bend=Math.sin(t*.8+f.phase)*5+reaction;ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.quadraticCurveTo(f.x-6+bend,f.y-f.height*.5,f.x+bend,f.y-f.height);ctx.stroke();ctx.fillStyle=f.color;for(let j=1;j<=2;j++){ctx.beginPath();ctx.ellipse(f.x+(j%2?-5:5)+bend*j*.3,f.y-f.height*j*.32,8,3,j%2?-.65:.65,0,Math.PI*2);ctx.fill();}}
   for(let i=0;i<34;i++){const x=(i*173.71+t*(2+i%3))%w,y=((i*97.31+t*(1+i%2))%h);ctx.globalAlpha=.15+(i%3)*.07;ctx.fillStyle=i%4?'#aedcc8':'#d7bde5';ctx.beginPath();ctx.arc(x,y,i%5===0?2:1,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  }
  creature(ctx,x,y,r,stage,pose,t,options={}){
   const f=forms[clamp(stage,0,11)],moving=options.moving||0;
   const idle=this.reduced?0:Math.sin(t*2.4)*.018;
   const swim=this.reduced?0:Math.sin(t*9)*moving*.025;
   const snack=this.reduced||this.eat<=0?0:Math.sin((1-this.eat/.42)*Math.PI)*.09;
   ctx.save();ctx.translate(x,y);ctx.rotate(pose||0);ctx.scale(1+idle+swim+snack,1-idle-swim-snack*.55);
   if(!options.shell){
    ctx.fillStyle='#041c2830';ctx.beginPath();ctx.ellipse(-r*.05,r*.2,r*.93,r*.73,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=f.fin;for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(-r*.42,side*r*.66,r*(.25+stage*.002),r*.12,side*(.35+swim*3),0,Math.PI*2);ctx.fill();}
   }
   const g=ctx.createLinearGradient(-r,-r*.8,r,r*.7);g.addColorStop(0,f.belly);g.addColorStop(.45,f.body);g.addColorStop(1,f.body);
   ctx.fillStyle=g;ctx.strokeStyle=this.escape>0?'#c5ffc9':'#e8fff1c9';ctx.lineWidth=Math.max(1.2,r*.045);ctx.beginPath();ctx.ellipse(0,0,r*.96,r*.78,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle='#ffffff29';ctx.beginPath();ctx.ellipse(-r*.18,-r*.39,r*.38,r*.13,-.2,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=f.fin;ctx.strokeStyle=f.fin;ctx.lineWidth=Math.max(1.2,r*.065);
   if(stage%3===1){ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(-r*.35,-r*.55);ctx.quadraticCurveTo(-r*.6,0,-r*.35,r*.55);ctx.stroke();ctx.globalAlpha=1;}
   if(stage%3===2)for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(-r*.37,side*r*.27,r*.09,r*.07,0,0,Math.PI*2);ctx.fill();}
   if(options.shell){ctx.restore();return;}
   ctx.strokeStyle=f.fin;ctx.lineWidth=Math.max(1.2,r*.05);ctx.beginPath();for(const side of [-1,1]){const sway=this.reduced?0:Math.sin(t*2.5+side)*r*.035;ctx.moveTo(r*.36,side*r*.58);ctx.quadraticCurveTo(r*.6,side*r*.82,r*.63+sway,side*r*(.88+f.antenna*.04));}ctx.stroke();
   const blink=!this.reduced&&Math.sin(t*.8)>.997,scared=options.danger||this.hurt>0,look=this.reduced?0:Math.sin(t*.7)*r*.02;
   for(const side of [-1,1]){const ex=r*.37,ey=side*r*.27;
    ctx.fillStyle='#fffdf1';ctx.beginPath();ctx.ellipse(ex,ey,r*(scared?.205:.18),r*(blink?.035:.205),0,0,Math.PI*2);ctx.fill();
    if(!blink){ctx.fillStyle='#183c48';ctx.beginPath();ctx.arc(ex+r*.045+look,ey,r*(scared?.09:.075),0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex+r*.065+look,ey-r*.026,r*.025,0,Math.PI*2);ctx.fill();}
   }
   ctx.strokeStyle='#31505c';ctx.fillStyle='#31505c';ctx.lineWidth=Math.max(1,r*.04);ctx.beginPath();
   if(this.eat>0||scared){ctx.ellipse(r*.74,0,r*.075,r*(this.eat>0?.12:.07),0,0,Math.PI*2);ctx.fill();}
   else{ctx.moveTo(r*.7,-r*.08);ctx.quadraticCurveTo(r*.84,0,r*.7,r*.08);ctx.stroke();}ctx.restore();
  }
  npc(ctx,n,role,t){
   const angle=this.poses.get(n)?.angle||0,r=n.r,danger=role==='danger',prey=role==='prey';
   const variants=danger?['#ed9796','#e9a484']:prey?['#85dcc1','#77cec4']:['#b4a4d8','#b4b7df'];
   const color=variants[Math.floor((n.hue||0)*2)%2];ctx.save();ctx.translate(n.x,n.y);ctx.rotate(angle);
   ctx.fillStyle=color;ctx.strokeStyle=danger?'#ffd4bc99':'#d1eddd88';ctx.lineWidth=Math.max(1,r*.045);ctx.beginPath();
   if(danger){ctx.moveTo(r,0);ctx.bezierCurveTo(r*.55,-r*.94,-r*.95,-r*.9,-r*.95,0);ctx.bezierCurveTo(-r*.95,r*.9,r*.55,r*.94,r,0);}
   else ctx.ellipse(0,0,r*.94,r*(prey?.73:.84),0,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(danger&&n.packId!=null){ctx.strokeStyle='#ffe8c182';ctx.lineWidth=Math.max(1.5,r*.09);ctx.beginPath();ctx.moveTo(-r*.42,-r*.55);ctx.quadraticCurveTo(-r*.68,0,-r*.42,r*.55);ctx.stroke();}
   if(!danger){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(-r*.7,0,r*.3,r*.16,this.reduced?0:Math.sin(t*4+n.wobble)*.18,0,Math.PI*2);ctx.fill();}
   for(const side of [-1,1]){const ex=r*.36,ey=side*r*.24;ctx.fillStyle='#fff3df';ctx.beginPath();ctx.arc(ex,ey,r*.135,0,Math.PI*2);ctx.fill();ctx.fillStyle='#28414e';ctx.beginPath();ctx.arc(ex+r*.04,ey,r*.055,0,Math.PI*2);ctx.fill();}
   ctx.restore();
   if(danger&&n.hunting){ctx.strokeStyle='#ffcfb5b3';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(n.x,n.y,r*1.17,angle-.6,angle+.6);ctx.stroke();}
  }
  draw(ctx,w,h,snapshot){
   const {player:p,npcs,motes,CFG,state,stage,shakeMag,particles,floatingTexts}=snapshot,pr=9+Math.sqrt(Math.max(p.mass,0))*1.55,t=this.reduced?0:this.time;
   ctx.clearRect(0,0,w,h);ctx.save();if(!this.reduced&&shakeMag>0)ctx.translate(Math.sin(t*37)*Math.min(3,shakeMag*.25),Math.cos(t*29)*Math.min(3,shakeMag*.25));this.backdrop(ctx,w,h,p);
   for(const shell of this.shells){const alpha=Math.min(.48,shell.life/3.8*.5),split=(this.reduced?.25:1-shell.life/shell.maxLife)*shell.r*.65;ctx.globalAlpha=alpha;ctx.save();ctx.translate(shell.x,shell.y);ctx.rotate(shell.angle);ctx.strokeStyle='#e9ce9c';ctx.fillStyle='#dfc99918';ctx.lineWidth=1;for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(0,sign*split,shell.r*.95,shell.r*.62,sign*.15,sign===1?0:Math.PI,sign===1?Math.PI:Math.PI*2);ctx.fill();ctx.stroke();}ctx.restore();ctx.globalAlpha=1;}
   for(const m of motes){if(m.x<-20||m.y<-20||m.x>w+20||m.y>h+20)continue;const bob=this.reduced?0:Math.sin(t*1.7+m.phase)*1.5;ctx.save();ctx.translate(m.x,m.y+bob);ctx.fillStyle='#89deca20';ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a8efcd';for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.ellipse(Math.cos(a)*2.3,Math.sin(a)*2.3,3.4,2,a,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff6bf';ctx.beginPath();ctx.arc(0,0,1.8,0,Math.PI*2);ctx.fill();ctx.restore();}
   if(p.detectionMul>1){ctx.strokeStyle='#a9ebd41c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,CFG.detectionRadius*p.detectionMul,0,Math.PI*2);ctx.stroke();}
   for(const n of npcs){if(n.x+n.r*1.5<0||n.y+n.r*1.5<0||n.x-n.r*1.5>w||n.y-n.r*1.5>h)continue;const role=pr/n.r>=p.eatRatio?'prey':n.r>=pr*CFG.dangerRatio?'danger':'neutral';this.npc(ctx,n,role,t);}
   if(this.growth>0||state==='molting'){ctx.fillStyle='#f4d59b12';ctx.beginPath();ctx.arc(p.x,p.y,pr*1.65,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ace7c14d';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,pr*(1.1+(1-this.growth/1.7)*.4),0,Math.PI*2);ctx.stroke();}
   this.creature(ctx,p.x,p.y,pr,stage,this.poses.get(p)?.angle||0,t,{moving:Math.min(1,Math.hypot(p.vx,p.vy)/96),danger:this.wasDanger});
   if(this.hurt>0){ctx.strokeStyle='#eda2a37a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,pr*1.1,0,Math.PI*2);ctx.stroke();}
   let drawn=0;for(const particle of particles){if(this.reduced&&drawn++>=12)break;ctx.globalAlpha=Math.max(0,particle.life/particle.maxLife);ctx.fillStyle=`rgb(${particle.color})`;ctx.beginPath();ctx.arc(this.reduced?particle.originX:particle.x,this.reduced?particle.originY:particle.y,particle.maxLife<.5?1.8:2.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
   ctx.font='600 12px system-ui';ctx.textAlign='center';for(const text of floatingTexts){ctx.globalAlpha=Math.max(0,text.life/text.maxLife);ctx.fillStyle=`rgb(${text.color})`;ctx.fillText(text.text,text.x,text.y);}ctx.globalAlpha=1;ctx.restore();
  }
 }
 window.MoltPresentation=Presentation;
})();
