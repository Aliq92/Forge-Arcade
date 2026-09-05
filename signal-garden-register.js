'use strict';

GAMES.push({
  id: 'signal-garden',
  title: 'Signal Garden',
  description: 'Plant signal nodes and shape a living interference field with pulse, phase, resonance, drift, and sound.',
  category: 'Experiments',
  featured: true,
  tags: ['Generative sandbox', 'Touch-first'],
  palette: ['#4dd9ec', '#b592ff'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
