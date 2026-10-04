import type { GameState } from '../creatures/Creature';
import { ITEM_IDS, ITEMS } from '../data/items';
export function inventoryMarkup(state: GameState, itemIndex: number, confirm: boolean) {
  const id = ITEM_IDS[itemIndex], item = ITEMS[id], quantity = state.exploration.inventory[id];
  return `<div class="fb-status-heading">${confirm ? item.consumable ? 'Use item?' : 'Inspect?' : 'Items'}<span>${itemIndex + 1}/${ITEM_IDS.length}</span></div><div class="fb-item-card" data-item="${id}"><span class="fb-item-symbol" aria-hidden="true">${['●', '◆', '▣', '✧', '+', '◇'][itemIndex]}</span><strong>${item.name}<span>×${quantity}</span></strong><p>${quantity ? item.description : 'None yet. Little finds await on the trail.'}</p><small>${quantity ? item.consumable ? 'ONE USE · ONE LITTLE BOOST' : 'KEPT AFTER INSPECTING' : 'EXPLORE TO DISCOVER'}</small></div><div class="fb-status-help">A ITEM · B ${confirm ? item.consumable ? 'USE' : 'LOOK' : 'CHOOSE'} · C BACK</div>`;
}
