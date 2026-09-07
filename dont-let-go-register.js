'use strict';

GAMES.push({
  id: 'dont-let-go',
  title: "Don't Let Go",
  description: 'Hold to fly, steer through real 3D space, thread glowing gates, and smash energy cubes without releasing the signal.',
  category: 'Games',
  featured: true,
  tags: ['Three.js flight', 'Touch + keyboard'],
  palette: ['#5fd8ff', '#ffb35c'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
