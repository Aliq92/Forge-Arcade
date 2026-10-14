import { DT } from "./world.js";
export class SimulationClock {
  constructor() {
    this.accumulator = 0;
  }
  reset() {
    this.accumulator = 0;
  }
  advance(elapsed, speed, update, now = () => performance.now()) {
    if (speed === 0) {
      this.reset();
      return { steps: 0, dropped: 0 };
    }
    const requested = Math.max(0, elapsed) * speed;
    this.accumulator += Math.min(0.25, Math.max(0, elapsed)) * speed;
    let dropped = Math.max(0, requested - 0.25 * speed),
      steps = 0;
    const start = now();
    while (this.accumulator + 1e-9 >= DT && steps < 48 && now() - start < 10) {
      update();
      this.accumulator = Math.max(0, this.accumulator - DT);
      steps++;
    }
    if (this.accumulator >= DT) {
      const excess = Math.floor(this.accumulator / DT) * DT;
      dropped += excess;
      this.accumulator -= excess;
    }
    return { steps, dropped };
  }
}
