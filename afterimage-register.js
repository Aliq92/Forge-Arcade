'use strict';

GAMES.push({
  id: 'afterimage',
  title: 'Afterimage',
  description: 'Pulse to reveal each room, memorize the path, and navigate the dark before the light fades.',
  category: 'Games',
  featured: true,
  tags: ['Memory puzzle', 'Keyboard + touch'],
  palette: ['#8fe9ff', '#b6a9ff'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
