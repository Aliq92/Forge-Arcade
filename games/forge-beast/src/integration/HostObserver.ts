import type { GameState } from '../creatures/Creature';
import { SPECIES } from '../creatures/Creature';
import type { ForgeBeastEvent } from './HostEvents';
/** Transition observation stores IDs/counters, never another full creature snapshot. */
export class HostObserver {
  private species = '';
  private battle = '';
  private discovery = '';
  initialize(state: GameState) {
    this.species = state.species;
    this.battle = this.battleId(state);
    this.discovery = this.discoveryId(state);
  }
  private battleId(state: GameState) {
    const last = state.combat.history.at(-1);
    return last ? `${last.startedAt}:${last.endedAt}:${state.combat.statistics.wins}:${state.combat.statistics.losses}:${state.combat.statistics.escapes}` : '';
  }
  private discoveryId(state: GameState) {
    const last = state.exploration.discoveries.at(-1);
    return last ? `${last.returnedAt}:${last.returnedAge}:${state.exploration.statistics.completed}` : '';
  }
  observe(state: GameState, emit: (event: ForgeBeastEvent) => void) {
    if (this.species !== state.species) {
      this.species = state.species;
      if (state.stage === 'evolved') emit({ type: 'creature-evolved', payload: { species: state.species, creatureName: SPECIES[state.species].name } });
    }
    const battle = this.battleId(state);
    if (battle !== this.battle) {
      this.battle = battle;
      const last = state.combat.history.at(-1);
      if (last && (last.outcome === 'victory' || last.outcome === 'defeat')) {
        emit({ type: last.outcome === 'victory' ? 'battle-won' : 'battle-lost', payload: { opponent: last.opponent, turns: last.turns, rare: last.rare } });
        if (last.rare && last.item && last.outcome === 'victory') emit({ type: 'rare-discovery', payload: { source: 'battle', id: last.item } });
      }
    }
    const discovery = this.discoveryId(state);
    if (discovery !== this.discovery) {
      this.discovery = discovery;
      const last = state.exploration.discoveries.at(-1);
      if (last?.rare) emit({ type: 'rare-discovery', payload: { source: 'expedition', id: last.outcome } });
    }
  }
}
