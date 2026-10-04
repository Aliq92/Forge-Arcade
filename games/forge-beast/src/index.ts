export { ForgeBeastGame, createForgeBeast, type ForgeBeastOptions } from './ForgeBeastGame';
export { TIMING } from './data/config';
export type { GameState, SpeciesId, Stage } from './creatures/Creature';

export { FORGE_BEAST_METADATA } from './integration/Metadata';
export { readForgeBeastSummary } from './launcher';
export type { ForgeBeastSummary } from './integration/StateSummary';
export type { ForgeBeastEvent, ForgeBeastEventMap, ForgeBeastEventHandler } from './integration/HostEvents';
export type { ForgeBeastStorage, StorageOption } from './integration/StorageAdapter';
export { SAVE_VERSION } from './data/config';
