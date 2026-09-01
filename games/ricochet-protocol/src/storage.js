const KEY = 'ricochet-protocol-profile-v1';
const DEFAULT_PROFILE = Object.freeze({
  bestScore: 0, musicMuted: false, effectsMuted: false,
  reducedEffects: false, cosmetics: ['cyan']
});

export function loadProfile(storage) {
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_PROFILE);
    return {
      ...structuredClone(DEFAULT_PROFILE),
      ...raw,
      bestScore: Number.isFinite(raw.bestScore) ? Math.max(0, raw.bestScore) : 0
    };
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

export function saveProfile(storage, profile) {
  try {
    storage?.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
