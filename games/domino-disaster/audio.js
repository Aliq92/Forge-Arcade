export class Audio {
  constructor(){this.enabled=false;this.volume=.35;this.ctx=null;this.voices=0;this.last=0;}
  unlock(){if(!this.enabled)return;try{this.ctx??=new (globalThis.AudioContext||globalThis.webkitAudioContext)();this.ctx.resume();}catch{}}
  play(events){if(!this.enabled||!this.ctx||this.voices>=8)return;const t=this.ctx.currentTime;for(const e of events){if(t-this.last<.045)continue;const f=({domino:340,collision:220,rolling:150,spring:700,gear:430,seesaw:290,switch:800,finish:1000,success:1250})[e.type];if(!f)continue;this.last=t;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=e.type==='gear'?'triangle':'sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.65,t+.12);g.gain.setValueAtTime(this.volume*.1,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(this.ctx.destination);this.voices++;o.onended=()=>this.voices--;o.start(t);o.stop(t+.17);}}
}
