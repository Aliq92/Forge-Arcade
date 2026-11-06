'use strict';
(() => {
  const W=WS, TAU=Math.PI*2;
  const round=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
  const fill=(c,col)=>{c.fillStyle=col;c.fill();};
  const ellipse=(c,x,y,rx,ry,col)=>{c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);fill(c,col);};
  class Renderer {
    constructor(canvas,scenery) {
      this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.scenery=scenery;
      this.buffers=[document.createElement('canvas'),document.createElement('canvas')];
      this.fog=document.createElement('canvas');this.fc=this.fog.getContext('2d');
      this.wipes=[];this.rainDrops=Array.from({length:90},(_,i)=>({x:W.hash(i*7),y:W.hash(i*7+2),size:.4+W.hash(i*7+3),speed:.7+W.hash(i*7+4)}));
      this.width=0;this.height=0;this.rainCount=90;this.resize();
    }
    resize() {
      const w=innerWidth,h=innerHeight;this.width=w;this.height=h;this.dpr=Math.min(2,devicePixelRatio||1);
      this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);
      this.portrait=w/h<.85;
      this.win={x:w*(this.portrait?.055:.085),y:h*(this.portrait?.185:.175),w:w*(this.portrait?.89:.83),h:h*(this.portrait?.535:.585)};
      this.worldWidth=this.win.w/this.win.h*600;
      // Landscape buffers use a fixed illustrated scale, capped on wide displays.
      for(const b of this.buffers){b.width=Math.min(2400,Math.ceil(this.worldWidth));b.height=600;}
      this.fog.width=Math.max(1,Math.ceil(this.win.w));this.fog.height=Math.max(1,Math.ceil(this.win.h));
      const cupSize=Math.min(this.portrait?w*.14:w*.058,h*.085);
      this.cup={x:w*(this.portrait?.67:.76),y:h*(this.portrait?.845:.84),s:cupSize};
      const hit=document.getElementById('coffee');
      if(hit)Object.assign(hit.style,{left:(this.cup.x-cupSize*.9)+'px',top:(this.cup.y-cupSize*1.3)+'px',width:cupSize*2+'px',height:cupSize*1.9+'px'});
    }
    hill(c,region,layer,position,p) {
      const rate=[.045,.12,.32,1][layer],off=position*rate,ww=this.worldWidth;
      c.beginPath();c.moveTo(-10,620);
      for(let x=-10;x<=ww+20;x+=10)c.lineTo(x,this.scenery.terrain(x+off,layer,region));
      c.lineTo(ww+20,620);c.closePath();fill(c,[p.far,p.hill,p.land,p.near][layer]);
    }
    tree(c,x,y,size,p,pine=false) {
      c.save();c.translate(x,y);c.scale(size,size);
      c.strokeStyle=p.shadow;c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(-1,-35);c.stroke();
      if(pine){c.beginPath();c.moveTo(0,-68);c.lineTo(-13,-39);c.lineTo(-8,-40);c.lineTo(-20,-17);c.lineTo(-6,-20);c.lineTo(-23,-3);c.quadraticCurveTo(0,4,22,-3);c.lineTo(8,-20);c.lineTo(17,-17);c.lineTo(6,-41);c.lineTo(12,-38);c.closePath();fill(c,p.tree);c.beginPath();c.moveTo(0,-63);c.lineTo(-10,-32);c.lineTo(-5,-33);c.lineTo(-14,-12);c.lineTo(0,-8);fill(c,p.treeLight);}
      else {
        c.beginPath();c.moveTo(0,-58);c.bezierCurveTo(15,-62,25,-50,21,-39);c.bezierCurveTo(33,-26,22,-13,9,-15);c.quadraticCurveTo(-1,-4,-10,-15);c.bezierCurveTo(-31,-13,-29,-33,-20,-39);c.bezierCurveTo(-25,-52,-11,-62,0,-58);fill(c,p.tree);
        ellipse(c,-9,-42,11,15,p.treeLight);ellipse(c,-3,-52,9,7,p.treeLight);
        c.strokeStyle=p.shadow;c.globalAlpha=.35;c.lineWidth=1;c.beginPath();c.moveTo(0,-5);c.lineTo(-2,-38);c.moveTo(-2,-23);c.lineTo(10,-36);c.stroke();
      }
      c.restore();
    }
    house(c,x,y,size,p,detail,region,light) {
      c.save();c.translate(x,y);c.scale(size,size);
      const tall=detail>.7,ww=tall?30:45,hh=tall?52:31;
      c.fillStyle=p.shadow;c.globalAlpha=.12;ellipse(c,4,2,ww*.8,5,p.shadow);c.globalAlpha=1;
      c.fillStyle=p.wall;c.fillRect(-ww/2,-hh,ww,hh);
      c.fillStyle=W.mix(p.wall,p.shadow,.2);c.fillRect(ww/2,-hh,9,hh);
      c.beginPath();c.moveTo(-ww/2-5,-hh);c.lineTo(0,-hh-19);c.lineTo(ww/2+7,-hh);c.closePath();fill(c,region==='coast'?W.mix(p.roof,p.shadow,.3):p.roof);
      c.strokeStyle=W.mix(p.roof,p.wall,.2);c.lineWidth=1;for(let i=1;i<4;i++){c.beginPath();c.moveTo(-ww/2+i*5,-hh-i*3);c.lineTo(ww/2-i*5,-hh-i*3);c.stroke();}
      c.fillStyle=p.roof;c.fillRect(ww*.16,-hh-20,5,13);
      c.fillStyle=p.shadow;c.fillRect(-4,-16,8,16);
      for(let i=0;i<2;i++) {const xx=-ww*.32+i*ww*.52;c.fillStyle=light>1.05?p.window:p.shadow;c.fillRect(xx,-hh+8,7,8);c.fillStyle=p.wall;c.fillRect(xx+3,-hh+8,1,8);}
      if(tall){c.fillStyle=light>1.05?p.window:p.shadow;c.fillRect(-10,-22,7,8);c.fillRect(6,-22,7,8);}
      c.strokeStyle=p.shadow;c.globalAlpha=.12;for(let i=5;i<hh;i+=7){c.beginPath();c.moveTo(-ww/2,-i);c.lineTo(ww/2,-i);c.stroke();}c.restore();
    }
    cloud(c,x,y,s,p) {
      c.save();c.globalAlpha=.52;c.translate(x,y);c.scale(s,s);c.beginPath();c.moveTo(-70,4);c.bezierCurveTo(-80,-6,-51,-15,-39,-10);c.bezierCurveTo(-44,-32,-1,-39,8,-17);c.bezierCurveTo(28,-35,59,-19,53,-6);c.bezierCurveTo(90,-8,91,8,61,9);c.lineTo(-55,11);c.closePath();fill(c,p.cloud);c.restore();
    }
    bridge(c,x,p) {
      c.save();c.translate(x,407);c.fillStyle=W.mix(p.wall,p.shadow,.32);c.fillRect(-160,0,320,14);
      for(let j=-3;j<=3;j++){const xx=j*42;c.beginPath();c.moveTo(xx-21,12);c.lineTo(xx-21,85);c.lineTo(xx-12,85);c.lineTo(xx-12,34);c.bezierCurveTo(xx-12,10,xx+12,10,xx+12,34);c.lineTo(xx+12,85);c.lineTo(xx+21,85);c.lineTo(xx+21,12);c.closePath();fill(c,W.mix(p.wall,p.shadow,.38));}
      c.strokeStyle=p.shadow;c.globalAlpha=.45;c.lineWidth=2;c.beginPath();c.moveTo(-163,0);c.lineTo(163,0);for(let i=-160;i<=160;i+=16){c.moveTo(i,0);c.lineTo(i,-10);}c.moveTo(-160,-10);c.lineTo(160,-10);c.stroke();c.restore();
    }
    landscape(canvas,region,p,s) {
      const c=canvas.getContext('2d');c.setTransform(canvas.width/this.worldWidth,0,0,1,0,0);const ww=this.worldWidth;
      let g=c.createLinearGradient(0,0,0,390);g.addColorStop(0,p.sky);g.addColorStop(1,p.horizon);c.fillStyle=g;c.fillRect(0,0,ww,600);
      // Astronomical details are fixed in the distance, never in foreground space.
      if(s.light>1.1){c.save();c.globalAlpha=(s.light-1.1)*.65;for(let i=0;i<40;i++){const x=W.hash(i*3)*ww,y=20+W.hash(i*3+1)*215;ellipse(c,x,y,.6+W.hash(i*3+2),.6+W.hash(i*3+2),p.sun);}c.restore();}
      ellipse(c,ww*.76,105,27,27,p.sun);
      if(s.light>1.3){c.save();c.globalAlpha=(s.light-1.3)/.7;ellipse(c,ww*.76+10,96,24,24,p.sky);c.restore();}
      const cloudOffset=s.position*.018;for(let i=Math.floor(cloudOffset/350)-1;i<=Math.ceil((cloudOffset+ww)/350)+1;i++){const x=i*350-cloudOffset;this.cloud(c,x,87+W.hash(i)*80,.7+W.hash(i+10)*.5,p);}
      this.hill(c,region,0,s.position,p);
      // Small distant islands, hamlets, and a steeple give the horizon scale.
      const far=this.scenery.visible(region,0,s.position,ww);
      for(const {seg,x} of far) for(const o of seg.objects) {
        const xx=x+o.x,yy=this.scenery.terrain(seg.index*400+o.x,0,region);
        if(region!=='highlands'&&o.type>.54)this.house(c,xx,yy+2,.26,p,o.detail,region,s.light);
      }
      this.hill(c,region,1,s.position,p);
      for(const {seg,x} of this.scenery.visible(region,1,s.position,ww))for(const o of seg.objects){
        const xx=x+o.x,yy=this.scenery.terrain(seg.index*400+o.x,1,region)+5;
        this.tree(c,xx,yy,o.size*.47,{...p,tree:p.hill2,treeLight:W.mix(p.hill,p.hill2,.55)},region==='highlands');
      }
      // Midground shelf: all buildings and trees are rooted on dry land.
      this.hill(c,region,2,s.position,p);
      for(const {seg,x} of this.scenery.visible(region,2,s.position,ww)) {
        for(const o of seg.objects){const xx=x+o.x,yy=this.scenery.terrain(seg.index*400+o.x,2,region)+2;
          if(seg.feature<.55&&o.type<.39)this.house(c,xx,yy,o.size*.67,p,o.detail,region,s.light);
          else if(seg.feature<.82||o.type>.6)this.tree(c,xx,yy,o.size*.67,p,region==='highlands');
        }
        if(region==='coast'&&seg.feature>.72) {
          const xx=x+210,y=379;c.fillStyle=p.wall;c.beginPath();c.moveTo(xx-8,y);c.lineTo(xx-5,y-79);c.lineTo(xx+5,y-79);c.lineTo(xx+9,y);fill(c,p.wall);c.fillStyle=p.roof;c.fillRect(xx-9,y-82,18,7);c.fillStyle=p.window;c.fillRect(xx-4,y-78,8,5);
        }
      }
      if(region!=='highlands') {
        const coast=region==='coast',top=coast?398:407;
        c.beginPath();c.moveTo(-10,top);for(let x=0;x<=ww+20;x+=15)c.lineTo(x,top+Math.sin((x+s.position*.32)/145)*4);c.lineTo(ww+20,600);c.lineTo(-10,600);c.closePath();fill(c,p.water);
        const waterG=c.createLinearGradient(0,top,0,550);waterG.addColorStop(0,p.water);waterG.addColorStop(1,W.mix(p.water,p.horizon,.3));c.fillStyle=waterG;c.fillRect(0,top+6,ww,180);
        if(coast)for(const {seg,x} of this.scenery.visible(region,1,s.position,ww))if(((seg.index%3)+3)%3===1){
          const xx=x+200,yy=440,span=65+seg.feature*80;
          c.beginPath();c.moveTo(xx-span,yy);c.bezierCurveTo(xx-span*.6,yy-7,xx-span*.4,yy-24,xx-span*.1,yy-19);c.bezierCurveTo(xx+span*.3,yy-30,xx+span*.5,yy-5,xx+span,yy);c.closePath();fill(c,W.mix(p.far,p.water,.15));
          c.strokeStyle=W.mix(p.sand,p.water,.5);c.lineWidth=2;c.beginPath();c.moveTo(xx-span,yy+1);c.quadraticCurveTo(xx,yy+5,xx+span,yy+1);c.stroke();
        }
        c.save();c.globalAlpha=.38;c.strokeStyle=p.ripple;c.lineWidth=1.2;
        const offset=s.position*.32;
        for(let tile=Math.floor(offset/400)-1;tile<=Math.ceil((offset+ww)/400)+1;tile++)for(let j=0;j<18;j++){const i=tile*18+j,xx=tile*400+W.hash(i*5)*400-offset,yy=419+W.hash(i*5+1)*128,len=8+W.hash(i*5+2)*65;c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx+len/2,yy+2,xx+len,yy);c.stroke();}
        c.restore();
        if(!coast)for(const {seg,x} of this.scenery.visible(region,2,s.position,ww)){if(((seg.index%5)+5)%5===1)this.bridge(c,x+200,p);}
        else {
          c.beginPath();c.moveTo(0,520);for(let x=0;x<=ww+20;x+=15)c.lineTo(x,499+Math.sin((x+s.position*.65)/210)*15);c.lineTo(ww,600);c.lineTo(0,600);fill(c,p.sand);
          c.strokeStyle=p.ripple;c.globalAlpha=.6;c.lineWidth=3;c.beginPath();for(let x=0;x<=ww+20;x+=10){const y=493+Math.sin((x+s.position*.65)/210)*15;if(x===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();c.globalAlpha=1;
        }
      }else {
        // Pasture contours and a winding path live behind the rail-side verge.
        c.strokeStyle=W.mix(p.land,p.horizon,.25);c.lineWidth=10;for(const {seg,x} of this.scenery.visible(region,2,s.position,ww)){if(seg.feature>.5){c.beginPath();c.moveTo(x+120,390);c.bezierCurveTo(x+350,416,x+120,470,x+300,550);c.stroke();}}
        c.strokeStyle=p.grass;c.lineWidth=1;c.globalAlpha=.45;for(let j=0;j<4;j++){c.beginPath();for(let x=0;x<=ww+20;x+=20){const y=425+j*27+Math.sin((x+s.position*.32)/170+j)*8;if(x===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}c.globalAlpha=1;
      }
      // Near embankment has its own fast parallax and never floats on water.
      this.hill(c,region,3,s.position,p);
      for(const {seg,x} of this.scenery.visible(region,3,s.position,ww))for(const o of seg.objects){
        const xx=x+o.x,yy=this.scenery.terrain(seg.index*400+o.x,3,region);
        if(o.type>.88){this.tree(c,xx,yy+15,o.size*.95,{...p,tree:p.near,treeLight:p.tree},region==='highlands');}
        else {c.strokeStyle=o.type<.3?p.grass:p.near;c.lineWidth=1.5;c.beginPath();for(let i=-2;i<=2;i++){c.moveTo(xx,yy+14);c.quadraticCurveTo(xx+i*5,yy-10,xx+i*8+o.lean*13,yy-20-o.size*12);}c.stroke();if(region==='riverlands'&&o.type<.4){c.strokeStyle=p.roof;c.lineWidth=3;c.beginPath();c.moveTo(xx,yy-30);c.lineTo(xx,yy-39);c.stroke();}}
      }
      // A restrained foreground fence establishes distance from the carriage.
      c.strokeStyle=W.mix(p.near,p.wall,.25);c.lineWidth=3;c.beginPath();const fo=s.position%110;for(let x=-110;x<ww+110;x+=110){c.moveTo(x-fo,600);c.lineTo(x-fo,557);}c.moveTo(-110,574);c.lineTo(ww+110,574);c.stroke();
      if(region==='highlands') {
        const phase=((s.position%10500)+10500)%10500;
        if(phase>6500&&phase<6790) {
          const shade=Math.sin((phase-6500)/290*Math.PI)*.72;c.fillStyle=`rgba(26,42,41,${shade})`;c.fillRect(0,0,ww,600);
          c.fillStyle=`rgba(228,183,103,${shade*.6})`;for(let i=0;i<5;i++){const xx=(i*400-s.position*2)%2000;c.fillRect(xx,170,9,26);}
        }
      }
      // Very fine, deterministic paper flecks, with no bitmap dependencies.
      c.save();c.globalAlpha=.055;c.fillStyle=p.shadow;for(let i=0;i<650;i++)c.fillRect(W.hash(i*2)*ww,W.hash(i*2+1)*600,.8,.8);c.restore();
      if(s.rain>.001){c.fillStyle=`rgba(115,138,144,${s.rain*.13})`;c.fillRect(0,0,ww,600);}
    }
    wipe(x,y){this.wipes.push({x:(x-this.win.x)/this.win.w,y:(y-this.win.y)/this.win.h,life:1});if(this.wipes.length>180)this.wipes.shift();}
    weather(c,s,dt) {
      const r=this.win;if(s.rain<.003){this.wipes.length=0;return;}
      const fog=this.fc,fw=this.fog.width,fh=this.fog.height;
      fog.clearRect(0,0,fw,fh);fog.globalCompositeOperation='source-over';
      const g=fog.createRadialGradient(fw*.5,fh*.45,fh*.1,fw*.5,fh*.5,Math.max(fw,fh)*.6);g.addColorStop(0,'rgba(225,236,223,.04)');g.addColorStop(1,'rgba(225,236,223,.5)');fog.fillStyle=g;fog.fillRect(0,0,fw,fh);
      fog.globalCompositeOperation='destination-out';
      for(const w of this.wipes){w.life-=dt/12;if(w.life<=0)continue;const rad=Math.min(fw,fh)*.1;const gg=fog.createRadialGradient(w.x*fw,w.y*fh,0,w.x*fw,w.y*fh,rad);gg.addColorStop(0,`rgba(0,0,0,${Math.min(1,w.life*3)})`);gg.addColorStop(1,'transparent');fog.fillStyle=gg;fog.beginPath();fog.arc(w.x*fw,w.y*fh,rad,0,TAU);fog.fill();}
      this.wipes=this.wipes.filter(w=>w.life>0);fog.globalCompositeOperation='source-over';
      const open=s.opening/100,glassTop=r.y+r.h*open*.7;
      c.save();c.beginPath();c.rect(r.x,glassTop,r.w,r.h*(1-open*.7));c.clip();c.globalAlpha=s.rain*(1-open*.85);c.drawImage(this.fog,r.x,r.y,r.w,r.h);c.globalAlpha=1;
      const time=W.reduced?0:s.clock;
      for(const d of this.rainDrops){const xx=r.x+d.x*r.w+Math.sin(d.y*20)*3,yy=r.y+((d.y+time*.028*d.speed)%1)*r.h;
        c.strokeStyle=`rgba(225,239,228,${.2*s.rain*(1-open*.6)})`;c.lineWidth=d.size;c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx-2,yy+8,xx-4,yy+12+d.size*8);c.stroke();ellipse(c,xx-4,yy+13+d.size*8,d.size*.9,d.size*1.7,`rgba(237,247,233,${s.rain*.4})`);
      }
      c.restore();
      // Exterior streaks remain exclusively in the window opening.
      c.save();c.globalAlpha=s.rain*.18;c.strokeStyle='#d4e3da';c.lineWidth=1;for(let i=0;i<35;i++){const x=r.x+((W.hash(i*4)+time*.09)%1)*r.w,y=r.y+((W.hash(i*4+1)+time*.43)%1)*r.h;c.beginPath();c.moveTo(x,y);c.lineTo(x-8,y+15);c.stroke();}c.restore();
    }
    interior(c,s) {
      const w=this.width,h=this.height,r=this.win,night=s.light/2;
      let g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,W.mix('#444e3e','#303930',night));g.addColorStop(.6,W.mix('#7e795a','#564e38',night));g.addColorStop(1,'#2e3f32');c.fillStyle=g;c.fillRect(0,0,w,h);
      // Quiet timber panels with a subtle grain and fine brass seams.
      c.strokeStyle='#d3b17b0a';c.lineWidth=1;for(let i=0;i<70;i++){const x=W.hash(i)*w;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+12,h*.3,x-8,h*.8,x+3,h);c.stroke();}
      c.strokeStyle='#c8ad6e20';c.lineWidth=1;c.beginPath();c.moveTo(w*.035,0);c.lineTo(w*.035,h);c.moveTo(w*.965,0);c.lineTo(w*.965,h);c.stroke();
      // Recessed frame: dark gasket, solid timber, then a narrow brass lip.
      c.save();c.shadowColor='#101b2099';c.shadowBlur=20;c.shadowOffsetY=8;round(c,r.x-24,r.y-24,r.w+48,r.h+48,48);fill(c,'#352e24');c.restore();
      let wood=c.createLinearGradient(0,r.y-24,0,r.y+r.h+30);wood.addColorStop(0,'#a18a60');wood.addColorStop(.5,'#8a704b');wood.addColorStop(1,'#b19767');round(c,r.x-20,r.y-20,r.w+40,r.h+40,44);fill(c,wood);
      round(c,r.x-9,r.y-9,r.w+18,r.h+18,34);fill(c,'#2b3933');c.strokeStyle='#dcc49899';c.lineWidth=1;c.stroke();
      // Ledge is drawn below the glass, keeping the outside visually separate.
      const ledgeY=r.y+r.h+13;
      c.save();c.shadowColor='#171f23aa';c.shadowBlur=15;c.shadowOffsetY=10;c.beginPath();c.moveTo(r.x-24,ledgeY);c.lineTo(r.x+r.w+24,ledgeY);c.lineTo(r.x+r.w+37,ledgeY+23);c.quadraticCurveTo(w*.5,ledgeY+38,r.x-37,ledgeY+23);c.closePath();let lg=c.createLinearGradient(0,ledgeY,0,ledgeY+28);lg.addColorStop(0,'#c0a177');lg.addColorStop(.4,'#9d7d52');lg.addColorStop(1,'#6b5338');fill(c,lg);c.restore();
      c.strokeStyle='#f6d7a52b';c.lineWidth=1;for(let j=0;j<4;j++){c.beginPath();c.moveTo(r.x-22,ledgeY+4+j*3);c.quadraticCurveTo(w*.6,ledgeY+9+j*3,r.x+r.w+23,ledgeY+4+j*3);c.stroke();}
      // Upholstered seat edges recompose for a narrow carriage.
      const sw=w*(this.portrait?.27:.18),sy=h*(this.portrait?.77:.73);
      c.save();c.shadowColor='#101a1499';c.shadowBlur=24;c.shadowOffsetX=8;round(c,-sw*.33,sy,sw,h-sy+60,34);let sg=c.createLinearGradient(0,0,sw,0);sg.addColorStop(0,'#1e352d');sg.addColorStop(.6,'#425540');sg.addColorStop(1,'#233e31');fill(c,sg);c.restore();
      round(c,-sw*.3,sy+9,sw*.91,h-sy+40,26);c.strokeStyle='#8a98704d';c.lineWidth=2;c.stroke();
      c.strokeStyle='#87937326';c.lineWidth=1;for(let j=0;j<6;j++){const xx=sw*(.02+j*.1);c.beginPath();c.moveTo(xx,sy+20);c.quadraticCurveTo(xx+6,sy+70,xx+2,h);c.stroke();}
      if(!this.portrait){c.save();c.translate(w,0);c.scale(-1,1);round(c,-sw*.6,sy+25,sw,h-sy+60,30);fill(c,'#293f32');round(c,-sw*.6,sy+35,sw*.95,h-sy+50,26);c.strokeStyle='#8a98704d';c.stroke();c.restore();}
      // Small fixed brass carriage plaque below the sill.
      if(!this.portrait){round(c,w*.43,ledgeY+41,w*.14,22,3);fill(c,'#243a30');c.strokeStyle='#b89c6555';c.lineWidth=1;c.stroke();c.fillStyle='#cab98d';c.textAlign='center';c.font='8px Arial';c.fillText('OBSERVATION CARRIAGE',w*.5,ledgeY+55);}
    }
    tableAndCup(c,s) {
      const w=this.width,h=this.height,{x,y,s:sz}=this.cup;
      c.save();c.shadowColor='#151c18aa';c.shadowBlur=20;c.shadowOffsetY=12;
      c.beginPath();c.moveTo(x-sz*2.7,y+sz*.38);c.bezierCurveTo(x-sz*2.1,y-sz*.18,x+sz*3.2,y-sz*.1,w+20,y+sz*.6);c.lineTo(w+20,h+20);c.lineTo(x-sz*3.2,h+20);c.closePath();let g=c.createLinearGradient(0,y,0,h);g.addColorStop(0,'#b09268');g.addColorStop(.1,'#96764e');g.addColorStop(1,'#5e4934');fill(c,g);c.restore();
      c.strokeStyle='#e3c89b1a';c.lineWidth=1;for(let i=0;i<12;i++){c.beginPath();c.moveTo(x-sz*2.5,y+sz*.6+i*7);c.bezierCurveTo(x,y+sz*.5+i*8,w*.9,y+sz*.7+i*5,w+20,y+sz*.65+i*7);c.stroke();}
      // A folded linen napkin and a teaspoon, quiet companions to the cup.
      c.save();c.translate(x-sz*1.8,y+sz*.75);c.rotate(-.12);c.fillStyle='#bfb79c';c.beginPath();c.moveTo(-sz*.6,-sz*.3);c.lineTo(sz*.7,-sz*.27);c.lineTo(sz*.8,sz*.4);c.lineTo(-sz*.65,sz*.35);fill(c,'#c4b99c');c.strokeStyle='#9e957c';c.lineWidth=1;c.beginPath();c.moveTo(-sz*.5,sz*.22);c.lineTo(sz*.7,sz*.26);c.stroke();c.restore();
      c.save();c.translate(x+sz*1.3,y+sz*.6);c.rotate(-.5);c.strokeStyle='#c3b58d';c.lineWidth=sz*.06;c.lineCap='round';c.beginPath();c.moveTo(0,sz*.36);c.lineTo(0,-sz*.25);c.stroke();ellipse(c,0,-sz*.34,sz*.09,sz*.16,'#cabc95');c.restore();
      ellipse(c,x,y+sz*.55,sz*1.2,sz*.32,'#4c422f40');ellipse(c,x,y+sz*.38,sz*1.09,sz*.29,'#ded5b9');ellipse(c,x,y+sz*.35,sz*.82,sz*.19,'#bdb69e');ellipse(c,x,y+sz*.35,sz*.72,sz*.16,'#e9e0c5');
      const lift=s.coffee>0?Math.sin((1-s.coffee/1.8)*Math.PI)*sz*.65:0;
      c.save();c.translate(x,y-lift);c.rotate(lift/sz*-.08);
      c.strokeStyle='#dbd4bc';c.lineWidth=sz*.13;c.beginPath();c.ellipse(sz*.66,-sz*.1,sz*.3,sz*.28,-.15,0,TAU);c.stroke();
      c.beginPath();c.moveTo(-sz*.64,-sz*.42);c.bezierCurveTo(-sz*.63,sz*.35,-sz*.44,sz*.45,0,sz*.46);c.bezierCurveTo(sz*.48,sz*.45,sz*.6,sz*.3,sz*.64,-sz*.42);c.closePath();let cupg=c.createLinearGradient(-sz*.65,0,sz*.65,0);cupg.addColorStop(0,'#b8c2b1');cupg.addColorStop(.35,'#f0ebd4');cupg.addColorStop(1,'#cfceba');fill(c,cupg);
      ellipse(c,0,-sz*.42,sz*.65,sz*.2,'#f3edd8');ellipse(c,0,-sz*.42,sz*.55,sz*.145,'#5b4430');ellipse(c,-sz*.1,-sz*.43,sz*.36,sz*.09,'#7c5839');
      c.strokeStyle='#d5c9a5';c.lineWidth=sz*.015;c.beginPath();c.ellipse(0,-sz*.42,sz*.6,sz*.175,0,0,TAU);c.stroke();
      c.strokeStyle='#7b8b6f';c.lineWidth=1;c.beginPath();c.moveTo(-sz*.13,sz*.08);c.quadraticCurveTo(sz*.03,-sz*.02,sz*.16,sz*.07);c.moveTo(0,sz*.13);c.lineTo(0,-sz*.03);c.stroke();
      if(!W.reduced){for(let j=0;j<3;j++){const phase=(s.clock*.24+j/3)%1,yy=-sz*.6-phase*sz*1.3;c.strokeStyle=`rgba(241,237,213,${(1-phase)*.26})`;c.lineWidth=sz*.035;c.beginPath();c.moveTo((j-1)*sz*.18,yy);c.bezierCurveTo(sz*.15,yy-sz*.3,-sz*.2,yy-sz*.4,Math.sin(s.clock+j)*sz*.13,yy-sz*.65);c.stroke();}}
      c.restore();
      // Warm lamp pools change with outside light and remain subtle by day.
      let glow=c.createRadialGradient(x,y,0,x,y,sz*5);glow.addColorStop(0,`rgba(255,201,116,${.03+s.light*.035})`);glow.addColorStop(1,'rgba(255,201,116,0)');c.fillStyle=glow;c.fillRect(x-sz*5,y-sz*5,sz*10,sz*10);
    }
    render(s,dt=0) {
      const c=this.c,r=this.win,w=this.width,h=this.height;c.setTransform(this.dpr,0,0,this.dpr,0,0);
      const p=W.palette(s.light);this.scenery.frame++;
      this.interior(c,s);
      c.save();round(c,r.x,r.y,r.w,r.h,27);c.clip();
      this.landscape(this.buffers[0],s.blend<1?s.fromRegion:s.region,p,s);c.drawImage(this.buffers[0],r.x,r.y,r.w,r.h);
      if(s.blend<1){this.landscape(this.buffers[1],s.region,p,s);c.globalAlpha=s.blend*s.blend*(3-2*s.blend);c.drawImage(this.buffers[1],r.x,r.y,r.w,r.h);c.globalAlpha=1;}
      this.weather(c,s,dt);
      // Only the remaining pane catches reflections when the sash slides down.
      const opening=s.opening/100;
      c.save();c.beginPath();c.rect(r.x,r.y+r.h*opening*.7,r.w,r.h*(1-opening*.7));c.clip();
      let reflection=c.createLinearGradient(r.x,0,r.x+r.w,0);reflection.addColorStop(0,'#fff1ce0d');reflection.addColorStop(.4,'#fff1ce00');reflection.addColorStop(1,`rgba(255,226,175,${.025+s.light*.016})`);c.fillStyle=reflection;c.fillRect(r.x,r.y,r.w,r.h);
      c.fillStyle='#fff4d60b';c.beginPath();c.moveTo(r.x+r.w*.76,r.y);c.lineTo(r.x+r.w*.83,r.y);c.lineTo(r.x+r.w*.48,r.y+r.h);c.lineTo(r.x+r.w*.44,r.y+r.h);fill(c,'#fff4d60b');c.restore();
      if(opening>.005){const yy=r.y+r.h*opening*.7;c.fillStyle='#354c40';c.fillRect(r.x,yy-3,r.w,6);c.fillStyle='#c4b180';c.fillRect(r.x,yy-3,r.w,1);c.fillStyle='#182e2b33';c.fillRect(r.x,yy+3,r.w,7);}
      // Inner vignette gives the frame depth without obscuring the journey.
      c.lineWidth=13;c.strokeStyle='#233f372b';round(c,r.x+3,r.y+3,r.w-6,r.h-6,25);c.stroke();c.restore();
      // Two tiny brass latches on the wood frame.
      for(const xx of [r.x-15,r.x+r.w+15]){round(c,xx-3,r.y+r.h*.5-15,6,30,3);fill(c,'#bfa36e');c.strokeStyle='#f8d79a66';c.lineWidth=1;c.stroke();}
      this.tableAndCup(c,s);
      const vg=c.createRadialGradient(w*.5,h*.45,w*.25,w*.5,h*.5,Math.max(w,h)*.7);vg.addColorStop(0,'#00000000');vg.addColorStop(1,'#0d201c45');c.fillStyle=vg;c.fillRect(0,0,w,h);
      this.scenery.trim();
    }
  }
  W.Renderer=Renderer;
})();
