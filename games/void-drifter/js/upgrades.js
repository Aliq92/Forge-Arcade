// ---------------- Upgrade definitions & selection ----------------
const UPGRADE_DEFS = {
  thrusters: { name: 'THRUSTERS', icon: '▲', maxLevel: 6, desc: (lvl) => `+${(lvl + 1) * 12}% acceleration` },
  fuelTank: { name: 'FUEL TANK', icon: '⛽', maxLevel: 6, desc: (lvl) => `+26 max fuel; ${(lvl+1)*6}% less fuel per thrust` },
  hullUp: { name: 'HULL PLATING', icon: '■', maxLevel: 6, desc: (lvl) => `+22 max hull; ${(lvl+1)*8}% better repair pickups` },
  scanner: { name: 'SCANNER', icon: '◎', maxLevel: 6, desc: (lvl) => `+${UPGRADE_BASE.scanner.range} scan range` },
  magnet: { name: 'MAGNET', icon: '✵', maxLevel: 6, desc: (lvl) => `+${UPGRADE_BASE.magnet.radius} pickup radius` },
  shield: { name: 'SHIELD', icon: '◉', maxLevel: 6, desc: (lvl) => `+${UPGRADE_BASE.shield.charge} shield capacity` },
  boostUp: { name: 'BOOST SYSTEM', icon: '→', maxLevel: 6, desc: (lvl) => `+14% boost power; +15 auxiliary energy capacity` },
  cargo: { name: 'CARGO HOLD', icon: '▢', maxLevel: 6, desc: (lvl) => `+${UPGRADE_BASE.cargo.cap} salvage capacity` },
};

function rollUpgradeChoices(rng, player, count = 3) {
  const available = Object.keys(UPGRADE_DEFS).filter((k) => player.upgrades[k] < UPGRADE_DEFS[k].maxLevel);
  const pool = available.slice();
  const chosen = [];
  while (chosen.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen.map((key) => ({
    key,
    name: UPGRADE_DEFS[key].name,
    icon: UPGRADE_DEFS[key].icon,
    level: player.upgrades[key],
    maxLevel: UPGRADE_DEFS[key].maxLevel,
    desc: UPGRADE_DEFS[key].desc(player.upgrades[key]),
  }));
}

function totalUpgradeLevels(player) {
  return Object.values(player.upgrades).reduce((a, b) => a + b, 0);
}

function stationUpgradeCost(player) {
  return 40 + totalUpgradeLevels(player) * 18;
}
