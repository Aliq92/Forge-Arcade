/** Application version is deliberately independent of the save schema. */
export const FORGE_BEAST_METADATA = Object.freeze({
  id: 'forge-beast',
  title: 'Forge Beast',
  version: '0.5.1',
  orientation: 'portrait',
  category: 'virtual-pet',
  supportsPause: true,
  supportsPersistentSave: true,
  description: 'Raise a little spark, explore, and meet wild beasts.',
  minimumViewport: Object.freeze({ width: 280, height: 480 }),
  preferredAspectRatio: '320 / 568',
} as const);
