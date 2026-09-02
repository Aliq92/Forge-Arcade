'use strict';

GAMES.push({
  id: 'kaleido-drift',
  title: 'Kaleido Drift',
  description: 'Draw into a generative mirror and watch every stroke bloom into luminous symmetry.',
  category: 'Experiments',
  tags: ['Generative art', 'Mouse + touch'],
  palette: ['#66e0ff', '#b45cff'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
