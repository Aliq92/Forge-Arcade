export const SAVE_KEY='neon-forge-save-v1';
export const DEFAULT_SETTINGS=Object.freeze({sound:false,volume:.35,quality:'high',reducedMotion:false});
export function freshSave(){return{version:1,endlessUnlocked:true,records:{campaignScore:0,endlessScore:0,endlessWave:0,bestCombo:0,perfects:0,longestRun:0},settings:{...DEFAULT_SETTINGS}};}
const bounded=(v,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max?v:0;
export function decodeSave(text){
 try{const raw=JSON.parse(text);if(raw?.version!==1||typeof raw!=='object'||Array.isArray(raw))return null;const data=freshSave();data.endlessUnlocked=true;for(const key of Object.keys(data.records))data.records[key]=bounded(raw.records?.[key],key==='endlessWave'?9999:1e12);data.records.endlessWave=Math.floor(data.records.endlessWave);const s=raw.settings||{};data.settings={sound:s.sound===true,volume:typeof s.volume==='number'&&Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):.35,quality:s.quality==='low'?'low':'high',reducedMotion:s.reducedMotion===true};return data;}catch{return null;}
}
export function loadSave(storage){try{const raw=(storage??globalThis.localStorage).getItem(SAVE_KEY);if(!raw)return{data:freshSave(),warning:''};const data=decodeSave(raw);return{data:data||freshSave(),warning:data?'':'The saved record was unreadable. A fresh forge is ready.'};}catch{return{data:freshSave(),warning:'Storage is unavailable. Records will last for this tab.'};}}
export function saveData(data,storage){try{(storage??globalThis.localStorage).setItem(SAVE_KEY,JSON.stringify(data));return true;}catch{return false;}}
export function recordResult(data,result){
 if(!result||!['campaign','endless'].includes(result.mode)||![result.score,result.bestCombo,result.perfects,result.duration,result.completedWave].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e12))return false;
 const r=data.records,key=result.mode==='campaign'?'campaignScore':'endlessScore';r[key]=Math.max(r[key],result.score);r.bestCombo=Math.max(r.bestCombo,result.bestCombo);r.perfects=Math.max(r.perfects,result.perfects);r.longestRun=Math.max(r.longestRun,result.duration);if(result.mode==='endless')r.endlessWave=Math.max(r.endlessWave,Math.min(9999,Math.floor(result.completedWave)));data.endlessUnlocked=true;return true;
}
