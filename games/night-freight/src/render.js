/* Procedural harbour renderer; no image, font or network assets. */
(() => {
'use strict';
class Renderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.portrait=false;this.camera=0;this.resize();}
 resize(){const rect=this.canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);this.portrait=matchMedia('(max-width:760px)').matches;}
 draw(s){
 const c=this.ctx,canvas=this.canvas;const view=this.portrait?760:1200;const scale=canvas.width/view;
 this.camera=this.portrait?Math.max(0,Math.min(440,s.trolley.x-380)):0;
 c.setTransform(scale,0,0,canvas.height/760,-this.camera*scale,0);c.clearRect(this.camera,0,view,760);
 const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
 const line=(x,y,x2,y2,col,width=1)=>{c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=width;c.stroke();};
 const poly=(pts,col,stroke)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=col;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}};
 const text=(t,x,y,size,col,align='left',font='monospace')=>{c.font=`${size}px ${font}`;c.fillStyle=col;c.textAlign=align;c.fillText(t,x,y);};
 const glow=(x,y,r,col)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);};
 // Night sky and the distant city: low contrast keeps the handling plane legible.
 const sky=c.createLinearGradient(0,0,0,670);sky.addColorStop(0,'#101e28');sky.addColorStop(.6,'#23363c');sky.addColorStop(1,'#3a4947');rect(0,0,1200,760,sky);
 c.globalAlpha=.55;for(let i=0;i<45;i++){const x=(i*193+53)%1200,y=(i*73+25)%320;rect(x,y,i%3?1:2,1,'#a1b4ae');}c.globalAlpha=1;
 glow(1010,85,75,'#d9d6b016');c.beginPath();c.arc(1010,85,22,0,Math.PI*2);c.fillStyle='#c3c9b0';c.fill();c.beginPath();c.arc(1002,79,22,0,Math.PI*2);c.fillStyle='#172832';c.fill();
 for(let i=0;i<15;i++){let x=i*91-20,h=55+(i*47)%100;rect(x,492-h,82,h,'#192c32');rect(x+3,488-h,75,5,'#20343a');for(let j=0;j<4;j++)if((i+j)%3)rect(x+12+j*17,510-h,5,8,'#6e6e5355');}
 for(const [x,y]of[[460,347],[760,312],[1100,375]]){line(x,y,x,507,'#30474b',7);line(x-110,y+5,x+120,y+5,'#30474b',5);line(x,y-50,x-110,y,'#30474b',2);line(x,y-50,x+120,y,'#30474b',2);line(x+85,y+5,x+85,y+88,'#30474b',1);}
 rect(0,517,1200,153,'#25393d');line(0,523,1200,523,'#43605e');
 for(let i=0;i<42;i++){const x=(i*137)%1200,y=535+(i*29)%110;line(x,y,x+16+(i%5)*12,y,'#57777130');}
 // Warm quay lights and their restrained teal / gold water reflections.
 for(const x of [20,470,1185]){line(x,465,x,624,'#34484b',5);line(x,465,x+23,465,'#68726a',3);glow(x+24,469,90,'#ffc47c19');rect(x+15,465,19,5,'#ffcf8c');for(let j=0;j<8;j++){let yy=636+j*12;line(x+24-6-j*2,yy,x+24+6+j*2,yy,'#b99d6230',2);}}
 // Quay front and pilings.
 poly([[0,570],[449,570],[470,586],[0,586]],'#788076');rect(0,585,459,94,'#343d3a');rect(0,586,459,9,'#aaa68a');
 for(let i=0;i<9;i++){rect(i*54,604,52,1,'#69706155');rect(i*54+26,626,52,1,'#69706155');}for(const x of [32,180,345,440]){rect(x,590,14,109,'#1b292b');rect(x+2,591,3,105,'#4a5147');}
 for(let x=12;x<440;x+=28){poly([[x,571],[x+13,571],[x+22,584],[x+9,584]],'#b9a76a');}rect(0,568,450,3,'#e7d5a1');text('NORTH QUAY / STEEL EXPORT',60,622,10,'#a9aa8b');text('05',397,650,26,'#758778');
 // Main gantry. Weathered paint, bracing, fasteners, catwalk.
 rect(40,117,29,452,'#9b5637');rect(43,121,6,447,'#d39356');rect(65,125,5,443,'#543f34');poly([[69,434],[69,459],[181,568],[203,568]],'#92573a');line(78,450,186,559,'#d49358',3);
 rect(37,556,40,14,'#d18b4d');rect(28,568,60,8,'#394340');
 rect(1158,117,19,523,'#774a35');rect(1158,120,4,518,'#bd824c');poly([[1158,490],[1158,516],[1110,640],[1093,640]],'#80523a');
 rect(34,93,1149,42,'#6e4834');rect(34,94,1149,5,'#d89c5c');rect(34,128,1149,7,'#b87444');
 for(let x=42;x<1160;x+=62){line(x,100,x+30,126,'#bd8050',3);line(x+30,126,x+62,100,'#bd8050',3);rect(x+30,110,3,3,'#554a3b');}
 line(33,84,1181,84,'#7d8776',2);for(let x=34;x<1184;x+=36)line(x,84,x,94,'#7d8776',2);
 rect(34,137,1149,4,'#29353a');text('NF — 08',84,164,14,'#c2a67b');text('SWL  12 T',1070,164,10,'#a58d68');
 // Barge and deck, drawn in the same transform as its collision surface.
 const depart=s.departing?Math.pow(Math.min(1,s.departTime/2.6),2)*1300:0;
 c.save();c.translate(s.deck.position.x+depart,s.deck.position.y);c.rotate(s.deck.angle);
 poly([[-305,7],[305,7],[286,61],[251,77],[-262,77],[-293,56]],'#182e32','#65877d');poly([[-305,7],[305,7],[297,25],[-300,25]],'#60746c');rect(-305,-11,610,13,'#b6bc9e');rect(-305,-11,610,3,'#e0d4a3');line(-297,29,292,29,'#a99562',3);line(-280,56,280,56,'#3c5d58',2);
 for(const x of [-282,-186,186,282]){c.beginPath();c.ellipse(x,28,10,18,0,0,Math.PI*2);c.fillStyle='#0d2024';c.fill();c.strokeStyle='#3e514b';c.lineWidth=3;c.stroke();}
 text('NIGHTJAR',-222,52,16,'#b6c6b1');text('NQ · 014',178,48,10,'#98ada1');
 for(let i=0;i<5;i++){const x=-247+i*122;line(x-34,-9,x+34,-9,'#d69e60',2);text(String(i+1).padStart(2,'0'),x,-20,9,'#85a6a0','center');}
 for(const x of [-294,294]){rect(x-4,-20,8,11,'#72877a');rect(x-8,-22,16,4,'#b4b89c');}c.restore();
 // Cargo is solid geometry; cream outlines distinguish all contact edges.
 for(const item of s.cargo){if(item.lost)continue;const b=item.body;c.save();c.translate(b.position.x+(s.departing?depart:0),b.position.y);c.rotate(b.angle);c.translate(-item.shift,0);const w=item.w,h=item.h;
 c.shadowColor='#07151c66';c.shadowBlur=8;c.shadowOffsetY=4;rect(-w/2,-h/2,w,h,item.shift?'#74644c':(item.id%2?'#737b67':'#65766a'));c.shadowBlur=0;c.shadowOffsetY=0;
 c.strokeStyle='#ded4ad';c.lineWidth=1.8;c.strokeRect(-w/2+1,-h/2+1,w-2,h-2);rect(-w/2+5,-h/2+5,w-10,3,'#b7baa0');rect(-w/2+5,h/2-8,w-10,3,'#405047');
 line(-w/2+10,-h/2+10,-w/2+10,h/2-10,'#384c44',3);line(w/2-10,-h/2+10,w/2-10,h/2-10,'#384c44',3);
 text(String(item.id).padStart(2,'0'),0,5,Math.min(17,w/4),'#eee5c5','center');
 if(item.shift){const x=item.shift>0?w/2-17:-w/2+12;for(let y=-h/2+13;y<h/2-8;y+=9)line(x,y,x+5,y+4,'#e9ba75',2);}
 // Lift eye aligns with the physical attachment point.
 rect(-7,-h/2-3,14,4,'#b4bfa8');c.restore();}
 // Cable and trolley move independently: the load has real pendulum lag.
 const m=s.magnet.position,t=s.trolley;
 line(t.x+1,143,m.x+1,m.y-8,'#07171d',4);line(t.x,143,m.x,m.y-8,'#b4b6a3',1.6);
 c.save();c.translate(t.x,124);rect(-30,-13,60,26,'#cd8750');rect(-32,-12,64,5,'#eeb274');for(const x of [-20,20]){c.beginPath();c.arc(x,10,6,0,7);c.fillStyle='#17282e';c.fill();rect(x-2,7,4,4,'#9b9d85');}rect(-11,0,22,26,'#445252');rect(-7,3,14,16,'#b1b59a');c.restore();
 const candidate=s.candidate();if(!s.attached){c.beginPath();c.arc(m.x,m.y+8,44,0,Math.PI*2);c.setLineDash([3,6]);c.strokeStyle=candidate?'#bce1bcaa':'#8ab2aa55';c.lineWidth=1;c.stroke();c.setLineDash([]);if(candidate){const p=s.top(candidate);c.beginPath();c.arc(p.x,p.y,5,0,7);c.fillStyle='#d7e7bc';c.fill();}}
 c.save();c.translate(m.x,m.y);if(s.on)glow(0,10,36,'#9fe4cf30');rect(-19,-8,38,16,'#334a4b');rect(-21,3,42,7,s.on?'#b5dec3':'#b6aa84');rect(-12,-6,24,7,'#cc8c54');for(let x=-16;x<18;x+=9)rect(x,4,4,5,'#415854');c.restore();
 // Foreground water masks sinking cargo, with bounded procedural ripples.
 const water=c.createLinearGradient(0,671,0,760);water.addColorStop(0,'#163237dd');water.addColorStop(1,'#101f29');rect(0,678,1200,82,water);
 for(let i=0;i<56;i++){const x=(i*103+Math.sin(s.time*.3+i)*10)%1200,y=683+(i*17)%75;line(x,y,x+10+(i%6)*9,y,i%4?'#537c7525':'#91b5a13b',1);}
 for(const p of s.particles){c.globalAlpha=Math.min(1,p.life*2);rect(p.x,p.y,3,3,p.color);}c.globalAlpha=1;
 text('DOCK / 01',90,725,10,'#819a96');text('NIGHTJAR / LOADING DECK',837+depart,725,10,'#819a96','center');
 // Tiny portrait overview is a navigation aid, not a second simulation.
 if(this.portrait){c.save();c.setTransform(canvas.width/760,0,0,canvas.height/760,0,0);rect(245,718,270,27,'#10232be6');rect(255,734,99,3,'#b5a780');rect(379,734,124,3,'#8db8aa');for(const item of s.cargo)if(!item.lost)rect(255+item.body.position.x/1200*248,728,4,5,'#d3c29b');rect(255+t.x/1200*248,721,5,5,'#f6af69');c.strokeStyle='#7d9f9466';c.lineWidth=1;c.strokeRect(255+this.camera/1200*248,720,760/1200*248,20);c.restore();}
 }
}
window.NightFreight.Renderer=Renderer;
})();
