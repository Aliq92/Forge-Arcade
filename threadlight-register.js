'use strict';

GAMES.push({
  id: 'threadlight',
  title: 'Threadlight',
  description: 'Weave luminous constellations across a dark sky, discover hidden nodes, and restore each region through connected shapes.',
  category: 'Games',
  featured: false,
  tags: ['Constellation puzzle', 'Touch + mouse', 'Journey + daily mode'],
  palette: ['#ef9a48', '#8fc8ff'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
