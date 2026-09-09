'use strict';

GAMES.push({
  id: 'impossible-reef',
  title: 'Impossible Reef',
  description: 'Plant impossible coral, tend a living reef, crossbreed new forms, and watch it breathe.',
  category: 'Simulations',
  featured: true,
  tags: ['Generative reef', 'Mouse + touch'],
  palette: ['#7fd8e6', '#8e79d6'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
