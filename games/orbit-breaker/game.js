(function(root,factory){const v=typeof module==='object'&&module.exports?factory(require('./physics.js'),require('./chambers.js')):factory(root.OrbitPhysics,root.OrbitChambers);if(typeof module==='object'&&module.exports)module.exports=v;else root.OrbitGame=v;})(globalThis,function(P,CHAMBERS){
  'use strict';
  const colors={normal:'#f5c878',energy:'#67e8e2',chain:'#ad8bf5',ring:'#ff8984',bumper:'#7890ac'};
  class Game {
    constructor(mode='arcade',chamber=0) {
      this.mode=mode;this.chamber=chamber;this.score=0;this.combo=0;this.bestCombo=0;this.comboTime=0;this.shields=3;this.time=0;this.phase='playing';this.paused=false;this.attractor=null;this.strength=1;this.particles=[];this.pulses=[];this.labels=[];this.events=[];this.particleCap=150;this.reduced=false;this.wave=1;this.waveTimer=0;this.endingTime=0;this.seed=9347+chamber;this.nextMilestone=1000;
      this.balls=[P.ball()];this.targets=[];this.obstacles=[];this.wells=[];
      if(mode==='chambers') {
        const c=CHAMBERS[chamber];this.balls=[P.ball(...c.start)];this.targets=c.targets.map((t,i)=>({...t,id:i,baseX:t.x,baseY:t.y,dead:false}));this.obstacles=c.obstacles.map(o=>({...o,baseX:o.x,baseY:o.y}));this.wells=c.wells.map(w=>({...w}));
      } else {this.spawnWave();if(mode==='chaos'){this.addBall();this.addBall();this.obstacles=[{x:430,y:500,baseX:430,baseY:500,r:32,type:'bumper',motion:65},{x:630,y:550,baseX:630,baseY:550,r:28,type:'bumper',motion:-45}];this.wells=[{x:500,y:440,strength:.17}];}}
    }
    random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
    addBall(){if(this.balls.length<5){const a=this.balls.length*2.2;this.balls.push(P.ball(500+Math.cos(a)*100,500+Math.sin(a)*100,Math.cos(a+1.5)*220,Math.sin(a+1.5)*220));}}
    removeBall(){if(this.balls.length>1)this.balls.pop();}
    hazardAngle(){return -.5+Math.floor(this.time/18)*.8;}
    hazardous(angle){if(this.mode!=='arcade'||this.time<18)return false;const d=Math.atan2(Math.sin(angle-this.hazardAngle()),Math.cos(angle-this.hazardAngle()));return Math.abs(d)<.31+Math.min(.16,(this.wave-1)*.025);}
    spawnWave(){
      this.targets=[];const count=Math.min(12,8+Math.floor(this.wave/2));
      for(let i=0;i<count;i++) {const a=i/count*Math.PI*2-.4+this.wave*.21,dist=i%2?285:335;const type=['normal','chain','chain','normal','energy','normal','ring','normal','energy','chain','normal','ring'][i];this.targets.push({id:i,x:500+Math.cos(a)*dist,y:500+Math.sin(a)*dist,r:type==='ring'?30:20,type,dead:false});}
      if(this.mode==='arcade') {this.obstacles=[];this.wells=[];if(this.wave>=2)this.obstacles.push({x:500,y:450,baseX:500,baseY:450,r:35,type:'bumper',motion:this.wave>=3?55:0});if(this.wave>=4)this.wells.push({x:380,y:530,strength:.18});}
      this.waveTimer=0;
    }
    burst(x,y,count=16,celebrate=false,color='#67e8e2') {
      count=this.reduced?Math.min(5,count):count;
      const palette=['#67e8e2','#ff8984','#f5c878','#ad8bf5','#a1f4ca','#ecf5ff'];
      for(let i=0;i<count&&this.particles.length<this.particleCap;i++) {const a=this.random()*Math.PI*2,s=celebrate?90+this.random()*210:35+this.random()*130;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(celebrate?75:0),rotation:this.random()*6.28,spin:(this.random()-.5)*10,life:celebrate?2.2+this.random()*1.6:.35+this.random()*.45,maxLife:4,size:celebrate?3+this.random()*5:1+this.random()*2,color:celebrate?palette[i%6]:color,confetti:celebrate,shape:i%11===0?'star':i%3===0?'streamer':'paper',flutter:this.random()*6.28});}
    }
    pulse(x,y,color,r=15){if(this.pulses.length<35)this.pulses.push({x,y,r,life:.65,color});}
    hit(t,b,indirect=false) {
      if(t.type==='wall') {
        this.burst(b.x,b.y,5,false,'#5d9cb3');this.events.push({type:'bounce'});
        if(this.hazardous(t.angle)&&b.invulnerable<=0){this.shields--;b.invulnerable=2;this.burst(b.x,b.y,24,false,'#ff8984');this.events.push({type:'damage'});if(this.shields<=0){this.phase='ending';this.attractor=null;}}
        return;
      }
      if(t.type==='bumper'){this.pulse(t.x,t.y,'#8ca4c7',t.r);this.events.push({type:'bounce'});return;}
      if(t.dead)return;
      t.dead=true;this.combo=this.comboTime>0?this.combo+1:1;this.comboTime=3;this.bestCombo=Math.max(this.combo,this.bestCombo);
      const multiplier=Math.min(this.combo,10),points=(t.type==='ring'?150:t.type==='normal'?50:75)*multiplier;
      this.score+=points;this.labels.push({x:t.x,y:t.y-30,text:'+'+points,life:1.2,color:colors[t.type]});if(this.labels.length>14)this.labels.shift();
      this.burst(t.x,t.y,12,false,colors[t.type]);this.pulse(t.x,t.y,colors[t.type],t.r);this.events.push({type:'hit',combo:this.combo,special:t.type!=='normal'});
      if(t.type==='energy'||t.type==='chain'||this.combo%5===0) {this.burst(t.x,t.y,this.mode==='chaos'?55:34,true);this.events.push({type:'celebrate'});}
      if(!indirect && (t.type==='energy'||t.type==='chain')) {
        const near=this.targets.filter(n=>!n.dead&&(t.type==='chain'?n.type==='chain':Math.hypot(n.x-t.x,n.y-t.y)<205)).sort((a,c)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(c.x-t.x,c.y-t.y)).slice(0,t.type==='chain'?2:3);
        for(const n of near){this.pulses.push({x:t.x,y:t.y,tx:n.x,ty:n.y,life:.45,color:colors[t.type],r:0});this.hit(n,b,true);}
      }
      if(this.score>=this.nextMilestone){this.nextMilestone+=1000;this.burst(t.x,t.y,45,true);this.events.push({type:'milestone'});}
      if(this.mode==='chambers'&&this.targets.every(n=>n.dead)){this.phase='ending';this.endingTime=0;this.attractor=null;this.burst(t.x,t.y,80,true);this.pulse(500,500,'#67e8e2',250);this.events.push({type:'complete'});}
    }
    update(dt) {
      if(this.paused||this.phase==='finished')return;
      const ending=this.phase==='ending';if(ending){this.endingTime+=dt;if(this.endingTime>.85){this.phase='finished';this.events.push({type:'finished'});}}
      const simdt=ending?dt*.23:dt;this.time+=simdt;this.comboTime=Math.max(0,this.comboTime-simdt);if(!this.comboTime)this.combo=0;
      const a=this.attractor?{...this.attractor}:null;
      for(const o of [...this.obstacles,...this.targets])if(o.motion&&!o.dead){const oldX=o.x,oldY=o.y;const phase=o.id||0;o.x=o.baseX+(Math.sin(this.time*.6+phase)-Math.sin(phase))*o.motion;o.y=o.baseY+(Math.cos(this.time*.6+phase)-Math.cos(phase))*Math.abs(o.motion)*.65;o.vx=(o.x-oldX)/simdt;o.vy=(o.y-oldY)/simdt;}
      if(!ending)for(const b of this.balls) {
        P.stepBall(b,simdt,[...this.obstacles,...this.targets],this.wells,a,(t,ball)=>this.hit(t,ball),this.strength);
        for(const t of this.targets)if(!t.dead&&t.type==='ring'&&Math.hypot(b.x-t.x,b.y-t.y)<t.r-b.r*.3)this.hit(t,b);
        b.trail.push({x:b.x,y:b.y});if(b.trail.length>42)b.trail.shift();
        // Accumulated orbital sweep rewards a real curved pass around the active attractor.
        if(a){const angle=Math.atan2(b.y-a.y,b.x-a.x);if(b.lastAngle!==undefined)b.orbit+=Math.abs(Math.atan2(Math.sin(angle-b.lastAngle),Math.cos(angle-b.lastAngle)));b.lastAngle=angle;}
        else {if(b.orbit>Math.PI*1.5){this.score+=100;this.labels.push({x:b.x,y:b.y-20,text:'SLINGSHOT +100',life:1.3,color:'#67e8e2'});this.burst(b.x,b.y,25,true);this.events.push({type:'trick'});}b.lastAngle=undefined;b.orbit=0;}
      }
      if(this.mode!=='chambers'&&!ending){if(this.targets.every(t=>t.dead))this.waveTimer+=simdt;if(this.waveTimer>1){this.wave++;this.spawnWave();this.events.push({type:'wave'});}if(this.time>this.wave*24){this.wave++;this.spawnWave();this.events.push({type:'wave'});}}
      for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}const f=p.confetti?P.force(p.x,p.y,a,.48):{x:0,y:0};p.vx+=(f.x+Math.sin(this.time*3+p.flutter)*18)*dt;p.vy+=(f.y+(p.confetti?38:8))*dt;p.vx*=Math.exp(-.5*dt);p.vy*=Math.exp(-.35*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;}
      for(const list of [this.pulses,this.labels])for(let i=list.length-1;i>=0;i--){list[i].life-=dt;if(list[i].life<=0)list.splice(i,1);else if(list===this.pulses)list[i].r+=80*dt;else list[i].y-=16*dt;}
      if(this.events.length>100)this.events.splice(0,this.events.length-100);
    }
  }
  return {Game,colors,CHAMBERS};
});
