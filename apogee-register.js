'use strict';
GAMES.push({
  id: 'apogee',
  title: 'APOGEE',
  description: 'One button. One rocket. A little closer to the stars. Time your stage separations, chase the perfect launch, and research your way beyond the Moon.',
  category: 'Games',
  featured: true,
  tags: ['Rocket flight', 'One button', 'Keyboard + touch'],
  palette: ['#e6b47f', '#6eacbd'],
});
heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
