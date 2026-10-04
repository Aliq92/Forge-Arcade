'use strict';

GAMES.push({
  id: 'forge-beast',
  title: 'Forge Beast',
  description: 'Raise a living little beast. Care, explore and battle inside a pocket device.',
  category: 'Games',
  featured: false,
  tags: ['Virtual pet', 'Persistent save', 'Portrait', 'Touch-first'],
  palette: ['#a9c970', '#b4c991'],
  metadata: { version: '0.5.1', category: 'virtual-pet', orientation: 'portrait', supportsPause: true, supportsPersistentSave: true },
  loadSummary: () => import('./games/forge-beast/summary.mjs').then(module => module.readLauncherStatus()),
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
