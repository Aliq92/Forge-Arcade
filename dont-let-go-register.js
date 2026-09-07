'use strict';

GAMES.push({
  id: 'dont-let-go',
  title: "Don't Let Go",
  description: 'Hold to fly through hyperspace, steer through glowing gates, and smash energy cubes into particle bursts without breaking the signal.',
  category: 'Games',
  featured: true,
  tags: ['Hyperspace survival', 'Touch + keyboard'],
  palette: ['#38bdf8', '#c084fc'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
