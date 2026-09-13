import type { Flight } from './simulation.js';
export const upgradeKeys=['engine','fuel','structure','guidance','staging','aero','payload'] as const;
export type UpgradeKey=typeof upgradeKeys[number];
export type Upgrades=Record<UpgradeKey,number>;
export interface Save {version:1;rp:number;best:number;launches:number;perfects:number;highestVelocity:number;tier:number;upgrades:Upgrades;achievements:number[];settings:{music:boolean;sfx:boolean;shake:boolean};}
export const milestones=[{km:10,name:'COMMERCIAL ALTITUDE'},{km:50,name:'MESOSPHERE'},{km:100,name:'SPACE'},{km:400,name:'ORBITAL HEIGHT'},{km:1000,name:'THE LONG CLIMB'},{km:10000,name:'DEEPER'},{km:100000,name:'OUTBOUND'},{km:384400,name:'MOON DISTANCE'}];
export const tiers=[{name:'TIN CAN',km:0,level:0},{name:'SCOUT',km:50,level:2},{name:'PIONEER',km:100,level:5},{name:'ATLAS',km:400,level:9},{name:'TITAN',km:1000,level:14},{name:'ODYSSEY',km:10000,level:22}];
export const info:Record<UpgradeKey,{name:string;description:string;base:number}>={engine:{name:'ENGINE',description:'Thrust',base:160},fuel:{name:'FUEL SYSTEM',description:'Burn duration',base:120},structure:{name:'LIGHTWEIGHT STRUCTURE',description:'Dry mass reduction',base:130},guidance:{name:'GUIDANCE',description:'Perfect window',base:100},staging:{name:'STAGING',description:'Rocket stages',base:450},aero:{name:'AERODYNAMICS',description:'Drag reduction',base:110},payload:{name:'PAYLOAD',description:'Research multiplier',base:160}};
export const maxLevel=(key:UpgradeKey)=>key==='staging'?5:40;
export const cost=(key:UpgradeKey,level:number)=>Math.round(info[key].base*Math.pow(key==='staging'?2.4:1.34,level));
export function effect(key:UpgradeKey,n:number){switch(key){case'engine':return `${Math.pow(1.22,n).toFixed(2)}×`;case'fuel':return `+${(60*n/(n+8)).toFixed(1)}%`;case'structure':return `−${(n*1.2).toFixed(1)}%`;case'guidance':return `${(3+n*.15).toFixed(2)}%`;case'staging':return `${3+n}`;case'aero':return `−${Math.round(100-100/(1+n*.2))}%`;case'payload':return `${(1+n*.15).toFixed(2)}×`;}}
export const defaults=():Save=>({version:1,rp:0,best:0,launches:0,perfects:0,highestVelocity:0,tier:0,upgrades:{engine:0,fuel:0,structure:0,guidance:0,staging:0,aero:0,payload:0},achievements:[],settings:{music:false,sfx:true,shake:true}});
const number=(v:unknown,max=1e15)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):0;
export function sanitize(raw:unknown):Save{
 const s=defaults(); if(!raw||typeof raw!=='object')return s;const r=raw as Record<string,unknown>;
 for(const k of ['rp','best','launches','perfects','highestVelocity'] as const)s[k]=number(r[k]);
 if(r.upgrades&&typeof r.upgrades==='object')for(const k of upgradeKeys)s.upgrades[k]=Math.floor(number((r.upgrades as Record<string,unknown>)[k],maxLevel(k)));
 if(r.settings&&typeof r.settings==='object')for(const k of ['music','sfx','shake'] as const){const v=(r.settings as Record<string,unknown>)[k];if(typeof v==='boolean')s.settings[k]=v;}
 s.achievements=milestones.filter(m=>s.best>=m.km*1000).map(m=>m.km);s.tier=tierFor(s);return s;
}
export const SAVE_KEY='forge-apogee-v1';
export function load(){try{return sanitize(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch{return defaults();}}
export function persist(s:Save){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function tierFor(s:Save){let result=0;tiers.forEach((t,i)=>{if(s.best>=t.km*1000&&s.upgrades.engine>=t.level)result=i;});return result;}
export function buy(s:Save,key:UpgradeKey){const level=s.upgrades[key],price=cost(key,level);if(level>=maxLevel(key)||s.rp<price)return false;s.rp-=price;s.upgrades[key]++;s.tier=tierFor(s);return true;}
export function accuracy(f:Flight){const g=f.grades,total=Object.values(g).reduce((a,b)=>a+b,0);return total?Math.round((g.PERFECT+g.GREAT*.85+g.GOOD*.6+g.EARLY*.2+g.CRITICAL*.1)/total*100):0;}
export function finishRun(s:Save,f:Flight){
 if(f.elapsed<=0)return {rp:0,record:false};
 const record=f.altitude>s.best;const rp=Math.round((35+Math.sqrt(f.altitude/1000)*15+accuracy(f)*.6+f.grades.PERFECT*35+f.stage*12+(record?60:0))*(1+s.upgrades.payload*.15));
 s.rp=Math.min(1e15,s.rp+rp);s.best=Math.max(s.best,f.altitude);s.perfects+=f.grades.PERFECT;s.highestVelocity=Math.max(s.highestVelocity,f.highestVelocity);
 s.achievements=milestones.filter(m=>s.best>=m.km*1000).map(m=>m.km);s.tier=tierFor(s);return {rp,record};
}
