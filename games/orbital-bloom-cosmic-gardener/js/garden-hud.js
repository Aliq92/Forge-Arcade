// Small, DOM-free view models for the compact Garden HUD.

const TYPE_LABELS = Object.freeze({
  heavyCore: 'Black Hole',
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  anchor: 'Anchor',
});

const WARMTH_LABELS = Object.freeze({
  cold: 'Cold',
  temperate: 'Temperate',
  hot: 'Warm',
});

function titleCase(value, fallback) {
  if (typeof value !== 'string' || !value) return fallback;
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
}

export function describeSelectedBody(body) {
  if (!body) return null;
  const warmthKey = typeof body.warmth === 'number'
    ? (body.warmth < 0.85 ? 'cold' : body.warmth > 1.15 ? 'hot' : 'temperate')
    : body.warmth;
  return {
    name: body.name || TYPE_LABELS[body.type] || 'Body',
    type: TYPE_LABELS[body.type] || titleCase(body.type, 'Body'),
    stage: titleCase(body.gardenStage, 'New'),
    orbit: `${titleCase(body.orbitHealth, 'Unsettled')} orbit`,
    warmth: WARMTH_LABELS[warmthKey] || 'Unknown',
    cradled: body.cradled === true,
  };
}

export function buildGardenHudState(intentionState = {}, progress = {}, intentions = {}) {
  const entries = Object.entries(intentions);
  const [intentionId, definition] = entries.find(([id]) => intentionState[id]?.status !== 'complete') || entries[0] || ['stableOrbit', { label: 'Settle a wandering world' }];
  const rawProgress = intentionState[intentionId]?.progress;
  return {
    intentionId,
    intentionLabel: definition.label,
    progressPercent: Math.round(Math.min(1, Math.max(0, Number.isFinite(rawProgress) ? rawProgress : 0)) * 100),
    stardustLabel: `${Number.isFinite(progress.stardust) ? Math.max(0, Math.floor(progress.stardust)) : 0} stardust`,
  };
}
