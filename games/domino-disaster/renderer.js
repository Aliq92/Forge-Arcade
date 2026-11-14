import { CATALOG } from './gadgets.js';

export const PALETTE = Object.freeze({turquoise:'#49dfd0',gold:'#ffd467',coral:'#ff7d83',lavender:'#b9a4ff',mint:'#a0e7b3',orange:'#ffad66',navy:'#162c43'});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const color=v=>PALETTE[v]||v||PALETTE.turquoise;
const stateFor=(scene,id)=>scene?.gadgetStates instanceof Map?scene.gadgetStates.get(id)||{}:scene?.gadgetStates?.[id]||{};
const active=(scene,id)=>scene?.activated instanceof Set?scene.activated.has(id):scene?.activated?.includes(id);
const shape=o=>({...CATALOG[o.type],...o,...(o.type==='spring'?{angle:0,launchAngle:o.launchAngle??o.angle??0}:{})});

/** All camera coordinates are CSS pixels relative to the canvas, independent of DPR. */
export class Camera {
  constructor(){this.x=0;this.y=0;this.zoom=1;}
  screen(p){return {x:p.x*this.zoom+this.x,y:p.y*this.zoom+this.y};}
  world(x,y){return {x:(x-this.x)/this.zoom,y:(y-this.y)/this.zoom};}
  fit(board,width,height,insets={}){
    const {left=32,right=32,top=32,bottom=32}=insets;
    const w=Math.max(20,width-left-right),h=Math.max(20,height-top-bottom);
    this.zoom=clamp(Math.min(w/board.width,h/board.height),0.04,4);
    this.x=left+(w-board.width*this.zoom)/2;this.y=top+(h-board.height*this.zoom)/2;
  }
  pan(dx,dy){if(Number.isFinite(dx)&&Number.isFinite(dy)){this.x+=dx;this.y+=dy;}}
  zoomAt(factor,x,y){if(!Number.isFinite(factor)||factor<=0)return;const p=this.world(x,y);this.zoom=clamp(this.zoom*factor,.04,5);this.x=x-p.x*this.zoom;this.y=y-p.y*this.zoom;}
}

/** Distance to the actual rotated physical silhouette, with a 22 CSS px minimum target. */
export function hitTest(x,y,objects,zoom=1){
  let best=null,bestD=Infinity;
  for(let i=objects.length-1;i>=0;i--){
    const o=shape(objects[i]),a=-(o.angle||0),dx=x-o.x,dy=y-o.y;
    const lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);
    const d=o.shape==='circle'?Math.max(0,Math.hypot(lx,ly)-o.r):Math.hypot(Math.max(0,Math.abs(lx)-o.w/2),Math.max(0,Math.abs(ly)-o.h/2));
    if(d*zoom<=11&&d<bestD){best=objects[i];bestD=d;}
  }return best;
}

/** Fixed capacity pool; effects cannot grow with long-running sandbox experiments. */
export class ParticlePool {
  constructor(){this.items=[];this.free=[];this.limit=240;this.seed=37;}
  configure(quality='high',reduced=false){this.limit=reduced?0:quality==='low'?60:240;while(this.items.length>this.limit)this.free.push(this.items.pop());}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  emit(x,y,count=8,celebrate=false){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const n=Math.max(0,Math.min(count,this.limit-this.items.length));
    for(let i=0;i<n;i++){
      const p=this.free.pop()||{},a=this.random()*Math.PI*2,s=(celebrate?80:25)+this.random()*(celebrate?200:65);
      Object.assign(p,{x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(celebrate?130:20),life:celebrate?1.3:.4,total:celebrate?1.3:.4,size:celebrate?4:2,color:Object.values(PALETTE)[i%6]});this.items.push(p);
    }
  }
  update(dt){dt=clamp(Number.isFinite(dt)?dt:0,0,.05);for(let i=this.items.length-1;i>=0;i--){const p=this.items[i];p.life-=dt;if(p.life<=0){this.free.push(p);this.items.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=190*dt;}}
}

function rounded(ctx,x,y,w,h,r=3){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));}
function rect(ctx,x,y,w,h,fill,stroke='#142c40',r=3){rounded(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function dot(ctx,x,y,r,fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function label(ctx,text,x,y,size=12,fill='#e0eeed'){ctx.font=`700 ${size}px ui-monospace, monospace`;ctx.textAlign='center';ctx.fillStyle=fill;ctx.fillText(text,x,y);}

export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=new Camera();this.width=0;this.height=0;this.dpr=1;this.particles=new ParticlePool();this.metrics={drawMs:0,particles:0,dpr:1,frames:0,cacheBuilds:0};this.cache=null;this.lastTime=null;this.options={};this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width||this.canvas.clientWidth||800);this.height=Math.max(1,r.height||this.canvas.clientHeight||600);this.dpr=Math.min(1.5,globalThis.devicePixelRatio||1);const w=Math.round(this.width*this.dpr),h=Math.round(this.height*this.dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.cache=null;}this.metrics.dpr=this.dpr;}
  fit(board,insets){if(!insets)insets=this.width<700&&this.height>this.width?{left:16,right:16,top:150,bottom:170}:this.height<520?{left:24,right:230,top:80,bottom:100}:{left:32,right:280,top:110,bottom:110};this.camera.fit(board,this.width,this.height,insets);}
  screen(p){return this.camera.screen(p);}
  world(x,y){return this.camera.world(x,y);}
  hit(x,y,board){const p=this.world(x,y);return hitTest(p.x,p.y,board.objects||[],this.camera.zoom);}
  pan(dx,dy){this.camera.pan(dx,dy);}
  zoomAt(f,x,y){this.camera.zoomAt(f,x,y);}
  feedback(events){for(const e of events||[]){if(e.type==='success'||e.type==='finish')this.particles.emit(e.x,e.y,48,true);else if(['collision','spring','gear','switch','seesaw'].includes(e.type))this.particles.emit(e.x,e.y,5);}}
  background(){
    if(!this.cache){const canvas=this.canvas.ownerDocument?.createElement('canvas');if(!canvas)return;canvas.width=this.canvas.width;canvas.height=this.canvas.height;const c=canvas.getContext('2d');c.scale(this.dpr,this.dpr);const grad=c.createLinearGradient(0,0,0,this.height);grad.addColorStop(0,'#101f32');grad.addColorStop(1,'#263c50');c.fillStyle=grad;c.fillRect(0,0,this.width,this.height);c.fillStyle='#63828d';for(let x=14;x<this.width;x+=32)for(let y=14;y<this.height;y+=32){c.globalAlpha=.14;dot(c,x,y,.8,'#a5bdbe');}c.globalAlpha=1;this.cache=canvas;this.metrics.cacheBuilds++;}
    this.ctx.drawImage(this.cache,0,0,this.width,this.height);
  }
  draw(board,scene,options={}){
    const t=globalThis.performance?.now()||Date.now(),c=this.ctx;this.options=options;this.particles.configure(options.quality,options.reduced);const dt=this.lastTime===null?0:(t-this.lastTime)/1000;this.lastTime=t;this.particles.update(dt);
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);this.background();c.save();c.translate(this.camera.x,this.camera.y);c.scale(this.camera.zoom,this.camera.zoom);
    // Decorative tabletop rim is behind collision geometry, never a substitute for it.
    rect(c,-12,-12,board.width+24,board.height+24,'#b87c4d','#101e30',14);rect(c,0,0,board.width,board.height,'#ddad72','#ebc991',9);
    c.save();rounded(c,0,0,board.width,board.height,9);c.clip();c.strokeStyle='#8f5b37';c.globalAlpha=.13;c.lineWidth=1;for(let y=26;y<board.height;y+=36){c.beginPath();c.moveTo(0,y);c.bezierCurveTo(board.width*.3,y-8,board.width*.7,y+8,board.width,y);c.stroke();}c.globalAlpha=.2;c.strokeStyle='#fff0c6';for(let x=20;x<board.width;x+=25)for(let y=20;y<board.height;y+=25)dot(c,x,y,1,'#fff1c6');c.restore();
    this.forbidden(board.forbidden||[]);
    const bodies=scene?.bodies||[],map=new Map(bodies.map(b=>[b.id,b]));const objects=(board.objects||[]).map(o=>({...o,...(map.get(o.id)||{}),launchAngle:o.type==='spring'?o.angle||0:undefined}));
    this.connections(board,objects,scene);
    for(const platform of board.platforms||[])this.platform({...platform,...(map.get(platform.id)||{})});
    for(const o of objects)this.object(o,stateFor(scene,o.id),Boolean(active(scene,o.id)),options);
    if(board.start){const o=objects.find(o=>o.id===board.start.id);if(o)this.startFlag(o);}
    if(options.ghost){c.save();c.globalAlpha=.6;this.object(options.ghost,{},false,{...options,selectedId:options.ghost.id,ghost:true});c.restore();}
    for(const p of this.particles.items){c.globalAlpha=p.life/p.total;rect(c,p.x,p.y,p.size*2,p.size,p.color,null,1);}c.globalAlpha=1;
    c.restore();this.metrics.drawMs=(globalThis.performance?.now()||Date.now())-t;this.metrics.frames++;this.metrics.particles=this.particles.items.length;this.metrics.objects=objects.length;
  }
  forbidden(zones){const c=this.ctx;for(const z of zones){c.save();c.beginPath();c.rect(z.x,z.y,z.w,z.h);c.clip();c.fillStyle='#a54a4a22';c.fillRect(z.x,z.y,z.w,z.h);c.strokeStyle='#8c474866';c.lineWidth=2;for(let x=z.x-z.h;x<z.x+z.w;x+=14){c.beginPath();c.moveTo(x,z.y);c.lineTo(x+z.h,z.y+z.h);c.stroke();}c.restore();c.setLineDash([6,4]);c.strokeStyle='#8b4646';c.strokeRect(z.x,z.y,z.w,z.h);c.setLineDash([]);label(c,'NO BUILD',z.x+z.w/2,z.y+z.h/2,10,'#824345');}}
  platform(p){const c=this.ctx;c.save();c.translate(p.x,p.y);c.rotate(p.angle||0);rect(c,-p.w/2+3,-p.h/2+5,p.w,p.h,'#805638',null,4);rect(c,-p.w/2,-p.h/2,p.w,p.h,'#92613e','#5d3e30',4);c.strokeStyle='#ecc690';c.lineWidth=2;c.beginPath();c.moveTo(-p.w/2+4,-p.h/2+2);c.lineTo(p.w/2-4,-p.h/2+2);c.stroke();c.restore();}
  connections(board,objects,scene){const c=this.ctx,map=new Map(objects.map(o=>[o.id,o]));for(const link of board.links||[]){const a=map.get(link.from),b=map.get(link.to);if(!a||!b)continue;const on=active(scene,a.id);c.strokeStyle=on?'#2e927c':'#625c70';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.moveTo(a.x,a.y);c.bezierCurveTo(a.x,a.y-50,b.x,b.y-50,b.x,b.y);c.stroke();c.setLineDash([]);dot(c,a.x,a.y,3,on?'#79e7bb':'#675b74');const angle=Math.atan2(b.y-a.y,b.x-a.x);c.save();c.translate(b.x,b.y);c.rotate(angle);c.beginPath();c.moveTo(-9,-5);c.lineTo(0,0);c.lineTo(-9,5);c.stroke();c.restore();}}
  startFlag(o){const c=this.ctx;c.save();c.translate(o.x,o.y);const d=shape(o);const y=-(d.h||d.r*2)/2-18;c.strokeStyle='#20394c';c.lineWidth=2;c.beginPath();c.moveTo(0,y+9);c.lineTo(0,y-12);c.stroke();c.fillStyle='#fa7379';c.beginPath();c.moveTo(0,y-12);c.lineTo(24,y-5);c.lineTo(0,y+1);c.fill();label(c,'1',9,y-3,8,'#fff4dd');c.restore();}
  object(spec,state,on,options){
    const c=this.ctx,o=shape(spec),w=o.w||o.r*2,h=o.h||o.r*2;let ink=color(o.color||CATALOG[o.type]?.color);c.save();c.translate(o.x,o.y);c.rotate(o.type==='gear'&&Number.isFinite(state.rotation)?state.rotation:o.angle||0);
    c.lineJoin='round';c.shadowColor='#15253745';c.shadowBlur=3;c.shadowOffsetY=3;
    if(o.type==='domino'){
      rect(c,-w/2,-h/2,w,h,ink,'#253448',3);c.shadowColor='transparent';rect(c,-w/2+2,-h/2+3,3,h-7,'#ffffff50',null,1);c.strokeStyle='#24394980';c.lineWidth=1;c.beginPath();c.moveTo(-w/2+2,0);c.lineTo(w/2-2,0);c.stroke();for(const y of [-h*.28,h*.2,h*.36])dot(c,1,y,1.5,'#17344b');
    }else if(o.type==='marble'){
      const g=c.createRadialGradient(-o.r*.35,-o.r*.4,1,0,0,o.r);g.addColorStop(0,'#ffffff');g.addColorStop(.25,ink);g.addColorStop(1,'#245977');dot(c,0,0,o.r,g);c.shadowColor='transparent';c.strokeStyle='#183b52';c.lineWidth=1.5;c.beginPath();c.arc(0,0,o.r,0,Math.PI*2);c.stroke();c.strokeStyle='#ffffffa0';c.lineWidth=2;c.beginPath();c.arc(0,0,o.r*.6,-1.2,1);c.stroke();dot(c,-o.r*.3,-o.r*.4,o.r*.17,'#ffffff');
    }else if(o.type==='ramp'||o.type==='seesaw'){
      if(o.type==='seesaw'){c.save();c.rotate(-(o.angle||0));c.fillStyle='#695a64';c.beginPath();c.moveTo(-14,24);c.lineTo(0,0);c.lineTo(14,24);c.closePath();c.fill();c.restore();}rect(c,-w/2,-h/2,w,h,o.type==='ramp'?'#e5b16c':ink,'#604739',3);c.shadowColor='transparent';c.strokeStyle='#fff0bc';c.lineWidth=2;c.beginPath();c.moveTo(-w/2+3,-h/2+2);c.lineTo(w/2-3,-h/2+2);c.stroke();if(o.type==='seesaw'){dot(c,0,0,4,'#f8db9c');dot(c,0,0,1.8,'#394858');}
    }else if(o.type==='gear'){
      c.beginPath();for(let i=0;i<48;i++){const a=i*Math.PI/24,r=o.r*(i%4<2?1:.8);const x=Math.cos(a)*r,y=Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle=on?'#ffe184':ink;c.strokeStyle='#34475c';c.lineWidth=2;c.fill();c.stroke();c.shadowColor='transparent';dot(c,0,0,o.r*.55,'#33475e');for(let i=0;i<4;i++){const a=i*Math.PI/2;dot(c,Math.cos(a)*o.r*.35,Math.sin(a)*o.r*.35,3,'#e8c794');}dot(c,0,0,5,'#e0e6e0');dot(c,0,0,2,'#566274');
    }else if(o.type==='spring'){
      // Spring collisions are axis aligned; the arrow separately shows configured launch direction.
      rect(c,-w/2,-h/2,w,h,state.used?'#738282':'#f6c75f','#394959',3);c.shadowColor='transparent';const compression=clamp(state.compression||0,0,1),end=w/2-4-compression*9;c.strokeStyle=state.used?'#405968':'#a24d66';c.lineWidth=2;c.beginPath();c.moveTo(-w/2+4,0);for(let i=0;i<7;i++)c.lineTo(-w/2+5+(end+w/2-5)*i/6,i%2?-h*.3:h*.3);c.lineTo(end,0);c.stroke();c.fillStyle='#f97881';c.fillRect(end-2,-h/2+2,4,h-4);c.save();c.rotate((o.launchAngle??o.angle??0)-(o.angle||0));c.fillStyle='#253d50';c.beginPath();c.moveTo(w/2+12,0);c.lineTo(w/2+4,-4);c.lineTo(w/2+4,4);c.fill();c.strokeStyle='#253d50';c.beginPath();c.moveTo(w/2-1,0);c.lineTo(w/2+7,0);c.stroke();c.restore();
    }else if(o.type==='switch'){
      rect(c,-w/2,-h/2,w,h,on?'#80dfa9':'#b9a4ed','#314359',3);c.shadowColor='transparent';rect(c,-w/2+4,-h/2+1,w-8,h-2,on?'#4eab82':'#e48d9b',null,2);label(c,on?'✓':'●',0,3,8,'#173f45');
    }else if(o.type==='finish'){
      rect(c,-w/2,-h/2,w,h,on?'#9ae4ac':'#ffda75','#4c5356',5);c.shadowColor='transparent';rect(c,-w/2+4,-h/2+5,w-8,h-10,on?'#2e866d':'#314a5e',null,3);label(c,on?'✓':'★',0,5,19,on?'#e2ffdc':'#ffe39a');const accept=o.settings?.accept;if(accept&&accept!=='any')label(c,accept==='marble'?'●':'▯',0,h/2+11,10,'#314456');
    }
    c.shadowColor='transparent';
    if(!o.locked&&!options.ghost){c.strokeStyle='#ffffff50';c.lineWidth=.8;c.setLineDash([2,3]);rounded(c,-w/2-3,-h/2-3,w+6,h+6,4);c.stroke();c.setLineDash([]);}
    if(options.selectedId===o.id||options.highlightId===o.id||options.ghost){c.strokeStyle=options.ghost?(options.valid===false?'#bd344f':'#176f61'):options.highlightId===o.id?'#e95955':'#fff8d6';c.lineWidth=2.5/Math.max(this.camera.zoom,.3);c.setLineDash(options.ghost?[5,3]:[]);rounded(c,-w/2-5,-h/2-5,w+10,h+10,5);c.stroke();c.setLineDash([]);}
    c.restore();
    if(o.locked&&options.showLocks!==false){c.save();c.translate(o.x-w/2-6,o.y+h/2+6);rect(c,-3,-1,6,5,'#50616a',null,1);c.strokeStyle='#50616a';c.lineWidth=1.5;c.beginPath();c.arc(0,-1,2,-Math.PI,0);c.stroke();c.restore();}
  }
}
