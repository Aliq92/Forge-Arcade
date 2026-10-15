'use strict';

GAMES.push({
  id: 'pop-parade',
  title: 'Pop Parade',
  description: 'Pop colorful balloons, trigger spectacular chain reactions, and chase your biggest celebration.',
  category: 'Games',
  featured: true,
  tags: ['Chain Reaction', 'One-Touch', 'Casual Arcade'],
  artId: 'pop-parade',
  palette: ['#72d9ee', '#ff8c79', '#090d17'],
  metadata: { category: 'Arcade', orientation: 'any', supportsPause: true, supportsPersistentSave: true },
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
