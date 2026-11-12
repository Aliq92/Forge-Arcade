import {allocate,advanceBatteries,connectionError,validateNetwork} from './network.js';
export const clone=value=>JSON.parse(JSON.stringify(value));
const message=text=>({ok:false,message:text});
const buildingDefaults={house:3,apartment:4,market:5,shop:3,tram:6,factory:7,public:4};
export class Game{
 constructor(board,mode='level'){this.mode=mode;this.initial=clone(board);this.reset();}
 reset(){this.board=clone(this.initial);this.history=[];this.sequence=0;this.running=false;this.paused=false;this.completed=false;this.stableTime=0;this.elapsed=0;this.accumulator=0;this.hadOverload=false;this.recalculations=0;this.recalculate();}
 recalculate(){this.allocation=allocate(this.board);this.hadOverload ||= this.allocation.warnings.length>0;this.recalculations++;return this.allocation;}
 get required(){return this.board.objectives?.required||[];}
 get supplied(){return this.required.every(id=>this.allocation.served[id]===true);}
 get safe(){return !this.allocation.warnings.length;}
 get ready(){return this.mode==='level'&&this.required.length>0&&this.supplied&&(!this.board.objectives?.noOverload||this.safe)&&this.stableTime+1e-7>=(this.board.objectives?.holdSeconds||0);}
 get stars(){if(!this.ready)return 0;return 1+ +(!this.hadOverload&&this.safe)+ +(!this.hadOverload&&this.safe&&this.board.edges.length<=this.board.starBudget);}
 id(prefix){let id;do{id=prefix+(++this.sequence);}while(this.board.nodes.some(n=>n.id===id)||this.board.edges.some(e=>e.id===id));return id;}
 act(action){
  if(this.paused||this.completed)return message('Resume or replay the district before editing.');
  if(action.type==='wait'){if(!Number.isFinite(action.seconds)||action.seconds<=0||action.seconds>60)return message('Wait must be between 0 and 60 active seconds.');this.running=true;for(let t=0;t<action.seconds-1e-8&&this.running;t+=.1)this.tick(Math.min(.1,action.seconds-t));return {ok:true,message:'Simulation advanced.'};}
  const before=clone(this.board);let result={ok:true,message:'Connection made.'};
  if(action.type==='cable'){
   const error=connectionError(this.board,action.from,action.to);if(error)return message(error);
   this.board.edges.push({id:this.id('wire'),from:action.from,to:action.to,capacity:this.board.constraints?.cableCapacity||8,enabled:true,damaged:false,removable:true});
  }else if(action.type==='remove-edge'){
   const e=this.board.edges.find(e=>e.id===action.id);if(!e)return message('Select a cable first.');if(e.removable===false)return message('This fixed cable stays in the district. Route another connection around it.');this.board.edges=this.board.edges.filter(e=>e.id!==action.id);result.message='Cable removed.';
  }else if(action.type==='toggle-edge'){
   const e=this.board.edges.find(e=>e.id===action.id);if(!e||e.damaged)return message('Damaged cables cannot carry power. Build a route around them.');e.enabled=!e.enabled;result.message=e.enabled?'Branch connected.':'Branch isolated.';
  }else if(action.type==='switch'){
   const n=this.board.nodes.find(n=>n.id===action.id);if(n?.type!=='switch')return message('Select a switch node.');n.closed=action.closed===undefined?!n.closed:!!action.closed;result.message=n.closed?'Switch closed.':'Switch open.';
  }else if(action.type==='battery'){
   const n=this.board.nodes.find(n=>n.id===action.id);if(n?.type!=='battery'||!['off','charge','support'].includes(action.mode))return message('Select a battery and its mode.');n.mode=action.mode;result.message=`Battery: ${n.mode}. Energy changes only while simulation runs.`;
  }else if(action.type==='place'){
   if(this.mode!=='sandbox')return message('Components are fixed in puzzles; use Sandbox to place your own.');
   const type=action.kind,x=Math.round(action.x*2)/2,y=Math.round(action.y*2)/2;if(!['generator','substation','switch','battery','building'].includes(type))return message('Choose a component to place.');
   if(this.board.nodes.length>=48)return message('This city has reached its 48-component limit.');if(!Number.isFinite(x)||!Number.isFinite(y)||x<.5||y<.5||x>this.board.width-.5||y>this.board.height-.5)return message('Place the component on the city platform.');
   if(this.board.nodes.some(n=>Math.hypot(n.x-x,n.y-y)<1.3))return message('Leave a little space between components.');if(this.board.obstacles?.some(o=>x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h))return message('That patch is reserved. Choose another place.');
   const n={id:this.id('node'),type,x,y,name:type[0].toUpperCase()+type.slice(1),district:'Your city'};
   if(type==='building'){n.style=Object.hasOwn(buildingDefaults,action.style)?action.style:'house';n.demand=buildingDefaults[n.style];n.name=n.style[0].toUpperCase()+n.style.slice(1);n.priority=this.board.nodes.filter(n=>n.type==='building').length;}
   if(type==='generator')n.capacity=16;if(type==='substation'||type==='switch')n.capacity=12;if(type==='switch')n.closed=true;
   if(type==='battery')Object.assign(n,{energy:0,maxEnergy:24,chargeRate:4,dischargeRate:4,mode:'off'});this.board.nodes.push(n);result.message=`${n.name} placed.`;
  }else if(action.type==='remove-node'){
   if(this.mode!=='sandbox')return message('Puzzle components stay in place. Cables can be removed.');if(!this.board.nodes.some(n=>n.id===action.id))return message('Select a component.');this.board.nodes=this.board.nodes.filter(n=>n.id!==action.id);this.board.edges=this.board.edges.filter(e=>e.from!==action.id&&e.to!==action.id);result.message='Component and its cables removed.';
  }else return message('That action is not available.');
  const validation=validateNetwork(this.board);if(!validation.ok){this.board=before;return message(validation.errors[0]||'The layout is not valid.');}
  this.history.push(before);if(this.history.length>100)this.history.shift();this.running=false;this.stableTime=0;this.accumulator=0;this.recalculate();return result;
 }
 undo(){
  if(!this.history.length||this.paused||this.completed)return false;const energy=new Map(this.board.nodes.filter(n=>n.type==='battery').map(n=>[n.id,n.energy]));this.board=this.history.pop();
  for(const n of this.board.nodes)if(n.type==='battery'&&energy.has(n.id))n.energy=Math.max(0,Math.min(n.maxEnergy,energy.get(n.id)));
  this.running=false;this.stableTime=0;this.accumulator=0;this.recalculate();return true;
 }
 startTest(){if(this.paused||this.completed)return false;this.running=!this.running;this.accumulator=0;return this.running;}
 tick(dt){
  if(!this.running||this.paused||this.completed||!Number.isFinite(dt)||dt<=0)return false;this.accumulator+=Math.min(dt,.25);let changed=false;
  while(this.accumulator>=.1-1e-8){
   this.accumulator=Math.max(0,this.accumulator-.1);this.elapsed+=.1;
   const batteries=this.board.nodes.some(n=>n.type==='battery'&&n.mode!=='off');
   if(batteries){this.allocation=advanceBatteries(this.board,.1);this.recalculations++;changed=true;}
   if(this.allocation.warnings.length)this.hadOverload=true;
   const stable=this.supplied&&(!this.board.objectives?.noOverload||this.safe);
   this.stableTime=stable?this.stableTime+.1:0;
   if(this.mode==='level'&&this.ready){this.running=false;this.accumulator=0;break;}
  }
  return changed;
 }
 complete(){if(!this.ready||this.completed)return null;const result={levelId:this.board.id,stars:this.stars,objectives:['powered',...(this.safe?['no-overload']:[]),...((this.board.objectives?.holdSeconds||0)>0?['stable']:[])]};this.completed=true;this.running=false;return result;}
}
