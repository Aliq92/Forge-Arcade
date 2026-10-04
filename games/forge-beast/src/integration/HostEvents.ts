import type { ForgeBeastSummary } from './StateSummary';
import type { SpeciesId } from '../creatures/Creature';
export interface ForgeBeastEventMap {
  ready: ForgeBeastSummary;
  save: { success: boolean; summary: ForgeBeastSummary };
  pause: { reason: 'host' | 'visibility' | 'guide' | 'reset' | 'unmount' | 'error' };
  resume: { reason: 'host' | 'visibility' | 'mount' | 'internal' };
  'game-state-change': ForgeBeastSummary;
  'creature-evolved': { species: SpeciesId; creatureName: string };
  'battle-won': { opponent: string; turns: number; rare: boolean };
  'battle-lost': { opponent: string; turns: number; rare: boolean };
  'rare-discovery': { source: 'expedition' | 'battle'; id: string };
  reset: ForgeBeastSummary;
  'exit-requested': ForgeBeastSummary;
  error: { subsystem: string; message: string; recoverable: boolean };
}
export type ForgeBeastEvent = { [K in keyof ForgeBeastEventMap]: { type: K; payload: ForgeBeastEventMap[K] } }[keyof ForgeBeastEventMap];
export type ForgeBeastEventHandler = (event: ForgeBeastEvent) => void;
