import {validateNetwork} from './network.js';
import {LEVELS} from './levels.js';
const districtCount=()=>LEVELS.length;
export const SAVE_KEY='lumenworks-save-v1';
export const DEFAULT_SETTINGS=Object.freeze({sound:false,ambient:false,volume:.35,reducedMotion:false,quality:'high'});
export function freshProgress(){return{version:1,unlocked:1,bestStars:Array(districtCount()).fill(0),completedObjectives:{},settings:{...DEFAULT_SETTINGS},sandbox:null};}
export function decodeProgress(text){
 try{
  const value=JSON.parse(text);if(value?.version!==1)return null;const p=freshProgress();
  if(Array.isArray(value.bestStars))p.bestStars=p.bestStars.map((_,i)=>Number.isInteger(value.bestStars[i])&&value.bestStars[i]>=0&&value.bestStars[i]<=3?value.bestStars[i]:0);
  // Unlock only the completed sequential prefix; malformed flags cannot strand a replay.
  let prefix=0;while(prefix<districtCount()&&p.bestStars[prefix]>0)prefix++;p.unlocked=Math.min(districtCount(),prefix+1);
  for(let id=1;id<=districtCount();id++)if(Array.isArray(value.completedObjectives?.[id]))p.completedObjectives[id]=value.completedObjectives[id].filter(v=>['powered','no-overload','stable'].includes(v));
  const s=value.settings||{};p.settings={sound:s.sound===true,ambient:s.ambient===true,volume:Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):.35,reducedMotion:s.reducedMotion===true,quality:s.quality==='low'?'low':'high'};
  if(value.sandbox&&validateNetwork(value.sandbox).ok&&value.sandbox.nodes.length<=48&&value.sandbox.edges.length<=96){p.sandbox=JSON.parse(JSON.stringify(value.sandbox));p.sandbox.id='sandbox';p.sandbox.title='Your Lumenworks';p.sandbox.objectives={required:[]};}
  return p;
 }catch{return null;}
}
export function loadProgress(store){try{const storage=store??globalThis.localStorage,raw=storage.getItem(SAVE_KEY);if(!raw)return{data:freshProgress(),warning:'',fresh:true};const data=decodeProgress(raw);return{data:data||freshProgress(),warning:data?'':'Progress could not be read. You can play from First Light.',fresh:!data};}catch{return{data:freshProgress(),warning:'Storage is unavailable. Play normally; progress lasts for this tab.',fresh:true};}}
export function saveProgress(data,store){try{const storage=store??globalThis.localStorage;storage.setItem(SAVE_KEY,JSON.stringify(data));return true;}catch{return false;}}
export function recordWin(progress,result){const index=result.levelId-1;if(!Number.isInteger(index)||index<0||index>=districtCount()||!Number.isInteger(result.stars)||result.stars<1||result.stars>3)return false;progress.bestStars[index]=Math.max(progress.bestStars[index],result.stars);progress.completedObjectives[result.levelId]=[...new Set([...(progress.completedObjectives[result.levelId]||[]),...(result.objectives||[])].filter(v=>['powered','no-overload','stable'].includes(v)))];let prefix=0;while(prefix<districtCount()&&progress.bestStars[prefix]>0)prefix++;progress.unlocked=Math.min(districtCount(),prefix+1);return true;}
