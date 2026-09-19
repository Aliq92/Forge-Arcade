'use strict';

GAMES.push({
  id: 'aethel',
  title: 'Aethel: Spirit Guardian',
  description: 'Guide a luminous spirit through the void, feed, defend, unlock evolution powers, and ascend through named forms.',
  category: 'Games',
  featured: true,
  tags: ['Survival', 'Evolution abilities', 'Touch + pointer'],
  palette: ['#56f5ff', '#a86cff'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
