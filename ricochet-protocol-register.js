'use strict';

GAMES.push({
  id: 'ricochet-protocol',
  title: 'RICOCHET PROTOCOL',
  description: 'Bank one neon bolt through shifting security vaults. Chain targets, steal data, upgrade, and breach the Warden.',
  category: 'Games',
  featured: true,
  tags: ['Ricochet action', 'Mouse + touch'],
  palette: ['#25e6ff', '#ff3b5c'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
