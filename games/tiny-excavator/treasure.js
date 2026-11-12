/* Classic-script extension: independent deposit RNG, art and bounded feedback. */
(function(root){'use strict';
 const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const minerals=[
  {id:7,name:'Copper Ore',rarity:'Common',kind:'ore',sell:12,color:'#d99165',shape:'nugget'},
  {id:17,name:'Iron Ore',rarity:'Common',kind:'ore',sell:15,color:'#a8acb3',dark:'#656d7c',hard:1.1,shape:'bars'},
  {id:8,name:'Silver Ore',rarity:'Uncommon',kind:'ore',sell:30,color:'#d6e0ed',shape:'vein'},
  {id:9,name:'Gold Ore',rarity:'Rare',kind:'ore',sell:80,color:'#f0c952',shape:'flakes'},
  {id:18,name:'Platinum Ore',rarity:'Rare',kind:'ore',sell:120,color:'#c8e9ef',dark:'#7d9dac',hard:1.8,shape:'plates'},
  {id:10,name:'Gem Cluster',rarity:'Epic',kind:'gemstone',sell:200,color:'#ba9ce1',shape:'cluster'},
  {id:19,name:'Emerald',rarity:'Epic',kind:'gemstone',sell:180,color:'#70d9a4',dark:'#2b8a68',hard:2.05,shape:'hex'},
  {id:20,name:'Ruby',rarity:'Epic',kind:'gemstone',sell:220,color:'#ed809d',dark:'#a24066',hard:2.1,shape:'octagon'},
  {id:21,name:'Diamond',rarity:'Legendary',kind:'gemstone',sell:400,color:'#caf8ff',dark:'#79b6d8',hard:2.3,shape:'diamond'}
 ];
 const byId=Object.fromEntries(minerals.map(m=>[m.id,m]));
 function random(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)|0;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function install(meta){for(const m of minerals){if(!meta[m.id])meta[m.id]={solid:true,cargo:true,...m};else{meta[m.id].rarity=m.rarity;meta[m.id].kind=m.kind;meta[m.id].shape=m.shape;}}}
 function enrich(grid,cols,rows,ground,seed){
  const out=grid.slice(),rng=random((seed>>>0)^0x14a9f33),center=Math.floor(cols/2);
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  // Preserve selected legacy deposits and their exact old values, replace only
  // surplus precious minerals in new worlds with ordinary solid host rock.
  for(const [id,cap]of [[8,32],[9,12],[10,6]]){const sites=shuffle(out.flatMap((t,i)=>t===id?[i]:[]));for(const i of sites.slice(cap))out[i]=Math.floor(i/cols)-ground>=65?5:4;}
  const defs=[{id:17,count:32,min:3,early:12,earlyCount:3,host:[2,3,4,5]},{id:18,count:10,min:12,early:28,earlyCount:1,host:[4,5]},{id:19,count:7,min:8,early:28,earlyCount:1,host:[4,5]},{id:20,count:6,min:10,early:28,earlyCount:1,host:[4,5]},{id:21,count:2,min:16,early:28,earlyCount:1,host:[4,5]}];
  for(const def of defs){let candidates=[];for(let r=ground+def.min;r<rows-1;r++)for(let c=1;c<cols-1;c++){const i=r*cols+c;if(def.host.includes(out[i]))candidates.push(i);}
   const early=shuffle(candidates.filter(i=>Math.floor(i/cols)-ground<=def.early&&Math.abs(i%cols-center)<=5));let placed=0;
   for(const i of early.slice(0,def.earlyCount)){out[i]=def.id;placed++;}
   candidates=candidates.filter(i=>def.host.includes(out[i]));
   // The second legendary find is deeper, but the first is never extreme-only.
   if(def.id===21)candidates=candidates.filter(i=>Math.floor(i/cols)-ground>28);
   while(placed<def.count&&candidates.length){const n=Math.floor(Math.sqrt(rng())*candidates.length),i=candidates.splice(n,1)[0];out[i]=def.id;placed++;}
  }
  return out;
 }
 function armPose(p,time,reduced,visualTarget){
  const facing=p.facing<0?-1:1,sx=p.x+p.w*.5+facing*5,sy=p.y+p.h*.28,boom=18,stick=16;
  const dig=p.digging,progress=dig?clamp(dig.progress/(dig.total||1),0,1):0;
  const wave=reduced?0:Math.sin(progress*TAU*2)*.055;
  let tx=dig?dig.c*32+16:sx+facing*17,ty=dig?dig.r*32+16:sy+8;
  if(visualTarget){tx=sx+visualTarget.dx;ty=sy+visualTarget.dy;}
  let dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy)||1;d=clamp(d,Math.abs(boom-stick)+.01,boom+stick-.15);
  const aim=Math.atan2(dy,dx)+wave,elbow=aim-facing*Math.acos(clamp((boom*boom+d*d-stick*stick)/(2*boom*d),-1,1));
  const ex=sx+Math.cos(elbow)*boom,ey=sy+Math.sin(elbow)*boom,bx=sx+Math.cos(aim)*d,by=sy+Math.sin(aim)*d;
  return{sx,sy,ex,ey,bx,by,boom,stick,bucket:Math.atan2(by-ey,bx-ex)+(dig?.4:1)+wave,recoil:reduced||!dig?0:Math.sin(progress*TAU*4)*.35};
 }
 class Pool{
  constructor(capacity=180){this.capacity=capacity;this.free=Array.from({length:capacity},()=>({}));this.list=[];}
  spawn(x,y,vx,vy,life,color,size){const p=this.free.pop()||this.list.shift();Object.assign(p,{x,y,originX:x,originY:y,vx,vy,life,maxLife:life,color,size:size||3});this.list.push(p);}
  update(dt){let write=0;for(const p of this.list){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;if(p.life>0)this.list[write++]=p;else this.free.push(p);}this.list.length=write;}
  clear(){while(this.list.length)this.free.push(this.list.pop());}
 }
 function polygon(c,x,y,r,sides,rotation){c.beginPath();for(let i=0;i<sides;i++){const a=rotation+i*TAU/sides;if(i===0)c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();}
 function mineral(c,m,x,y,size=10){
  c.save();c.translate(x,y);c.strokeStyle='#f3f3e9b0';c.lineWidth=1;c.fillStyle=m.color;
  if(m.kind==='ore'){
   if(m.shape==='bars'){c.fillRect(-size*.8,-size*.3,size*.65,size*.55);c.fillRect(0,-size*.65,size*.7,size*.65);c.fillRect(-size*.4,size*.25,size*.9,size*.45);}
   else if(m.shape==='plates'){for(let i=0;i<3;i++){c.beginPath();c.moveTo(-size*.8+i*size*.3,-size*.45+i*size*.2);c.lineTo(size*.35+i*size*.2,-size*.7+i*size*.3);c.lineTo(size*.7+i*size*.05,-size*.2+i*size*.35);c.lineTo(-size*.5+i*size*.3,size*.05+i*size*.25);c.closePath();c.fill();c.stroke();}}
   else if(m.shape==='vein'){c.strokeStyle=m.color;c.lineWidth=3;c.beginPath();c.moveTo(-size,-size*.1);c.lineTo(-size*.25,-size*.6);c.lineTo(size*.15,size*.35);c.lineTo(size,size*.1);c.stroke();}
   else if(m.shape==='flakes'){for(const [x,y,r]of [[-.45,.1,.7],[.35,-.35,.55],[.6,.5,.4]]){polygon(c,x*size,y*size,r*size,3,Math.PI/6);c.fill();c.stroke();}}
   else{for(const [a,b,r]of [[-.45,.15,.55],[.35,-.3,.6],[.55,.45,.4]]){polygon(c,size*a,size*b,size*r,5,.1);c.fill();c.stroke();}}
  }else if(m.shape==='diamond'){c.beginPath();c.moveTo(-size*.6,-size*.55);c.lineTo(size*.6,-size*.55);c.lineTo(size,-size*.08);c.lineTo(0,size*.9);c.lineTo(-size,-size*.08);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(-size,-size*.08);c.lineTo(size,-size*.08);c.moveTo(-size*.6,-size*.55);c.lineTo(0,size*.9);c.lineTo(size*.6,-size*.55);c.stroke();}
  else{const sides=m.shape==='hex'?6:m.shape==='octagon'?8:5;if(m.shape==='cluster'){for(const [a,b]of [[-.5,.2],[.3,-.3],[.55,.45]]){polygon(c,a*size,b*size,size*.55,sides,-Math.PI/2);c.fill();c.stroke();}}
   else{polygon(c,0,0,size,sides,-Math.PI/2);c.fill();c.stroke();polygon(c,0,0,size*.55,sides,-Math.PI/2);c.stroke();}}
  c.fillStyle='#fff8dfb0';c.fillRect(-size*.3,-size*.5,Math.max(1,size*.3),1.1);c.restore();
 }
 function machine(c,p,time,reduced,visualTarget){
  const pose=armPose(p,time,reduced,visualTarget),cx=p.x+p.w/2,cy=p.y+p.h/2;
  c.save();c.translate(cx,cy+pose.recoil);c.scale(p.facing<0?-1:1,1);
  c.fillStyle='#101f2b';c.beginPath();c.roundRect(-11,5,22,6,3);c.fill();
  c.strokeStyle='#657380';c.lineWidth=.7;for(let i=-7;i<=7;i+=7){c.fillStyle='#39444f';c.beginPath();c.arc(i,8,2,0,TAU);c.fill();c.stroke();}
  const moving=Math.abs(p.vx||0)>1,phase=moving&&!reduced?(time*20)%4:0;c.strokeStyle='#8c9a9b';c.lineWidth=.6;for(let i=-10;i<11;i+=4){c.beginPath();c.moveTo(i+phase,5.8);c.lineTo(i+phase+1.8,5.8);c.stroke();}
  const g=c.createLinearGradient(-10,-8,10,5);g.addColorStop(0,'#ffe18c');g.addColorStop(.4,'#efba40');g.addColorStop(1,'#d49331');c.fillStyle=g;c.beginPath();c.roundRect(-10,-3,20,8,2);c.fill();c.fillStyle='#ea9850';c.fillRect(-10,1,6,3);c.fillStyle='#f0c455';c.beginPath();c.roundRect(-5,-10,12,11,2);c.fill();
  c.fillStyle='#81bed6';c.beginPath();c.roundRect(-3.5,-8,8.5,7,1);c.fill();c.fillStyle='#d6edf0b3';c.beginPath();c.moveTo(-2.5,-7);c.lineTo(3.5,-7);c.lineTo(-2.5,-2);c.fill();c.strokeStyle='#3b5c6a';c.lineWidth=.8;c.strokeRect(-3.5,-8,8.5,7);c.fillStyle='#ffedb1';c.fillRect(-6,-11,14,1.5);c.fillStyle='#f38e50';c.fillRect(-.8,-13,3,2);c.fillStyle='#cbd4ce';c.fillRect(-10,-5,1.5,3);c.fillStyle='#fff3bd';c.fillRect(7,-5,3,2);c.restore();
  // Connected boom, stick and piston rods are non-solid tools; body remains22×22.
  c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle='#b87932';c.lineWidth=5;c.beginPath();c.moveTo(pose.sx,pose.sy);c.lineTo(pose.ex,pose.ey);c.lineTo(pose.bx,pose.by);c.stroke();c.strokeStyle='#f4c957';c.lineWidth=3;c.beginPath();c.moveTo(pose.sx,pose.sy-1);c.lineTo(pose.ex,pose.ey-1);c.lineTo(pose.bx,pose.by-1);c.stroke();
  c.strokeStyle='#657789';c.lineWidth=2.2;c.beginPath();c.moveTo(pose.sx-2,pose.sy+2);c.lineTo(pose.ex,pose.ey+2);c.stroke();c.strokeStyle='#dce2dc';c.lineWidth=1;c.beginPath();c.moveTo((pose.sx+pose.ex)*.5,(pose.sy+pose.ey)*.5+2);c.lineTo(pose.ex,pose.ey+2);c.stroke();
  c.fillStyle='#64727b';for(const [x,y]of [[pose.sx,pose.sy],[pose.ex,pose.ey],[pose.bx,pose.by]]){c.beginPath();c.arc(x,y,2,0,TAU);c.fill();}
  c.translate(pose.bx,pose.by);c.rotate(pose.bucket);c.fillStyle='#69747d';c.strokeStyle='#d5c794';c.lineWidth=.8;c.beginPath();c.moveTo(-2,-4);c.lineTo(6,-3);c.lineTo(7,4);c.lineTo(3,7);c.lineTo(-3,4);c.closePath();c.fill();c.stroke();c.strokeStyle='#e0d9b8';c.beginPath();c.moveTo(1,6);c.lineTo(2,8);c.moveTo(4,5);c.lineTo(5,7);c.stroke();c.restore();return pose;
 }
 class Art{
  constructor(){this.cache=new Map();this.pool=new Pool(180);this.time=0;this.find=null;this.reduced=false;this.rng=random(1414);this.armTarget=null;}
  clear(){this.pool.clear();this.find=null;this.time=0;this.armTarget=null;}
  advance(dt,player){this.time+=dt;this.pool.update(dt);if(this.find){this.find.life-=dt;if(this.find.life<=0)this.find=null;}
   if(player){const goal=armPose(player,this.time,true),target={dx:goal.bx-goal.sx,dy:goal.by-goal.sy};if(!this.armTarget||this.reduced)this.armTarget=target;else{const blend=1-Math.exp(-dt*16);this.armTarget.dx+=(target.dx-this.armTarget.dx)*blend;this.armTarget.dy+=(target.dy-this.armTarget.dy)*blend;}}
  }
  discover(id,x,y){const m=byId[id];if(!m)return;const count=this.reduced?4:m.rarity==='Legendary'?32:m.rarity==='Epic'?18:10;this.find={id,x,y,life:2.2};for(let i=0;i<count;i++){const a=this.rng()*TAU,v=this.reduced?0:15+this.rng()*45;this.pool.spawn(x,y,Math.cos(a)*v,Math.sin(a)*v-25,.6+this.rng()*.5,m.rarity==='Legendary'?'#f6d786':m.color,1.5+this.rng()*1.3);}}
  tile(meta,t,v,depth,doc){const band=clamp(Math.floor(depth/16),0,5),key=t+':'+v+':'+band;if(this.cache.has(key))return this.cache.get(key);const cv=doc.createElement('canvas');cv.width=cv.height=32;const c=cv.getContext('2d'),m=meta[t],rng=random(t*817+v*97+band*163),mineralDef=byId[t];
   const soils=['#8c664b','#a57959','#705a50','#60616c','#4e5664','#374454'];const base=mineralDef||m.fragment?soils[Math.max(2,band)]:t===1?'#98704d':t===2?'#a07154':t===3?'#838079':t===4?soils[Math.max(2,band)]:t===5?'#3d4653':m.color;c.fillStyle=base;c.fillRect(0,0,32,32);
   for(let i=0;i<19;i++){c.fillStyle=i%3===0?'#e7c49a23':'#161e302b';const x=rng()*32,y=rng()*32;c.fillRect(x,y,1+rng()*7,1+rng()*2);}
   c.strokeStyle='#1f243548';c.lineWidth=1;c.beginPath();c.moveTo(-3,5+v*3);c.lineTo(12,10+v);c.lineTo(21,7+band);c.lineTo(35,14+v);c.stroke();
   if(t>=3&&!mineralDef){c.fillStyle='#c1c2b13a';for(let i=0;i<3;i++){const x=rng()*28+2,y=rng()*28+2;c.beginPath();c.ellipse(x,y,2+rng()*3,1+rng()*2,rng(),0,TAU);c.fill();}}
   if(mineralDef){c.fillStyle='#141f2b66';c.beginPath();c.ellipse(16,17,13,11,-.3,0,TAU);c.fill();mineral(c,mineralDef,16,16,10.5);}
   else if(m.cargo){c.fillStyle=m.color;polygon(c,16,16,7,4,Math.PI/4);c.fill();c.strokeStyle='#fff5db99';c.stroke();}
   c.fillStyle='#f7dfbd25';c.fillRect(0,0,32,1);c.fillStyle='#09132133';c.fillRect(0,31,32,1);this.cache.set(key,cv);return cv;
  }
  effects(c){for(const p of this.pool.list){c.globalAlpha=clamp(p.life/p.maxLife,0,1);c.fillStyle=p.color;if(this.reduced)c.fillRect(p.originX,p.originY,2,2);else{c.beginPath();c.arc(p.x,p.y,p.size,0,TAU);c.fill();}}c.globalAlpha=1;}
 }
 function restoreFinds(data,cargo){const out={};if(data&&typeof data==='object'&&!Array.isArray(data)){for(const m of minerals)if(Number.isInteger(data[m.id])&&data[m.id]>=0&&data[m.id]<=1000000)out[m.id]=data[m.id];}else for(const item of cargo||[]){const m=minerals.find(m=>m.name===item.name);if(m)out[m.id]=(out[m.id]||0)+1;}return out;}
 const api={minerals,byId,install,enrich,armPose,Pool,Art,machine,mineral,restoreFinds};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Treasure=api;
})(globalThis);
