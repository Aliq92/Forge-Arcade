'use strict';

GAMES.push({
  id: 'night-run-forge',
  title: 'Night Run: Forge',
  description: 'Thread night traffic, chain near misses, build heat and upgrade your garage between high-speed runs.',
  category: 'Games',
  featured: false,
  tags: ['Arcade driving', 'Persistent progression', 'Portrait', 'Touch-first'],
  palette: ['#6de6ff', '#a98cff'],
  metadata: { version: '0.5.1', category: 'arcade-driving', orientation: 'portrait', supportsPause: true, supportsPersistentSave: true },
  loadSummary: () => import('./games/night-run-forge/summary.mjs').then(module => module.readLauncherStatus()),
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
