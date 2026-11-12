'use strict';

GAMES.push({
  id: 'echo-tide',
  title: 'Echo Tide',
  description: 'Reveal a hidden ocean with sonar, burst past danger, awaken three ancient beacons and reach sanctuary. Every noisy escape stirs the deep.',
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
