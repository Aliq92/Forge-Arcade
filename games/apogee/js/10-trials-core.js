/* APOGEE: Beyond the Limit — deterministic trial rules, shared by runtime and tests. */
(function(root){
'use strict';
const make=(id,name,tier,category,scenario,goals,limits,pattern,mission)=>({id,name,tier,category,scenario,goals,limits,pattern,mission,reward:name+' insignia',spec:{engine:8,fuel:3,stages:scenario==='launch'?5:1}});
const trials=[
make('teal-ignition','Teal Ignition',1,'Precision','launch',{perfects:1},{},'open','Finish with no EARLY separations'),
make('quiet-corridor','Quiet Corridor',1,'Survival','coast',{seconds:10},{impacts:2},'drift','Finish without an impact'),
make('sideband-survey','Sideband Survey',1,'Exploration','coast',{beacons:2},{impacts:2},'open','Collect both signals without an impact'),
make('clean-handoff','Clean Handoff',1,'Mastery','launch',{quality:2},{early:0},'open','Make both handoffs PERFECT'),
make('teal-relay','Teal Relay',2,'Precision','launch',{perfects:3},{early:0},'open','Build a chain of three PERFECTs'),
make('pulse-watch','Pulse Watch',2,'Survival','coast',{seconds:16,gates:2},{impacts:1},'pulse','Finish without an impact'),
make('split-spectrum','Split Spectrum',2,'Exploration','coast',{beacons:3,gates:1},{impacts:1},'sweep','Finish without an impact'),
make('thin-margin','Thin Margin',2,'Mastery','launch',{perfects:2,alt:160},{early:0},'open','Build a chain of two PERFECTs'),
make('unbroken-signal','Unbroken Signal',3,'Precision','launch',{chain:4},{early:0},'open','Make four PERFECTs at 7% fuel or less'),
make('storm-passage','Storm Passage',3,'Survival','coast',{seconds:22,gates:3},{impacts:0},'sweep','Recover four survey signals too'),
make('far-side-atlas','Far Side Atlas',3,'Exploration','coast',{beacons:4,seconds:18},{impacts:1},'pulse','Finish without an impact'),
make('beyond-the-limit','Beyond the Limit',3,'Mastery','launch',{perfects:4,chain:3,beacons:2,seconds:12},{impacts:1,early:0},'sweep','Finish without an impact')
];
const tiers=['Discovery','Adaptation','Mastery'];
function fresh(){return {version:1,records:{},equipped:''}}
function sanitize(raw){const p=fresh();if(!raw||raw.version!==1||!raw.records||typeof raw.records!=='object')return p;for(const c of trials){const r=raw.records[c.id];if(r&&r.complete===true&&Number.isFinite(r.best)&&r.best>=0)p.records[c.id]={complete:true,best:r.best,mission:r.mission===true,reward:true}}if(typeof raw.equipped==='string'&&trials.some(c=>c.id===raw.equipped)&&p.records[raw.equipped])p.equipped=raw.equipped;return p}
function unlocked(c,p){return c.tier===1||trials.filter(x=>x.tier===c.tier-1&&p.records[x.id]?.complete).length>=3}
function create(c){return {id:c.id,elapsed:0,seconds:0,perfects:0,quality:0,lowFuelPerfects:0,chain:0,early:0,alt:0,impacts:0,beacons:0,gates:0,seen:[],failed:'',done:false}}
function goalText(c){const labels={perfects:'PERFECT separations',quality:'GREAT / PERFECT handoffs',chain:'PERFECT chain',alt:'KM altitude',seconds:'seconds in deep space',beacons:'survey signals',gates:'anomaly gates passed'};return Object.entries(c.goals).map(([k,n])=>n+' '+labels[k]).join(' + ')}
function limitText(c){return ['No burnout',...Object.entries(c.limits).map(([k,n])=>k==='early'?'No EARLY separations':'At most '+n+' impact'+(n===1?'':'s'))].join(' • ')}
function assess(c,s){for(const [k,max]of Object.entries(c.limits))if(s[k]>max)s.failed=k==='early'?'EARLY separation — wait for amber or teal':'Impact limit exceeded';if(s.failed)return 'failed';return Object.entries(c.goals).every(([k,n])=>s[k]>=n)?'complete':'active'}
function optional(c,s){if(c.id==='clean-handoff')return s.perfects>=2;if(c.id==='teal-relay')return s.chain>=3;if(c.id==='thin-margin')return s.chain>=2;if(c.id==='unbroken-signal')return s.lowFuelPerfects>=4;if(c.id==='storm-passage')return s.beacons>=4;if(c.scenario==='launch'&&c.tier===1)return s.early===0;return s.impacts===0}
function award(c,s,p){const old=p.records[c.id];const mission=optional(c,s);p.records[c.id]={complete:true,best:old?Math.min(old.best,s.elapsed):s.elapsed,mission:mission||!!old?.mission,reward:true};return {first:!old,mission:mission&&!old?.mission}}
// All positions use a normalized steering lane, independent of screen size.
function gate(c,index,t){const born=2+index*5,age=t-born;const center=c.pattern==='sweep'?Math.sin(index*1.7+Math.max(0,age)*.45)*.48:(index%2?-.48:.48);return {born,age,center,gap:.38,warning:age>=0&&age<2,active:age>=2&&age<4,passed:age>=4}}
function signal(index){return {at:2+index*4,lane:[-.62,.62,-.62,.62][index%4],duration:3.5}}
const api={trials,tiers,fresh,sanitize,unlocked,create,goalText,limitText,assess,optional,award,gate,signal};
if(typeof module!=='undefined')module.exports=api;else root.ApogeeTrials=api;
})(typeof globalThis!=='undefined'?globalThis:this);
