(function(){
 'use strict';
 const WALL_COLORS=[[12,11,17],[24,70,65],[42,42,85],[73,32,52],[56,68,38],[30,55,81],[82,56,32],[61,36,81],[68,44,64]];
 class JudgmentRoom{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.cache=document.createElement('canvas');this.fog=document.createElement('canvas');this.fog.width=600;this.fog.height=160;const c=this.fog.getContext('2d'),g=c.createRadialGradient(300,80,5,300,80,300);g.addColorStop(0,'#bcb0d00d');g.addColorStop(1,'#bcb0d000');c.scale(1,.27);c.fillStyle=g;c.fillRect(0,0,600,600);}
  resize(width,height){this.width=width;this.height=height;this.dpr=Math.min(1.5,devicePixelRatio||1);this.landscape=height<500&&width>height;this.heroX=width*(this.landscape?.72:.5);for(const c of [this.canvas,this.cache]){c.width=Math.round(width*this.dpr);c.height=Math.round(height*this.dpr);}this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.beam=this.ctx.createLinearGradient(0,height*.1,0,height*.8);this.beam.addColorStop(0,'#e9c8a322');this.beam.addColorStop(.4,'#d4b3980d');this.beam.addColorStop(1,'#d4b39800');this.paintCache();}
  paintCache(){const c=this.cache.getContext('2d'),w=this.width,h=this.height,x=this.heroX;c.setTransform(this.dpr,0,0,this.dpr,0,0);const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#17131f');g.addColorStop(.48,'#26202e');g.addColorStop(1,'#0f111a');c.fillStyle=g;c.fillRect(0,0,w,h);
   c.fillStyle='#0c0b1180';c.beginPath();c.moveTo(0,0);c.lineTo(w*.12,h*.1);c.lineTo(w*.12,h*.65);c.lineTo(0,h*.82);c.fill();c.beginPath();c.moveTo(w,0);c.lineTo(w*.88,h*.1);c.lineTo(w*.88,h*.65);c.lineTo(w,h*.82);c.fill();
   c.strokeStyle='#a798b011';c.lineWidth=1;for(let i=0;i<18;i++){const px=(i*137.31)%w;c.beginPath();c.moveTo(px,h*.12);c.lineTo(px+(i%2?3:-5),h*.66);c.stroke();}for(let i=0;i<110;i++){c.fillStyle=i%2?'#e1cdb307':'#03020825';c.fillRect((i*171.73)%w,(i*93.27)%(h*.7),3+(i%4)*7,1+(i%3));}
   const floor=c.createLinearGradient(0,h*.66,0,h);floor.addColorStop(0,'#18161f');floor.addColorStop(1,'#0c0e16');c.fillStyle=floor;c.beginPath();c.moveTo(w*.12,h*.65);c.lineTo(w*.88,h*.65);c.lineTo(w,h*.82);c.lineTo(w,h);c.lineTo(0,h);c.lineTo(0,h*.82);c.closePath();c.fill();c.strokeStyle='#76667d1b';c.lineWidth=1;
   for(let i=-5;i<=7;i++){c.beginPath();c.moveTo(w*.5+i*17,h*.65);c.lineTo(w*.5+i*w*.23,h);c.stroke();}for(const f of [.70,.77,.87,.99]){c.beginPath();c.moveTo(0,h*f);c.lineTo(w,h*f);c.stroke();}
   const warm=c.createRadialGradient(x,h*.31,0,x,h*.31,h*.67);warm.addColorStop(0,'#d2ad6d12');warm.addColorStop(.65,'#6c536609');warm.addColorStop(1,'#00000000');c.fillStyle=warm;c.fillRect(0,0,w,h);
   // Ceiling cable and a deliberately mundane, slightly crooked fixture.
   c.strokeStyle='#06070c';c.lineWidth=3;c.beginPath();c.moveTo(x,0);c.lineTo(x,h*.09);c.stroke();c.fillStyle='#090b11';c.fillRect(x-48,h*.09,96,12);c.fillStyle='#cfb99666';c.fillRect(x-35,h*.09+10,70,3);
   for(const sign of [-1,1]){const px=w*(sign<0?.18:.82),py=h*.37;c.strokeStyle='#a68a5a33';c.lineWidth=1;c.strokeRect(px-26,py-35,52,70);c.beginPath();c.arc(px,py,10,0,Math.PI*2);c.moveTo(px-15,py+20);c.lineTo(px+15,py+20);c.stroke();c.fillStyle='#b8a9bd30';c.font='8px ui-monospace,monospace';c.textAlign='center';c.fillText(sign<0?'E / 07':'NO REFUNDS',px,py+48);}
   const vignette=c.createRadialGradient(w*.5,h*.45,h*.1,w*.5,h*.45,Math.max(w,h)*.7);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#05060caa');c.fillStyle=vignette;c.fillRect(0,0,w,h);
  }
  drawSideWalls(game){
   const target=WALL_COLORS[game.count===0?0:1+(game.count-1)%(WALL_COLORS.length-1)];
   if(this.wallCount!==game.count){this.wallFrom=[...(this.wallColor||target)];this.wallTo=target;this.wallChangedAt=game.time;this.wallCount=game.count;}
   const progress=game.effects?Math.max(0,Math.min(1,(game.time-this.wallChangedAt)/.32)):1,eased=progress*progress*(3-2*progress);
   this.wallColor=this.wallTo.map((value,i)=>Math.round(this.wallFrom[i]+(value-this.wallFrom[i])*eased));
   const c=this.ctx,w=this.width,h=this.height;c.save();c.globalAlpha=.84;c.fillStyle=`rgb(${this.wallColor.join(',')})`;
   c.beginPath();c.moveTo(0,0);c.lineTo(w*.12,h*.1);c.lineTo(w*.12,h*.65);c.lineTo(0,h*.82);c.closePath();c.fill();
   c.beginPath();c.moveTo(w,0);c.lineTo(w*.88,h*.1);c.lineTo(w*.88,h*.65);c.lineTo(w,h*.82);c.closePath();c.fill();c.restore();
  }
  draw(game,confetti){const c=this.ctx,w=this.width,h=this.height,reduced=!game.effects,t=reduced?0:game.time,id=game.event?.id||'',pulse=game.pressPulse;c.drawImage(this.cache,0,0,w,h);this.drawSideWalls(game);
   c.globalAlpha=.72+(Math.sin(t*.7)+1)*.04;c.fillStyle=this.beam;c.beginPath();c.moveTo(this.heroX-32,h*.105);c.lineTo(this.heroX-w*.24,h*.8);c.lineTo(this.heroX+w*.24,h*.8);c.lineTo(this.heroX+32,h*.105);c.closePath();c.fill();c.globalAlpha=1;
   for(let i=0;i<3;i++){c.globalAlpha=.45;c.drawImage(this.fog,w*(i*.35-.1)+(reduced?0:Math.sin(t*.14+i)*28),h*(.55+i*.08),w*.65,h*.2);}c.globalAlpha=1;
   c.fillStyle='#02030a55';c.beginPath();c.ellipse(this.heroX+(reduced?0:Math.sin(t*.3)*8),h*.79,w*.13,h*.025,0,0,Math.PI*2);c.fill();
   const celebration=['golden','celebration','confetti','rare'].includes(id);if(celebration||id==='disco'){c.fillStyle=id==='disco'?`hsla(${(t*22)%360},50%,45%,.075)`:'#e5ae5710';c.fillRect(0,0,w,h);}if(id==='lights'||id==='closing'){const progress=game.event.remaining/game.event.duration;c.fillStyle=`rgba(2,3,10,${Math.sin(progress*Math.PI)*.45})`;c.fillRect(0,0,w,h);}
   if(pulse>0){c.strokeStyle=`rgba(207,117,103,${pulse*.22})`;c.lineWidth=1;c.beginPath();c.ellipse(this.heroX,h*.77,reduced?100:80+(1-pulse)*80,reduced?20:15+(1-pulse)*12,0,0,Math.PI*2);c.stroke();}
   // Small wall reactions, never a flashing full-screen overlay.
   c.strokeStyle='#b6a08040';c.lineWidth=1.5;const sx=w*.18,sy=h*.37,shift=reduced?0:Math.sin(t*.7)*2;c.beginPath();c.moveTo(sx-6+shift,sy-4);c.lineTo(sx+6+shift,sy+4);c.moveTo(sx-6+shift,sy+4);c.lineTo(sx+6+shift,sy-4);c.stroke();
   let note=game.count===20?'MAINTENANCE REQUESTS A PAUSE':game.count===21?'MAINTENANCE HAS RESIGNED':game.count===75?'PLEASE IGNORE THE OTHER WALL':'';
   const notices={why:'WHY. A REASONABLE QUESTION.',counter:'ONE METRIC. NO APPARENT PURPOSE.',audit:'PRESS RECEIVED · PURPOSE: NONE FOUND',supervisor:'SUPERVISOR JOINED THE SESSION',threat:'THREAT LEVEL: TUESDAY',intercom:'THE GIFT SHOP DOES NOT SELL THIS BUTTON.',incident:'HUMAN RESOURCES INCIDENT OPENED',recalibrate:'ESCALATION COMPLETE. NOTHING CHANGED.',closing:'GALLERY CLOSED. HOURS RESUME SHORTLY.',break:'I NEED A MINUTE. A VERY SMALL MINUTE.'};if(notices[id])note=notices[id];
   if(game.event?.note)note=game.event.note.toUpperCase();
   if(note){c.fillStyle='#c5ad8288';c.font=`${w<600?8:10}px ui-monospace,monospace`;c.textAlign='center';c.fillText(note,w*.5,h*.16,Math.max(100,w-32));}
   confetti.draw(c);
  }
 }
 window.JudgmentRoom=JudgmentRoom;
})();
