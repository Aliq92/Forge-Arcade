'use strict';
window.WS = {};
(() => {
  const W = window.WS;
  W.regions = ['riverlands', 'highlands', 'coast'];
  W.times = ['day', 'dusk', 'night'];
  W.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaults = {region:'riverlands',time:'day',weather:'clear',speed:W.reduced?'paused':'cruise',opening:0,volume:35};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('forge.window-seat.preferences.v1') || '{}') || {}; } catch (_) {}
  W.state = {...defaults};
  for (const [key, values] of Object.entries({region:W.regions,time:W.times,weather:['clear','rain'],speed:['slow','cruise','paused']})) {
    if (values.includes(saved[key])) W.state[key] = saved[key];
  }
  for (const key of ['opening','volume']) if (Number.isFinite(saved[key])) W.state[key] = Math.max(0,Math.min(100,saved[key]));
  if (W.reduced) W.state.speed = 'paused';
  Object.assign(W.state, {seed:837219,position:1300,elapsed:0,clock:0,started:false,sound:false,fromRegion:W.state.region,blend:1,light:W.times.indexOf(W.state.time),rain:W.state.weather==='rain'?1:0,coffee:0,hidden:document.hidden});
  W.persist = () => { try { const data = {}; Object.keys(defaults).forEach(k=>data[k]=W.state[k]); localStorage.setItem('forge.window-seat.preferences.v1',JSON.stringify(data)); } catch (_) {} };
  W.selectRegion = region => {
    const s=W.state;
    if (!W.regions.includes(region) || region===s.region) return;
    // At most two rendered regions, including rapid manual changes.
    s.fromRegion=s.blend<.5?s.fromRegion:s.region;
    s.region=region;s.blend=0;s.elapsed=0;
    W.persist(); W.syncUI?.();
  };
  W.step = dt => {
    const s=W.state; dt=Math.min(.05,Math.max(0,dt));
    if (!s.started || s.hidden) return;
    s.clock+=dt;
    if(s.speed!=='paused') {
      s.position+=dt*(s.speed==='slow'?20:43);
      s.elapsed+=dt;
      if(s.elapsed>=180) W.selectRegion(W.regions[(W.regions.indexOf(s.region)+1)%3]);
    }
    s.blend=Math.min(1,s.blend+dt/20);
    s.light+=(W.times.indexOf(s.time)-s.light)*Math.min(1,dt*1.6);
    s.rain+=((s.weather==='rain'?1:0)-s.rain)*Math.min(1,dt*1.8);
    s.coffee=Math.max(0,s.coffee-dt);
  };
})();
