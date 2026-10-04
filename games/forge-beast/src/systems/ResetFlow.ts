import { createCreature, type GameState } from '../creatures/Creature';
export interface ResetOptions { keepSettings?: boolean }
export class ResetFlow {
  pending = false;
  choice: 'keep' | 'reset' = 'keep';
  error = '';
  begin() { this.pending = true; this.choice = 'keep'; this.error = ''; }
  select() { if (this.pending) this.choice = this.choice === 'keep' ? 'reset' : 'keep'; }
  confirm(): 'keep' | 'reset' | null {
    if (!this.pending) return null;
    const choice = this.choice;
    if (choice === 'keep') this.cancel();
    return choice;
  }
  cancel() { this.pending = false; this.choice = 'keep'; this.error = ''; }
  fail() { this.pending = true; this.choice = 'keep'; this.error = 'Could not save a new egg. Try again.'; }
}
export function newEggState(current: GameState, options: ResetOptions = {}) {
  const fresh = createCreature();
  if (options.keepSettings) {
    fresh.muted = current.muted;
    fresh.hapticsEnabled = current.hapticsEnabled;
  }
  return fresh;
}
