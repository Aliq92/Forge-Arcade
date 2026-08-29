'use strict';

const GAMES = [
  {
    id: 'digital-ant-colony',
    title: 'Digital Ant Colony',
    description: 'Watch a colony forage, lay pheromone trails, and adapt around obstacles in real time.',
    category: 'Simulations',
    featured: true,
  },
  {
    id: 'comet-shepherd',
    title: 'Comet Shepherd',
    description: 'Guide a fragile comet through a procedural solar system using gravity and momentum.',
    category: 'Games',
    featured: true,
  },
  {
    id: 'void-drifter',
    title: 'Void Drifter',
    description: 'Drift through hazardous sectors, salvage resources, and upgrade your ship to survive.',
    category: 'Games',
    featured: true,
  },
  {
    id: 'orbital-bloom-cosmic-gardener',
    title: 'Orbital Bloom',
    description: 'Place gravity attractors and watch clouds of particles bloom into rings, spirals, and orbits.',
    category: 'Simulations',
    featured: true,
  },
  {
    id: 'echo-runner',
    title: 'Echo Runner',
    description: 'Record your own movement and coordinate with your echoes to solve each level.',
    category: 'Games',
    featured: true,
  },
  {
    id: 'lantern-vale',
    title: 'Lantern Vale',
    description: 'An atmospheric exploration game of light, shadow, and fireflies.',
    category: 'Games',
    featured: true,
  },
  {
    id: 'bacteria-bloom',
    title: 'Bacteria Bloom',
    description: 'Seed a petri dish with bacterial strains and watch organic colonies bloom and compete.',
    category: 'Simulations',
  },
  {
    id: 'beat-foundry',
    title: 'Beat Foundry',
    description: 'A self-contained browser groovebox — sequence beats, play bass, and tweak effects.',
    category: 'Experiments',
  },
  {
    id: 'button-that-judges-you',
    title: 'The Button That Judges You',
    description: 'A single button that judges you, every time you press it.',
    category: 'Experiments',
  },
  {
    id: 'gravity-garden',
    title: 'Gravity Garden',
    description: 'Plant gravity wells and let particles settle into orbits, spirals, and slow drift.',
    category: 'Simulations',
  },
  {
    id: 'gravity-sandbox',
    title: 'Gravity Sandbox',
    description: 'Drag to launch bodies into orbit and experiment with gravity and collisions.',
    category: 'Simulations',
  },
  {
    id: 'molt',
    title: 'Molt',
    description: "Eat, grow, and molt through stages while avoiding the pack that's hunting you.",
    category: 'Games',
  },
  {
    id: 'moonlit-terrarium',
    title: 'Moonlit Terrarium',
    description: 'A slow, atmospheric terrarium to tend across seven quiet nights.',
    category: 'Simulations',
  },
  {
    id: 'particle-lab',
    title: 'Particle Lab',
    description: 'An interactive particle-physics playground for experimenting with forces and motion.',
    category: 'Experiments',
  },
  {
    id: 'ripple-run',
    title: 'Ripple Run',
    description: 'A calm water-based puzzle game — tap to ripple, guide the light home.',
    category: 'Games',
  },
  {
    id: 'starfall-garden',
    title: 'Starfall Garden',
    description: 'A peaceful survival-and-restoration game on a tiny drifting world.',
    category: 'Games',
  },
  {
    id: 'wildfire-simulator',
    title: 'Wildfire Simulator',
    description: 'A terrain wildfire-spread simulator driven by wind, fuel, and topography.',
    category: 'Simulations',
  },
];

const CATEGORIES = ['All', 'Featured', 'Games', 'Simulations', 'Experiments'];

const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
const countLabel = document.getElementById('count-label');

function cardHTML(game) {
  return `
    <a class="card${game.featured ? ' card--featured' : ''}" href="games/${game.id}/index.html" data-category="${game.category}">
      <div class="card-top">
        <span class="card-category">${game.category}</span>
        ${game.featured ? '<span class="card-featured-badge">Featured</span>' : ''}
      </div>
      <h3 class="card-title">${game.title}</h3>
      <p class="card-desc">${game.description}</p>
      <span class="card-launch">Launch <span class="arrow" aria-hidden="true">&#8594;</span></span>
    </a>
  `;
}

function render(filter) {
  const list = GAMES.filter((g) => {
    if (filter === 'All') return true;
    if (filter === 'Featured') return !!g.featured;
    return g.category === filter;
  });

  grid.innerHTML = list.map(cardHTML).join('');
  countLabel.textContent = `${list.length} ${list.length === 1 ? 'experience' : 'experiences'}`;
}

function initTabs() {
  tabs.innerHTML = CATEGORIES.map((cat, i) => `
    <button class="tab${i === 0 ? ' active' : ''}" type="button" data-cat="${cat}">${cat}</button>
  `).join('');

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.cat);
  });
}

initTabs();
render('All');
