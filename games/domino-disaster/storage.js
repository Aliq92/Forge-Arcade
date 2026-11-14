import { validateBoard } from './gadgets.js';
const KEY='domino-disaster-save-v1';
export const defaults=()=>({version:1,stars:Array(12).fill(0),best:Array(12).fill(null),settings:{sound:false,volume:.35,reduced:false,quality:'high'},layouts:[]});
export function parseLayout(text){if(typeof text!=='string'||text.length>200000)throw Error('Layout is too large.');const b=JSON.parse(text);const check=validateBoard(b);if(!check.ok)throw Error(check.errors.join(' '));if(b.id!=='sandbox')throw Error('Import a Sandbox layout.');return structuredClone(b);}
export class Store {
  constructor(storage){this.data=defaults();this.error='';try{this.storage=storage===undefined?globalThis.localStorage:storage;}catch{this.storage=null;this.error='Storage is unavailable. You can play and export layouts.';}this.load();}
  load(){try{const raw=this.storage?.getItem(KEY);if(!raw)return;const v=JSON.parse(raw);if(v.version!==1)return;
    this.data.stars=this.data.stars.map((_,i)=>Number.isInteger(v.stars?.[i])&&v.stars[i]>=0&&v.stars[i]<=3?v.stars[i]:0);
    this.data.best=this.data.best.map((_,i)=>{const b=v.best?.[i];return b&&Number.isFinite(b.used)&&b.used>=0&&Number.isFinite(b.duration)&&b.duration>=0?{used:b.used,duration:b.duration}:null;});
    const s=v.settings||{};this.data.settings={sound:s.sound===true,volume:Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):.35,reduced:s.reduced===true,quality:s.quality==='low'?'low':'high'};
    this.data.layouts=(Array.isArray(v.layouts)?v.layouts:[]).slice(0,3).flatMap(l=>{try{return [{name:String(l.name).slice(0,32),board:parseLayout(JSON.stringify(l.board))}];}catch{return [];}});
  }catch{this.error='Saved data could not be read. You can keep playing.';}}
  save(){try{if(!this.storage)throw Error('Unavailable');this.storage.setItem(KEY,JSON.stringify(this.data));this.error='';return true;}catch{this.error='Storage is unavailable or full. Export your layout to keep it.';return false;}}
  award(result){const i=Number(result.levelId)-1;if(i<0||i>=12||!result.stars)return false;this.data.stars[i]=Math.max(this.data.stars[i],result.stars);const b=this.data.best[i];if(!b||result.used<b.used||result.used===b.used&&result.duration<b.duration)this.data.best[i]={used:result.used,duration:result.duration};return this.save();}
  unlocked(i){return i===0||this.data.stars[i-1]>0;}
  saveLayout(name,board){const valid=parseLayout(JSON.stringify(board));name=String(name).trim().slice(0,32)||'My machine';const i=this.data.layouts.findIndex(l=>l.name===name);if(i<0&&this.data.layouts.length>=3)throw Error('Three save slots are full. Reuse a name to replace a layout.');const entry={name,board:valid};if(i<0)this.data.layouts.push(entry);else this.data.layouts[i]=entry;return this.save();}
}
