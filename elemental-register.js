'use strict';

// Secret laboratory: accessible through the footer flask, outside the listings.
GAMES.push({
  id: 'elemental',
  title: 'ELEMENTAL',
  description: 'Explore atoms, build molecules, and investigate virtual chemical reactions in connected scientific laboratories.',
  category: 'Experiments',
  featured: false,
  hidden: true,
  tags: ['Atomic & Reaction Laboratory', 'Shared discoveries'],
  palette: ['#61e5e3', '#ba9df7'],
});

heroStatus.textContent = `${GAMES.filter(game => !game.hidden).length} playable experiments`;
footerCount.textContent = String(GAMES.filter(game => !game.hidden).length);
renderFeaturedCollection();
render('All');
