import { takeSnapshot } from "./history.js";
import {
  inspectArtifact,
  storeArtifact,
  updateArtifacts,
  celebrate,
} from "./artifacts.js";
import { visitSite, shareMemory } from "./culture.js";
import { updateEnvironment } from "./interventions.js";
export const DT = 0.2,
  DAY = 12,
  CAP = 120;
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function inside(x, y) {
  return ((x - 450) / 425) ** 2 + ((y - 210) / 185) ** 2 <= 1.00001;
}
export function bound(p) {
  const nx = (p.x - 450) / 425,
    ny = (p.y - 210) / 185,
    l = Math.hypot(nx, ny);
  if (l > 1) {
    p.x = 450 + (nx / l) * 424;
    p.y = 210 + (ny / l) * 184;
  }
  return p;
}
function hash(seed) {
  let h = 2166136261;
  for (const c of String(seed)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function random(w) {
  w.rng = (w.rng + 0x6d2b79f5) >>> 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const names = [
  "Zuru",
  "Vela",
  "Omi",
  "Neri",
  "Pip",
  "Luma",
  "Ivo",
  "Suri",
  "Eko",
  "Tavi",
  "Miri",
  "Noa",
];
export function event(
  w,
  type,
  title,
  description,
  p,
  origin = null,
  groupId = null,
) {
  const e = {
    id: w.nextEvent++,
    time: w.time,
    day: Math.floor(w.time / DAY) + 1,
    type,
    title,
    description,
    x: p.x,
    y: p.y,
    origin,
    groupId,
  };
  w.history.push(e);
  if (
    [
      "FIRST_SETTLEMENT",
      "NEW_LANDMARK",
      "SOCIAL_GROUP_SPLIT",
      "NEW_GENERATION",
    ].includes(type)
  )
    w.snapshotRequested = true;
  if (
    [
      "FIRST_SETTLEMENT",
      "NEW_LANDMARK",
      "NEW_CULTURAL_PRACTICE",
      "STRANGE_OBJECT_DISCOVERED",
    ].includes(type) &&
    w.time - (w.lastCelebration ?? -100) > 30
  ) {
    celebrate(w, p);
    w.lastCelebration = w.time;
  }
  if (w.history.length > 180) w.history.shift();
  return e;
}
export function createAgent(w, x, y, parents = null) {
  const id = w.nextAgent++;
  const traits = {};
  for (const k of [
    "curiosity",
    "caution",
    "social",
    "inventiveness",
    "tradition",
  ])
    traits[k] = 0.15 + random(w) * 0.7;
  const agent = {
    id,
    name:
      names[(id - 1) % names.length] +
      (id > 12 ? " " + Math.ceil(id / 12) : ""),
    x,
    y,
    age: parents ? 0 : 14 + random(w) * 8,
    generation: 1,
    energy: 0.8,
    hunger: 0.15,
    thirst: 0.15,
    socialNeed: 0.3,
    traits,
    appearance: {
      hue: 140 + random(w) * 190,
      size: 5 + random(w) * 2,
      antenna: 4 + random(w) * 7,
      spots: random(w) > 0.5,
    },
    action: "EXPLORE",
    target: null,
    decision: random(w) * 2,
    fear: 0,
    groupId: null,
    memories: [],
    relationships: {},
    cargo: 0,
    lastBirth: -100,
    visits: 0,
    frontier: 0,
  };
  if (parents) {
    const [a, b] = parents,
      pressure = regionAt(w, { x, y }).mutation,
      variation = 0.08 + pressure * 0.3;
    for (const k of Object.keys(traits))
      traits[k] = clamp(
        (a.traits[k] + b.traits[k]) * 0.5 + (random(w) - 0.5) * variation,
      );
    agent.generation = Math.max(a.generation, b.generation) + 1;
    agent.groupId = a.groupId;
    agent.parents = [a.id, b.id];
    agent.appearance = {
      hue: clamp(
        (a.appearance.hue + b.appearance.hue) * 0.5 +
          (random(w) - 0.5) * (18 + pressure * 100),
        100,
        345,
      ),
      size: clamp(
        (a.appearance.size + b.appearance.size) * 0.5 +
          (random(w) - 0.5) * (1 + pressure * 2),
        4,
        9,
      ),
      antenna: clamp(
        (a.appearance.antenna + b.appearance.antenna) * 0.5 +
          (random(w) - 0.5) * 3,
        2,
        14,
      ),
      spots:
        random(w) < 0.05 + pressure * 0.2
          ? !a.appearance.spots
          : random(w) < 0.5
            ? a.appearance.spots
            : b.appearance.spots,
    };
    agent.mutationExposure = pressure;
  }
  return agent;
}
export function createWorld(seed = "jar-001") {
  const w = {
    version: 1,
    seed: String(seed),
    rng: hash(seed),
    time: 0,
    tick: 0,
    nextAgent: 1,
    nextEvent: 1,
    nextGroup: 1,
    nextStructure: 1,
    nextArtifact: 1,
    nextSite: 1,
    agents: [],
    plants: [],
    rocks: [],
    water: [],
    regions: [],
    groups: [],
    structures: [],
    history: [],
    sites: [],
    artifacts: [],
    effects: [],
    particles: [],
    snapshots: [],
    maxGeneration: 1,
    births: 0,
    deaths: 0,
    era: "The Unwritten",
    reducedMotion: false,
  };
  for (let i = 0; i < 34; i++) {
    const p = bound({ x: 90 + random(w) * 720, y: 70 + random(w) * 280 });
    w.plants.push({
      ...p,
      id: i,
      food: 12,
      capacity: 12,
      growth: 0.08 + random(w) * 0.04,
      color: 160 + random(w) * 25,
      size: 10 + random(w) * 18,
    });
  }
  for (let i = 0; i < 9; i++) {
    const p = bound({ x: 150 + random(w) * 630, y: 85 + random(w) * 250 });
    w.rocks.push({ ...p, id: i, material: 30, size: 10 + random(w) * 10 });
  }
  w.water = [
    { x: 350, y: 260, amount: 80 },
    { x: 745, y: 150, amount: 50 },
  ];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 9; x++)
      w.regions.push({
        x: x * 100 + 50,
        y: y * 84 + 42,
        moisture: 0.55,
        mutation: 0,
        light: 0,
      });
  for (let i = 0; i < 6; i++)
    w.agents.push(createAgent(w, 350 + random(w) * 100, 185 + random(w) * 75));
  return w;
}
export function scoreExplore(a) {
  return 0.16 + a.traits.curiosity * 0.35 - a.traits.caution * 0.12;
}
export function regionAt(w, p) {
  return w.regions[
    clamp(Math.floor(p.y / 84), 0, 4) * 9 + clamp(Math.floor(p.x / 100), 0, 8)
  ];
}
const nearest = (list, a) =>
  list.reduce(
    (best, p) => (!best || distance(a, p) < distance(a, best) ? p : best),
    null,
  );
function decide(w, a) {
  const home = w.groups.find((g) => g.id === a.groupId);
  const shelter = w.structures.find(
    (s) => s.groupId === a.groupId && s.kind === "shelter" && s.progress === 1,
  );
  const plant = nearest(
    w.plants.filter((p) => p.food > 1),
    a,
  );
  const water = nearest(w.water, a);
  const rock = nearest(
    w.rocks.filter((r) => r.material > 1),
    a,
  );
  const unfinished = w.structures.find(
    (s) => s.groupId === a.groupId && s.progress < 1,
  );
  const others = neighbors(w, a).filter(
    (b) => b.id !== a.id && distance(a, b) < 110,
  );
  const places = w.sites.filter(
    (s) =>
      a.memories.some((m) => m.siteId === s.id) ||
      home?.knownLandmarks.includes(s.id),
  );
  const eligibleSites = [
    ...places,
    ...w.sites.filter(
      (s) => s.artifactId && a.traits.curiosity > 0.3 && distance(a, s) < 120,
    ),
  ].filter((s) => s.kind !== "TOUCH" || a.traits.curiosity > a.traits.caution);
  const site = eligibleSites.reduce((best, s) => {
    const score = (p) => {
      const artifact = w.artifacts.find((r) => r.id === p.artifactId);
      return (
        -distance(a, p) / 400 +
        (artifact && !artifact.inspectors.includes(a.id)
          ? a.traits.curiosity * 0.4
          : 0)
      );
    };
    return !best || score(s) > score(best) ? s : best;
  }, null);
  const choices = [
    { action: "CARRY HOME", score: a.carriedArtifact ? 1.5 : 0, target: home },
    {
      action: site?.traditions.includes(a.groupId)
        ? "PARTICIPATE IN RITUAL"
        : "INVESTIGATE",
      score: site
        ? 0.28 +
          a.traits.curiosity * 0.35 +
          (site.traditions.includes(a.groupId) ? a.traits.tradition * 0.18 : 0)
        : 0,
      target: site ? { ...site, siteId: site.id } : null,
    },
    {
      action: "EXPLORE",
      score: scoreExplore(a),
      target: bound({
        x: a.x + (random(w) - 0.5) * 260,
        y: a.y + (random(w) - 0.5) * 160,
      }),
    },
    {
      action: "REST",
      score:
        (1 - a.energy) * 1.4 +
        (Math.sin((w.time / DAY) * Math.PI * 2) < -0.3 ? 0.12 : 0),
      target: shelter || home || { x: 430, y: 230 },
    },
    { action: "FORAGE", score: a.hunger * 1.6, target: plant },
    { action: "DRINK", score: a.thirst * 1.5, target: water },
    {
      action: "SOCIALIZE",
      score: a.socialNeed * (0.3 + a.traits.social * 0.8),
      target: others.length
        ? others[Math.floor(random(w) * others.length)]
        : home || { x: 430, y: 230 },
    },
    {
      action: "RETURN HOME",
      score: home ? 0.18 + a.traits.tradition * 0.15 : 0,
      target: home,
    },
    {
      action: "GATHER",
      score:
        home && unfinished && !a.cargo
          ? 0.62 + a.traits.inventiveness * 0.34
          : 0,
      target: rock,
    },
    {
      action: "BUILD",
      score: unfinished && a.cargo ? 1.15 : 0,
      target: unfinished,
    },
  ];
  for (const c of choices) c.score += random(w) * 0.12;
  choices.sort((a, b) => b.score - a.score);
  const c = choices.find((c) => c.target);
  a.action = c.action;
  a.target = {
    x: c.target.x,
    y: c.target.y,
    id: c.target.id ?? null,
    siteId: c.target.siteId ?? null,
  };
  a.decision = 1.8 + random(w) * 2.5;
}
function move(w, a) {
  if (!a.target) return;
  const dx = a.target.x - a.x,
    dy = a.target.y - a.y,
    d = Math.hypot(dx, dy);
  if (d > 7) {
    const speed = (a.age < 12 ? 10 : 15) * (a.energy * 0.3 + 0.7);
    a.x += (dx / d) * speed * DT;
    a.y += (dy / d) * speed * DT;
    bound(a);
    return;
  }
  if (a.action === "CARRY HOME") storeArtifact(w, a);
  if (a.action === "INVESTIGATE" || a.action === "PARTICIPATE IN RITUAL") {
    const s = w.sites.find((s) => s.id === a.target.siteId);
    if (s?.artifactId)
      inspectArtifact(
        w,
        a,
        w.artifacts.find((p) => p.id === s.artifactId),
      );
    else visitSite(w, a, s);
  }
  if (a.action === "FORAGE") {
    const p = w.plants.find((p) => p.id === a.target.id);
    if (p && p.food > 0.1) {
      const food = Math.min(p.food, 0.8 * DT);
      p.food -= food;
      a.hunger = clamp(a.hunger - food * 0.4);
      a.energy = clamp(a.energy + 0.1 * DT);
    }
  }
  if (a.action === "DRINK") {
    const p = nearest(w.water, a);
    if (p && distance(a, p) < 20 && p.amount > 0.01) {
      p.amount = Math.max(0, p.amount - 0.05 * DT);
      a.thirst = clamp(a.thirst - 0.6 * DT);
    }
  }
  if (a.action === "REST") {
    const sheltered = w.structures.some(
      (s) => s.kind === "shelter" && s.progress === 1 && distance(a, s) < 15,
    );
    a.energy = clamp(a.energy + (sheltered ? 0.18 : 0.13) * DT);
  }
  if (a.action === "SOCIALIZE") {
    a.socialNeed = clamp(a.socialNeed - 0.3 * DT);
    a.visits += DT;
    const b = w.agents.find((b) => b.id === a.target.id);
    if (b) shareMemory(w, a, b);
    if (b && distance(a, b) < 35)
      a.relationships[b.id] = clamp((a.relationships[b.id] || 0) + 0.01 * DT);
    const g = w.groups.find((g) => g.id === a.groupId);
    if (g)
      g.culture.cooperation = clamp(
        g.culture.cooperation + (0.8 - g.culture.cooperation) * 0.0006 * DT,
      );
  }
  if (a.action === "GATHER") {
    const r = w.rocks.find((r) => r.id === a.target.id);
    if (r && r.material >= 1) {
      r.material--;
      a.cargo = 1;
      a.decision = 0;
    }
  }
  if (a.action === "BUILD") {
    const s = w.structures.find((s) => s.id === a.target.id);
    if (s && s.progress < 1) {
      s.progress = clamp(s.progress + 0.16);
      a.cargo = 0;
      a.decision = 0;
      if (s.progress >= 1) {
        const g = w.groups.find((g) => g.id === s.groupId);
        g.knowledge = clamp(g.knowledge + 1.5, 0, 1000);
        g.culture.cooperation = clamp(
          g.culture.cooperation + (0.9 - g.culture.cooperation) * 0.025,
        );
        g.culture.inventiveness = clamp(
          g.culture.inventiveness + (0.75 - g.culture.inventiveness) * 0.02,
        );
        const site = w.sites.find((p) => p.id === s.siteId);
        event(
          w,
          site ? "NEW_LANDMARK" : "FIRST_STRUCTURE",
          site
            ? site.title
            : s.kind === "shelter"
              ? "A place to return"
              : "Hands together",
          `${w.groups.find((g) => g.id === s.groupId).name} completed a ${s.kind}${site ? " to preserve a place they kept visiting" : ""}.`,
          s,
          site?.origin || null,
          s.groupId,
        );
      }
    }
  }
}
export function step(w) {
  w.time += DT;
  w.tick++;
  indexAgents(w);
  updateEnvironment(w, DT);
  updateArtifacts(w, DT);
  for (const p of w.plants) {
    const r = regionAt(w, p);
    p.food = clamp(p.food + p.growth * (0.5 + r.moisture) * DT, 0, p.capacity);
  }
  for (const r of w.rocks) r.material = clamp(r.material + 0.03 * DT, 0, 30);
  for (const p of w.water) p.amount = clamp(p.amount + 0.07 * DT, 0, 100);
  for (const a of w.agents) {
    a.age += DT / DAY;
    if (a.x > 560 && a.traits.curiosity > 0.5)
      a.frontier = clamp(a.frontier + DT / DAY, 0, 100);
    a.energy = clamp(a.energy - 0.008 * DT);
    a.hunger = clamp(a.hunger + 0.012 * DT);
    a.thirst = clamp(a.thirst + 0.009 * DT);
    a.socialNeed = clamp(a.socialNeed + 0.014 * DT);
    a.fear = clamp(a.fear - 0.12 * DT);
    a.decision -= DT;
    if (a.decision <= 0) decide(w, a);
    move(w, a);
  }
  if (w.tick % 20 === 0) society(w);
  if (w.tick % 60 === 0) generations(w);
  if (w.tick % 300 === 0 || w.snapshotRequested) {
    takeSnapshot(w);
    w.snapshotRequested = false;
  }
}
function society(w) {
  if (!w.groups.length) {
    const clustered = w.agents.filter(
      (a) => a.visits > 2 && distance(a, { x: 430, y: 230 }) < 160,
    );
    if (clustered.length >= 3) {
      const g = {
        id: w.nextGroup++,
        name: "The Vey",
        x: 430,
        y: 230,
        formed: w.time,
        culture: {
          curiosity: 0.5,
          cooperation: 0.5,
          caution: 0.4,
          tradition: 0.25,
          inventiveness: 0.4,
        },
        knownLandmarks: [],
        importantMemories: [],
        knowledge: 0,
      };
      w.groups.push(g);
      for (const a of w.agents) a.groupId = g.id;
      event(
        w,
        "FIRST_SETTLEMENT",
        "A place becomes home",
        "Repeated meetings beside the pond became the first settlement.",
        g,
        null,
        g.id,
      );
      w.era = "The First Gathering";
    }
  }
  if (w.groups.length === 1 && w.agents.length >= 18) {
    const explorers = w.agents
      .filter((a) => a.frontier > 3 && a.traits.curiosity > 0.5)
      .sort((a, b) => b.frontier - a.frontier);
    if (explorers.length >= 4) {
      const founders = explorers.slice(0, 6),
        g = {
          id: w.nextGroup++,
          name: "The Orin",
          x: 680,
          y: 170,
          formed: w.time,
          culture: {
            curiosity: 0,
            cooperation: 0.4,
            caution: 0,
            tradition: 0.18,
            inventiveness: 0,
          },
          knownLandmarks: [],
          importantMemories: [],
          knowledge: 0,
        };
      for (const k of ["curiosity", "caution", "inventiveness"])
        g.culture[k] =
          founders.reduce((v, a) => v + a.traits[k], 0) / founders.length;
      w.groups.push(g);
      for (const a of founders) {
        a.groupId = g.id;
        a.decision = 0;
      }
      event(
        w,
        "SOCIAL_GROUP_SPLIT",
        "Beyond the familiar",
        `${g.name} formed after ${founders.length} explorers repeatedly crossed the eastern ridge.`,
        g,
        null,
        g.id,
      );
    }
  }
  for (const g of w.groups) {
    const buildings = w.structures.filter((s) => s.groupId === g.id);
    if (
      !w.agents.some((a) => a.groupId === g.id) ||
      buildings.some((s) => s.progress < 1)
    )
      continue;
    const important = w.sites.find(
      (s) =>
        s.traditions.includes(g.id) &&
        (s.significance[g.id] || 0) >= 12 &&
        s.witnesses.length >= 3 &&
        !s.landmarkGroups.includes(g.id),
    );
    if (
      important &&
      buildings.some((s) => s.progress === 1) &&
      buildings.length < 8
    ) {
      important.landmarkGroups.push(g.id);
      w.structures.push({
        x: important.x,
        y: important.y,
        id: w.nextStructure++,
        groupId: g.id,
        kind: important.artifactId ? "display" : "monument",
        siteId: important.id,
        progress: 0,
      });
      continue;
    }
    const ordinary = buildings.filter((s) => !s.siteId),
      kinds = ["shelter", "storage", "gathering circle", "observatory"];
    if (ordinary.length < 4 && (ordinary.length < 3 || g.knowledge >= 4.5)) {
      const p = bound({
        x: g.x + (ordinary.length - 1.5) * 38,
        y: g.y + 20 + (ordinary.length % 2) * 22,
      });
      w.structures.push({
        ...p,
        id: w.nextStructure++,
        groupId: g.id,
        kind: kinds[ordinary.length],
        progress: 0,
      });
    }
  }
}
// Transient spatial index is never serialized. Decision queries inspect neighboring cells.
const indices = new WeakMap();
function indexAgents(w) {
  const grid = new Map();
  for (const a of w.agents) {
    const key = Math.floor(a.x / 110) + "," + Math.floor(a.y / 110);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(a);
  }
  indices.set(w, grid);
}
function neighbors(w, a) {
  const grid = indices.get(w);
  if (!grid) return w.agents;
  const x = Math.floor(a.x / 110),
    y = Math.floor(a.y / 110),
    out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cell = grid.get(x + dx + "," + (y + dy));
      if (cell) out.push(...cell);
    }
  return out;
}
function generations(w) {
  const day = w.time / DAY;
  const elders = w.agents.filter(
    (a) => a.age > 110 + a.traits.caution * 30 + (6 - a.appearance.size) * 3,
  );
  if (elders.length) {
    const removed = new Set(elders.map((a) => a.id));
    for (const artifact of w.artifacts)
      if (removed.has(artifact.carrierId)) {
        artifact.carrierId = null;
        artifact.z = 0;
        const site = w.sites.find((s) => s.artifactId === artifact.id);
        if (site) {
          site.x = artifact.x;
          site.y = artifact.y;
        }
      }
    w.agents = w.agents.filter((a) => !removed.has(a.id));
    w.deaths += elders.length;
    for (const a of w.agents) {
      for (const id of Object.keys(a.relationships))
        if (removed.has(+id)) delete a.relationships[id];
      if (a.action === "SOCIALIZE" && removed.has(a.target?.id)) {
        a.target = null;
        a.decision = 0;
      }
    }
  }
  if (w.agents.length < CAP && w.agents.length < 68 && random(w) < 0.72) {
    const eligible = w.agents.filter(
      (a) =>
        a.age >= 12 &&
        a.age < 90 &&
        a.energy > 0.28 &&
        a.hunger < 0.78 &&
        a.thirst < 0.8 &&
        day - a.lastBirth > 14 &&
        a.groupId,
    );
    if (eligible.length >= 2) {
      const a = eligible[Math.floor(random(w) * eligible.length)],
        b = eligible.find(
          (b) =>
            b.id !== a.id && b.groupId === a.groupId && distance(a, b) < 110,
        );
      if (b) {
        const p = bound({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }),
          child = createAgent(w, p.x, p.y, [a, b]);
        a.lastBirth = b.lastBirth = day;
        w.agents.push(child);
        w.births++;
        if (child.mutationExposure > 0.5 && !w.adaptationRecorded) {
          w.adaptationRecorded = true;
          event(
            w,
            "ENVIRONMENTAL_ADAPTATION",
            "A different inheritance",
            `${child.name} was born with increased trait variation after regional violet exposure. These traits will still face ordinary environmental pressures.`,
            child,
            null,
            child.groupId,
          );
        }
        if (child.generation > w.maxGeneration) {
          w.maxGeneration = child.generation;
          event(
            w,
            "NEW_GENERATION",
            "Life carries forward",
            `${child.name} begins generation ${child.generation}, inheriting traits from ${a.name} and ${b.name}.`,
            child,
            null,
            child.groupId,
          );
        }
        if (
          [20, 40, 60].includes(w.agents.length) &&
          !(w.milestones || []).includes(w.agents.length)
        ) {
          w.milestones ??= [];
          w.milestones.push(w.agents.length);
          event(
            w,
            "POPULATION_MILESTONE",
            `${w.agents.length} small lives`,
            "The jar holds a growing community.",
            child,
          );
        }
      }
    }
  }
}
