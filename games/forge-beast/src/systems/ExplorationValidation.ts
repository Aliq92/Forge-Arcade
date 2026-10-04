import type { GameState } from '../creatures/Creature';
import { ZONE_IDS, OUTCOME_IDS, OUTCOMES, EXPEDITION_LIMITS } from '../data/expeditions';
import { ITEM_IDS, MAX_ITEM_QUANTITY } from '../data/items';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numeric = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const integer = (v: unknown): v is number => numeric(v) && Number.isSafeInteger(v);
export function validExploration(state: GameState): boolean {
  const e = state.exploration;
  if (!object(e) || !object(e.inventory) || !object(e.statistics)) return false;
  if (Object.keys(e.inventory).length !== ITEM_IDS.length || !ITEM_IDS.every(id => integer(e.inventory[id]) && e.inventory[id] <= MAX_ITEM_QUANTITY)) return false;
  const stats = e.statistics;
  if (!['started', 'completed', 'rare', 'failed'].every(k => integer(stats[k as keyof typeof stats])) || !object(stats.zones) ||
    !ZONE_IDS.every(id => integer(stats.zones[id])) || stats.completed > stats.started || stats.rare > stats.completed || stats.failed > stats.completed ||
    ZONE_IDS.reduce((sum, id) => sum + stats.zones[id], 0) !== stats.completed) return false;
  const validResult = (r: unknown) => {
    if (!object(r) || !ZONE_IDS.includes(r.zone as never) || !OUTCOME_IDS.includes(r.outcome as never)) return false;
    const definition = OUTCOMES[r.outcome as keyof typeof OUTCOMES];
    return numeric(r.startedAt) && numeric(r.returnedAt) && numeric(r.returnedAge) && r.returnedAge <= state.age &&
      typeof r.message === 'string' && r.message.length <= 240 &&
      (r.item === null || (ITEM_IDS.includes(r.item as never) && !!definition.items?.includes(r.item as never))) &&
      typeof r.stored === 'boolean' && (!r.stored || r.item !== null) && r.rare === !!definition.rare && r.failed === !!definition.failed;
  };
  if (!Array.isArray(e.discoveries) || e.discoveries.length > EXPEDITION_LIMITS.history || e.discoveries.length > stats.completed || !e.discoveries.every(validResult)) return false;
  if (e.result !== null && (!validResult(e.result) || stats.completed === 0)) return false;
  if (e.active !== null) {
    const a = e.active;
    if (!object(a) || !ZONE_IDS.includes(a.zone as never) || !ZONE_IDS.includes(a.requestedZone as never) ||
      !numeric(a.startedAge) || a.startedAge > state.age || !numeric(a.endsAge) || a.endsAge <= a.startedAge ||
      !numeric(a.startedAt) || !numeric(a.energyCost) || a.energyCost > 100 || typeof a.detoured !== 'boolean' ||
      state.stage === 'egg' || state.sleeping || e.result !== null || stats.started <= stats.completed) return false;
  }
  return true;
}
