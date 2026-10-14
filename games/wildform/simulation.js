(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Wildform = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 64, ROWS = 40, CAP = 180, STEP = .1, DAY = 120;
  const BIOMES = ['Meadow Basin', 'Wetland Hollow', 'Fungal Grove', 'Stone Ridge', 'Crystal Canopy'];
  const PLANTS = ['Grass', 'Shrubs', 'Trees', 'Algae', 'Fungi'];
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const total = a => a.reduce((s, v) => s + v, 0);
  function random(w) {
    let s = w.rng |= 0; s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    w.rng = s >>> 0; return w.rng / 4294967296;
  }
  function cellAt(w, x, y) {
    return w.cells[Math.floor(clamp(y, 0, w.rows - .001)) * w.cols + Math.floor(clamp(x, 0, w.cols - .001))];
  }
  function biomeAt(x, y) {
    // Irregular, connected regions; a stream joins the meadow to the wetland.
    if (x > 40 + 2 * Math.sin(y / 5) && y < 20) return 4;
    if (x > 42 + 3 * Math.cos(y / 4)) return 3;
    if (x < 22 + 2 * Math.sin(y / 4) && y > 21) return 2;
    if (y > 22 + 3 * Math.sin(x / 7)) return 1;
    return 0;
  }
  function createWorld(seed = 48271, options = {}) {
    const w = { version: 1, seed: seed >>> 0 || 1, rng: seed >>> 0 || 1, cols: COLS, rows: ROWS,
      time: 0, tick: 0, nextId: 1, rainfall: .38, temperature: 20, cells: [], organisms: [],
      events: [], eventTimes: {}, history: [], counters: { births: 0, deaths: 0, hunts: 0, migrations: 0, mutations: 0, fed: 0 },
      settings: { speed: 1, overlay: 'normal', muted: true }, environmentClock: 0 };
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const biome = options.biomes === false ? 0 : biomeAt(x, y);
      const n = random(w), stream = Math.abs(y - (15 + 3 * Math.sin(x / 7))) < 1.1 && x < 39;
      const pond = biome === 1 && (Math.hypot((x - 31) / 1.5, y - 31) < 5 || Math.hypot(x - 13, y - 32) < 3);
      const water = stream ? .24 : pond ? .55 : 0;
      const elevation = water ? .14 : [.4, .23, .43, .73, .55][biome] + .09 * Math.sin(x / 6) * Math.cos(y / 6) + n * .035;
      const plants = [[.32, .15, .17, 0, .01], [.18, .22, .06, .15, .04], [.05, .12, .26, 0, .24], [.1, .09, .04, 0, .01], [.15, .15, .22, 0, .09]][biome].map(v => v * (.65 + n * .5));
      if (water > .3) { plants[0] *= .15; plants[1] *= .2; plants[2] = 0; plants[3] = .3; }
      w.cells.push({ biome, elevation: clamp(elevation), moisture: water ? .9 : [.55, .78, .7, .25, .58][biome],
        temperature: 20 - elevation * 7, plants, vegetation: total(plants), nutrients: .55 + n * .3, water, detritus: biome === 2 ? .22 : .05, pollen: 0 });
    }
    if (options.organisms !== false && typeof populate === 'function') populate(w, options);
    return w;
  }
  function flowWater(w, dt) {
    // Pairwise flux is removed from the donor before adding to its neighbor.
    // Alternate sweep direction to avoid a permanent directional bias.
    const forward = w.tick % 2 === 0;
    const pair = (a, b) => {
      const diff = a.elevation + a.water - b.elevation - b.water;
      const donor = diff > 0 ? a : b, receiver = diff > 0 ? b : a;
      const flux = Math.min(donor.water, 1 - receiver.water, Math.abs(diff) * .3 * dt);
      donor.water -= flux; receiver.water += flux;
    };
    for (let k = 0; k < w.cells.length; k++) {
      const i = forward ? k : w.cells.length - 1 - k;
      if (i % w.cols < w.cols - 1) pair(w.cells[i], w.cells[i + 1]);
      if (i + w.cols < w.cells.length) pair(w.cells[i], w.cells[i + w.cols]);
    }
  }
  function growPlants(w, dt) {
    const rates = [.0045, .0018, .0008, .005, .003];
    for (const c of w.cells) {
      const warmth = clamp(1 - Math.abs(c.temperature - 21) / 25);
      const room = clamp(1 - total(c.plants));
      for (let p = 0; p < 5; p++) {
        const wet = p === 3 ? clamp(c.water * 5) : p === 4 ? c.moisture : clamp(c.moisture * 1.7) * clamp(1 - c.water * 2.4);
        const suitable = p === 4 ? (c.biome === 2 ? 1 : .35) : p === 2 && c.biome === 3 ? .25 : 1;
        const grow = Math.min(c.nutrients / .32, rates[p] * (.04 + c.plants[p]) * room * wet * warmth * suitable * (1 + c.pollen * .4) * dt);
        const decay = c.plants[p] * (.0002 + (1 - wet * warmth) * .001) * dt;
        c.plants[p] = clamp(c.plants[p] + grow - decay);
        c.nutrients = clamp(c.nutrients - grow * .32);
        c.detritus = clamp(c.detritus + decay * .65, 0, 2);
      }
      // Slow abiotic decay permits recovery even when decomposers are absent.
      const decay = Math.min(c.detritus, .00003 * dt);
      c.detritus -= decay; c.nutrients = clamp(c.nutrients + decay * .65);
      c.pollen = Math.max(0, c.pollen - .004 * dt);
      c.vegetation = total(c.plants);
    }
  }
  function environment(w, dt) {
    const season = Math.floor(w.time / (DAY * 6)) % 4;
    const seasonalTemp = [0, 6, -2, -8][season], rain = w.rainfall * [1.2, .75, 1, .85][season];
    const daylight = Math.sin(w.time / DAY * Math.PI * 2 - Math.PI / 2);
    for (const c of w.cells) {
      c.temperature = w.temperature + seasonalTemp + daylight * 2 - c.elevation * 7 + (c.biome === 2 ? -1.5 : 0);
      const input = rain * .00036 * dt, evaporation = .00038 * clamp((c.temperature + 10) / 35, .1, 1.5) * dt;
      // Dry soil and thin water films evaporate less. This gives normal rainfall
      // a stable equilibrium while deliberate drought still depletes resources.
      c.water = clamp(c.water + input - evaporation * clamp(c.water * 8));
      c.moisture = clamp(c.moisture + (rain * .0015 + c.water * .004 - .0012 * c.moisture * (1+c.elevation*.3) * clamp((c.temperature + 5) / 25, .1, 2)) * dt);
    }
    flowWater(w, dt); growPlants(w, dt);
  }
  const SPECIES = {
    mossback: { name: 'Mossback', role: 'grazer', diet: 'Grass & shrubs', biomes: [0,1], food: [0,1], speed: .52, size: .34, color: '#abc078', water: .36, cliff: .25, temp: 19, moisture: .58, night: .1, lifespan: 1400, maturity: 50, breed: 95, cap: 32, cost: .13, vision: 5 },
    duskstalker: { name: 'Duskstalker', role: 'predator', diet: 'Hoppers, moths & reedskippers', biomes: [3,0,2], prey: ['mossback','hopper','glowmoth','reedskipper'], speed: 1.22, size: .25, color: '#db9871', water: .24, cliff: .36, temp: 18, moisture: .4, night: .65, lifespan: 1500, maturity: 75, breed: 160, cap: 12, cost: .19, vision: 6 }
  };
  Object.assign(SPECIES, {
    spritebeetle: { name:'Spritebeetle',role:'decomposer',diet:'Dead organic material',biomes:[0,2],speed:.8,size:.12,color:'#e1af68',temp:20,moisture:.6,night:.25,cost:.11,breed:70,cap:28 },
    glowmoth: { name:'Glowmoth',role:'pollinator',diet:'Flowering shrubs · pollinates plants',biomes:[2,4,0],food:[1],flying:true,speed:.9,size:.16,color:'#e1d5ae',temp:17,moisture:.63,night:.95,cost:.11,breed:80,cap:25 },
    hopper: { name:'Meadow Hopper',role:'grazer',diet:'Grass & young shrubs',biomes:[0,3],food:[0,1],speed:1.15,size:.2,color:'#ccad81',temp:20,moisture:.45,night:.1,cost:.13,breed:72,cap:32 },
    reedskipper: { name:'Reedskipper',role:'omnivore',diet:'Algae & wetland grasses',biomes:[1],food:[3,0],speed:.95,size:.2,color:'#8cbcac',water:1,temp:19,moisture:.8,night:.4,cost:.12,breed:85,cap:28 },
    ridgeclaw: { name:'Ridgeclaw',role:'predator',diet:'Mossbacks, hoppers & reedskippers',biomes:[3],prey:['mossback','hopper','reedskipper'],territorial:true,cliff:.6,speed:1.02,size:.36,color:'#afa9a1',temp:16,moisture:.3,night:.3,cost:.17,breed:200,cap:9,vision:7 },
    sporekeeper: { name:'Sporekeeper',role:'decomposer',diet:'Decay · enriches fungal soil',biomes:[2],speed:.38,size:.19,color:'#c59bbd',temp:17,moisture:.72,night:.8,cost:.09,breed:95,cap:24 },
    crystalfinch: { name:'Crystalfinch',role:'seeder',diet:'Shrubs & canopy seeds · spreads plants',biomes:[4,0],food:[1,2],flying:true,speed:1.4,size:.19,color:'#a5d9d7',temp:19,moisture:.6,night:.15,cost:.12,breed:105,cap:24 },
    luminant: { name:'Luminant',role:'grazer',diet:'Canopy plants & fungi',biomes:[4],food:[1,4],speed:.66,size:.24,color:'#c8b0e9',temp:17,moisture:.58,night:.8,cost:.1,breed:125,cap:18 }
  });
  for (const [key,s] of Object.entries(SPECIES)) SPECIES[key]={water:.3,cliff:.28,lifespan:1200,maturity:45,vision:5,...s};
  // Duskstalkers favor smaller prey; Mossbacks are hunted by Ridgeclaws.
  SPECIES.duskstalker.prey=['hopper','glowmoth','reedskipper','spritebeetle'];
  function event(w, text, key = text, interval = 12) {
    if (w.eventTimes[key] !== undefined && w.time - w.eventTimes[key] < interval) return;
    w.eventTimes[key] = w.time;
    w.events.unshift({ time: w.time, text });
    if (w.events.length > 60) w.events.length = 60;
    const keys = Object.keys(w.eventTimes);
    if (keys.length > 150) for (const k of keys) if (w.time - w.eventTimes[k] > 300) delete w.eventTimes[k];
  }
  function spawn(w, species, x, y, traits = null) {
    const s = SPECIES[species];
    if (!s || w.organisms.length >= CAP || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    x = clamp(x, .1, w.cols - .1); y = clamp(y, .1, w.rows - .1);
    const a = { id: w.nextId++, species, x, y, vx: 0, vy: 0, angle: random(w) * Math.PI * 2,
      age: s.maturity + random(w) * 80, energy: 65 + random(w) * 20, hydration: 65 + random(w) * 30, health: 100,
      behavior: 'EXPLORE', target: null, decision: random(w), cooldown: 20 + random(w) * s.breed, attackCooldown: 0,
      traits: traits || { speed: .9 + random(w) * .2, efficiency: .92 + random(w) * .16, temperature: s.temp + (random(w) - .5) * 3,
        moisture: s.moisture + (random(w) - .5) * .08, night: s.night, marking: random(w) < .1 ? 1 : 0 },
      preferences: { biomes: [...s.biomes] }, generation: 0, home: { x, y }, lastBiome: cellAt(w,x,y).biome,
      stuck: 0, routeCooldown: 0, targetTime: w.time, path: null, dead: false };
    w.organisms.push(a); w._buckets=null; w._ids=null; return a;
  }
  function populate(w) {
    const counts={spritebeetle:10,glowmoth:8,hopper:13,mossback:10,reedskipper:10,duskstalker:3,ridgeclaw:2,sporekeeper:8,crystalfinch:7,luminant:5};
    for (const [key,n] of Object.entries(counts)) for(let i=0;i<n;i++) {
      const s=SPECIES[key]; let x=10,y=10;
      for(let tries=0;tries<200;tries++) {
        x=.5+random(w)*(w.cols-1);y=.5+random(w)*(w.rows-1);const c=cellAt(w,x,y);
        if(s.biomes.includes(c.biome)&&(s.flying||c.water<s.water)) break;
      }
      const a=spawn(w,key,x,y);a.cooldown=10+random(w)*45;
    }
    event(w,'An interconnected world awakens. Ten species, five habitats.','welcome',0);
  }
  function canBreed(w,a) {
    const s=SPECIES[a.species],c=cellAt(w,a.x,a.y);
    return !a.dead && a.age>=s.maturity && a.health>72 && a.energy>78 && a.hydration>48 && a.cooldown<=0 && suitable(c,a)>.6 &&
      w.organisms.length<CAP && w.organisms.filter(b=>b.species===a.species && !b.dead).length<s.cap && nearby(w,a,2.5).length<8;
  }
  function reproduce(w,a,b) {
    if (a.id===b.id||a.species!==b.species||Math.hypot(a.x-b.x,a.y-b.y)>1||!canBreed(w,a)||!canBreed(w,b)) return null;
    const s=SPECIES[a.species],traits={};
    for (const key of ['speed','efficiency','temperature','moisture','night']) {
      const variation={speed:.06,efficiency:.045,temperature:1.1,moisture:.045,night:.05}[key];
      traits[key]=(a.traits[key]+b.traits[key])/2+(random(w)-.5)*variation*2;
    }
    traits.speed=clamp(traits.speed,.65,1.4);traits.efficiency=clamp(traits.efficiency,.7,1.3);
    traits.temperature=clamp(traits.temperature,0,36);traits.moisture=clamp(traits.moisture,.1,.95);traits.night=clamp(traits.night);
    const crystal=cellAt(w,a.x,a.y).biome===4;
    const mutation=random(w)<(crystal?.07:.015);
    traits.marking=mutation?2:(random(w)<.5?a.traits.marking:b.traits.marking);
    const child=spawn(w,a.species,(a.x+b.x)/2,(a.y+b.y)/2,traits);
    if (!child) return null;
    child.age=0;child.energy=58;child.generation=Math.max(a.generation,b.generation)+1;child.cooldown=s.breed;
    a.energy-=24;b.energy-=24;a.cooldown=s.breed;b.cooldown=s.breed;
    w.counters.births++;event(w,`A ${s.name.toLowerCase()} was born. Generation ${child.generation}.`,'birth-'+a.species,25);
    if (mutation) { w.counters.mutations++;event(w,`Rare luminous markings appeared in a ${s.name.toLowerCase()}.`,'mutation-'+a.species,60); }
    return child;
  }
  function spatial(w) {
    const buckets = new Map();
    for (const a of w.organisms) if (!a.dead) {
      const key = Math.floor(a.x / 4) + ',' + Math.floor(a.y / 4);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(a);
    }
    w._buckets = buckets; w._ids = new Map(w.organisms.map(a => [a.id, a]));
  }
  function nearby(w, a, radius) {
    if (!w._buckets) spatial(w);
    const result = [], bx = Math.floor(a.x / 4), by = Math.floor(a.y / 4), r = Math.ceil(radius / 4);
    for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) {
      const bucket = w._buckets.get(x + ',' + y);
      if (bucket) for (const b of bucket) if (!b.dead && b.id !== a.id && Math.hypot(a.x - b.x, a.y - b.y) < radius) result.push(b);
    }
    return result;
  }
  function food(c, s) { return s.food ? total(s.food.map(p => c.plants[p])) : s.role === 'decomposer' ? c.detritus : 0; }
  function suitable(c, a) {
    const s = SPECIES[a.species];
    return clamp(1 - Math.abs(c.temperature - a.traits.temperature) / 22) * .5 + clamp(1 - Math.abs(c.moisture - a.traits.moisture) * 1.7) * .25 + (s.biomes.includes(c.biome) ? .25 : 0);
  }
  function passable(w, a, x, y, from = null) {
    if (x < .1 || y < .1 || x >= w.cols - .1 || y >= w.rows - .1) return false;
    const s = SPECIES[a.species], c = cellAt(w,x,y);
    if (s.flying) return true;
    if (c.water > s.water) return false;
    if (from && Math.abs(c.elevation - from.elevation) > s.cliff) return false;
    return true;
  }
  function habitatTarget(w, a, mode) {
    const s = SPECIES[a.species]; let best = -Infinity, target = null;
    const radius = mode === 'MIGRATE' ? 16 : s.vision;
    // Include the current cell; hungry grazers should not walk away from food.
    for (let i = 0; i < 42; i++) {
      const angle = random(w) * Math.PI * 2, r = i === 0 ? 0 : Math.sqrt(random(w)) * radius;
      const x = clamp(a.x + Math.cos(angle) * r, .5, w.cols - .5), y = clamp(a.y + Math.sin(angle) * r, .5, w.rows - .5), c = cellAt(w,x,y);
      if (!passable(w,a,x,y)) continue;
      let value = suitable(c,a) * .4 - r * .025;
      if (mode === 'FORAGE') value += food(c,s) * 3;
      else if (mode === 'DRINK') value += Math.min(c.water * 8, 1) * 3 + Math.max(0,c.moisture - .78) * 2;
      else if (mode === 'MIGRATE') {
        value += suitable(c,a) * 2 + food(c,s) * 1.5 + Math.min(c.water * 3, .3);
        // Predators migrate toward real prey availability, not plant biomass.
        if(s.prey) value+=Math.min(3,nearby(w,{id:-1,x,y},6).filter(b=>s.prey.includes(b.species)).length)*.8;
      }
      else value += random(w) * .35 + (r > 2 ? .2 : 0);
      if (s.territorial && mode !== 'MIGRATE') value -= Math.hypot(x - a.home.x,y - a.home.y) * .035;
      if (value > best) { best = value; target = { x: i === 0 ? a.x : Math.floor(x) + .5, y: i === 0 ? a.y : Math.floor(y) + .5 }; }
    }
    return target;
  }
  function setTarget(w, a, behavior, target) {
    const changed = !a.target || !target || a.behavior !== behavior || Math.hypot(a.target.x - target.x, a.target.y - target.y) > 1;
    a.behavior = behavior; a.target = target;
    if (changed) { a.path = null; a.targetTime = w.time; a.stuck = 0; }
  }
  function decide(w, a) {
    if (a.dead) return;
    const s = SPECIES[a.species], c = cellAt(w,a.x,a.y), neighbors = nearby(w,a,s.vision);
    const threat = neighbors.filter(b => (SPECIES[b.species].prey || []).includes(a.species)).sort((b,d) => Math.hypot(b.x-a.x,b.y-a.y) - Math.hypot(d.x-a.x,d.y-a.y))[0];
    if (threat && Math.hypot(threat.x-a.x,threat.y-a.y) < 3.5) {
      const dx = a.x - threat.x || .2, dy = a.y - threat.y || .2, d = Math.hypot(dx,dy);
      setTarget(w,a,'FLEE',{ x: clamp(a.x + dx/d * 4,.5,w.cols-.5), y: clamp(a.y + dy/d * 4,.5,w.rows-.5) }); return;
    }
    if (a.hydration < 38 || (a.behavior==='DRINK' && a.hydration<88)) { setTarget(w,a,'DRINK',habitatTarget(w,a,'DRINK')); return; }
    if (s.prey && a.energy < 75) {
      const prey = neighbors.filter(b => s.prey.includes(b.species)).sort((b,d) => Math.hypot(b.x-a.x,b.y-a.y) - Math.hypot(d.x-a.x,d.y-a.y))[0];
      if (prey) { setTarget(w,a,'HUNT',{ id: prey.id, x: prey.x, y: prey.y }); return; }
    }
    if (suitable(c,a) < .57 || (a.energy < 60 && (s.prey ? !neighbors.some(b=>s.prey.includes(b.species)) : food(c,s) < .08)) || neighbors.length > 12) {
      setTarget(w,a,'MIGRATE',habitatTarget(w,a,'MIGRATE')); return;
    }
    if (!s.prey && (a.energy < 68 || (a.behavior==='FORAGE' && a.energy<90))) { setTarget(w,a,'FORAGE',habitatTarget(w,a,'FORAGE')); return; }
    const night = (w.time % DAY) / DAY < .22 || (w.time % DAY) / DAY > .78;
    const active = night ? a.traits.night > .4 : a.traits.night < .7;
    if (!active && a.energy > 35) { setTarget(w,a,'REST',null); return; }
    if (typeof canBreed === 'function' && canBreed(w,a)) {
      const mate = nearby(w,a,s.territorial?14:8).find(b => b.species === a.species && canBreed(w,b));
      if (mate) { setTarget(w,a,'MATE',{ id:mate.id,x:mate.x,y:mate.y }); return; }
    }
    if (s.territorial) {
      const rival = neighbors.find(b=>b.species===a.species && b.id<a.id && Math.hypot(b.x-a.x,b.y-a.y)<2);
      if (rival) { setTarget(w,a,'MIGRATE',habitatTarget(w,a,'MIGRATE')); return; }
    }
    if (a.target && w.time - a.targetTime < 9 && Math.hypot(a.target.x-a.x,a.target.y-a.y) > .4) return;
    setTarget(w,a,'EXPLORE',habitatTarget(w,a,'EXPLORE'));
  }
  function route(w, a, target) {
    // Bounded breadth-first search, only after an obstacle blocks direct travel.
    const start = Math.floor(a.y)*w.cols+Math.floor(a.x), goal = Math.floor(target.y)*w.cols+Math.floor(target.x);
    const queue = [start], parents = new Map([[start,-1]]); let found = false;
    for (let head=0; head<queue.length && head<700; head++) {
      const i=queue[head]; if (i===goal) { found=true; break; }
      const x=i%w.cols,y=Math.floor(i/w.cols);
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx,ny=y+dy,j=ny*w.cols+nx;
        if (nx<0||ny<0||nx>=w.cols||ny>=w.rows||parents.has(j)||!passable(w,a,nx+.5,ny+.5,w.cells[i])) continue;
        parents.set(j,i); queue.push(j);
      }
    }
    if (!found) return null;
    const path=[]; let i=goal;
    while(i!==start) { path.unshift({x:i%w.cols+.5,y:Math.floor(i/w.cols)+.5}); i=parents.get(i); }
    return path;
  }
  function move(w,a,dt) {
    const s=SPECIES[a.species]; let target=a.path && a.path.length ? a.path[0] : a.target;
    if (!target) { a.vx *= .5; a.vy *= .5; return; }
    let dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);
    if (a.path && d<.24) { a.path.shift(); target=a.path.length?a.path[0]:a.target; dx=target.x-a.x;dy=target.y-a.y;d=Math.hypot(dx,dy); }
    if (d<.16) { a.vx=0;a.vy=0; return; }
    const speed=s.speed*a.traits.speed*(a.behavior==='FLEE'?1.5:a.behavior==='HUNT'?1.15:1)*Math.min(1,d*2);
    const blend=1-Math.exp(-dt*7);
    a.vx+=(dx/d*speed-a.vx)*blend; a.vy+=(dy/d*speed-a.vy)*blend;
    const nx=a.x+a.vx*dt,ny=a.y+a.vy*dt,c=cellAt(w,a.x,a.y);
    if (passable(w,a,nx,ny,c)) { a.x=nx;a.y=ny;a.stuck=0; }
    else {
      a.stuck+=dt;
      if (!a.path && a.stuck>.2 && a.routeCooldown<=0) { a.path=route(w,a,a.target);a.routeCooldown=2; }
      if (passable(w,a,nx,a.y,c)) a.x=nx;
      else if (passable(w,a,a.x,ny,c)) a.y=ny;
      else { a.vx=0;a.vy=0; }
      if (a.stuck>2 || w.time-a.targetTime>16) { a.target=null;a.path=null;a.decision=0;a.stuck=0; }
    }
    if (Math.hypot(a.vx,a.vy)>.03) {
      let diff=Math.atan2(a.vy,a.vx)-a.angle; diff=Math.atan2(Math.sin(diff),Math.cos(diff)); a.angle+=diff*blend;
    }
    const biome=cellAt(w,a.x,a.y).biome;
    if (biome!==a.lastBiome) {
      w.counters.migrations++; event(w,`${s.name} crossed into ${BIOMES[biome]}.`,'migration-'+a.species+'-'+biome,45);
      a.lastBiome=biome;
      if (s.territorial) { a.home={x:a.x,y:a.y}; event(w,`${s.name} established a new range.`,'territory-'+a.species,90); }
    }
  }
  function die(w,a,cause) {
    if (a.dead) return;
    a.dead=true; w.counters.deaths++;
    const c=cellAt(w,a.x,a.y); c.detritus=clamp(c.detritus+(cause==='predation'?.06:.22),0,2);
  }
  function act(w,a,dt) {
    const s=SPECIES[a.species],c=cellAt(w,a.x,a.y);
    if (a.target && a.target.id) {
      const b=w._ids?w._ids.get(a.target.id):w.organisms.find(b=>b.id===a.target.id);
      if (!b||b.dead) { a.target=null;a.path=null;a.decision=0;return; }
      a.target.x=b.x; a.target.y=b.y;
    }
    const close=a.target && Math.hypot(a.target.x-a.x,a.target.y-a.y)<.65;
    if (a.behavior==='REST'||a.behavior==='IDLE') { a.vx=0;a.vy=0; }
    else if (a.behavior==='FORAGE' && food(c,s)>.01 && (close||!a.target)) {
      a.vx=0;a.vy=0;
      const amount=Math.min(food(c,s), .009*dt, (100-a.energy)/(520*a.traits.efficiency));
      if (s.role==='decomposer') { c.detritus-=amount;c.nutrients=clamp(c.nutrients+amount*.68); }
      else {
        let left=amount;
        for (const p of s.food) { const take=Math.min(c.plants[p],left);c.plants[p]-=take;left-=take; }
        c.vegetation=total(c.plants); c.detritus=clamp(c.detritus+amount*.08,0,2);
      }
      a.energy=clamp(a.energy+amount*520*a.traits.efficiency,0,100); w.counters.fed+=amount;
      if (s.role==='pollinator') c.pollen=clamp(c.pollen+dt*.1);
      if (s.role==='seeder' && c.nutrients>.03) { c.plants[1]=clamp(c.plants[1]+.0005*dt,0,1-total(c.plants)+c.plants[1]);c.nutrients-=.00016*dt;c.vegetation=total(c.plants); }
    } else if (a.behavior==='DRINK' && (c.water>.015||c.moisture>.82) && close) {
      a.vx=0;a.vy=0;
      const amount=Math.min(c.water,.001*dt,(100-a.hydration)/10000);
      c.water-=amount; a.hydration=clamp(a.hydration+amount*10000+(c.moisture>.82?1.5*dt:0),0,100);
    } else if (a.behavior==='HUNT' && close && a.attackCooldown<=0) {
      const prey=w.organisms.find(b=>b.id===a.target.id && !b.dead);
      if (prey && s.prey.includes(prey.species)) {
        die(w,prey,'predation');a.energy=clamp(a.energy+48,0,100);a.attackCooldown=12;w.counters.hunts++;
        event(w,`${s.name} caught a ${SPECIES[prey.species].name.toLowerCase()}.`,'hunt-'+a.species,35);
        a.target=null;a.decision=0;
      }
    } else if (a.behavior==='MATE' && close && typeof reproduce==='function') {
      const mate=w.organisms.find(b=>b.id===a.target.id); if (mate) reproduce(w,a,mate);
      a.target=null;a.decision=0;
    } else move(w,a,dt);
  }
  function removeDead(w) { w.organisms=w.organisms.filter(a=>!a.dead); }
  function step(w, dt=STEP) {
    w.time+=dt;w.tick++;
    w.environmentClock+=dt;
    if (w.environmentClock>=1) { environment(w,w.environmentClock);w.environmentClock=0; }
    spatial(w);
    const original=[...w.organisms];
    for (const a of original) {
      if(a.dead) continue;
      const s=SPECIES[a.species],c=cellAt(w,a.x,a.y);
      a.age+=dt;a.cooldown=Math.max(0,a.cooldown-dt);a.attackCooldown=Math.max(0,a.attackCooldown-dt);a.routeCooldown=Math.max(0,(a.routeCooldown||0)-dt);
      const mismatch=Math.abs(c.temperature-a.traits.temperature);
      const effort=a.behavior==='REST'?.45:1+Math.hypot(a.vx,a.vy)*.25;
      a.energy=clamp(a.energy-s.cost*effort*dt/a.traits.efficiency,0,100);
      a.hydration=clamp(a.hydration-(.1+Math.max(0,c.temperature-24)*.006)*dt,0,100);
      const harm=(a.energy<4?.9:0)+(a.hydration<3?.55:0)+(mismatch>16?(mismatch-16)*.055:0);
      a.health=clamp(a.health+(harm>0?-harm:.13)*dt,0,100);
      if(a.health<=0||a.age>s.lifespan) { die(w,a,a.health<=0?'conditions':'age');continue; }
      a.decision-=dt;
      if(a.decision<=0) { decide(w,a);a.decision=.8+random(w)*.4; }
      act(w,a,dt);
    }
    removeDead(w);
    if(w.tick%100===0) recordHistory(w);
  }
  function advance(w, elapsed, speed=w.settings.speed) {
    if(![0,1,2,4,8].includes(speed)||!Number.isFinite(elapsed)||elapsed<=0||speed===0) return 0;
    w._accumulator=(w._accumulator||0)+Math.min(.25,elapsed)*speed;
    let n=0;
    while(w._accumulator+1e-10>=STEP && n<24) { step(w);w._accumulator=Math.max(0,w._accumulator-STEP);n++; }
    return n;
  }
  function paint(w,tool,x,y,radius=1.8,species='mossback',plant='auto') {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=w.cols||y>=w.rows) return 0;
    radius=clamp(Number(radius)||1.8,.6,4);let changed=0;
    if(tool==='species') {
      const s=SPECIES[species];if(!s) return 0;
      for(let i=0;i<3;i++) {
        const px=clamp(x+(random(w)-.5)*1.8,.1,w.cols-.1),py=clamp(y+(random(w)-.5)*1.8,.1,w.rows-.1);
        if(passable(w,{species},px,py) && spawn(w,species,px,py)) changed++;
      }
      if(changed) event(w,`${changed} ${s.name.toLowerCase()}${changed>1?'s':''} introduced.`,'introduced-'+species,2);
      return changed;
    }
    for(let iy=Math.max(0,Math.floor(y-radius));iy<=Math.min(w.rows-1,Math.ceil(y+radius));iy++) {
      for(let ix=Math.max(0,Math.floor(x-radius));ix<=Math.min(w.cols-1,Math.ceil(x+radius));ix++) {
        const d=Math.hypot(ix+.5-x,iy+.5-y);if(d>radius)continue;
        const c=w.cells[iy*w.cols+ix],strength=(1-d/(radius+.5));
        if(tool==='raise') c.elevation=clamp(c.elevation+.045*strength);
        else if(tool==='lower') c.elevation=clamp(c.elevation-.045*strength);
        else if(tool==='water') { c.water=clamp(c.water+.12*strength);c.moisture=clamp(c.moisture+.12*strength); }
        else if(tool==='plant') {
          const p=plant==='auto'?(c.water>.2?3:c.biome===2?4:c.biome===4?1:0):Number(plant);
          if(!Number.isInteger(p)||p<0||p>4)continue;
          c.plants[p]+=Math.min(clamp(1-total(c.plants)),.13*strength);c.vegetation=total(c.plants);
        } else continue;
        changed++;
      }
    }
    return changed;
  }
  function stats(w) {
    const counts={},biomes=BIOMES.map(()=>({total:0,species:new Set()})),energies={};
    for(const k of Object.keys(SPECIES)) { counts[k]=0;energies[k]=0; }
    for(const a of w.organisms) if(!a.dead) { counts[a.species]++;energies[a.species]+=a.energy;const b=biomes[cellAt(w,a.x,a.y).biome];b.total++;b.species.add(a.species); }
    const foodMean=total(w.cells.map(c=>c.vegetation))/w.cells.length,waterMean=total(w.cells.map(c=>c.water))/w.cells.length;
    const prior=w.history.length>3?w.history[w.history.length-4].total:w.organisms.length;
    return {counts,energies,biomes,biodiversity:Object.values(counts).filter(n=>n>0).length,food:foodMean,water:waterMean,
      moisture:total(w.cells.map(c=>c.moisture))/w.cells.length,pressure:w.organisms.length/CAP,trend:w.organisms.length-prior};
  }
  function recordHistory(w) {
    const s=stats(w);w.history.push({time:w.time,total:w.organisms.length,counts:s.counts,food:s.food,water:s.water});
    if(w.history.length>120)w.history.shift();
    if(w.history.length>=4) {
      const prior=w.history[w.history.length-4];
      for(const k of Object.keys(SPECIES)) {
        if(prior.counts[k]>0&&s.counts[k]===0) event(w,`${SPECIES[k].name} is absent. Restore its habitat and reintroduce it.`,'absent-'+k,180);
        if(prior.counts[k]>=2&&s.counts[k]>=prior.counts[k]*1.5) event(w,`${SPECIES[k].name} population is expanding.`,'expanding-'+k,120);
      }
    }
  }
  function serialize(w) {
    const { _buckets,_ids,_accumulator,...data }=w;return JSON.stringify(data);
  }
  function restore(text) {
    try {
      if(typeof text!=='string'||text.length>3000000)return null;
      const w=JSON.parse(text),num=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
      if(!w||w.version!==1||w.cols!==COLS||w.rows!==ROWS||!Array.isArray(w.cells)||w.cells.length!==COLS*ROWS||!Array.isArray(w.organisms)||w.organisms.length>CAP)return null;
      if(!num(w.rng,1,4294967295)||!num(w.seed,1,4294967295)||!num(w.time,0,1e12)||!num(w.tick,0,1e13)||!num(w.nextId,1,1e12)||!num(w.rainfall,0,1)||!num(w.temperature,-5,40)||!num(w.environmentClock,0,2))return null;
      for(const c of w.cells) {
        if(!Number.isInteger(c.biome)||c.biome<0||c.biome>4||!Array.isArray(c.plants)||c.plants.length!==5||!c.plants.every(v=>num(v,0,1))||total(c.plants)>1.000001)return null;
        if(!['elevation','moisture','nutrients','water','pollen','vegetation'].every(k=>num(c[k],0,1))||!num(c.detritus,0,2)||!num(c.temperature,-30,60))return null;
        if(Math.abs(c.vegetation-total(c.plants))>.00001)return null;
      }
      const ids=new Set();
      for(const a of w.organisms) {
        if(!SPECIES[a.species]||!Number.isInteger(a.id)||a.id<1||a.id>=w.nextId||ids.has(a.id)||!num(a.x,.1,COLS-.1)||!num(a.y,.1,ROWS-.1))return null;
        ids.add(a.id);
        if(!['energy','hydration','health'].every(k=>num(a[k],0,100))||!num(a.age,0,100000)||!num(a.cooldown,0,10000)||!num(a.attackCooldown,0,100)||!num(a.generation,0,100000))return null;
        if(a.routeCooldown===undefined)a.routeCooldown=0;
        if(!num(a.routeCooldown,0,2)||!num(a.vx,-10,10)||!num(a.vy,-10,10)||!num(a.angle,-1e8,1e8)||!num(a.decision,-1,2)||!num(a.stuck,0,100)||!num(a.targetTime,0,w.time)||!Number.isInteger(a.lastBiome)||a.lastBiome<0||a.lastBiome>4)return null;
        if(!a.home||!num(a.home.x,.1,COLS-.1)||!num(a.home.y,.1,ROWS-.1))return null;
        if(!a.traits||!num(a.traits.speed,.65,1.4)||!num(a.traits.efficiency,.7,1.3)||!num(a.traits.temperature,0,36)||!num(a.traits.moisture,.1,.95)||!num(a.traits.night,0,1)||![0,1,2].includes(a.traits.marking))return null;
        if(!['IDLE','EXPLORE','FORAGE','DRINK','FLEE','HUNT','REST','MATE','MIGRATE'].includes(a.behavior))return null;
        if(a.target && (!num(a.target.x,0,COLS)||!num(a.target.y,0,ROWS)||(a.target.id!==undefined&&!Number.isInteger(a.target.id))))return null;
        if(a.path && (!Array.isArray(a.path)||a.path.length>700||!a.path.every(p=>num(p.x,0,COLS)&&num(p.y,0,ROWS))))return null;
        a.dead=false;a.preferences={biomes:[...SPECIES[a.species].biomes]};
      }
      for(const a of w.organisms) if(a.target&&a.target.id&&!ids.has(a.target.id)){a.target=null;a.path=null;}
      if(!w.counters||!['births','deaths','hunts','migrations','mutations','fed'].every(k=>num(w.counters[k],0,1e12)))return null;
      if(!Array.isArray(w.events)||w.events.length>60||!w.events.every(e=>num(e.time,0,w.time)&&typeof e.text==='string'&&e.text.length<500))return null;
      if(!Array.isArray(w.history)||w.history.length>120||!w.history.every(h=>num(h.time,0,w.time)&&num(h.total,0,CAP)&&num(h.food,0,1)&&num(h.water,0,1)&&h.counts&&Object.keys(SPECIES).every(k=>num(h.counts[k],0,CAP))))return null;
      if(!w.eventTimes||typeof w.eventTimes!=='object'||Object.keys(w.eventTimes).length>150||!Object.values(w.eventTimes).every(v=>num(v,0,w.time)))return null;
      if(!w.settings||![0,1,2,4,8].includes(w.settings.speed)||!['normal','moisture','temperature','population','biodiversity','territory'].includes(w.settings.overlay)||typeof w.settings.muted!=='boolean')return null;
      // Runtime caches and timing accumulators are never trusted save data.
      delete w._accumulator;delete w._buckets;delete w._ids;
      return w;
    } catch { return null; }
  }
  return { COLS, ROWS, CAP, STEP, DAY, BIOMES, PLANTS, SPECIES, clamp, random, total, cellAt, createWorld, flowWater, growPlants, environment,
    spawn, spatial, nearby, food, suitable, passable, decide, act, move, die, removeDead, step, event, canBreed, reproduce,
    advance, paint, stats, serialize, restore };
});
