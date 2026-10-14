// Optional synthesized ambience. No audio assets or network requests.
export class LabAudio {
  constructor() {
    this.context = null;
    this.enabled = false;
  }
  async setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled && !this.context) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.context = new C();
      this.master = this.context.createGain();
      this.master.gain.value = 0.025;
      this.master.connect(this.context.destination);
      for (const frequency of [55, 82.41, 110.1]) {
        const osc = this.context.createOscillator(),
          gain = this.context.createGain();
        osc.type = "sine";
        osc.frequency.value = frequency;
        gain.gain.value = 0.22;
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
      }
    }
    if (this.context) {
      if (enabled) await this.context.resume();
      else await this.context.suspend();
    }
  }
  ping(power) {
    if (!this.enabled || !this.context) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(
      {
        TOUCH: 90,
        LIGHT: 520,
        RAIN: 280,
        MUTATE: 370,
        DISTORT: 150,
        CONFETTI: 780,
      }[power] || 300,
      c.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.45);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(c.currentTime + 0.5);
  }
}
