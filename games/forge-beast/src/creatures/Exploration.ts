import type { ZoneId, OutcomeId } from '../data/expeditions';
import { ITEM_IDS, type ItemId } from '../data/items';
export type Inventory = Record<ItemId, number>;
export interface ActiveExpedition {
  zone: ZoneId;
  requestedZone: ZoneId;
  startedAge: number;
  endsAge: number;
  startedAt: number;
  energyCost: number;
  detoured: boolean;
}
export interface ExpeditionResult {
  zone: ZoneId;
  outcome: OutcomeId;
  startedAt: number;
  returnedAt: number;
  returnedAge: number;
  message: string;
  item: ItemId | null;
  stored: boolean;
  rare: boolean;
  failed: boolean;
}
export interface ExplorationState {
  active: ActiveExpedition | null;
  result: ExpeditionResult | null;
  inventory: Inventory;
  discoveries: ExpeditionResult[];
  statistics: { started: number; completed: number; rare: number; failed: number; zones: Record<ZoneId, number> };
}
export function createExploration(): ExplorationState {
  return {
    active: null, result: null,
    inventory: Object.fromEntries(ITEM_IDS.map(id => [id, 0])) as Inventory,
    discoveries: [],
    statistics: { started: 0, completed: 0, rare: 0, failed: 0, zones: { greenfield: 0, 'scrap-yard': 0, 'dark-grove': 0 } },
  };
}
