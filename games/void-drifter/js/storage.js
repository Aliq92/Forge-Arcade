// ---------------- Local persistence (best distance, settings, tutorial, achievements) ----------------
const SaveData = (function () {
  const KEYS = {
    best: 'vd_best_distance_km', // legacy global best, kept only for one-time migration
    bestByMode: 'vd_best_distance_by_mode',
    settings: 'vd_settings',
    tutorial: 'vd_tutorial_seen',
    achievements: 'vd_achievements',
  };

  const DEFAULT_SETTINGS = {
    musicVolume: 50,
    soundVolume: 70,
    screenShake: true,
    particleDensity: 'medium',
    showFps: false,
    reducedMotion: false,
  };

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* ignore quota/private-mode errors */ }
  }

  function _getBestByModeMap() {
    try {
      const raw = safeGet(KEYS.bestByMode);
      const map = raw ? JSON.parse(raw) : {};
      // one-time migration: fold the old single global best into "standard"
      const legacy = parseFloat(safeGet(KEYS.best));
      if (!isNaN(legacy) && map.standard == null) map.standard = legacy;
      return map;
    } catch (e) { return {}; }
  }
  function getBestDistanceKm(mode) {
    const v = _getBestByModeMap()[mode || 'standard'];
    return typeof v === 'number' && !isNaN(v) ? v : 0;
  }
  function setBestDistanceKm(km, mode) {
    const key = mode || 'standard';
    const map = _getBestByModeMap();
    if (!(map[key] >= km)) {
      map[key] = km;
      safeSet(KEYS.bestByMode, JSON.stringify(map));
    }
  }

  function getSettings() {
    try {
      const raw = safeGet(KEYS.settings);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) { return { ...DEFAULT_SETTINGS }; }
  }
  function saveSettings(s) { safeSet(KEYS.settings, JSON.stringify(s)); }

  function getTutorialSeen() { return safeGet(KEYS.tutorial) === '1'; }
  function setTutorialSeen() { safeSet(KEYS.tutorial, '1'); }

  function getAchievements() {
    try {
      const raw = safeGet(KEYS.achievements);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function unlockAchievement(id) {
    const a = getAchievements();
    if (a[id]) return false;
    a[id] = Date.now();
    safeSet(KEYS.achievements, JSON.stringify(a));
    return true;
  }

  return {
    getBestDistanceKm, setBestDistanceKm,
    getSettings, saveSettings,
    getTutorialSeen, setTutorialSeen,
    getAchievements, unlockAchievement,
  };
})();
