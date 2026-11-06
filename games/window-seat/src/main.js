'use strict';
(() => {
  const W=WS,s=W.state;
  const scenery=new W.Scenery(s.seed),renderer=new W.Renderer(document.getElementById('scene'),scenery),audio=new W.TrainAudio();
  let last=0,raf=0,lastAudio=0;
  W.resetFrame=()=>{last=0;};
  const frame=now=>{
    raf=0;if(document.hidden)return;
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    W.step(dt);renderer.render(s,dt);
    if(now-lastAudio>200){audio.update(s);lastAudio=now;}
    raf=requestAnimationFrame(frame);
  };
  W.bindUI(renderer,audio);
  const start=()=>{if(!raf)raf=requestAnimationFrame(frame);};start();
  let resizePending=false;
  window.addEventListener('resize',()=>{if(resizePending)return;resizePending=true;requestAnimationFrame(()=>{resizePending=false;renderer.resize();renderer.render(s,0);});});
  document.addEventListener('visibilitychange',()=>{
    s.hidden=document.hidden;last=0;
    if(document.hidden){cancelAnimationFrame(raf);raf=0;audio.update(s);audio.hide();}
    else {audio.show();start();}
  });
  // Read-only diagnostics are deliberately small; normal play has no debug overlay.
  W.debug={get stats(){return {segments:scenery.cache.size,objects:scenery.objectCount,particles:renderer.rainCount,wipes:renderer.wipes.length,audioNodes:audio.nodes.length,position:s.position,region:s.region,blend:s.blend,dpr:renderer.dpr,hidden:s.hidden};}};
  // A local-only test hook: enabled explicitly by ?test=1, never needed for play.
  if(new URLSearchParams(location.search).has('test'))W.test={renderer,scenery,audio,advance(seconds){for(let t=0;t<seconds;t+=.05)W.step(Math.min(.05,seconds-t));renderer.render(s,0);W.syncUI();},draw(){renderer.render(s,0);}};
})();
