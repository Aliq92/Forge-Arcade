// Real controller actions only: no entity teleportation, door flags or trigger edits.
import {movingPlatformRectAt} from '../js/objects.js';
export function solveRoom(g,id,{hesitation=0}={}){
 const trace=[];let totalTicks=0;
 const info=()=>JSON.stringify({id,x:g.player.x,y:g.player.y,tick:g.attemptTick,standing:g.player.standingOn,echoes:g.echoes.length,state:g.state});
 const step=(input={},count=1)=>{
  const snapshot={left:false,right:false,jumpPressed:false,jumpHeld:false,interactPressed:false,...input};
  for(let i=0;i<count&&g.state==='playing';i++){
   const attempt=g.attemptCount;g.input.sampleTick=()=>({...snapshot});g._tick();trace.push({type:'input',...snapshot});totalTicks++;
   if(g.attemptCount!==attempt)throw Error('Unexpected reset '+info());
  }
 };
 const walk=x=>{for(let n=0;n<600&&g.state==='playing';n++){
  const d=x-g.player.x;if(Math.abs(d)<8&&Math.abs(g.player.vx)<30){step({},5);return;}
  step({left:d<-8,right:d>8});
 }if(g.state==='playing')throw Error('Walk failed target '+x+' '+info());};
 const wait=(predicate,max=720)=>{for(let n=0;n<max&&g.state==='playing';n++){if(predicate())return;step();}if(g.state==='playing')throw Error('Wait failed '+info());};
 const jump=(x,settle=true)=>{
  step({left:x<g.player.x,right:x>g.player.x,jumpPressed:true,jumpHeld:true});
  for(let n=0;n<130&&g.state==='playing';n++){
   if(g.player.grounded){if(settle)walk(x);return;}
   const d=x-g.player.x;step({left:d<-8,right:d>8,jumpHeld:true});
  }
  if(g.state==='playing')throw Error('Jump failed '+info());
 };
 const start=()=>{g.toggleRecording();trace.push({type:'record'});};
 const stop=()=>{g.toggleRecording();trace.push({type:'record'});for(let i=0;i<11;i++)g.update(.05);trace.push({type:'rewind'});if(hesitation)step({},hesitation);};
 const echoAt=(x,route=null)=>{start();route?route():walk(x);step({},10);stop();};
 const interact=()=>{step({interactPressed:true});step();};
 const crossing=(left,threshold,target)=>{walk(left);jump(left+110,false);step({},6);const mp=g.levelDef.movingPlatforms[0];wait(()=>movingPlatformRectAt(mp,g.attemptTick).x>=mp.points[1].x-20);jump(target);};
 switch(id){
 case 1:walk(900);break;
 case 2:walk(260);jump(390);walk(590);jump(765);walk(900);break;
 case 3:echoAt(205);walk(900);break;
 case 4:echoAt(410,()=>{walk(310);jump(410);});walk(900);break;
 case 5:echoAt(210,()=>{walk(210);interact();});walk(900);break;
 case 6:crossing(250,590,900);break;
 case 7:echoAt(240);echoAt(480);walk(900);break;
 case 8:echoAt(240);echoAt(620,()=>{walk(435);interact();walk(620);});walk(900);break;
 case 9:echoAt(220);echoAt(640);walk(900);break;
 case 10:echoAt(280);walk(565);interact();walk(900);break;
 case 11:echoAt(450);walk(900);break;
 case 12:echoAt(470,()=>{walk(155);interact();walk(470);});walk(900);break;
 case 13:echoAt(220);echoAt(420);echoAt(620);walk(900);break;
 case 14:echoAt(720,()=>crossing(260,635,720));echoAt(970,()=>crossing(260,635,970));crossing(260,635,1155);interact();walk(1360);break;
 case 15:echoAt(220);walk(900);break;
 case 16:echoAt(200);walk(300);jump(395);wait(()=>g.player.y+g.player.h<=305);walk(900);break;
 case 17:echoAt(215);echoAt(485);walk(900);break;
 case 18:echoAt(210,()=>{walk(210);interact();});walk(500);jump(670);walk(900);break;
 case 19:echoAt(215);echoAt(515);crossing(590,925,1105);interact();walk(1350);break;
 default:throw Error('Missing solution '+id);
 }
 if(g.state!=='roomComplete')throw Error('Incomplete '+info());
 return {id,ticks:totalTicks,echoes:g.recorder.echoes.length,seconds:g.completeStats.timeSec,trace};
}
