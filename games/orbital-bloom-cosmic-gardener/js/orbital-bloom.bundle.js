(() => {
  // js/config.js
  var CONSTANTS = {
    MAX_PARTICLES: 6e3,
    SOFTENING: 24,
    // gravity softening radius (world units)
    MAX_PARTICLE_SPEED: 2600,
    // hard velocity cap for particles
    MAX_ATTRACTOR_SPEED: 900,
    // hard velocity cap for dynamic attractors
    MAX_MASS: 4e5,
    MIN_MASS: 40,
    BASE_DT: 1 / 60,
    // fixed physics timestep at 1x speed
    G_DEFAULT: 2600,
    // base gravitational constant (scaled, not real units)
    MAX_ZOOM: 6,
    MIN_ZOOM: 0.08,
    GENTLE_INFLUENCE_RADIUS: 180,
    GENTLE_INFLUENCE_MAX_DELTA: 12,
    PULSE_MAX_DELTA: 40,
    CRADLE_HOLD_MS: 350,
    CRADLE_DRIFT_PIXELS: 8
  };
  var SYSTEM_SCHEMA_VERSION = 2;
  var TRAIL_FADE = {
    off: 1,
    short: 0.32,
    medium: 0.13,
    long: 0.055,
    extreme: 0.022
  };
  var PALETTE = {
    ivory: "#f4f0dc",
    white: "#f4f0dc",
    jade: "#6eae94",
    cyan: "#6eae94",
    amber: "#e9b567",
    gold: "#e9b567",
    coral: "#dc7662",
    violet: "#8b749b",
    blue: "#557f8a",
    ocean: "#07151a",
    bg: "#07151a"
  };
  var state = {
    // simulation control
    running: true,
    speedMultiplier: 1,
    gravityStrength: 1,
    // visuals
    trailLength: "medium",
    trailStyle: "soft",
    colorMode: "uniform",
    particleBrightness: 0.75,
    particleSize: 0.9,
    backgroundDensity: 1,
    motionBlur: false,
    renderQuality: "auto",
    // 'low' | 'medium' | 'high' | 'auto'
    particleDensityPref: "medium",
    // 'low' | 'medium' | 'high'
    // physics behavior
    absorbMode: "absorb",
    // 'absorb' | 'passthrough'
    collisionMode: "merge",
    // 'ignore' | 'merge' | 'bounce' | 'destroy'
    // camera / view
    followBody: false,
    cinematicMode: false,
    gravityOverlay: false,
    // random system generator
    lastSeed: null,
    // accessibility / prefs
    reducedMotion: false,
    showFPS: false,
    screenFlash: true,
    // tools
    currentTool: "select",
    gardenVariant: null,
    cradleArmed: false,
    attractorType: "star",
    attractorFixed: false,
    // spawn panel
    spawnMode: "rotating",
    // static | rotating | jet | ring | disc
    spawnAmount: 500,
    spawnRadius: 120,
    spawnSpread: 0.35,
    spawnSpeed: 40,
    spawnSpin: 18,
    continuousStream: false,
    // selection
    selectedAttractorId: null,
    selectedKind: null,
    // 'attractor'
    // overlay
    classificationOverlay: false
  };
  var stats = {
    absorbedCount: 0,
    simTime: 0,
    fps: 0
  };
  var SETTINGS_KEY = "orbitalBloom.settings.v1";
  var PRESET_KEY = "orbitalBloom.lastPreset.v1";
  var PERSISTED_KEYS = [
    "trailLength",
    "trailStyle",
    "colorMode",
    "particleBrightness",
    "particleSize",
    "backgroundDensity",
    "motionBlur",
    "reducedMotion",
    "showFPS",
    "screenFlash",
    "absorbMode",
    "gravityStrength",
    "renderQuality",
    "particleDensityPref",
    "collisionMode"
  ];
  function saveSettings() {
    try {
      const out = {};
      for (const k of PERSISTED_KEYS) out[k] = state[k];
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(out));
    } catch (e) {
    }
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      for (const k of PERSISTED_KEYS) {
        if (data[k] !== void 0) state[k] = data[k];
      }
    } catch (e) {
    }
  }
  function saveLastPreset(id) {
    try {
      localStorage.setItem(PRESET_KEY, id);
    } catch (e) {
    }
  }
  function loadLastPreset() {
    try {
      return localStorage.getItem(PRESET_KEY);
    } catch (e) {
      return null;
    }
  }
  var SEED_KEY = "orbitalBloom.lastSeed.v1";
  function saveLastSeed(seed) {
    try {
      localStorage.setItem(SEED_KEY, seed);
    } catch (e) {
    }
  }
  function loadLastSeed() {
    try {
      return localStorage.getItem(SEED_KEY);
    } catch (e) {
      return null;
    }
  }
  var SYSTEM_KEY = "orbitalBloom.savedSystem.v1";
  var GARDEN_PROGRESS_KEY = "orbitalBloom.gardenProgress.v1";
  var DEFAULT_GARDEN_PROGRESS = {
    stardust: 0,
    unlocks: ["star", "planet", "moon"],
    discoveries: [],
    rewardedIntentions: {}
  };
  var COLOR_MODES = /* @__PURE__ */ new Set(["uniform", "bybody", "speed", "energy", "distance", "age", "orbital", "gravity"]);
  var COLLISION_MODES = /* @__PURE__ */ new Set(["ignore", "merge", "bounce", "destroy"]);
  function decodeSystemSnapshot(raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed || !Array.isArray(parsed.attractors)) return { status: "invalid", error: "Invalid system data" };
      if (parsed.camera !== void 0) {
        const numericCameraFields = ["x", "y", "zoom"];
        if (!parsed.camera || numericCameraFields.some((key) => !Number.isFinite(parsed.camera[key]))) {
          throw new Error("Invalid camera data");
        }
      }
      if (parsed.gravityStrength !== void 0 && (!Number.isFinite(parsed.gravityStrength) || parsed.gravityStrength < 0.1 || parsed.gravityStrength > 3)) {
        throw new Error("Invalid gravity strength");
      }
      if (parsed.colorMode !== void 0 && !COLOR_MODES.has(parsed.colorMode)) throw new Error("Invalid color mode");
      if (parsed.collisionMode !== void 0 && !COLLISION_MODES.has(parsed.collisionMode)) throw new Error("Invalid collision mode");
      const attractors2 = parsed.attractors.map((body, index) => {
        const numeric = ["x", "y", "vx", "vy", "mass"];
        if (!body || numeric.some((key) => !Number.isFinite(body[key]))) throw new Error(`Invalid body ${index + 1}`);
        return {
          ...body,
          gardenStage: body.gardenStage || "young",
          stageAge: Number.isFinite(body.stageAge) ? body.stageAge : 0,
          stableFor: Number.isFinite(body.stableFor) ? body.stableFor : 0,
          appearanceSeed: Number.isFinite(body.appearanceSeed) ? body.appearanceSeed : (body.id || index + 1) * 2654435761 >>> 0,
          ringStrength: Number.isFinite(body.ringStrength) ? body.ringStrength : 0
        };
      });
      return { status: "ok", value: { ...parsed, version: SYSTEM_SCHEMA_VERSION, attractors: attractors2 } };
    } catch (error) {
      return { status: "invalid", error: error.message || "Invalid system data" };
    }
  }
  function saveSystemSnapshot(snapshot) {
    try {
      localStorage.setItem(SYSTEM_KEY, JSON.stringify({ ...snapshot, version: SYSTEM_SCHEMA_VERSION }));
      return true;
    } catch (e) {
      return false;
    }
  }
  function loadSystemSnapshotResult() {
    try {
      const raw = localStorage.getItem(SYSTEM_KEY);
      return raw === null ? { status: "missing" } : decodeSystemSnapshot(raw);
    } catch (error) {
      return { status: "invalid", error: error.message || "Invalid system data" };
    }
  }
  function sanitizeGardenProgress(progress) {
    const source = progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
    const rewarded = source.rewardedIntentions && typeof source.rewardedIntentions === "object" && !Array.isArray(source.rewardedIntentions) ? Object.fromEntries(Object.entries(source.rewardedIntentions).filter(([key]) => typeof key === "string").map(([key, value]) => [key, value === true ? 1 : Number.isFinite(value) && value > 0 ? Math.floor(value) : 0]).filter(([, value]) => value > 0)) : {};
    const savedUnlocks = Array.isArray(source.unlocks) ? source.unlocks.filter((value) => typeof value === "string") : [];
    return {
      stardust: Number.isFinite(source.stardust) && source.stardust >= 0 ? source.stardust : DEFAULT_GARDEN_PROGRESS.stardust,
      unlocks: [.../* @__PURE__ */ new Set([...DEFAULT_GARDEN_PROGRESS.unlocks, ...savedUnlocks])],
      discoveries: Array.isArray(source.discoveries) ? source.discoveries.filter((value) => typeof value === "string") : [],
      rewardedIntentions: rewarded
    };
  }
  function saveGardenProgress(progress) {
    try {
      localStorage.setItem(GARDEN_PROGRESS_KEY, JSON.stringify(sanitizeGardenProgress(progress)));
      return true;
    } catch (e) {
      return false;
    }
  }
  function loadGardenProgress() {
    try {
      const raw = localStorage.getItem(GARDEN_PROGRESS_KEY);
      return sanitizeGardenProgress(raw ? JSON.parse(raw) : DEFAULT_GARDEN_PROGRESS);
    } catch (e) {
      return sanitizeGardenProgress(DEFAULT_GARDEN_PROGRESS);
    }
  }
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  // js/camera.js
  var Camera = class {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.zoom = 1;
      this._animT = null;
    }
    worldToScreen(wx, wy, w2, h2) {
      return [
        (wx - this.x) * this.zoom + w2 / 2,
        (wy - this.y) * this.zoom + h2 / 2
      ];
    }
    screenToWorld(sx, sy, w2, h2) {
      return [
        (sx - w2 / 2) / this.zoom + this.x,
        (sy - h2 / 2) / this.zoom + this.y
      ];
    }
    pan(dxScreen, dyScreen) {
      this.x -= dxScreen / this.zoom;
      this.y -= dyScreen / this.zoom;
      this._animT = null;
    }
    zoomAt(sx, sy, factor, w2, h2) {
      const [wx, wy] = this.screenToWorld(sx, sy, w2, h2);
      this.zoom = clamp(this.zoom * factor, CONSTANTS.MIN_ZOOM, CONSTANTS.MAX_ZOOM);
      const [nx, ny] = this.screenToWorld(sx, sy, w2, h2);
      this.x -= nx - wx;
      this.y -= ny - wy;
      this._animT = null;
    }
    reset(instant = false) {
      this.animateTo(0, 0, 1, instant ? 0 : 0.6);
    }
    focusOn(x, y, zoom, instant = false) {
      this.animateTo(x, y, zoom ?? this.zoom, instant ? 0 : 0.6);
    }
    animateTo(tx, ty, tz, dur) {
      if (state.reducedMotion) dur = 0;
      if (dur <= 0) {
        this.x = tx;
        this.y = ty;
        this.zoom = clamp(tz, CONSTANTS.MIN_ZOOM, CONSTANTS.MAX_ZOOM);
        this._animT = null;
        return;
      }
      this._animT = {
        fromX: this.x,
        fromY: this.y,
        fromZ: this.zoom,
        toX: tx,
        toY: ty,
        toZ: clamp(tz, CONSTANTS.MIN_ZOOM, CONSTANTS.MAX_ZOOM),
        dur,
        elapsed: 0
      };
    }
    update(dt) {
      if (!this._animT) return false;
      const a = this._animT;
      a.elapsed += dt;
      const t = clamp(a.elapsed / a.dur, 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.x = a.fromX + (a.toX - a.fromX) * e;
      this.y = a.fromY + (a.toY - a.fromY) * e;
      this.zoom = a.fromZ + (a.toZ - a.fromZ) * e;
      if (t >= 1) this._animT = null;
      return true;
    }
    fitBounds(minX, minY, maxX, maxY, w2, h2, padding = 0.18) {
      const bw = Math.max(maxX - minX, 60);
      const bh = Math.max(maxY - minY, 60);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const zx = w2 / (bw * (1 + padding * 2));
      const zy = h2 / (bh * (1 + padding * 2));
      const z = clamp(Math.min(zx, zy), CONSTANTS.MIN_ZOOM, CONSTANTS.MAX_ZOOM);
      this.animateTo(cx, cy, z, 0.6);
    }
  };

  // js/garden.js
  var transformationEvents = [];
  var EMPTY_TRANSFORMATION_EVENTS = Object.freeze([]);
  var GARDEN_THRESHOLDS = Object.freeze({
    stableSeconds: 12,
    temperateSeconds: 24,
    bloomingSeconds: 45,
    temperateWarmthMin: 0.72,
    temperateWarmthMax: 1.28
  });
  function createGardenMetadata(type, overrides = {}) {
    return {
      gardenStage: overrides.gardenStage || "young",
      stageAge: Number.isFinite(overrides.stageAge) ? overrides.stageAge : 0,
      stableFor: Number.isFinite(overrides.stableFor) ? overrides.stableFor : 0,
      dominantStarId: overrides.dominantStarId ?? null,
      warmth: Number.isFinite(overrides.warmth) ? overrides.warmth : 0,
      orbitHealth: overrides.orbitHealth || "unknown",
      appearanceSeed: Number.isFinite(overrides.appearanceSeed) ? overrides.appearanceSeed : 0,
      ringStrength: Number.isFinite(overrides.ringStrength) ? overrides.ringStrength : 0,
      cradled: false,
      lastTransform: overrides.lastTransform || null
    };
  }
  function resolveTransformation(event = {}) {
    const mass = Math.max(0, event.consumed?.mass ?? event.body?.mass ?? 0);
    const reward = event.kind === "merge" ? Math.min(60, 10 + Math.round(mass / 25)) : event.kind === "destroy" ? Math.min(60, 12 + Math.round(mass / 30)) : Math.min(40, Math.max(8, Math.round(mass / 100)));
    if (event.kind === "merge") {
      const createsRing = event.survivor?.type === "planet" && event.consumed?.type === "moon";
      return {
        reward,
        residue: createsRing ? "ring" : "debris",
        ringDelta: createsRing ? 0.22 : 0,
        discovery: createsRing ? "first-ring-transformation" : null
      };
    }
    if (event.kind === "destroy") {
      return { reward, residue: "nebula", ringDelta: 0, discovery: null };
    }
    const distance = event.distance;
    const worldDistance = Number.isFinite(event.worldDistance) && event.worldDistance > 0 ? event.worldDistance : 6e3;
    if (Number.isFinite(distance) && distance >= worldDistance) {
      return { reward, residue: "stardust", ringDelta: 0, discovery: null };
    }
    return { reward, residue: "wandering-seed", ringDelta: 0, discovery: null };
  }
  function enqueueTransformationEvent(event) {
    transformationEvents.push(event);
  }
  function drainTransformationEvents() {
    if (transformationEvents.length === 0) return EMPTY_TRANSFORMATION_EVENTS;
    return transformationEvents.splice(0);
  }
  function findDominantStar(body, bodies) {
    let dominant = null;
    let strongestInfluence = -Infinity;
    for (const candidate of bodies) {
      if (candidate === body || candidate.type !== "star" || !Number.isFinite(candidate.mass)) continue;
      const dx = body.x - candidate.x;
      const dy = body.y - candidate.y;
      const distanceSquared = dx * dx + dy * dy;
      const influence = candidate.mass / Math.max(distanceSquared, Number.EPSILON);
      if (influence > strongestInfluence) {
        dominant = candidate;
        strongestInfluence = influence;
      }
    }
    return dominant;
  }
  function deriveGardenMetrics(body, bodies, gravity) {
    const star = findDominantStar(body, bodies);
    if (!star || !Number.isFinite(gravity) || gravity <= 0) {
      return {
        dominantStarId: null,
        specificEnergy: null,
        angularMomentum: 0,
        eccentricity: Infinity,
        orbitState: "unstable",
        warmth: 0,
        warmthState: "cold"
      };
    }
    const rx = body.x - star.x;
    const ry = body.y - star.y;
    const vx = body.vx - star.vx;
    const vy = body.vy - star.vy;
    const distanceSquared = rx * rx + ry * ry;
    const distance = Math.sqrt(distanceSquared);
    const mu = gravity * star.mass;
    if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(mu) || mu <= 0) {
      return {
        dominantStarId: star.id,
        specificEnergy: null,
        angularMomentum: 0,
        eccentricity: Infinity,
        orbitState: "unstable",
        warmth: 0,
        warmthState: "cold"
      };
    }
    const speedSquared = vx * vx + vy * vy;
    const specificEnergy = speedSquared / 2 - mu / distance;
    const angularMomentum = rx * vy - ry * vx;
    const eccentricity = Math.sqrt(Math.max(0, 1 + 2 * specificEnergy * angularMomentum * angularMomentum / (mu * mu)));
    const orbitState = eccentricity < 0.22 ? "stable" : eccentricity < 0.55 ? "transitional" : "unstable";
    const warmth = star.mass / 9e3 * (220 * 220 / distanceSquared);
    const warmthState = warmth < GARDEN_THRESHOLDS.temperateWarmthMin ? "cold" : warmth > GARDEN_THRESHOLDS.temperateWarmthMax ? "hot" : "temperate";
    return {
      dominantStarId: star.id,
      specificEnergy,
      angularMomentum,
      eccentricity,
      orbitState,
      warmth,
      warmthState
    };
  }
  function advanceGardenBody(body, metrics, dt) {
    const elapsed = Number.isFinite(dt) && dt > 0 ? dt : 0;
    body.dominantStarId = metrics.dominantStarId ?? body.dominantStarId ?? null;
    body.warmth = Number.isFinite(metrics.warmth) ? metrics.warmth : body.warmth ?? 0;
    body.orbitHealth = metrics.orbitState || "unknown";
    if (metrics.orbitState === "stable") body.stableFor = (body.stableFor || 0) + elapsed;
    if (metrics.orbitState === "unstable") body.stableFor = 0;
    let nextStage = "young";
    if (body.stableFor >= GARDEN_THRESHOLDS.stableSeconds) nextStage = "stable";
    if (body.stableFor >= GARDEN_THRESHOLDS.temperateSeconds && metrics.warmthState === "temperate") nextStage = "temperate";
    if (body.stableFor >= GARDEN_THRESHOLDS.bloomingSeconds && metrics.warmthState === "temperate") nextStage = "blooming";
    if (body.gardenStage !== nextStage) {
      body.gardenStage = nextStage;
      body.stageAge = 0;
    } else {
      body.stageAge = (body.stageAge || 0) + elapsed;
    }
    return body;
  }
  function summarizeGarden(bodies, transformationCount2, harmoniousSeconds2) {
    let stablePlanets = 0;
    let stableMoons = 0;
    let temperatePlanets = 0;
    for (const body of bodies || []) {
      if (!body || body.orbitHealth !== "stable") continue;
      if (body.type === "planet") {
        stablePlanets++;
        if (body.gardenStage === "temperate" || body.gardenStage === "blooming") temperatePlanets++;
      } else if (body.type === "moon") {
        stableMoons++;
      }
    }
    return {
      stablePlanets,
      stableMoons,
      temperatePlanets,
      harmoniousSeconds: Number.isFinite(harmoniousSeconds2) && harmoniousSeconds2 > 0 ? harmoniousSeconds2 : 0,
      transformations: Number.isFinite(transformationCount2) && transformationCount2 > 0 ? Math.floor(transformationCount2) : 0
    };
  }

  // js/attractors.js
  var nextId = 1;
  var attractors = [];
  var TYPE_DEFAULTS = {
    star: { mass: 9e3, baseRadius: 20, color: "gold", label: "Star" },
    planet: { mass: 2e3, baseRadius: 11, color: "cyan", label: "Planet" },
    moon: { mass: 220, baseRadius: 6, color: "ivory", label: "Moon" },
    heavyCore: { mass: 3e4, baseRadius: 15, color: "violet", label: "Black Hole" },
    anchor: { mass: 6e3, baseRadius: 13, color: "white", label: "Anchor", fixed: true }
  };
  function massToRadius(mass, type) {
    const def = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.planet;
    const refMass = def.mass;
    const scale = Math.pow(mass / refMass, 1 / 3);
    return clamp(def.baseRadius * scale, 5, 90);
  }
  function createAttractor(type, x, y, overrides = {}) {
    const def = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.planet;
    const mass = clamp(overrides.mass ?? def.mass, CONSTANTS.MIN_MASS, CONSTANTS.MAX_MASS);
    const id = Number.isFinite(overrides.id) ? overrides.id : nextId++;
    if (id >= nextId) nextId = id + 1;
    const obj = {
      id,
      name: overrides.name || `${def.label} ${id}`,
      type,
      x,
      y,
      vx: overrides.vx || 0,
      vy: overrides.vy || 0,
      mass,
      radius: Number.isFinite(overrides.radius) ? overrides.radius : massToRadius(mass, type),
      fixed: overrides.fixed !== void 0 ? overrides.fixed : !!def.fixed,
      color: overrides.color || def.color,
      showTrail: overrides.showTrail !== void 0 ? overrides.showTrail : true,
      trail: [],
      flash: 0,
      nearbyCount: 0,
      ...createGardenMetadata(type, overrides)
    };
    attractors.push(obj);
    return obj;
  }
  function removeAttractor(id) {
    const i = attractors.findIndex((a) => a.id === id);
    if (i >= 0) attractors.splice(i, 1);
  }
  function setNextAttractorId(minimumNextId) {
    if (Number.isFinite(minimumNextId)) nextId = Math.max(nextId, Math.ceil(minimumNextId));
  }
  function duplicateAttractor(id, offset = 30) {
    const src = getAttractor(id);
    if (!src) return null;
    const copy = createAttractor(src.type, src.x + offset, src.y + offset, {
      mass: src.mass,
      vx: src.vx,
      vy: src.vy,
      fixed: src.fixed,
      radius: src.radius,
      color: src.color,
      showTrail: src.showTrail,
      name: `${src.name} copy`,
      gardenStage: src.gardenStage,
      stageAge: src.stageAge,
      stableFor: src.stableFor,
      dominantStarId: src.dominantStarId,
      warmth: src.warmth,
      orbitHealth: src.orbitHealth,
      ringStrength: src.ringStrength,
      appearanceSeed: duplicateAppearanceSeed(src.appearanceSeed, nextId),
      cradled: false
    });
    return copy;
  }
  function duplicateAppearanceSeed(sourceSeed, newId) {
    const seed = Number.isFinite(sourceSeed) ? sourceSeed >>> 0 : 0;
    return Math.imul(seed, 1664525) + (newId >>> 0) + 1013904223 >>> 0;
  }
  function getAttractor(id) {
    return attractors.find((a) => a.id === id) || null;
  }
  function clearAttractors() {
    attractors.length = 0;
  }
  function setMass(a, mass) {
    a.mass = clamp(mass, CONSTANTS.MIN_MASS, CONSTANTS.MAX_MASS);
    a.radius = massToRadius(a.mass, a.type);
  }
  function nearestAttractor(x, y, maxDist = Infinity) {
    let best = null, bestD = maxDist;
    for (const a of attractors) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  // js/particles.js
  var CAP = CONSTANTS.MAX_PARTICLES;
  var px = new Float32Array(CAP);
  var py = new Float32Array(CAP);
  var pvx = new Float32Array(CAP);
  var pvy = new Float32Array(CAP);
  var pPrevX = new Float32Array(CAP);
  var pPrevY = new Float32Array(CAP);
  var page = new Float32Array(CAP);
  var plife = new Float32Array(CAP);
  var pseed = new Float32Array(CAP);
  var pspeed = new Float32Array(CAP);
  var pgrav = new Float32Array(CAP);
  var pclass = new Uint8Array(CAP);
  var pdist = new Float32Array(CAP);
  var penergy = new Float32Array(CAP);
  var pbucket = new Uint8Array(CAP);
  var count = 0;
  var NO_BUCKET = 255;
  function resetParticles() {
    count = 0;
  }
  function spawnParticle(x, y, vx, vy, life = -1, colorBucket = NO_BUCKET) {
    if (count >= CAP) return -1;
    const i = count++;
    px[i] = x;
    py[i] = y;
    pPrevX[i] = x;
    pPrevY[i] = y;
    pvx[i] = vx;
    pvy[i] = vy;
    page[i] = 0;
    plife[i] = life;
    pseed[i] = Math.random();
    pspeed[i] = Math.hypot(vx, vy);
    pgrav[i] = 0;
    pclass[i] = 0;
    pdist[i] = 0;
    penergy[i] = 0;
    pbucket[i] = colorBucket;
    return i;
  }
  function removeAt(i) {
    count--;
    if (i === count) return;
    px[i] = px[count];
    py[i] = py[count];
    pPrevX[i] = pPrevX[count];
    pPrevY[i] = pPrevY[count];
    pvx[i] = pvx[count];
    pvy[i] = pvy[count];
    page[i] = page[count];
    plife[i] = plife[count];
    pseed[i] = pseed[count];
    pspeed[i] = pspeed[count];
    pgrav[i] = pgrav[count];
    pclass[i] = pclass[count];
    pdist[i] = pdist[count];
    penergy[i] = penergy[count];
    pbucket[i] = pbucket[count];
  }
  function clearNear(cx, cy, radius) {
    const r2 = radius * radius;
    let removed = 0;
    for (let i = count - 1; i >= 0; i--) {
      const dx = px[i] - cx, dy = py[i] - cy;
      if (dx * dx + dy * dy <= r2) {
        removeAt(i);
        removed++;
      }
    }
    return removed;
  }
  function spawnPattern(opts) {
    const {
      cx,
      cy,
      count: n,
      mode = "rotating",
      radius = 100,
      spread = 0.35,
      spin = 0,
      // simple kinematic angular rate (slider units, -100..100)
      speed = 0,
      // overall drift speed
      angle = 0,
      // direction for jet/drift (radians)
      coneSpread = 0.35,
      // half-angle for jet cone (radians)
      keplerian = false,
      centralMass = 0,
      G: G3 = CONSTANTS.G_DEFAULT,
      lifespan = -1,
      colorBucket = NO_BUCKET
    } = opts;
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      let r, theta, x, y;
      if (mode === "ring") {
        r = radius * (1 + (Math.random() - 0.5) * spread * 0.25);
        theta = Math.random() * Math.PI * 2;
        x = cx + Math.cos(theta) * r;
        y = cy + Math.sin(theta) * r;
      } else if (mode === "disc") {
        r = Math.sqrt(Math.random()) * radius;
        theta = Math.random() * Math.PI * 2;
        x = cx + Math.cos(theta) * r;
        y = cy + Math.sin(theta) * r;
      } else if (mode === "jet") {
        const a = angle + (Math.random() - 0.5) * coneSpread;
        const off = (Math.random() - 0.5) * radius * 0.18;
        const perp = angle + Math.PI / 2;
        x = cx + Math.cos(perp) * off;
        y = cy + Math.sin(perp) * off;
        theta = a;
        r = 0;
      } else {
        r = Math.random() * radius;
        theta = Math.random() * Math.PI * 2;
        x = cx + Math.cos(theta) * r;
        y = cy + Math.sin(theta) * r;
      }
      let vx = 0, vy = 0;
      if (mode === "jet") {
        const sp = speed * (0.75 + Math.random() * 0.5);
        vx = Math.cos(theta) * sp;
        vy = Math.sin(theta) * sp;
      } else {
        let tangential = 0;
        if (keplerian && centralMass > 0) {
          const dist2 = Math.max(r, 14);
          tangential = Math.sqrt(G3 * centralMass / dist2) * (spin < 0 ? -1 : 1);
        } else if (spin) {
          tangential = spin * r * 0.018;
        }
        const dx = x - cx, dy = y - cy;
        const dist = Math.max(Math.hypot(dx, dy), 1e-3);
        const nx = dx / dist, ny = dy / dist;
        const tx = -ny, ty = nx;
        vx = tx * tangential + nx * speed;
        vy = ty * tangential + ny * speed;
        vx += (Math.random() - 0.5) * spread * 22;
        vy += (Math.random() - 0.5) * spread * 22;
      }
      if (spawnParticle(x, y, vx, vy, lifespan, colorBucket) === -1) break;
      spawned++;
    }
    return spawned;
  }
  var BUCKET_NAMES = ["white", "cyan", "violet", "gold", "blue"];
  function bucketIndexForColor(colorName) {
    const idx = BUCKET_NAMES.indexOf(colorName);
    return idx >= 0 ? idx : NO_BUCKET;
  }

  // js/orbit-guidance.js
  var MAX_STEPS = 90;
  var MAX_WORLD_DISTANCE = 6e3;
  var STABLE_RADIUS_TOLERANCE = 0.35;
  var SOFTENING_SQUARED = CONSTANTS.SOFTENING * CONSTANTS.SOFTENING;
  function hasFiniteBodyValues(body) {
    return !!body && Number.isFinite(body.x) && Number.isFinite(body.y) && Number.isFinite(body.vx) && Number.isFinite(body.vy) && Number.isFinite(body.mass) && Number.isFinite(body.radius);
  }
  function isCandidateOf(body, candidate) {
    return body === candidate || Number.isFinite(body?.id) && body.id === candidate.id;
  }
  function overlapsBody(x, y, candidate, other) {
    const dx = other.x - x;
    const dy = other.y - y;
    const radius = candidate.radius + other.radius;
    return dx * dx + dy * dy <= radius * radius;
  }
  function dominantStarFor(body, bodies) {
    let dominantStar = null;
    let dominantInfluence = -Infinity;
    for (let i = 0; i < bodies.length; i++) {
      const other = bodies[i];
      if (other?.type !== "star" || isCandidateOf(other, body) || !Number.isFinite(other.mass) || !Number.isFinite(other.x) || !Number.isFinite(other.y)) continue;
      const dx = other.x - body.x;
      const dy = other.y - body.y;
      const influence = other.mass / (dx * dx + dy * dy + SOFTENING_SQUARED);
      if (influence > dominantInfluence) {
        dominantInfluence = influence;
        dominantStar = other;
      }
    }
    return dominantStar;
  }
  function classifyOrbitPreview(points, body, bodies, gravity) {
    if (!Array.isArray(points) || points.length === 0 || !hasFiniteBodyValues(body) || !Array.isArray(bodies) || !Number.isFinite(gravity) || gravity <= 0) return "danger";
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.hypot(point.x, point.y) > MAX_WORLD_DISTANCE) return "danger";
      for (let j = 0; j < bodies.length; j++) {
        const other = bodies[j];
        if (isCandidateOf(other, body)) continue;
        if (!hasFiniteBodyValues(other) || overlapsBody(point.x, point.y, body, other)) return "danger";
      }
    }
    const dominantStar = dominantStarFor(body, bodies);
    if (!dominantStar) return "uncertain";
    const initialRadius = Math.hypot(body.x - dominantStar.x, body.y - dominantStar.y);
    const finalPoint = points[points.length - 1];
    const finalRadius = Math.hypot(finalPoint.x - dominantStar.x, finalPoint.y - dominantStar.y);
    if (!Number.isFinite(initialRadius) || !Number.isFinite(finalRadius) || initialRadius <= 0) return "danger";
    return Math.abs(finalRadius - initialRadius) / initialRadius <= STABLE_RADIUS_TOLERANCE ? "stable" : "uncertain";
  }
  function predictTrajectory({ body, bodies, gravity, steps = MAX_STEPS, dt = 1 / 30 } = {}) {
    if (!hasFiniteBodyValues(body) || !Array.isArray(bodies) || !Number.isFinite(gravity) || gravity <= 0 || !Number.isFinite(dt) || dt <= 0) {
      return { points: [], outcome: "danger", closestBodyId: null };
    }
    const stepCount = Math.min(MAX_STEPS, Math.max(0, Math.floor(Number.isFinite(steps) ? steps : MAX_STEPS)));
    let x = body.x;
    let y = body.y;
    let vx = body.vx;
    let vy = body.vy;
    let closestBodyId = null;
    let closestDistanceSquared = Infinity;
    const points = [{ x, y }];
    for (let i = 0; i < bodies.length; i++) {
      const other = bodies[i];
      if (isCandidateOf(other, body) || !hasFiniteBodyValues(other)) continue;
      const dx = other.x - x;
      const dy = other.y - y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < closestDistanceSquared) {
        closestDistanceSquared = distanceSquared;
        closestBodyId = other.id;
      }
      if (overlapsBody(x, y, body, other)) {
        return {
          points,
          outcome: classifyOrbitPreview(points, body, bodies, gravity),
          closestBodyId
        };
      }
    }
    for (let step = 0; step < stepCount; step++) {
      let ax = 0;
      let ay = 0;
      for (let i = 0; i < bodies.length; i++) {
        const other = bodies[i];
        if (isCandidateOf(other, body) || !hasFiniteBodyValues(other)) continue;
        const dx = other.x - x;
        const dy = other.y - y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < closestDistanceSquared) {
          closestDistanceSquared = distanceSquared;
          closestBodyId = other.id;
        }
        const softenedDistanceSquared = distanceSquared + SOFTENING_SQUARED;
        const inverseDistance = 1 / Math.sqrt(softenedDistanceSquared);
        const force = gravity * other.mass * inverseDistance * inverseDistance * inverseDistance;
        ax += dx * force;
        ay += dy * force;
      }
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy)) {
        return { points, outcome: "danger", closestBodyId };
      }
      points.push({ x, y });
      if (Math.hypot(x, y) > MAX_WORLD_DISTANCE) break;
      let collided = false;
      for (let i = 0; i < bodies.length; i++) {
        const other = bodies[i];
        if (isCandidateOf(other, body) || !hasFiniteBodyValues(other)) continue;
        if (overlapsBody(x, y, body, other)) {
          closestBodyId = other.id;
          collided = true;
          break;
        }
      }
      if (collided) break;
    }
    return {
      points,
      outcome: classifyOrbitPreview(points, body, bodies, gravity),
      closestBodyId
    };
  }

  // js/tools.js
  var previewState = {
    active: false,
    kind: null,
    trajectory: [],
    orbitHealth: "unknown",
    closestBodyId: null
  };
  function clearTrajectoryPreview() {
    previewState.trajectory = [];
    previewState.orbitHealth = "unknown";
    previewState.closestBodyId = null;
  }
  function clearToolPreview() {
    previewState.active = false;
    previewState.kind = null;
    clearTrajectoryPreview();
  }
  var CREATIVE_TOOL_VARIANTS = Object.freeze([
    { id: "oceanSeed", tool: "planet", label: "Ocean planet", title: "Place an ocean-style planet" },
    { id: "ringSeed", tool: "planet", label: "Ringed planet", title: "Place a ringed planet" },
    { id: "fineInfluence", tool: "influence", label: "Fine influence", title: "Use a gentler, finer influence" }
  ]);
  var emitters = [];
  function tickEmitters(dt) {
    for (const em of emitters) {
      em.acc += em.rate * dt;
      while (em.acc >= 1) {
        em.acc -= 1;
        spawnPattern({
          cx: em.x,
          cy: em.y,
          count: 1,
          mode: em.mode,
          radius: em.radius,
          spread: em.spread,
          spin: em.spin,
          speed: em.speed,
          angle: em.angle,
          coneSpread: em.coneSpread,
          colorBucket: em.colorBucket
        });
      }
    }
  }
  function clearEmitters() {
    emitters.length = 0;
    clearToolPreview();
  }

  // js/gravity.js
  var SOFT2 = CONSTANTS.SOFTENING * CONSTANTS.SOFTENING;
  function accelAt(x, y, g, skipId = -1) {
    let ax = 0, ay = 0, localG = 0;
    for (let i = 0; i < attractors.length; i++) {
      const a = attractors[i];
      if (a.id === skipId) continue;
      const dx = a.x - x, dy = a.y - y;
      const distSq = dx * dx + dy * dy + SOFT2;
      const invDist = 1 / Math.sqrt(distSq);
      const invDist3 = invDist * invDist * invDist;
      const f = g * a.mass * invDist3;
      ax += dx * f;
      ay += dy * f;
      const gAtPoint = g * a.mass * invDist * invDist;
      if (gAtPoint > localG) localG = gAtPoint;
    }
    return [ax, ay, localG];
  }
  function stepAttractors(dt, g) {
    const n = attractors.length;
    if (n === 0) return;
    const fx = new Float64Array(n), fy = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = attractors[i];
      if (a.fixed || a.cradled) continue;
      let ax = 0, ay = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = attractors[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + SOFT2 * 4;
        const invDist = 1 / Math.sqrt(distSq);
        const invDist3 = invDist * invDist * invDist;
        const f = g * b.mass * invDist3;
        ax += dx * f;
        ay += dy * f;
      }
      fx[i] = ax;
      fy[i] = ay;
    }
    for (let i = 0; i < n; i++) {
      const a = attractors[i];
      if (a.fixed || a.cradled) continue;
      a.vx += fx[i] * dt;
      a.vy += fy[i] * dt;
      const speed = Math.hypot(a.vx, a.vy);
      if (speed > CONSTANTS.MAX_ATTRACTOR_SPEED) {
        const s = CONSTANTS.MAX_ATTRACTOR_SPEED / speed;
        a.vx *= s;
        a.vy *= s;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (!state.reducedMotion) {
        a.trail.push(a.x, a.y);
        if (a.trail.length > 120) a.trail.splice(0, a.trail.length - 120);
      }
      if (a.flash > 0) a.flash = Math.max(0, a.flash - dt * 2.2);
    }
  }
  function handleAttractorCollisions(callbacks = {}) {
    const mode = state.collisionMode || "merge";
    if (mode === "ignore") return;
    const { onMerge, onBounce, onDestroy } = callbacks;
    for (let i = attractors.length - 1; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        const a = attractors[i], b = attractors[j];
        if (!a || !b) continue;
        if (a.cradled || b.cradled) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < (a.radius + b.radius) * 0.72) {
          if (mode === "bounce") bounceAttractors(a, b, dist, dx, dy, onBounce);
          else if (mode === "destroy") destroyAttractors(a, b, onDestroy);
          else mergeAttractors(a, b, onMerge);
          break;
        }
      }
    }
  }
  function mergeAttractors(a, b, onMerge) {
    const totalMass = a.mass + b.mass;
    const nx = (a.x * a.mass + b.x * b.mass) / totalMass;
    const ny = (a.y * a.mass + b.y * b.mass) / totalMass;
    const nvx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
    const nvy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
    const keepFixed = a.fixed || b.fixed;
    const survivor = a.mass >= b.mass ? a : b;
    const other = survivor === a ? b : a;
    const consumed = other;
    survivor.mass = Math.min(totalMass, CONSTANTS.MAX_MASS);
    survivor.radius = massToRadius(survivor.mass, survivor.type);
    survivor.x = nx;
    survivor.y = ny;
    survivor.vx = keepFixed ? 0 : nvx;
    survivor.vy = keepFixed ? 0 : nvy;
    survivor.fixed = keepFixed;
    survivor.flash = 1;
    const idx = attractors.indexOf(other);
    if (idx >= 0) attractors.splice(idx, 1);
    if (onMerge) onMerge(survivor, nx, ny, {
      kind: "merge",
      survivor,
      consumed,
      x: nx,
      y: ny
    });
  }
  function bounceAttractors(a, b, dist, dx, dy, onBounce) {
    const d = Math.max(dist, 1e-3);
    const nx = dx / d, ny = dy / d;
    const overlap = (a.radius + b.radius) * 0.72 - d;
    if (!a.fixed && !b.fixed) {
      a.x += nx * overlap * 0.5;
      a.y += ny * overlap * 0.5;
      b.x -= nx * overlap * 0.5;
      b.y -= ny * overlap * 0.5;
    } else if (!a.fixed) {
      a.x += nx * overlap;
      a.y += ny * overlap;
    } else if (!b.fixed) {
      b.x -= nx * overlap;
      b.y -= ny * overlap;
    }
    const rvx = a.vx - b.vx, rvy = a.vy - b.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal < 0) {
      const restitution = 0.72;
      const invMassA = a.fixed ? 0 : 1 / a.mass, invMassB = b.fixed ? 0 : 1 / b.mass;
      const invSum = invMassA + invMassB;
      if (invSum > 0) {
        const j = -(1 + restitution) * velAlongNormal / invSum;
        a.vx += j * invMassA * nx;
        a.vy += j * invMassA * ny;
        b.vx -= j * invMassB * nx;
        b.vy -= j * invMassB * ny;
      }
    }
    a.flash = Math.max(a.flash, 0.6);
    b.flash = Math.max(b.flash, 0.6);
    if (onBounce) onBounce(a, b, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  function destroyAttractors(a, b, onDestroy) {
    const survivor = a.mass >= b.mass ? a : b;
    const doomed = survivor === a ? b : a;
    const consumed = doomed;
    survivor.flash = 1;
    const idx = attractors.indexOf(doomed);
    if (idx >= 0) attractors.splice(idx, 1);
    if (onDestroy) onDestroy(survivor, doomed.x, doomed.y, doomed.color, {
      kind: "destroy",
      survivor,
      consumed,
      x: doomed.x,
      y: doomed.y
    });
  }
  var slingshotCooldown = 0;
  function stepParticles(dt, g, onSlingshot) {
    const n = attractors.length;
    const absorb = state.absorbMode === "absorb";
    slingshotCooldown = Math.max(0, slingshotCooldown - dt);
    const slingshotThreshold = CONSTANTS.MAX_PARTICLE_SPEED * 0.62;
    for (let i = count - 1; i >= 0; i--) {
      pPrevX[i] = px[i];
      pPrevY[i] = py[i];
      let ax = 0, ay = 0, localG = 0;
      let absorbed = false;
      let strongCount = 0;
      let maxForce = 0, secondForce = 0;
      let dominantDist = Infinity, dominantMass = 0, dominantDx = 0, dominantDy = 0;
      for (let k = 0; k < n; k++) {
        const a = attractors[k];
        const dx = a.x - px[i], dy = a.y - py[i];
        const trueDistSq = dx * dx + dy * dy;
        const distSq = trueDistSq + SOFT2;
        const dist = Math.sqrt(distSq);
        if (trueDistSq < a.radius * 0.85 * (a.radius * 0.85)) {
          if (absorb) {
            absorbed = true;
            break;
          }
        }
        const invDist = 1 / dist;
        const invDist3 = invDist * invDist * invDist;
        const f = g * a.mass * invDist3;
        ax += dx * f;
        ay += dy * f;
        const gAtPoint = g * a.mass * invDist * invDist;
        if (gAtPoint > localG) localG = gAtPoint;
        if (gAtPoint > maxForce) {
          secondForce = maxForce;
          maxForce = gAtPoint;
          dominantDist = dist;
          dominantMass = a.mass;
          dominantDx = dx;
          dominantDy = dy;
        } else if (gAtPoint > secondForce) secondForce = gAtPoint;
        if (gAtPoint > 0.02) strongCount++;
      }
      if (absorbed) {
        removeAt(i);
        stats.absorbedCount++;
        continue;
      }
      pvx[i] += ax * dt;
      pvy[i] += ay * dt;
      const speed = Math.hypot(pvx[i], pvy[i]);
      if (speed > CONSTANTS.MAX_PARTICLE_SPEED) {
        const s = CONSTANTS.MAX_PARTICLE_SPEED / speed;
        pvx[i] *= s;
        pvy[i] *= s;
      }
      px[i] += pvx[i] * dt;
      py[i] += pvy[i] * dt;
      if (!isFinite(px[i]) || !isFinite(py[i])) {
        removeAt(i);
        continue;
      }
      page[i] += dt;
      const finalSpeed = Math.hypot(pvx[i], pvy[i]);
      pspeed[i] = finalSpeed;
      pgrav[i] = localG;
      if (plife[i] >= 0 && page[i] > plife[i]) {
        removeAt(i);
        continue;
      }
      if (dominantMass > 0) {
        const safeDist = Math.max(dominantDist, CONSTANTS.SOFTENING);
        pdist[i] = safeDist;
        penergy[i] = 0.5 * finalSpeed * finalSpeed - g * dominantMass / safeDist;
        const vEsc = Math.sqrt(2 * g * dominantMass / safeDist);
        const radialVel = (pvx[i] * dominantDx + pvy[i] * dominantDy) / safeDist;
        if (secondForce > maxForce * 0.35 && strongCount >= 2) pclass[i] = 3;
        else if (finalSpeed > vEsc * 1.05) pclass[i] = 2;
        else if (radialVel > finalSpeed * 0.55 && finalSpeed > 8) pclass[i] = 1;
        else pclass[i] = 0;
        if (onSlingshot && slingshotCooldown <= 0 && finalSpeed > slingshotThreshold && localG > 0.4) {
          onSlingshot(px[i], py[i]);
          slingshotCooldown = 2.5;
        }
      } else {
        pdist[i] = Infinity;
        penergy[i] = 0.5 * finalSpeed * finalSpeed;
        pclass[i] = 2;
      }
    }
  }
  function nearbyParticleCount(a, radius) {
    let c = 0;
    const r2 = radius * radius;
    for (let i = 0; i < count; i++) {
      const dx = px[i] - a.x, dy = py[i] - a.y;
      if (dx * dx + dy * dy <= r2) c++;
    }
    return c;
  }

  // js/renderer.js
  var BUCKETS = ["white", "cyan", "violet", "gold", "blue"];
  var fieldGrid = null;
  var fieldFrameCounter = 0;
  var canvas = null;
  var ctx = null;
  var w = 0;
  var h = 0;
  var dpr = 1;
  var sprites = {};
  var bodySprites = null;
  var bodySpriteSignature = "";
  var stars = [[], [], []];
  var nebulae = [];
  var flashes = [];
  var forceFullClear = true;
  var lowQuality = false;
  var frameTimes = [];
  var TILE = 2600;
  var PARALLAX = [0.035, 0.1, 0.24];
  var BoundedSpriteCache = class {
    constructor(limit = 96) {
      this.limit = limit;
      this.entries = /* @__PURE__ */ new Map();
    }
    get size() {
      return this.entries.size;
    }
    get(key) {
      return this.entries.get(key);
    }
    set(key, value) {
      if (!this.entries.has(key) && this.entries.size >= this.limit) {
        this.entries.delete(this.entries.keys().next().value);
      }
      this.entries.set(key, value);
      return value;
    }
    clear() {
      this.entries.clear();
    }
  };
  function bodySpriteCacheKey(body) {
    const seed = Number.isFinite(body?.appearanceSeed) ? Math.trunc(body.appearanceSeed) : 0;
    const variant = (seed % 8 + 8) % 8;
    return `${body?.type || "planet"}:${body?.color || "ivory"}:${body?.gardenStage || "young"}:${variant}`;
  }
  function playerFacingBodyLabel(type) {
    return type === "heavyCore" ? "Black Hole" : null;
  }
  function bodySpriteCachePolicySignature({ palette = PALETTE, renderQuality = state.renderQuality } = {}) {
    return `${renderQuality}|${Object.values(palette).join("|")}`;
  }
  function initRenderer(c) {
    canvas = c;
    ctx = canvas.getContext("2d", { alpha: false });
    bodySprites = new BoundedSpriteCache(96);
    buildSprites();
    invalidateBodySpriteCache();
    buildBackground();
  }
  function renderSettingsSignature() {
    return bodySpriteCachePolicySignature();
  }
  function invalidateBodySpriteCache() {
    bodySprites?.clear();
    bodySpriteSignature = renderSettingsSignature();
  }
  function invalidateBodySpriteCacheIfNeeded() {
    if (bodySpriteSignature !== renderSettingsSignature()) invalidateBodySpriteCache();
  }
  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function buildSprites() {
    for (const name of BUCKETS) {
      const s = document.createElement("canvas");
      s.width = 64;
      s.height = 64;
      const sc = s.getContext("2d");
      const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
      const col = PALETTE[name];
      grad.addColorStop(0, hexAlpha(col, 1));
      grad.addColorStop(0.3, hexAlpha(col, 0.65));
      grad.addColorStop(1, hexAlpha(col, 0));
      sc.fillStyle = grad;
      sc.fillRect(0, 0, 64, 64);
      sprites[name] = s;
    }
  }
  function buildBackground() {
    const counts = [42, 76, 132];
    for (let layer = 0; layer < 3; layer++) {
      stars[layer] = [];
      const n = Math.round(counts[layer] * state.backgroundDensity);
      for (let i = 0; i < n; i++) {
        stars[layer].push({
          x: Math.random() * TILE - TILE / 2,
          y: Math.random() * TILE - TILE / 2,
          r: 0.4 + Math.random() * (layer === 2 ? 1.5 : 0.9),
          b: 0.22 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.8
        });
      }
    }
    nebulae = [];
    const nn = Math.max(2, Math.round(4 * state.backgroundDensity));
    const palette = [PALETTE.jade, PALETTE.blue];
    for (let i = 0; i < nn; i++) {
      nebulae.push({
        x: Math.random() * TILE - TILE / 2,
        y: Math.random() * TILE - TILE / 2,
        r: 240 + Math.random() * 300,
        color: palette[i % palette.length],
        a: 0.03 + Math.random() * 0.028
      });
    }
    forceFullClear = true;
  }
  function resize(width, height, deviceRatio) {
    dpr = Math.min(deviceRatio || 1, 2);
    w = width;
    h = height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    forceFullClear = true;
  }
  function clearTrails() {
    forceFullClear = true;
  }
  function triggerFlash(x, y, color, radius = 100) {
    flashes.push({ x, y, r: 0, maxR: radius, life: 1, color: color || PALETTE.gold });
  }
  function bucketFor(i) {
    if (state.classificationOverlay) {
      const c = pclass[i];
      return c === 2 ? "gold" : c === 3 ? "violet" : c === 1 ? "blue" : "cyan";
    }
    switch (state.colorMode) {
      case "speed": {
        const t = pspeed[i] / 650;
        if (t < 0.22) return "blue";
        if (t < 0.5) return "cyan";
        if (t < 0.85) return "white";
        return "gold";
      }
      case "gravity": {
        const t = Math.log10(1 + pgrav[i] * 800);
        if (t < 0.6) return "blue";
        if (t < 1.3) return "violet";
        if (t < 2.1) return "white";
        return "gold";
      }
      case "age": {
        const maxAge = plife[i] >= 0 ? plife[i] : 24;
        const t = page[i] / maxAge;
        if (t < 0.12) return "white";
        if (t < 0.5) return "cyan";
        if (t < 0.85) return "violet";
        return "blue";
      }
      case "orbital": {
        const ang = Math.atan2(pvy[i], pvx[i]);
        const norm = (ang + Math.PI) / (Math.PI * 2);
        const sector = Math.floor(norm * 5) % 5;
        return ["cyan", "violet", "gold", "blue", "white"][sector];
      }
      case "bybody": {
        const b = pbucket[i];
        return b < BUCKETS.length ? BUCKETS[b] : pseed[i] < 0.5 ? "white" : "cyan";
      }
      case "energy": {
        const e = penergy[i];
        if (e < -4e4) return "blue";
        if (e < 0) return "cyan";
        if (e < 4e4) return "white";
        return "gold";
      }
      case "distance": {
        const d = pdist[i];
        if (!isFinite(d)) return "blue";
        if (d < 90) return "gold";
        if (d < 220) return "white";
        if (d < 450) return "cyan";
        return "blue";
      }
      default:
        return pseed[i] < 0.055 ? "gold" : pseed[i] < 0.5 ? "white" : "cyan";
    }
  }
  function updateFpsAndQuality(dtReal) {
    frameTimes.push(dtReal);
    if (frameTimes.length > 40) frameTimes.shift();
    const avg = frameTimes.reduce((s, v) => s + v, 0) / frameTimes.length;
    stats.fps = Math.round(1 / Math.max(avg, 1e-4));
    const q = state.renderQuality;
    if (q === "low") lowQuality = true;
    else if (q === "medium") lowQuality = stats.fps < 32 && count > 1500;
    else if (q === "high") lowQuality = stats.fps < 18 && count > 3e3;
    else lowQuality = stats.fps < 26 && count > 2200;
  }
  function render(camera4, width, height, dtReal) {
    updateFpsAndQuality(dtReal);
    invalidateBodySpriteCacheIfNeeded();
    const fade = state.motionBlur ? Math.min(TRAIL_FADE[state.trailLength], 0.02) : TRAIL_FADE[state.trailLength];
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    if (forceFullClear || fade >= 1) {
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, width, height);
      forceFullClear = false;
    } else {
      ctx.fillStyle = hexAlpha(PALETTE.ocean, fade);
      ctx.fillRect(0, 0, width, height);
    }
    drawBackground(camera4, width, height);
    if (state.gravityOverlay) drawGravityField(camera4, width, height);
    drawAttractorTrails(camera4, width, height);
    drawAttractors(camera4, width, height);
    drawParticles(camera4, width, height);
    drawFlashes(camera4, width, height, dtReal);
    drawPreview(camera4, width, height);
  }
  function drawBackground(camera4, width, height) {
    ctx.save();
    for (let layer = 0; layer < 3; layer++) {
      const par = PARALLAX[layer];
      const offX = camera4.x * par;
      const offY = camera4.y * par;
      for (const s of stars[layer]) {
        let x = ((s.x - offX) % TILE + TILE) % TILE - TILE / 2 + width / 2;
        let y = ((s.y - offY) % TILE + TILE) % TILE - TILE / 2 + height / 2;
        if (x < -10 || x > width + 10 || y < -10 || y > height + 10) continue;
        const twinkle = state.reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(stats.simTime * s.speed + s.phase);
        ctx.globalAlpha = s.b * twinkle;
        ctx.fillStyle = PALETTE.white;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const neb of nebulae) {
      const par = 0.05;
      let x = ((neb.x - camera4.x * par) % TILE + TILE) % TILE - TILE / 2 + width / 2;
      let y = ((neb.y - camera4.y * par) % TILE + TILE) % TILE - TILE / 2 + height / 2;
      if (x < -neb.r || x > width + neb.r || y < -neb.r || y > height + neb.r) continue;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, neb.r);
      grad.addColorStop(0, hexAlpha(neb.color, neb.a));
      grad.addColorStop(1, hexAlpha(neb.color, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, neb.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawGravityField(camera4, width, height) {
    const g = CONSTANTS.G_DEFAULT * state.gravityStrength;
    const cols = 14, rows = 9;
    fieldFrameCounter++;
    if (!fieldGrid || fieldFrameCounter % 4 === 0) {
      fieldGrid = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sx = (c + 0.5) / cols * width;
          const sy = (r + 0.5) / rows * height;
          const [wx, wy] = camera4.screenToWorld(sx, sy, width, height);
          const [ax, ay] = accelAt(wx, wy, g);
          fieldGrid.push({ sx, sy, ax, ay });
        }
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = hexAlpha(PALETTE.violet, 0.3);
    ctx.lineWidth = 1.2;
    for (const p of fieldGrid) {
      const mag = Math.hypot(p.ax, p.ay);
      if (mag < 2e-4) continue;
      const len = Math.min(6 + Math.log10(1 + mag * 400) * 10, 34);
      const ang = Math.atan2(p.ay, p.ax);
      const ex = p.sx + Math.cos(ang) * len;
      const ey = p.sy + Math.sin(ang) * len;
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(ex, ey);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(ang - 0.4) * 4, ey - Math.sin(ang - 0.4) * 4);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(ang + 0.4) * 4, ey - Math.sin(ang + 0.4) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawAttractorTrails(camera4, width, height) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (const a of attractors) {
      if (a.fixed || a.showTrail === false || a.trail.length < 4) continue;
      ctx.strokeStyle = hexAlpha(PALETTE.ivory, 0.44);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let k = 0; k < a.trail.length; k += 2) {
        const [sx, sy] = camera4.worldToScreen(a.trail[k], a.trail[k + 1], width, height);
        if (k === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawAttractors(camera4, width, height) {
    ctx.save();
    for (const a of attractors) {
      const [sx, sy] = camera4.worldToScreen(a.x, a.y, width, height);
      const r = a.radius * camera4.zoom;
      if (sx < -r * 4 || sx > width + r * 4 || sy < -r * 4 || sy > height + r * 4) continue;
      drawCelestialBody(a, sx, sy, r);
      if (a.fixed) {
        ctx.strokeStyle = hexAlpha("#ffffff", 0.55);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (a.id === state.selectedAttractorId) {
        ctx.strokeStyle = hexAlpha(PALETTE.white, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 9, 0, Math.PI * 2);
        ctx.stroke();
        drawSelectedBodyLabel(a, sx, sy, r);
      }
    }
    ctx.restore();
  }
  function drawSelectedBodyLabel(body, sx, sy, radius) {
    const label = playerFacingBodyLabel(body.type);
    if (!label) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = PALETTE.ivory;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, sx, sy + radius + 22);
    ctx.restore();
  }
  function drawCelestialBody(body, sx, sy, radius) {
    const type = body.type;
    const color = PALETTE[body.color] || PALETTE.ivory;
    const cachedType = type === "star" || type === "planet" || type === "moon" || type === "heavyCore";
    if (!cachedType || radius < 1) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(radius, 1), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (type === "star") drawStarCorona(sx, sy, radius, body.flash || 0);
    const sprite = getBodySprite(body);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(sprite, sx - radius, sy - radius, radius * 2, radius * 2);
    if (type === "planet") drawPlanetLight(body, sx, sy, radius);
    if (type === "heavyCore") drawHeavyCoreAccretion(body, sx, sy, radius);
    if (body.ringStrength > 0) drawBodyRing(body, sx, sy, radius);
  }
  function getBodySprite(body) {
    const key = bodySpriteCacheKey(body);
    const existing = bodySprites.get(key);
    if (existing) return existing;
    const sprite = document.createElement("canvas");
    sprite.width = 144;
    sprite.height = 144;
    const sc = sprite.getContext("2d");
    const seed = ((Number.isFinite(body.appearanceSeed) ? body.appearanceSeed : 0) >>> 0) % 8;
    const color = PALETTE[body.color] || PALETTE.ivory;
    if (body.type === "star") paintStarSprite(sc, color, seed);
    else if (body.type === "planet") paintPlanetSprite(sc, color, body.gardenStage, seed);
    else if (body.type === "moon") paintMoonSprite(sc, color, seed);
    else paintHeavyCoreSprite(sc, seed);
    return bodySprites.set(key, sprite);
  }
  function seededUnit(seed, index) {
    const value = Math.imul(seed + 1 ^ Math.imul(index + 11, 73244475), 668265261) >>> 0;
    return value / 4294967296;
  }
  function paintStarSprite(sc, color, seed) {
    const core = sc.createRadialGradient(59, 54, 2, 72, 72, 48);
    core.addColorStop(0, PALETTE.ivory);
    core.addColorStop(0.48, PALETTE.amber);
    core.addColorStop(1, color);
    sc.fillStyle = core;
    sc.beginPath();
    sc.arc(72, 72, 46, 0, Math.PI * 2);
    sc.fill();
    sc.globalCompositeOperation = "source-over";
    for (let i = 0; i < 12; i++) {
      const angle = seededUnit(seed, i) * Math.PI * 2;
      const distance = 9 + seededUnit(seed, i + 16) * 29;
      sc.fillStyle = hexAlpha(PALETTE.ivory, 0.08 + seededUnit(seed, i + 28) * 0.13);
      sc.beginPath();
      sc.arc(72 + Math.cos(angle) * distance, 72 + Math.sin(angle) * distance, 1 + seededUnit(seed, i + 41) * 3, 0, Math.PI * 2);
      sc.fill();
    }
  }
  function paintPlanetSprite(sc, color, stage, seed) {
    const surface = sc.createRadialGradient(49, 46, 3, 72, 72, 48);
    surface.addColorStop(0, PALETTE.ivory);
    surface.addColorStop(0.25, color);
    surface.addColorStop(1, PALETTE.blue);
    sc.fillStyle = surface;
    sc.beginPath();
    sc.arc(72, 72, 46, 0, Math.PI * 2);
    sc.fill();
    sc.save();
    sc.beginPath();
    sc.arc(72, 72, 46, 0, Math.PI * 2);
    sc.clip();
    for (let i = 0; i < 7; i++) {
      const x = 39 + seededUnit(seed, i) * 66;
      const y = 44 + seededUnit(seed, i + 17) * 55;
      sc.fillStyle = hexAlpha(stage === "blooming" ? PALETTE.jade : PALETTE.ivory, 0.12 + seededUnit(seed, i + 31) * 0.12);
      sc.beginPath();
      sc.ellipse(x, y, 5 + seededUnit(seed, i + 47) * 12, 2 + seededUnit(seed, i + 61) * 5, seededUnit(seed, i + 79) * Math.PI, 0, Math.PI * 2);
      sc.fill();
    }
    sc.restore();
    if (stage === "temperate" || stage === "blooming") {
      sc.strokeStyle = hexAlpha(PALETTE.jade, stage === "blooming" ? 0.52 : 0.34);
      sc.lineWidth = stage === "blooming" ? 4 : 2;
      sc.beginPath();
      sc.arc(72, 72, 49, 0, Math.PI * 2);
      sc.stroke();
    }
  }
  function paintMoonSprite(sc, color, seed) {
    const surface = sc.createRadialGradient(52, 49, 3, 72, 72, 45);
    surface.addColorStop(0, PALETTE.ivory);
    surface.addColorStop(0.55, color);
    surface.addColorStop(1, PALETTE.blue);
    sc.fillStyle = surface;
    sc.beginPath();
    sc.arc(72, 72, 44, 0, Math.PI * 2);
    sc.fill();
    sc.save();
    sc.beginPath();
    sc.arc(72, 72, 44, 0, Math.PI * 2);
    sc.clip();
    for (let i = 0; i < 5; i++) {
      sc.fillStyle = hexAlpha(PALETTE.blue, 0.18 + seededUnit(seed, i + 11) * 0.12);
      sc.beginPath();
      sc.arc(48 + seededUnit(seed, i) * 43, 48 + seededUnit(seed, i + 22) * 42, 3 + seededUnit(seed, i + 33) * 7, 0, Math.PI * 2);
      sc.fill();
    }
    sc.restore();
  }
  function paintHeavyCoreSprite(sc, seed) {
    const edge = sc.createRadialGradient(72, 72, 7, 72, 72, 48);
    edge.addColorStop(0, "#02080a");
    edge.addColorStop(0.6, "#030a0d");
    edge.addColorStop(1, PALETTE.blue);
    sc.fillStyle = edge;
    sc.beginPath();
    sc.arc(72, 72, 43, 0, Math.PI * 2);
    sc.fill();
    sc.strokeStyle = hexAlpha(PALETTE.ivory, 0.72);
    sc.lineWidth = 2;
    sc.beginPath();
    sc.ellipse(72, 72, 52, 13, 0, 0, Math.PI * 2);
    sc.stroke();
    sc.strokeStyle = hexAlpha(PALETTE.amber, 0.18 + seededUnit(seed, 1) * 0.14);
    sc.lineWidth = 1;
    sc.beginPath();
    sc.arc(72, 72, 38, Math.PI * 1.14, Math.PI * 1.82);
    sc.stroke();
  }
  function drawStarCorona(sx, sy, radius, flash) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [scale, alpha] of [[3.2, 0.13], [1.9, 0.25]]) {
      const corona = ctx.createRadialGradient(sx, sy, radius * 0.25, sx, sy, radius * (scale + flash));
      corona.addColorStop(0, hexAlpha(PALETTE.amber, alpha + flash * 0.12));
      corona.addColorStop(1, hexAlpha(PALETTE.amber, 0));
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * (scale + flash), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawPlanetLight(body, sx, sy, radius) {
    const star = attractors.find((a) => a.type === "star" && a.id === body.dominantStarId) || attractors.find((a) => a.type === "star");
    if (!star) return;
    const angle = Math.atan2(star.y - body.y, star.x - body.x);
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.clip();
    const nx = Math.cos(angle), ny = Math.sin(angle);
    const shade = ctx.createLinearGradient(sx + nx * radius, sy + ny * radius, sx - nx * radius, sy - ny * radius);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(0.48, "rgba(0,0,0,0.08)");
    shade.addColorStop(1, "rgba(0,0,0,0.68)");
    ctx.fillStyle = shade;
    ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    ctx.restore();
  }
  function drawHeavyCoreAccretion(body, sx, sy, radius) {
    if (lowQuality || state.reducedMotion) return;
    const sweep = (stats.simTime * 0.7 + (body.appearanceSeed || 0) % 8) % (Math.PI * 2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = hexAlpha(PALETTE.amber, 0.3);
    ctx.lineWidth = Math.max(1, radius * 0.11);
    ctx.beginPath();
    ctx.ellipse(sx, sy, radius * 1.45, radius * 0.36, -0.18, sweep, sweep + Math.PI * 0.72);
    ctx.stroke();
    ctx.restore();
  }
  function drawBodyRing(body, sx, sy, radius) {
    const strength = Math.min(1, Math.max(0, body.ringStrength || 0));
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = hexAlpha(PALETTE.ivory, Math.min(0.7, 0.18 + strength * 0.52));
    ctx.lineWidth = Math.max(1, radius * 0.1);
    ctx.beginPath();
    ctx.ellipse(sx, sy, radius * (1.3 + strength * 0.45), radius * (0.42 + strength * 0.12), -0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawParticles(camera4, width, height) {
    ctx.save();
    const useLighter = !(lowQuality || count > 3e3);
    ctx.globalCompositeOperation = useLighter ? "lighter" : "source-over";
    const baseSize = 9 * state.particleSize * camera4.zoom;
    const bright = state.particleBrightness;
    const style = state.trailStyle === "off" ? "soft" : state.trailStyle;
    for (let i = 0; i < count; i++) {
      const [sx, sy] = camera4.worldToScreen(px[i], py[i], width, height);
      if (sx < -30 || sx > width + 30 || sy < -30 || sy > height + 30) continue;
      const bucket = bucketFor(i);
      const sprite = sprites[bucket];
      let alpha = Math.min(bright * (0.55 + pseed[i] * 0.5), 1.6);
      let size = baseSize * (0.7 + pseed[i] * 0.5);
      ctx.globalAlpha = Math.min(alpha, 1);
      if (style === "dust") {
        ctx.fillStyle = sprite === sprites.white ? "#ffffff" : sprite === sprites.cyan ? PALETTE.cyan : sprite === sprites.violet ? PALETTE.violet : sprite === sprites.gold ? PALETTE.gold : PALETTE.blue;
        const s = Math.max(1, size * 0.16);
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      } else if (style === "line") {
        const [psx, psy] = camera4.worldToScreen(pPrevX[i], pPrevY[i], width, height);
        ctx.strokeStyle = ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = bucket === "white" ? "#ffffff" : PALETTE[bucket];
        ctx.lineWidth = Math.max(1, size * 0.12);
        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      } else if (style === "comet") {
        const vx = pvx[i], vy = pvy[i];
        const speed = Math.hypot(vx, vy);
        const ang = speed > 1 ? Math.atan2(vy, vx) : 0;
        const stretch = Math.min(1 + speed / 220, 3.2);
        ctx.globalAlpha = Math.min(ctx.globalAlpha * (1 + Math.min(speed / 500, 1) * 0.5), 1);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang);
        ctx.translate(-size * (stretch - 1) * 0.5, 0);
        ctx.drawImage(sprite, -size * stretch / 2, -size / 2, size * stretch, size);
        ctx.restore();
      } else {
        const speedT = Math.min(pspeed[i] / 500, 1);
        ctx.globalAlpha = Math.min(ctx.globalAlpha * (1 + speedT * 0.45), 1);
        if (speedT > 0.05) {
          const ang = Math.atan2(pvy[i], pvx[i]);
          const stretch = 1 + speedT * 1.1;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(ang);
          ctx.translate(-size * (stretch - 1) * 0.5, 0);
          ctx.drawImage(sprite, -size * stretch / 2, -size / 2, size * stretch, size);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);
        }
      }
    }
    ctx.restore();
  }
  function drawFlashes(camera4, width, height, dtReal) {
    if (flashes.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= dtReal * (state.reducedMotion ? 3.5 : 1.8);
      if (f.life <= 0) {
        flashes.splice(i, 1);
        continue;
      }
      const [sx, sy] = camera4.worldToScreen(f.x, f.y, width, height);
      const r = f.maxR * camera4.zoom * (1 - f.life) + 4;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, hexAlpha(f.color, f.life * (state.screenFlash ? 0.9 : 0.4)));
      grad.addColorStop(1, hexAlpha(f.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawPreview(camera4, width, height) {
    const pv = previewState;
    if (!pv.active) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.85;
    if (pv.trajectory?.length > 1) drawTrajectoryGuide(pv, camera4, width, height);
    if (pv.kind === "spawn") {
      const [sx, sy] = camera4.worldToScreen(pv.cx, pv.cy, width, height);
      const r = pv.radius * camera4.zoom;
      ctx.strokeStyle = hexAlpha(PALETTE.cyan, 0.75);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(r, 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (pv.dirX !== void 0) {
        const ex = sx + pv.dirX * camera4.zoom, ey = sy + pv.dirY * camera4.zoom;
        const ang = Math.atan2(pv.dirY, pv.dirX);
        ctx.strokeStyle = hexAlpha(PALETTE.gold, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(ang - 0.45) * 14, ey - Math.sin(ang - 0.45) * 14);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(ang + 0.45) * 14, ey - Math.sin(ang + 0.45) * 14);
        ctx.stroke();
      }
    } else if (pv.kind === "velocity") {
      const [sx, sy] = camera4.worldToScreen(pv.cx, pv.cy, width, height);
      const [ex, ey] = camera4.worldToScreen(pv.ex, pv.ey, width, height);
      ctx.strokeStyle = hexAlpha(PALETTE.gold, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (pv.kind === "impulse") {
      ctx.strokeStyle = hexAlpha(PALETTE.violet, 0.8);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let k = 0; k < pv.points.length; k += 2) {
        const [sx, sy] = camera4.worldToScreen(pv.points[k], pv.points[k + 1], width, height);
        if (k === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    } else if (pv.kind === "erase") {
      const [sx, sy] = camera4.worldToScreen(pv.cx, pv.cy, width, height);
      ctx.strokeStyle = hexAlpha("#ff6b6b", 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, pv.radius * camera4.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawTrajectoryGuide(pv, camera4, width, height) {
    const outcome = pv.orbitHealth || "uncertain";
    const color = outcome === "stable" ? PALETTE.jade : outcome === "danger" ? PALETTE.coral : PALETTE.amber;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (outcome === "uncertain") ctx.setLineDash([6, 5]);
    if (outcome === "danger") {
      for (let i = 1; i < pv.trajectory.length; i++) {
        if (i % 2 === 0) continue;
        const [x1, y1] = camera4.worldToScreen(pv.trajectory[i - 1].x, pv.trajectory[i - 1].y, width, height);
        const [x2, y2] = camera4.worldToScreen(pv.trajectory[i].x, pv.trajectory[i].y, width, height);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      for (let i = 0; i < pv.trajectory.length; i++) {
        const [sx, sy] = camera4.worldToScreen(pv.trajectory[i].x, pv.trajectory[i].y, width, height);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const end = pv.trajectory[pv.trajectory.length - 1];
    const [labelX, labelY] = camera4.worldToScreen(end.x, end.y, width, height);
    ctx.fillStyle = color;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(outcome === "stable" ? "STABLE" : outcome === "danger" ? "\u26A0 DANGER" : "UNCERTAIN", labelX + 8, labelY - 8);
    ctx.restore();
  }

  // js/tools.js?v=cosmic-gardener-8-fix3
  function bucketNear(wx, wy, maxDist = 380) {
    const a = nearestAttractor(wx, wy, maxDist);
    return a ? bucketIndexForColor(a.color) : void 0;
  }
  var previewState2 = {
    active: false,
    kind: null,
    trajectory: [],
    orbitHealth: "unknown",
    closestBodyId: null
  };
  function clearTrajectoryPreview2() {
    previewState2.trajectory = [];
    previewState2.orbitHealth = "unknown";
    previewState2.closestBodyId = null;
  }
  function clearToolPreview2() {
    previewState2.active = false;
    previewState2.kind = null;
    clearTrajectoryPreview2();
  }
  function placementVelocity(start, current) {
    return {
      vx: clamp((current.x - start.x) * 1.4, -CONSTANTS.MAX_ATTRACTOR_SPEED, CONSTANTS.MAX_ATTRACTOR_SPEED),
      vy: clamp((current.y - start.y) * 1.4, -CONSTANTS.MAX_ATTRACTOR_SPEED, CONSTANTS.MAX_ATTRACTOR_SPEED)
    };
  }
  function applyGentleInfluence(bodies, gesture, options = {}) {
    const radius = options.radius ?? CONSTANTS.GENTLE_INFLUENCE_RADIUS;
    const maxDelta = options.maxDelta ?? CONSTANTS.GENTLE_INFLUENCE_MAX_DELTA;
    const gestureLength = Math.hypot(gesture.dx, gesture.dy);
    if (!(radius > 0) || !(maxDelta > 0) || gestureLength < 1e-3) return;
    const ux = gesture.dx / gestureLength;
    const uy = gesture.dy / gestureLength;
    const delta = Math.min(gestureLength, maxDelta);
    for (const body of bodies) {
      if (body.fixed || body.cradled) continue;
      const distance = Math.hypot(body.x - gesture.x, body.y - gesture.y);
      if (distance >= radius) continue;
      const falloff = 1 - distance / radius;
      body.vx += ux * delta * falloff;
      body.vy += uy * delta * falloff;
    }
  }
  function applyBodyPulse(body, delta) {
    if (!body || body.fixed) return;
    const length = Math.hypot(delta.x, delta.y);
    if (length < 1e-3) return;
    const scale = Math.min(length, CONSTANTS.PULSE_MAX_DELTA) / length;
    body.vx += delta.x * scale;
    body.vy += delta.y * scale;
  }
  var CREATIVE_TOOL_VARIANTS2 = Object.freeze([
    { id: "oceanSeed", tool: "planet", label: "Ocean planet", title: "Place an ocean-style planet" },
    { id: "ringSeed", tool: "planet", label: "Ringed planet", title: "Place a ringed planet" },
    { id: "fineInfluence", tool: "influence", label: "Fine influence", title: "Use a gentler, finer influence" }
  ]);
  function getCreativeToolVariants(unlocks = []) {
    const available = new Set(Array.isArray(unlocks) ? unlocks : []);
    return CREATIVE_TOOL_VARIANTS2.filter((variant) => available.has(variant.id));
  }
  function planetSeedOverrides(variant) {
    if (variant === "oceanSeed") return { color: "blue" };
    if (variant === "ringSeed") return { ringStrength: 0.42 };
    return {};
  }
  function createSeedAttractor(type, x, y, fixed = false, variant = null) {
    const overrides = type === "planet" ? planetSeedOverrides(variant) : {};
    return createAttractor(type, x, y, { fixed, ...overrides });
  }
  function influenceOptionsForVariant(variant) {
    return variant === "fineInfluence" ? { maxDelta: 4 } : {};
  }
  var emitters2 = [];
  var nextEmitterId = 1;
  var cam = null;
  var canvasEl = null;
  var activePointers = /* @__PURE__ */ new Map();
  var pinchActive = false;
  var pinchLastDist = null;
  var pointer = {
    down: false,
    mode: null,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
    startScreenX: 0,
    startScreenY: 0,
    lastScreenX: 0,
    lastScreenY: 0,
    target: null,
    spawnKind: null,
    impulsePoints: [],
    lastImpulseX: 0,
    lastImpulseY: 0,
    moveHistory: [],
    cradleTimer: null,
    cradleEligible: false,
    cradlePreviousFixed: null
  };
  function clearCradleWatch() {
    if (pointer.cradleTimer !== null) clearTimeout(pointer.cradleTimer);
    pointer.cradleTimer = null;
    pointer.cradleEligible = false;
  }
  function beginCradleWatch(body) {
    clearCradleWatch();
    pointer.cradleEligible = true;
    pointer.cradleTimer = setTimeout(() => {
      pointer.cradleTimer = null;
      if (!pointer.down || !pointer.cradleEligible || pointer.target !== body) return;
      pointer.mode = "cradleBody";
      pointer.cradlePreviousFixed = body.fixed;
      body.cradled = true;
    }, CONSTANTS.CRADLE_HOLD_MS);
  }
  function finishCradle(applyVelocity) {
    const body = pointer.target;
    if (body?.cradled) {
      if (applyVelocity) Object.assign(body, placementVelocity(
        { x: pointer.startX, y: pointer.startY },
        { x: pointer.curX, y: pointer.curY }
      ));
      body.fixed = pointer.cradlePreviousFixed;
      body.cradled = false;
    }
    pointer.cradlePreviousFixed = null;
  }
  function initTools(canvasElement, cameraRef) {
    canvasEl = canvasElement;
    cam = cameraRef;
    canvasEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    canvasEl.addEventListener("wheel", onWheel, { passive: false });
    canvasEl.addEventListener("contextmenu", (e) => e.preventDefault());
    canvasEl.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("ob:tool-changed", clearToolPreview2);
  }
  function rectAndWorld(e) {
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const [wx, wy] = cam.screenToWorld(sx, sy, rect.width, rect.height);
    return { rect, sx, sy, wx, wy };
  }
  function hitTestAttractor(wx, wy, extraPx = 0) {
    const tolerance = (14 + extraPx) / cam.zoom;
    let best = null, bestD = Infinity;
    for (const a of attractors) {
      const d = Math.hypot(a.x - wx, a.y - wy);
      const r = a.radius + tolerance;
      if (d < r && d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }
  function dispatchSelection(id) {
    state.selectedAttractorId = id;
    window.dispatchEvent(new CustomEvent("ob:selection-changed", { detail: { id } }));
  }
  function onPointerDown(e) {
    if (e.target !== canvasEl) return;
    const { sx, sy, wx, wy } = rectAndWorld(e);
    if (e.pointerType === "touch") {
      activePointers.set(e.pointerId, { x: sx, y: sy });
      if (activePointers.size >= 2) {
        clearCradleWatch();
        finishCradle(false);
        pointer.down = false;
        pointer.mode = null;
        clearToolPreview2();
        pinchActive = true;
        const pts = [...activePointers.values()];
        pinchLastDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        return;
      }
    }
    pointer.down = true;
    pointer.startX = wx;
    pointer.startY = wy;
    pointer.curX = wx;
    pointer.curY = wy;
    pointer.startScreenX = sx;
    pointer.startScreenY = sy;
    pointer.lastScreenX = sx;
    pointer.lastScreenY = sy;
    pointer.moveHistory = [{ x: wx, y: wy, t: performance.now() }];
    clearCradleWatch();
    if (e.button === 2 || e.button === 1) {
      pointer.mode = "pan";
      return;
    }
    const tool = state.currentTool;
    if (tool === "select") {
      const hit = hitTestAttractor(wx, wy);
      if (hit) {
        dispatchSelection(hit.id);
        pointer.target = hit;
        if (e.altKey) pointer.mode = "moveAttractor";
        else pointer.mode = "idle";
        beginCradleWatch(hit);
      } else {
        dispatchSelection(null);
        pointer.mode = "pan";
      }
    } else if (tool === "move") {
      const hit = hitTestAttractor(wx, wy, 30);
      if (hit) {
        pointer.mode = "moveAttractor";
        pointer.target = hit;
        dispatchSelection(hit.id);
        beginCradleWatch(hit);
      } else pointer.mode = "pan";
    } else if (tool === "star" || tool === "planet" || tool === "moon" || tool === "heavyCore" || tool === "anchor") {
      const fixed = tool === "anchor" ? true : state.attractorFixed;
      const a = createSeedAttractor(tool, wx, wy, fixed, state.gardenVariant);
      pointer.mode = fixed ? "idle" : "placeVelocity";
      pointer.target = a;
      dispatchSelection(a.id);
    } else if (tool === "point") {
      const n = Math.round(clamp(state.spawnAmount / 10, 8, 150));
      spawnPattern({
        cx: wx,
        cy: wy,
        count: n,
        mode: "disc",
        radius: 14,
        spread: 0.5,
        spin: 0,
        speed: 12,
        colorBucket: bucketNear(wx, wy)
      });
      pointer.mode = "idle";
    } else if (tool === "cloud" || tool === "ring" || tool === "disc" || tool === "jet" || tool === "stream") {
      pointer.mode = "spawn";
      pointer.spawnKind = tool;
      previewState2.active = true;
      previewState2.kind = "spawn";
      previewState2.cx = wx;
      previewState2.cy = wy;
      previewState2.radius = 4;
    } else if (tool === "erase") {
      pointer.mode = "erase";
      eraseAttractorAt(wx, wy);
      eraseParticlesAt(wx, wy);
      previewState2.active = true;
      previewState2.kind = "erase";
      previewState2.cx = wx;
      previewState2.cy = wy;
      previewState2.radius = eraseRadius();
    } else if (tool === "impulse") {
      pointer.mode = "impulse";
      pointer.impulsePoints = [wx, wy];
      pointer.lastImpulseX = wx;
      pointer.lastImpulseY = wy;
      previewState2.active = true;
      previewState2.kind = "impulse";
      previewState2.points = [wx, wy];
    } else if (tool === "influence") {
      pointer.mode = "influence";
      previewState2.active = true;
      previewState2.kind = "influence";
      previewState2.cx = wx;
      previewState2.cy = wy;
      previewState2.radius = CONSTANTS.GENTLE_INFLUENCE_RADIUS;
    } else if (tool === "pulse") {
      const selected = attractors.find((a) => a.id === state.selectedAttractorId);
      const target = selected || nearestAttractor(wx, wy, 48 / cam.zoom);
      pointer.target = target;
      pointer.mode = target ? "pulse" : "idle";
      if (target) {
        previewState2.active = true;
        previewState2.kind = "velocity";
        previewState2.cx = target.x;
        previewState2.cy = target.y;
        previewState2.ex = target.x;
        previewState2.ey = target.y;
      }
    }
  }
  function onPointerMove(e) {
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: sx, y: sy });
    if (pinchActive) {
      if (activePointers.size >= 2) {
        const pts = [...activePointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const midX = (pts[0].x + pts[1].x) / 2, midY = (pts[0].y + pts[1].y) / 2;
        if (pinchLastDist && dist > 0) {
          const factor = clamp(dist / pinchLastDist, 0.85, 1.18);
          cam.zoomAt(midX, midY, factor, rect.width, rect.height);
        }
        pinchLastDist = dist;
      }
      return;
    }
    if (!pointer.down) return;
    const [wx, wy] = cam.screenToWorld(sx, sy, rect.width, rect.height);
    const previousX = pointer.curX, previousY = pointer.curY;
    pointer.curX = wx;
    pointer.curY = wy;
    pointer.moveHistory.push({ x: wx, y: wy, t: performance.now() });
    if (pointer.moveHistory.length > 6) pointer.moveHistory.shift();
    if (pointer.cradleEligible && Math.hypot(sx - pointer.startScreenX, sy - pointer.startScreenY) > CONSTANTS.CRADLE_DRIFT_PIXELS) {
      clearCradleWatch();
    }
    switch (pointer.mode) {
      case "pan":
        cam.pan(sx - pointer.lastScreenX, sy - pointer.lastScreenY);
        break;
      case "moveAttractor":
        if (pointer.target) {
          pointer.target.x = wx;
          pointer.target.y = wy;
        }
        break;
      case "cradleBody":
        if (pointer.target) {
          pointer.target.x = wx;
          pointer.target.y = wy;
        }
        break;
      case "placeVelocity":
        previewState2.active = true;
        previewState2.kind = "velocity";
        previewState2.cx = pointer.target.x;
        previewState2.cy = pointer.target.y;
        previewState2.ex = wx;
        previewState2.ey = wy;
        if (pointer.target) {
          const { vx, vy } = placementVelocity(
            { x: pointer.startX, y: pointer.startY },
            { x: wx, y: wy }
          );
          const trajectory = predictTrajectory({
            body: { ...pointer.target, vx, vy },
            bodies: attractors,
            gravity: 2600 * state.gravityStrength
          });
          previewState2.trajectory = trajectory.points;
          previewState2.orbitHealth = trajectory.outcome;
          previewState2.closestBodyId = trajectory.closestBodyId;
        }
        break;
      case "spawn": {
        const dx = wx - pointer.startX, dy = wy - pointer.startY;
        const r = Math.hypot(dx, dy);
        previewState2.radius = Math.max(r, 8);
        if (pointer.spawnKind === "jet" || pointer.spawnKind === "stream") {
          previewState2.dirX = dx;
          previewState2.dirY = dy;
        } else {
          previewState2.dirX = void 0;
        }
        break;
      }
      case "erase":
        eraseParticlesAt(wx, wy);
        previewState2.cx = wx;
        previewState2.cy = wy;
        break;
      case "impulse": {
        applyImpulseAt(pointer.lastImpulseX, pointer.lastImpulseY, wx, wy);
        pointer.impulsePoints.push(wx, wy);
        if (pointer.impulsePoints.length > 40) pointer.impulsePoints.splice(0, pointer.impulsePoints.length - 40);
        previewState2.points = pointer.impulsePoints;
        pointer.lastImpulseX = wx;
        pointer.lastImpulseY = wy;
        break;
      }
      case "influence":
        applyGentleInfluence(attractors, {
          x: wx,
          y: wy,
          dx: wx - previousX,
          dy: wy - previousY
        }, influenceOptionsForVariant(state.gardenVariant));
        previewState2.cx = wx;
        previewState2.cy = wy;
        break;
      case "pulse":
        if (pointer.target) {
          previewState2.ex = pointer.target.x + wx - pointer.startX;
          previewState2.ey = pointer.target.y + wy - pointer.startY;
        }
        break;
    }
    pointer.lastScreenX = sx;
    pointer.lastScreenY = sy;
  }
  function onPointerUp(e) {
    if (e && activePointers.has(e.pointerId)) activePointers.delete(e.pointerId);
    if (pinchActive) {
      if (activePointers.size < 2) {
        pinchActive = false;
        pinchLastDist = null;
      }
      return;
    }
    const isCancel = e?.type === "pointercancel";
    switch (pointer.mode) {
      case "placeVelocity": {
        const a = pointer.target;
        if (a && !a.fixed) {
          Object.assign(a, placementVelocity(
            { x: pointer.startX, y: pointer.startY },
            { x: pointer.curX, y: pointer.curY }
          ));
        }
        break;
      }
      case "cradleBody":
        finishCradle(!isCancel);
        break;
      case "pulse":
        if (pointer.target && !isCancel) {
          applyBodyPulse(pointer.target, {
            x: pointer.curX - pointer.startX,
            y: pointer.curY - pointer.startY
          });
        }
        break;
      case "moveAttractor": {
        const a = pointer.target;
        if (a && !a.fixed && pointer.moveHistory.length >= 2) {
          const h2 = pointer.moveHistory;
          const first = h2[0], last = h2[h2.length - 1];
          const dt = Math.max((last.t - first.t) / 1e3, 1e-3);
          if (last.t - first.t < 400) {
            a.vx = clamp((last.x - first.x) / dt * 0.4, -900, 900);
            a.vy = clamp((last.y - first.y) / dt * 0.4, -900, 900);
          }
        }
        break;
      }
      case "spawn":
        doSpawn();
        break;
    }
    pointer.down = false;
    clearCradleWatch();
    if (pointer.target?.cradled) finishCradle(false);
    pointer.mode = null;
    pointer.target = null;
    clearToolPreview2();
  }
  function onWheel(e) {
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const factor = Math.pow(1.0018, -e.deltaY);
    cam.zoomAt(sx, sy, factor, rect.width, rect.height);
  }
  function onDoubleClick(e) {
    const { wx, wy } = rectAndWorld(e);
    spawnPattern({
      cx: wx,
      cy: wy,
      count: Math.min(state.spawnAmount, 500),
      mode: "disc",
      radius: 55,
      spread: 0.4,
      spin: 0,
      speed: 140,
      colorBucket: bucketNear(wx, wy)
    });
  }
  function eraseRadius() {
    return 34 / cam.zoom;
  }
  function eraseAttractorAt(wx, wy) {
    const hit = hitTestAttractor(wx, wy, 8);
    if (hit) {
      removeAttractor(hit.id);
      if (state.selectedAttractorId === hit.id) dispatchSelection(null);
    }
  }
  function eraseParticlesAt(wx, wy) {
    clearNear(wx, wy, eraseRadius());
    for (let i = emitters2.length - 1; i >= 0; i--) {
      const em = emitters2[i];
      if (Math.hypot(em.x - wx, em.y - wy) < eraseRadius() + 20) emitters2.splice(i, 1);
    }
  }
  function applyImpulseAt(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dlen = Math.hypot(dx, dy);
    if (dlen < 1e-3) return;
    const ux = dx / dlen, uy = dy / dlen;
    const radius = 85;
    const r2 = radius * radius;
    const strength = clamp(dlen * 5, 0, 260);
    for (let i = 0; i < count; i++) {
      const ddx = px[i] - x2, ddy = py[i] - y2;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 <= r2) {
        const falloff = 1 - Math.sqrt(d2) / radius;
        pvx[i] += ux * strength * falloff;
        pvy[i] += uy * strength * falloff;
      }
    }
  }
  function doSpawn() {
    const dx = pointer.curX - pointer.startX, dy = pointer.curY - pointer.startY;
    const dragLen = Math.hypot(dx, dy);
    const kind = pointer.spawnKind;
    const isDirectional = kind === "jet" || kind === "stream";
    const mode = kind === "cloud" ? state.spawnMode : kind === "stream" ? "jet" : kind;
    const opts = {
      cx: pointer.startX,
      cy: pointer.startY,
      count: state.spawnAmount,
      mode,
      radius: kind === "jet" ? Math.max(state.spawnRadius * 0.35, 20) : kind === "stream" ? Math.max(state.spawnRadius * 0.6, 34) : Math.max(dragLen, state.spawnRadius * 0.4, 24),
      spread: state.spawnSpread,
      spin: state.spawnSpin,
      speed: isDirectional ? clamp(dragLen * (kind === "jet" ? 2.2 : 1.5), 60, 900) : state.spawnSpeed,
      angle: isDirectional ? Math.atan2(dy, dx) : 0,
      coneSpread: kind === "stream" ? 0.7 : 0.4,
      colorBucket: bucketNear(pointer.startX, pointer.startY)
    };
    if (state.continuousStream) {
      emitters2.push({
        id: nextEmitterId++,
        x: opts.cx,
        y: opts.cy,
        mode: opts.mode,
        radius: opts.radius,
        spread: opts.spread,
        spin: opts.spin,
        speed: opts.speed,
        angle: opts.angle,
        coneSpread: opts.coneSpread,
        colorBucket: opts.colorBucket,
        rate: Math.max(state.spawnAmount / 3, 12),
        acc: 0
      });
    } else {
      spawnPattern(opts);
    }
  }
  function focusOnSelected(camera4) {
    const a = attractors.find((a2) => a2.id === state.selectedAttractorId);
    if (a) camera4.focusOn(a.x, a.y, Math.max(camera4.zoom, 1.4));
  }

  // js/challenges.js
  var CHALLENGES = {
    stableRing: {
      label: "Stable Ring",
      description: "Keep at least 55% of particles bound in orbit for 60 seconds.",
      duration: 60
    },
    slingshot: {
      label: "Slingshot",
      description: "Guide a particle stream around the massive attractor and through the gold target zone.",
      duration: 0
    },
    binaryBalance: {
      label: "Binary Balance",
      description: "Keep two attractors orbiting without merging for 45 seconds.",
      duration: 45
    },
    discMaker: {
      label: "Disc Maker",
      description: "Reach 70% bound particles in a rotating disc.",
      duration: 0
    }
  };
  var INTENTIONS = Object.freeze({
    stableOrbit: { label: "Settle a wandering world", reward: 40 },
    moonGarden: { label: "Give a world a moon", reward: 55 },
    temperateGlow: { label: "Nurture a temperate world", reward: 70 },
    harmony: { label: "Keep a peaceful garden", reward: 85 },
    transformation: { label: "Make change into beauty", reward: 50 }
  });
  var INTENTION_TARGETS = Object.freeze({
    stableOrbit: (summary) => summary.stablePlanets,
    moonGarden: (summary) => summary.stableMoons,
    temperateGlow: (summary) => summary.temperatePlanets,
    harmony: (summary) => summary.harmoniousSeconds / 20,
    transformation: (summary) => summary.transformations
  });
  var UNLOCK_THRESHOLDS = Object.freeze([
    { stardust: 80, unlock: "oceanSeed" },
    { stardust: 160, unlock: "ringSeed" },
    { stardust: 260, unlock: "fineInfluence" }
  ]);
  var REQUIRED_SEED_UNLOCKS = Object.freeze(["star", "planet", "moon"]);
  function finiteNonNegative(value, fallback = 0) {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }
  function normalizeIntentionProgress(progress = {}) {
    const rewarded = progress.rewardedIntentions && typeof progress.rewardedIntentions === "object" ? progress.rewardedIntentions : {};
    return {
      stardust: finiteNonNegative(progress.stardust),
      unlocks: [.../* @__PURE__ */ new Set([
        ...REQUIRED_SEED_UNLOCKS,
        ...Array.isArray(progress.unlocks) ? progress.unlocks.filter((key) => typeof key === "string") : []
      ])],
      discoveries: Array.isArray(progress.discoveries) ? [...new Set(progress.discoveries.filter((key) => typeof key === "string"))] : [],
      rewardedIntentions: Object.fromEntries(
        Object.entries(rewarded).filter(([key]) => Object.hasOwn(INTENTIONS, key)).map(([key, value]) => [key, value === true ? 1 : Math.floor(finiteNonNegative(value))]).filter(([, value]) => value > 0)
      )
    };
  }
  function intentionProgress(id, summary) {
    const target = INTENTION_TARGETS[id];
    const value = target ? target(summary || {}) : 0;
    return Math.min(1, Math.max(0, finiteNonNegative(value)));
  }
  function createIntentionController(initialProgress = {}) {
    const progress = normalizeIntentionProgress(initialProgress);
    const state2 = Object.fromEntries(Object.keys(INTENTIONS).map((id) => [id, {
      progress: 0,
      status: "open",
      // A persisted completion stays disarmed after a reload until the player
      // has moved the underlying condition back below the rearm threshold.
      armed: !progress.rewardedIntentions[id]
    }]));
    function update(summary, _dt) {
      for (const id of Object.keys(INTENTIONS)) {
        const record = state2[id];
        record.progress = intentionProgress(id, summary);
        if (record.progress < 0.25) record.armed = true;
        record.status = record.progress >= 1 ? "complete" : "open";
      }
      return state2;
    }
    function claim(id) {
      const record = state2[id];
      const definition = INTENTIONS[id];
      if (!record || !definition || record.status !== "complete" || !record.armed) return { reward: 0 };
      const reward = definition.reward;
      progress.stardust += reward;
      record.armed = false;
      progress.rewardedIntentions[id] = (progress.rewardedIntentions[id] || 0) + 1;
      return { reward };
    }
    return { state: state2, progress, update, claim };
  }
  var intentionController = createIntentionController(loadGardenProgress());
  var intentionState = intentionController.state;
  function unlockGardenProgress() {
    const newlyUnlocked = [];
    for (const { stardust, unlock } of UNLOCK_THRESHOLDS) {
      if (intentionController.progress.stardust >= stardust && !intentionController.progress.unlocks.includes(unlock)) {
        intentionController.progress.unlocks.push(unlock);
        newlyUnlocked.push(unlock);
      }
    }
    return newlyUnlocked;
  }
  function evaluateIntentions(summary, dt) {
    return intentionController.update(summary, dt);
  }
  function persistRewardProgress(reward) {
    const newlyUnlocked = unlockGardenProgress();
    saveGardenProgress(intentionController.progress);
    return { reward, newlyUnlocked };
  }
  function awardGardenStardust(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return { reward: 0, newlyUnlocked: [] };
    intentionController.progress.stardust += amount;
    return persistRewardProgress(amount);
  }
  function getGardenProgress() {
    const progress = intentionController.progress;
    return {
      ...progress,
      unlocks: [...progress.unlocks],
      discoveries: [...progress.discoveries],
      rewardedIntentions: { ...progress.rewardedIntentions }
    };
  }
  function recordDiscovery(key) {
    if (typeof key !== "string" || !key || intentionController.progress.discoveries.includes(key)) return false;
    intentionController.progress.discoveries.push(key);
    saveGardenProgress(intentionController.progress);
    return true;
  }
  var challengeState = {
    active: null,
    startTime: 0,
    elapsed: 0,
    progress: 0,
    status: "idle",
    targetZone: null,
    initialDynamicCount: 0
  };
  function startChallenge(id) {
    if (!CHALLENGES[id]) return;
    challengeState.active = id;
    challengeState.startTime = stats.simTime;
    challengeState.elapsed = 0;
    challengeState.progress = 0;
    challengeState.status = "running";
    challengeState.targetZone = id === "slingshot" ? { x: 520, y: 90, r: 75 } : null;
    challengeState.initialDynamicCount = attractors.filter((a) => !a.fixed).length;
    state.classificationOverlay = true;
  }
  function stopChallenge() {
    challengeState.active = null;
    challengeState.status = "idle";
  }
  function updateChallenge() {
    if (!challengeState.active) return;
    const id = challengeState.active;
    const def = CHALLENGES[id];
    challengeState.elapsed = Math.max(0, stats.simTime - challengeState.startTime);
    if (id === "stableRing") {
      let bound = 0;
      for (let i = 0; i < count; i++) if (pclass[i] === 0) bound++;
      const frac = count > 0 ? bound / count : 0;
      challengeState.progress = Math.min(challengeState.elapsed / def.duration, 1);
      if (frac < 0.55 && challengeState.elapsed > 4) challengeState.status = "failed";
      else if (challengeState.elapsed >= def.duration) challengeState.status = "success";
    } else if (id === "binaryBalance") {
      challengeState.progress = Math.min(challengeState.elapsed / def.duration, 1);
      const dynCount = attractors.filter((a) => !a.fixed).length;
      if (dynCount < Math.max(challengeState.initialDynamicCount - 1, 1)) challengeState.status = "failed";
      else if (challengeState.elapsed >= def.duration) challengeState.status = "success";
    } else if (id === "slingshot") {
      const zone = challengeState.targetZone;
      let hit = false;
      for (let i = 0; i < count; i++) {
        const dx = px[i] - zone.x, dy = py[i] - zone.y;
        if (dx * dx + dy * dy < zone.r * zone.r) {
          hit = true;
          break;
        }
      }
      if (hit) {
        challengeState.progress = 1;
        challengeState.status = "success";
      }
    } else if (id === "discMaker") {
      let bound = 0;
      for (let i = 0; i < count; i++) if (pclass[i] === 0) bound++;
      const frac = count > 0 ? bound / count : 0;
      challengeState.progress = Math.min(frac / 0.7, 1);
      if (frac >= 0.7) challengeState.status = "success";
    }
  }

  // js/simulation.js
  var camera = null;
  var canvas2 = null;
  var rafId = null;
  var lastT = null;
  var gardenUpdateAccumulator = 0;
  var harmoniousSeconds = 0;
  var ejectionCheckAccumulator = 0;
  var transformationCount = 0;
  var GARDEN_UPDATE_INTERVAL = 0.25;
  var EJECTION_CHECK_INTERVAL = 0.5;
  var MAX_WORLD_DISTANCE2 = 6e3;
  var TRANSFORMATION_COLORS = Object.freeze({
    ring: "#ffd27a",
    debris: "#ff8f78",
    nebula: "#ff8f78",
    stardust: "#ffd27a",
    "wandering-seed": "#ffd27a"
  });
  function initSimulation(cameraRef, canvasRef) {
    camera = cameraRef;
    canvas2 = canvasRef;
  }
  function queueTransformation(event) {
    if (!event) return;
    enqueueTransformationEvent({ event, result: resolveTransformation(event) });
  }
  function onAttractorMerge(survivor, x, y, event) {
    triggerFlash(x, y, PALETTE[survivor.color] || PALETTE.gold, survivor.radius * 3.2);
    queueTransformation(event);
  }
  function onAttractorBounce(a, b, x, y) {
    triggerFlash(x, y, PALETTE[a.color] || PALETTE.white, Math.max(a.radius, b.radius) * 2.2);
  }
  function onAttractorDestroy(survivor, x, y, doomedColor, event) {
    triggerFlash(x, y, PALETTE[doomedColor] || PALETTE.violet, survivor.radius * 2.8);
    queueTransformation(event);
  }
  function onSlingshotEvent(x, y) {
    triggerFlash(x, y, PALETTE.cyan, 60);
  }
  function physicsStep(dt) {
    const g = CONSTANTS.G_DEFAULT * state.gravityStrength;
    stepAttractors(dt, g);
    handleAttractorCollisions({
      onMerge: onAttractorMerge,
      onBounce: onAttractorBounce,
      onDestroy: onAttractorDestroy
    });
    queueEjectedBodies(dt);
    processTransformationEvents();
    stepParticles(dt, g, onSlingshotEvent);
    tickEmitters(dt);
    stats.simTime += dt;
    updateChallenge();
    updateGardenState(dt, g);
  }
  function queueEjectedBodies(dt) {
    ejectionCheckAccumulator += dt;
    while (ejectionCheckAccumulator + Number.EPSILON >= EJECTION_CHECK_INTERVAL) {
      ejectionCheckAccumulator -= EJECTION_CHECK_INTERVAL;
      for (let i = attractors.length - 1; i >= 0; i--) {
        const body = attractors[i];
        if (body.fixed || body.cradled || body.lastTransform === "ejected") continue;
        if (Math.hypot(body.x, body.y) <= MAX_WORLD_DISTANCE2) continue;
        body.lastTransform = "ejected";
        queueTransformation({
          kind: "ejection",
          body,
          x: body.x,
          y: body.y,
          distance: Math.hypot(body.x, body.y),
          worldDistance: MAX_WORLD_DISTANCE2
        });
        removeAttractor(body.id);
      }
    }
  }
  function processTransformationEvents() {
    const events = drainTransformationEvents();
    if (events.length === 0) return;
    for (const { event, result } of events) {
      transformationCount++;
      if (result.ringDelta > 0 && event.survivor) {
        event.survivor.ringStrength = Math.min(1, Math.max(0, event.survivor.ringStrength || 0) + result.ringDelta);
      }
      if (result.discovery) recordDiscovery(result.discovery);
      awardGardenStardust(result.reward);
      const body = event.survivor || event.body;
      const radius = Math.max(20, body?.radius || 20);
      const x = event.x ?? body?.x ?? 0;
      const y = event.y ?? body?.y ?? 0;
      triggerFlash(x, y, TRANSFORMATION_COLORS[result.residue] || TRANSFORMATION_COLORS.debris, Math.min(100, radius * 2.1));
      if (result.residue === "debris" || result.residue === "nebula") {
        spawnPattern({
          cx: x,
          cy: y,
          count: result.residue === "debris" ? 28 : 42,
          mode: "disc",
          radius: radius * (result.residue === "debris" ? 2.4 : 3),
          spread: 0.65,
          spin: 0,
          speed: result.residue === "debris" ? 90 : 140,
          lifespan: result.residue === "debris" ? 4 : 6,
          colorBucket: bucketIndexForColor(result.residue === "debris" ? "gold" : "violet")
        });
      }
    }
  }
  function updateGardenState(dt, gravity) {
    gardenUpdateAccumulator += dt;
    while (gardenUpdateAccumulator >= GARDEN_UPDATE_INTERVAL) {
      gardenUpdateAccumulator -= GARDEN_UPDATE_INTERVAL;
      for (const body of attractors) {
        if (body.type !== "planet" && body.type !== "moon") continue;
        advanceGardenBody(body, deriveGardenMetrics(body, attractors, gravity), GARDEN_UPDATE_INTERVAL);
        if (body.type === "planet" && body.gardenStage === "stable") recordDiscovery("stable-world");
        if (body.type === "planet" && body.gardenStage === "temperate") recordDiscovery("temperate-world");
        if (body.type === "planet" && body.gardenStage === "blooming") recordDiscovery("blooming-world");
        if (body.type === "moon" && body.orbitHealth === "stable") recordDiscovery("stable-moon");
      }
      const beforeHarmony = summarizeGarden(attractors, transformationCount, harmoniousSeconds);
      harmoniousSeconds = beforeHarmony.stablePlanets + beforeHarmony.stableMoons >= 2 ? harmoniousSeconds + GARDEN_UPDATE_INTERVAL : 0;
      evaluateIntentions(summarizeGarden(attractors, transformationCount, harmoniousSeconds), GARDEN_UPDATE_INTERVAL);
    }
  }
  function stepForward() {
    const dt = CONSTANTS.BASE_DT * Math.max(state.speedMultiplier, 1);
    physicsStep(dt);
  }
  function startLoop() {
    lastT = performance.now();
    const frame = (t) => {
      rafId = requestAnimationFrame(frame);
      const dtReal = Math.min((t - lastT) / 1e3, 0.05);
      lastT = t;
      camera.update(dtReal);
      if (state.running) {
        const sm = state.speedMultiplier;
        const steps = sm <= 1 ? 1 : Math.round(sm);
        const dtPerStep = CONSTANTS.BASE_DT * (sm / steps);
        for (let i = 0; i < steps; i++) physicsStep(dtPerStep);
      }
      if (state.followBody && state.selectedAttractorId != null && !camera._animT) {
        const a = attractors.find((a2) => a2.id === state.selectedAttractorId);
        if (a) {
          const followLerp = 1 - Math.pow(25e-4, dtReal);
          camera.x += (a.x - camera.x) * followLerp;
          camera.y += (a.y - camera.y) * followLerp;
        }
      }
      camera._vw = canvas2.clientWidth;
      camera._vh = canvas2.clientHeight;
      render(camera, canvas2.clientWidth, canvas2.clientHeight, dtReal);
    };
    rafId = requestAnimationFrame(frame);
  }
  function resetSimulation() {
    clearAttractors();
    resetParticles();
    clearEmitters();
    clearTrails();
    stats.absorbedCount = 0;
    stats.simTime = 0;
    gardenUpdateAccumulator = 0;
    harmoniousSeconds = 0;
    ejectionCheckAccumulator = 0;
    transformationCount = 0;
    state.selectedAttractorId = null;
    state.running = true;
    camera.reset(true);
  }
  function clearParticlesOnly() {
    resetParticles();
    clearEmitters();
    stats.absorbedCount = 0;
  }
  function clearAttractorsOnly() {
    clearAttractors();
    state.selectedAttractorId = null;
  }
  function clearAllBodies() {
    clearParticlesOnly();
    clearAttractorsOnly();
  }
  function liveParticleStats() {
    let sum = 0, max = 0;
    for (let i = 0; i < count; i++) {
      const s = pspeed[i];
      sum += s;
      if (s > max) max = s;
    }
    return {
      avg: count > 0 ? sum / count : 0,
      max,
      count,
      attractorCount: attractors.length
    };
  }

  // js/presets.js
  var G = CONSTANTS.G_DEFAULT;
  function beginPreset() {
    clearAttractors();
    resetParticles();
    clearEmitters();
    clearTrails();
    state.gravityStrength = 1;
    state.collisionMode = "merge";
    state.selectedAttractorId = null;
    stats.absorbedCount = 0;
    stats.simTime = 0;
  }
  function spawnKeplerianAnnulus(cx, cy, count2, innerR, outerR, centralMass, opts = {}) {
    const { spread = 0.15, dir = 1, speedScale = 1, colorBucket = 255 } = opts;
    for (let i = 0; i < count2; i++) {
      const r = innerR + Math.random() * (outerR - innerR);
      const theta = Math.random() * Math.PI * 2;
      const x = cx + Math.cos(theta) * r, y = cy + Math.sin(theta) * r;
      const vCirc = Math.sqrt(G * centralMass / r) * speedScale;
      const dx = x - cx, dy = y - cy;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / dist, ny = dy / dist;
      const tx = -ny * dir, ty = nx * dir;
      const jitter = 1 + (Math.random() - 0.5) * spread;
      let vx = tx * vCirc * jitter, vy = ty * vCirc * jitter;
      vx += nx * (Math.random() - 0.5) * vCirc * 0.05;
      vy += ny * (Math.random() - 0.5) * vCirc * 0.05;
      spawnParticle(x, y, vx, vy, -1, colorBucket);
    }
  }
  var BUCKET_IDX = { white: 0, cyan: 1, violet: 2, gold: 3, blue: 4 };
  function twoBodyVelocity(mass1, mass2, separation) {
    const mTotal = mass1 + mass2;
    const w2 = Math.sqrt(G * mTotal / Math.pow(separation, 3));
    return {
      r1: separation * mass2 / mTotal,
      r2: separation * mass1 / mTotal,
      v1: w2 * (separation * mass2) / mTotal,
      v2: w2 * (separation * mass1) / mTotal
    };
  }
  var PRESETS = {
    emptySpace: {
      label: "Empty Space",
      build(camera4) {
        beginPreset();
        camera4.reset();
      }
    },
    accretionDisc: {
      label: "Accretion Disc",
      build(camera4) {
        beginPreset();
        const core = createAttractor("heavyCore", 0, 0, { mass: 42e3, fixed: true, name: "Core" });
        spawnKeplerianAnnulus(0, 0, 2400, 95, 480, 42e3, { spread: 0.2, speedScale: 0.99, colorBucket: BUCKET_IDX[core.color] });
        camera4.fitBounds(-540, -540, 540, 540, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    binaryStars: {
      label: "Binary Stars",
      build(camera4) {
        beginPreset();
        const m1 = 12e3, m2 = 12e3, D = 220;
        const v = twoBodyVelocity(m1, m2, D);
        const s1 = createAttractor("star", -D / 2, 0, { mass: m1, name: "Star A" });
        const s2 = createAttractor("star", D / 2, 0, { mass: m2, name: "Star B" });
        s1.vy = v.v1;
        s2.vy = -v.v2;
        spawnPattern({ cx: 0, cy: 0, count: 1900, mode: "disc", radius: 460, spread: 0.4, spin: 26, speed: 0 });
        camera4.fitBounds(-560, -560, 560, 560, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    threeBodyChaos: {
      label: "Three-Body Chaos",
      build(camera4) {
        beginPreset();
        const masses = [6200, 7100, 8300];
        const radius = 170;
        const angles = [Math.PI / 2, Math.PI / 2 + Math.PI * 2 / 3, Math.PI / 2 + Math.PI * 4 / 3];
        const bodies = [];
        for (let i = 0; i < 3; i++) {
          const x = Math.cos(angles[i]) * radius, y = Math.sin(angles[i]) * radius;
          const a = createAttractor(i === 2 ? "heavyCore" : "star", x, y, { mass: masses[i], name: `Body ${i + 1}` });
          bodies.push(a);
        }
        const mTotal = masses.reduce((s, v) => s + v, 0);
        const w2 = Math.sqrt(G * mTotal / Math.pow(radius, 3)) * 0.62;
        for (const a of bodies) {
          const dist = Math.hypot(a.x, a.y);
          const nx = a.x / dist, ny = a.y / dist;
          a.vx = -ny * dist * w2 + (Math.random() - 0.5) * 18;
          a.vy = nx * dist * w2 + (Math.random() - 0.5) * 18;
        }
        spawnPattern({ cx: 0, cy: 0, count: 1100, mode: "disc", radius: 520, spread: 0.5, spin: 6, speed: 0 });
        camera4.fitBounds(-620, -620, 620, 620, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    ringFormation: {
      label: "Ring Formation",
      build(camera4) {
        beginPreset();
        createAttractor("star", 0, 0, { mass: 16e3, fixed: true, name: "Central Star" });
        spawnKeplerianAnnulus(0, 0, 2e3, 65, 380, 16e3, { spread: 0.06, speedScale: 1 });
        camera4.fitBounds(-440, -440, 440, 440, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    gravitySlingshot: {
      label: "Gravity Slingshot",
      build(camera4) {
        beginPreset();
        const body = createAttractor("heavyCore", 90, -30, { mass: 22e3, fixed: true, name: "Slingshot Mass" });
        const origin = { x: -680, y: -260 };
        const toBody = { x: body.x - origin.x, y: body.y - origin.y };
        const distToBody = Math.hypot(toBody.x, toBody.y);
        const baseAngle = Math.atan2(toBody.y, toBody.x);
        const missDistance = body.radius * 6;
        const offsetAngle = Math.asin(clamp(missDistance / distToBody, -0.9, 0.9));
        const angle = baseAngle - offsetAngle;
        spawnPattern({
          cx: origin.x,
          cy: origin.y,
          count: 500,
          mode: "jet",
          radius: 20,
          spread: 0.05,
          speed: 380,
          angle,
          coneSpread: 0.015
        });
        state.continuousStream = false;
        camera4.fitBounds(-720, -420, 620, 420, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    galaxySeed: {
      label: "Galaxy Seed",
      build(camera4) {
        beginPreset();
        const core = createAttractor("heavyCore", 0, 0, { mass: 52e3, fixed: true, name: "Galactic Core" });
        spawnKeplerianAnnulus(0, 0, 2800, 45, 620, 52e3, { spread: 0.24, speedScale: 0.93, colorBucket: BUCKET_IDX[core.color] });
        camera4.fitBounds(-680, -680, 680, 680, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    twinVortex: {
      label: "Twin Vortex",
      build(camera4) {
        beginPreset();
        const m = 9500, D = 380;
        const v = twoBodyVelocity(m, m, D);
        const a1 = createAttractor("planet", -D / 2, 0, { mass: m, name: "Vortex A" });
        const a2 = createAttractor("planet", D / 2, 0, { mass: m, name: "Vortex B" });
        a1.vy = v.v1;
        a2.vy = -v.v2;
        spawnKeplerianAnnulus(-D / 2, 0, 950, 25, 150, m, { spread: 0.15, dir: 1, speedScale: 1 });
        spawnKeplerianAnnulus(D / 2, 0, 950, 25, 150, m, { spread: 0.15, dir: -1, speedScale: 1 });
        camera4.fitBounds(-560, -400, 560, 400, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    brokenOrbit: {
      label: "Broken Orbit",
      build(camera4) {
        beginPreset();
        createAttractor("star", 0, 0, { mass: 14e3, fixed: true, name: "Central Star" });
        spawnKeplerianAnnulus(0, 0, 1300, 60, 260, 14e3, { spread: 0.05, speedScale: 1 });
        const intruderDefs = [
          { startAngle: 200, impact: 290, speed: 205, side: 1 },
          { startAngle: 35, impact: 310, speed: 195, side: -1 },
          { startAngle: 300, impact: 270, speed: 220, side: 1 }
        ];
        intruderDefs.forEach((d, i) => {
          const startDist = 620;
          const rad = d.startAngle * Math.PI / 180;
          const sx = Math.cos(rad) * startDist, sy = Math.sin(rad) * startDist;
          const towardAngle = Math.atan2(-sy, -sx);
          const offsetAngle = Math.asin(clamp(d.impact / startDist, -0.9, 0.9)) * d.side;
          const angle = towardAngle + offsetAngle;
          const a = createAttractor("planet", sx, sy, { mass: 4200, name: `Intruder ${i + 1}` });
          a.vx = Math.cos(angle) * d.speed;
          a.vy = Math.sin(angle) * d.speed;
        });
        camera4.fitBounds(-660, -660, 660, 660, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    collapsingCluster: {
      label: "Collapsing Cluster",
      build(camera4) {
        beginPreset();
        const centers = [
          { x: -260, y: -140, mass: 8e3, color: "gold" },
          { x: 240, y: -80, mass: 6500, color: "cyan" },
          { x: -40, y: 260, mass: 7200, color: "violet" }
        ];
        const bodies = centers.map((c, i) => createAttractor("star", c.x, c.y, { mass: c.mass, name: `Mass ${i + 1}` }));
        bodies.forEach((a, i) => {
          for (let k = 0; k < 700; k++) {
            const r = Math.sqrt(Math.random()) * 220 + 40;
            const theta = Math.random() * Math.PI * 2;
            const x = a.x + Math.cos(theta) * r, y = a.y + Math.sin(theta) * r;
            const vCirc = Math.sqrt(G * a.mass / r) * 0.45;
            const nx = Math.cos(theta), ny = Math.sin(theta);
            const tx = -ny, ty = nx;
            spawnParticle(x, y, tx * vCirc, ty * vCirc, -1, BUCKET_IDX[centers[i].color]);
          }
        });
        camera4.fitBounds(-560, -460, 560, 560, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    supermassiveCore: {
      label: "Supermassive Core",
      build(camera4) {
        beginPreset();
        const core = createAttractor("heavyCore", 0, 0, { mass: 9e4, fixed: true, name: "Supermassive Core" });
        spawnKeplerianAnnulus(0, 0, 900, 40, 90, 9e4, { spread: 0.08, speedScale: 1, colorBucket: BUCKET_IDX.gold });
        spawnKeplerianAnnulus(0, 0, 2200, 160, 560, 9e4, { spread: 0.2, speedScale: 0.97, colorBucket: BUCKET_IDX[core.color] });
        camera4.fitBounds(-620, -620, 620, 620, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    doubleDisc: {
      label: "Double Disc",
      build(camera4) {
        beginPreset();
        const m = 11e3, D = 260;
        const v = twoBodyVelocity(m, m, D);
        const a1 = createAttractor("star", -D / 2, 0, { mass: m, name: "Disc A", color: "gold" });
        const a2 = createAttractor("star", D / 2, 0, { mass: m, name: "Disc B", color: "cyan" });
        a1.vy = v.v1;
        a2.vy = -v.v2;
        spawnKeplerianAnnulus(-D / 2, 0, 1100, 22, 165, m, { spread: 0.12, dir: 1, speedScale: 1, colorBucket: BUCKET_IDX.gold });
        spawnKeplerianAnnulus(D / 2, 0, 1100, 22, 165, m, { spread: 0.12, dir: 1, speedScale: 1, colorBucket: BUCKET_IDX.cyan });
        camera4.fitBounds(-480, -380, 480, 380, camera4._vw || 1200, camera4._vh || 800);
      }
    },
    voidPassage: {
      label: "Void Passage",
      build(camera4) {
        beginPreset();
        const field = [
          { x: -60, y: -180, mass: 9e3, type: "star" },
          { x: 180, y: 60, mass: 14e3, type: "heavyCore" },
          { x: -220, y: 220, mass: 6e3, type: "planet" },
          { x: 340, y: -220, mass: 7500, type: "star" }
        ];
        field.forEach((f, i) => createAttractor(f.type, f.x, f.y, { mass: f.mass, fixed: true, name: `Field ${i + 1}` }));
        const origin = { x: -900, y: -420 };
        const aim = { x: 900, y: 320 };
        const angle = Math.atan2(aim.y - origin.y, aim.x - origin.x);
        spawnPattern({
          cx: origin.x,
          cy: origin.y,
          count: 900,
          mode: "jet",
          radius: 26,
          spread: 0.1,
          speed: 420,
          angle,
          coneSpread: 0.04,
          colorBucket: BUCKET_IDX.cyan
        });
        camera4.fitBounds(-940, -480, 940, 480, camera4._vw || 1200, camera4._vh || 800);
      }
    }
  };
  function listPresets() {
    return Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label }));
  }
  function loadPreset(id, camera4) {
    const p = PRESETS[id];
    if (!p) return false;
    camera4._vw = camera4._vw || window.innerWidth;
    camera4._vh = camera4._vh || window.innerHeight;
    p.build(camera4);
    saveLastPreset(id);
    if (id !== "emptySpace" && attractors.length > 0) {
      const anchor = attractors.reduce((best, a) => a.mass > best.mass ? a : best, attractors[0]);
      triggerFlash(anchor.x, anchor.y, PALETTE[anchor.color] || PALETTE.white, anchor.radius * 5);
    }
    window.dispatchEvent(new CustomEvent("ob:preset-loaded", { detail: { id } }));
    return true;
  }

  // js/generator.js
  var G2 = CONSTANTS.G_DEFAULT;
  var LAYOUTS = ["singleStarDisc", "binary", "starPlusOrbiter", "threeBody", "debrisCloud", "ringSystem"];
  var BUCKET_IDX2 = { white: 0, cyan: 1, violet: 2, gold: 3, blue: 4 };
  var COLORS = ["gold", "cyan", "violet", "blue", "white"];
  function makeRng(seedStr) {
    let h2 = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h2 = Math.imul(h2 ^ seedStr.charCodeAt(i), 3432918353);
      h2 = h2 << 13 | h2 >>> 19;
    }
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822519) >>> 0;
    let a = h2;
    return function rng() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function randomSeed() {
    return Math.random().toString(36).slice(2, 9);
  }
  function annulus(rng, cx, cy, count2, innerR, outerR, centralMass, dir, colorBucket) {
    for (let i = 0; i < count2; i++) {
      const r = innerR + rng() * (outerR - innerR);
      const theta = rng() * Math.PI * 2;
      const x = cx + Math.cos(theta) * r, y = cy + Math.sin(theta) * r;
      const vCirc = Math.sqrt(G2 * centralMass / r);
      const dx = x - cx, dy = y - cy;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / dist, ny = dy / dist;
      const tx = -ny * dir, ty = nx * dir;
      const jitter = 1 + (rng() - 0.5) * 0.18;
      const vx = tx * vCirc * jitter, vy = ty * vCirc * jitter;
      spawnParticle(x, y, vx, vy, -1, colorBucket);
    }
  }
  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }
  function range(rng, lo, hi) {
    return lo + rng() * (hi - lo);
  }
  function generateSystem(seedStr, camera4) {
    const seed = seedStr && seedStr.trim() ? seedStr.trim() : randomSeed();
    const rng = makeRng(seed);
    clearAttractors();
    resetParticles();
    clearEmitters();
    clearTrails();
    state.gravityStrength = 1;
    state.collisionMode = "merge";
    state.selectedAttractorId = null;
    stats.absorbedCount = 0;
    stats.simTime = 0;
    const layout = pick(rng, LAYOUTS);
    const mainColor = pick(rng, COLORS);
    if (layout === "singleStarDisc") {
      const mass = range(rng, 2e4, 6e4);
      const core = createAttractor("heavyCore", 0, 0, { mass, fixed: true, color: mainColor, name: "Generated Core" });
      annulus(rng, 0, 0, Math.round(range(rng, 1400, 2400)), 70, range(rng, 320, 520), mass, rng() < 0.5 ? 1 : -1, BUCKET_IDX2[mainColor]);
    } else if (layout === "binary") {
      const m1 = range(rng, 8e3, 16e3), m2 = range(rng, 8e3, 16e3);
      const D = range(rng, 180, 320);
      const mTotal = m1 + m2;
      const w2 = Math.sqrt(G2 * mTotal / Math.pow(D, 3));
      const c1 = pick(rng, COLORS), c2 = pick(rng, COLORS.filter((c) => c !== c1));
      const a1 = createAttractor("star", -D / 2, 0, { mass: m1, color: c1, name: "Star A" });
      const a2 = createAttractor("star", D / 2, 0, { mass: m2, color: c2, name: "Star B" });
      a1.vy = w2 * (D * m2) / mTotal;
      a2.vy = -w2 * (D * m1) / mTotal;
      spawnPattern({ cx: 0, cy: 0, count: Math.round(range(rng, 1200, 2e3)), mode: "disc", radius: range(rng, 380, 520), spread: 0.4, spin: range(rng, -35, 35), speed: 0 });
    } else if (layout === "starPlusOrbiter") {
      const mass = range(rng, 3e4, 55e3);
      const core = createAttractor("heavyCore", 0, 0, { mass, fixed: true, color: mainColor, name: "Star" });
      const orbitR = range(rng, 260, 420);
      const orbitMass = range(rng, 3e3, 9e3);
      const v = Math.sqrt(G2 * mass / orbitR);
      const orbiter = createAttractor("planet", orbitR, 0, { mass: orbitMass, name: "Orbiter" });
      orbiter.vy = v * (rng() < 0.5 ? 1 : -1);
      annulus(rng, 0, 0, Math.round(range(rng, 1300, 2e3)), 60, orbitR * 1.6, mass, 1, BUCKET_IDX2[mainColor]);
    } else if (layout === "threeBody") {
      const masses = [range(rng, 5e3, 9e3), range(rng, 5e3, 9e3), range(rng, 5e3, 9e3)];
      const radius = range(rng, 140, 220);
      const bodies = [];
      for (let i = 0; i < 3; i++) {
        const ang = i / 3 * Math.PI * 2 + rng() * 0.6;
        const x = Math.cos(ang) * radius, y = Math.sin(ang) * radius;
        bodies.push(createAttractor(i === 0 ? "heavyCore" : "star", x, y, { mass: masses[i], color: pick(rng, COLORS), name: `Body ${i + 1}` }));
      }
      const mTotal = masses.reduce((s, v) => s + v, 0);
      const w2 = Math.sqrt(G2 * mTotal / Math.pow(radius, 3)) * range(rng, 0.5, 0.72);
      for (const a of bodies) {
        const dist = Math.hypot(a.x, a.y);
        const nx = a.x / dist, ny = a.y / dist;
        a.vx = -ny * dist * w2;
        a.vy = nx * dist * w2;
      }
      spawnPattern({ cx: 0, cy: 0, count: Math.round(range(rng, 900, 1400)), mode: "disc", radius: range(rng, 420, 600), spread: 0.5, spin: range(rng, -12, 12), speed: 0 });
    } else if (layout === "debrisCloud") {
      const count2 = Math.round(range(rng, 2, 4));
      for (let i = 0; i < count2; i++) {
        const ang = rng() * Math.PI * 2, dist = range(rng, 120, 320);
        const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist;
        const a = createAttractor(pick(rng, ["star", "planet"]), x, y, { mass: range(rng, 4e3, 9e3), color: pick(rng, COLORS) });
        for (let k = 0; k < 500; k++) {
          const r = Math.sqrt(rng()) * 180 + 30;
          const th = rng() * Math.PI * 2;
          const px2 = a.x + Math.cos(th) * r, py2 = a.y + Math.sin(th) * r;
          spawnParticle(px2, py2, (rng() - 0.5) * 8, (rng() - 0.5) * 8, -1, BUCKET_IDX2[a.color]);
        }
      }
    } else {
      const mass = range(rng, 12e3, 26e3);
      createAttractor("star", 0, 0, { mass, fixed: true, color: mainColor, name: "Generated Star" });
      annulus(rng, 0, 0, Math.round(range(rng, 1500, 2200)), 55, range(rng, 260, 400), mass, 1, BUCKET_IDX2[mainColor]);
    }
    const bounds = 640;
    camera4.fitBounds(-bounds, -bounds, bounds, bounds, camera4._vw || window.innerWidth, camera4._vh || window.innerHeight);
    triggerFlash(0, 0, "#eef3ff", 140);
    state.lastSeed = seed;
    saveLastSeed(seed);
    window.dispatchEvent(new CustomEvent("ob:preset-loaded", { detail: { id: null, seed } }));
    return seed;
  }

  // js/garden-hud.js
  var TYPE_LABELS = Object.freeze({
    heavyCore: "Black Hole",
    star: "Star",
    planet: "Planet",
    moon: "Moon",
    anchor: "Anchor"
  });
  var WARMTH_LABELS = Object.freeze({
    cold: "Cold",
    temperate: "Temperate",
    hot: "Warm"
  });
  function titleCase(value, fallback) {
    if (typeof value !== "string" || !value) return fallback;
    return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  }
  function describeSelectedBody(body) {
    if (!body) return null;
    const warmthKey = typeof body.warmth === "number" ? body.warmth < 0.85 ? "cold" : body.warmth > 1.15 ? "hot" : "temperate" : body.warmth;
    return {
      name: body.name || TYPE_LABELS[body.type] || "Body",
      type: TYPE_LABELS[body.type] || titleCase(body.type, "Body"),
      stage: titleCase(body.gardenStage, "New"),
      orbit: `${titleCase(body.orbitHealth, "Unsettled")} orbit`,
      warmth: WARMTH_LABELS[warmthKey] || "Unknown",
      cradled: body.cradled === true
    };
  }
  function buildGardenHudState(intentionState2 = {}, progress = {}, intentions = {}) {
    const entries = Object.entries(intentions);
    const [intentionId, definition] = entries.find(([id]) => intentionState2[id]?.status !== "complete") || entries[0] || ["stableOrbit", { label: "Settle a wandering world" }];
    const rawProgress = intentionState2[intentionId]?.progress;
    return {
      intentionId,
      intentionLabel: definition.label,
      progressPercent: Math.round(Math.min(1, Math.max(0, Number.isFinite(rawProgress) ? rawProgress : 0)) * 100),
      stardustLabel: `${Number.isFinite(progress.stardust) ? Math.max(0, Math.floor(progress.stardust)) : 0} stardust`
    };
  }

  // js/ui.js?v=cosmic-gardener-8-fix3
  var camera2 = null;
  var canvas3 = null;
  var setGardenStudioOpen = () => {
  };
  var $ = (id) => document.getElementById(id);
  function initUI(cameraRef, canvasRef) {
    camera2 = cameraRef;
    canvas3 = canvasRef;
    wireScreens();
    wireGardenStudio();
    wireGardenHud();
    wireModals();
    wireAccordion();
    wireSeedTray();
    wireSpawnPanel();
    wireAttractorPanel();
    wireWorldPanel();
    wireSimControls();
    wireSettingsModal();
    wireInspector();
    wireKeyboard();
    wireGenerator();
    wireCinematic();
    wireSaveLoad();
    wireOnboarding();
    buildPresetGrids();
    buildChallengeList();
    window.addEventListener("ob:selection-changed", refreshInspector);
    window.addEventListener("ob:preset-loaded", () => {
      syncAllControlsFromState();
      refreshInspector();
    });
    syncAllControlsFromState();
    refreshInspector();
    refreshGardenHud();
    setInterval(uiTick, 150);
  }
  function wireGardenStudio() {
    const studio = $("garden-studio");
    const controls = $("garden-studio-controls");
    const legacy = $("legacy-topbar");
    const transport = legacy.querySelector(".transport-group");
    $("garden-time-control").append(transport.querySelector("#btn-play-pause"));
    controls.append(transport, ...[...legacy.children]);
    legacy.remove();
    $("garden-hud").append($("btn-panels-toggle"));
    const seedTools = /* @__PURE__ */ new Set(["star", "planet", "moon", "influence", "pulse"]);
    document.querySelectorAll("#celestial-seed-tray .tool-btn").forEach((button) => {
      if (!seedTools.has(button.dataset.tool)) $("garden-studio-tools").append(button);
    });
    setGardenStudioOpen = (open, options = {}) => {
      studio.classList.toggle("open", open);
      studio.setAttribute("aria-hidden", String(!open));
      studio.toggleAttribute("inert", !open);
      $("btn-garden-studio").setAttribute("aria-expanded", String(open));
      if (open && options.focusInside) $("btn-garden-studio-close").focus({ preventScroll: true });
      if (!open && options.focusTarget) options.focusTarget.focus({ preventScroll: true });
    };
    $("btn-garden-studio").addEventListener("click", () => {
      const open = !studio.classList.contains("open");
      setGardenStudioOpen(open, { focusInside: open, focusTarget: $("btn-garden-studio") });
    });
    $("btn-garden-studio-close").addEventListener("click", () => setGardenStudioOpen(false, { focusTarget: $("btn-garden-studio") }));
  }
  function wireGardenHud() {
    $("garden-intention").addEventListener("click", () => {
      showToast(`${$("garden-intention-label").textContent} \xB7 ${$("garden-intention-progress").style.width || "0%"}`);
    });
    $("btn-card-focus").addEventListener("click", () => focusOnSelected(camera2));
    $("btn-card-follow").addEventListener("click", () => $("btn-cam-follow").click());
    $("btn-card-cradle").addEventListener("click", () => {
      if (state.selectedAttractorId == null) {
        showToast("Select a body to cradle first.");
        return;
      }
      selectTool("move");
      state.cradleArmed = true;
      refreshGardenHud();
      showToast("Cradle armed \u2014 press and hold the selected body, then drag it.");
    });
    $("btn-card-delete").addEventListener("click", () => $("btn-insp-delete").click());
  }
  function wireScreens() {
    $("btn-enter-sandbox").addEventListener("click", () => enterSandbox());
    $("btn-back-title").addEventListener("click", () => {
      document.getElementById("sandbox-screen").classList.add("hidden");
      document.getElementById("title-screen").classList.remove("hidden");
    });
  }
  function enterSandbox(presetId) {
    document.getElementById("title-screen").classList.add("hidden");
    document.getElementById("sandbox-screen").classList.remove("hidden");
    camera2._vw = canvas3.clientWidth;
    camera2._vh = canvas3.clientHeight;
    if (attractors.length === 0 && count === 0) {
      const last = presetId || loadLastPreset() || "accretionDisc";
      loadPreset(last, camera2);
      syncAllControlsFromState();
    }
    maybeShowOnboarding();
  }
  function openModal(id) {
    $("modal-overlay").classList.remove("hidden");
    document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
    $(id).classList.remove("hidden");
  }
  function closeModals() {
    $("modal-overlay").classList.add("hidden");
    document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
  }
  function wireModals() {
    $("btn-title-presets").addEventListener("click", () => openModal("modal-presets"));
    $("btn-title-how").addEventListener("click", () => openModal("modal-how"));
    $("btn-title-settings").addEventListener("click", () => openModal("modal-settings"));
    $("btn-settings-open").addEventListener("click", () => openModal("modal-settings"));
    $("modal-overlay").addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") closeModals();
    });
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModals));
  }
  function wireAccordion() {
    document.querySelectorAll(".panel-section-header").forEach((header) => {
      header.addEventListener("click", () => {
        const section = header.closest(".panel-section");
        section.classList.toggle("collapsed");
      });
    });
  }
  function wireSeedTray() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".tool-btn");
      if (!button?.dataset.tool) return;
      selectTool(button.dataset.tool, button.dataset.variant || null);
    });
  }
  function selectTool(tool, variant = null) {
    state.currentTool = tool;
    state.gardenVariant = variant;
    state.cradleArmed = false;
    document.querySelectorAll(".tool-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === tool && (button.dataset.variant || null) === variant);
    });
    window.dispatchEvent(new CustomEvent("ob:tool-changed"));
  }
  function wireSpawnPanel() {
    $("spawn-cloud-mode").addEventListener("change", (e) => {
      state.spawnMode = e.target.value;
    });
    $("spawn-amount").addEventListener("change", (e) => {
      state.spawnAmount = parseInt(e.target.value, 10);
    });
    bindRange("spawn-radius", "out-spawn-radius", (v) => {
      state.spawnRadius = v;
    }, (v) => v.toFixed(0));
    bindRange("spawn-spread", "out-spawn-spread", (v) => {
      state.spawnSpread = v;
    }, (v) => v.toFixed(2));
    bindRange("spawn-speed", "out-spawn-speed", (v) => {
      state.spawnSpeed = v;
    }, (v) => v.toFixed(0));
    bindRange("spawn-spin", "out-spawn-spin", (v) => {
      state.spawnSpin = v;
    }, (v) => v.toFixed(0));
    $("spawn-continuous").addEventListener("change", (e) => {
      state.continuousStream = e.target.checked;
    });
  }
  function wireAttractorPanel() {
    $("attractor-fixed").addEventListener("change", (e) => {
      state.attractorFixed = e.target.checked;
    });
  }
  function wireWorldPanel() {
    bindRange("gravity-strength", "out-gravity", (v) => {
      state.gravityStrength = v;
      saveSettings();
    }, (v) => v.toFixed(2));
    $("trail-length").addEventListener("change", (e) => {
      state.trailLength = e.target.value;
      saveSettings();
    });
    $("trail-style").addEventListener("change", (e) => {
      state.trailStyle = e.target.value;
      saveSettings();
    });
    $("color-mode").addEventListener("change", (e) => {
      state.colorMode = e.target.value;
      saveSettings();
    });
    bindRange("particle-brightness", "out-brightness", (v) => {
      state.particleBrightness = v;
      saveSettings();
    }, (v) => v.toFixed(2));
    bindRange("particle-size", "out-size", (v) => {
      state.particleSize = v;
      saveSettings();
    }, (v) => v.toFixed(2));
    $("absorb-mode").addEventListener("change", (e) => {
      state.absorbMode = e.target.value;
      saveSettings();
    });
    $("collision-mode").addEventListener("change", (e) => {
      state.collisionMode = e.target.value;
      saveSettings();
    });
    $("classification-overlay").addEventListener("change", (e) => {
      state.classificationOverlay = e.target.checked;
    });
    $("gravity-overlay").addEventListener("change", (e) => {
      state.gravityOverlay = e.target.checked;
    });
  }
  function bindRange(inputId, outId, onChange, fmt) {
    const el = $(inputId);
    const out = $(outId);
    el.addEventListener("input", () => {
      const v = parseFloat(el.value);
      if (out) out.textContent = fmt ? fmt(v) : v;
      onChange(v);
    });
  }
  function wireSimControls() {
    $("btn-play-pause").addEventListener("click", togglePlayPause);
    $("btn-step").addEventListener("click", () => stepForward());
    $("select-speed").addEventListener("change", (e) => {
      state.speedMultiplier = parseFloat(e.target.value);
    });
    $("btn-cam-reset").addEventListener("click", () => camera2.reset());
    $("btn-cam-fit").addEventListener("click", () => fitCameraToScene());
    $("btn-cam-focus").addEventListener("click", () => {
      if (state.selectedAttractorId == null) {
        showToast("No attractor selected");
        return;
      }
      focusOnSelected(camera2);
    });
    $("btn-clear-trails").addEventListener("click", () => {
      clearTrails();
      showToast("Trails cleared");
    });
    $("btn-clear-particles").addEventListener("click", () => {
      clearParticlesOnly();
      showToast("Particles cleared");
    });
    $("btn-clear-attractors").addEventListener("click", () => {
      clearAttractorsOnly();
      refreshInspector();
      showToast("Attractors cleared");
    });
    $("btn-clear-all").addEventListener("click", () => {
      clearAllBodies();
      refreshInspector();
      showToast("Cleared all");
    });
    $("btn-reset-sim").addEventListener("click", () => {
      resetSimulation();
      refreshInspector();
      syncAllControlsFromState();
      showToast("Simulation reset");
    });
    $("btn-panels-toggle").addEventListener("click", () => {
      const studio = $("garden-studio");
      const open = !studio.classList.contains("open");
      setGardenStudioOpen(open, { focusInside: open, focusTarget: $("btn-panels-toggle") });
    });
  }
  function togglePlayPause() {
    state.running = !state.running;
    $("play-pause-label").textContent = state.running ? "Pause" : "Resume";
    $("play-pause-icon").innerHTML = state.running ? "&#10074;&#10074;" : "&#9654;";
  }
  function fitCameraToScene() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const a of attractors) {
      minX = Math.min(minX, a.x - a.radius * 3);
      maxX = Math.max(maxX, a.x + a.radius * 3);
      minY = Math.min(minY, a.y - a.radius * 3);
      maxY = Math.max(maxY, a.y + a.radius * 3);
    }
    const step = Math.max(1, Math.floor(count / 1500));
    for (let i = 0; i < count; i += step) {
      minX = Math.min(minX, px[i]);
      maxX = Math.max(maxX, px[i]);
      minY = Math.min(minY, py[i]);
      maxY = Math.max(maxY, py[i]);
    }
    if (!isFinite(minX)) {
      camera2.reset();
      return;
    }
    camera2.fitBounds(minX, minY, maxX, maxY, canvas3.clientWidth, canvas3.clientHeight);
  }
  function wireSettingsModal() {
    $("setting-particle-density").addEventListener("change", (e) => {
      state.particleDensityPref = e.target.value;
      const map = { low: 500, medium: 1e3, high: 2500 };
      const v = map[e.target.value];
      state.spawnAmount = v;
      $("spawn-amount").value = String(v);
      saveSettings();
    });
    $("setting-render-quality").addEventListener("change", (e) => {
      state.renderQuality = e.target.value;
      saveSettings();
    });
    $("setting-bg-density").addEventListener("change", (e) => {
      state.backgroundDensity = parseFloat(e.target.value);
      buildBackground();
      saveSettings();
    });
    $("setting-motion-blur").addEventListener("change", (e) => {
      state.motionBlur = e.target.checked;
      saveSettings();
    });
    $("setting-reduced-motion").addEventListener("change", (e) => {
      state.reducedMotion = e.target.checked;
      saveSettings();
    });
    $("setting-show-fps").addEventListener("change", (e) => {
      state.showFPS = e.target.checked;
      $("stat-fps").classList.toggle("hidden", !state.showFPS);
      saveSettings();
    });
    $("setting-screen-flash").addEventListener("change", (e) => {
      state.screenFlash = e.target.checked;
      saveSettings();
    });
  }
  function wireInspector() {
    $("insp-name").addEventListener("input", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a) a.name = e.target.value.slice(0, 24) || a.name;
    });
    $("insp-mass").addEventListener("input", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a) {
        setMass(a, parseFloat(e.target.value));
        $("out-insp-mass").textContent = Math.round(a.mass);
        $("insp-radius").value = a.radius;
        $("out-insp-radius").textContent = Math.round(a.radius);
      }
    });
    $("insp-radius").addEventListener("input", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a) {
        a.radius = clamp(parseFloat(e.target.value), 5, 90);
        $("out-insp-radius").textContent = Math.round(a.radius);
      }
    });
    $("insp-px").addEventListener("change", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a) a.x = parseFloat(e.target.value) || 0;
    });
    $("insp-py").addEventListener("change", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a) a.y = parseFloat(e.target.value) || 0;
    });
    $("insp-vx").addEventListener("change", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a && !a.fixed) a.vx = clamp(parseFloat(e.target.value) || 0, -CONSTANTS.MAX_ATTRACTOR_SPEED, CONSTANTS.MAX_ATTRACTOR_SPEED);
    });
    $("insp-vy").addEventListener("change", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a && !a.fixed) a.vy = clamp(parseFloat(e.target.value) || 0, -CONSTANTS.MAX_ATTRACTOR_SPEED, CONSTANTS.MAX_ATTRACTOR_SPEED);
    });
    $("insp-fixed").addEventListener("change", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a) {
        a.fixed = e.target.checked;
        if (a.fixed) {
          a.vx = 0;
          a.vy = 0;
        }
      }
    });
    $("insp-trail").addEventListener("change", (e) => {
      const a = getAttractor(state.selectedAttractorId);
      if (a) a.showTrail = e.target.checked;
    });
    document.querySelectorAll("#insp-color-swatches .swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        const a = getAttractor(state.selectedAttractorId);
        if (a) {
          a.color = sw.dataset.color;
          refreshInspector();
        }
      });
    });
    $("btn-insp-focus").addEventListener("click", () => focusOnSelected(camera2));
    $("btn-insp-duplicate").addEventListener("click", () => {
      if (state.selectedAttractorId == null) return;
      const copy = duplicateAttractor(state.selectedAttractorId);
      if (copy) {
        dispatchSelectionUI(copy.id);
        showToast(`Duplicated ${copy.name}`);
      }
    });
    $("btn-insp-delete").addEventListener("click", () => {
      if (state.selectedAttractorId != null) {
        removeAttractor(state.selectedAttractorId);
        state.selectedAttractorId = null;
        refreshInspector();
      }
    });
  }
  function dispatchSelectionUI(id) {
    state.selectedAttractorId = id;
    window.dispatchEvent(new CustomEvent("ob:selection-changed", { detail: { id } }));
  }
  function refreshInspector() {
    const a = getAttractor(state.selectedAttractorId);
    const section = $("inspector-section");
    if (!a) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    const active = document.activeElement;
    if (active !== $("insp-name")) $("insp-name").value = a.name;
    $("insp-type").textContent = a.type === "heavyCore" ? "Black Hole" : a.type.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    if (active !== $("insp-mass")) {
      $("insp-mass").value = a.mass;
    }
    $("out-insp-mass").textContent = Math.round(a.mass);
    if (active !== $("insp-radius")) $("insp-radius").value = a.radius;
    $("out-insp-radius").textContent = Math.round(a.radius);
    if (active !== $("insp-px")) $("insp-px").value = Math.round(a.x);
    if (active !== $("insp-py")) $("insp-py").value = Math.round(a.y);
    if (active !== $("insp-vx")) $("insp-vx").value = Math.round(a.vx);
    if (active !== $("insp-vy")) $("insp-vy").value = Math.round(a.vy);
    $("insp-speed").textContent = Math.round(Math.hypot(a.vx, a.vy));
    $("insp-nearby").textContent = nearbyParticleCount(a, 180);
    if (active !== $("insp-fixed")) $("insp-fixed").checked = a.fixed;
    if (active !== $("insp-trail")) $("insp-trail").checked = a.showTrail !== false;
    document.querySelectorAll("#insp-color-swatches .swatch").forEach((sw) => {
      sw.classList.toggle("active", sw.dataset.color === a.color);
    });
  }
  function refreshGardenHud() {
    const progress = getGardenProgress();
    const hud = buildGardenHudState(intentionState, progress, INTENTIONS);
    $("garden-intention-label").textContent = hud.intentionLabel;
    $("garden-intention-progress").style.width = `${hud.progressPercent}%`;
    $("stardust-count").textContent = hud.stardustLabel;
    refreshCreativeToolVariants(progress.unlocks);
    const body = getAttractor(state.selectedAttractorId);
    const card = $("selected-body-card");
    const view = describeSelectedBody(body);
    card.classList.toggle("hidden", !view);
    if (!view) return;
    $("selected-body-name").textContent = view.name;
    $("selected-body-type").textContent = view.type;
    $("selected-body-state").textContent = `${view.stage} \xB7 ${view.orbit}`;
    $("selected-body-warmth").textContent = view.warmth;
    $("selected-body-hint").textContent = state.cradleArmed ? "Cradle armed \u2014 press and hold this body, then drag it to place it." : view.cradled ? "Cradled \u2014 release gently to restore its motion." : "Focus, follow, or hold and drag to cradle this body.";
  }
  var creativeVariantKey = "";
  function refreshCreativeToolVariants(unlocks) {
    const variants = getCreativeToolVariants(unlocks);
    const key = variants.map((variant) => variant.id).join("|");
    if (key === creativeVariantKey) return;
    creativeVariantKey = key;
    document.querySelectorAll("#celestial-seed-tray .garden-creative-variant").forEach((button) => button.remove());
    const tray = $("celestial-seed-tray");
    for (const variant of variants) {
      const button = document.createElement("button");
      button.className = "tool-btn garden-creative-variant";
      button.type = "button";
      button.dataset.tool = variant.tool;
      button.dataset.variant = variant.id;
      button.title = variant.title;
      button.setAttribute("aria-label", variant.title);
      button.innerHTML = `<span>${variant.label}</span>`;
      tray.append(button);
    }
  }
  function wireGenerator() {
    const seedInput = $("generator-seed");
    const savedSeed = loadLastSeed();
    if (savedSeed) seedInput.value = savedSeed;
    $("btn-generator-seed-random").addEventListener("click", () => {
      seedInput.value = randomSeed();
    });
    $("btn-generate-system").addEventListener("click", () => {
      const seed = generateSystem(seedInput.value, camera2);
      seedInput.value = seed;
      syncAllControlsFromState();
      refreshInspector();
      showToast(`Generated system \xB7 seed ${seed}`);
    });
  }
  var cursorHideTimer = null;
  function wireCinematic() {
    $("btn-cinematic").addEventListener("click", enterCinematic);
    $("btn-cinematic-exit").addEventListener("click", exitCinematic);
    $("btn-fullscreen").addEventListener("click", toggleFullscreen);
    $("btn-cam-follow").addEventListener("click", () => {
      state.followBody = !state.followBody;
      $("btn-cam-follow").classList.toggle("active-toggle", state.followBody);
      if (state.followBody && state.selectedAttractorId == null) {
        showToast("Select a body to follow it");
      }
    });
    const sandbox = document.getElementById("sandbox-screen");
    sandbox.addEventListener("mousemove", () => {
      if (!state.cinematicMode) return;
      sandbox.classList.remove("cursor-hidden");
      clearTimeout(cursorHideTimer);
      cursorHideTimer = setTimeout(() => sandbox.classList.add("cursor-hidden"), 2600);
    });
  }
  function enterCinematic() {
    state.cinematicMode = true;
    document.getElementById("sandbox-screen").classList.add("cinematic-active");
    $("btn-cinematic-exit").classList.remove("hidden");
  }
  function exitCinematic() {
    state.cinematicMode = false;
    const sandbox = document.getElementById("sandbox-screen");
    sandbox.classList.remove("cinematic-active");
    sandbox.classList.remove("cursor-hidden");
    $("btn-cinematic-exit").classList.add("hidden");
    clearTimeout(cursorHideTimer);
  }
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => showToast("Fullscreen not available"));
    } else {
      document.exitFullscreen?.();
    }
  }
  function wireSaveLoad() {
    $("btn-save-system").addEventListener("click", () => {
      const snapshot = {
        attractors: attractors.map((a) => ({
          id: a.id,
          type: a.type,
          x: a.x,
          y: a.y,
          vx: a.vx,
          vy: a.vy,
          mass: a.mass,
          radius: a.radius,
          fixed: a.fixed,
          color: a.color,
          showTrail: a.showTrail,
          name: a.name,
          gardenStage: a.gardenStage,
          stageAge: a.stageAge,
          stableFor: a.stableFor,
          dominantStarId: a.dominantStarId,
          warmth: a.warmth,
          orbitHealth: a.orbitHealth,
          appearanceSeed: a.appearanceSeed,
          ringStrength: a.ringStrength,
          lastTransform: a.lastTransform
        })),
        camera: { x: camera2.x, y: camera2.y, zoom: camera2.zoom },
        colorMode: state.colorMode,
        gravityStrength: state.gravityStrength,
        collisionMode: state.collisionMode,
        seed: state.lastSeed
      };
      if (saveSystemSnapshot(snapshot)) showToast("System saved");
      else showToast("Could not save (storage unavailable)");
    });
    $("btn-load-system").addEventListener("click", () => {
      const result = loadSystemSnapshotResult();
      if (result.status === "missing") {
        showToast("No saved garden found");
        return;
      }
      if (result.status === "invalid") {
        showToast("Saved garden could not be read");
        return;
      }
      const snap = result.value;
      clearAttractors();
      resetParticles();
      state.selectedAttractorId = null;
      for (const a of snap.attractors || []) {
        createAttractor(a.type, a.x, a.y, {
          id: a.id,
          mass: a.mass,
          radius: a.radius,
          vx: a.vx,
          vy: a.vy,
          fixed: a.fixed,
          color: a.color,
          showTrail: a.showTrail,
          name: a.name,
          gardenStage: a.gardenStage,
          stageAge: a.stageAge,
          stableFor: a.stableFor,
          dominantStarId: a.dominantStarId,
          warmth: a.warmth,
          orbitHealth: a.orbitHealth,
          appearanceSeed: a.appearanceSeed,
          ringStrength: a.ringStrength,
          lastTransform: a.lastTransform
        });
      }
      setNextAttractorId(Math.max(1, ...snap.attractors.map((a) => Number.isFinite(a.id) ? a.id + 1 : 1)));
      if (snap.camera) camera2.animateTo(snap.camera.x, snap.camera.y, snap.camera.zoom, 0.5);
      if (snap.colorMode) state.colorMode = snap.colorMode;
      if (snap.gravityStrength) state.gravityStrength = snap.gravityStrength;
      if (snap.collisionMode) state.collisionMode = snap.collisionMode;
      if (snap.seed) {
        state.lastSeed = snap.seed;
        $("generator-seed").value = snap.seed;
      }
      clearTrails();
      syncAllControlsFromState();
      refreshInspector();
      showToast("System loaded \u2014 add particles to bring it to life");
    });
  }
  var ONBOARDING_KEY = "orbitalBloom.onboardingSeen.v1";
  function wireOnboarding() {
    $("btn-onboarding-dismiss").addEventListener("click", dismissOnboarding);
  }
  function dismissOnboarding() {
    $("onboarding-guide").classList.add("hidden");
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch (e) {
    }
  }
  function maybeShowOnboarding() {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) $("onboarding-guide").classList.remove("hidden");
    } catch (e) {
    }
  }
  function buildPresetGrids() {
    const presets = listPresets();
    for (const container of [$("preset-grid"), $("preset-grid-modal")]) {
      container.innerHTML = "";
      for (const p of presets) {
        const btn = document.createElement("button");
        btn.className = "preset-btn";
        btn.textContent = p.label;
        btn.addEventListener("click", () => {
          if (document.getElementById("title-screen").classList.contains("hidden") === false) {
            enterSandbox(p.id);
          } else {
            loadPreset(p.id, camera2);
            syncAllControlsFromState();
            refreshInspector();
          }
          closeModals();
          showToast(`Loaded: ${p.label}`);
        });
        container.appendChild(btn);
      }
    }
  }
  function buildChallengeList() {
    const list = $("challenge-list");
    list.innerHTML = "";
    for (const [id, def] of Object.entries(CHALLENGES)) {
      const card = document.createElement("div");
      card.className = "challenge-card";
      card.innerHTML = `
      <div class="challenge-title">${def.label}</div>
      <div class="challenge-desc">${def.description}</div>
      <div class="challenge-bar"><div class="challenge-bar-fill" id="chal-bar-${id}"></div></div>
      <div class="challenge-row">
        <span id="chal-status-${id}" class="challenge-status">Idle</span>
        <button class="btn btn-compact" data-challenge="${id}">Start</button>
      </div>`;
      list.appendChild(card);
      card.querySelector("button").addEventListener("click", () => {
        if (challengeState.active === id) {
          stopChallenge();
        } else {
          startChallenge(id);
        }
        $("classification-overlay").checked = state.classificationOverlay;
        refreshChallengeUI();
      });
    }
  }
  function refreshChallengeUI() {
    for (const id of Object.keys(CHALLENGES)) {
      const bar = $(`chal-bar-${id}`);
      const status = $(`chal-status-${id}`);
      const btn = document.querySelector(`[data-challenge="${id}"]`);
      if (!bar) continue;
      if (challengeState.active === id) {
        bar.style.width = `${Math.round(challengeState.progress * 100)}%`;
        status.textContent = challengeState.status === "success" ? "Success!" : challengeState.status === "failed" ? "Failed" : `Running ${Math.round(challengeState.elapsed)}s`;
        btn.textContent = "Stop";
      } else {
        bar.style.width = "0%";
        status.textContent = "Idle";
        btn.textContent = "Start";
      }
    }
  }
  function wireKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (state.cinematicMode) exitCinematic();
        else if ($("garden-studio").classList.contains("open")) setGardenStudioOpen(false, { focusTarget: $("btn-garden-studio") });
        else closeModals();
        return;
      }
      const tag = document.activeElement && document.activeElement.tagName || "";
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (document.getElementById("sandbox-screen").classList.contains("hidden")) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "r" || e.key === "R") camera2.reset();
      else if (e.key === "f" || e.key === "F") fitCameraToScene();
      else if (e.key === "c" || e.key === "C") {
        state.cinematicMode ? exitCinematic() : enterCinematic();
      }
    });
  }
  function uiTick() {
    if (document.getElementById("sandbox-screen").classList.contains("hidden")) return;
    const s = liveParticleStats();
    $("stat-particles").textContent = s.count;
    $("stat-attractors").textContent = s.attractorCount;
    $("stat-simtime").textContent = `${stats.simTime.toFixed(1)}s`;
    $("stat-avgspeed").textContent = Math.round(s.avg);
    $("stat-maxspeed").textContent = Math.round(s.max);
    $("stat-absorbed").textContent = stats.absorbedCount;
    $("stat-gravity").textContent = `${state.gravityStrength.toFixed(2)}\xD7`;
    $("stat-fps-panel").textContent = stats.fps;
    if (state.showFPS) $("stat-fps").textContent = `${stats.fps} FPS`;
    let bound = 0, falling = 0, escaping = 0, chaotic = 0;
    for (let i = 0; i < count; i++) {
      const c = pclass[i];
      if (c === 0) bound++;
      else if (c === 1) falling++;
      else if (c === 2) escaping++;
      else chaotic++;
    }
    $("stat-bound").textContent = bound;
    $("stat-falling").textContent = falling;
    $("stat-escaping").textContent = escaping;
    $("stat-chaotic").textContent = chaotic;
    refreshInspector();
    refreshGardenHud();
    refreshChallengeUI();
  }
  function syncAllControlsFromState() {
    $("gravity-strength").value = state.gravityStrength;
    $("out-gravity").textContent = state.gravityStrength.toFixed(2);
    $("trail-length").value = state.trailLength;
    $("trail-style").value = state.trailStyle;
    $("color-mode").value = state.colorMode;
    $("particle-brightness").value = state.particleBrightness;
    $("out-brightness").textContent = state.particleBrightness.toFixed(2);
    $("particle-size").value = state.particleSize;
    $("out-size").textContent = state.particleSize.toFixed(2);
    $("absorb-mode").value = state.absorbMode;
    $("classification-overlay").checked = state.classificationOverlay;
    $("select-speed").value = String(state.speedMultiplier);
    $("spawn-amount").value = String(state.spawnAmount);
    $("setting-render-quality").value = state.renderQuality;
    $("collision-mode").value = state.collisionMode;
    $("gravity-overlay").checked = state.gravityOverlay;
    $("btn-cam-follow").classList.toggle("active-toggle", state.followBody);
    $("setting-particle-density").value = state.particleDensityPref;
    $("setting-motion-blur").checked = state.motionBlur;
    $("setting-reduced-motion").checked = state.reducedMotion;
    $("setting-show-fps").checked = state.showFPS;
    $("setting-screen-flash").checked = state.screenFlash;
    $("stat-fps").classList.toggle("hidden", !state.showFPS);
    const bgOpt = [...document.getElementById("setting-bg-density").options].find((o) => Math.abs(parseFloat(o.value) - state.backgroundDensity) < 0.01);
    if (bgOpt) $("setting-bg-density").value = bgOpt.value;
    $("play-pause-label").textContent = state.running ? "Pause" : "Resume";
    $("play-pause-icon").innerHTML = state.running ? "&#10074;&#10074;" : "&#9654;";
  }
  var toastTimer = null;
  function showToast(msg, ms = 2200) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
  }

  // js/main.js
  loadSettings();
  var simCanvas = document.getElementById("sim-canvas");
  var camera3 = new Camera();
  initRenderer(simCanvas);
  initTools(simCanvas, camera3);
  initSimulation(camera3, simCanvas);
  initUI(camera3, simCanvas);
  function resizeAll() {
    const dpr2 = Math.min(window.devicePixelRatio || 1, 2);
    const w2 = simCanvas.parentElement ? window.innerWidth : window.innerWidth;
    const h2 = window.innerHeight;
    resize(w2, h2, dpr2);
  }
  window.addEventListener("resize", resizeAll);
  resizeAll();
  startLoop();
  initTitleBackground();
  function initTitleBackground() {
    const canvas4 = document.getElementById("title-canvas");
    const ctx2 = canvas4.getContext("2d");
    let w2 = 0, h2 = 0, dpr2 = 1;
    function resize2() {
      dpr2 = Math.min(window.devicePixelRatio || 1, 2);
      w2 = window.innerWidth;
      h2 = window.innerHeight;
      canvas4.width = Math.round(w2 * dpr2);
      canvas4.height = Math.round(h2 * dpr2);
      canvas4.style.width = w2 + "px";
      canvas4.style.height = h2 + "px";
      ctx2.setTransform(dpr2, 0, 0, dpr2, 0, 0);
    }
    window.addEventListener("resize", resize2);
    resize2();
    const stars2 = [];
    for (let i = 0; i < 150; i++) {
      stars2.push({
        x: Math.random() * 2e3 - 1e3,
        y: Math.random() * 1400 - 700,
        r: 0.5 + Math.random() * 1.6,
        b: 0.18 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2
      });
    }
    const orbiters = [
      { angle: 0, radius: 70, speed: 0.22, color: PALETTE.amber, size: 5, label: "young star" },
      { angle: 2.1, radius: 130, speed: -0.14, color: PALETTE.jade, size: 3.6, label: "jade world" },
      { angle: 4.2, radius: 190, speed: 0.09, color: PALETTE.ivory, size: 2.8, label: "ivory moon" }
    ];
    let t = 0, last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      if (!document.getElementById("title-screen") || document.getElementById("title-screen").classList.contains("hidden")) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1e3, 0.05);
      last = now;
      t += dt;
      ctx2.fillStyle = PALETTE.ocean;
      ctx2.fillRect(0, 0, w2, h2);
      ctx2.globalAlpha = 1;
      for (const s of stars2) {
        const x = ((s.x + w2 / 2) % w2 + w2) % w2;
        const y = ((s.y + h2 / 2) % h2 + h2) % h2;
        const tw = state.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(t * 0.6 + s.phase);
        ctx2.globalAlpha = s.b * tw;
        ctx2.fillStyle = PALETTE.ivory;
        ctx2.beginPath();
        ctx2.arc(x, y, s.r, 0, Math.PI * 2);
        ctx2.fill();
      }
      const cx = w2 / 2, cy = h2 * 0.42;
      ctx2.globalAlpha = 1;
      const core = ctx2.createRadialGradient(cx, cy, 0, cx, cy, 130);
      core.addColorStop(0, "rgba(233,181,103,0.32)");
      core.addColorStop(1, "rgba(233,181,103,0)");
      ctx2.fillStyle = core;
      ctx2.beginPath();
      ctx2.arc(cx, cy, 130, 0, Math.PI * 2);
      ctx2.fill();
      for (const o of orbiters) {
        if (!state.reducedMotion) o.angle += o.speed * dt;
        const x = cx + Math.cos(o.angle) * o.radius * 2.3;
        const y = cy + Math.sin(o.angle) * o.radius * 0.85;
        ctx2.globalCompositeOperation = "source-over";
        ctx2.strokeStyle = "rgba(244,240,220,0.22)";
        ctx2.lineWidth = 0.8;
        ctx2.beginPath();
        ctx2.ellipse(cx, cy, o.radius * 2.3, o.radius * 0.85, 0, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.globalCompositeOperation = "lighter";
        const grad = ctx2.createRadialGradient(x, y, 0, x, y, o.size * 4);
        grad.addColorStop(0, o.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx2.fillStyle = grad;
        ctx2.beginPath();
        ctx2.arc(x, y, o.size * 4, 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.globalCompositeOperation = "source-over";
    }
    requestAnimationFrame(frame);
  }
})();
