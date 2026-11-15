/* Original authored routes and rules. No renderer or storage side effects. */
(function(root){
'use strict';
const G=(time,x,y)=>({kind:'gate',time,x,y});
const C=(time,x,y)=>({kind:'cube',time,x,y});
const H=(time,safeX)=>({time,warning:time-4,safeX});
const make=(id,name,tier,mood,lesson,route,hazards,gates,cubes)=>({id,name,tier,mood,lesson,route,hazards,goal:{gates,cubes},duration:route.at(-1).time+3,optional:'Thread 2 perfect gates for a Precision badge',reward:['Dawn crest','Neon crest','Breach crest'][tier-1]});
const challenges=[
 make('first-light','First Light',1,0,'Hold the signal; fly through three broad gates.',[G(5,0,0),G(10,1,0),G(15,0,1)],[],3,0),
 make('skyline-weave','Skyline Weave',1,0,'Steer left and right without releasing.',[G(5,-2,0),G(10,2,0),G(15,-2,0),G(20,0,0)],[],4,0),
 make('reactor-spark','Reactor Spark',1,1,'Align the ship with two energy cubes between gates.',[G(5,0,0),C(10,1,-.6),G(15,0,0),C(20,-1,-.6)],[],2,2),
 make('cloud-ladder','Cloud Ladder',1,0,'Climb and descend through the rooftop flight corridor.',[G(5,0,-2),G(10,0,2),G(15,1,-2),G(20,0,1)],[],4,0),
 make('evacuation-lane','Evacuation Lane',2,1,'Follow the open cyan lane through a warned interference wall.',[G(5,-2,0),G(13,-2,1),C(18,0,-.6),G(23,2,0)],[H(9,-2)],3,1),
 make('reactor-relay','Reactor Relay',2,1,'Alternate cube alignment and gate timing.',[C(5,-2,-.6),G(10,0,1),C(15,2,-.6),G(20,0,-1),C(25,-1,-.6)],[],2,3),
 make('storm-crossing','Storm Crossing',2,2,'Change lanes between two telegraphed energy fronts.',[G(5,-2,0),G(13,0,1),G(23,2,0),C(28,0,-.6)],[H(9,-2),H(19,2)],3,1),
 make('highline-rescue','Highline Rescue',2,1,'Control altitude, then return to the marked safe lane.',[G(5,0,2),C(10,1,-.6),G(15,-1,-2),G(25,2,2),C(30,0,-.6)],[H(20,0)],3,2),
 make('breach-run','Breach Run',3,3,'Navigate alternating surge lanes and collect reactor energy.',[G(5,-2,1),C(13,0,-.6),G(23,2,-1),C(33,-1,-.6)],[H(9,-2),H(19,2),H(29,-2)],2,2),
 make('prism-ascent','Prism Ascent',3,3,'Trace a rising helix; align precisely for the upper cube.',[G(5,-2,-2),C(10,-1,.4),G(15,2,2),C(20,1,1.4),G(25,-2,1),G(30,0,-2)],[],4,2),
 make('last-skybridge','Last Skybridge',3,2,'Weave between storm walls while changing altitude.',[G(5,2,-2),C(13,0,-.6),G(23,-2,2),C(33,0,.4),G(38,2,-1)],[H(9,2),H(19,-2),H(29,2)],3,2),
 make('dont-let-go','The World Holds',3,3,'Keep the signal through the final breach relay.',[G(5,-2,1),C(13,0,-.6),G(23,2,-2),C(33,0,1.4),G(38,-2,1),G(43,0,0)],[H(9,-2),H(19,2),H(29,-2)],4,2)
];
function distanceAt(t){
 const sectors=[[0,16],[18,22],[42,29],[70,37],[104,47],[146,60]];let d=0;
 for(let i=0;i<sectors.length;i++){const [a,v]=sectors[i],next=sectors[i+1];if(t<=a)break;
 const span=next?next[0]-a:Infinity,u=Math.min(t-a,span);d+=v*u+(next?(next[1]-v)*u*u/(2*span):0);}
 return d;
}
function outcome(c,s){if(s.elapsed<c.duration)return 'playing';return s.gates>=c.goal.gates&&s.cubes>=c.goal.cubes?'complete':'failed';}
function hazardHit(h,x){return Math.abs(x-h.safeX)>2;}
function eventPhase(h,t){return t<h.warning?'dormant':t<h.time?'warning':t<h.time+1?'surge':'clear';}
function award(save,id,precision){const fresh=!save[id]?.medal;save[id]={medal:true,precision:!!(precision||save[id]?.precision)};return fresh;}
function readSave(raw){try{const data=JSON.parse(raw);if(!data||Array.isArray(data)||typeof data!=='object')return {};const out={};for(const c of challenges)if(data[c.id]?.medal===true)out[c.id]={medal:true,precision:data[c.id].precision===true};return out;}catch{return {};}}
const api={challenges,distanceAt,outcome,hazardHit,eventPhase,award,readSave};
if(typeof module==='object')module.exports=api;else root.HeroChallenges=api;
})(typeof window==='object'?window:globalThis);
