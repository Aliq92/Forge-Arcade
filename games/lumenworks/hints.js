import {Game,clone} from './game.js';
import {advanceBatteries,connectionError} from './network.js';

// Read-only advice: reference steps are checked against the player's current city.
const pair=e=>`${e.from}|${e.to}`;
function describe(board,action){
 const name=id=>board.nodes.find(n=>n.id===id)?.name||id;
 if(action.type==='cable')return{kind:'cable',from:action.from,to:action.to,action,message:`Connect ${name(action.from)} → ${name(action.to)}. Start at the highlighted source port and end at the destination.`};
 if(action.type==='switch')return{kind:'switch',nodeId:action.id,action,message:`${action.closed?'Close':'Open'} ${name(action.id)} using the Switch tool or its notebook control.`};
 if(action.type==='battery')return{kind:'battery',nodeId:action.id,action,message:`Set ${name(action.id)} to ${action.mode[0].toUpperCase()+action.mode.slice(1)} using its notebook control.`};
 const edge=board.edges.find(e=>e.id===action.id);
 if(action.type==='toggle-edge')return{kind:'edge',edgeId:edge.id,from:edge.from,to:edge.to,action,message:`Reconnect the isolated cable ${name(edge.from)} → ${name(edge.to)}. Inspect that cable and choose Reconnect cable.`};
 return{kind:'edge',edgeId:edge.id,from:edge.from,to:edge.to,action,message:`Remove the cable ${name(edge.from)} → ${name(edge.to)} to make room for the suggested route. Inspect it and choose Remove cable.`};
}
function pending(board,reference){
 const actions=[];
 for(const a of reference||[]){
  if(a.type==='wait')continue;
  if(a.type==='cable'){
   const edge=board.edges.find(e=>e.from===a.from&&e.to===a.to);
   if(!edge)actions.push({...a});
   else if(edge.damaged&&edge.removable!==false)actions.push({type:'remove-edge',id:edge.id});
   else if(!edge.damaged&&edge.enabled===false)actions.push({type:'toggle-edge',id:edge.id});
  }else if(a.type==='switch'&&board.nodes.find(n=>n.id===a.id)?.closed!==a.closed)actions.push({...a});
  else if(a.type==='battery'&&board.nodes.find(n=>n.id===a.id)?.mode!==a.mode)actions.push({...a});
  else if(a.type==='remove-edge'&&board.edges.some(e=>e.id===a.id))actions.push({...a});
 }
 return actions;
}
function preview(game,action){const trial=new Game(game.board,game.mode);const result=trial.act(action);return result.ok?trial:null;}
function reserveCanHold(game,seconds){
 if(!game.board.nodes.some(n=>n.type==='battery'&&n.mode==='support'))return true;
 const board=clone(game.board);
 for(let t=0;t<seconds-1e-8;t+=.1){const state=advanceBatteries(board,Math.min(.1,seconds-t));if(game.required.some(id=>!state.served[id])||game.board.objectives.noOverload&&state.warnings.length)return false;}
 return true;
}
export function nextHint(game){
 const board=game.board;
 if(game.completed||game.ready)return{kind:'complete',message:'Every required building is supplied. Choose Complete district to collect your stars.'};
 if(game.paused)return{kind:'info',message:'Resume the city to continue connecting.'};
 if(game.mode==='sandbox'){
  const candidates=[];
  for(const from of board.nodes.filter(n=>n.type!=='building'))for(const to of board.nodes.filter(n=>n.type!=='generator'&&n.id!==from.id)){
   if(connectionError(board,from.id,to.id))continue;
   const action={type:'cable',from:from.id,to:to.id},trial=preview(game,action);if(!trial||trial.allocation.warnings.length)continue;
   const gain=trial.allocation.totalServed-game.allocation.totalServed;
   if(gain>0||from.type==='generator'&&to.type==='substation'&&!board.edges.some(e=>e.to===to.id))candidates.push({action,score:gain});
  }
  candidates.sort((a,b)=>b.score-a.score);return candidates.length?describe(board,candidates[0].action):{kind:'info',message:game.allocation.warnings.length?'Inspect the highlighted bottlenecks. Add source or route capacity, or remove an optional load.':'Place an unpowered building and a generator or hub with spare capacity, then ask for another connection hint.'};
 }
 const hold=Math.max(0,(board.objectives?.holdSeconds||0)-game.stableTime);
 if(game.supplied&&game.safe){
  if(!reserveCanHold(game,hold))return{kind:'reset',message:'The reserve energy is too low for the remaining stability check. Reset this district to restore its starting reserve, then reconnect before running the check.'};
  return{kind:'wait',action:{type:'wait',seconds:hold},message:game.running?`Keep this layout steady. ${hold.toFixed(1)} seconds remain in the stability check.`:`Connections are ready. Press Start stability check and maintain supply for ${hold.toFixed(1)} seconds.`};
 }
 const actions=pending(board,board.solution);
 // Prefer a safe, useful authored step even when the player built later links first.
 const trials=actions.map(action=>({action,trial:preview(game,action)}));
 const safe=trials.find(t=>t.trial&&!t.trial.allocation.warnings.length);
 if(safe)return describe(board,safe.action);
 const reference=new Set((board.solution||[]).filter(a=>a.type==='cable').map(pair));
 const extra=board.edges.find(e=>e.removable!==false&&!reference.has(pair(e)));
 if(extra)return describe(board,{type:'remove-edge',id:extra.id});
 const repair=trials.find(t=>t.trial&&t.trial.allocation.totalServed>game.allocation.totalServed);
 if(repair)return describe(board,repair.action);
 if(board.nodes.some(n=>n.type==='battery'&&n.energy<n.maxEnergy))return{kind:'reset',message:'The reserve cannot supply this layout for the required check. Reset the district to restore its energy, then follow the connection hints before starting simulation.'};
 return{kind:'reset',message:'This layout needs a fresh route. Use Reset, then follow each named connection hint. Your earned stars stay saved.'};
}
