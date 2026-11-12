// Simulation owns serializable state. Rendering never advances the world.
export const TYPES = {
  habitat: {
    name: 'Habitat pod',
    cost: 16,
    r: 34,
    icon: '⌂',
    description: 'A cozy home for four. Rest comes easier.',
  },
  garden: {
    name: 'Food garden',
    cost: 12,
    r: 37,
    icon: '♧',
    description: 'Tended by villagers. Grows moonfruit.',
  },
  storage: {
    name: 'Storage pod',
    cost: 10,
    r: 27,
    icon: '▤',
    description: 'A delivery hub. Expands resource capacity.',
  },
  energy: {
    name: 'Energy crystal',
    cost: 18,
    r: 25,
    icon: 'ϟ',
    description: 'Quietly gathers the light of distant suns.',
  },
  workshop: {
    name: 'Workshop',
    cost: 24,
    r: 33,
    icon: '⚒',
    description: 'Better tools. Faster gathering and building.',
    unlock: 12,
  },
  research: {
    name: 'Research hut',
    cost: 22,
    r: 32,
    icon: '⌁',
    description: 'A place for curious minds to make knowledge.',
    unlock: 8,
  },
  social: {
    name: 'Social light',
    cost: 8,
    r: 22,
    icon: '☼',
    description: 'Warm light, shared stories, lasting friends.',
  },
  observatory: {
    name: 'Observatory',
    cost: 36,
    r: 38,
    icon: '◉',
    description: 'Listen to the monolith. Follow its signal.',
    unlock: 55,
  },
  landing: { name: 'Landing pod', r: 44 },
  camp: { name: 'Communal fire', r: 20 },
};
const names = [
  'Zilo',
  'Moro',
  'Vek',
  'Pippa',
  'Nuun',
  'Tala',
  'Kero',
  'Bim',
  'Oola',
  'Ruu',
  'Eko',
  'Lumi',
  'Nim',
  'Tiko',
  'Una',
  'Pip',
  'Sola',
  'Mii',
  'Loa',
  'Yoro',
  'Ari',
  'Vuu',
  'Omi',
  'Nola',
];
const colors = [
  '#b9d583',
  '#e8b58b',
  '#b3a8e5',
  '#e38d9b',
  '#83d4c5',
  '#eccb7d',
];
const personalities = [
  ['CURIOUS', 'BRAVE'],
  ['SOCIAL', 'PLAYFUL'],
  ['HARDWORKING', 'CAUTIOUS'],
  ['LAZY', 'HOMEBOUND'],
  ['INVENTIVE', 'NIGHT OWL'],
  ['SHY', 'CURIOUS'],
];
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function random(s) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function alien(s, id, x, y, baby = false) {
  return {
    id,
    name: names[id % names.length],
    x,
    y,
    px: x,
    py: y,
    color: colors[id % 6],
    traits: [...personalities[id % 6]],
    needs: { hunger: 15 + id * 5, rest: 15 + id * 6, social: 25 + id * 7 },
    task: null,
    relationships: {},
    favoritePlace: null,
    visits: {},
    homeId: null,
    visualTraits: [],
    exposures: { crystal: 0, fungal: 0, tech: 0, water: 0 },
    memories: [],
    age: baby ? 0 : 600,
    decision: 0,
    stats: {},
    carrying: null,
  };
}
export function create(seed = Date.now() >>> 0) {
  const s = {
    saveVersion: 1,
    seed,
    terrainSeed: seed,
    time: 35,
    speed: 1,
    muted: true,
    resources: { food: 38, energy: 24, material: 64, knowledge: 0 },
    priorities: { food: 1, build: 1, research: 1, explore: 1 },
    buildings: [
      { id: 1, type: 'landing', x: 0, y: 0, progress: 1 },
      { id: 2, type: 'camp', x: 88, y: 62, progress: 1 },
    ],
    aliens: [],
    discoveries: [
      {
        id: 'pond',
        name: 'Glow Pond',
        x: -270,
        y: 110,
        kind: 'water',
        found: false,
      },
      {
        id: 'crystal',
        name: 'Singing Crystals',
        x: 250,
        y: -130,
        kind: 'crystal',
        found: false,
      },
      {
        id: 'grove',
        name: 'Lantern Grove',
        x: -270,
        y: -240,
        kind: 'fungal',
        found: false,
      },
      {
        id: 'bones',
        name: 'Giant Skeleton',
        x: 380,
        y: 240,
        kind: 'bones',
        found: false,
      },
      {
        id: 'cave',
        name: 'Glowing Cave',
        x: -490,
        y: 290,
        kind: 'cave',
        found: false,
      },
      {
        id: 'machine',
        name: 'Ancient Machine',
        x: 450,
        y: -310,
        kind: 'tech',
        found: false,
      },
      {
        id: 'vent',
        name: 'Warmstone Vent',
        x: 130,
        y: 430,
        kind: 'vent',
        found: false,
      },
      {
        id: 'egg',
        name: 'Strange Egg',
        x: -470,
        y: -390,
        kind: 'egg',
        found: false,
      },
      {
        id: 'monolith',
        name: 'The Monolith',
        x: 610,
        y: 65,
        kind: 'monolith',
        found: false,
      },
    ],
    nodes: [
      { id: 'fruit', name: 'Moonfruit patch', x: -95, y: 80, kind: 'food' },
      { id: 'salvage', name: 'Pod salvage', x: 130, y: -70, kind: 'material' },
      { id: 'fungus', name: 'Wild fungi', x: -160, y: -100, kind: 'food' },
      {
        id: 'rocks',
        name: 'Softstone ridge',
        x: 180,
        y: 160,
        kind: 'material',
      },
    ],
    revealed: [{ x: 0, y: 0, r: 225 }],
    paths: {},
    log: [],
    eventAt: 110,
    arrivalAt: 480,
    monolith: 0,
    monolithProgress: 0,
    eggStage: 0,
    eggAt: 0,
    nextId: 3,
    metrics: { steps: 0, completed: 0, social: 0, discoveries: 0 },
  };
  for (let i = 0; i < 5; i++)
    s.aliens.push(alien(s, i, -60 + i * 27, 50 + (i % 2) * 30));
  record(
    s,
    'ARRIVAL',
    'Five travelers landed on a quiet moon. A little world begins.',
  );
  return s;
}
export function record(s, kind, message) {
  s.log.unshift({
    day: Math.floor(s.time / 180) + 1,
    time: s.time,
    kind,
    message,
  });
  s.log = s.log.slice(0, 80);
  s.latestEvent = { kind, message, time: s.time };
}
export const explored = (s, x, y) =>
  s.revealed.some((p) => Math.hypot(x - p.x, y - p.y) < p.r);
export function validPlacement(s, type, x, y) {
  const r = TYPES[type].r;
  return (
    Math.abs(x) < 740 &&
    Math.abs(y) < 510 &&
    explored(s, x, y) &&
    !s.buildings.some((b) => dist(b, { x, y }) < TYPES[b.type].r + r + 12) &&
    !s.discoveries.some(
      (d) => dist(d, { x, y }) < (d.kind === 'water' ? 110 : 35) + r,
    ) &&
    !s.nodes.some((n) => dist(n, { x, y }) < r + 18)
  );
}
export function place(s, type, x, y) {
  const t = TYPES[type];
  if (
    s.resources.material < t.cost ||
    s.resources.knowledge < (t.unlock || 0) ||
    !validPlacement(s, type, x, y)
  )
    return false;
  s.resources.material -= t.cost;
  s.buildings.push({ id: s.nextId++, type, x, y, progress: 0 });
  record(
    s,
    'FOUNDATION',
    `${t.name} planned. The villagers will build it in their own time.`,
  );
  return true;
}
const active = (s, t) =>
  s.buildings.filter((b) => b.type === t && b.progress >= 1);
function memory(a, text) {
  a.memories.unshift(text);
  a.memories = a.memories.slice(0, 6);
}
function assignHomes(s) {
  let pods = active(s, 'habitat');
  s.aliens.forEach((a, i) => (a.homeId = pods[Math.floor(i / 4)]?.id || null));
}

// Cached, coarse routes keep feet out of ponds and other pods. No per-frame search.
function route(s, a, t) {
  const end = { x: t.target.x + (t.offset || 0), y: t.target.y + 20 },
    cell = 25;
  const obstacles = [
    ...s.buildings
      .filter((b) => b.id !== t.target.id)
      .map((b) => ({
        x: b.x,
        y: b.y,
        rx: TYPES[b.type].r + 7,
        ry: TYPES[b.type].r * 0.65 + 7,
      })),
    ...s.discoveries
      .filter((d) => d.kind === 'water')
      .map((d) => ({ x: d.x, y: d.y, rx: 108, ry: 59 })),
  ];
  const sx = Math.round(a.x / cell),
    sy = Math.round(a.y / cell),
    gx = Math.round(end.x / cell),
    gy = Math.round(end.y / cell),
    start = sx + ',' + sy,
    goal = gx + ',' + gy;
  const blocked = (x, y) =>
    Math.abs(x) > 31 ||
    Math.abs(y) > 22 ||
    (x + ',' + y !== start &&
      x + ',' + y !== goal &&
      obstacles.some(
        (o) =>
          ((x * cell - o.x) / o.rx) ** 2 + ((y * cell - o.y) / o.ry) ** 2 < 1,
      ));
  const open = [{ x: sx, y: sy, key: start, g: 0, f: 0 }],
    best = new Map([[start, 0]]),
    came = new Map();
  let found = false,
    n = 0;
  while (open.length && n++ < 1800) {
    open.sort((a, b) => b.f - a.f);
    const p = open.pop();
    if (p.key === goal) {
      found = true;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = p.x + dx,
        y = p.y + dy,
        key = x + ',' + y;
      if (
        blocked(x, y) ||
        (dx && dy && (blocked(p.x + dx, p.y) || blocked(p.x, p.y + dy)))
      )
        continue;
      const g = p.g + (dx && dy ? 1.414 : 1);
      if (g >= (best.get(key) ?? Infinity)) continue;
      best.set(key, g);
      came.set(key, p.key);
      open.push({ x, y, key, g, f: g + Math.hypot(x - gx, y - gy) });
    }
  }
  if (!found) return [end];
  let cursor = goal,
    path = [];
  while (cursor !== start && path.length < 90) {
    const [x, y] = cursor.split(',').map(Number);
    path.push({ x: x * cell, y: y * cell });
    cursor = came.get(cursor);
    if (!cursor) break;
  }
  path.reverse();
  path.push(end);
  return path;
}

function choose(s, a) {
  const options = [];
  const trait = (t) => a.traits.includes(t);
  const add = (kind, target, base, duration = 9) => {
    if (target)
      options.push({
        kind,
        target: { x: target.x, y: target.y, id: target.id, name: target.name },
        score: base - dist(a, target) * 0.018 + random(s) * 12,
        duration,
      });
  };
  const home = s.buildings.find((b) => b.id === a.homeId) || s.buildings[0],
    night = s.time % 180 > 118;
  add(
    'eat',
    s.buildings[0],
    a.needs.hunger * 1.2 + (s.resources.food > 0 ? 0 : -25),
    5,
  );
  add(
    'sleep',
    home,
    a.needs.rest * 1.1 + (night && !trait('NIGHT OWL') ? 22 : 0),
    18,
  );
  add(
    'socialize',
    active(s, 'social')[0] || s.buildings[1],
    a.needs.social * 0.78 + (trait('SOCIAL') ? 24 : trait('SHY') ? -14 : 0),
    14,
  );
  for (const b of s.buildings.filter((b) => b.progress < 1)) {
    const workers = s.aliens.filter(
      (v) => v.task?.kind === 'build' && v.task.target.id === b.id,
    ).length;
    add(
      'build',
      b,
      28 +
        s.priorities.build * 19 +
        (trait('HARDWORKING') ? 17 : 0) +
        (b.type === 'garden' ? s.priorities.food * 5 : 0) -
        workers * 18,
      12,
    );
  }
  for (const b of active(s, 'garden')) {
    const workers = s.aliens.filter(
      (v) => v.task?.kind === 'farm' && v.task.target.id === b.id,
    ).length;
    add(
      'farm',
      b,
      20 +
        s.priorities.food * 17 +
        (s.resources.food < 25 ? 24 : 0) +
        (trait('HARDWORKING') ? 15 : 0) -
        workers * 23,
      12,
    );
  }
  for (const n of s.nodes)
    add(
      n.kind === 'food' ? 'forage' : 'gather',
      n,
      18 +
        (n.kind === 'food'
          ? s.priorities.food * 12 + (s.resources.food < 25 ? 24 : 0)
          : s.resources.material < 45
            ? 26
            : 10) +
        (trait('HARDWORKING') ? 16 : 0) -
        (trait('LAZY') ? 12 : 0),
      10,
    );
  for (const b of [...active(s, 'research'), ...active(s, 'observatory')]) {
    const workers = s.aliens.filter(
      (v) => v.task?.kind === 'research' && v.task.target.id === b.id,
    ).length;
    add(
      'research',
      b,
      22 +
        s.priorities.research * 18 +
        (trait('INVENTIVE') ? 25 : 0) -
        workers * 22,
      14,
    );
  }
  const unknown = s.discoveries
    .filter((d) => !d.found)
    .sort((x, y) => dist(a, x) - dist(a, y));
  if (unknown.length)
    add(
      'explore',
      unknown[Math.floor(random(s) * Math.min(3, unknown.length))],
      18 +
        s.priorities.explore * 16 +
        (trait('CURIOUS') ? 28 : 0) +
        (trait('BRAVE') ? 10 : 0) -
        (trait('CAUTIOUS') ? 22 : 0),
      8,
    );
  const sites = s.discoveries.filter((d) => d.found);
  if (sites.length)
    add(
      'observe',
      sites.find((d) => d.id === a.favoritePlace) && random(s) < 0.55
        ? sites.find((d) => d.id === a.favoritePlace)
        : sites[Math.floor(random(s) * sites.length)],
      23 + (trait('CURIOUS') ? 23 : 0) + (trait('INVENTIVE') ? 13 : 0),
      15,
    );
  const favorite =
    s.discoveries.find((d) => d.id === a.favoritePlace) || s.buildings[1];
  add(
    'relax',
    favorite,
    18 + (trait('LAZY') ? 31 : 0) + (trait('HOMEBOUND') ? 9 : 0),
    15,
  );
  add(
    'wander',
    { x: random(s) * 300 - 150, y: random(s) * 240 - 120, name: 'the village' },
    22 + (trait('PLAYFUL') ? 15 : 0),
    5,
  );
  if (a.age < 180) {
    options.splice(0, options.length);
    add(
      'wander',
      {
        x: home.x + random(s) * 100 - 50,
        y: home.y + random(s) * 100 - 50,
        name: 'near home',
      },
      40,
      5,
    );
    add('sleep', home, a.needs.rest, 12);
    add('eat', s.buildings[0], a.needs.hunger, 5);
  }
  options.sort((x, y) => y.score - x.score);
  let picked = options[0];
  a.task = {
    ...picked,
    remaining: picked.duration,
    elapsed: 0,
    phase: 'walk',
    offset: ((a.id % 3) - 1) * 10,
  };
  a.task.waypoints = route(s, a, a.task);
  a.decision = 0;
  a.stats[picked.kind] = (a.stats[picked.kind] || 0) + 1;
}
function reveal(s, a) {
  if (!s.revealed.some((p) => dist(a, p) < 60)) {
    s.revealed.push({ x: a.x, y: a.y, r: 125 });
    if (s.revealed.length > 220) s.revealed.splice(1, 1);
  }
  for (const d of s.discoveries) {
    if (!d.found && dist(a, d) < 80) {
      d.found = true;
      s.resources.knowledge += 8;
      s.metrics.discoveries++;
      record(
        s,
        'DISCOVERY',
        `${a.name} found ${d.name}. There is more to this moon than we knew.`,
      );
      memory(a, `I was the first to find ${d.name}.`);
      if (d.kind === 'monolith') s.monolith = 1;
      if (d.kind === 'egg') {
        s.eggStage = 1;
        s.eggAt = s.time + 180;
      }
    }
  }
}
function friendships(s, a, dt) {
  for (const b of s.aliens) {
    if (a.id >= b.id || dist(a, b) > 58) continue;
    if (a.task?.phase !== 'work' || b.task?.phase !== 'work') continue;
    let prev = a.relationships[b.id] || 0;
    let now = Math.min(
      100,
      prev +
        dt *
          (a.task.kind === 'socialize' || b.task.kind === 'socialize'
            ? 1.2
            : 0.22),
    );
    a.relationships[b.id] = now;
    b.relationships[a.id] = now;
    s.metrics.social += dt;
    if (prev < 25 && now >= 25) {
      record(
        s,
        'FRIENDSHIP',
        `${a.name} and ${b.name} became friends. They keep finding each other.`,
      );
      memory(a, `Made a friend in ${b.name}.`);
      memory(b, `Made a friend in ${a.name}.`);
    }
    if (prev < 70 && now >= 70)
      record(
        s,
        'CLOSE FRIENDS',
        `${a.name} and ${b.name} now share a very special bond.`,
      );
  }
}
function finish(s, a) {
  const t = a.task,
    b = s.buildings.find((v) => v.id === t.target.id),
    d = s.discoveries.find((v) => v.id === t.target.id);
  switch (t.kind) {
    case 'forage':
      a.carrying = { kind: 'food', amount: 8 };
      break;
    case 'farm':
      a.carrying = { kind: 'food', amount: 17 };
      break;
    case 'gather':
      a.carrying = {
        kind: 'material',
        amount: active(s, 'workshop').length ? 12 : 8,
      };
      break;
    case 'deliver':
      if (a.carrying) {
        s.resources[a.carrying.kind] += a.carrying.amount;
        a.carrying = null;
      }
      break;
    case 'research':
      s.resources.knowledge += 5;
      s.resources.energy = Math.max(0, s.resources.energy - 1);
      if (s.monolith > 0)
        s.monolithProgress += active(s, 'observatory').length ? 8 : 2;
      break;
    case 'observe':
      if (d) {
        s.resources.knowledge += 2;
        a.visits[d.id] = (a.visits[d.id] || 0) + 1;
        if (a.visits[d.id] === 3 && !a.favoritePlace) {
          a.favoritePlace = d.id;
          record(
            s,
            'LITTLE RITUAL',
            `${a.name} keeps returning to ${d.name}. A favorite place, perhaps.`,
          );
          memory(a, `${d.name} feels like home.`);
        }
        if (d.kind === 'monolith') s.monolithProgress += 3;
      }
      break;
  }
  if (a.carrying && t.kind !== 'deliver') {
    const hub = active(s, 'storage')[0] || s.buildings[0];
    a.task = {
      kind: 'deliver',
      target: { x: hub.x, y: hub.y, id: hub.id, name: 'storage' },
      phase: 'walk',
      remaining: 2,
      elapsed: 0,
      offset: 0,
    };
    a.task.waypoints = route(s, a, a.task);
    return;
  }
  a.task = null;
  s.metrics.completed++;
}
export function step(s, dt = 0.1) {
  s.time += dt;
  s.metrics.steps++;
  for (const b of active(s, 'energy')) s.resources.energy += dt * 0.12;
  for (const a of s.aliens) {
    a.px = a.x;
    a.py = a.y;
    a.age += dt;
    a.needs.hunger = Math.min(100, a.needs.hunger + dt * 0.25);
    a.needs.rest = Math.min(100, a.needs.rest + dt * 0.18);
    a.needs.social = Math.min(100, a.needs.social + dt * 0.16);
    if (!a.task) choose(s, a);
    const t = a.task;
    t.elapsed += dt;
    if (t.phase === 'walk') {
      let target = t.waypoints?.[0] || {
        x: t.target.x + (t.offset || 0),
        y: t.target.y + 20,
      };
      let dx = target.x - a.x,
        dy = target.y - a.y,
        d = Math.hypot(dx, dy),
        travel = Math.min(d, dt * (a.age < 180 ? 19 : 27));
      if (d > 3) {
        a.x += (dx / d) * travel;
        a.y += (dy / d) * travel;
        const key = `${Math.round(a.x / 18)},${Math.round(a.y / 18)}`;
        if (s.paths[key] === undefined) {
          s.pathCount = (s.pathCount || Object.keys(s.paths).length) + 1;
          if (s.pathCount > 1800) {
            delete s.paths[Object.keys(s.paths)[0]];
            s.pathCount--;
          }
        }
        s.paths[key] = Math.min(1, (s.paths[key] || 0) + dt * 0.009);
        if (t.kind === 'explore') reveal(s, a);
      } else if (t.waypoints?.length > 1) t.waypoints.shift();
      else t.phase = 'work';
      if (t.elapsed > 75) {
        a.task = null;
        a.carrying = null;
      }
    } else {
      t.remaining -= dt;
      if (t.kind === 'eat') {
        a.needs.hunger = Math.max(
          0,
          a.needs.hunger - dt * (s.resources.food > 0.05 ? 14 : 4),
        );
        s.resources.food = Math.max(0, s.resources.food - dt * 0.25);
      }
      if (t.kind === 'sleep')
        a.needs.rest = Math.max(0, a.needs.rest - dt * (a.homeId ? 7 : 4));
      if (t.kind === 'socialize')
        a.needs.social = Math.max(0, a.needs.social - dt * 5);
      if (t.kind === 'relax')
        a.needs.rest = Math.max(0, a.needs.rest - dt * 1.5);
      if (t.kind === 'build') {
        const b = s.buildings.find((v) => v.id === t.target.id);
        if (b && b.progress < 1) {
          b.progress = Math.min(
            1,
            b.progress + dt * (active(s, 'workshop').length ? 0.029 : 0.022),
          );
          if (b.progress >= 1) {
            record(
              s,
              'BUILT',
              `${TYPES[b.type].name} is ready. ${a.name} added the finishing touch.`,
            );
            memory(a, `Helped build ${TYPES[b.type].name}.`);
            assignHomes(s);
          }
        } else t.remaining = 0;
      }
      friendships(s, a, dt);
      if (t.remaining <= 0) finish(s, a);
    }
    for (const d of s.discoveries.filter((v) => v.found)) {
      if (dist(a, d) < 120 && a.exposures[d.kind] !== undefined) {
        a.exposures[d.kind] += dt;
        if (
          !a.visualTraits.includes(d.kind) &&
          a.exposures[d.kind] > 150 + 25 * a.id
        ) {
          a.visualTraits.push(d.kind);
          record(
            s,
            'NEW TRAIT',
            `${a.name} developed ${d.kind === 'water' ? 'delicate fins' : d.kind === 'tech' ? 'silver markings' : 'luminous spots'} after spending time near ${d.name}.`,
          );
          memory(a, 'The moon is becoming a part of me.');
        }
      }
    }
  }
  let thresholds = [0, 0, 25, 70, 140];
  if (
    s.monolith > 0 &&
    s.monolith < 4 &&
    s.monolithProgress >= thresholds[s.monolith + 1] &&
    (s.monolith < 2 || active(s, 'research').length > 0) &&
    (s.monolith < 3 || active(s, 'observatory').length > 0)
  ) {
    s.monolith++;
    s.resources.knowledge += 15;
    record(
      s,
      'THE MONOLITH',
      [
        '',
        '',
        'The monolith hums when someone approaches.',
        'A pattern appears in the stone. It remembers the stars.',
        'THE SIGNAL ANSWERS. Somewhere, something is listening.',
      ][s.monolith],
    );
  }
  if (s.eggStage && s.time > s.eggAt && s.eggStage < 3) {
    s.eggStage++;
    s.eggAt = s.time + 180;
    record(
      s,
      'STRANGE EGG',
      s.eggStage === 2
        ? 'The strange egg is warm. Something stirs inside.'
        : 'The egg hatched into a floating little friend. It seems to like us.',
    );
  }
  if (s.time > s.eventAt) {
    s.eventAt = s.time + 100 + random(s) * 100;
    let a = s.aliens[Math.floor(random(s) * s.aliens.length)];
    let messages = [
      `${a.name} saw a silent craft cross the sky. Nobody else looked up.`,
      `A shower of silver spores drifts through the village.`,
      `The power crystals sang a low, gentle note.`,
      `${a.name} found a smooth pebble and decided to keep it.`,
    ];
    record(
      s,
      'MOON STORIES',
      messages[Math.floor(random(s) * messages.length)],
    );
    memory(a, 'Witnessed a little moon mystery.');
    s.resources.energy += 3;
  }
  if (s.time > s.arrivalAt) {
    s.arrivalAt = s.time + 420 + random(s) * 160;
    const capacity = 5 + active(s, 'habitat').length * 4;
    if (s.aliens.length < Math.min(24, capacity)) {
      const parent = s.aliens.find((a) =>
        Object.values(a.relationships).some((v) => v > 70),
      );
      const baby = !!parent;
      const a = alien(
        s,
        s.aliens.length,
        parent?.x || 0,
        parent?.y || 50,
        baby,
      );
      if (parent) {
        a.visualTraits = [...parent.visualTraits];
        a.color = parent.color;
      }
      s.aliens.push(a);
      assignHomes(s);
      record(
        s,
        baby ? 'NEW LITTLE LIFE' : 'NEW ARRIVAL',
        baby
          ? `${a.name} was born. A smaller pair of feet joins the village.`
          : `${a.name} followed our lights home. There is room for one more.`,
      );
      if (a.visualTraits.length)
        record(
          s,
          'NEW TRAIT',
          `${a.name} arrived with inherited luminous markings.`,
        );
    }
  }
  const cap = 300 + active(s, 'storage').length * 200;
  for (const k in s.resources)
    s.resources[k] = Math.max(
      0,
      Math.min(k === 'knowledge' ? 2000 : cap, s.resources[k]),
    );
}
export function mood(a) {
  return a.needs.hunger > 78
    ? 'Hungry'
    : a.needs.rest > 78
      ? 'Tired'
      : a.needs.social > 80
        ? 'Lonely'
        : a.task?.kind === 'explore'
          ? 'Curious'
          : a.task?.kind === 'socialize'
            ? 'Happy'
            : 'Content';
}
export function taskLabel(a) {
  if (!a.task) return 'Taking a moment';
  const labels = {
    eat: 'Eating moonfruit',
    sleep: 'Resting',
    socialize: 'Sharing stories',
    build: 'Building',
    farm: 'Tending moonfruit',
    forage: 'Gathering food',
    gather: 'Gathering softstone',
    deliver: 'Carrying supplies',
    research: 'Following a hunch',
    explore: 'Exploring',
    observe: 'Watching',
    relax: 'Enjoying the quiet',
    wander: 'Wandering',
  };
  return (
    labels[a.task.kind] +
    (['explore', 'observe'].includes(a.task.kind)
      ? ` · ${a.task.target.name}`
      : '')
  );
}
