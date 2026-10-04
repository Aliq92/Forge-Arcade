import type { GameState } from '../creatures/Creature';
import { ITEMS, type ItemId } from '../data/items';
import { TIMING } from '../data/config';
import { isItem, removeItem } from './InventorySystem';
import { changeStats } from './StatValues';
import { recordMoment } from './EventHistory';
import type { ActionResult } from './Actions';
export function useItem(state: GameState, id: ItemId): ActionResult {
  const denied = (message: string): ActionResult => ({ success: false, message, behavior: 'idle' });
  if (!isItem(id) || state.exploration.inventory[id] < 1) return denied('Nothing here yet. Explore to find little treasures.');
  if (state.combat.encounter || state.combat.active || state.combat.result) return denied('Finish the wild encounter first.');
  if (state.stage === 'egg') return denied('Your egg is still growing. Save that for later.');
  if (state.exploration.active) return denied('Your beast is exploring. Wait for their return.');
  if (state.exploration.result) return denied('Meet your returning beast first.');
  if (state.sleeping) return denied('Shhh… save that for when they wake.');
  if (state.age - state.lastActionAge < TIMING.actionCooldown) return denied('One little moment…');
  const item = ITEMS[id];
  if (item.consumable && !removeItem(state, id)) return denied('That item is no longer here.');
  changeStats(state, item.effects);
  state.lastActionAge = state.age;
  state.life.lastInteractionAge = state.age;
  if (item.consumable) state.development.successfulInteractions++;
  if (id === 'snack') state.life.needTimers.hunger = 0;
  if (id === 'toy') state.life.needTimers.mood = 0;
  recordMoment(state, `item:${id}`, 'action', item.message);
  return { success: true, message: state.eventHistory.at(-1)!.message, behavior: item.reaction };
}
