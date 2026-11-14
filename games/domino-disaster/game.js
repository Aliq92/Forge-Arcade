import { Simulation } from './gadgets.js';
import { Editor,copy } from './editor.js';
export class Game {
  constructor(board,{sandbox=false}={}){this.editor=new Editor(board);this.sandbox=sandbox;this.state='build';this.speed=1;this.accumulator=0;this.record=null;this.sim=null;this.result=null;this.replayTime=0;this.awarded=false;}
  get board(){return this.editor.board;}
  get scene(){if(this.state.startsWith('replay')&&this.record){const frames=this.record.frames;if(this.replayTime>=this.record.duration)return frames.at(-1);let i=frames.length-1;while(i>0&&frames[i].time>this.replayTime+1e-8)i--;return frames[i];}return this.state==='build'?null:this.sim;}
  edit(action){return this.state==='build'?this.editor.act(action):{ok:false,message:'Choose Edit Setup to make changes.'};}
  push(){
    const sim=new Simulation(copy(this.board)),started=sim.start();if(!started.ok)return started;
    this.sim=sim;this.state='running';this.accumulator=0;this.result=null;this.awarded=false;
    this.record={version:1,initial:copy(this.board),seed:this.board.seed,triggerStep:0,frames:[sim.snapshot()],duration:0,outcome:null};return {ok:true};
  }
  advance(delta){
    if(!Number.isFinite(delta)||delta<0)return;
    if(this.state==='replay'){this.replayTime=Math.min(this.record.duration,this.replayTime+Math.min(.25,delta)*this.speed);if(this.replayTime>=this.record.duration)this.state='replayPaused';return;}
    if(this.state!=='running')return;
    this.accumulator=Math.min(.25,this.accumulator+Math.min(.25,delta)*this.speed);
    let n=0;while(this.accumulator>=1/120&&n++<32&&this.state==='running'){
      this.sim.step();this.accumulator-=1/120;
      if(this.sim.stepCount%8===0&&this.record.frames.length<901)this.record.frames.push(this.sim.snapshot());
      if(['success','stopped'].includes(this.sim.status)){
        this.state=this.sim.status;this.record.duration=this.sim.time;this.record.outcome=this.sim.status;
        const last=this.sim.snapshot();if(this.record.frames.length>=901)this.record.frames[900]=last;else if(this.record.frames.at(-1).time!==last.time)this.record.frames.push(last);
        const used=this.editor.count,budget=this.board.starBudget||{};
        this.result={levelId:this.board.id,stars:this.sandbox||this.state!=='success'?0:used<=budget.three?3:used<=budget.two?2:1,used,duration:this.sim.time,triggered:this.sim.activated.size};
      }
    }
  }
  pause(){if(this.state==='running')this.state='paused';else if(this.state==='replay')this.state='replayPaused';}
  resume(){if(this.state==='paused')this.state='running';else if(this.state==='replayPaused')this.state='replay';}
  returnBuild(){this.state='build';this.accumulator=0;}
  restartSim(){return this.push();}
  replay(){if(!this.record?.frames.length)return false;this.replayTime=0;this.state='replay';return true;}
  seek(seconds){if(!this.record)return;this.replayTime=Math.max(0,Math.min(this.record.duration,Math.round(seconds*15)/15));this.state='replayPaused';}
  setSpeed(value){if([.25,.5,1,2].includes(Number(value)))this.speed=Number(value);}
}
