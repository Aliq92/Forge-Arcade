// One tick is one simulation interval. All randomness and event clocks belong to the world.
export const WIDTH = 48;
export const HEIGHT = 24;
export const WATER_LINE = 0.045;
const SEA_LEVEL = 0.43;
const TAU = Math.PI * 2;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const approach = (value, target, by) => value + clamp(target - value, -by, by);

export const HABITABILITY_FORMULA = 'Area-weighted regional score: 35% temperate climate, 25% available water, 20% atmospheric pressure and gases, 10% plant cover, 10% wildlife.';
export const DISASTERS = ['volcano', 'meteor', 'drought', 'flood', 'heatwave', 'cold snap', 'wildfire'];

function tool(id, name, group, cost, description) { return {id, name, group, cost, description}; }
export const TOOLS = [
  tool('raise', 'Raise Land', 'Terrain', 4, 'Lift a patch of crust to divert runoff.'),
  tool('lower', 'Lower Land', 'Terrain', 4, 'Excavate a shallow basin that collects water.'),
  tool('mountain', 'Create Mountain', 'Terrain', 8, 'Build a high, cool ridge above the surrounding habitat.'),
  tool('valley', 'Carve Valley', 'Terrain', 8, 'Cut a narrow descending channel from west to east.'),
  tool('warm', 'Increase Temperature', 'Climate', 8, 'Warm this region and raise global solar forcing by 2 °C.'),
  tool('cool', 'Decrease Temperature', 'Climate', 8, 'Cool this region and lower global solar forcing by 2 °C.'),
  tool('moisten', 'Add Moisture', 'Climate', 4, 'Saturate soil and release vapor above the region.'),
  tool('dry', 'Reduce Moisture', 'Climate', 4, 'Extract moisture from the ground and cloud layer.'),
  tool('atmosphere', 'Modify Atmosphere', 'Climate', 10, 'Move pressure and gas composition toward temperate conditions.'),
  tool('water', 'Add Water', 'Water', 5, 'Release surface water. It moves down the terrain each tick.'),
  tool('drain', 'Remove Water', 'Water', 5, 'Pump surface water and ice out of the region.'),
  tool('rain', 'Create Rainfall Zone', 'Water', 8, 'Seed a temporary vapor source that condenses into sustained rain.'),
  tool('grass', 'Plant Grass', 'Life', 5, 'Sow pioneer grasses. Warm, moist soil promotes spreading.'),
  tool('forest', 'Plant Forest', 'Life', 8, 'Plant a grove. Trees retain moisture and shelter wildlife.'),
  tool('herbivores', 'Introduce Herbivores', 'Life', 9, 'Release grazers that require plant cover.'),
  tool('predators', 'Introduce Predators', 'Life', 12, 'Release predators that depend on local grazers.'),
  tool('aquatic', 'Introduce Aquatic Life', 'Life', 9, 'Stock open water with a climate-sensitive aquatic community.')
];
const definitions = new Map(TOOLS.map(definition => [definition.id, definition]));

function hashSeed(seed) {
  let hash = 2166136261;
  for (const letter of String(seed)) hash = Math.imul(hash ^ letter.codePointAt(0), 16777619);
  return hash >>> 0;
}
function random(world) {
  world.rng = (Math.imul(world.rng, 1664525) + 1013904223) >>> 0;
  return world.rng / 4294967296;
}

function lattice(seed, x, y, z) {
  let hash = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
function noise(seed, x, y, z) {
  const a = Math.floor(x), b = Math.floor(y), c = Math.floor(z);
  const u = smooth(x - a), v = smooth(y - b), w = smooth(z - c);
  const row = (dy, dz) => mix(lattice(seed, a, b+dy, c+dz), lattice(seed, a+1, b+dy, c+dz), u);
  return mix(mix(row(0,0), row(1,0), v), mix(row(0,1), row(1,1), v), w);
}
export function terrainSampler(seed) {
  const key = hashSeed(seed);
  return (longitude, latitude) => {
    const x = Math.cos(latitude) * Math.cos(longitude);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.sin(longitude);
    const octave = (freq, shift) => noise(key + shift, x * freq + 4.1, y * freq - 2.6, z * freq + 5.9);
    return clamp(0.50 + 1.6 * (0.62 * octave(1.9,0) + 0.25 * octave(4.2,1) + 0.13 * octave(9.7,2) - 0.5));
  };
}

const latitudeFactor = [], area = [], links = [];
for (let y = 0; y < HEIGHT; y++) {
  const latitude = Math.PI * (0.5 - (y + 0.5) / HEIGHT);
  area[y] = Math.cos(latitude);
  latitudeFactor[y] = Math.sin(latitude) ** 2;
  for (let x = 0; x < WIDTH; x++) {
    const i = y * WIDTH + x;
    const opposite = y * WIDTH + (x + WIDTH / 2) % WIDTH;
    links[i] = [y * WIDTH + (x + WIDTH - 1) % WIDTH, y * WIDTH + (x + 1) % WIDTH,
      y ? i - WIDTH : opposite, y < HEIGHT - 1 ? i + WIDTH : opposite];
  }
}
export const neighbors = (world, index) => links[index];
const weatherHeat = {normal:0, wet:-1, dry:2, hot:8, cold:-8};
function baseTemperature(world, cell, row) {
  return 26.5 - 37 * latitudeFactor[row] - 19 * Math.max(0, cell.elevation - SEA_LEVEL)
    + world.solar + cell.anomaly + 2.8 * Math.log2(world.co2 / .12) + 6 * (world.pressure - .85)
    + weatherHeat[world.weather] + cell.heat * 36;
}
export function createWorld(seed = 'TERRA', mode = 'campaign') {
  const world = {seed: String(seed), mode, width: WIDTH, height: HEIGHT, tick: 0, rng: hashSeed(seed), cells: [],
    solar: 0, pressure: .78, oxygen: 12, co2: .30, energy: mode === 'survival' ? 140 : 120,
    weather: 'normal', event: null, warning: null, nextEvent: 72, stableTicks: 0};
  const sample = terrainSampler(seed);
  for (let y = 0; y < HEIGHT; y++) {
    const latitude = Math.PI * (0.5 - (y + 0.5) / HEIGHT);
    for (let x = 0; x < WIDTH; x++) {
      const elevation = sample(TAU * ((x + 0.5) / WIDTH - 0.5), latitude);
      const depth = clamp((SEA_LEVEL - elevation) * 1.8);
      const cell = {elevation, water: depth, ice: 0, temperature: 0, moisture: clamp(.18 + depth * 1.7 + random(world) * .12),
        cloud: .1 + depth * .6, rain: 0, rainZone: 0, grass: 0, forest: 0, herbivores: 0, predators: 0, aquatic: 0,
        heat: 0, fire: 0, anomaly: 0, flow: 0, downstream: -1};
      cell.temperature = baseTemperature(world, cell, y);
      if (cell.temperature < 0) { cell.ice = depth; cell.water = 0; }
      world.cells.push(cell);
    }
  }
  return world;
}

function brush(world, index, radius, visit) {
  const row = Math.floor(index / WIDTH), col = index % WIDTH;
  for (let dy = -radius; dy <= radius; dy++) {
    if (row + dy < 0 || row + dy >= HEIGHT) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance > radius) continue;
      visit(world.cells[(row + dy) * WIDTH + (col + dx + WIDTH) % WIDTH], 1 - distance / (radius + 1), dx, dy);
    }
  }
}
export function applyTool(world, id, index) {
  const definition = definitions.get(id);
  if (!definition || !Number.isInteger(index) || !world.cells[index] ||
      (world.mode === 'campaign' && world.mission?.allowed && !world.mission.allowed.includes(id)) ||
      (world.mode !== 'sandbox' && world.energy < definition.cost)) return false;
  if (world.mode !== 'sandbox') world.energy -= definition.cost;
  if (id === 'atmosphere') {
    world.pressure = approach(world.pressure, 1, .08);
    world.oxygen = approach(world.oxygen, 20.9, 1.8);
    world.co2 = approach(world.co2, .04, .06);
    return true;
  }
  const direction = id === 'warm' ? 1 : -1;
  if (id === 'warm' || id === 'cool') world.solar = clamp(world.solar + 2 * direction, -60, 60);
  brush(world, index, id === 'valley' ? 3 : 2, (c, weight, dx, dy) => {
    switch (id) {
      case 'raise': c.elevation = clamp(c.elevation + .16 * weight); break;
      case 'lower': c.elevation = clamp(c.elevation - .16 * weight); break;
      case 'mountain': c.elevation = clamp(c.elevation + .46 * weight ** 1.7); break;
      case 'valley':
        if (Math.abs(dy) <= 1) c.elevation = clamp(c.elevation - (.23 + .035 * dx) / (1 + 2 * Math.abs(dy)));
        break;
      case 'warm': case 'cool':
        c.anomaly = clamp(c.anomaly + direction * 8 * weight, -60, 60);
        c.temperature = clamp(c.temperature + direction * 8 * weight, -100, 100);
        break;
      case 'moisten': c.moisture = clamp(c.moisture + .5 * weight); c.cloud = clamp(c.cloud + .20 * weight); break;
      case 'dry': c.moisture = clamp(c.moisture - .55 * weight); c.cloud *= 1 - .7 * weight; break;
      case 'water': c.water = clamp(c.water + .36 * weight); c.moisture = clamp(c.moisture + .13 * weight); break;
      case 'drain': c.water = clamp(c.water - .48 * weight); c.ice = clamp(c.ice - .48 * weight); break;
      case 'rain': c.rainZone = Math.max(c.rainZone, .6 + .4 * weight); c.cloud = clamp(c.cloud + .4 * weight); break;
      case 'grass': c.grass = clamp(c.grass + .66 * weight); break;
      case 'forest': c.forest = clamp(c.forest + .58 * weight); break;
      case 'herbivores': c.herbivores = clamp(c.herbivores + .34 * weight); break;
      case 'predators': c.predators = clamp(c.predators + .18 * weight); break;
      case 'aquatic': c.aquatic = clamp(c.aquatic + .4 * weight); break;
    }
  });
  return true;
}

export function triggerDisaster(world, type, index) {
  if (!DISASTERS.includes(type)) return false;
  if (index === undefined) index = Math.floor(random(world) * world.cells.length);
  if (!Number.isInteger(index) || !world.cells[index]) return false;
  brush(world, index, type === 'volcano' || type === 'meteor' ? 2 : 4, (c, strength) => {
    switch (type) {
      case 'volcano': case 'meteor':
        c.elevation = clamp(c.elevation + (type === 'volcano' ? .40 : -.33) * strength);
        c.heat = Math.max(c.heat, strength);
        c.grass *= 1 - strength; c.forest *= 1 - strength;
        c.herbivores *= 1 - strength; c.predators *= 1 - strength; c.aquatic *= 1 - strength;
        c.moisture *= 1 - .8 * strength; break;
      case 'flood': c.water = clamp(c.water + .42 * strength); c.moisture = clamp(c.moisture + .4 * strength); break;
      case 'drought': c.moisture *= 1 - .95 * strength; c.cloud *= 1 - strength; c.grass *= 1 - .55 * strength; break;
      case 'wildfire': c.fire = Math.max(c.fire, strength * clamp((c.grass + c.forest) * 2)); break;
      case 'cold snap': case 'heatwave': {
        const delta = (type === 'cold snap' ? -18 : 18) * strength;
        c.anomaly = clamp(c.anomaly + delta, -60, 60);
        c.temperature = clamp(c.temperature + delta, -100, 100); break;
      }
    }
  });
  world.event = {type, index, tick: world.tick};
  return true;
}

const temperate = temperature => clamp(1 - Math.abs(temperature - 18) / 31);
const airQuality = w => (clamp(1 - Math.abs(w.pressure - 1) / .85) + clamp(1 - Math.abs(w.oxygen - 20.9) / 20.9)
  + clamp(1 - Math.max(0, w.co2 - .1) / 1.4)) / 3;
function regionalScore(c, air) {
  return .35 * temperate(c.temperature) + .25 * clamp(c.moisture + 1.8*c.water)
    + .2 * air + .10 * clamp(c.grass + c.forest) + .10 * clamp(c.herbivores + c.predators + c.aquatic);
}
export const regionHabitability = (cell, world) => regionalScore(cell, airQuality(world));
export function metrics(world) {
  let temperature=0, water=0, vegetation=0, wildlife=0, population=0, habitability=0, total=0;
  const air = airQuality(world);
  for (let i=0; i<world.cells.length; i++) {
    const c = world.cells[i], weight = area[Math.floor(i / WIDTH)];
    temperature += c.temperature * weight;
    water += Number(c.water > WATER_LINE) * weight;
    vegetation += clamp(c.grass + c.forest) * weight;
    const thermal = temperate(c.temperature);
    const forage = clamp((c.grass + .7*c.forest) * 1.8);
    const grazerHealth = habitat(c) * forage;
    const predatorHealth = thermal * clamp(c.herbivores * 4) * (1-c.heat);
    const aquaticHealth = thermal * clamp(c.water * 5) * clamp(1-c.ice*4) * (1-c.heat);
    wildlife += weight * (c.herbivores*grazerHealth + c.predators*predatorHealth + c.aquatic*aquaticHealth);
    population += weight * (c.herbivores + c.predators + c.aquatic);
    habitability += regionalScore(c, air) * weight;
    total += weight;
  }
  return {temperature:temperature/total, pressure:world.pressure, oxygen:world.oxygen, co2:world.co2,
    water:100*water/total, vegetation:100*vegetation/total, wildlife:population>.001 ? 100*wildlife/population : 0, abundance:100*population/total, habitability:100*habitability/total};
}

// Scratch buffers are rebuilt lazily after load and never become part of the saved world.
const buffers = new WeakMap();
function fields(world) {
  if (!buffers.has(world)) {
    const result = {};
    for (const key of ['water','cloud','grass','forest','fire','herbivores','predators','aquatic','capacity']) {
      result[key] = new Float64Array(world.cells.length);
    }
    buffers.set(world, result);
  }
  return buffers.get(world);
}
function waterCycle(world, c, row, x, sunshine) {
  const target = baseTemperature(world, c, row) + sunshine[x] * (1 - .5*c.cloud - .3*c.forest);
  c.temperature = clamp(mix(c.temperature, target, .16), -100, 100);
  c.anomaly *= .989;
  c.heat *= .94;
  const evaporationRate = clamp((c.temperature + 7)/58) * (1 - .75*c.cloud);
  const surfaceVapor = Math.min(c.water, .007 * evaporationRate);
  const soilVapor = c.moisture * .013 * evaporationRate * (1 - .60*clamp(c.forest + .4*c.grass));
  c.water -= surfaceVapor;
  c.moisture -= soilVapor;
  c.cloud = clamp(c.cloud + 1.6*(surfaceVapor + soilVapor) + .085*c.rainZone + (world.weather === 'wet' ? .018 : 0));
  c.rainZone = Math.max(0, c.rainZone - .012);
  const condensation = .33 + .22*evaporationRate - .1*c.elevation;
  c.rain = clamp((c.cloud - condensation)*.15);
  c.cloud -= c.rain;
  const precipitation = c.rain / 1.6;
  const infiltration = Math.min(precipitation, (1-c.moisture)*.028);
  c.moisture += infiltration;
  if (c.temperature < 0) {
    const freeze = Math.min(c.water, .003 - .003*c.temperature);
    c.water -= freeze; c.ice = clamp(c.ice + freeze + precipitation - infiltration);
  } else {
    const melt = Math.min(c.ice, .002*c.temperature);
    c.ice -= melt; c.water = clamp(c.water + melt + precipitation - infiltration);
  }
  const seep = Math.min(c.water, .016*(1-c.moisture));
  c.water -= seep; c.moisture += seep;
  const runoff = Math.max(0, c.moisture - .78)*(.07 - .045*c.forest);
  c.moisture -= runoff;
  c.water = clamp(c.water + runoff);
}
function habitat(c) {
  return temperate(c.temperature) * clamp((c.moisture-.05)/.30)
    * clamp(1 - Math.max(0,c.water-.075)*5) * clamp(1 - c.ice*6)
    * clamp(1 - Math.max(0,c.elevation-.72)*2.5) * (1 - c.heat);
}
function ecology(c, i, b) {
  const adjacent = links[i];
  let grassSeed=0, forestSeed=0, spark=0;
  for (const j of adjacent) {
    grassSeed += b.grass[j]; forestSeed += b.forest[j]; spark = Math.max(spark,b.fire[j]);
  }
  const fit = habitat(c), dry = clamp((.29-c.moisture)/.29);
  c.fire = clamp(Math.max(0, c.fire - .095 - c.rain*1.4) + spark * .19 * dry * clamp(c.grass+c.forest));
  const mortality = (1-fit) ** 2 * .095 + c.fire * .29;
  c.grass = clamp(c.grass + (.16*c.grass + .006*grassSeed)*fit*(1-c.grass-.55*c.forest)
    - mortality*c.grass - .013*c.herbivores*c.grass);
  c.forest = clamp(c.forest + (.105*c.forest + .002*forestSeed)*fit*(1-c.forest)
    - (mortality*.67 + c.fire*.20)*c.forest);
  const warmth = temperate(c.temperature);
  const grazerCapacity = fit * clamp(.85*c.grass + .6*c.forest);
  const hunterCapacity = warmth * clamp(c.herbivores*1.2) * (1-c.heat);
  const aquaticCapacity = clamp(c.water*4) * warmth * clamp(1-c.ice*4) * (1-c.heat);
  c.herbivores = clamp(c.herbivores*(1 + .23*(grazerCapacity-c.herbivores) - .025 - .09*c.predators - .08*(1-fit)));
  c.predators = clamp(c.predators*(1 + .23*(hunterCapacity-c.predators) - .025 - .07*(1-warmth)));
  c.aquatic = clamp(c.aquatic*(1 + .20*(aquaticCapacity-c.aquatic) - .018 - .1*(1-clamp(c.water*4))));
  b.capacity[i] = grazerCapacity;
}

function transport(world, b) {
  // All fluxes read one snapshot. A donor transfers to its steepest downhill neighbor.
  b.water.fill(0); b.cloud.fill(0); b.herbivores.fill(0); b.predators.fill(0); b.aquatic.fill(0);
  for (let i=0; i<world.cells.length; i++) {
    const c = world.cells[i], adjacent = links[i];
    let lowest=i, head=c.elevation + c.water*.53, graze=i, hunt=i, swim=i;
    for (const j of adjacent) {
      const other=world.cells[j], level=other.elevation + other.water*.53;
      if (level < head) { head=level; lowest=j; }
      if (b.capacity[j] > b.capacity[graze]) graze=j;
      if (other.herbivores > world.cells[hunt].herbivores && b.capacity[j]>.08) hunt=j;
      if (other.water > world.cells[swim].water && other.temperature>0) swim=j;
    }
    c.downstream = lowest === i ? -1 : lowest;
    c.flow = Math.min(c.water*.37, (c.elevation+c.water*.53-head)*.35, (1-world.cells[lowest].water)/4);
    b.water[i] -= c.flow; b.water[lowest] += c.flow;
    const vapor = c.cloud*.045;
    b.cloud[i] -= vapor; b.cloud[adjacent[1]] += vapor;
    // Only animals already present can migrate. They seek habitat one edge at a time.
    if (graze !== i && b.capacity[graze]>.08) {
      const migrants=c.herbivores*.045; b.herbivores[i]-=migrants; b.herbivores[graze]+=migrants;
    }
    if (hunt !== i) { const migrants=c.predators*.04; b.predators[i]-=migrants; b.predators[hunt]+=migrants; }
    if (swim !== i && c.water>.03) { const migrants=c.aquatic*.035; b.aquatic[i]-=migrants; b.aquatic[swim]+=migrants; }
  }
  for (let i=0; i<world.cells.length; i++) {
    const c=world.cells[i];
    c.water=clamp(c.water+b.water[i]); c.cloud=clamp(c.cloud+b.cloud[i]);
    c.herbivores=clamp(c.herbivores+b.herbivores[i]); c.predators=clamp(c.predators+b.predators[i]); c.aquatic=clamp(c.aquatic+b.aquatic[i]);
  }
}

export function step(world) {
  world.tick++;
  if (world.mode === 'survival') {
    const remaining = world.nextEvent - world.tick;
    if (remaining === 8) world.warning = 'Orbital forecast: a disturbance is approaching in 8 ticks.';
    if (remaining <= 0) {
      const type = DISASTERS[Math.floor(random(world)*DISASTERS.length)];
      // Direct early disturbances toward active habitats so they offer a recoverable decision.
      let index=Math.floor(random(world)*world.cells.length);
      for (let attempt=0; attempt<20; attempt++) {
        if (world.cells[index].grass+world.cells[index].forest>.15) break;
        index=Math.floor(random(world)*world.cells.length);
      }
      triggerDisaster(world,type,index);
      const weather=['normal','wet','dry','hot','cold'];
      world.weather=weather[Math.floor(random(world)*weather.length)];
      world.nextEvent=world.tick + 45 + Math.floor(random(world)*40);
      world.warning=null;
    }
  }
  const b = fields(world), sunshine = new Float64Array(WIDTH);
  for (let x=0; x<WIDTH; x++) sunshine[x]=2.4*Math.cos(TAU*(world.tick/96 + x/WIDTH));
  for (let i=0; i<world.cells.length; i++) {
    const c=world.cells[i];
    waterCycle(world, c, Math.floor(i/WIDTH), i%WIDTH, sunshine);
    b.grass[i]=c.grass; b.forest[i]=c.forest; b.fire[i]=c.fire;
  }
  let plants=0, animals=0;
  for (let i=0; i<world.cells.length; i++) {
    const c=world.cells[i];
    ecology(c,i,b);
    plants+=clamp(c.grass+c.forest); animals+=clamp(c.aquatic+c.herbivores+c.predators);
  }
  transport(world,b);
  // A limited atmosphere responds to biomass over many ticks, with respiration and gas exchange.
  const net = (plants - .3*animals) / world.cells.length;
  world.oxygen=clamp(world.oxygen + .035*net - .00008*(world.oxygen-12), .1, 32);
  world.co2=clamp(world.co2 - .0018*net + .000035*(.30-world.co2), .015, 4);
  if (world.mode !== 'sandbox') {
    const score = metrics(world);
    if (score.habitability>48 && score.vegetation>3 && score.wildlife>22 && score.abundance>.12) world.stableTicks++;
    else world.stableTicks=0;
    const dividend=world.stableTicks>0 && world.stableTicks%12===0 ? 4 : 0;
    const stipend=world.tick%8===0 ? 2 : 0;
    world.energy=Math.min(1000000,world.energy+dividend+stipend);
  }
  return world;
}
