'use strict';

// Forge Arcade registration. Game runtime remains on its native page.
GAMES.push({
  id: 'the-last-lighthouse',
  title: 'The Last Lighthouse',
  description: 'Guide twelve ships through a storm with one lighthouse beam. Sweep the sea, conserve your light, and bring them home.',
  category: 'Games',
  featured: true,
  tags: ['Maritime rescue', 'Keyboard + touch'],
  artId: 'the-last-lighthouse',
  palette: ['#e6c88a', '#9bc6b1'],
  metadata: { category: 'Strategy', orientation: 'any', supportsPause: true, supportsPersistentSave: false },
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
