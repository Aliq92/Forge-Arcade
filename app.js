'use strict';

const GAMES = [
  {
    id: 'digital-ant-colony',
    title: 'Digital Ant Colony',
    description: 'Watch a colony forage, lay pheromone trails, and adapt around obstacles in real time.',
    category: 'Simulations',
    featured: true,
    tags: ['Canvas simulation', 'Keyboard + touch'],
    palette: ['#ff7849', '#ffc857'],
  },
  {
    id: 'comet-shepherd',
    title: 'Comet Shepherd',
    description: 'Guide a fragile comet through a procedural solar system using gravity and momentum.',
    category: 'Games',
    featured: true,
    palette: ['#8b7cff', '#54d9ff'],
  },
  {
    id: 'void-drifter',
    title: 'Void Drifter',
    description: 'Drift through hazardous sectors, salvage resources, and upgrade your ship to survive.',
    category: 'Games',
    featured: true,
    palette: ['#b46cff', '#5ee4ff'],
  },
  {
    id: 'echo-runner',
    title: 'Echo Runner',
    description: 'Record your own movement and coordinate with your echoes to solve each level.',
    category: 'Games',
    featured: true,
    palette: ['#38d9c5', '#b6ff6a'],
  },
  {
    id: 'lantern-vale',
    title: 'Lantern Vale',
    description: 'An atmospheric exploration game of light, shadow, and fireflies.',
    category: 'Games',
    featured: true,
    palette: ['#ffb84d', '#ff6f91'],
  },
  {
    id: 'echo-miner',
    title: 'Echo Miner',
    description: 'Map a living cave with sonar, gather crystals, and outwit the creature hunting every sound.',
    category: 'Games',
    featured: true,
    palette: ['#51e6ff', '#ffbf57'],
  },
  {
    id: 'bacteria-bloom',
    title: 'Bacteria Bloom',
    description: 'Seed a petri dish with bacterial strains and watch organic colonies bloom and compete.',
    category: 'Simulations',
    palette: ['#7be071', '#d7ff74'],
  },
  {
    id: 'beat-foundry',
    title: 'Beat Foundry',
    description: 'A self-contained browser groovebox — sequence beats, play bass, and tweak effects.',
    category: 'Experiments',
    palette: ['#ff4f93', '#b778ff'],
  },
  {
    id: 'button-that-judges-you',
    title: 'The Button That Judges You',
    description: 'A single button that judges you, every time you press it.',
    category: 'Experiments',
    palette: ['#ff6b5f', '#ffd15c'],
  },
  {
    id: 'impossible-garden',
    title: 'Impossible Garden',
    description: 'Plant strange seeds, tend a calm generative garden, and watch impossible forms grow.',
    category: 'Simulations',
    featured: true,
    tags: ['Generative garden', 'Mouse + touch'],
    palette: ['#c8ccd4', '#8ec4c4'],
  },
  {
    id: 'kaleido-drift',
    title: 'Kaleido Drift',
    description: 'Draw into a generative mirror and watch every stroke bloom into luminous symmetry.',
    category: 'Experiments',
    tags: ['Generative art', 'Mouse + touch'],
    palette: ['#66e0ff', '#b45cff'],
  },
  {
    id: 'gravity-garden',
    title: 'Gravity Garden',
    description: 'Plant gravity wells and let particles settle into orbits, spirals, and slow drift.',
    category: 'Simulations',
    palette: ['#66e0a3', '#8da2ff'],
  },
  {
    id: 'gravity-sandbox',
    title: 'Gravity Sandbox',
    description: 'Drag to launch bodies into orbit and experiment with gravity and collisions.',
    category: 'Simulations',
    palette: ['#5aa9ff', '#8c79ff'],
  },
  {
    id: 'molt',
    title: 'Molt',
    description: "Eat, grow, and molt through stages while avoiding the pack that's hunting you.",
    category: 'Games',
    palette: ['#ff8264', '#e8ff70'],
  },
  {
    id: 'moonlit-terrarium',
    title: 'Moonlit Terrarium',
    description: 'A slow, atmospheric terrarium to tend across seven quiet nights.',
    category: 'Simulations',
    palette: ['#8f8cff', '#e6d5ff'],
  },
  {
    id: 'particle-lab',
    title: 'Particle Lab',
    description: 'An interactive particle-physics playground for experimenting with forces and motion.',
    category: 'Experiments',
    palette: ['#44d7ff', '#ff68cf'],
  },
  {
    id: 'ripple-run',
    title: 'Ripple Run',
    description: 'A calm water-based puzzle game — tap to ripple, guide the light home.',
    category: 'Games',
    palette: ['#46c7ff', '#8bf0d2'],
  },
  {
    id: 'starfall-garden',
    title: 'Starfall Garden',
    description: 'A peaceful survival-and-restoration game on a tiny drifting world.',
    category: 'Games',
    palette: ['#ffd05b', '#70dc92'],
  },
  {
    id: 'wildfire-simulator',
    title: 'Wildfire Simulator',
    description: 'A terrain wildfire-spread simulator driven by wind, fuel, and topography.',
    category: 'Simulations',
    palette: ['#ff6a3d', '#ffcc55'],
  },
];

const CATEGORIES = ['All', 'Featured', 'Games', 'Simulations', 'Experiments'];
const SPOTLIGHT_ID = 'digital-ant-colony';

const spotlightEl = document.getElementById('spotlight');
const featuredGrid = document.getElementById('featured-grid');
const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
const countLabel = document.getElementById('count-label');
const heroStatus = document.getElementById('hero-status');
const footerCount = document.getElementById('footer-count');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- deterministic per-game "seed" for procedural art ---------- */

function seedFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seedStyle(game) {
  const { id, palette = ['#ff7849', '#ffc857'] } = game;
  const h = seedFromId(id);
  const x = 15 + (h % 70); // 15–85%
  const y = 10 + ((h >> 8) % 60); // 10–70%
  const rot = (h >> 16) % 360;
  return `--seed-x:${x}%; --seed-y:${y}%; --seed-rot:${rot}deg; --game-primary:${palette[0]}; --game-secondary:${palette[1]};`;
}

function categoryClass(category) {
  return `art-${category.toLowerCase()}`;
}

/* ---------- spotlight ---------- */

function renderSpotlight() {
  const game = GAMES.find((g) => g.id === SPOTLIGHT_ID) || GAMES[0];
  const tags = (game.tags || []).map((t) => `<span class="spotlight-tag">${t}</span>`).join('');

  spotlightEl.innerHTML = `
    <a class="spotlight-panel" href="games/${game.id}/index.html" data-game="${game.id}" style="${seedStyle(game)}">
      <div class="spotlight-art" aria-hidden="true">
        <canvas id="spotlight-canvas"></canvas>
      </div>
      <div class="spotlight-body">
        <span class="spotlight-eyebrow">Featured Simulation</span>
        <h2 class="spotlight-title">${game.title}</h2>
        <p class="spotlight-desc">${game.description}</p>
        <div class="spotlight-meta">${tags}</div>
        <span class="spotlight-play">Play now <span class="arrow" aria-hidden="true">&#8594;</span></span>
      </div>
    </a>
  `;

  initSpotlightCanvas(document.getElementById('spotlight-canvas'));
}

/* ---------- ambient canvas for the spotlight (lightweight, pausable) ---------- */

function initSpotlightCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  let ants = [];
  let nest = { x: 0, y: 0 };
  let running = false;
  let rafId = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nest = { x: w * 0.5, y: h * 0.55 };
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(0, 0, w, h);
  }

  function seedAnts() {
    const count = w < 260 ? 14 : 20;
    const maxR = Math.min(w, h) * 0.46;
    ants = Array.from({ length: count }, (_, i) => ({
      angle: Math.random() * Math.PI * 2,
      baseRadius: maxR * (0.18 + 0.75 * (i / count) + Math.random() * 0.08),
      angularSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.0028 + Math.random() * 0.0032),
      wobbleAmp: 4 + Math.random() * 10,
      wobbleSpeed: 0.01 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
      squash: 0.72 + Math.random() * 0.16,
    }));
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(0, 0, w, h);
    const grd = ctx.createRadialGradient(nest.x, nest.y, 2, nest.x, nest.y, Math.max(w, h) * 0.5);
    grd.addColorStop(0, 'rgba(226,112,58,0.28)');
    grd.addColorStop(1, 'rgba(226,112,58,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(nest.x, nest.y, Math.max(w, h) * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(226,112,58,0.35)';
    ctx.lineWidth = 1;
    for (let r = 18; r < Math.min(w, h) * 0.42; r += 22) {
      ctx.beginPath();
      ctx.arc(nest.x, nest.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#e2703a';
    ctx.beginPath();
    ctx.arc(nest.x, nest.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  let t = 0;

  function step() {
    if (!running) return;
    t += 1;
    ctx.fillStyle = 'rgba(12,10,8,0.1)';
    ctx.fillRect(0, 0, w, h);

    for (const ant of ants) {
      ant.angle += ant.angularSpeed;
      const r = ant.baseRadius + Math.sin(t * ant.wobbleSpeed + ant.phase) * ant.wobbleAmp;
      const x = nest.x + Math.cos(ant.angle) * r;
      const y = nest.y + Math.sin(ant.angle) * r * ant.squash;

      ctx.fillStyle = 'rgba(226,112,58,0.5)';
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#e2703a';
    ctx.beginPath();
    ctx.arc(nest.x, nest.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running || prefersReducedMotion) return;
    running = true;
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  resize();
  seedAnts();

  if (prefersReducedMotion) {
    drawStatic();
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !document.hidden) start();
        else stop();
      });
    }, { threshold: 0.1 });
    io.observe(canvas);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (canvas.getBoundingClientRect().top < window.innerHeight) start();
    });
  }

  window.addEventListener('resize', () => {
    resize();
    seedAnts();
    if (prefersReducedMotion) drawStatic();
  });
}

/* ---------- featured collection ---------- */

function featuredCardHTML(game) {
  return `
    <a class="f-card" href="games/${game.id}/index.html" data-game="${game.id}" style="${seedStyle(game)}">
      <div class="f-card-art ${categoryClass(game.category)}" aria-hidden="true"><span class="art-code">${game.title.charAt(0)}</span></div>
      <div class="f-card-body">
        <span class="card-category">${game.category}</span>
        <h3 class="f-card-title">${game.title}</h3>
        <p class="card-desc">${game.description}</p>
        <span class="card-play">Play <span class="arrow" aria-hidden="true">&#8594;</span></span>
      </div>
    </a>
  `;
}

function renderFeaturedCollection() {
  const list = GAMES.filter((g) => g.featured && g.id !== SPOTLIGHT_ID);
  featuredGrid.innerHTML = list.map(featuredCardHTML).join('');
}

/* ---------- main filterable grid ---------- */

function cardHTML(game) {
  return `
    <a class="card" href="games/${game.id}/index.html" data-game="${game.id}" data-category="${game.category}" role="listitem" style="${seedStyle(game)}">
      <div class="card-art ${categoryClass(game.category)}" aria-hidden="true"><span class="art-code">${game.title.charAt(0)}</span></div>
      <div class="card-body">
        <span class="card-category">${game.category}</span>
        <h3 class="card-title">${game.title}</h3>
        <p class="card-desc">${game.description}</p>
        <span class="card-play">Play <span class="arrow" aria-hidden="true">&#8594;</span></span>
      </div>
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
  tabs.setAttribute('role', 'tablist');
  tabs.innerHTML = CATEGORIES.map((cat, i) => `
    <button class="tab" type="button" role="tab" id="tab-${cat}" data-cat="${cat}"
      aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}">${cat}</button>
  `).join('');

  const buttons = () => Array.from(tabs.querySelectorAll('.tab'));

  function select(btn) {
    buttons().forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
      b.tabIndex = -1;
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.tabIndex = 0;
    btn.focus();
    render(btn.dataset.cat);
  }

  buttons()[0].classList.add('active');

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    select(btn);
  });

  tabs.addEventListener('keydown', (e) => {
    const list = buttons();
    const i = list.indexOf(document.activeElement);
    if (i === -1) return;
    let next = null;
    if (e.key === 'ArrowRight') next = list[(i + 1) % list.length];
    else if (e.key === 'ArrowLeft') next = list[(i - 1 + list.length) % list.length];
    else if (e.key === 'Home') next = list[0];
    else if (e.key === 'End') next = list[list.length - 1];
    if (next) {
      e.preventDefault();
      select(next);
    }
  });
}

/* ---------- init ---------- */

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);

renderSpotlight();
renderFeaturedCollection();
initTabs();
render('All');
