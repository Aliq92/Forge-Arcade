const harness=require('./harness.cjs');
const results=[];for(const seed of [1,7,42,123,987]){const {api}=harness(false,seed);api.start();let ticks=0;
 for(;ticks<600&&api.get().state==='playing';ticks++){const {player:p,motes}=api.get();const targets=Array.from(motes).filter(m=>Math.hypot(m.x-p.x,m.y-p.y)<180).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));if(!targets.length)break;const m=targets[0],dx=m.x-p.x,dy=m.y-p.y,d=Math.hypot(dx,dy)||1;api.input(dx/d,dy/d);api.update(1/60);}
 const s=api.get();results.push({seed,state:s.state,seconds:+(ticks/60).toFixed(3),mass:+s.player.mass.toFixed(3),stage:s.lastMoltIdx+1,traits:s.player.traits});if(s.state!=='molting'||ticks>=480)process.exitCode=1;
}console.log(JSON.stringify(results,null,2));
