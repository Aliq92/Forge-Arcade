'use strict';

GAMES.push({
  id: 'neon-drift-courier',
  title: 'Neon Drift: Courier',
  description: 'Deliver data packages through a hostile neon grid while dodging security drones and traffic.',
  category: 'Games',
  featured: false,
  tags: ['Arcade drift', 'Keyboard + touch', 'Fullscreen'],
  palette: ['#00ffff', '#ff00ff'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
