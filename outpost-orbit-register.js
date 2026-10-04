'use strict';

GAMES.push({
  id: 'outpost-orbit',
  title: 'Outpost Orbit',
  description: 'Guide a tiny autonomous alien colony as villagers build, explore, form relationships, adapt, and uncover the mysteries of their strange moon.',
  category: 'Simulations',
  featured: true,
  tags: ['Alien village', 'Living simulation', 'Colony', 'Autonomous AI'],
  artId: 'outpost-orbit',
  palette: ['#76d8df', '#f3d491', '#473259'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
