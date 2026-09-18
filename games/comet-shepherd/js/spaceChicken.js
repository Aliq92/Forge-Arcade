import { dist, normalize } from './utils.js';

export function createSpaceChicken(system, rng=Math.random){
  const chicken = {
    x:0, y:0, vx:0, vy:0,
    radius:13,
    active:true,
    respawnTimer:0,
    turnTimer:0,
    flap:0,
  };
  respawnSpaceChicken(chicken, system, rng);
  return chicken;
}

export function updateSpaceChicken(chicken, system, dt, rng=Math.random){
  if(!chicken) return;
  chicken.flap += dt * 10;

  if(!chicken.active){
    chicken.respawnTimer -= dt;
    if(chicken.respawnTimer <= 0) respawnSpaceChicken(chicken, system, rng);
    return;
  }

  chicken.turnTimer -= dt;
  if(chicken.turnTimer <= 0){
    chicken.turnTimer = 0.7 + rng()*1.5;
    const speed = 58 + rng()*38;
    const current = Math.atan2(chicken.vy,chicken.vx);
    const ang = current + (rng()-0.5)*1.5;
    chicken.vx = Math.cos(ang)*speed;
    chicken.vy = Math.sin(ang)*speed;
  }

  // Keep the chicken roaming inside the playable system instead of escaping forever.
  const sx = chicken.x - system.star.x, sy = chicken.y - system.star.y;
  const d = Math.hypot(sx,sy);
  const roamRadius = Math.max(700, system.bounds.radius * 0.82);
  if(d > roamRadius){
    const inward = normalize(system.star.x-chicken.x, system.star.y-chicken.y);
    const speed = Math.max(70,Math.hypot(chicken.vx,chicken.vy));
    chicken.vx = inward.x*speed;
    chicken.vy = inward.y*speed;
    chicken.turnTimer = 0.8;
  }

  chicken.x += chicken.vx*dt;
  chicken.y += chicken.vy*dt;
}

export function hitSpaceChicken(chicken, comet){
  if(!chicken || !chicken.active) return false;
  if(dist(chicken.x,chicken.y,comet.x,comet.y) >= chicken.radius + comet.radius) return false;
  chicken.active = false;
  chicken.respawnTimer = 1.25;
  chicken.vx = 0; chicken.vy = 0;
  return true;
}

export function respawnSpaceChicken(chicken, system, rng=Math.random){
  const gateR = Math.hypot(system.gate.x-system.star.x, system.gate.y-system.star.y);
  const maxR = Math.max(650, gateR*0.82);
  const minR = Math.min(520, maxR*0.45);
  const a = rng()*Math.PI*2;
  const r = minR + rng()*(maxR-minR);
  chicken.x = system.star.x + Math.cos(a)*r;
  chicken.y = system.star.y + Math.sin(a)*r;

  const tangent = a + Math.PI/2 + (rng()-0.5)*0.9;
  const speed = 60 + rng()*35;
  chicken.vx = Math.cos(tangent)*speed;
  chicken.vy = Math.sin(tangent)*speed;
  chicken.active = true;
  chicken.respawnTimer = 0;
  chicken.turnTimer = 0.5 + rng()*1.4;
}
