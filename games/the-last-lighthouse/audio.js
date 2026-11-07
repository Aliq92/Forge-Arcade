(function (root) {
  'use strict';
  // No context, sources, or sound are created until the caller supplies a gesture.
  class Audio {
    constructor({ enabled = false } = {}) {
      this.enabled = Boolean(enabled);
      this._context = null;
      this._nodes = [];
      this._voices = new Set();
      this._disposed = false;
      this._storm = 0;
      this._beam = false;
    }
    get context() { return this._context; }
    wake() {
      if (!this.enabled || this._disposed) return;
      try {
        if (!this._context) this._build();
        const pending = this._context?.resume();
        pending?.catch(() => {});
      } catch { /* Optional sound never blocks the rescue. */ }
    }
    _build() {
      const Context = root.AudioContext || root.webkitAudioContext;
      if (!Context) return;
      const context = this._context = new Context();
      const master = this._master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      // A single cached, gently filtered loop provides both sea and wind.
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 4), context.sampleRate);
      const samples = buffer.getChannelData(0);
      let random = 9137, smooth = 0;
      for (let i = 0; i < samples.length; i++) {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        smooth = smooth * 0.94 + (random / 2147483648 - 1) * 0.06;
        samples[i] = smooth * 2.5;
      }
      const sea = context.createBufferSource();
      sea.buffer = buffer; sea.loop = true;
      const filter = this._filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 550; filter.Q.value = 0.4;
      const seaGain = this._seaGain = context.createGain(); seaGain.gain.value = 0.13;
      sea.connect(filter); filter.connect(seaGain); seaGain.connect(master);
      const motor = context.createOscillator(); motor.type = 'sine'; motor.frequency.value = 54;
      const motorGain = this._motorGain = context.createGain(); motorGain.gain.value = 0;
      motor.connect(motorGain); motorGain.connect(master);
      this._nodes = [sea, filter, seaGain, motor, motorGain, master];
      sea.start(); motor.start();
      this.setIntensity(this._storm, this._beam);
    }
    sleep() {
      try { this._context?.suspend()?.catch(() => {}); } catch {}
    }
    setEnabled(value) {
      this.enabled = Boolean(value);
      if (this.enabled) this.wake(); else this.sleep();
    }
    setIntensity(storm, beamOn) {
      this._storm = Number.isFinite(storm) ? Math.max(0, Math.min(1, storm)) : 0;
      this._beam = Boolean(beamOn);
      const context = this._context;
      if (!context || this._disposed || !this._seaGain) return;
      try {
        const now = context.currentTime;
        this._seaGain.gain.setTargetAtTime(0.11 + this._storm * 0.15, now, 0.8);
        this._filter.frequency.setTargetAtTime(450 + this._storm * 950, now, 1);
        this._motorGain.gain.setTargetAtTime(this._beam ? 0.035 : 0.008, now, 0.3);
      } catch {}
    }
    _note(frequency, delay, duration, volume, type = 'sine') {
      const context = this._context;
      if (!this.enabled || this._disposed || context?.state !== 'running') return;
      try {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const at = context.currentTime + delay;
        oscillator.type = type; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain); gain.connect(this._master);
        const voice = { oscillator, gain };
        this._voices.add(voice);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this._voices.delete(voice); };
        oscillator.start(at); oscillator.stop(at + duration + 0.04);
      } catch {}
    }
    cue(type) {
      // Cues never wake the context: the UI owns user-gesture authorization.
      if (type === 'toggle') this._note(165, 0, 0.09, 0.10, 'triangle');
      else if (type === 'spawn') { this._note(293.66, 0, 0.25, 0.10); this._note(440, 0.13, 0.35, 0.08); }
      else if (type === 'rescue') [392, 493.88, 587.33].forEach((f, i) => this._note(f, i * 0.12, 0.8, 0.11));
      else if (type === 'warning') { this._note(220, 0, 0.18, 0.10, 'triangle'); this._note(220, 0.26, 0.18, 0.08, 'triangle'); }
      else if (type === 'loss') [196, 164.81, 130.81].forEach((f, i) => this._note(f, i * 0.17, 0.7, 0.10));
      else if (type === 'victory') [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => this._note(f, i * 0.22, 2.3, 0.10));
      else if (type === 'gameover') [196, 146.83, 130.81].forEach((f, i) => this._note(f, i * 0.32, 1.8, 0.09));
    }
    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      for (const voice of this._voices) {
        try { voice.oscillator.onended = null; voice.oscillator.stop(); } catch {}
        try { voice.oscillator.disconnect(); voice.gain.disconnect(); } catch {}
      }
      this._voices.clear();
      for (const node of this._nodes) { try { node.stop?.(); } catch {} try { node.disconnect(); } catch {} }
      this._nodes = [];
      try { this._context?.close()?.catch(() => {}); } catch {}
    }
  }
  root.LastLighthouseAudio = { Audio };
  if (typeof module === 'object' && module.exports) module.exports = { Audio };
})(typeof globalThis !== 'undefined' ? globalThis : this);
