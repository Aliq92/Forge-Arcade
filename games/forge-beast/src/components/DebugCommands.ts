import type { OpponentId } from '../data/opponents';
import { addItem, removeItem, setItemQuantity } from '../systems/InventorySystem';
import type { ItemId } from '../data/items';
import type { ZoneId, OutcomeId } from '../data/expeditions';
import type { Engine } from '../systems/Engine';
import type { SpeciesId } from '../creatures/Creature';
import { ACTION_ANIMATIONS, type AnimationKind } from '../data/animations';
export function debugCommand(command: string, root: HTMLElement, engine: Engine, reset: () => void, openReset: () => void) {
  const selected = (selector: string) => root.querySelector<HTMLSelectElement>(selector)!.value;
  if ((engine.state.combat.active || engine.state.combat.encounter) && ['debug-hatch','debug-evolve','debug-force','debug-event'].includes(command)) { engine.feedback('Finish the battle before changing form or life events.'); return; }
  if (command === 'debug-battle-start') engine.debugBattle(selected('.fb-debug-opponent') as OpponentId);
  if (command === 'debug-battle-rare') engine.debugBattle(selected('.fb-debug-opponent') as OpponentId, true, true);
  if (command === 'debug-battle-win') engine.debugBattleResult('victory');
  if (command === 'debug-battle-loss') engine.debugBattleResult('defeat');
  if (command === 'debug-battle-escape') engine.debugBattleResult('escape');
  if (command === 'debug-battle-critical') engine.debugCritical();
  if (command === 'debug-battle-stamina' || command === 'debug-battle-skill') {
    const battle = engine.state.combat.active;
    if (battle && battle.status === 'ongoing') {
      battle.player.stamina = battle.player.maxStamina;
      if (command === 'debug-battle-skill') { battle.beats = []; engine.battleAction('skill'); }
    }
  }
  if (command === 'debug-trip-start') engine.explore(selected('.fb-debug-zone') as ZoneId);
  if (command === 'debug-trip-complete') engine.debugCompleteExpedition();
  if (command === 'debug-trip-outcome') engine.debugCompleteExpedition(selected('.fb-debug-outcome') as OutcomeId);
  if (command === 'debug-trip-rare') engine.debugCompleteExpedition('rare-item');
  if (command === 'debug-trip-failed') engine.debugCompleteExpedition('fatigue');
  if (command.startsWith('debug-item-')) {
    const id = selected('.fb-debug-item') as ItemId;
    const quantity = Number(root.querySelector<HTMLInputElement>('.fb-debug-quantity')!.value);
    if (command === 'debug-item-add') addItem(engine.state, id, quantity);
    if (command === 'debug-item-remove') removeItem(engine.state, id, quantity);
    if (command === 'debug-item-set') setItemQuantity(engine.state, id, quantity);
  }
  if (command === 'debug-event') engine.debugEvent(selected('.fb-debug-event'));
  if (command === 'debug-neglect') engine.debugNeglect();
  if (command === 'debug-age') engine.advance(60);
  if (command === 'debug-hatch') engine.debugHatch();
  if (command === 'debug-evolve') engine.debugEvolve();
  if (command === 'debug-force') {
    if (engine.state.stage === 'evolved') { engine.state.stage = 'baby'; engine.state.species = 'pipkin'; }
    engine.debugEvolve(selected('.fb-debug-species') as SpeciesId);
  }
  if (command === 'debug-animation') {
    const kind = selected('.fb-debug-animation') as AnimationKind;
    if (ACTION_ANIMATIONS.includes(kind)) engine.debugAnimation(kind);
  }
  if (command === 'debug-alert') engine.debugAlert(selected('.fb-debug-alert') as 'hungry' | 'tired' | 'upset' | 'sick' | 'restless');
  if (command === 'debug-reset-flow') openReset();
  if (command === 'debug-reset') reset();
}
