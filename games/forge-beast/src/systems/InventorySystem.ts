import type { GameState } from '../creatures/Creature';
import { ITEM_IDS, MAX_ITEM_QUANTITY, type ItemId } from '../data/items';
export function isItem(id: string): id is ItemId { return ITEM_IDS.includes(id as ItemId); }
export function setItemQuantity(state: GameState, id: ItemId, quantity: number) {
  if (!isItem(id) || !Number.isFinite(quantity)) return false;
  state.exploration.inventory[id] = Math.max(0, Math.min(MAX_ITEM_QUANTITY, Math.floor(quantity)));
  return true;
}
/** Returns the quantity actually stored; full stacks never silently overflow. */
export function addItem(state: GameState, id: ItemId, quantity = 1) {
  if (!isItem(id) || !Number.isInteger(quantity) || quantity < 1) return 0;
  const before = state.exploration.inventory[id];
  setItemQuantity(state, id, before + quantity);
  return state.exploration.inventory[id] - before;
}
export function removeItem(state: GameState, id: ItemId, quantity = 1) {
  if (!isItem(id) || !Number.isInteger(quantity) || quantity < 1 || state.exploration.inventory[id] < quantity) return false;
  state.exploration.inventory[id] -= quantity;
  return true;
}
