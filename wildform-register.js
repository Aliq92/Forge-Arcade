'use strict';

GAMES.push({
  id: 'wildform',
  title: 'Wildform',
  description: 'Shape a miniature living world. Ten autonomous species forage, flee, hunt, reproduce and migrate as you change their habitat.',
  category: 'Simulations',
  featured: true,
  tags: ['Living ecosystem', 'Autonomous creatures', 'Habitat sandbox', 'Keyboard + touch'],
  artId: 'wildform',
  palette: ['#a4c582', '#7ec5c4'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
