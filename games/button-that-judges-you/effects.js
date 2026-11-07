(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChamberEffects=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const COLORS=['#e8b978','#c6a1ea','#e48998','#87caba','#e9d8a8','#8eadce'];
 class Confetti{
  constructor(width,height){this.width=width;this.height=height;this.reduced=false;this.active=[];this.free=Array.from({length:320},()=>({}));this.seed=19807;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  burst(count,origin){const limit=this.reduced?36:320,amount=this.reduced?Math.min(18,count):count;for(let i=0;i<amount&&this.active.length<limit;i++){const p=this.free.pop();if(!p)break;const shower=i%3!==0;Object.assign(p,{x:this.reduced||shower?this.random()*this.width:origin.x,y:this.reduced?this.random()*this.height:shower?-this.random()*70:origin.y,vx:this.reduced?0:(this.random()-.5)*(shower?90:430),vy:this.reduced?0:shower?40+this.random()*70:-130-this.random()*180,angle:this.random()*Math.PI*2,spin:this.reduced?0:(this.random()-.5)*4,size:3+this.random()*4,shape:i%3,color:COLORS[i%COLORS.length],life:this.reduced?1.4:3.5+this.random()*.8,maxLife:this.reduced?1.4:4.3});this.active.push(p);}}
  advance(dt){if(!Number.isFinite(dt)||dt<=0)return;let write=0;for(const p of this.active){p.life-=dt;if(p.life<=0||p.y>this.height+80){this.free.push(p);continue;}if(!this.reduced){p.x+=p.vx*dt;p.y+=p.vy*dt+55*dt*dt;p.vy+=110*dt;p.angle+=p.spin*dt;}this.active[write++]=p;}this.active.length=write;}
  resize(width,height){const sx=width/this.width,sy=height/this.height;for(const p of this.active){p.x*=sx;p.y*=sy;}this.width=width;this.height=height;}
  clear(){while(this.active.length)this.free.push(this.active.pop());}
  draw(ctx){for(const p of this.active){ctx.save();ctx.globalAlpha=Math.min(.95,p.life/(this.reduced?1.4:.8));ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle=p.color;if(p.shape===0)ctx.fillRect(-p.size/2,-p.size,p.size,p.size*1.6);else if(p.shape===1){ctx.beginPath();ctx.arc(0,0,p.size*.5,0,Math.PI*2);ctx.fill();}else{ctx.beginPath();ctx.moveTo(0,-p.size);ctx.lineTo(p.size*.55,0);ctx.lineTo(0,p.size);ctx.lineTo(-p.size*.55,0);ctx.closePath();ctx.fill();}ctx.restore();}}
 }
 return {Confetti};
});
