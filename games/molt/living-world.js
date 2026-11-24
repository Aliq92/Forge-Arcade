(function(){
 'use strict';
 const TAU=2*Math.PI;
 const MOLT_SECONDS=1.7;
 const SIDES=[-1,1];
 const forms=[
  ['Hatchling',  '#58d9c6','#d6fff1','#237d82','#9cead0',0],
  ['Ripplebud',  '#8ce1ae','#f0ffda','#3f9377','#b3f1ac',1],
  ['Coralback',  '#f4999a','#ffe6ce','#ad526e','#ffc2a7',2],
  ['Mossling',   '#a5cb80','#f0fac7','#4f805b','#c8e49a',1],
  ['Velvetfin',  '#b4a0ec','#f1e1ff','#6258ac','#d8bffa',2],
  ['Lanterntail','#f3c769','#fff5bd','#a77440','#a6e3c7',3],
  ['Ambergill',  '#eeac77','#ffedc2','#a85f4f','#ffd5a0',1],
  ['Bloomback',  '#ee9ec8','#ffe6f0','#a95587','#d7b3ee',2],
  ['Aurorafin',  '#66d3e0','#d3fff3','#277d9c','#9af1cb',3],
  ['Mooncrest',  '#92b8f4','#e2f2ff','#486fae','#ccd9ff',1],
  ['Prismshell', '#968cdf','#eee1ff','#4d489d','#94e7e4',3],
  ['Elderlight', '#f4d985','#fffbdb','#a87d48','#b2eed1',3],
 ].map(([name,body,belly,shade,fin,pattern])=>({name,body,belly,shade,fin,pattern}));
 const palettes={
  danger:[['#eb9295','#ffc6a5','#773f59'],['#eea07c','#ffdbac','#854452']],
  prey:[['#72d4b2','#bbeec8','#317d76'],['#61c7c5','#abe8d6','#2a747f']],
  neutral:[['#a99cd7','#d8c8ed','#635993'],['#9dace0','#d5d9fa','#5f689f']],
 };
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const unit=v=>clamp(v,0,1);
 const smooth=v=>{v=unit(v);return v*v*(3-2*v);};
 const calmPose={lookX:0,lookY:0,move:0,bump:0,turn:0};
 const menuPose={...calmPose,lookX:.18,lookY:-.08};
 function mixColor(from,to,progress){
  const start=parseInt(from.slice(1),16), end=parseInt(to.slice(1),16);
  const red=Math.round((start>>16)*(1-progress)+(end>>16)*progress);
  const green=Math.round(((start>>8)&255)*(1-progress)+((end>>8)&255)*progress);
  const blue=Math.round((start&255)*(1-progress)+(end&255)*progress);
  return `rgb(${red},${green},${blue})`;
 }
 function oval(ctx,x,y,rx,ry,angle=0){
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.fill();
 }
 function bodySide(ctx,side,width,height){
  ctx.bezierCurveTo(side*width*1.50,-height,side*width*.92,height,0,height);
 }
 function blinkAt(t){
  const phase=t%4.7;
  return 1-.92*unit(1-Math.abs(phase-4.42)/.105);
 }
 class Pool{
  constructor(capacity=240){this.capacity=capacity;this.free=Array.from({length:capacity},()=>({}));this.active=[];}
  spawn(data){const p=this.free.pop();if(!p)return false;Object.assign(p,data);p.originX=data.x;p.originY=data.y;this.active.push(p);return true;}
  update(dt){let write=0;const damping=Math.pow(.92,dt*60);for(let i=0;i<this.active.length;i++){const p=this.active[i];p.life-=dt;if(p.life<=0){this.free.push(p);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=damping;p.vy*=damping;this.active[write++]=p;}this.active.length=write;}
  clear(){while(this.active.length)this.free.push(this.active.pop());}
 }
 class Presentation{
  static forms=forms;
  constructor(){
   this.pool=new Pool();
   this.shells=[];
   this.shedding=null;
   this.time=0;
   this.seed=41713;
   this.poses=new WeakMap();
   this.cache=null;
   this.flora=[];
   this.reduced=false;
   this.clear();
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  react(type){
   if(type==='eat')this.eat=.52;
   if(type==='hurt')this.hurt=.75;
  }
  molt(p,r,stage){
   // Threshold checks can fire more than once in one update. Keep the
   // original outer layer and reveal the final stage from the game snapshot.
   if(this.shedding)return;
   const pose=this.poses.get(p);
   const shell={x:p.x,y:p.y,r:pose?.radius||r,stage,life:3.8,roll:(pose?.lookX||0)*.14};
   this.shells.push(shell);
   if(this.shells.length>12)this.shells.shift();
   this.shedding=shell;
  }
  moltProgress(snapshot){
   return this.shedding?unit(1-snapshot.moltRemaining/MOLT_SECONDS):1;
  }
  moltSparkles(p){
   if(this.reduced)return;
   for(let i=0;i<10;i++){
    const a=i*TAU/10, speed=24+this.random()*44, life=.48+this.random()*.32;
    this.pool.spawn({x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,maxLife:life,
     color:i%2?'171,247,216':'255,224,159'});
   }
  }
  advance(dt,snapshot){
   this.time+=dt;
   this.eat=Math.max(0,this.eat-dt);
   this.hurt=Math.max(0,this.hurt-dt);
   this.pool.update(dt);
   for(let i=this.shells.length-1;i>=0;i--){
    this.shells[i].life-=dt;
    if(this.shells[i].life<=0)this.shells.splice(i,1);
   }
   if(!snapshot){
    if(this.shedding?.life<=0)this.shedding=null;
    return;
   }
   const p=snapshot.player, playing=snapshot.state==='playing';
   const pose=this.pose(p,dt,playing);
   pose.radius=9+Math.sqrt(Math.max(p.mass,0))*1.55;
   for(const n of snapshot.npcs)this.pose(n,dt);
   if(this.shedding){
    if(snapshot.state==='dead'&&!this.shedding.revealed){
     this.shedding.life=0;
    }else if(this.moltProgress(snapshot)>=.61&&!this.shedding.revealed){
     this.shedding.revealed=true;
     this.moltSparkles(p);
    }
    if(snapshot.state!=='molting'){
     if(playing)this.relief=.24;
     this.shedding=null;
    }
   }
   const danger=playing&&snapshot.npcs.some(n=>n.hunting&&Math.hypot(n.x-p.x,n.y-p.y)<180);
   if(danger&&!this.wasDanger)this.alarm=.25;
   this.wasDanger=danger;
   this.alarm=Math.max(0,this.alarm-dt);
   this.relief=Math.max(0,this.relief-dt);
   this.trailTimer-=dt;
   if(playing&&!this.reduced&&pose.move>.2&&pose.bump<.3&&this.trailTimer<=0){
    this.trailTimer=.12;
    this.pool.spawn({x:p.x-p.vx*.16,y:p.y-p.vy*.16,vx:-p.vx*.05,vy:-p.vy*.05,life:.36,maxLife:.36,color:'132,218,197'});
   }
  }
  pose(entity,dt,active=true){
   let pose=this.poses.get(entity);
   if(!pose){
    pose={...calmPose,x:entity.x,y:entity.y,radius:0};
    this.poses.set(entity,pose);
   }
   const vx=active?entity.vx:0, vy=active?entity.vy:0;
   const speed=Math.hypot(vx,vy);
   const response=1-Math.exp(-dt*12);
   const direction=Math.max(18,speed);
   const lookX=vx/direction, lookY=vy/direction;
   const intended=speed*dt;
   const traveled=Math.hypot(entity.x-pose.x,entity.y-pose.y);
   const bump=intended>.01?unit(1-traveled/intended):0;
   pose.turn+=(lookX-pose.lookX-pose.turn)*response;
   pose.lookX+=(lookX-pose.lookX)*response;
   pose.lookY+=(lookY-pose.lookY)*response;
   pose.move+=(unit(speed/85)*(1-bump)-pose.move)*response;
   pose.bump+=(bump-pose.bump)*response;
   pose.x=entity.x;
   pose.y=entity.y;
   return pose;
  }
  clear(){
   this.pool.clear();
   this.shells.length=0;
   this.shedding=null;
   this.poses=new WeakMap();
   this.eat=this.hurt=this.alarm=this.relief=this.trailTimer=0;
   this.wasDanger=false;
  }
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
  face(ctx,lookX,lookY,blink,mood,amount){
   const cx=lookX*.19, cy=lookY*.16+.015;
   const alert=mood==='alert', focused=mood==='focus', happy=mood==='happy', eating=mood==='eat';
   const lid=focused?1-.35*amount:blink;
   const eyeY=cy-.05, eyeH=(alert?.29:happy?.21:.245)*lid;
   ctx.fillStyle='#fffdf1';
   ctx.beginPath();
   for(const side of SIDES){
    const x=cx+side*.315;
    ctx.moveTo(x+.218,eyeY);
    ctx.ellipse(x,eyeY,.218,eyeH,0,0,TAU);
   }
   ctx.fill();
   if(lid>.25){
    const pupilX=lookX*.072, pupilY=lookY*.059;
    ctx.fillStyle='#193345';
    for(const side of SIDES)oval(ctx,cx+side*.315+pupilX,eyeY+pupilY,alert?.092:.106,.128*lid);
    ctx.fillStyle='#fffdf1';
    for(const side of SIDES)oval(ctx,cx+side*.315+pupilX-.031,eyeY+pupilY-.041*lid,.031,.034*lid);
   }
   if(focused){
    ctx.strokeStyle='#394259';
    ctx.lineWidth=.041;
    ctx.globalAlpha=amount;
    ctx.beginPath();
    for(const side of SIDES){
     ctx.moveTo(cx+side*.44,eyeY-.27);
     ctx.lineTo(cx+side*.22,eyeY-.22);
    }
    ctx.stroke();
    ctx.globalAlpha=1;
   }
   ctx.fillStyle='#24354a';
   if(eating||alert||happy){
    const open=eating?.06+amount*.092:alert?.091:.095;
    oval(ctx,cx,cy+.28,happy?.145:eating?.133:.073,open);
    if(eating||happy){
     ctx.fillStyle='#f696a7';
     oval(ctx,cx,cy+.28+open*.45,.071,open*.33);
    }
   }else{
    ctx.strokeStyle='#24354a';
    ctx.lineWidth=.052;
    ctx.beginPath();
    ctx.moveTo(cx-.098,cy+.252);
    ctx.quadraticCurveTo(cx,cy+(focused?.275:.368),cx+.098,cy+.252);
    ctx.stroke();
   }
  }
  creature(ctx,x,y,r,stage,roll,t,pose=menuPose,mood='idle',amount=0,stretch=0,fromStage=-1,evolution=1){
   const form=forms[clamp(stage,0,forms.length-1)], old=forms[fromStage];
   const blending=old&&evolution<1;
   const palette=blending?{
    body:mixColor(old.body,form.body,evolution),
    belly:mixColor(old.belly,form.belly,evolution),
    shade:mixColor(old.shade,form.shade,evolution),
    fin:mixColor(old.fin,form.fin,evolution),
   }:form;
   const pattern=blending&&evolution<.5?old.pattern:form.pattern;
   const markingAlpha=blending&&old.pattern!==form.pattern?Math.abs(2*evolution-1):1;
   const mature=(blending?fromStage+(stage-fromStage)*evolution:stage)/(forms.length-1);
   const reduced=this.reduced;
   const moving=reduced?0:pose.move, bump=reduced?0:pose.bump;
   const breathe=reduced?0:Math.sin(t*2.8)*.023*(1-moving);
   const stroke=reduced?0:Math.sin(t*(10-mature*2.4))*moving;
   const lean=reduced?0:roll+pose.turn*.11;
   const beat=reduced?0:stretch;
   const drift=reduced?0:(1-moving)*Math.sin(t*1.65)*.12;
   const wx=pose.lookX+drift, wy=pose.lookY+(reduced?0:Math.cos(t*2.1)*.06*(1-moving));
   const h=.86+mature*.05, w=.94-mature*.035;

   ctx.save();ctx.translate(x,y);ctx.scale(r,r);
   ctx.fillStyle='#071c2f66';
   oval(ctx,0,.70,.76,.29);
   ctx.rotate(lean);
   ctx.scale(1+breathe+stroke*.025-beat*.49+bump*.052,1-breathe-stroke*.017+beat-bump*.075);
   ctx.lineCap='round';ctx.lineJoin='round';
   // Fins and feelers share the same transform as the body so their roots stay attached.
   for(const side of SIDES){
    ctx.fillStyle=palette.fin;
    oval(ctx,side*.79,.38,.24+mature*.05,.145,side*(.48+stroke*.23));
    const sway=reduced?0:Math.sin(t*4+side*.72)*.055+stroke*.04;
    const tipX=side*(.57+mature*.05)+sway, tipY=-1.04-mature*.13+side*.055;
    ctx.strokeStyle=palette.fin;ctx.lineWidth=.088;ctx.beginPath();
    ctx.moveTo(side*.36,-.65);
    ctx.quadraticCurveTo(side*.41+sway,-.91,tipX,tipY);
    ctx.stroke();
    ctx.fillStyle=palette.belly;
    oval(ctx,tipX,tipY,.102,.092,side*.38);
   }

   const g=ctx.createLinearGradient(-.48,-.88,.44,.9);
   g.addColorStop(0,palette.belly);g.addColorStop(.42,palette.body);g.addColorStop(.76,palette.body);g.addColorStop(1,palette.shade);
   ctx.fillStyle=g;ctx.strokeStyle=palette.belly;ctx.lineWidth=Math.max(.047,1.1/r);
   ctx.beginPath();ctx.moveTo(0,-h);bodySide(ctx,1,w,h);
   ctx.bezierCurveTo(-w*.92,h,-w*1.50,-h,0,-h);
   ctx.closePath();ctx.fill();ctx.stroke();

   ctx.fillStyle='#ffffff50';
   oval(ctx,-.23,-.61,.29,.086,-.23);
   ctx.fillStyle=palette.shade;
   if(pattern===1){
    ctx.globalAlpha=.47*markingAlpha;
    oval(ctx,.48,-.49,.15,.055,.40);
   }else if(pattern>=2){
    ctx.globalAlpha=.54*markingAlpha;
    ctx.beginPath();
    ctx.moveTo(.64,-.47);ctx.ellipse(.55,-.47,.09,.057,.38,0,TAU);
    ctx.moveTo(.46,-.56);ctx.ellipse(.399,-.56,.061,.042,.33,0,TAU);
    if(pattern===3){ctx.moveTo(.27,-.61);ctx.ellipse(.228,-.61,.042,.034,.33,0,TAU);}
    ctx.fill();
   }
   ctx.globalAlpha=1;
   ctx.fillStyle=palette.fin;
   for(const side of SIDES)oval(ctx,wx*.11+side*.566,.31+wy*.1,.114,.062,side*-.19);
   const blink=reduced||mood!=='idle'?1:blinkAt(t);
   this.face(ctx,wx,wy,blink,mood,amount);
   ctx.restore();
  }
  npc(ctx,n,role,t){
   const pose=this.poses.get(n)||calmPose,r=n.r;
   const danger=role==='danger',prey=role==='prey';
   const [body,light,shade]=palettes[role][(n.hue||0)<.5?0:1];
   const phase=t*(prey?9:danger?5.5:7)+n.wobble;
   const paddle=this.reduced?0:Math.sin(phase)*(.04+pose.move*.1);
   const bearing=Math.atan2(pose.lookY,pose.lookX);
   ctx.save();ctx.translate(n.x,n.y);ctx.scale(r,r);
   ctx.rotate(this.reduced?0:pose.lookX*.19+pose.turn*.12);
   ctx.scale(1+paddle*.18,1-paddle*.21);
   ctx.fillStyle=light;
   if(prey){
    oval(ctx,-.74,.30,.31,.15,.53+paddle);
    oval(ctx,-.79,.53,.24,.14,-.48+paddle);
   }else{
    for(const side of SIDES)oval(ctx,side*.70,danger?-.42:.38,danger?.27:.23,.16,side*(.58+paddle));
   }
   ctx.fillStyle=body;ctx.strokeStyle=shade;ctx.lineWidth=Math.max(.075,.65/r);
   ctx.beginPath();
   if(danger){
    ctx.moveTo(0,-.93);
    ctx.bezierCurveTo(.29,-.91,.98,-.48,.95,.11);
    ctx.bezierCurveTo(.89,.96,-.89,.96,-.95,.11);
    ctx.bezierCurveTo(-.98,-.48,-.29,-.91,0,-.93);
   }else ctx.ellipse(0,0,prey?.84:.88,prey?.69:.81,prey?-.27:0,0,TAU);
   ctx.closePath();ctx.fill();ctx.stroke();
   if(r>=9){
    ctx.fillStyle=light;
    oval(ctx,-.16,-.49,.24,.075,-.2);
   }
   if(danger&&n.packId!=null){
    ctx.strokeStyle=light;ctx.lineWidth=.079;
    ctx.beginPath();ctx.moveTo(-.39,.48);ctx.quadraticCurveTo(0,.66,.39,.48);ctx.stroke();
   }
   const blink=this.reduced||n.hunting||n.fleeing?1:blinkAt(t+n.wobble);
   const eyeH=(n.hunting||n.fleeing?.22:.177)*blink;
   const cx=pose.lookX*.15,cy=pose.lookY*.12;
   for(const side of SIDES){
    const ex=cx+side*.246;
    ctx.fillStyle='#fff7e7';
    oval(ctx,ex,cy,.153,eyeH);
    if(blink>.28){
     ctx.fillStyle='#253247';
     oval(ctx,ex+pose.lookX*.048,cy+pose.lookY*.041,.071,.090*blink);
    }
   }
   if(r>=8){
    ctx.strokeStyle='#253247';ctx.lineWidth=.052;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cx-.084,cy+.29);
    ctx.quadraticCurveTo(cx,cy+(n.hunting?.246:.39),cx+.084,cy+.29);ctx.stroke();
   }
   ctx.restore();
   if(danger&&n.hunting){
    ctx.strokeStyle='#ffcfb5d0';ctx.lineWidth=1.6;ctx.beginPath();
    ctx.arc(n.x,n.y,r*1.18,bearing-.57,bearing+.57);ctx.stroke();
   }
  }
  drawShell(ctx,shell,progress){
   if(progress<.16)return;
   const f=forms[shell.stage];
   const lift=smooth((progress-.16)/.23);
   const split=smooth((progress-.30)/.36);
   const fade=unit((shell.life-.2)/2.1);
   const mature=shell.stage/(forms.length-1);
   const w=.94-mature*.035, h=.86+mature*.05;
   const offset=this.reduced?.17:.49*split;
   ctx.save();ctx.translate(shell.x,shell.y);ctx.rotate(shell.roll);ctx.scale(shell.r,shell.r);
   ctx.lineWidth=.07;ctx.lineJoin='round';
   ctx.globalAlpha=(.76-split*.34)*lift*fade;
   ctx.strokeStyle=f.belly;ctx.fillStyle=f.body;
   for(const side of SIDES){
    ctx.save();
    ctx.translate(side*offset,(this.reduced?.07:.21*split));
    ctx.rotate(side*(this.reduced?.08:.35*split));
    ctx.beginPath();ctx.moveTo(0,-h);bodySide(ctx,side,w,h);
    ctx.bezierCurveTo(side*.13,h*.56,side*.37,-h*.48,0,-h);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
   }
   ctx.restore();
  }
  drawPlayer(ctx,p,pr,stage,t,snapshot,pose){
   const progress=this.moltProgress(snapshot);
   let mood='idle', amount=0, stretch=0, y=p.y, radius=pr, fromStage=-1, evolution=1;
   if(this.shedding){
    const old=this.shedding;
    if(progress<.43){
     stage=old.stage;
     radius=old.r;
     mood='focus';
     amount=1-smooth((progress-.35)/.08);
     stretch=-.14*smooth(progress/.3);
    }else{
     const emerge=smooth((progress-.43)/.34);
     if(!this.reduced){
      fromStage=old.stage;
      evolution=smooth((progress-.43)/.14);
     }
     radius=old.r+(pr-old.r)*emerge;
     const rise=Math.sin(emerge*Math.PI);
     const settle=Math.sin(smooth((progress-.74)/.24)*Math.PI);
     stretch=-.14*(1-emerge)+.17*rise-.046*settle;
     y-=pr*(.23*rise+.06*settle);
     mood='happy';
    }
    if(this.reduced){
     y=p.y;
     radius=stage===old.stage?old.r:pr;
    }
   }else if(this.alarm>0||this.hurt>0){
    mood='alert';
    stretch=-.085*Math.max(this.alarm/.25,this.hurt/.75);
   }else if(this.eat>0){
    const chew=1-this.eat/.52;
    mood=chew<.55?'eat':'happy';
    amount=(1+Math.cos(chew*Math.PI*7))*.5;
    if(this.reduced)amount=.5;
    stretch=Math.sin(chew*Math.PI*2)*.095*(1-chew);
    if(!this.reduced)y-=pr*.09*Math.sin(chew*Math.PI);
   }else if(this.wasDanger)mood='alert';
   else if(this.relief>0)mood='happy';
   this.creature(ctx,p.x,y,radius,stage,pose.lookX*.14,t,pose,mood,amount,stretch,fromStage,evolution);
  }
  draw(ctx,w,h,snapshot){
   const {player:p,npcs,motes,CFG,stage,shakeMag,particles,floatingTexts}=snapshot,pr=9+Math.sqrt(Math.max(p.mass,0))*1.55,t=this.reduced?0:this.time;
   ctx.clearRect(0,0,w,h);ctx.save();
   if(!this.reduced&&!this.shedding&&shakeMag>0)ctx.translate(Math.sin(t*37)*Math.min(3,shakeMag*.25),Math.cos(t*29)*Math.min(3,shakeMag*.25));
   this.backdrop(ctx,w,h,p);
   for(const shell of this.shells)this.drawShell(ctx,shell,shell===this.shedding?this.moltProgress(snapshot):1);
   for(const m of motes){if(m.x<-20||m.y<-20||m.x>w+20||m.y>h+20)continue;const bob=this.reduced?0:Math.sin(t*1.7+m.phase)*1.5;ctx.save();ctx.translate(m.x,m.y+bob);ctx.fillStyle='#89deca20';ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a8efcd';for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.ellipse(Math.cos(a)*2.3,Math.sin(a)*2.3,3.4,2,a,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff6bf';ctx.beginPath();ctx.arc(0,0,1.8,0,Math.PI*2);ctx.fill();ctx.restore();}
   if(p.detectionMul>1){ctx.strokeStyle='#a9ebd41c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,CFG.detectionRadius*p.detectionMul,0,Math.PI*2);ctx.stroke();}
   for(const n of npcs){if(n.x+n.r*1.5<0||n.y+n.r*1.5<0||n.x-n.r*1.5>w||n.y-n.r*1.5>h)continue;const role=pr/n.r>=p.eatRatio?'prey':n.r>=pr*CFG.dangerRatio?'danger':'neutral';this.npc(ctx,n,role,t);}
   this.drawPlayer(ctx,p,pr,stage,t,snapshot,this.poses.get(p)||calmPose);
   const progress=this.moltProgress(snapshot);
   let drawn=0;for(const particle of particles){if(progress<.43&&particle.color==='255,180,84')continue;if(this.reduced&&drawn++>=12)break;ctx.globalAlpha=Math.max(0,particle.life/particle.maxLife);ctx.fillStyle=`rgb(${particle.color})`;ctx.beginPath();ctx.arc(this.reduced?particle.originX:particle.x,this.reduced?particle.originY:particle.y,particle.maxLife<.5?1.8:2.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
   ctx.font='600 12px system-ui';ctx.textAlign='center';for(const text of floatingTexts){ctx.globalAlpha=Math.max(0,text.life/text.maxLife);ctx.fillStyle=`rgb(${text.color})`;ctx.fillText(text.text,text.x,text.y);}ctx.globalAlpha=1;ctx.restore();
  }
 }
 window.MoltPresentation=Presentation;
})();
