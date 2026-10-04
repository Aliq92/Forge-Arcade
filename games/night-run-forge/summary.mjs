const SAVE_KEY = 'forge_arcade_night_run_profile_v2';

export function readLauncherStatus() {
  let profile = null;
  try { profile = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch {}
  const best = Math.max(0, Number(profile?.best) || 0);
  const credits = Math.max(0, Number(profile?.credits) || 0);
  const cars = { spark: 'Sparkline', volt: 'Volt RS', wraith: 'Wraith X' };
  const selected = cars[profile?.selected] || 'Sparkline';
  return {
    text: best > 0 ? `Best ${Math.floor(best)} m · ${credits} credits · ${selected}` : 'A first night run is waiting',
    attentionNeeded: false,
    summary: { best: Math.floor(best), credits, selected },
  };
}
