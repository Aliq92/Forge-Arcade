'use strict';

GAMES.push({
  id: 'mossbound',
  title: 'MOSSBOUND',
  description: 'Bring a forgotten courtyard back to life. Brush warm stone, mend planters, grow greenery, and let the fountain flow. No hurry, just a little care.',
  category: 'Games',
  featured: true,
  tags: ['Quiet restoration', 'Local saves', 'Mouse + touch'],
  artId: 'mossbound',
  palette: ['#7fa060', '#d4c29a'],
  metadata: { orientation: 'any', supportsPersistentSave: true },
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
