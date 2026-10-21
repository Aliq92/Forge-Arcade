'use strict';

GAMES.push({
  id: 'night-freight',
  title: 'NIGHT FREIGHT',
  description: 'Work a magnetic crane at a miniature night harbour. Manage the swing, stack steel on a rocking barge, and dispatch three handcrafted shipments.',
  category: 'Games',
  featured: true,
  tags: ['Crane physics', 'Stacking', 'Keyboard + touch'],
  artId: 'night-freight',
  palette: ['#dfa066', '#8eb9ae', '#13262e'],
  metadata: { category: 'Physics', orientation: 'any', supportsPause: true, supportsPersistentSave: true },
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
