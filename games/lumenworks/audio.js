// Small procedural cues. No audio context, media request or sound exists until
// an opted-in player triggers a cue/resume through an interaction.
const PATTERNS = {
  connect: [[523.25, 0, .10], [783.99, .055, .14]],
  switch: [[392, 0, .09], [523.25, .065, .10]],
  battery: [[329.63, 0, .12], [493.88, .09, .15]],
  power: [[659.25, 0, .16], [987.77, .07, .19]],
  warning: [[220, 0, .17], [196, .18, .20]],
  victory: [[523.25, 0, .23], [659.25, .16, .24], [783.99, .32, .25], [1046.5, .50, .38]],
};
const bounded = value => Math.max(0, Math.min(1, value));
const ignoreRejection = promise => { if (promise?.catch) promise.catch(() => {}); };

export class AudioEngine {
  constructor(settings = {}) {
    this.context = null;
    this.master = null;
    this.voices = new Set();
    // Eight short cue voices plus at most two optional sustained ambient voices.
    this.ambientVoices = new Set();
    this.settings = { sound: false, ambient: false, volume: .35 };
    this.paused = false;
    this.lastCue = new Map();
    this.configure(settings);
  }

  configure(settings = {}) {
    if (settings && typeof settings === 'object') {
      if (typeof settings.sound === 'boolean') this.settings.sound = settings.sound;
      if (typeof settings.ambient === 'boolean') this.settings.ambient = settings.ambient;
      if (Number.isFinite(settings.volume)) this.settings.volume = bounded(settings.volume);
    }
    if (!this.settings.sound || this.settings.volume === 0) this._silence();
    this._volume();
    this._syncAmbient();
  }

  _volume() {
    if (!this.context || !this.master) return;
    try {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      // Deliberately quiet: master gain remains below 0.14 even at full volume.
      this.master.gain.setValueAtTime(this.settings.sound && !this.paused ? this.settings.volume * .14 : 0, now);
    } catch { /* An unavailable native sound device must not stop the game. */ }
  }

  _ensure() {
    if (!this.settings.sound || this.settings.volume <= 0 || this.paused) return false;
    if (this.context) return true;
    const NativeContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (typeof NativeContext !== 'function') return false;
    try {
      const context = new NativeContext();
      const master = context.createGain();
      master.connect(context.destination);
      this.context = context;
      this.master = master;
      this._volume();
      return true;
    } catch { return false; }
  }

  _stop(voice) {
    this.voices.delete(voice);
    try { voice.oscillator.onended = null; voice.oscillator.stop(); } catch { /* already ended */ }
    try { voice.oscillator.disconnect(); voice.gain.disconnect(); } catch { /* device detached */ }
  }

  _stopAmbient() {
    for (const voice of [...this.ambientVoices]) {
      this.ambientVoices.delete(voice);
      this._stop(voice);
    }
  }

  _syncAmbient() {
    if (!this.context || !this.settings.sound || !this.settings.ambient || this.settings.volume <= 0 || this.paused) {
      this._stopAmbient();
      return;
    }
    if (this.ambientVoices.size) return;
    try {
      // Two soft consonant sine tones suggest the city's distant hum. They use
      // native sustained oscillators, without timers, buffers or noise sources.
      for (const [frequency, amplitude] of [[87.31, .014], [130.81, .008]]) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const voice = { oscillator, gain };
        this.ambientVoices.add(voice);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
        gain.gain.setValueAtTime(0, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(amplitude, this.context.currentTime + .65);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.onended = () => {
          this.ambientVoices.delete(voice);
          try { oscillator.disconnect(); gain.disconnect(); } catch { /* device detached */ }
        };
        oscillator.start();
      }
    } catch { this._stopAmbient(); }
  }

  _silence() {
    for (const voice of [...this.voices]) this._stop(voice);
    this._stopAmbient();
    this.lastCue.clear();
    if (this.context) {
      try { this.master?.gain.setValueAtTime(0, this.context.currentTime); } catch { /* device detached */ }
      try { ignoreRejection(this.context.suspend?.()); } catch { /* browser does not expose suspend */ }
    }
  }

  cue(kind) {
    const name = kind === 'complete' || kind === 'city' || kind === 'objective' ? 'victory' : kind;
    const pattern = Object.hasOwn(PATTERNS, name) ? PATTERNS[name] : null;
    if (!pattern || !this._ensure()) return false;
    const now = this.context.currentTime;
    const previous = this.lastCue.get(name);
    const spacing = name === 'warning' ? 1.2 : name === 'power' ? .08 : 0;
    if (previous !== undefined && now - previous < spacing) return false;
    this.lastCue.set(name, now);
    try { ignoreRejection(this.context.resume?.()); } catch { return false; }
    this._volume();
    this._syncAmbient();
    try {
      for (const [frequency, delay, duration] of pattern) {
        while (this.voices.size >= 8) this._stop(this.voices.values().next().value);
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const voice = { oscillator, gain };
        this.voices.add(voice);
        oscillator.type = name === 'warning' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + delay);
        gain.gain.setValueAtTime(.0001, now + delay);
        gain.gain.linearRampToValueAtTime(name === 'warning' ? .21 : .28, now + delay + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, now + delay + duration);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.onended = () => {
          this.voices.delete(voice);
          try { oscillator.disconnect(); gain.disconnect(); } catch { /* device detached */ }
        };
        oscillator.start(now + delay);
        oscillator.stop(now + delay + duration + .025);
      }
      return true;
    } catch {
      this._silence();
      return false;
    }
  }

  pause() {
    this.paused = true;
    this._silence();
  }

  resume() {
    this.paused = false;
    if (!this._ensure()) return false;
    this._volume();
    this._syncAmbient();
    try { ignoreRejection(this.context.resume?.()); return true; } catch { return false; }
  }
}
