'use strict';

GAMES.push({
  id: 'impossible-garden',
  title: 'Impossible Garden',
  description: 'Plant strange seeds, tend a calm generative garden, and watch impossible forms grow.',
  category: 'Simulations',
  featured: true,
  tags: ['Generative garden', 'Mouse + touch'],
  palette: ['#c8ccd4', '#8ec4c4'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
