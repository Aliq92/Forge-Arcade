/* Pure numerical and presentation helpers. GPU and CPU both start at z0 = 0. */
window.FractalCore = (() => {
  const MIN_SCALE = 1e-8, MAX_SCALE = 6;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const palette = (id, name, a, b, c, d, cycles = 5) =>
    ({id, name, a, b, c, d, cycles, interior:[.008,.012,.026]});
  const palettes = [
    palette('nebula','Nebula',[.32,.32,.62],[.28,.28,.30],[1,1,2],[0,.5,0],3.4),
    palette('solar','Solar Flare',[.57,.3,.19],[.43,.3,.19],[1,1,1],[0,.12,.23],4.5),
    palette('emerald','Emerald Dream',[.16,.44,.36],[.16,.43,.35],[1,1,1],[.31,.02,.13],5),
    palette('ice','Cosmic Ice',[.43,.58,.74],[.43,.38,.25],[1,1,1],[.2,.12,.02],4),
    palette('prism','Prism',[.5,.5,.5],[.5,.5,.5],[1,1,1],[0,.333,.667],5),
    palette('monochrome','Monochrome',[.5,.5,.5],[.5,.5,.5],[1,1,1],[0,0,0],3),
    palette('classic','Classic',[.5,.5,.55],[.5,.5,.5],[1,1,1],[0,.1,.2],5),
    palette('ember','Ember',[.5,.35,.25],[.5,.35,.25],[1,.9,.7],[0,.08,.2],4.5),
    palette('ocean','Ocean',[.2,.35,.5],[.25,.35,.45],[.8,.9,1],[.35,.25,.1],5),
    palette('spectrum','Spectrum',[.5,.5,.5],[.5,.5,.5],[1,1,1],[0,.333,.667],7)
  ];
  function smooth(n, magnitudeSquared) {
    if (!Number.isFinite(magnitudeSquared) || magnitudeSquared <= 4) return n;
    return n + 1 - Math.log2(Math.log2(Math.sqrt(magnitudeSquared)));
  }
  function escape(cx, cy, limit = 500) {
    let x = 0, y = 0;
    for (let n = 1; n <= limit; n++) {
      const next = x*x - y*y + cx;
      y = 2*x*y + cy; x = next;
      const magnitude = x*x + y*y;
      if (magnitude > 256) return {escaped:true, iterations:n, smooth:smooth(n,magnitude), classification:'escaped'};
    }
    return {escaped:false, iterations:limit, smooth:limit, classification:'unescaped'};
  }
  function limitScale(scale) { return clamp(Number.isFinite(scale) ? scale : 1.5, MIN_SCALE, MAX_SCALE); }
  function fitScale(width,height){return limitScale(Math.max(1.5,1.65*height/width));}
  function map(x, y, camera, size) {
    return {x:camera.centerX+(x-size.width/2)*2*camera.scale/size.height,
      y:camera.centerY+(size.height/2-y)*2*camera.scale/size.height};
  }
  function zoom(camera, factor, focal) {
    const scale = limitScale(camera.scale/factor), ratio = scale/camera.scale;
    return {centerX:focal.x+(camera.centerX-focal.x)*ratio,
      centerY:focal.y+(camera.centerY-focal.y)*ratio, scale};
  }
  function iterations(scale, multiplier=1, cap=2000) {
    const base = 110+42*Math.log2(1.5/limitScale(scale)+1);
    return Math.round(clamp(base*multiplier,64,clamp(cap,64,4000)));
  }
  function colour(mu, limit, id, phase=0) {
    const p = palettes.find(p=>p.id===id)||palettes[0], t=mu/limit*p.cycles+phase;
    return p.a.map((a,i)=>clamp(a+p.b[i]*Math.cos(2*Math.PI*(p.c[i]*t+p.d[i])),0,1));
  }
  function validBookmark(b) {
    return !!b && typeof b==='object' && typeof b.id==='string' && typeof b.name==='string' &&
      Number.isFinite(b.x) && Math.abs(b.x)<=1e6 && Number.isFinite(b.y) && Math.abs(b.y)<=1e6 &&
      Number.isFinite(b.scale) && b.scale>0 && b.scale<=MAX_SCALE &&
      Number.isFinite(b.iterations) && b.iterations>=64 && b.iterations<=5000 &&
      palettes.some(p=>p.id===b.palette);
  }
  function restore(b) {return {...b,scale:limitScale(b.scale),iterations:clamp(b.iterations,64,4000)};}
  function preferences(saved={}, reduced=false, coarse=false) {
    const finite = (v,d)=>Number.isFinite(v)?v:d;
    const s={quality:coarse?'economy':'balanced',maxIterations:2000,cycle:false,cycleSpeed:.06,
      phase:0,reducedMotion:reduced,highContrast:false,palette:'nebula',...saved};
    s.quality=['economy','balanced','high'].includes(s.quality)?s.quality:(coarse?'economy':'balanced');
    s.maxIterations=Math.round(clamp(finite(s.maxIterations,2000),128,4000));
    s.cycleSpeed=clamp(finite(s.cycleSpeed,.06),.01,.3);
    s.phase=((finite(s.phase,0)%1)+1)%1;
    s.reducedMotion=typeof s.reducedMotion==='boolean'?s.reducedMotion:reduced;
    s.highContrast=s.highContrast===true;s.cycle=s.cycle===true&&!s.reducedMotion;
    s.palette=palettes.some(p=>p.id===s.palette)?s.palette:'nebula';
    return s;
  }
  return {MIN_SCALE,MAX_SCALE,clamp,palettes,smooth,escape,limitScale,fitScale,map,zoom,iterations,colour,validBookmark,restore,preferences};
})();
