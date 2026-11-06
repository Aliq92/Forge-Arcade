'use strict';
(() => {
  class TrainAudio {
    constructor(){this.ctx=null;this.nodes=[];this.failed=false;this.on=false;}
    async enable() {
      if(this.failed)return false;
      try {
        if(!this.ctx) {
          const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');
          const c=this.ctx=new Audio();
          this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
          this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=650;this.filter.Q.value=.3;this.filter.connect(this.master);
          const buf=c.createBuffer(1,c.sampleRate*3,c.sampleRate),data=buf.getChannelData(0);const r=WS.rng(3991);let brown=0;
          for(let i=0;i<data.length;i++){brown=(brown+.018*(r()*2-1))/1.018;data[i]=brown*4;}
          this.noise=c.createBufferSource();this.noise.buffer=buf;this.noise.loop=true;
          this.rain=c.createGain();this.rain.gain.value=0;this.noise.connect(this.rain);this.rain.connect(this.filter);
          this.wind=c.createGain();this.wind.gain.value=0;this.noise.connect(this.wind);this.wind.connect(this.filter);
          this.rumble=c.createOscillator();this.rumble.type='sine';this.rumble.frequency.value=48;
          this.train=c.createGain();this.train.gain.value=.06;this.rumble.connect(this.train);this.train.connect(this.master);
          this.rhythm=c.createOscillator();this.rhythm.type='sine';this.rhythm.frequency.value=1.6;
          this.pulse=c.createGain();this.pulse.gain.value=.035;this.rhythm.connect(this.pulse);this.pulse.connect(this.train.gain);
          this.track=c.createBiquadFilter();this.track.type='bandpass';this.track.frequency.value=170;this.track.Q.value=.7;
          this.trackGain=c.createGain();this.trackGain.gain.value=.12;this.noise.connect(this.track);this.track.connect(this.trackGain);this.trackGain.connect(this.train);
          this.nodes=[this.master,this.filter,this.noise,this.rain,this.wind,this.rumble,this.train,this.rhythm,this.pulse,this.track,this.trackGain];
          this.noise.start();this.rumble.start();this.rhythm.start();
        }
        await this.ctx.resume();if(this.ctx.state!=='running')throw Error('unavailable');this.on=true;return true;
      }catch(_){this.failed=true;this.on=false;try{await this.ctx?.close();}catch(_){}return false;}
    }
    update(s) {
      if(!this.ctx||this.failed)return;
      const c=this.ctx,t=c.currentTime;const set=(p,v)=>p.setTargetAtTime(v,t,.25);
      set(this.master.gain,s.sound&&!s.hidden&&s.started?s.volume/100*.65:0);
      set(this.filter.frequency,500+s.opening*38);
      set(this.rain.gain,s.rain*(.2+s.opening*.0015));
      set(this.wind.gain,s.opening*.0016*(s.speed==='paused'?.35:1));
      set(this.train.gain,s.speed==='paused'?0:.065);set(this.pulse.gain,s.speed==='paused'?0:.025);
      set(this.rhythm.frequency,s.speed==='slow'?.9:1.65);
    }
    async hide(){if(this.ctx&&!this.failed) {try {await this.ctx.suspend();}catch(_){}}}
    async show(){if(this.ctx&&this.on&&!this.failed){try {await this.ctx.resume();}catch(_){}}}
  }
  WS.TrainAudio=TrainAudio;
})();
