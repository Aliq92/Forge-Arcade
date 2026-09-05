'use strict';

GAMES.push({
  id: 'void-tap',
  title: 'VOID TAP',
  description: 'A strict reaction game where one wrong tap ends the signal.',
  category: 'Games',
  featured: true,
  tags: ['Reaction game', 'Touch-first'],
  palette: ['#7fe8ff', '#ff5c6a'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
