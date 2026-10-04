'use strict';
// Optional registry capability; no game-specific branches in the launcher.
(() => {
  const summaries = new Map();
  function paint() {
    document.querySelectorAll('[data-game-summary]').forEach(node => {
      const status = summaries.get(node.closest('[data-game]').dataset.game);
      if (!status) return;
      node.textContent = status.text;
      if (status.attentionNeeded) node.textContent += ' · Needs care';
    });
  }
  async function refresh() {
    await Promise.all(GAMES.filter(game => typeof game.loadSummary === 'function').map(async game => {
      try { summaries.set(game.id, await game.loadSummary()); }
      catch (error) { console.warn(`Launcher summary unavailable: ${game.id}`, error); }
    }));
    paint();
  }
  document.addEventListener('arcade:cards-rendered', paint);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('storage', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  refresh();
})();
