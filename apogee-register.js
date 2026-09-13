'use strict';

GAMES.push({
  id: 'apogee',
  title: 'Apogee',
  description: 'Time stage separations, climb through the frontier, and upgrade a rocket built to go farther every run.',
  category: 'Games',
  featured: true,
  tags: ['Stage timing', 'Touch + keyboard'],
  palette: ['#d66b3d', '#83d392'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
