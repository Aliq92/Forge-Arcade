'use strict';

GAMES.push({
  id: 'terraform',
  title: 'TERRAFORM: A Living Planet',
  description: 'Sculpt continents, guide the rains, and grow a resilient ecosystem on a miniature alien planet.',
  category: 'Simulations',
  featured: true,
  tags: ['Planet simulation', 'Ecosystems', 'Keyboard + touch'],
  artId: 'terraform',
  palette: ['#8ce7cb', '#dea978'],
  metadata: {
    category: 'Simulation / Strategy',
    orientation: 'any',
    supportsPause: true,
    supportsPersistentSave: true,
  },
});

heroStatus.textContent = `${GAMES.filter(game => !game.hidden).length} playable experiments`;
footerCount.textContent = String(GAMES.filter(game => !game.hidden).length);
renderFeaturedCollection();
render('All');
