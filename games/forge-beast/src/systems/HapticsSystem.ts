export type HapticEvent = 'confirm' | 'alert' | 'evolution' | 'attack' | 'critical' | 'victory';
export const HAPTIC_PATTERNS: Record<HapticEvent, number | number[]> = { confirm: 8, alert: 12, evolution: [12, 30, 18], attack: 6, critical: [12, 20, 12], victory: [8, 25, 8, 25, 12] };
export class DeviceHaptics {
  private active = false;
  private paused = false;
  private allowed = false;
  constructor(
    private vibrate: ((pattern: number | number[]) => boolean) | null = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? p => navigator.vibrate(p) : null,
    private reducedMotion: () => boolean = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  ) {}
  get enabled() { return this.allowed; }
  set enabled(value: boolean) { this.allowed = value; if (!value) this.cancel(); }
  play(event: HapticEvent) {
    if (this.paused || !this.allowed || !this.vibrate || this.reducedMotion()) return false;
    try { this.active = this.vibrate(HAPTIC_PATTERNS[event]); return this.active; }
    catch { return false; }
  }
  private cancel() { if (this.active) { try { this.vibrate?.(0); } catch {} } this.active = false; }
  pause() { this.paused = true; this.cancel(); }
  resume() { this.paused = false; }
  destroy() { this.pause(); }
}
