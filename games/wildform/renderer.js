(function () {
  'use strict';
  const W=Wildform, UNIT=24;
  const COLORS=[[118,154,102],[111,155,136],[133,131,154],[167,157,130],[116,163,154]];
  const hash=(x,y,s=0)=>{const v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  function ellipse(ctx,x,y,rx,ry,color,angle=0) {ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),angle,0,Math.PI*2);ctx.fill();}
  function line(ctx,points,color,width=1) {ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
  function poly(ctx,points,color) {ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}
  window.WildformRenderer=class {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:32,y:20,zoom:1};
      this.terrain=document.createElement('canvas');this.terrain.width=W.COLS*UNIT;this.terrain.height=W.ROWS*UNIT;
      this.low=document.createElement('canvas');this.low.width=W.COLS;this.low.height=W.ROWS;
      this.dirty=true;this.lastTerrain=-100;this.lastTerrainReal=-10000;this.overlay='normal';this.hover=null;this.brush=1.8;this.tool='inspect';this.selected=null;
      this.follow=null;this.cinematic=false;this.cinemaClock=0;this.perf={fps:60,drawMs:0};this.resize();this.camera.zoom=this.defaultZoom();
    }
    resize() {
      const rect=this.canvas.getBoundingClientRect();this.width=rect.width;this.height=rect.height;
      this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(rect.width*this.dpr);this.canvas.height=Math.round(rect.height*this.dpr);
      this.fit=Math.min((this.width-50)/W.COLS,(this.height-170)/W.ROWS);
      this.fit=Math.max(5,this.fit);this.dirty=true;
    }
    get scale() {return this.fit*this.camera.zoom;}
    get origin() {return {x:this.width/2-this.camera.x*this.scale,y:this.height/2+12-this.camera.y*this.scale};}
    screen(x,y) {const o=this.origin;return {x:o.x+x*this.scale,y:o.y+y*this.scale};}
    world(x,y) {const o=this.origin;return {x:(x-o.x)/this.scale,y:(y-o.y)/this.scale};}
    zoom(factor,x=this.width/2,y=this.height/2) {
      const before=this.world(x,y);this.camera.zoom=W.clamp(this.camera.zoom*factor,.7,3.5);
      const after=this.world(x,y);this.camera.x+=before.x-after.x;this.camera.y+=before.y-after.y;this.boundCamera();
    }
    boundCamera() {this.camera.x=W.clamp(this.camera.x,-5,W.COLS+5);this.camera.y=W.clamp(this.camera.y,-4,W.ROWS+4);}
    defaultZoom() {return this.height<500?1.75:this.width<600?2:1;}
    reset() {this.camera={x:32,y:20,zoom:this.defaultZoom()};this.follow=null;}
    buildTerrain(w) {
      const low=this.low.getContext('2d'),image=low.createImageData(w.cols,w.rows);
      for(let i=0;i<w.cells.length;i++) {
        const c=w.cells[i],x=i%w.cols,y=Math.floor(i/w.cols),n=hash(x,y);
        let color=mix(COLORS[c.biome],[193,191,143],W.clamp((1-c.vegetation)*.18+(c.elevation-.4)*.3));
        color=mix(color,[96,144,96],c.plants[0]*.2);
        if(c.water>.012)color=mix(color,[83,153,160],W.clamp(c.water*4));
        for(let j=0;j<3;j++)image.data[i*4+j]=W.clamp(Math.round(color[j]+(n-.5)*9),0,255);image.data[i*4+3]=255;
      }
      low.putImageData(image,0,0);
      const ctx=this.terrain.getContext('2d');ctx.clearRect(0,0,this.terrain.width,this.terrain.height);ctx.imageSmoothingEnabled=true;
      ctx.drawImage(this.low,0,0,this.terrain.width,this.terrain.height);
      for(let y=0;y<w.rows;y++)for(let x=0;x<w.cols;x++) {
        const c=w.cells[y*w.cols+x],n=hash(x,y),px=(x+.2+n*.6)*UNIT,py=(y+.2+hash(y,x)*.6)*UNIT;
        if(c.water>.045) {
          if(n>.7)line(ctx,[[px-5,py],[px+4,py]],'rgba(219,245,226,.24)',1.1);
          if(c.water<.17&&c.plants[1]>.07&&n>.6)for(let j=0;j<3;j++)line(ctx,[[px+j*3,py+3],[px+j*3-2,py-7-j*2]],'#567f69',1.6);
          if(c.water>.23)continue;
        }
        for(let j=0;j<3;j++) {
          const gx=px+(hash(x,y,j+1)-.5)*20,gy=py+(hash(y,x,j+3)-.5)*20;
          if(c.plants[0]>.08+hash(x,y,j+8)*.22) {
            line(ctx,[[gx-2,gy+3],[gx-3,gy-1],[gx,gy+1],[gx+1,gy-4]],c.biome===3?'#939b6c':'rgba(62,106,65,.5)',1.2);
            line(ctx,[[gx,gy+2],[gx+3,gy-1]],'rgba(212,221,157,.5)',1);
          }
        }
        if(c.elevation>.7||(c.biome===3&&n>.6)) {
          ellipse(ctx,px+3,py+5,10,4,'rgba(44,62,51,.17)');
          poly(ctx,[[px-8,py+3],[px-5,py-6],[px+2,py-10],[px+9,py-3],[px+7,py+4]],'#9da491');
          poly(ctx,[[px-5,py-6],[px+2,py-10],[px+9,py-3],[px+1,py]],'#c3c6af');
          line(ctx,[[px-5,py-6],[px+1,py],[px+7,py+4]],'rgba(79,95,84,.35)',1);
        }
        if(c.plants[1]>.1&&n>.5) {
          ellipse(ctx,px+2,py+4,7,3,'rgba(31,73,45,.15)');
          for(let j=0;j<3;j++)ellipse(ctx,px+(j-1)*4,py-j%2*4,5,4,c.biome===4?'#a4c5b0':'#7a9c68');
          if(n>.73)for(let j=0;j<3;j++)ellipse(ctx,px-4+j*4,py-3,1.6,1.6,c.biome===4?'#f0d9b0':'#ead5a0');
        }
        if(c.plants[4]>.08&&n>.4)for(let j=0;j<2;j++) {
          const mx=px+j*7,my=py+j*3;line(ctx,[[mx,my+4],[mx,my-1]],'#ddcfb7',2);
          ellipse(ctx,mx,my-1,4.5,2.7,c.biome===2?'#b79bb4':'#abbca2');ellipse(ctx,mx-1,my-2,1,.7,'#e1d7c4');
        }
        if(c.biome===4&&n>.82) {
          ellipse(ctx,px+4,py+5,10,4,'rgba(41,89,83,.18)');
          poly(ctx,[[px-5,py],[px-4,py-15],[px,py-21],[px+5,py-13],[px+4,py+3]],'#bce4d6');
          poly(ctx,[[px,py-21],[px+5,py-13],[px+4,py+3],[px,py]],'#83b9bd');
          poly(ctx,[[px+3,py+4],[px+7,py-10],[px+10,py-13],[px+14,py-8],[px+12,py+4]],'#afd8cf');
          line(ctx,[[px-4,py-15],[px,py-21],[px+5,py-13]],'rgba(255,255,238,.75)',1);
        }
        if(c.plants[2]>.08&&n>.58) {
          const height=14+c.plants[2]*40;ellipse(ctx,px+5,py+8,12,5,'rgba(27,65,47,.2)');line(ctx,[[px,py+4],[px,py-height*.6]],'#746e51',3);
          if(c.biome===2)for(let j=0;j<3;j++)ellipse(ctx,px+(j-1)*6,py-height+Math.abs(j-1)*5,10,8,['#888f8e','#9cafa1','#a7b4a6'][j]);
          else if(c.biome===3) {
            poly(ctx,[[px,py-height],[px-10,py-3],[px+10,py-3]],'#668776');poly(ctx,[[px,py-height],[px,py-3],[px+10,py-3]],'#7e9c7f');
          } else {
            const palette=c.biome===4?['#649f96','#79b4a0','#a0c6a5']:['#59815a','#70935f','#94aa75'];
            ellipse(ctx,px-6,py-height+6,10,9,palette[0]);ellipse(ctx,px+5,py-height+5,11,10,palette[1]);ellipse(ctx,px,py-height-1,10,9,palette[2]);ellipse(ctx,px-3,py-height-4,4,2,'rgba(224,235,175,.22)');
          }
        }
      }
      this.dirty=false;this.lastTerrain=w.time;this.lastTerrainReal=performance.now();
    }
    drawCreature(ctx,a,w,clock,highlight=false) {
      const s=W.SPECIES[a.species],size=s.size*1.65,juvenile=W.clamp(.55+a.age/s.maturity*.45,.55,1),moving=Math.hypot(a.vx,a.vy)>.05;
      const phase=clock*9+a.id*2,bob=moving?(a.species==='hopper'?Math.abs(Math.sin(phase))*size*.25:Math.sin(phase)*size*.05):0;
      const c=W.cellAt(w,a.x,a.y),swimming=c.water>.12&&!s.flying;
      ctx.save();ctx.translate(a.x,a.y);ctx.scale(juvenile,juvenile);
      if(highlight){ctx.strokeStyle='#fff2ba';ctx.lineWidth=.07;ctx.beginPath();ctx.arc(0,0,size*1.7,0,Math.PI*2);ctx.stroke();}
      ellipse(ctx,.07,.15,size*.85,size*.35,'rgba(23,47,36,.23)');
      if(swimming){ctx.strokeStyle='rgba(221,250,237,.65)';ctx.lineWidth=.035;ctx.beginPath();ctx.ellipse(0,.08,size*1.3,size*.65,0,0,Math.PI*2);ctx.stroke();}
      ctx.rotate(a.angle);ctx.translate(0,-bob);
      const resting=a.behavior==='REST',feeding=a.behavior==='FORAGE'&&!moving,color=a.traits.marking===2?'#dfd3f5':s.color;
      if(s.role==='predator') {
        const lean=a.behavior==='HUNT'?.15:0;
        for(let j=0;j<4;j++){const side=j%2?1:-1,front=j<2?1:-1,swing=moving?Math.sin(phase+j%2*Math.PI)*.08:0;line(ctx,[[front*size*.45,side*size*.3],[front*size*.45+swing,side*size*.7]],'#716f61',size*.18);}
        line(ctx,[[-size*.7,0],[-size*1.1,.12],[-size*1.35,.04]],color,size*.2);
        ellipse(ctx,0,0,size*.86,size*.45,color);ellipse(ctx,size*.72+lean,0,size*.4,size*.33,color);
        poly(ctx,[[size*.5,-size*.2],[size*.42,-size*.62],[size*.78,-size*.3]],color);poly(ctx,[[size*.5,size*.2],[size*.42,size*.6],[size*.78,size*.3]],color);
        ellipse(ctx,size*.94,-size*.12,.04,.04,'#314a41');ellipse(ctx,size*.94,size*.12,.04,.04,'#314a41');
        if(a.species==='ridgeclaw')for(let j=0;j<3;j++)line(ctx,[[-size*.5+j*size*.3,-size*.28],[-size*.62+j*size*.3,size*.2]],'#777d73',.06);
      } else if(a.species==='glowmoth'||a.species==='crystalfinch') {
        const flap=resting?.3:.55+Math.sin(phase*1.7)*.23;
        ellipse(ctx,-size*.05,-size*.5,size*.65,size*flap,color,-.3);ellipse(ctx,-size*.05,size*.5,size*.65,size*flap,color,.3);
        ellipse(ctx,size*.18,0,size*.56,size*.23,a.species==='glowmoth'?'#ab9c79':'#658d85');poly(ctx,[[size*.7,-.06],[size*.97,0],[size*.7,.06]],'#e7c392');
        if(a.species==='glowmoth'){ellipse(ctx,-size*.1,-size*.5,.06,.06,'#eeeed1');ellipse(ctx,-size*.1,size*.5,.06,.06,'#eeeed1');}
        if(a.species==='crystalfinch')poly(ctx,[[-size*.4,-size*.2],[-size*1.1,0],[-size*.4,size*.2]],'#bedace');
      } else if(a.species==='spritebeetle'||a.species==='sporekeeper') {
        for(let j=0;j<6;j++){const side=j%2?1:-1,x=(Math.floor(j/2)-1)*size*.5,walk=moving?Math.sin(phase+j)*.05:0;line(ctx,[[x,side*size*.3],[x+walk,side*size*.7]],'#696956',.04);}
        ellipse(ctx,0,0,size*.75,size*.5,color);line(ctx,[[-size*.6,0],[size*.5,0]],'#76745d',.035);ellipse(ctx,size*.65,0,size*.3,size*.28,'#8c9473');
        line(ctx,[[size*.7,-.08],[size*1.05,-size*.5]],color,.035);line(ctx,[[size*.7,.08],[size*1.05,size*.5]],color,.035);
        if(a.species==='sporekeeper'){ellipse(ctx,-size*.15,0,size*.55,size*.5,'#bd9eb9');ellipse(ctx,-size*.2,-size*.1,.04,.035,'#e9d6cd');}
      } else {
        if(!resting)for(let j=0;j<4;j++){const side=j%2?1:-1,front=j<2?1:-1,walk=moving?Math.sin(phase+j%2*Math.PI)*.07:0;ellipse(ctx,front*size*.4+walk,side*size*.45,size*.2,size*.12,a.species==='reedskipper'?'#6a9a8d':'#8e8866');}
        ellipse(ctx,0,0,size*.75,size*.45,color);ellipse(ctx,size*.6+(feeding?Math.sin(phase)*.03:0),0,size*.34,size*.3,color);
        if(a.species==='hopper'){ellipse(ctx,size*.43,-size*.29,size*.4,size*.12,color,-.4);ellipse(ctx,size*.43,size*.29,size*.4,size*.12,color,.4);ellipse(ctx,-size*.72,0,size*.2,size*.22,'#eee2c6');}
        else if(a.species==='mossback'){ellipse(ctx,-size*.05,0,size*.55,size*.42,'#718859');for(let j=0;j<3;j++)ellipse(ctx,-size*.35+j*size*.3,-size*.08,size*.13,size*.2,'#9eac71');}
        else if(a.species==='luminant'){line(ctx,[[size*.65,-size*.17],[size*.77,-size*.67],[size*1.03,-size*.82]],'#e1d9bc',.05);line(ctx,[[size*.65,size*.17],[size*.77,size*.67],[size*1.03,size*.82]],'#e1d9bc',.05);ellipse(ctx,-size*.05,-size*.2,.055,.055,'#e8e5c9');}
        ellipse(ctx,size*.8,-size*.13,.035,.035,'#344c3e');ellipse(ctx,size*.8,size*.13,.035,.035,'#344c3e');
      }
      if(a.traits.marking===2){ellipse(ctx,0,0,size*.15,size*.15,'#f8f2cd');ctx.strokeStyle='rgba(235,234,199,.6)';ctx.lineWidth=.035;ctx.beginPath();ctx.arc(0,0,size*1.2,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
      if(resting&&this.camera.zoom>1.4){ctx.fillStyle='rgba(241,238,211,.9)';ctx.font='.3px sans-serif';ctx.fillText('z',a.x+.3,a.y-.4);}
    }
    draw(w,clock,dt) {
      const start=performance.now(),ctx=this.ctx;
      // Environmental detail changes slowly; cache redraws use wall time so 8×
      // does not multiply rendering work. Brushes refresh within 80 ms.
      if((this.dirty&&start-this.lastTerrainReal>80)||(w.time!==this.lastTerrain&&start-this.lastTerrainReal>1000))this.buildTerrain(w);
      if(this.cinematic){this.cinemaClock+=dt;if(!this.follow||this.cinemaClock>22||!w.organisms.some(a=>a.id===this.follow)){
        const interesting=w.organisms.filter(a=>['HUNT','FLEE','MIGRATE','FORAGE'].includes(a.behavior)),list=interesting.length?interesting:w.organisms;
        const a=list[Math.floor(clock/22)%Math.max(1,list.length)];this.follow=a?a.id:null;this.cinemaClock=0;}}
      if(this.follow){const a=w.organisms.find(a=>a.id===this.follow);if(a){const blend=1-Math.exp(-dt*.8);this.camera.x+=(a.x-this.camera.x)*blend;this.camera.y+=(a.y-this.camera.y)*blend;if(this.cinematic)this.camera.zoom+=(1.9-this.camera.zoom)*blend;}else this.follow=null;}
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.fillStyle='#ced8c3';ctx.fillRect(0,0,this.width,this.height);
      const o=this.origin,scale=this.scale;ctx.save();ctx.translate(o.x,o.y);ctx.scale(scale,scale);
      ctx.fillStyle='rgba(34,59,48,.14)';ctx.fillRect(.2,.3,w.cols,w.rows);ctx.fillStyle='#859d79';ctx.fillRect(0,0,w.cols,w.rows);
      ctx.drawImage(this.terrain,0,0,w.cols,w.rows);
      const night=(1-Math.sin(w.time/W.DAY*Math.PI*2-Math.PI/2))/2;
      for(let i=0;i<80;i++){
        const x=hash(i,7)*w.cols,y=hash(i,8)*w.rows,c=W.cellAt(w,x,y);
        if(c.water>.08){const phase=(clock*.3+hash(i,9))%1;ctx.strokeStyle=`rgba(218,242,219,${(1-phase)*.23})`;ctx.lineWidth=.025;ctx.beginPath();ctx.ellipse(x,y,.15+phase*.6,.06+phase*.22,0,0,Math.PI*2);ctx.stroke();}
        else if(c.biome===2||c.biome===4){const drift=Math.sin(clock*.25+i)*.2;ellipse(ctx,x+drift,y-(clock*.035+i*.1)%1,.035,.035,`rgba(225,242,184,${.15+night*.4})`);}
        else if(c.plants[0]>.2)line(ctx,[[x,y],[x+Math.sin(clock*1.5+i)*.08,y-.2]],'rgba(229,237,178,.28)',.04);
      }
      if(this.overlay==='normal'){
        const labels=[[18,6,'MEADOW BASIN'],[30,35,'WETLAND HOLLOW'],[9,26,'FUNGAL GROVE'],[53,30,'STONE RIDGE'],[51,7,'CRYSTAL CANOPY']];ctx.textAlign='center';ctx.font='600 .48px Georgia';
        labels.forEach(([x,y,t])=>{ctx.fillStyle='rgba(231,239,209,.57)';ctx.fillRect(x-t.length*.16,y-.55,t.length*.32,.85);ctx.fillStyle='rgba(37,62,52,.8)';ctx.fillText(t,x,y);});ctx.textAlign='left';
      }
      if(this.overlay!=='normal')this.drawOverlay(ctx,w);
      const living=[...w.organisms].sort((a,b)=>a.y-b.y);living.forEach(a=>this.drawCreature(ctx,a,w,clock,a.id===this.selected));
      ctx.fillStyle=`rgba(20,39,63,${night*.25})`;ctx.fillRect(0,0,w.cols,w.rows);
      if(night>.5)for(const a of living)if(a.species==='glowmoth'||a.species==='luminant'||a.traits.marking===2){const g=ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,.7);g.addColorStop(0,`rgba(236,242,173,${night*.32})`);g.addColorStop(1,'rgba(236,242,173,0)');ctx.fillStyle=g;ctx.fillRect(a.x-.7,a.y-.7,1.4,1.4);}
      if(this.hover&&this.tool!=='inspect'&&this.tool!=='pan'){const {x,y}=this.hover;ctx.strokeStyle='#f8edb5';ctx.lineWidth=.055;ctx.setLineDash([.12,.12]);ctx.beginPath();ctx.arc(x,y,this.tool==='species'?.8:this.brush,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      ctx.restore();
      const vignette=ctx.createRadialGradient(this.width/2,this.height/2,this.height*.22,this.width/2,this.height/2,Math.max(this.width,this.height)*.7);vignette.addColorStop(0,'rgba(47,64,39,0)');vignette.addColorStop(1,'rgba(37,56,35,.17)');ctx.fillStyle=vignette;ctx.fillRect(0,0,this.width,this.height);
      this.perf.drawMs=performance.now()-start;this.perf.fps=this.perf.fps*.95+Math.min(120,1/Math.max(dt,.001))*.05;
    }
    drawOverlay(ctx,w) {
      const bins=new Map();if(['population','biodiversity'].includes(this.overlay))for(const a of w.organisms){const key=Math.floor(a.x/4)+','+Math.floor(a.y/4);let b=bins.get(key);if(!b){b={n:0,s:new Set()};bins.set(key,b);}b.n++;b.s.add(a.species);}
      if(this.overlay==='territory'){for(const a of w.organisms)if(W.SPECIES[a.species].territorial){ctx.fillStyle='rgba(242,199,125,.22)';ctx.strokeStyle='#ebd3a6';ctx.lineWidth=.05;ctx.beginPath();ctx.arc(a.home.x,a.home.y,4,0,Math.PI*2);ctx.fill();ctx.stroke();}return;}
      for(let i=0;i<w.cells.length;i++){
        const c=w.cells[i],x=i%w.cols,y=Math.floor(i/w.cols);let value=0;
        if(this.overlay==='moisture')value=c.moisture;else if(this.overlay==='temperature')value=W.clamp((c.temperature+5)/45);else{const b=bins.get(Math.floor(x/4)+','+Math.floor(y/4));value=b?(this.overlay==='population'?b.n/12:b.s.size/7):0;}
        ctx.fillStyle=this.overlay==='temperature'?`hsla(${210-value*210},65%,60%,.58)`:`hsla(${55+W.clamp(value)*155},55%,57%,.53)`;ctx.fillRect(x,y,1.02,1.02);
      }
    }
  };
})();
