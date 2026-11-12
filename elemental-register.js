'use strict';

// Secret laboratory: accessible through the footer flask, outside the listings.
GAMES.push({
  id: 'elemental',
  title: 'ELEMENTAL',
  description: 'Explore real atomic structure, build molecules, and discover chemistry through scientifically grounded interactive experiments.',
  category: 'Experiments',
  featured: false,
  hidden: true,
  tags: ['Chemistry sandbox', 'Atomic foundations'],
  palette: ['#61e5e3', '#ba9df7'],
});

heroStatus.textContent = `${GAMES.filter(game => !game.hidden).length} playable experiments`;
footerCount.textContent = String(GAMES.filter(game => !game.hidden).length);
renderFeaturedCollection();
render('All');
