import { TIMING } from '../data/config';
/** Monotonic active clock. Wall timestamps are saved separately for future offline support. */
export class GameClock {
  private timer?: ReturnType<typeof setInterval>;
  private last = 0;
  constructor(private tick: (seconds: number) => void) {}
  resume() {
    if (this.timer) return;
    this.last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - this.last) / 1000, 1);
      this.last = now;
      this.tick(dt);
    }, TIMING.tickMs);
  }
  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
  destroy() {
    this.pause();
  }
}

