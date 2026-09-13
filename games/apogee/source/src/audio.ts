export class AudioSystem {
 private ctx:AudioContext|null=null; private engine:AudioBufferSourceNode|null=null; private engineGain:GainNode|null=null;private pad:OscillatorNode|null=null;private padGain:GainNode|null=null;
 sfx=true;music=false;
 unlock(){try{if(!this.ctx){this.ctx=new AudioContext();const c=this.ctx,buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.engine=c.createBufferSource();this.engine.buffer=buffer;this.engine.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;this.engineGain=c.createGain();this.engineGain.gain.value=0;this.engine.connect(filter).connect(this.engineGain).connect(c.destination);this.engine.start();this.pad=c.createOscillator();this.pad.frequency.value=55;this.pad.type='sine';this.padGain=c.createGain();this.padGain.gain.value=0;this.pad.connect(this.padGain).connect(c.destination);this.pad.start();}void this.ctx.resume();}catch{/* Audio is optional. */}}
 update(burning:boolean,altitude:number,paused=false){if(!this.ctx)return;this.engineGain?.gain.setTargetAtTime(this.sfx&&burning&&!paused?.085:0,this.ctx.currentTime,.12);this.padGain?.gain.setTargetAtTime(this.music&&!paused?.025:0,this.ctx.currentTime,.6);if(this.pad)this.pad.frequency.setTargetAtTime(55+Math.min(100,altitude/2000),this.ctx.currentTime,1);}
 tone(kind:'ui'|'launch'|'separate'|'perfect'|'explode'|'achievement'){
  if(!this.sfx||!this.ctx)return;const c=this.ctx,now=c.currentTime;
  const frequencies={ui:[400],launch:[70,105],separate:[160,65],perfect:[110,440,660],explode:[55,35],achievement:[330,440,660,880]}[kind];
  frequencies.forEach((hz,i)=>{const o=c.createOscillator(),gain=c.createGain();o.type=kind==='explode'?'sawtooth':'sine';o.frequency.setValueAtTime(hz,now+i*.065);o.frequency.exponentialRampToValueAtTime(Math.max(20,hz*.5),now+i*.065+.3);gain.gain.setValueAtTime(0,now);gain.gain.setValueAtTime(.09,now+i*.065);gain.gain.exponentialRampToValueAtTime(.001,now+i*.065+.4);o.connect(gain).connect(c.destination);o.start(now+i*.065);o.stop(now+i*.065+.42);});
 }
}
