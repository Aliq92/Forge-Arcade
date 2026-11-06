'use strict';

GAMES.push({
  id: 'window-seat',
  title: 'WINDOW SEAT',
  description: 'Settle into an endless train journey. Watch riverlands, highlands and coast drift past, sip your coffee, and choose the light, rain and pace.',
  category: 'Experiments',
  featured: true,
  tags: ['Relaxing journey', 'No scores or timers', 'Keyboard + touch'],
  artId: 'window-seat',
  palette: ['#b4c7a5', '#d9b97b'],
  metadata: { category: 'Relaxation', orientation: 'any', supportsPause: true, supportsPersistentSave: true },
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
