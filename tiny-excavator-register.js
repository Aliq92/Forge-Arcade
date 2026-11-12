'use strict';

GAMES.push({
  id: 'tiny-excavator',
  title: 'Tiny Excavator',
  description: 'Dig deeper. Discover more. Uncover nine minerals and gemstones, record your finds, upgrade your tiny excavator, and recover three ancient fragments.',
  category: 'Games',
  featured: true,
  tags: ['Mining adventure', 'Keyboard + touch'],
  palette: ['#ff7849', '#ffc857'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
