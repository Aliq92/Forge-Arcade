'use strict';

GAMES.push({
  id: 'apogee',
  title: 'Apogee',
  description: 'Master stage timing, upgrade your rocket, then pilot through deep space to dodge glowing anomalies and push for a higher apogee.',
  category: 'Games',
  featured: true,
  tags: ['Stage timing', 'Deep-space piloting', 'Progression'],
  palette: ['#62f5db', '#ffbd4a'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
