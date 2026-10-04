import type { Behavior, GameState } from '../creatures/Creature';
import { careAlert } from './NeedsSystem';
export function restingReaction(state: GameState): Behavior {
  if (state.stage === 'egg') return 'idle';
  if (state.sleeping) return 'sleep';
  if (state.stats.health < 35) return 'sick';
  if (state.stats.hunger < 35) return 'hungry';
  if (state.stats.energy < 30) return 'tired';
  if (state.stats.mood < 35) return 'upset';
  if (state.stats.discipline < 25) return 'restless';
  if (state.stats.mood >= 80) return 'happy';
  return 'idle';
}
export function restingMessage(state: GameState): string {
  if (state.stage === 'egg') return 'A little patience. A whole lot of potential.';
  return careAlert(state) ?? (state.sleeping ? 'Dreaming of little adventures…' : state.stats.mood >= 80 ? 'A happy little hum. Life feels good.' : 'A little life. A little closer to you.');
}
export class ReactionSystem {
  message = '';
  behavior: Behavior = 'idle';
  private until = 0;
  show(state: GameState, message: string, behavior: Behavior, duration = 3) {
    this.message = message; this.behavior = behavior; this.until = state.age + duration;
  }
  update(state: GameState) {
    if (state.age >= this.until) { this.message = ''; this.behavior = restingReaction(state); }
  }
  reset() { this.message = ''; this.behavior = 'idle'; this.until = 0; }
}
