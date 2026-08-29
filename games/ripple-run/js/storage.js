// Ripple Run - localStorage persistence
window.RR = window.RR || {};

RR.Storage = (function () {
  const KEY_PROGRESS = 'rippleRun.progress.v1';
  const KEY_SETTINGS = 'rippleRun.settings.v1';
  const KEY_ZEN = 'rippleRun.zen.v1';

  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Object.assign({}, fallback, parsed);
    } catch (e) {
      return fallback;
    }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore quota/private mode */ }
  }

  const defaultProgress = { unlocked: 1, ratings: {} };
  const defaultSettings = {
    sound: true,
    music: true,
    reducedMotion: false,
    rippleGlow: true,
    screenShake: true,
    highContrast: false
  };
  const defaultZen = {
    rain: false,
    theme: 'night',
    rippleStrength: 1,
    cinematic: false
  };

  function getProgress() { return safeGet(KEY_PROGRESS, defaultProgress); }
  function saveProgress(p) { safeSet(KEY_PROGRESS, p); }

  function getSettings() { return safeGet(KEY_SETTINGS, defaultSettings); }
  function saveSettings(s) { safeSet(KEY_SETTINGS, s); }

  function getZen() { return safeGet(KEY_ZEN, defaultZen); }
  function saveZen(z) { safeSet(KEY_ZEN, z); }

  function unlockLevel(index) {
    const p = getProgress();
    if (index > p.unlocked) { p.unlocked = index; saveProgress(p); }
    return p;
  }
  function setRating(levelId, stars) {
    const p = getProgress();
    const prev = p.ratings[levelId] || 0;
    if (stars > prev) { p.ratings[levelId] = stars; saveProgress(p); }
    return p;
  }

  return {
    getProgress, saveProgress, getSettings, saveSettings, getZen, saveZen,
    unlockLevel, setRating
  };
})();
