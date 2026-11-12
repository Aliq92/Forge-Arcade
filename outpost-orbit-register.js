'use strict';

GAMES.push({
  id: 'outpost-orbit',
  title: 'Outpost Orbit',
  description: 'Build a frontier station with an autonomous alien crew. Complete nine missions, survey the moon and install useful upgrades as your outpost grows.',
  category: 'Simulations',
  featured: true,
  tags: ['Alien village', 'Living simulation', 'Colony', 'Autonomous AI'],
  artId: 'outpost-orbit',
  palette: ['#76d8df', '#f3d491', '#473259'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
