import {Game} from '../js/game.js';
export function makeGame(id=1,stored={}){
 const memory=new Map(Object.entries(stored));
 globalThis.window={addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false})};
 globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
 const game=new Game({width:960,height:540});game.loadLevel(id);return {game,memory};
}
export const neutral=()=>({left:false,right:false,jumpPressed:false,jumpHeld:false,interactPressed:false});
export function tick(game,input={}){game.input.sampleTick=()=>({...neutral(),...input});game._tick();}
