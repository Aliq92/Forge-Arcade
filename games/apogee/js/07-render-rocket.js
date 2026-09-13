function skyColor(){const km=flight.alt/100,p=clamp(km/650,0,1),p2=clamp((km-70)/580,0,1);return{r:Math.floor(45*(1-p)+4*p),g:Math.floor(112*(1-p)+7*p),b:Math.floor(190*(1-p)+17*p),space:p2}}
function drawRocket(y){
  if(state===STATE.EXPLODING)return;
  ctx.save();
  ctx.translate(rocketScreenX(),y);
  const sh=34, bodyW=28, half=bodyW/2;
  const count=state===STATE.MENU?save.stages+2:Math.max(1,flight.activeStage);
  const liv=activeLivery(),trail=activeTrail();

  for(let i=0;i<count;i++){
    const sy=-i*sh;
    const isTop=i===count-1;
    const isBase=i===0;
    const isActive=state===STATE.FLIGHT&&i===0&&flight.activeStage>1;

    // main cylinder body
    const bodyGrad=ctx.createLinearGradient(-half,0,half,0);
    bodyGrad.addColorStop(0,liv.body[0]);
    bodyGrad.addColorStop(.22,liv.body[1]);
    bodyGrad.addColorStop(.5,liv.body[1]);
    bodyGrad.addColorStop(.78,liv.body[0]);
    bodyGrad.addColorStop(1,liv.body[2]);
    ctx.fillStyle=bodyGrad;
    ctx.fillRect(-half,sy-sh+1,bodyW,sh-2);

    // rounded shoulder hint
    ctx.fillStyle='rgba(255,255,255,.26)';
    ctx.fillRect(-half+2,sy-sh+3,4,sh-8);
    ctx.fillStyle='rgba(35,45,65,.28)';
    ctx.fillRect(half-5,sy-sh+3,3,sh-8);

    // interstage ring
    const ringGrad=ctx.createLinearGradient(-half-3,0,half+3,0);
    ringGrad.addColorStop(0,'#1c2432');
    ringGrad.addColorStop(.5,'#38455d');
    ringGrad.addColorStop(1,'#1b2330');
    ctx.fillStyle=ringGrad;
    ctx.fillRect(-half-2,sy-sh,bodyW+4,5);
    ctx.fillStyle='#0f1724';
    ctx.fillRect(-half,sy-sh+7,bodyW,2);

    // accent stripe and tiny vents
    ctx.fillStyle=isBase?liv.fin:liv.accent;
    ctx.fillRect(-3,sy-sh+10,6,7);
    ctx.fillStyle='#cad4e3';
    ctx.fillRect(-8,sy-sh+20,16,2);
    ctx.fillRect(-8,sy-sh+24,16,1);

    // active scorch fill
    if(isActive&&flight.maxFuel>0){
      const r=clamp(flight.fuel/flight.maxFuel,0,1);
      const sc=sh*(1-r);
      const scorch=ctx.createLinearGradient(0,sy,0,sy-sc);
      scorch.addColorStop(0,'rgba(9,12,18,.92)');
      scorch.addColorStop(1,'rgba(30,36,48,.72)');
      ctx.fillStyle=scorch;
      ctx.fillRect(-half,sy-sc,bodyW,sc);
      if(r<.14&&Math.floor(performance.now()/55)%2===0){
        ctx.fillStyle='rgba(98,245,219,.35)';
        ctx.fillRect(-half-1,sy-sh+1,bodyW+2,sh-2);
      }
    }

    // fins + engine bell on base stage
    if(isBase){
      const finGrad=ctx.createLinearGradient(0,sy-12,0,sy+4);
      finGrad.addColorStop(0,liv.fin);
      finGrad.addColorStop(1,liv.body[2]);
      ctx.fillStyle=finGrad;
      ctx.beginPath();
      ctx.moveTo(-half,sy-13);ctx.lineTo(-half-14,sy+4);ctx.lineTo(-half,sy+4);ctx.closePath();ctx.fill();
      ctx.beginPath();
      ctx.moveTo(half,sy-13);ctx.lineTo(half+14,sy+4);ctx.lineTo(half,sy+4);ctx.closePath();ctx.fill();

      const nozzle=ctx.createLinearGradient(0,sy+2,0,sy+11);
      nozzle.addColorStop(0,'#3f495b');
      nozzle.addColorStop(1,'#181d27');
      ctx.fillStyle=nozzle;
      ctx.beginPath();
      ctx.moveTo(-8,sy+1);ctx.lineTo(8,sy+1);ctx.lineTo(11,sy+10);ctx.lineTo(-11,sy+10);ctx.closePath();ctx.fill();
      ctx.fillStyle='#69758a';ctx.fillRect(-4,sy-1,8,3);
    }

    if(isTop){
      // nose cone
      const cone=ctx.createLinearGradient(-half,0,half,0);
      cone.addColorStop(0,liv.body[0]);
      cone.addColorStop(.5,liv.body[1]);
      cone.addColorStop(1,liv.body[2]);
      ctx.fillStyle=cone;
      ctx.beginPath();
      ctx.moveTo(-half,sy-sh);
      ctx.lineTo(0,sy-sh-25);
      ctx.lineTo(half,sy-sh);
      ctx.closePath();ctx.fill();

      // cockpit glass
      const glass=ctx.createRadialGradient(-1,sy-sh-8,1,0,sy-sh-8,7);
      glass.addColorStop(0,'#b8fff1');
      glass.addColorStop(1,liv.glass);
      ctx.fillStyle=glass;
      ctx.beginPath();ctx.arc(0,sy-sh-8,4.3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.65)';
      ctx.beginPath();ctx.arc(-1.3,sy-sh-9.5,1.2,0,Math.PI*2);ctx.fill();

      // capsule shoulder ring
      ctx.fillStyle='#2a3449';
      ctx.fillRect(-half-1,sy-sh,bodyW+2,3);
    }
  }

  if(state===STATE.FLIGHT&&flight.fuel>0){
    const len=36+Math.random()*25+save.engine*2.7;
    ctx.save();
    ctx.shadowColor=trail.mid;
    ctx.shadowBlur=18;

    const outer=ctx.createLinearGradient(0,4,0,len);
    outer.addColorStop(0,trail.core);
    outer.addColorStop(.28,trail.mid);
    outer.addColorStop(1,trail.outer);
    ctx.fillStyle=outer;
    ctx.beginPath();
    ctx.moveTo(-10,6);ctx.quadraticCurveTo(-3,len*.35,0,len);ctx.quadraticCurveTo(3,len*.35,10,6);ctx.closePath();ctx.fill();

    ctx.shadowColor=trail.core;
    ctx.shadowBlur=10;
    const inner=ctx.createLinearGradient(0,4,0,len*.66);
    inner.addColorStop(0,'#ffffff');
    inner.addColorStop(.3,trail.core);
    inner.addColorStop(1,trail.mid);
    ctx.fillStyle=inner;
    ctx.beginPath();
    ctx.moveTo(-4,6);ctx.quadraticCurveTo(-1,len*.22,0,len*.6);ctx.quadraticCurveTo(1,len*.22,4,6);ctx.closePath();ctx.fill();

    // side plasma flickers
    ctx.globalAlpha=.4;
    ctx.fillStyle=trail.plasma;
    ctx.beginPath();ctx.moveTo(-5,8);ctx.lineTo(-12,18+Math.random()*6);ctx.lineTo(-3,14);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(5,8);ctx.lineTo(12,18+Math.random()*6);ctx.lineTo(3,14);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
