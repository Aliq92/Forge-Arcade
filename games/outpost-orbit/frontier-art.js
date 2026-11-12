import {navigation} from './frontier.js';
export function makeSky(w,h){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
 for(const [x,y,r,color]of[[.18,.12,.42,'#55749d20'],[.78,.3,.35,'#8b60901c'],[.45,.8,.5,'#4b9f9715']]){
  const radius=Math.max(w,h)*r,g=c.createRadialGradient(w*x,h*y,0,w*x,h*y,radius);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,w,h);
 }
 let seed=4219;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<210;i++){const x=rand()*w,y=rand()*h,r=.3+rand()*1.2;c.fillStyle=i%4?'#dbe7e77a':'#b8cbeeb3';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
 c.strokeStyle='#9baedc19';c.lineWidth=1;c.beginPath();c.ellipse(w*.8,h*.18,110,30,-.35,0,Math.PI*2);c.stroke();
 return canvas;
}
export function drawFrontier(r,s,t){
 const f=s.frontier;if(!f)return;const c=r.ctx,level=f.upgrades.station;
 // Docking is the original crew delivery hub, not an invented piloted ship.
 c.save();c.setLineDash([5,7]);c.strokeStyle='#badbd35c';c.lineWidth=1;c.beginPath();c.ellipse(0,12,74,39,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
 const hub=s.buildings.find(b=>b.type==='storage'&&b.progress>=1);
 if(hub){c.strokeStyle='#c5d7b55c';c.beginPath();c.ellipse(hub.x,hub.y+10,48,25,0,0,Math.PI*2);c.stroke();r.text('DELIVERY HUB',hub.x,hub.y+54,'#c5d7b5',7);}
 for(const side of [-1,1])for(let i=0;i<level;i++){
  const x=side*(66+i*37),y=-15-i*9;r.line([[side*35,-9],[x,y]],'#95afb6',3);
  c.fillStyle='#315d7a';c.strokeStyle='#92c8c9';c.lineWidth=1;c.fillRect(x-15,y-13,30,24);c.strokeRect(x-15,y-13,30,24);
  for(let col=1;col<4;col++)r.line([[x-15+col*7.5,y-13],[x-15+col*7.5,y+11]],'#9bc8da66',.7);
  r.line([[x-15,y-1],[x+15,y-1]],'#9bc8da66',.7);
 }
 if(level>=2){r.line([[20,-23],[28,-86]],'#c2d5ce',3);r.ellipse(28,-87,18,7,'#cbddd6');r.ellipse(28,-89,12,4,'#6b929b');r.glow(28,-87,28,'#bce9c924');r.text('FRONTIER RELAY',0,78,'#d2e1cc',8);}
 else if(level)r.text('DOCKING / SOLAR ARRAY',0,71,'#b6d7d0',7);
 if(f.flash){const p=f.flash,age=f.calm?2:Math.max(0,p.until-f.elapsed);c.strokeStyle=p.kind==='delivery'?'#d9c494a0':'#a5e8d4aa';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y,22+(3-age)*12,12+(3-age)*6,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<10;i++){const angle=i*Math.PI/5;r.ellipse(p.x+Math.cos(angle)*(20+(3-age)*8),p.y+Math.sin(angle)*(12+(3-age)*5),1.4,1.4,'#d8e8be99');}
 }
 const n=navigation(s);c.strokeStyle='#e5cb8f';c.lineWidth=1.5;c.beginPath();c.moveTo(n.x,n.y-62);c.lineTo(n.x+7,n.y-55);c.lineTo(n.x,n.y-48);c.lineTo(n.x-7,n.y-55);c.closePath();c.stroke();r.text('OBJECTIVE',n.x,n.y-72,'#e8d5a9',8);
 if(s.frontier.upgrades.scanner){c.setLineDash([3,8]);c.strokeStyle='#a0d3cc20';c.beginPath();c.arc(0,0,125+30*s.frontier.upgrades.scanner,0,Math.PI*2);c.stroke();c.setLineDash([]);}
 c.restore();
}
export function drawNavigation(r,s){
 if(!s.frontier)return;
 const n=navigation(s,r.camera),screen=r.screen(n.x,n.y),x=Math.max(24,Math.min(r.w-24,screen.x)),y=Math.max(r.h<520?150:235,Math.min(r.h-245,screen.y));
 if(screen.x<12||screen.x>r.w-12||screen.y<180||screen.y>r.h-180){
  const c=r.ctx,angle=Math.atan2(screen.y-y,screen.x-x);c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#e9ce94';c.beginPath();c.moveTo(8,0);c.lineTo(-5,-5);c.lineTo(-5,5);c.closePath();c.fill();c.restore();r.text(`${n.distance}u`,x,y+18,'#e9ce94',10);
 }
}
