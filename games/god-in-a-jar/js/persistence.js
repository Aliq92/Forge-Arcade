import { inside, CAP } from "./world.js";
export const SAVE_KEY = "godInAJar_save_v1";
const dimensions = [
  "curiosity",
  "caution",
  "social",
  "inventiveness",
  "tradition",
];
const limits = {
  agents: CAP,
  plants: 80,
  rocks: 30,
  water: 7,
  regions: 45,
  groups: 3,
  structures: 30,
  history: 180,
  sites: 24,
  artifacts: 6,
  effects: 12,
  particles: 90,
  snapshots: 32,
};
const numeric = (v) => typeof v === "number" && Number.isFinite(v);
const requireNumber = (v, label, lo = -Infinity, hi = Infinity) => {
  if (!numeric(v) || v < lo || v > hi) throw new Error("Invalid " + label);
};
const requireArray = (v, label, max) => {
  if (!Array.isArray(v) || v.length > max) throw new Error("Invalid " + label);
};
const position = (p) => {
  requireNumber(p?.x, "position x");
  requireNumber(p?.y, "position y");
};
function appearance(a) {
  if (!a || typeof a.spots !== "boolean") throw new Error("Invalid appearance");
  requireNumber(a.hue, "color", 100, 345);
  requireNumber(a.size, "body size", 4, 9);
  requireNumber(a.antenna, "antenna", 2, 14);
}
function culture(g) {
  if (!g || typeof g.name !== "string") throw new Error("Invalid society");
  for (const k of dimensions
    .filter((k) => k !== "social")
    .concat("cooperation"))
    requireNumber(g.culture?.[k], "culture " + k, 0, 1);
  requireArray(g.knownLandmarks, "known places", 24);
  requireArray(g.importantMemories, "shared memories", 8);
  requireNumber(g.knowledge, "knowledge", 0, 1000);
  requireNumber(g.formed, "settlement age", 0);
  position(g);
}
function snapshot(s) {
  requireNumber(s?.time, "recorded time", 0);
  requireNumber(s.tick, "recorded tick", 0);
  requireNumber(s.maxGeneration, "recorded generation", 1);
  if (typeof s.era !== "string") throw new Error("Invalid recorded era");
  for (const key of [
    "agents",
    "plants",
    "rocks",
    "water",
    "regions",
    "groups",
    "structures",
    "sites",
    "artifacts",
    "effects",
    "particles",
  ])
    requireArray(s[key], "recorded " + key, limits[key]);
  for (const a of s.agents) {
    position(a);
    requireNumber(a.age, "recorded age", 0);
    requireNumber(a.generation, "recorded lineage", 1);
    requireNumber(a.fear, "recorded fear", 0, 1);
    appearance(a.appearance);
    if (typeof a.name !== "string" || typeof a.action !== "string")
      throw new Error("Invalid recorded creature");
    if (a.target) position(a.target);
    requireArray(a.memories, "recorded memories", 8);
  }
  for (const g of s.groups) culture(g);
  for (const key of ["plants", "rocks", "water", "structures", "artifacts"])
    for (const p of s[key]) position(p);
}
export function encode(world, settings = {}, snapshotLimit = 32) {
  return JSON.stringify({
    version: 1,
    world: {
      ...world,
      snapshots: snapshotLimit > 0 ? world.snapshots.slice(-snapshotLimit) : [],
    },
    settings,
    savedAt: Date.now(),
  });
}
export function validateWorld(w) {
  if (
    !w ||
    w.version !== 1 ||
    typeof w.seed !== "string" ||
    typeof w.era !== "string"
  )
    throw new Error("Invalid world header");
  for (const key of [
    "time",
    "tick",
    "rng",
    "nextAgent",
    "nextEvent",
    "nextGroup",
    "nextStructure",
    "nextArtifact",
    "nextSite",
    "maxGeneration",
    "births",
    "deaths",
  ])
    requireNumber(w[key], key, 0);
  for (const [key, max] of Object.entries(limits))
    requireArray(w[key], key, max);
  if (w.regions.length !== 45) throw new Error("Invalid moisture grid");
  const ids = new Set(),
    groupIds = new Set(w.groups.map((g) => g.id));
  for (const a of w.agents) {
    if (
      !Number.isInteger(a.id) ||
      a.id < 1 ||
      ids.has(a.id) ||
      typeof a.name !== "string" ||
      typeof a.action !== "string"
    )
      throw new Error("Invalid creature identity");
    ids.add(a.id);
    position(a);
    if (!inside(a.x, a.y)) throw new Error("Creature outside terrain");
    for (const k of ["energy", "hunger", "thirst", "socialNeed", "fear"])
      requireNumber(a[k], "creature " + k, 0, 1);
    for (const k of ["age", "generation", "cargo", "visits", "frontier"])
      requireNumber(a[k], "creature " + k, 0);
    requireNumber(a.decision, "decision", -0.21, 6);
    requireNumber(a.lastBirth, "reproduction time");
    appearance(a.appearance);
    for (const k of dimensions)
      requireNumber(a.traits?.[k], "trait " + k, 0, 1);
    if (a.target) position(a.target);
    if (a.groupId !== null && !groupIds.has(a.groupId))
      throw new Error("Broken society reference");
    if (
      !a.relationships ||
      Array.isArray(a.relationships) ||
      typeof a.relationships !== "object"
    )
      throw new Error("Invalid relationships");
    requireArray(a.memories, "individual memories", 8);
    for (const m of a.memories) {
      position(m);
      requireNumber(m.eventId, "memory event", 1);
      requireNumber(m.day, "memory day", 1);
      requireNumber(m.strength, "memory strength", 0, 1);
      if (typeof m.title !== "string") throw new Error("Invalid memory");
    }
    if (a.siteVisits)
      for (const t of Object.values(a.siteVisits))
        requireNumber(t, "visit time", 0);
  }
  for (const a of w.agents)
    for (const [id, value] of Object.entries(a.relationships)) {
      if (!ids.has(+id)) throw new Error("Broken relationship");
      requireNumber(value, "relationship", 0, 1);
    }
  for (const g of w.groups) culture(g);
  for (const list of [
    w.plants,
    w.rocks,
    w.water,
    w.regions,
    w.artifacts,
    w.structures,
    w.sites,
  ])
    for (const p of list) position(p);
  for (const p of w.plants) {
    requireNumber(p.capacity, "plant capacity", 1, 30);
    requireNumber(p.food, "food", 0, p.capacity);
    requireNumber(p.growth, "plant growth", 0, 1);
    requireNumber(p.color, "plant color", 100, 345);
    requireNumber(p.size, "plant size", 1, 60);
  }
  for (const p of w.rocks) {
    requireNumber(p.material, "material", 0, 30);
    requireNumber(p.size, "crystal size", 1, 40);
  }
  for (const p of w.water) requireNumber(p.amount, "water", 0, 100);
  for (const r of w.regions)
    for (const key of ["moisture", "mutation", "light"])
      requireNumber(r[key], "regional " + key, 0, 1);
  for (const b of w.structures) {
    requireNumber(b.progress, "construction", 0, 1);
    if (typeof b.kind !== "string" || !groupIds.has(b.groupId))
      throw new Error("Invalid structure");
  }
  for (const s of w.sites) {
    requireNumber(s.origin, "site origin", 1);
    requireNumber(s.originDay, "origin day", 1);
    requireNumber(s.visits, "site visits", 0, 100000);
    for (const key of ["witnesses", "traditions", "landmarkGroups"])
      requireArray(s[key], key, key === "witnesses" ? 24 : 3);
    if (typeof s.title !== "string" || !s.significance)
      throw new Error("Invalid site");
    for (const v of Object.values(s.significance))
      requireNumber(v, "significance", 0, 100);
  }
  for (const a of w.artifacts) {
    requireNumber(a.z, "artifact altitude", 0, 400);
    requireNumber(a.vz, "artifact velocity");
    requireNumber(a.rotation, "artifact rotation");
    requireNumber(a.observations, "artifact observations", 0);
    requireArray(a.inspectors, "artifact observers", 24);
    if (a.carrierId !== null && !ids.has(a.carrierId))
      throw new Error("Missing artifact carrier");
  }
  for (const e of w.effects) {
    position(e);
    requireNumber(e.ttl, "field duration", 0, 24);
    requireNumber(e.radius, "field radius", 1, 200);
  }
  for (const p of w.particles) {
    position(p);
    for (const k of ["z", "vx", "vy", "vz", "rotation", "spin", "ttl"])
      requireNumber(p[k], "particle " + k);
  }
  for (const [key, next] of [
    ["agents", "nextAgent"],
    ["groups", "nextGroup"],
    ["structures", "nextStructure"],
    ["artifacts", "nextArtifact"],
    ["sites", "nextSite"],
    ["history", "nextEvent"],
  ]) {
    const entities = w[key].map((a) => a.id);
    if (
      entities.some((id) => !Number.isInteger(id) || id < 1) ||
      new Set(entities).size !== entities.length ||
      w[next] <= Math.max(0, ...entities)
    )
      throw new Error("Invalid " + key + " ID sequence");
  }
  for (const s of w.snapshots) snapshot(s);
  const scan = (p) => {
    if (typeof p === "number" && !Number.isFinite(p))
      throw new Error("Non-finite state");
    if (p && typeof p === "object") for (const v of Object.values(p)) scan(v);
  };
  scan(w);
  return true;
}
export function decode(text) {
  if (typeof text !== "string" || text.length > 8000000)
    throw new Error("Invalid save");
  const data = JSON.parse(text);
  if (data.version !== 1) throw new Error("Incompatible save version");
  validateWorld(data.world);
  return {
    world: data.world,
    settings: {
      sound: !!data.settings?.sound,
      reducedMotion: !!data.settings?.reducedMotion,
    },
  };
}
export function save(storage, w, settings) {
  try {
    validateWorld(w);
  } catch (e) {
    return { ok: false, message: e.message };
  }
  for (const limit of [32, 8, 0]) {
    try {
      storage.setItem(SAVE_KEY, encode(w, settings, limit));
      return { ok: true, trimmed: limit < 32 };
    } catch {}
  }
  return {
    ok: false,
    message:
      "Local storage is unavailable or full. Your previous valid save is retained; export this jar to keep it.",
  };
}
export function load(storage) {
  const text = storage.getItem(SAVE_KEY);
  return text ? decode(text) : null;
}
