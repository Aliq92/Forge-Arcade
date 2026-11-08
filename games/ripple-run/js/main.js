// Ripple Run - viewport, precise primary-pointer input and one visibility-safe RAF chain.
(function(){
 const canvas=document.getElementById('game-canvas'),container=document.getElementById('app'),ctx=RR.Renderer.init(canvas);
 let W=0,H=0,dpr=1,initialized=false,last=performance.now(),rafId=null,frames=0;const frameCosts=new Float32Array(240);
 function boot(w,h){if(w<=0||h<=0||initialized&&w===W&&h===H)return;W=w;H=h;dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);if(!initialized){RR.Game.init(w,h);RR.UI.init();initialized=true;}else RR.Game.resize(w,h);}
 function onResize(){boot(container.clientWidth||innerWidth,container.clientHeight||innerHeight);}
 onResize();let resizeTimer=null;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(onResize,100);});window.addEventListener('orientationchange',onResize);if(window.ResizeObserver)new ResizeObserver(onResize).observe(container);
 canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();const r=canvas.getBoundingClientRect();RR.Game.handleTap((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height);},{passive:false});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault());
 document.addEventListener('pointerdown',()=>RR.Audio.resume(),{once:true,capture:true});function unlockOnKey(e){if(e.key==='Enter'||e.code==='Space'){RR.Audio.resume();document.removeEventListener('keydown',unlockOnKey);}}document.addEventListener('keydown',unlockOnKey);
 function frame(now){rafId=null;const begin=performance.now(),dt=Math.max(0,Math.min(.05,(now-last)/1000||0));last=now;if(initialized){RR.Game.update(dt);RR.Renderer.render(dt,RR.Game.getRenderState());RR.UI.sync();}frameCosts[(frames++)%240]=performance.now()-begin;if(!document.hidden)rafId=requestAnimationFrame(frame);}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){RR.UI.pause();RR.Audio.setVisible(false);if(rafId!==null)cancelAnimationFrame(rafId);rafId=null;}else{RR.UI.pause();RR.Audio.setVisible(RR.Game.state!=='paused');last=performance.now();if(rafId===null)rafId=requestAnimationFrame(frame);}});
 RR.Debug={inspect:()=>({frames,frameCosts,dpr,W,H,rafPending:rafId!==null})};rafId=requestAnimationFrame(frame);
})();
