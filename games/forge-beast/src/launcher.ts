/** Import this entry for launcher tiles. It imports no UI, CSS, timers or audio. */
import { Persistence } from './systems/Persistence';
import { resolveStorage, type StorageOption } from './integration/StorageAdapter';
import { stateSummary } from './integration/StateSummary';
export { FORGE_BEAST_METADATA } from './integration/Metadata';
export type { ForgeBeastSummary } from './integration/StateSummary';
export type { ForgeBeastStorage, StorageOption } from './integration/StorageAdapter';
export function readForgeBeastSummary(options: { storage?: StorageOption; saveKey?: string } = {}) {
  const persistence = new Persistence(resolveStorage(options.storage), options.saveKey);
  return stateSummary(persistence.load(), persistence.hasSave);
}
