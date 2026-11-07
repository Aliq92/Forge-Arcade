'use strict';

// Interactive laboratory, grouped with Beat Foundry under Experiments.
GAMES.push({
  id: 'elemental',
  title: 'ELEMENTAL',
  description: 'Explore real atomic structure, build molecules, and discover chemistry through scientifically grounded interactive experiments.',
  category: 'Experiments',
  featured: false,
  tags: ['Chemistry sandbox', 'Atomic foundations'],
  palette: ['#61e5e3', '#ba9df7'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
