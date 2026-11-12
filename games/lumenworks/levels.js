import { validateNetwork } from './network.js';

// Authored world coordinates are deliberately spread out. Ports stay selectable
// on the compact board; decoration belongs to the renderer, never the solver.
const generator = (id, name, x, y, capacity) => ({ id, type: 'generator', name, x, y, capacity });
const station = (id, name, x, y, capacity) => ({ id, type: 'substation', name, x, y, capacity });
const building = (id, name, x, y, demand, style, district, priority = 1) => ({ id, type: 'building', name, x, y, demand, style, district, priority });
const switchNode = (id, name, x, y, capacity) => ({ id, type: 'switch', name, x, y, capacity, closed: false });
const battery = (id, name, x, y, energy, dischargeRate) => ({ id, type: 'battery', name, x, y, energy, maxEnergy: energy, dischargeRate, chargeRate: 2, mode: 'off' });
const cable = (from, to) => ({ type: 'cable', from, to });
const links = (from, destinations) => destinations.map(to => [from, to]);
const base = (id, title, data) => ({
  id, title, width: 12, height: 10, edges: [], obstacles: [],
  availableTools: ['cable', 'inspect'],
  ...data,
  constraints: { maxLength: 11, ...data.constraints },
  objectives: { holdSeconds: 0, noOverload: true, ...data.objectives },
});

export const LEVELS = [
  base(1, 'First Light', {
    subtitle: 'A quiet lane waits for its first windows.',
    nodes: [
      generator('lane-generator', 'Lantern Generator', 2, 4, 6),
      building('juniper-house', 'Juniper House', 7, 1, 2, 'house', 'Lantern Lane'),
      building('willow-house', 'Willow House', 9, 4, 2, 'house', 'Lantern Lane'),
      building('maple-house', 'Maple House', 7, 7, 2, 'house', 'Lantern Lane'),
    ],
    constraints: { maxCables: 3, cableCapacity: 3, allowedLinks: links('lane-generator', ['juniper-house', 'willow-house', 'maple-house']) },
    objectives: { required: ['juniper-house', 'willow-house', 'maple-house'] }, starBudget: 3,
    tutorial: 'Choose Cable. Drag from the generator’s round port to a house port. Follow the arrow: power travels from source to building.',
    hint: 'Each house needs 2 PU. The generator has 6 PU, exactly enough for all three. Three cables earn three stars.',
    solution: [cable('lane-generator', 'juniper-house'), cable('lane-generator', 'willow-house'), cable('lane-generator', 'maple-house')],
  }),
  base(2, 'The Riverside', {
    subtitle: 'Enough for the neighborhood, with choices to make.',
    nodes: [
      generator('river-generator', 'Riverside Generator', 1, 4, 6),
      building('river-house', 'Boathouse', 7, 1, 2, 'house', 'Riverside'),
      building('river-apartments', 'Waterside Apartments', 9, 4, 2, 'apartment', 'Riverside'),
      building('river-hall', 'River Hall', 7, 7, 2, 'public', 'Riverside'),
      building('riverside-shop', 'Optional Souvenir Shop', 3, 8, 4, 'shop', 'Visitors’ Wharf', 9),
    ],
    constraints: { maxCables: 5, cableCapacity: 4, allowedLinks: links('river-generator', ['river-house', 'river-apartments', 'river-hall', 'riverside-shop']) },
    objectives: { required: ['river-house', 'river-apartments', 'river-hall'] }, starBudget: 3,
    tutorial: 'Inspect the generator to compare available PU with demand. The objective names the three essential Riverside buildings.',
    hint: 'The three essential buildings total 6 PU. The optional souvenir shop needs another 4 PU; leave that branch unconnected.',
    solution: [cable('river-generator', 'river-house'), cable('river-generator', 'river-apartments'), cable('river-generator', 'river-hall')],
  }),
  base(3, 'Wake the Market', {
    subtitle: 'Two small hubs, one lively evening market.',
    nodes: [
      generator('market-generator', 'Market Generator', 1, 4, 9),
      station('market-hub', 'Market Hub', 4, 1, 5),
      station('lane-hub', 'Shops Hub', 4, 7, 4),
      building('night-market', 'Night Market', 8, 1, 4, 'market', 'Market Square'),
      building('clock-hall', 'Clock Hall', 10, 3, 1, 'public', 'Market Square'),
      building('corner-shop', 'Corner Shop', 8, 6, 2, 'shop', 'Shop Lane'),
      building('shopkeeper-house', 'Shopkeeper’s House', 10, 8, 2, 'house', 'Shop Lane'),
    ],
    obstacles: [{ x: 5.5, y: 3.5, w: 1.2, h: 1.8, name: 'Fountain garden' }],
    constraints: { maxCables: 8, cableCapacity: 5, allowedLinks: [...links('market-generator', ['market-hub', 'lane-hub']), ...links('market-hub', ['night-market', 'clock-hall', 'corner-shop', 'shopkeeper-house']), ...links('lane-hub', ['night-market', 'clock-hall', 'corner-shop', 'shopkeeper-house'])] },
    objectives: { required: ['night-market', 'clock-hall', 'corner-shop', 'shopkeeper-house'] }, starBudget: 6,
    tutorial: 'Substations route power but create none. Check each hub’s throughput. A constrained branch sheds demand and shows an amber warning.',
    hint: 'Pair the 4-PU market with the 1-PU hall on the 5-PU hub. Put the two 2-PU buildings on the 4-PU hub. Six cables are enough.',
    solution: [cable('market-hub', 'night-market'), cable('market-hub', 'clock-hall'), cable('lane-hub', 'corner-shop'), cable('lane-hub', 'shopkeeper-house'), cable('market-generator', 'market-hub'), cable('market-generator', 'lane-hub')],
  }),
  base(4, 'The Broken Line', {
    subtitle: 'A damaged feeder, a patient detour.',
    nodes: [
      generator('old-generator', 'Old Town Generator', 1, 4, 6),
      station('hill-relay', 'Hill Relay', 4, 1, 6),
      station('old-town-hub', 'Old Town Hub', 8, 4, 6),
      building('hill-house', 'Hill House', 10, 1, 1, 'house', 'Old Town'),
      building('old-apartments', 'Old Town Apartments', 10, 5, 3, 'apartment', 'Old Town'),
      building('library', 'Canal Library', 7, 8, 2, 'public', 'Old Town'),
    ],
    edges: [{ id: 'broken-feeder', from: 'old-generator', to: 'old-town-hub', capacity: 6, enabled: true, damaged: true, removable: false }],
    obstacles: [{ x: 4, y: 4.8, w: 2, h: 2.2, name: 'Canal basin' }],
    constraints: { maxCables: 8, cableCapacity: 6, allowedLinks: [...links('old-generator', ['old-town-hub', 'hill-relay', 'library']), ['hill-relay', 'old-town-hub'], ...links('old-town-hub', ['hill-house', 'old-apartments', 'library'])] },
    objectives: { required: ['hill-house', 'old-apartments', 'library'] }, starBudget: 6,
    tutorial: 'A dashed broken cable carries no power. This damaged feeder stays on the map. Route a new path through the Hill Relay; cables cannot cross the canal basin.',
    hint: 'Connect the three buildings to Old Town Hub, then reach that hub through Hill Relay. The damaged feeder counts in your six-cable budget.',
    solution: [cable('old-town-hub', 'hill-house'), cable('old-town-hub', 'old-apartments'), cable('old-town-hub', 'library'), cable('old-generator', 'hill-relay'), cable('hill-relay', 'old-town-hub')],
  }),
  base(5, 'Battery Night', {
    subtitle: 'A little stored warmth carries the evening.',
    availableTools: ['cable', 'battery', 'inspect'],
    nodes: [
      generator('evening-generator', 'Evening Generator', 1, 4, 6),
      station('evening-hub', 'Evening Hub', 5, 4, 10),
      battery('reserve-battery', 'Evening Reserve', 5, 1, 40, 4),
      building('evening-apartments', 'Evening Apartments', 9, 1.5, 3, 'apartment', 'Evening Quarter'),
      building('evening-market', 'Evening Market', 10, 5, 4, 'market', 'Evening Quarter'),
      building('community-hall', 'Community Hall', 7, 8, 3, 'public', 'Evening Quarter'),
    ],
    constraints: { maxCables: 7, cableCapacity: 10, allowedLinks: [['evening-generator', 'evening-hub'], ['reserve-battery', 'evening-hub'], ...links('evening-hub', ['evening-apartments', 'evening-market', 'community-hall'])] },
    objectives: { required: ['evening-apartments', 'evening-market', 'community-hall'], holdSeconds: 8 }, starBudget: 5,
    tutorial: 'Planning is untimed. Connect both sources to the hub, select Battery and set the reserve to Support, then connect the buildings. Start Check Stability when ready.',
    hint: 'Demand is 10 PU; generation supplies 6 PU. The battery supplies the missing 4 PU. Eight active seconds use 32 of its 40 EU. Off, Charge and Support are exclusive modes.',
    solution: [cable('evening-generator', 'evening-hub'), cable('reserve-battery', 'evening-hub'), { type: 'battery', id: 'reserve-battery', mode: 'support' }, cable('evening-hub', 'evening-apartments'), cable('evening-hub', 'evening-market'), cable('evening-hub', 'community-hall'), { type: 'wait', seconds: 8 }],
  }),
  base(6, 'The Tram Returns', {
    subtitle: 'Keep the homes warm as the last tram wakes.',
    nodes: [
      generator('tram-generator', 'Transit Generator', 1, 4, 12),
      station('residential-hub', 'Residential Hub', 5, 1.5, 6),
      station('transit-hub', 'Transit Hub', 5, 7, 6),
      building('tram-apartments', 'Railway Apartments', 9, 1, 4, 'apartment', 'Railway Homes'),
      building('tram-house', 'Stationmaster’s House', 10, 3.5, 2, 'house', 'Railway Homes'),
      building('tram-depot', 'Tram Depot', 9, 8, 6, 'tram', 'Tram Line'),
      building('workshop', 'Optional Night Factory', 10, 6, 5, 'factory', 'Works Yard', 9),
    ],
    constraints: { maxCables: 8, cableCapacity: 6, allowedLinks: [...links('tram-generator', ['residential-hub', 'transit-hub']), ...links('residential-hub', ['tram-apartments', 'tram-house', 'tram-depot', 'workshop']), ...links('transit-hub', ['tram-apartments', 'tram-house', 'tram-depot', 'workshop'])] },
    objectives: { required: ['tram-apartments', 'tram-house', 'tram-depot'], holdSeconds: 4 }, starBudget: 5,
    tutorial: 'Some districts compete for the same source. Keep both homes powered while restoring the depot. The optional factory may wait until another night.',
    hint: 'Homes use 4 + 2 PU. The depot uses 6 PU. Give each group its own 6-PU hub; leave the 5-PU factory disconnected. Check four stable seconds.',
    solution: [cable('residential-hub', 'tram-apartments'), cable('residential-hub', 'tram-house'), cable('transit-hub', 'tram-depot'), cable('tram-generator', 'residential-hub'), cable('tram-generator', 'transit-hub'), { type: 'wait', seconds: 4 }],
  }),
  base(7, 'Citywide Balance', {
    subtitle: 'Two supplies and a gate between darkness and light.',
    availableTools: ['cable', 'switch', 'inspect'],
    nodes: [
      generator('east-generator', 'East Generator', 1, 1.5, 8),
      generator('west-generator', 'West Generator', 1, 8, 7),
      station('east-hub', 'East Hub', 5, 2, 8),
      switchNode('west-switch', 'West Circuit Switch', 4, 8, 7),
      station('west-hub', 'West Hub', 7, 6.5, 7),
      building('balance-apartments', 'East Apartments', 8, 0.5, 4, 'apartment', 'East District'),
      building('balance-market', 'East Market', 10, 3, 4, 'market', 'East District'),
      building('balance-shop', 'West Shops', 10, 6, 3, 'shop', 'West District'),
      building('balance-hall', 'West Hall', 10, 9, 2, 'public', 'West District'),
      building('balance-house', 'West House', 7, 9, 2, 'house', 'West District'),
    ],
    obstacles: [{ x: 5.4, y: 4.4, w: 1.2, h: 1.2, name: 'City pond' }],
    constraints: { maxCables: 11, cableCapacity: 8, allowedLinks: [['east-generator', 'east-hub'], ['west-generator', 'west-switch'], ['west-switch', 'west-hub'], ['east-hub', 'west-hub'], ...links('east-hub', ['balance-apartments', 'balance-market', 'balance-shop', 'balance-house']), ...links('west-hub', ['balance-shop', 'balance-hall', 'balance-house', 'balance-market'])] },
    objectives: { required: ['balance-apartments', 'balance-market', 'balance-shop', 'balance-hall', 'balance-house'], holdSeconds: 5 }, starBudget: 8,
    tutorial: 'Choose Switch and tap the open West Circuit Switch to close it. An open switch interrupts its whole branch. The two generators keep their own finite output limits.',
    hint: 'East’s two buildings use 8 PU. West’s three use 7 PU. Close the west switch and keep those groups on their own hubs. A cross-district tie spends a cable you do not need.',
    solution: [cable('east-hub', 'balance-apartments'), cable('east-hub', 'balance-market'), cable('west-hub', 'balance-shop'), cable('west-hub', 'balance-hall'), cable('west-hub', 'balance-house'), cable('east-generator', 'east-hub'), cable('west-switch', 'west-hub'), { type: 'switch', id: 'west-switch', closed: true }, cable('west-generator', 'west-switch'), { type: 'wait', seconds: 5 }],
  }),
  base(8, 'The Grand Illumination', {
    subtitle: 'Every window. Every district. One city awake.',
    availableTools: ['cable', 'switch', 'battery', 'inspect'],
    nodes: [
      generator('north-generator', 'North Generator', 0.5, 1, 12),
      switchNode('north-switch', 'North Circuit Switch', 3, 1, 12),
      station('north-hub', 'North Hub', 6, 2, 12),
      generator('south-generator', 'South Generator', 0.5, 8, 10),
      station('south-relay', 'South Detour Relay', 3, 8, 10),
      station('south-hub', 'South Hub', 6, 7, 13),
      battery('city-battery', 'City Reserve', 3, 5, 30, 3),
      building('city-house', 'Lantern House', 8, 0.5, 2, 'house', 'North City'),
      building('city-apartments', 'City Apartments', 10, 1.5, 4, 'apartment', 'North City'),
      building('city-market', 'Grand Market', 8, 3, 4, 'market', 'North City'),
      building('city-shop', 'City Shops', 11, 4, 2, 'shop', 'North City'),
      building('city-tram', 'Central Tram Depot', 8, 6, 5, 'tram', 'South City'),
      building('city-factory', 'Riverside Factory', 10, 7.5, 5, 'factory', 'South City'),
      building('city-hall', 'City Hall', 8, 9, 3, 'public', 'South City'),
    ],
    edges: [{ id: 'city-broken-feeder', from: 'south-generator', to: 'south-hub', capacity: 10, enabled: true, damaged: true, removable: false }],
    obstacles: [{ x: 4.3, y: 3.7, w: 1.2, h: 1.8, name: 'Central water garden' }],
    constraints: { maxCables: 16, cableCapacity: 13, allowedLinks: [['north-generator', 'north-switch'], ['north-switch', 'north-hub'], ['south-generator', 'south-hub'], ['south-generator', 'south-relay'], ['south-relay', 'south-hub'], ['city-battery', 'south-hub'], ['north-generator', 'south-hub'], ['south-generator', 'north-hub'], ['north-hub', 'south-hub'], ...links('north-hub', ['city-house', 'city-apartments', 'city-market', 'city-shop', 'city-tram']), ...links('south-hub', ['city-tram', 'city-factory', 'city-hall', 'city-shop'])] },
    objectives: { required: ['city-house', 'city-apartments', 'city-market', 'city-shop', 'city-tram', 'city-factory', 'city-hall'], holdSeconds: 8 }, starBudget: 13,
    tutorial: 'Bring together routing, capacity, damaged-line detours, switches and finite storage. Planning stays untimed. Restore every building, then run the eight-second city check.',
    hint: 'North needs 12 PU. South needs 13 PU: its 10-PU generator plus 3 PU from the reserve. Use the south detour, close the north switch and enable Support before connecting all loads. The broken feeder counts toward 13 cables.',
    solution: [cable('north-generator', 'north-switch'), cable('north-switch', 'north-hub'), { type: 'switch', id: 'north-switch', closed: true }, cable('south-generator', 'south-relay'), cable('south-relay', 'south-hub'), cable('city-battery', 'south-hub'), { type: 'battery', id: 'city-battery', mode: 'support' }, cable('north-hub', 'city-house'), cable('north-hub', 'city-apartments'), cable('north-hub', 'city-market'), cable('north-hub', 'city-shop'), cable('south-hub', 'city-tram'), cable('south-hub', 'city-factory'), cable('south-hub', 'city-hall'), { type: 'wait', seconds: 8 }],
  }),
  base(9, 'Harbor Lights', {
    subtitle: 'Two little generators welcome the boats home.',
    nodes: [generator('harbor-north', 'North Pier Generator', 1, 1.5, 6), generator('harbor-south', 'South Pier Generator', 1, 8, 6), station('harbor-hub', 'Harbor Exchange', 5, 4.5, 12), building('harbor-market', 'Fish Market', 9, 1, 5, 'market', 'Harbor'), building('harbor-tram', 'Quayside Tram', 10, 4.5, 4, 'tram', 'Harbor'), building('harbor-hall', 'Sailors’ Hall', 9, 8, 3, 'public', 'Harbor'), building('harbor-shop', 'Optional Gift Shop', 5, 9, 4, 'shop', 'Harbor', 9)],
    obstacles: [{ x: 2.5, y: 4, w: 0.8, h: 1, name: 'Tidal pool' }],
    constraints: { maxCables: 8, cableCapacity: 6, allowedLinks: [...links('harbor-north', ['harbor-hub', 'harbor-market']), ...links('harbor-south', ['harbor-hub', 'harbor-hall']), ...links('harbor-hub', ['harbor-market', 'harbor-tram', 'harbor-hall', 'harbor-shop'])] },
    objectives: { required: ['harbor-market', 'harbor-tram', 'harbor-hall'], holdSeconds: 5 }, starBudget: 5,
    tutorial: 'A hub can combine two sources. Each incoming cable carries at most 6 PU, while the exchange can pass 12 PU in total.',
    hint: 'Combine both 6-PU generators at the exchange before its three essential branches: 5 + 4 + 3 PU. Direct pier-to-building routes leave awkward scraps of supply and cost extra cables.',
    solution: [cable('harbor-north', 'harbor-hub'), cable('harbor-south', 'harbor-hub'), cable('harbor-hub', 'harbor-market'), cable('harbor-hub', 'harbor-tram'), cable('harbor-hub', 'harbor-hall'), { type: 'wait', seconds: 5 }],
  }),
  base(10, 'Hilltop Relay', {
    subtitle: 'Two winding paths climb toward the evening windows.',
    availableTools: ['cable', 'switch', 'inspect'],
    nodes: [generator('hilltop-generator', 'Valley Generator', 1, 4.5, 14), switchNode('hilltop-upper-gate', 'Upper Gate', 3, 1, 8), switchNode('hilltop-lower-gate', 'Lower Gate', 3, 8, 6), station('hilltop-upper-hub', 'Upper Terrace Hub', 6, 1.5, 8), station('hilltop-lower-hub', 'Lower Terrace Hub', 6, 7.5, 6), building('hilltop-apartments', 'Summit Apartments', 9, 0.5, 5, 'apartment', 'Upper Terrace'), building('hilltop-library', 'Hill Library', 10, 3, 3, 'public', 'Upper Terrace'), building('hilltop-market', 'Terrace Market', 10, 6, 4, 'market', 'Lower Terrace'), building('hilltop-house', 'Lookout House', 9, 9, 2, 'house', 'Lower Terrace')],
    edges: [{ id: 'hilltop-broken-line', from: 'hilltop-generator', to: 'hilltop-upper-hub', capacity: 8, enabled: true, damaged: true, removable: false }],
    obstacles: [{ x: 4, y: 3.6, w: 1.1, h: 1.8, name: 'Wildflower slope' }],
    constraints: { maxCables: 12, cableCapacity: 8, allowedLinks: [...links('hilltop-generator', ['hilltop-upper-gate', 'hilltop-lower-gate', 'hilltop-upper-hub']), ['hilltop-upper-gate', 'hilltop-upper-hub'], ['hilltop-lower-gate', 'hilltop-lower-hub'], ['hilltop-upper-hub', 'hilltop-lower-hub'], ...links('hilltop-upper-hub', ['hilltop-apartments', 'hilltop-library', 'hilltop-market']), ...links('hilltop-lower-hub', ['hilltop-market', 'hilltop-house', 'hilltop-library'])] },
    objectives: { required: ['hilltop-apartments', 'hilltop-library', 'hilltop-market', 'hilltop-house'], holdSeconds: 6 }, starBudget: 9,
    tutorial: 'The damaged upper line cannot be repaired. Both gates start open. Match each terrace’s demand to its own gate and hub rating.',
    hint: 'Upper needs 5 + 3 = 8 PU; lower needs 4 + 2 = 6 PU. Route through both gates and close them before attaching demand. The fixed damaged cable counts toward nine cables.',
    solution: [cable('hilltop-generator', 'hilltop-upper-gate'), cable('hilltop-upper-gate', 'hilltop-upper-hub'), cable('hilltop-generator', 'hilltop-lower-gate'), cable('hilltop-lower-gate', 'hilltop-lower-hub'), { type: 'switch', id: 'hilltop-upper-gate', closed: true }, { type: 'switch', id: 'hilltop-lower-gate', closed: true }, cable('hilltop-upper-hub', 'hilltop-apartments'), cable('hilltop-upper-hub', 'hilltop-library'), cable('hilltop-lower-hub', 'hilltop-market'), cable('hilltop-lower-hub', 'hilltop-house'), { type: 'wait', seconds: 6 }],
  }),
  base(11, 'Glasshouse Quarter', {
    subtitle: 'Stored sunshine keeps the winter garden glowing.',
    availableTools: ['cable', 'battery', 'inspect'],
    nodes: [generator('glass-generator', 'Garden Generator', 1, 4, 8), station('glass-upper-hub', 'Conservatory Hub', 5, 1.5, 6), station('glass-lower-hub', 'Garden Lane Hub', 6, 7, 4), battery('glass-reserve', 'Sunshine Reserve', 3, 8, 20, 2), building('glass-conservatory', 'Glass Conservatory', 9, 0.5, 4, 'public', 'Glasshouse Quarter'), building('glass-shop', 'Garden Shop', 10, 3, 2, 'shop', 'Glasshouse Quarter'), building('glass-apartments', 'Garden Apartments', 9, 6, 3, 'apartment', 'Garden Lane'), building('glass-cottage', 'Gardener’s Cottage', 10, 9, 1, 'house', 'Garden Lane')],
    obstacles: [{ x: 4, y: 4, w: 1.2, h: 1.2, name: 'Protected seed beds' }],
    constraints: { maxCables: 10, cableCapacity: 6, allowedLinks: [...links('glass-generator', ['glass-upper-hub', 'glass-lower-hub']), ...links('glass-reserve', ['glass-upper-hub', 'glass-lower-hub']), ...links('glass-upper-hub', ['glass-conservatory', 'glass-shop', 'glass-apartments']), ...links('glass-lower-hub', ['glass-apartments', 'glass-cottage', 'glass-shop'])] },
    objectives: { required: ['glass-conservatory', 'glass-shop', 'glass-apartments', 'glass-cottage'], holdSeconds: 6 }, starBudget: 7,
    tutorial: 'The reserve is already charged. Place its support where generation leaves a shortfall; the two hubs have different throughput limits.',
    hint: 'Upper demand is 6 PU; lower demand is 4 PU. Send generation to both hubs and the 2-PU reserve to Garden Lane. Support for six seconds uses 12 of its 20 EU.',
    solution: [cable('glass-generator', 'glass-upper-hub'), cable('glass-generator', 'glass-lower-hub'), cable('glass-reserve', 'glass-lower-hub'), { type: 'battery', id: 'glass-reserve', mode: 'support' }, cable('glass-upper-hub', 'glass-conservatory'), cable('glass-upper-hub', 'glass-shop'), cable('glass-lower-hub', 'glass-apartments'), cable('glass-lower-hub', 'glass-cottage'), { type: 'wait', seconds: 6 }],
  }),
  base(12, 'Night Shift', {
    subtitle: 'Let the old workshop rest while the neighborhood wakes.',
    availableTools: ['cable', 'switch', 'inspect'],
    nodes: [generator('shift-generator', 'Night Generator', 1, 4.5, 16), { ...switchNode('shift-workshop-gate', 'Workshop Gate', 3, 4.5, 5), closed: true }, station('shift-north-hub', 'Works Hub', 5, 1, 6), station('shift-south-hub', 'Transit Hub', 5, 8, 6), station('shift-home-hub', 'Home Hub', 7, 4.5, 4), building('shift-old-workshop', 'Optional Old Workshop', 4, 5.5, 5, 'factory', 'Old Yard', 9), building('shift-factory', 'Bakery Works', 9, 0.5, 6, 'factory', 'Night Shift'), building('shift-tram', 'First Tram Depot', 9, 9, 6, 'tram', 'Night Shift'), building('shift-hall', 'Night Reading Room', 10, 3, 2, 'public', 'Night Shift'), building('shift-house', 'Baker’s House', 10, 6, 2, 'house', 'Night Shift')],
    edges: [{ id: 'shift-workshop-feed', from: 'shift-generator', to: 'shift-workshop-gate', capacity: 5, enabled: true, damaged: false, removable: false }, { id: 'shift-workshop-branch', from: 'shift-workshop-gate', to: 'shift-old-workshop', capacity: 5, enabled: true, damaged: false, removable: false }],
    constraints: { maxCables: 12, cableCapacity: 6, allowedLinks: [['shift-generator', 'shift-workshop-gate'], ['shift-workshop-gate', 'shift-old-workshop'], ...links('shift-generator', ['shift-north-hub', 'shift-south-hub', 'shift-home-hub']), ...links('shift-north-hub', ['shift-factory', 'shift-hall', 'shift-house']), ...links('shift-south-hub', ['shift-tram', 'shift-hall', 'shift-house']), ...links('shift-home-hub', ['shift-hall', 'shift-house', 'shift-factory'])] },
    objectives: { required: ['shift-factory', 'shift-tram', 'shift-hall', 'shift-house'], holdSeconds: 5 }, starBudget: 9,
    tutorial: 'The optional workshop is already drawing 5 PU through a closed gate. Opening that gate frees capacity for the four essential buildings.',
    hint: 'Open Workshop Gate first. Put each 6-PU load on its own 6-PU hub, and the two 2-PU buildings on Home Hub. The two fixed workshop cables still count in the nine-cable budget.',
    solution: [{ type: 'switch', id: 'shift-workshop-gate', closed: false }, cable('shift-generator', 'shift-north-hub'), cable('shift-generator', 'shift-south-hub'), cable('shift-generator', 'shift-home-hub'), cable('shift-north-hub', 'shift-factory'), cable('shift-south-hub', 'shift-tram'), cable('shift-home-hub', 'shift-hall'), cable('shift-home-hub', 'shift-house'), { type: 'wait', seconds: 5 }],
  }),
  base(13, 'Festival of Lights', {
    subtitle: 'Across the garden, every lantern finds its glow.',
    availableTools: ['cable', 'switch', 'battery', 'inspect'],
    nodes: [generator('festival-north', 'North Festival Generator', 1, 1, 10), station('festival-home-hub', 'Lantern Terrace Hub', 4, 1, 6), station('festival-market-hub', 'Festival Market Hub', 6, 3, 4), generator('festival-south', 'South Festival Generator', 1, 8, 8), switchNode('festival-gate', 'Riverside Gate', 3, 8, 8), station('festival-south-hub', 'Riverside Festival Hub', 6, 7, 12), battery('festival-reserve', 'Lantern Reserve', 3, 5, 40, 4), building('festival-house', 'Lantern Keeper’s House', 8, 0.5, 2, 'house', 'Festival North'), building('festival-apartments', 'Balcony Apartments', 10, 2, 4, 'apartment', 'Festival North'), building('festival-market', 'Lantern Market', 9, 4, 4, 'market', 'Festival North'), building('festival-tram', 'Festival Tram', 8, 6, 5, 'tram', 'Festival Riverside'), building('festival-works', 'Lantern Workshop', 10, 7.5, 4, 'factory', 'Festival Riverside'), building('festival-hall', 'Celebration Hall', 8, 9, 3, 'public', 'Festival Riverside')],
    edges: [{ id: 'festival-broken-line', from: 'festival-south', to: 'festival-south-hub', capacity: 8, enabled: true, damaged: true, removable: false }],
    obstacles: [{ x: 4.5, y: 4, w: 1, h: 1.5, name: 'Floating lantern garden' }],
    constraints: { maxCables: 16, cableCapacity: 12, allowedLinks: [...links('festival-north', ['festival-home-hub', 'festival-market-hub', 'festival-south-hub']), ['festival-south', 'festival-south-hub'], ['festival-south', 'festival-gate'], ['festival-gate', 'festival-south-hub'], ...links('festival-reserve', ['festival-south-hub', 'festival-market-hub']), ...links('festival-home-hub', ['festival-house', 'festival-apartments', 'festival-market']), ...links('festival-market-hub', ['festival-market', 'festival-apartments']), ...links('festival-south-hub', ['festival-tram', 'festival-works', 'festival-hall', 'festival-market'])] },
    objectives: { required: ['festival-house', 'festival-apartments', 'festival-market', 'festival-tram', 'festival-works', 'festival-hall'], holdSeconds: 8 }, starBudget: 12,
    tutorial: 'Balance three hubs, detour around a damaged feeder, close the riverside gate and share the finite reserve. Prepare the whole festival before starting the eight-second check.',
    hint: 'North’s 10 PU splits as 6 for the homes and 4 for the market. South needs 12 PU: 8 through Riverside Gate plus 4 from the reserve. Enable both southern supplies before loads; the reserve spends 32 of 40 EU.',
    solution: [cable('festival-north', 'festival-home-hub'), cable('festival-north', 'festival-market-hub'), cable('festival-south', 'festival-gate'), cable('festival-gate', 'festival-south-hub'), { type: 'switch', id: 'festival-gate', closed: true }, cable('festival-reserve', 'festival-south-hub'), { type: 'battery', id: 'festival-reserve', mode: 'support' }, cable('festival-home-hub', 'festival-house'), cable('festival-home-hub', 'festival-apartments'), cable('festival-market-hub', 'festival-market'), cable('festival-south-hub', 'festival-tram'), cable('festival-south-hub', 'festival-works'), cable('festival-south-hub', 'festival-hall'), { type: 'wait', seconds: 8 }],
  }),
];

/** Cheap startup validation; exhaustive reference simulation lives in tests. */
export function validateLevels() {
  const errors = [], ids = new Set();
  if (LEVELS.length !== 13) errors.push('Campaign must contain thirteen levels.');
  for (const [index, level] of LEVELS.entries()) {
    const prefix = `Level ${index + 1}`;
    if (ids.has(level.id)) errors.push(`${prefix}: duplicate level id.`);
    ids.add(level.id);
    for (const error of validateNetwork(level).errors) errors.push(`${prefix}: ${error}`);
    if (!level.title || !level.tutorial || !level.hint) errors.push(`${prefix}: missing player guidance.`);
    if (!Number.isInteger(level.starBudget) || level.starBudget < level.edges.length || level.starBudget > level.constraints.maxCables) errors.push(`${prefix}: invalid star budget.`);
    if (!Array.isArray(level.objectives?.required) || !level.objectives.required.length) errors.push(`${prefix}: missing building objectives.`);
    for (const id of level.objectives?.required || []) {
      if (!level.nodes.some(n => n.id === id && n.type === 'building')) errors.push(`${prefix}: unknown objective ${id}.`);
    }
    if (!Number.isFinite(level.objectives.holdSeconds) || level.objectives.holdSeconds < 0 || level.objectives.holdSeconds > 8) errors.push(`${prefix}: invalid stability duration.`);
    if (!Array.isArray(level.solution) || !level.solution.length) errors.push(`${prefix}: missing reference solution.`);
    for (const action of level.solution || []) {
      if (action.type === 'cable') {
        if (!level.nodes.some(n => n.id === action.from) || !level.nodes.some(n => n.id === action.to)) errors.push(`${prefix}: invalid reference cable.`);
      } else if (action.type === 'battery' || action.type === 'switch') {
        if (!level.nodes.some(n => n.id === action.id && n.type === action.type)) errors.push(`${prefix}: invalid reference component.`);
      } else if (action.type === 'wait') {
        if (!(action.seconds > 0 && action.seconds <= 8)) errors.push(`${prefix}: invalid reference wait.`);
      } else if (action.type === 'remove-edge') {
        if (!level.edges.some(e => e.id === action.id && e.removable !== false)) errors.push(`${prefix}: invalid reference removal.`);
      } else errors.push(`${prefix}: unknown reference action.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Fresh data per call: sandbox edits never leak into campaign or saved layouts. */
export function createSandbox() {
  return {
    id: 'sandbox', title: 'Free City Builder', subtitle: 'A little city, entirely yours.', width: 12, height: 10,
    nodes: [generator('sandbox-generator', 'City Generator', 2, 3, 32), station('sandbox-hub', 'City Hub', 6, 4, 24), building('sandbox-house', 'First House', 9, 6, 2, 'house', 'Free City')],
    edges: [], obstacles: [], availableTools: ['cable', 'switch', 'battery', 'inspect', 'place', 'remove'],
    constraints: { maxCables: 96, maxNodes: 48, cableCapacity: 16, maxLength: 15 },
    objectives: { required: [], holdSeconds: 0, noOverload: false }, starBudget: 96,
    tutorial: 'Place components, draw directed cables and explore. New batteries start empty: charge them from a generator before trying Support. Save a layout whenever you like.',
    hint: 'There are no mandatory objectives or time limits. Generator output, cable ratings and battery storage still matter.',
    solution: [],
  };
}
