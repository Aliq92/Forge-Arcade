import type { GameState, Stats } from '../creatures/Creature';
export const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function changeStats(state: GameState, change: Partial<Stats>) {
  for (const key of Object.keys(change) as (keyof Stats)[]) {
    const value = change[key];
    if (value !== undefined && Number.isFinite(value)) state.stats[key] = clamp(state.stats[key] + value);
  }
}
