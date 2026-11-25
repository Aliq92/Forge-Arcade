(function(root){
'use strict';
const TAU=Math.PI*2;
const clamp01=value=>Math.max(0,Math.min(1,value));
const GATE_COLORS={bloom:'#f3a48b',pearl:'#e8b4ec',current:'#7fdec4',resonance:'#b3a7ff'};
const MARKER_COLORS={pearl:'#fff0bd',resonance:'#c6a8ff',coral:'#ffb2a2',debris:'#c6d0cd',egg:'#fbdbc4',vent:'#adf7ff',creature:'#a6f2ca',route:'#b8f2e0',current:'#b8f2e0'};
class OceanRenderer {
 constructor(canvas,model){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.model=model;this.cache=new Map();this.region=-1;this.width=0;this.height=0;this.metrics={drawMs:0,plants:0,creatures:0,cacheEntries:0};this.resize(innerWidth,innerHeight);}
 resize(w,h){this.width=w;this.height=h;const short=h<500;this.bounds={x:12,y:short?93:110,w:w-24,h:Math.max(140,h-(short?180:w<720?365:310))};}
 screen(p){const b=this.bounds;return {x:b.x+p.x/1000*b.w,y:b.y+p.y/650*b.h};}
 world(x,y){const b=this.bounds;return {x:Math.max(15,Math.min(985,(x-b.x)/b.w*1000)),y:Math.max(25,Math.min(620,(y-b.y)/b.h*650))};}
 scale(){return Math.min(this.bounds.w/1000,this.bounds.h/650);}
 sprite(type,tint){const key=type+':'+tint;if(this.cache.has(key))return this.cache.get(key);const cv=document.createElement('canvas');cv.width=190;cv.height=230;const c=cv.getContext('2d'),r=this.model.region;const hues={seaweed:[150,140,165],kelp:[127,145,160],seagrass:[160,145,115],algae:[343,325,12],'sea-fan':[278,215,27],'soft-coral':[15,335,280],anemone:[345,185,270],glow:[180,205,275]};const hue=hues[type][tint];c.translate(95,220);c.lineCap='round';c.lineJoin='round';const gradient=c.createLinearGradient(0,0,0,-190);gradient.addColorStop(0,`hsla(${hue},55%,19%,.95)`);gradient.addColorStop(.45,`hsla(${hue},62%,44%,.95)`);gradient.addColorStop(1,`hsla(${hue},70%,72%,.9)`);c.strokeStyle=gradient;c.fillStyle=gradient;
  if(type==='seaweed'||type==='seagrass'){const n=type==='seagrass'?13:6;for(let i=0;i<n;i++){const x=(i-(n-1)/2)*5,height=type==='seagrass'?35+(i%4)*9:90+(i%4)*27;c.lineWidth=type==='seagrass'?2:5;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x-12,-height*.3,x+18,-height*.65,x-4,-height);c.stroke();}}
  else if(type==='kelp'){c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-15,-60,15,-110,0,-190);c.stroke();for(let i=1;i<9;i++){const y=-i*20,x=Math.sin(i)*8,side=i%2?1:-1;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+side*55,y-32,x+side*47,y+16,x,y);c.fill();c.lineWidth=.8;c.strokeStyle='#d2e9a955';c.beginPath();c.moveTo(x,y);c.lineTo(x+side*40,y-8);c.stroke();c.strokeStyle=gradient;}}
  else if(type==='algae'||type==='soft-coral'||type==='sea-fan'){const fan=type==='sea-fan';const branch=(x,y,len,a,depth)=>{const nx=x+Math.sin(a)*len,ny=y-Math.cos(a)*len;c.lineWidth=fan?Math.max(.7,depth*.65):Math.max(2,depth*2.1);c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.sin(a+.25)*len*.5,y-Math.cos(a+.25)*len*.5,nx,ny);c.stroke();if(depth>0){branch(nx,ny,len*.7,a-.4,depth-1);branch(nx,ny,len*.7,a+.4,depth-1);}else if(!fan){c.beginPath();c.arc(nx,ny,3,0,TAU);c.fill();}};branch(0,0,fan?42:34,0,fan?5:4);}
  else if(type==='anemone'){c.beginPath();c.ellipse(0,-6,26,11,0,0,TAU);c.fill();for(let i=0;i<15;i++){const a=(i-7)*.17;c.lineWidth=3.5;c.beginPath();c.moveTo((i-7)*2,-6);c.bezierCurveTo(Math.sin(a)*36,-28,Math.sin(a)*60,-64,Math.sin(a)*49,-45-Math.cos(a)*18);c.stroke();c.beginPath();c.arc(Math.sin(a)*49,-45-Math.cos(a)*18,2.4,0,TAU);c.fill();}}
  else {for(let i=0;i<5;i++){const x=(i-2)*17,y=-35-(i%3)*18;c.lineWidth=1.6;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(x*.5,y*.5,x,y);c.stroke();const glow=c.createRadialGradient(x,y,1,x,y,15);glow.addColorStop(0,'#dcffffdd');glow.addColorStop(.3,`hsla(${hue},85%,70%,.6)`);glow.addColorStop(1,`hsla(${hue},80%,70%,0)`);c.fillStyle=glow;c.beginPath();c.arc(x,y,15,0,TAU);c.fill();}}
  this.cache.set(key,cv);return cv;
 }
 backdrop(time,reduced){const c=this.ctx,m=this.model,region=root.ReefOcean.REGIONS[m.region];if(this.region!==m.region){this.region=m.region;this.cache.clear();}const g=c.createLinearGradient(0,0,0,this.height);g.addColorStop(0,region.top);g.addColorStop(.5,region.bottom);g.addColorStop(1,'#030f1a');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);
  c.save();for(let i=0;i<5;i++){const x=this.width*(i*.23-.05)+(reduced?0:Math.sin(time*.12+i)*18),ray=c.createLinearGradient(x,0,x+80,this.height*.8);ray.addColorStop(0,'#c3ffe927');ray.addColorStop(1,'#adf1eb00');c.fillStyle=ray;c.beginPath();c.moveTo(x,0);c.lineTo(x+80,0);c.lineTo(x+200,this.height*.8);c.lineTo(x+70,this.height*.8);c.fill();}
  // Distant reef terraces and softened silhouettes establish scale without collision.
  for(let layer=0;layer<3;layer++){c.fillStyle=['#113e4950','#0a2d3b80','#081e2eaa'][layer];c.beginPath();c.moveTo(0,this.height);for(let x=0;x<=this.width+30;x+=30){const y=this.height*(.56+layer*.1)+Math.sin(x*.008+layer*3)*27+Math.sin(x*.027+layer)*9;c.lineTo(x,y);}c.lineTo(this.width,this.height);c.fill();}
  c.strokeStyle='#a7fff009';c.lineWidth=2;for(let i=0;i<10;i++){const y=this.bounds.y+this.bounds.h*.74+i*14;c.beginPath();for(let x=0;x<this.width;x+=25){const py=y+Math.sin(x*.016+(reduced?0:time*.25)+i)*7;x?c.lineTo(x,py):c.moveTo(x,py);}c.stroke();}c.restore();
 }
 flora(time,options={},layer='back'){const c=this.ctx,m=this.model,s=this.scale(),low=options.quality==='low';let count=0,glows=0;for(const p of m.decorations){if(p.layer!==layer||low&&Math.floor(p.id/8)%2)continue;if(p.type==='glow'&&++glows>(m.region>1?10:3))continue;const at=this.screen(p);if(at.x< -100||at.x>this.width+100)continue;const flow=m.flowAt(p.x,p.y).x,near=m.survey?Math.max(0,1-Math.hypot(p.x-m.probe.x,p.y-m.probe.y)/120):0;const sway=options.reduced?0:Math.sin(time*.65+p.phase)*.035+flow*.001+near*(p.x<m.probe.x?-.1:.1);c.save();c.translate(at.x,at.y);c.rotate(sway);c.globalAlpha=layer==='front'?.7:.9;const size=s*p.scale*(p.type==='kelp'?1.3:1);c.scale(size,size);c.drawImage(this.sprite(p.type,p.tint),-95,-220);c.restore();count++;}this.metrics.plants=layer==='back'?count:this.metrics.plants+count;this.metrics.cacheEntries=this.cache.size;}
 animals(time,options={}){const c=this.ctx,s=Math.max(.45,this.scale());let count=0;for(const a of this.model.life){if(options.quality==='low'&&a.id%2)continue;const p=this.screen(a);if(p.x< -30||p.x>this.width+30)continue;c.save();c.translate(p.x,p.y);c.scale(a.vx<0?-s:s,s);const color=['#f5d696','#8de3d8','#f3a7ae','#aec0f6'][a.school%4];c.fillStyle=a.type==='ray'?'#173c5088':color;c.strokeStyle=color;c.lineWidth=1.3;const sz=a.size;
   if(a.type==='fish'){c.beginPath();c.ellipse(0,0,sz*1.35,sz*.55,0,0,TAU);c.fill();c.beginPath();c.moveTo(-sz,0);c.lineTo(-sz*2,-sz*.65);c.lineTo(-sz*2,sz*.65);c.fill();c.fillStyle='#122738';c.beginPath();c.arc(sz*.7,-sz*.1,1.2,0,TAU);c.fill();}
   else if(a.type==='jelly'){c.globalAlpha=.6;c.beginPath();c.ellipse(0,0,sz,sz*.8,0,Math.PI,TAU);c.fill();for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*2,0);c.quadraticCurveTo(i*2+Math.sin(time+i)*3,sz,i*2,sz*2);c.stroke();}}
   else if(a.type==='crab'){c.fillStyle='#dc937d';c.beginPath();c.ellipse(0,0,sz,sz*.6,0,0,TAU);c.fill();for(let i=-1;i<=1;i+=2){c.beginPath();c.moveTo(i*sz,0);c.lineTo(i*sz*1.7,-4);c.lineTo(i*sz*2,-9);c.moveTo(i*sz,2);c.lineTo(i*sz*1.7,6);c.stroke();}}
   else{c.beginPath();c.moveTo(-sz*2,0);c.quadraticCurveTo(0,-sz*2,sz*2,0);c.quadraticCurveTo(0,sz,-sz*2,0);c.fill();c.beginPath();c.moveTo(-sz,0);c.lineTo(-sz*4,3);c.stroke();}c.restore();count++;}this.metrics.creatures=count;
 }
 rock(x,y,w,h,tint='#255160'){
  const c=this.ctx;
  c.save();c.translate(x,y);c.fillStyle='#102d3c';c.strokeStyle=tint;c.lineWidth=1.5;
  c.beginPath();c.moveTo(0,h*.32);c.lineTo(w*.18,h*.1);c.lineTo(w*.48,0);
  c.lineTo(w*.81,h*.14);c.lineTo(w,h*.36);c.lineTo(w,h*.81);c.lineTo(w*.7,h);
  c.lineTo(w*.22,h);c.lineTo(0,h*.79);c.closePath();c.fill();c.stroke();
  c.globalAlpha=.42;c.beginPath();c.moveTo(w*.12,h*.38);c.lineTo(w*.49,h*.2);
  c.lineTo(w*.77,h*.32);c.stroke();c.restore();
 }
 surveyPlants(time,options){
  const c=this.ctx,m=this.model,s=this.scale(),low=options.quality==='low';
  let count=0;
  for(const p of m.decorations){
   if(p.id%(low?12:6)!==0)continue;
   const spot=this.screen(p);
   const species=m.region===1&&p.id%4===0?'kelp':m.region===2&&p.id%4===0?'glow':p.type;
   const size=s*p.scale*(species==='kelp'?1.2:.83);
   c.save();c.translate(spot.x,spot.y);c.scale(size,size);
   c.rotate(options.reduced?0:Math.sin(time*.58+p.phase)*.045);
   c.globalAlpha=.48;
   c.drawImage(this.sprite(species,p.tint),-95,-220);c.restore();
   count++;
  }
  this.metrics.plants=count;this.metrics.cacheEntries=this.cache.size;
 }
 terrain(time,options){
  const m=this.model,c=this.ctx;
  for(const wall of m.walls||[]){
   const a=this.screen(wall),b=this.screen({x:wall.x+wall.w,y:wall.y+wall.h});
   const w=b.x-a.x,h=b.y-a.y;
   c.fillStyle='#0b2636';c.fillRect(a.x,a.y,w,h);
   const vertical=h>w,count=Math.max(1,Math.ceil((vertical?h:w)/34));
   for(let i=0;i<count;i++){
    this.rock(a.x+(vertical?0:i*w/count),a.y+(vertical?i*h/count:0),
     vertical?w:w/count+1,vertical?h/count+1:h);
   }
  }
  for(const [i,poi] of (m.poi||[]).entries()){
   const p=this.screen(poi),near=Math.hypot(poi.x-m.probe.x,poi.y-m.probe.y)<65;
   const kind=poi.kind||'garden';
   if(/arch|cave|chamber|wreck|ruin/.test(kind)){
    this.rock(p.x-24,p.y-12,18,25);this.rock(p.x+7,p.y-11,18,24);
    c.strokeStyle='#306372';c.lineWidth=5;c.beginPath();c.moveTo(p.x-17,p.y-7);
    c.quadraticCurveTo(p.x,p.y-36,p.x+17,p.y-6);c.stroke();
   }else if(/vent|bubble/.test(kind)){
    this.rock(p.x-17,p.y-4,34,12);
    c.strokeStyle='#a8ebf68a';c.lineWidth=1;
    for(let j=0;j<3;j++){
     const lift=options.reduced?j*5:(time*10+j*9)%27;
     c.beginPath();c.arc(p.x+j*5-5,p.y-lift,2+j*.5,0,TAU);c.stroke();
    }
   }else{
    const species=/kelp/.test(kind)?'kelp':/nest/.test(kind)?'anemone':/crystal|glow/.test(kind)?'glow':'sea-fan';
    c.save();c.globalAlpha=.65;c.drawImage(this.sprite(species,i%3),p.x-25,p.y-49,50,60);c.restore();
   }
   if(near&&poi.label)this.label(poi.label,p.x,p.y+25,'#b7dfd7');
  }
 }
 coralGate(time,options){
  const m=this.model,c=this.ctx,g=m.gate;
  if(!g)return;
  const a=this.screen(g),b=this.screen({x:g.x+g.w,y:g.y+g.h}),mid=(a.x+b.x)/2;
  const span=b.y-a.y,color=GATE_COLORS[g.type]||'#b3ebd9',open=m.gateOpen();
  const progress=clamp01(g.progress||0);
  c.save();c.lineCap='round';c.lineJoin='round';
  for(const direction of [-1,1]){
   const rootY=direction===1?a.y:b.y;
   const endY=rootY+direction*span*(open?.11:.53-.18*progress);
   const sway=options.reduced?0:Math.sin(time*1.8+direction)*(2+progress*2);
   this.rock(mid-11,rootY-5,22,10,'#547c81');
   for(let i=-1;i<=1;i++){
    const x=mid+i*3,bend=(i*6+sway+progress*direction*3);
    c.strokeStyle=i===0?color:'#285b5e';c.lineWidth=i===0?4:2.5;
    c.beginPath();c.moveTo(x,rootY);
    c.quadraticCurveTo(x+bend,(rootY+endY)/2,x+sway,endY);c.stroke();
    for(const frac of [.30,.59,.80]){
     const y=rootY+(endY-rootY)*frac,side=(Math.round(frac*10)+i)%2?-1:1;
     const tipX=x+side*(5+4*(1-frac)),tipY=y+direction*(3+4*(1-frac));
     c.strokeStyle=color;c.lineWidth=1.4;c.beginPath();c.moveTo(x+sway*frac,y);
     c.quadraticCurveTo(tipX,y,tipX,tipY);c.stroke();
     c.fillStyle='#dcf5d6';c.beginPath();c.arc(tipX,tipY,1.4,0,TAU);c.fill();
    }
   }
  }
  if(!open&&progress>0){
   c.strokeStyle=color;c.lineWidth=2;
   c.beginPath();c.moveTo(mid,a.y+span*(.5-.18*progress));
   c.bezierCurveTo(mid-6,a.y+span*.44,mid+6,a.y+span*.56,mid,b.y-span*(.5-.18*progress));
   c.stroke();
  }
  if(!open&&progress>0){
   const x=mid+15,y=(a.y+b.y)/2;
   c.lineWidth=2;c.strokeStyle='#1b4457';c.beginPath();c.arc(x,y,8,0,TAU);c.stroke();
   c.strokeStyle=color;c.beginPath();c.arc(x,y,8,-Math.PI/2,-Math.PI/2+TAU*progress);c.stroke();
   if(!options.reduced){
    for(let i=0;i<3;i++){
     const age=(time*10+i*7)%20;c.strokeStyle=color+'aa';c.beginPath();
     c.arc(mid+Math.sin(i+age*.2)*9,y-age,1.4+i*.3,0,TAU);c.stroke();
    }
   }
  }
  c.restore();
  if(Math.hypot(g.x+g.w/2-m.probe.x,g.y+g.h/2-m.probe.y)<100){
   this.label(open?'Passage open':g.name||'Coral gate',mid,a.y-13,color);
  }
 }
 restoredHabitat(time,options){
  const m=this.model,c=this.ctx,h=m.habitat;
  if(!h)return;
  const p=this.screen(h),s=this.scale(),growth=clamp01(h.progress/Math.max(1,h.total));
  const restored=h.state==='restored',radius=Math.max(24,s*h.r);
  const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*1.6);
  glow.addColorStop(0,restored?'#f8c7924d':growth>0?'#a7eed62c':'#a1c9d71a');
  glow.addColorStop(1,'#a1e7ba00');c.fillStyle=glow;
  c.fillRect(p.x-radius*1.6,p.y-radius*1.6,radius*3.2,radius*3.2);
  this.rock(p.x-radius,p.y+5,2*radius,Math.max(9,radius*.35));
  const count=restored?7:3+Math.floor(growth*3);
  for(let i=0;i<count;i++){
   const x=p.x+(i/(count-1)-.5)*radius*1.8;
   const size=radius*(.49+(i%3)*.08+growth*.36);
   c.save();c.translate(x,p.y+10+Math.abs(i/(count-1)-.5)*5);
   c.rotate(options.reduced?0:Math.sin(time*.8+i)*.07);
   c.filter=i<3&&!restored?`saturate(${.12+growth*.66}) brightness(${.73+growth*.2})`:'none';
   c.globalAlpha=.76+growth*.22;
   const species=i%3===0?'soft-coral':i%3===1?'sea-fan':restored?'anemone':'seagrass';
   c.drawImage(this.sprite(species,i%3),-size*.56,-size*1.25,size*1.12,size*1.3);c.restore();
  }
  const fish=restored?(options.quality==='low'?3:6):Math.floor(growth*4);
  for(let i=0;i<fish;i++){
   const a=i*1.1+(options.reduced?0:time*.45),x=p.x+Math.cos(a)*radius*.82,y=p.y-14+Math.sin(a)*radius*.36;
   this.fish(x,y,Math.sin(a)>0?-1:1,3.4+i%2,['#ffc484','#adeaca','#f2a2cc'][i%3]);
   if(!options.reduced&&i<3){
    c.strokeStyle='#d1fff28a';c.beginPath();c.arc(x+5,y-(time*9+i*7)%20,1.8,0,TAU);c.stroke();
   }
  }
  if(restored)this.creature(p.x+radius*.38+(options.reduced?0:Math.sin(time*.9)*8),p.y+12,'crab',6,time,options);
  if(Math.hypot(h.x-m.probe.x,h.y-m.probe.y)<100){
   const status=restored?'Restored':h.state==='undiscovered'?'Habitat nearby':`${h.progress}/${h.total} tasks complete`;
   this.label(status,p.x,p.y+radius*.62,restored?'#ffdfac':'#d1f4ed');
  }
 }
 fish(x,y,direction,size,color){
  const c=this.ctx;c.save();c.translate(x,y);c.scale(direction,1);c.fillStyle=color;
  c.beginPath();c.ellipse(0,0,size*1.3,size*.65,0,0,TAU);
  c.moveTo(-size,0);c.lineTo(-size*2,-size*.72);c.lineTo(-size*2,size*.72);c.closePath();c.fill();
  c.fillStyle='#0e3442';c.beginPath();c.arc(size*.65,-size*.12,.85,0,TAU);c.fill();c.restore();
 }
 creature(x,y,kind,size,time,options,direction=1){
  const c=this.ctx;const sway=options.reduced?0:Math.sin(time*2)*.17;
  c.save();c.translate(x,y);c.scale(direction*size/10,size/10);c.lineCap='round';
  c.fillStyle='#c1ecb1';c.strokeStyle='#406f69';c.lineWidth=1.5;
  if(kind==='turtle'){
   c.beginPath();c.ellipse(0,0,9,6,0,0,TAU);c.fill();
   c.beginPath();c.ellipse(9,-.5,4,3,0,0,TAU);c.fill();c.stroke();
   for(const side of [-1,1]){
    c.beginPath();c.ellipse(3,side*6,6,2.2,side*(.6+sway),0,TAU);c.fill();c.stroke();
   }
   c.fillStyle='#639b7a';c.beginPath();c.ellipse(-1,0,7,4,0,0,TAU);c.fill();c.stroke();
  }else if(kind==='seahorse'){
   c.strokeStyle='#ffd393';c.lineWidth=4;c.beginPath();c.moveTo(0,-7);
   c.bezierCurveTo(-7,-3,4,5,-2,11);c.quadraticCurveTo(-9,13,-7,7);c.stroke();
   c.fillStyle='#ffd393';c.beginPath();c.ellipse(1,-7,4,4,0,0,TAU);c.fill();c.fillRect(2,-7,6,2.5);
  }else if(kind==='octopus'||kind==='jellyfish'||kind==='jelly'){
   const jelly=kind!=='octopus';c.fillStyle=jelly?'#bbd5ffa8':'#f0a5c3';
   c.strokeStyle=c.fillStyle;c.lineWidth=jelly?1:2;
   c.beginPath();c.ellipse(0,-3,8,6,0,Math.PI,TAU);c.lineTo(8,0);
   c.quadraticCurveTo(0,4,-8,0);c.closePath();c.fill();
   for(let i=-2;i<=2;i++){
    c.beginPath();c.moveTo(i*3,0);c.quadraticCurveTo(i*3+sway*14,7,i*4,9+(i%2)*2);c.stroke();
   }
  }else if(kind==='crab'){
   c.fillStyle='#eeb08d';c.strokeStyle='#eeb08d';c.beginPath();c.ellipse(0,0,8,5,0,0,TAU);c.fill();
   for(const side of [-1,1]){
    for(let i=1;i<=3;i++){c.beginPath();c.moveTo(side*4,i);c.lineTo(side*(7+i),3+i*1.3);c.stroke();}
    c.beginPath();c.moveTo(side*6,0);c.lineTo(side*12,-4);c.lineTo(side*14,-9);c.stroke();
   }
  }else if(kind==='manta'||kind==='ray'){
   c.fillStyle='#90c5e7';c.beginPath();c.moveTo(10,-1);
   c.quadraticCurveTo(2,-4,-3,-12-sway*9);c.quadraticCurveTo(-12,-1,-5,0);
   c.quadraticCurveTo(-12,2,-3,12+sway*9);c.quadraticCurveTo(3,3,10,-1);c.fill();
   c.strokeStyle='#90c5e7';c.beginPath();c.moveTo(-5,0);c.quadraticCurveTo(-13,-2,-17,2);c.stroke();
  }else if(kind==='clownfish'){
   c.fillStyle='#f6a459';c.beginPath();c.ellipse(0,0,9,5.4,0,0,TAU);c.fill();
   c.beginPath();c.moveTo(-6,0);c.lineTo(-13,-5);c.lineTo(-13,5);c.closePath();c.fill();
   c.strokeStyle='#fff1da';c.lineWidth=2.1;
   for(const pos of [-4,2]){c.beginPath();c.moveTo(pos,-4);c.quadraticCurveTo(pos-1.7,0,pos,4);c.stroke();}
   c.fillStyle='#203b41';c.beginPath();c.arc(5,-1,1,0,TAU);c.fill();
  }else{
   c.restore();this.fish(x,y,direction,size*.64,'#ffc07f');return;
  }
  if(!['manta','ray','jellyfish','jelly','crab','clownfish'].includes(kind)){
   c.fillStyle='#193947';c.beginPath();c.arc(kind==='turtle'?10:2,kind==='seahorse'?-8:-2,1,0,TAU);c.fill();
  }
  c.restore();
 }
 encounterMarkers(time,options){
  const m=this.model,c=this.ctx;
  for(const marker of m.markers||[]){
   if(marker.active===false||marker.collected||marker.kind==='creature'&&m.escort)continue;
   const p=this.screen(marker),near=Math.hypot(marker.x-m.probe.x,marker.y-m.probe.y)<78;
   const color=MARKER_COLORS[marker.kind]||'#bde6ec';
   c.save();c.translate(p.x,p.y);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.4;
   if(!options.reduced){
    c.globalAlpha=.44;
    c.beginPath();c.arc(0,0,9+Math.sin(time*2+p.x*.02)*1.7,0,TAU);c.stroke();c.globalAlpha=1;
   }
   c.beginPath();
   switch(marker.route==='pearl-trail'?'pearl':marker.kind){
    case 'pearl': c.arc(0,0,5,0,TAU);c.fill();c.fillStyle='#fffdf8';c.beginPath();c.arc(-1.6,-1.7,1.3,0,TAU);c.fill();break;
    case 'coral': c.moveTo(0,6);c.lineTo(0,-5);c.moveTo(0,2);c.lineTo(-5,-2);c.moveTo(0,-1);c.lineTo(5,-5);c.stroke();break;
    case 'debris': c.moveTo(-6,-3);c.lineTo(4,-5);c.lineTo(6,4);c.lineTo(-4,6);c.closePath();c.stroke();break;
    case 'egg': for(const x of [-4,0,4]){c.moveTo(x+2.5,1);c.ellipse(x,1,2.5,3.7,0,0,TAU);}c.fill();break;
    case 'vent': for(const i of [0,1,2]){c.moveTo(i*3-1,i*-3+3);c.arc(i*3-3,i*-3+3,2,0,TAU);}c.stroke();break;
    case 'creature': c.restore();this.creature(p.x,p.y,marker.species||m.companionKind||'turtle',9,time,options);if(near)this.label(marker.label,p.x,p.y+18,color);continue;
    case 'resonance': c.arc(0,0,6,0,TAU);c.stroke();c.beginPath();c.arc(0,0,2.4,0,TAU);c.fill();break;
    case 'current': {const direction=Math.sign(m.current.dx);c.moveTo(-6*direction,0);c.lineTo(6*direction,0);c.lineTo(2*direction,-4);c.moveTo(6*direction,0);c.lineTo(2*direction,4);c.stroke();break;}
    default: c.moveTo(-5,0);c.lineTo(0,-5);c.lineTo(5,0);c.lineTo(0,5);c.closePath();c.fill();
   }
   c.restore();
   if(marker.number!=null)this.label(String(marker.number),p.x,p.y-12,color);
   if(near&&marker.label)this.label(marker.label,p.x,p.y+18,color);
  }
  for(const f of [m.companion,m.escort]){
   if(!f)continue;
   const p=this.screen(f);
   this.creature(p.x,p.y,f.kind||f.id,Math.max(7,this.scale()*17),time,options,f.vx<0?-1:1);
  }
 }
 survey(time,options={}){const m=this.model,c=this.ctx;if(!m.survey)return;const zone=m.current,a=this.screen(zone),b=this.screen({x:zone.x+zone.w,y:zone.y+zone.h});this.surveyPlants(time,options);this.terrain(time,options);c.fillStyle='#7ce6d809';c.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);c.strokeStyle='#9eeed14d';c.lineWidth=1.3;const direction=Math.sign(zone.dx);for(let i=0;i<14;i++){const x=zone.x+((i*47+(options.reduced?0:time*zone.dx))%zone.w+zone.w)%zone.w,y=zone.y+25+(i%3)*45,p=this.screen({x,y});c.beginPath();c.moveTo(p.x-5*direction,p.y-3);c.lineTo(p.x+2*direction,p.y);c.lineTo(p.x-5*direction,p.y+3);c.stroke();}
  const vent=this.screen(m.vent),active=m.time%6<2;c.strokeStyle=active?'#b2f3ff99':'#91d6dc33';for(let i=0;i<(options.reduced?3:9);i++){const offset=options.reduced?i*12:((time*45+i*22)%150),p=this.screen({x:m.vent.x+Math.sin(i)*18,y:m.vent.y-offset});c.beginPath();c.arc(p.x,p.y,2+(i%3),0,TAU);c.stroke();}this.label(active?'VENT · LIFT':'VENT · REST',vent.x,vent.y+17,'#b3e6ef');
  this.coralGate(time,options);
  this.restoredHabitat(time,options);
  this.encounterMarkers(time,options);
  for(const t of m.treasures){if(m.journal.found.includes(t.id))continue;const p=this.screen(t),radius=t.rare?8:6;const color=root.ReefOcean.TREASURE_TYPES[t.type].color;c.save();c.translate(p.x,p.y+(options.reduced?0:Math.sin(time*2+t.phase)*2));c.fillStyle=color;c.strokeStyle='#172f43';c.lineWidth=2;c.shadowColor=color;c.shadowBlur=options.quality==='low'?0:12;
   c.beginPath();if(t.type==='pearl')c.arc(0,0,radius,0,TAU);else if(t.type==='crystal'){c.moveTo(0,-10);c.lineTo(7,0);c.lineTo(0,9);c.lineTo(-7,0);c.closePath();}else if(t.type==='starfish'){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?4:10;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(0,-10);}c.closePath();}else if(t.type==='shell'){c.arc(0,3,9,Math.PI,TAU);c.lineTo(0,8);c.closePath();}else c.rect(-7,-8,14,16);c.fill();c.stroke();c.shadowBlur=0;if(t.rare){c.strokeStyle='#fff3b9';c.beginPath();c.arc(0,0,12,0,TAU);c.stroke();}c.restore();}
  if(m.target){const dest=this.screen(m.target);c.strokeStyle='#d3faff88';c.beginPath();c.arc(dest.x,dest.y,7,0,TAU);c.stroke();}
  const p=this.screen(m.probe),speed=Math.hypot(m.probe.vx,m.probe.vy);
  if(this.probeRegion!==m.region||this.probeTime>m.time){this.probeRegion=m.region;this.heading=0;}
  this.probeTime=m.time;
  if(speed>10){
   const desired=Math.atan2(m.probe.vy*this.bounds.h/650,m.probe.vx*this.bounds.w/1000);
   const old=this.heading||0;this.heading=options.reduced?desired:old+Math.atan2(Math.sin(desired-old),Math.cos(desired-old))*.21;
  }
  c.save();c.translate(p.x,p.y);c.rotate(this.heading||0);
  if(!options.reduced&&speed>35){
   for(let i=0;i<3;i++){
    const life=(time*2+i/3)%1;c.strokeStyle=`rgba(189,242,237,${.4*(1-life)})`;
    c.beginPath();c.arc(-17-life*17,Math.sin(i+life*2)*4,1.3+i*.35,0,TAU);c.stroke();
   }
  }
  c.fillStyle='#f6cf83';c.strokeStyle='#092739';c.lineWidth=2;c.beginPath();
  c.ellipse(0,0,13,9,0,0,TAU);c.fill();c.stroke();
  c.fillStyle='#17394e';c.beginPath();c.arc(5,-1,4,0,TAU);c.fill();
  c.fillStyle='#a8f8f4';c.beginPath();c.arc(6,-2,1.5,0,TAU);c.fill();
  c.strokeStyle='#c2f8ef';c.beginPath();c.moveTo(-14,-5);c.lineTo(-14,5);c.stroke();c.restore();
  if(!options.reduced)for(const e of m.effects){const p=this.screen(e),r=(1.4-e.life)*14;c.strokeStyle=`rgba(187,249,229,${Math.max(0,e.life/2)})`;c.beginPath();c.arc(p.x+Math.cos(e.phase)*r,p.y-Math.sin(e.phase)*r,2,0,TAU);c.stroke();}
 }
 label(text,x,y,color){const c=this.ctx;c.save();c.font='9px system-ui';c.textAlign='center';c.fillStyle=color;c.shadowColor='#061725';c.shadowBlur=3;c.fillText(text,x,y);c.restore();}
}
root.ReefOceanRenderer=OceanRenderer;if(typeof module==='object'&&module.exports)module.exports=OceanRenderer;
})(typeof globalThis!=='undefined'?globalThis:this);
