'use strict';

GAMES.push({
  id: 'tiny-excavator',
  title: 'Tiny Excavator',
  description: 'Dig through a deep quarry, haul valuable ore, upgrade your excavator, and recover three ancient fragments. Keep enough fuel for the climb home.',
  category: 'Games',
  featured: true,
  tags: ['Mining adventure', 'Keyboard + touch'],
  palette: ['#ff7849', '#ffc857'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
