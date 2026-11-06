'use strict';

GAMES.push({
  id: 'echo-tide',
  title: 'Echo Tide',
  description: 'Navigate a hidden ocean with sonar, awaken three ancient beacons, and reach sanctuary without stirring the deep.',
  category: 'Games',
  featured: true,
  tags: ['Sonar exploration', 'Keyboard + touch'],
  artId: 'echo-tide',
  palette: ['#8ce0d5', '#d9bc7b'],
  metadata: { category: 'Exploration', orientation: 'any', supportsPause: true, supportsPersistentSave: false },
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
