import { SOUNDS, type SoundEvent } from '../data/sounds';
export type { SoundEvent } from '../data/sounds';
export class DeviceAudio {
  private context?: AudioContext;
  private tones = new Map<OscillatorNode, GainNode>();
  private silent = false;
  private paused = false;
  private unlocked: boolean;
  constructor(private createContext: () => AudioContext = () => new AudioContext(), unlocked = true) { this.unlocked = unlocked; }
  unlock() { this.unlocked = true; }
  lock() { this.unlocked = false; }
  pause() {
    this.paused = true; this.stopTones();
    try { void this.context?.suspend?.().catch(() => {}); } catch { /* Unsupported audio is optional. */ }
  }
  resume() { this.paused = false; }
  get muted() { return this.silent; }
  set muted(value: boolean) {
    this.silent = value;
    if (value) this.stopTones();
  }
  play(event: SoundEvent, delay = 0) {
    if (this.silent || this.paused || !this.unlocked) return;
    try {
      this.context ??= this.createContext();
      void this.context.resume().catch(() => {});
      const sound = SOUNDS[event];
      sound.notes.forEach((frequency, index) => {
        const tone = this.context!.createOscillator();
        const gain = this.context!.createGain();
        const start = this.context!.currentTime + delay + index * sound.gap;
        tone.type = 'square'; tone.frequency.value = frequency;
        gain.gain.setValueAtTime(sound.volume, start);
        gain.gain.exponentialRampToValueAtTime(.001, start + sound.duration);
        tone.connect(gain); gain.connect(this.context!.destination);
        this.tones.set(tone, gain);
        tone.onended = () => { this.tones.delete(tone); tone.disconnect(); gain.disconnect(); };
        tone.start(start); tone.stop(start + sound.duration);
      });
    } catch { /* Unsupported/blocked audio must never interrupt care. */ }
  }
  private stopTones() {
    for (const [tone, gain] of this.tones) {
      tone.onended = null;
      try { tone.stop(); tone.disconnect(); gain.disconnect(); } catch { /* Already-ended nodes are harmless. */ }
    }
    this.tones.clear();
  }
  destroy() { this.stopTones(); void this.context?.close().catch(() => {}); this.context = undefined; }
}
