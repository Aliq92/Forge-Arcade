import { ANIMATIONS, type AnimationKind } from '../data/animations';
export type AnimationOutcome = 'happy' | 'overfed' | 'success' | 'fatigue';
export interface AnimationFrame { kind: AnimationKind; phase: string; outcome: AnimationOutcome; sequence: number }
/** Temporary presentation timeline. Not serialized; sleep/wake truth stays in GameState. */
export class AnimationSystem {
  private current: { kind: AnimationKind; started: number; outcome: AnimationOutcome; sequence: number } | null = null;
  private sequence = 0;
  start(kind: AnimationKind, age: number, outcome: AnimationOutcome = 'happy') {
    this.current = { kind, started: age, outcome, sequence: ++this.sequence };
  }
  frame(age: number): AnimationFrame | null {
    if (!this.current) return null;
    let elapsed = Math.max(0, age - this.current.started);
    for (const phase of ANIMATIONS[this.current.kind]) {
      if (elapsed < phase.duration) return { ...this.current, phase: phase.name };
      elapsed -= phase.duration;
    }
    this.current = null; return null;
  }
  reset() { this.current = null; }
}
