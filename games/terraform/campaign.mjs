import {createWorld, metrics, neighbors, triggerDisaster} from './simulation.mjs';

const hydrology = ['moisten', 'water', 'rain'];
const pioneers = [...hydrology, 'grass'];
const basins = [...pioneers, 'raise', 'lower', 'valley', 'drain'];
const climate = [...basins, 'warm', 'cool'];
const air = [...climate, 'atmosphere'];
const woodland = [...air, 'forest'];
const geology = [...woodland, 'mountain', 'dry'];
const fauna = [...geology, 'herbivores', 'predators', 'aquatic'];

function mission(name, objective, tools, budget, duration, stage) {
  return {name, objective, tools, budget, duration, stage};
}

export const MISSIONS = [
  mission('The First Rain', 'Moisten the marked region and establish a rainfall zone. Keep soil moisture above 30% while rain falls for 5 days.', hydrology, 65, 5, 1),
  mission('Green Beginnings', 'Plant grass across the marked survey sector. Cover 35% of its suitable land with living vegetation for 6 days.', pioneers, 85, 6, 1),
  mission('A Place for Water', 'Fill the marked basin. Maintain at least 18% liquid depth in the basin and wet ground in two neighboring regions for 8 days.', basins, 95, 8, 1),
  mission('The Warm Frontier', 'Warm the marked cold frontier to 8–28 °C while keeping the planetary mean below 25 °C for 8 days.', climate, 105, 8, 1),
  mission('Breath of Life', 'Condition the atmosphere to 0.85–1.15 bar, 15–24% oxygen and at most 0.4% carbon dioxide for 8 days.', air, 110, 8, 1),
  mission('Forest Keeper', 'Plant a woodland in the marked sector. Sustain six forested regions with moist soil for 10 days.', woodland, 115, 10, 2),
  mission('River Maker', 'Carve the marked saddle and add water one region west. Sustain a downhill stream across the saddle into the eastern basin for 4 days.', geology, 125, 4, 2),
  mission('The Frozen World', 'Warm the frozen planet. Hold the global mean above 1 °C and thaw the marked icy pond until liquid water exceeds ice for 8 days.', geology, 145, 8, 2),
  mission('Desert Reversal', 'Rehydrate the marked drought scar and restore ground cover. Sustain six moist, vegetated regions for 10 days.', geology, 130, 10, 2),
  mission('The Balance', 'Introduce grazers and predators to the marked grassland. Sustain both together with living forage in three regions for 12 days.', fauna, 145, 12, 2),
  mission('Volcanic Recovery', 'Reclaim the marked eruption scar. Cool it below 32 °C and sustain moist vegetation in six damaged regions for 12 days.', fauna, 165, 12, 3),
  mission('Rising Oceans', 'Drain the flooded settlement sector. Keep six of the central nine regions dry enough for roots while preserving the lake two regions north for 10 days.', fauna, 155, 10, 3),
  mission('The Great Migration', 'Connect the two meadows, two regions west and east of the marker, with vegetated land. Keep grazers in the corridor and at both ends for 10 days.', fauna, 165, 10, 3),
  mission('Climate Crisis', 'Weather shifts through heat and drought. Restore rain and vegetation at the marker, divert excess runoff, and maintain 8–32 °C for 18 days.', fauna, 180, 18, 3),
  mission('The Living Planet', 'Sustain breathable air, open water, vegetation, grazers, predators and aquatic life for 20 days. A sheltered lake lies two regions north of the marker.', fauna, 210, 20, 3),
];

const clamp = n => Math.max(0, Math.min(1, n));
const plant = c => Math.max(c.grass, c.forest);
const dryLand = c => c.water < .12 && c.ice < .12;
const mild = c => c.temperature >= 3 && c.temperature <= 34;
const vegetation = c => dryLand(c) && plant(c) >= .16;
const moistLife = c => vegetation(c) && c.moisture >= .22 && mild(c);
const breathable = w => w.pressure >= .85 && w.pressure <= 1.15 &&
  w.oxygen >= 15 && w.oxygen <= 24 && w.co2 <= .4;

function offset(w, index, dx, dy) {
  const x = (index % w.width + dx + w.width) % w.width;
  const y = Math.min(w.height - 1, Math.max(0, Math.floor(index / w.width) + dy));
  return y * w.width + x;
}

function sector(w, radius = 2) {
  const indices = [];
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) indices.push(offset(w, w.mission.target, x, y));
  }
  return indices;
}

function prepareSite(w) {
  for (const i of sector(w)) {
    const c = w.cells[i];
    Object.assign(c, {
      elevation: .48 + .05 * c.elevation, water: .009, ice: 0,
      moisture: .34, cloud: .03, rain: 0, grass: 0, forest: 0,
      herbivores: 0, predators: 0, aquatic: 0, heat: 0,
    });
  }
}

function inlandSurveySite(w) {
  // Keep the waypoint in the temperate belt and the initial camera hemisphere.
  let best = Math.floor(w.height / 2) * w.width + Math.floor(w.width / 2);
  let bestScore = -Infinity;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const i = offset(w, Math.floor(w.height / 2) * w.width + Math.floor(w.width / 2), dx, dy);
      const c = w.cells[i];
      const score = (dryLand(c) ? 1 : 0) - Math.abs(c.elevation - .49) - .018 * (Math.abs(dx) + Math.abs(dy));
      if (score > bestScore) { best = i; bestScore = score; }
    }
  }
  return best;
}

function conditionSite(w) {
  const m = w.mission.index;
  const t = w.mission.target;
  const center = w.cells[t];
  const area = sector(w).map(i => w.cells[i]);
  if (m === 0 || m === 8 || m === 13) {
    for (const c of area) { c.moisture = .055; c.cloud = .01; }
    if (m === 13) w.weather = 'hot';
  }
  if (m === 2) {
    for (const i of neighbors(w, t)) w.cells[i].elevation = .37;
    center.elevation = .12;
  }
  if (m === 3 || m === 7) {
    const drop = m === 7 ? 26 : 22;
    w.solar -= drop;
    for (const c of w.cells) c.temperature -= drop;
    if (m === 3) { center.anomaly = -9; center.temperature -= 9; }
    if (m === 7) { center.water = .02; center.ice = .4; center.elevation = .16; }
  }
  if (m === 4) { w.pressure = .59; w.oxygen = 10.5; w.co2 = .56; }
  if (m === 6) {
    // An impermeable ridge separates the higher spring and the lower outlet.
    for (const c of area) c.elevation = .87;
    Object.assign(w.cells[offset(w,t,-1,0)], {elevation:.56, water:.025});
    center.elevation = .575;
    Object.assign(w.cells[offset(w,t,1,0)], {elevation:.20, water:.03});
  }
  if (m === 9) {
    for (const c of area) { c.grass = .76; c.moisture = .64; }
    w.oxygen = 17;
  }
  if (m === 10) {
    for (const c of area) { c.forest = .56; c.grass = .47; }
    triggerDisaster(w, 'volcano', t);
    for (const c of area) { c.grass *= .06; c.forest *= .06; c.moisture *= .5; }
  }
  if (m === 11) {
    for (const c of area) { c.elevation = .62; c.water = .42; }
    for (const i of sector(w,1)) w.cells[i].elevation = .18;
    Object.assign(w.cells[offset(w,t,0,-2)], {elevation:.05, water:.6});
  }
  if (m === 12) {
    for (const c of area) c.moisture = .55;
    for (const dx of [-2,2]) {
      Object.assign(w.cells[offset(w,t,dx,0)], {grass:.8, herbivores:.25});
    }
  }
  if (m === 14) {
    w.oxygen = 13.1; w.pressure = .81; w.co2 = .38;
    // An established, incomplete biosphere supplies food and a real aquatic refuge.
    for (const c of w.cells) {
      if (dryLand(c) && mild(c) && c.moisture > .20) c.grass = .36;
    }
    for (const c of area) { c.moisture = .57; c.grass = .58; }
    Object.assign(w.cells[offset(w,t,0,-2)], {elevation:.12, water:.65, grass:0});
  }
}

export function startMission(index, seed) {
  if (!Number.isInteger(index) || !MISSIONS[index]) throw new RangeError('Unknown campaign mission');
  const w = createWorld(String(seed ?? 'ORISON'), 'campaign');
  const definition = MISSIONS[index];
  w.energy = definition.budget;
  w.mission = {
    index, target: inlandSurveySite(w), allowed:[...definition.tools],
    hold:0, complete:false, lastTick:w.tick, weatherPhase:0,
  };
  // First contact leaves the planet's original relief and shorelines intact.
  if (index !== 0) prepareSite(w);
  conditionSite(w);
  return w;
}

function check(ratio, label) {
  return {ratio:clamp(ratio), label};
}
const pct = n => Math.round(n * 100) + '%';

function assessment(w) {
  const {index, target} = w.mission;
  const center = w.cells[target];
  const nearby = sector(w).map(i => w.cells[i]);
  const at = (dx,dy) => w.cells[offset(w,target,dx,dy)];
  switch (index) {
    case 0:
      return check(Math.min(center.moisture/.30,center.rain/.004), pct(center.moisture) + ' soil moisture · ' + (center.rain >= .004 ? 'raining' : 'awaiting rain'));
    case 1: {
      const suitable = nearby.filter(c => dryLand(c) && mild(c));
      const green = suitable.filter(vegetation).length / Math.max(1, suitable.length);
      return check(suitable.length >= 8 ? green/.35 : 0, pct(green) + ' of suitable land green');
    }
    case 2: {
      const wet = neighbors(w,target).filter(i => w.cells[i].water >= .035 || w.cells[i].moisture >= .48).length;
      return check(Math.min(center.water/.18, wet/2), pct(center.water) + ' basin depth · ' + wet + ' wet neighbors');
    }
    case 3: {
      const mean = metrics(w).temperature;
      const ok = center.temperature >= 8 && center.temperature <= 28 && mean < 25;
      return check(ok ? 1 : 0, Math.round(center.temperature) + ' °C frontier · ' + Math.round(mean) + ' °C global');
    }
    case 4:
      return check(breathable(w) ? 1 : Math.min(.95,w.pressure/.85,w.oxygen/15,.4/w.co2), w.pressure.toFixed(2) + ' bar · ' + w.oxygen.toFixed(1) + '% O₂ · ' + w.co2.toFixed(2) + '% CO₂');
    case 5: {
      const count = nearby.filter(c => moistLife(c) && c.forest >= .17).length;
      return check(count/6,count + '/6 healthy forest regions');
    }
    case 6: {
      const inlet = at(-1,0), outlet = at(1,0);
      const incoming = inlet.downstream === target && inlet.flow > .0005;
      const outgoing = center.downstream === offset(w,target,1,0) && center.flow > .0005;
      const cut = inlet.elevation > center.elevation && center.elevation > outlet.elevation;
      return check((Number(cut)+Number(incoming)+Number(outgoing))/3,
        (cut ? 'Saddle open' : 'Saddle too high') + ' · ' + (incoming && outgoing ? 'stream connected' : 'awaiting runoff'));
    }
    case 7: {
      const mean = metrics(w).temperature;
      return check((Number(mean > 1)+Number(center.water > .045 && center.water > center.ice))/2,
        Math.round(mean) + ' °C global · ' + pct(center.water) + ' liquid / ' + pct(center.ice) + ' ice');
    }
    case 8:
    case 10: {
      const count = nearby.filter(moistLife).length;
      return check(Math.min(count/6,index === 10 && center.temperature >= 32 ? .66 : 1),
        count + '/6 recovering regions · ' + Math.round(center.temperature) + ' °C');
    }
    case 9: {
      const count = nearby.filter(c => vegetation(c) && c.herbivores > .035 && c.predators > .008).length;
      return check(count/3,count + '/3 regions supporting both species');
    }
    case 11: {
      const dry = sector(w,1).filter(i => dryLand(w.cells[i])).length;
      const refuge = at(0,-2).water >= .08;
      return check(Math.min(dry/6,refuge ? 1 : .5), dry + '/6 regions reclaimed · refuge ' + (refuge ? 'wet' : 'dry'));
    }
    case 12: {
      const start = offset(w,target,-2,0), end = offset(w,target,2,0);
      const habitable = new Set(sector(w).filter(i => vegetation(w.cells[i]) && mild(w.cells[i])));
      const reached = new Set();
      const queue = habitable.has(start) ? [start] : [];
      for (let k = 0; k < queue.length; k++) {
        const i = queue[k]; if (reached.has(i)) continue;
        reached.add(i);
        for (const next of neighbors(w,i)) if (habitable.has(next) && !reached.has(next)) queue.push(next);
      }
      const inhabited = [start,target,end].filter(i => w.cells[i].herbivores > .012).length;
      return check((Number(reached.has(end)) + inhabited/3)/2,
        (reached.has(end) ? 'Meadows linked' : 'Habitat gap') + ' · ' + inhabited + '/3 occupied sites');
    }
    case 13: {
      const conditions = [center.temperature >= 8 && center.temperature <= 32, center.moisture >= .25, vegetation(center), center.rain >= .003];
      return check(conditions.filter(Boolean).length/4, w.weather + ' · ' + pct(center.moisture) + ' moisture · ' + pct(plant(center)) + ' vegetation');
    }
    case 14: {
      const m = metrics(w);
      const conditions = [
        breathable(w), m.water > 2 && m.water < 78, m.vegetation > 2,
        w.cells.filter(c => vegetation(c) && c.herbivores >= .025).length >= 3,
        w.cells.some(c => vegetation(c) && c.herbivores >= .025 && c.predators >= .008),
        w.cells.some(c => c.water >= .045 && c.aquatic >= .025),
      ];
      return check(conditions.filter(Boolean).length/conditions.length,
        conditions.filter(Boolean).length + '/6 systems viable · needs ' +
        (['air','water','vegetation','grazers','predators','aquatic life'].filter((_,i) => !conditions[i]).join(', ') || 'continued balance'));
    }
  }
}

export function missionProgress(w) {
  const mission = w.mission, duration = MISSIONS[mission.index].duration;
  if (mission.complete) return {fraction:1,label:'Restored · +30 TE'};
  const {ratio,label} = assessment(w);
  return {fraction:ratio * .6 + mission.hold / duration * .4, label:label + ' · ' + mission.hold + '/' + duration + ' days'};
}

export function updateMission(w) {
  const m = w.mission;
  if (!m || m.complete || m.lastTick >= w.tick) return false;
  m.lastTick = w.tick;
  if (m.index === 13) {
    m.weatherPhase = Math.floor(w.tick / 7) % 4;
    w.weather = ['hot','dry','normal','cold'][m.weatherPhase];
  }
  const {duration} = MISSIONS[m.index];
  m.hold = assessment(w).ratio >= 1 ? m.hold + 1 : 0;
  if (m.hold < duration) return false;
  m.complete = true;
  w.energy = Math.min(1_000_000, w.energy + 30);
  return true;
}
