import { OPPONENT_IDS, OPPONENTS } from '../data/opponents';
import { ZONE_IDS, ZONES, OUTCOME_IDS } from '../data/expeditions';
import { ITEM_IDS, ITEMS } from '../data/items';
import { SPECIES, type GameState, type Stats } from '../creatures/Creature';
import { PERSONALITIES, PERSONALITY_IDS } from '../data/personalities';
import { ACTION_ANIMATIONS } from '../data/animations';
import { LIFE_EVENTS } from '../data/events';
export const STAT_KEYS: (keyof Stats)[] = ['hunger', 'energy', 'mood', 'discipline', 'health', 'training'];
export function debugMarkup() {
  return `<details class="fb-debug"><summary>Developer tools</summary><div class="fb-debug-content">
    ${STAT_KEYS.map(s => `<label>${s}<input type="range" min="0" max="100" data-stat="${s}"/><output data-output="${s}"></output></label>`).join('')}
    <label>Personality<select class="fb-debug-personality" aria-label="Personality"><option value="">Unhatched</option>${PERSONALITY_IDS.map(id => `<option value="${id}">${PERSONALITIES[id].name}</option>`).join('')}</select></label>
    <label>Life event<select class="fb-debug-event" aria-label="Life event">${LIFE_EVENTS.map(e => `<option value="${e.id}">${e.label}</option>`).join('')}</select></label>
    <button data-command="debug-event">Trigger event</button><button data-command="debug-neglect">Simulate neglect</button>
    <label>Animation<select class="fb-debug-animation" aria-label="Action animation">${ACTION_ANIMATIONS.map(a => `<option value="${a}">${a}</option>`).join('')}</select></label>
    <button data-command="debug-animation">Preview animation</button>
    <label>Alert<select class="fb-debug-alert" aria-label="Alert state">${['hungry','tired','upset','sick','restless'].map(a => `<option value="${a}">${a}</option>`).join('')}</select></label>
    <button data-command="debug-alert">Simulate alert</button><button data-command="debug-reset-flow">Test reset flow</button>
    <label>Expedition zone<select class="fb-debug-zone" aria-label="Expedition zone">${ZONE_IDS.map(id => `<option value="${id}">${ZONES[id].name}</option>`).join('')}</select></label>
    <button data-command="debug-trip-start">Start expedition</button><button data-command="debug-trip-complete">Complete expedition</button>
    <label>Outcome<select class="fb-debug-outcome" aria-label="Expedition outcome">${OUTCOME_IDS.map(id => `<option value="${id}">${id}</option>`).join('')}</select></label>
    <button data-command="debug-trip-outcome">Force outcome</button><button data-command="debug-trip-rare">Rare discovery</button><button data-command="debug-trip-failed">Failed expedition</button>
    <label>Item<select class="fb-debug-item" aria-label="Inventory item">${ITEM_IDS.map(id => `<option value="${id}">${ITEMS[id].name}</option>`).join('')}</select></label>
    <label>Quantity<input type="number" class="fb-debug-quantity" aria-label="Item quantity" min="0" max="99" value="1"/></label>
    <button data-command="debug-item-add">Add item</button><button data-command="debug-item-remove">Remove item</button><button data-command="debug-item-set">Set quantity</button>
    <label>Opponent<select class="fb-debug-opponent" aria-label="Battle opponent">${OPPONENT_IDS.map(id => `<option value="${id}">${OPPONENTS[id].name}</option>`).join('')}</select></label>
    <button data-command="debug-battle-start">Start battle</button><button data-command="debug-battle-rare">Rare encounter</button>
    <label>Player HP<input type="range" aria-label="Player battle HP" min="0" max="200" data-battle-hp="player"/></label>
    <label>Enemy HP<input type="range" aria-label="Enemy battle HP" min="0" max="200" data-battle-hp="enemy"/></label>
    <button data-command="debug-battle-win">Force victory</button><button data-command="debug-battle-loss">Force defeat</button><button data-command="debug-battle-critical">Next critical hit</button><button data-command="debug-battle-escape">Force escape</button>
    <button data-command="debug-battle-stamina">Refill stamina</button><button data-command="debug-battle-skill">Test creature skill</button>
    <button data-command="debug-age">Advance 60 seconds</button><button data-command="debug-hatch">Hatch</button><button data-command="debug-evolve">Evolve naturally</button>
    <select aria-label="Force evolution species" class="fb-debug-species">${['cragox', 'zephlet', 'runewisp', 'bramblejaw'].map(s => `<option value="${s}">${SPECIES[s as keyof typeof SPECIES].name}</option>`).join('')}</select>
    <button data-command="debug-force">Force selected form</button><button data-command="debug-reset">Reset save</button><pre class="fb-debug-info"></pre>
  </div></details>`;
}
export function updateDebugPanel(root: HTMLElement, s: GameState) {
  root.querySelector<HTMLElement>('.fb-debug-info')!.textContent = JSON.stringify({ ...s.development, expeditions: s.exploration.statistics, inventory: s.exploration.inventory, battles: s.combat.statistics, opponents: s.combat.discoveries }, null, 2);
  for (const side of ['player', 'enemy'] as const) {
    const input = root.querySelector<HTMLInputElement>(`[data-battle-hp="${side}"]`)!;
    input.disabled = !s.combat.active || s.combat.active.status !== 'ongoing';
    input.max = String(s.combat.active?.[side].maxHP ?? 200);
    if (document.activeElement !== input) input.value = String(s.combat.active?.[side].hp ?? 0);
  }
  const personality = root.querySelector<HTMLSelectElement>('.fb-debug-personality')!;
  if (document.activeElement !== personality) personality.value = s.personality ?? '';
  personality.disabled = s.stage === 'egg';
  for (const [stat, value] of Object.entries(s.stats)) {
    const input = root.querySelector<HTMLInputElement>(`[data-stat="${stat}"]`)!;
    if (document.activeElement !== input) input.value = String(Math.round(value));
    root.querySelector<HTMLElement>(`[data-output="${stat}"]`)!.textContent = String(Math.round(value));
  }
}
