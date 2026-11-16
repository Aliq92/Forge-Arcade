(function(){
'use strict';const {MATERIALS}=ParticleLabMaterials;
class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.buffer=document.createElement('canvas');this.buffer.width=96;this.buffer.height=64;this.bc=this.buffer.getContext('2d');this.image=this.bc.createImageData(96,64);this.cursor=null;this.preview=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));}
 draw(world,zones=[]){const c=this.ctx,w=this.canvas.width,h=this.canvas.height,sx=w/world.width,sy=h/world.height,p=this.image.data;for(let i=0;i<world.cells.length;i++){const id=world.cells[i],col=MATERIALS[id].color,o=i*4;const grain=id===1||id===3||id===5?((i*13)%7)-3:0;const shimmer=!this.reduced&&(id===7||id===10)?((world.tick+i*3)%9)*2:0;p[o]=col[0]+grain;p[o+1]=col[1]+grain+shimmer;p[o+2]=col[2]+grain;p[o+3]=255;if(id===9){p[o]=83+col[0]*.35;p[o+1]=99+col[1]*.35;p[o+2]=112+col[2]*.35;}if(world.locked[i]&&id){p[o]*=.85;p[o+1]*=.85;p[o+2]*=.85;}}this.bc.putImageData(this.image,0,0);c.imageSmoothingEnabled=false;c.drawImage(this.buffer,0,0,w,h);
 c.save();c.lineWidth=Math.max(1,w/960);zones.forEach((z,k)=>{c.strokeStyle=['#9af6ce','#ffd28c','#bba9ff'][k%3];c.fillStyle=['#79e2d512','#ffbf7912','#ad9bff12'][k%3];c.fillRect(z.x*sx,z.y*sy,z.w*sx,z.h*sy);c.setLineDash([4,4]);c.strokeRect(z.x*sx,z.y*sy,z.w*sx,z.h*sy);c.setLineDash([]);c.font=`${Math.max(9,w/100)}px system-ui`;const label=z.label||'Goal';c.fillStyle='#07111cdd';const tw=c.measureText(label).width;c.fillRect(z.x*sx,z.y*sy,tw+8,Math.max(13,w/70));c.fillStyle='#deeff0';c.fillText(label,z.x*sx+4,z.y*sy+Math.max(10,w/95));});
 if(this.cursor){const {x,y,radius=1}=this.cursor;c.strokeStyle='#f3e0b6';c.lineWidth=Math.max(1,w/800);c.beginPath();c.ellipse((x+.5)*sx,(y+.5)*sy,Math.max(.5,radius+.5)*sx,Math.max(.5,radius+.5)*sy,0,0,Math.PI*2);c.stroke();}
 if(this.preview){const a=this.preview;c.strokeStyle='#fff1bb';c.setLineDash([3,3]);if(a.tool==='rect'){c.strokeRect(a.x*sx,a.y*sy,(a.x2-a.x+1)*sx,(a.y2-a.y+1)*sy);}else{c.beginPath();c.moveTo((a.x+.5)*sx,(a.y+.5)*sy);c.lineTo((a.x2+.5)*sx,(a.y2+.5)*sy);c.stroke();}}c.restore();}
}
window.ParticleLabRenderer=Renderer;
})();
