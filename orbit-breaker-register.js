'use strict';

GAMES.push({
  id: 'orbit-breaker',
  title: 'Orbit Breaker',
  description: 'Bend gravity, perform orbital slingshots, smash glowing targets, and unleash spectacular chain reactions.',
  category: 'Games',
  featured: true,
  tags: ['Gravity', 'One-Touch', 'Physics Arcade'],
  artId: 'orbit-breaker',
  palette: ['#080c17', '#67e8e2', '#aa8cf6'],
  metadata: { category: 'Arcade', orientation: 'any', supportsPause: true, supportsPersistentSave: true },
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
