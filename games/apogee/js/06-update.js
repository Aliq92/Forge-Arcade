function zoneFor(km){let i=0;for(let n=0;n<ZONES.length;n++)if(km>=ZONES[n].km)i=n;return i}
function update(dt){
  let adt=dt*flight.timeScale;
  if(flight.timeScale<1)flight.timeScale=Math.min(1,flight.timeScale+dt*2.9);
  flight.shake=Math.max(0,flight.shake-dt*58);
  flight.sepFlash=Math.max(0,flight.sepFlash-dt*2.4);
  updateDeepSpace(dt);
  const cameraTarget=flight.apogeeHold?-.62:clamp(flight.vel/1700,0,1);
  flight.cameraLead+=(cameraTarget-flight.cameraLead)*(1-Math.exp(-dt*3.6));

  if(state===STATE.FLIGHT||state===STATE.EXPLODING){
    if(flight.apogeeHold){
      flight.apogeeTimer-=dt;
      if(flight.apogeeTimer<=0){flight.apogeeTimer=0;flight.apogeeHold=false;endRun()}
    }else{
      if(flight.alt>0||flight.vel>0){flight.vel-=145*adt;flight.alt+=flight.vel*adt;if(flight.alt<0){flight.alt=0;flight.vel=0}}
      if(state===STATE.FLIGHT&&flight.fuel>0){flight.fuel-=adt;flight.vel+=(188+save.engine*24)*adt;audio.pitch(1-clamp(flight.fuel/flight.maxFuel,0,1));updateFuel();if(flight.fuel<=0){flight.fuel=0;updateFuel();explode()}else{{const tr=activeTrail(),ry=rocketScreenY();spawnParticles(rocketScreenX()+(Math.random()-.5)*10,ry+38,tr.particle1,2,3.5,2.6);spawnParticles(rocketScreenX()+(Math.random()-.5)*8,ry+44,tr.particle2,1,3,2)}}}
      if(state===STATE.FLIGHT&&flight.activeStage<=1&&flight.vel<=0)startApogeeMoment();
    }
    const km=Math.max(0,Math.floor(flight.alt/100));$('altitude').textContent=fmt(km);const zi=zoneFor(km);if(zi!==flight.zoneIndex){flight.zoneIndex=zi;const z=ZONES[zi];$('zoneChip').textContent=z.name;$('zoneChip').style.color=z.color;toast(z.name,'cyan');shock('101,168,255');flight.sepFlash=Math.max(flight.sepFlash,.35)}
    if(flight.vel>1200&&Math.random()<adt*24)flight.speedLines.push({x:Math.random()*W,y:-50,len:50+Math.random()*130,s:flight.vel*(.7+Math.random()*.5)});
  }
  for(let i=flight.debris.length-1;i>=0;i--){const d=flight.debris[i];d.vy-=145*dt;d.worldY+=d.vy*dt;d.rot+=d.rv*dt;d.x+=(d.vx||0)*dt;d.vx=(d.vx||0)*Math.exp(-dt*.7);if(flight.alt-d.worldY>H*3||Math.abs(d.x)>W)flight.debris.splice(i,1)}
  for(let i=flight.particles.length-1;i>=0;i--){const p=flight.particles[i];p.vy+=(p.gravity||0)*dt*60;p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.rot=(p.rot||0)+(p.rotV||0)*dt*60;p.life-=dt*1.35;if(p.life<=0)flight.particles.splice(i,1)}
  for(let i=flight.texts.length-1;i>=0;i--){const tt=flight.texts[i];tt.y+=70*dt;tt.life-=dt*1.15;if(tt.life<=0)flight.texts.splice(i,1)}
  for(let i=flight.shockwaves.length-1;i>=0;i--){const s=flight.shockwaves[i];s.r+=850*dt;s.a-=dt*2.2;if(s.a<=0)flight.shockwaves.splice(i,1)}
  for(let i=flight.speedLines.length-1;i>=0;i--){const l=flight.speedLines[i];l.y+=l.s*dt;if(l.y>H+250)flight.speedLines.splice(i,1)}
}
