// Run milestones are memories; the sanctuary's final health is checked live.
SG.Objectives = class {
  constructor() {
    this.completed = [false, false, false, false];
    this.speciesGrown = new Set();
    this.ready = false;
    this.missing = [];
    this.matureCount = 0;
  }

  update(world, nights) {
    for (const type of world.speciesMatured) this.speciesGrown.add(type);
    const livingSpecies = new Set();
    this.matureCount = 0;
    for (const p of world.patches) {
      if (!p.plant?.alive || p.plant.growth < 1) continue;
      this.matureCount++;
      livingSpecies.add(p.plant.type);
      this.speciesGrown.add(p.plant.type);
    }
    const types = Object.keys(SG.PLANT_TYPES);
    const restored = world.restoredCount === world.totalPatches;
    this.missing = [];
    if (!restored) this.missing.push(`${Math.floor(world.restoreAreaPercent())}% / 100% restored`);
    if (this.matureCount < 6) this.missing.push(`${this.matureCount}/6 mature living plants`);
    const absent = types.filter(id => !livingSpecies.has(id));
    if (absent.length) this.missing.push('Grow ' + absent.map(id => SG.PLANT_TYPES[id].name).join(', '));
    const conditions = [world.restoreAreaPercent() >= 25, types.every(id => this.speciesGrown.has(id)), nights >= 1];
    const earned = [];
    conditions.forEach((met, i) => {
      if (met && !this.completed[i]) { this.completed[i] = true; earned.push(i); }
    });
    this.ready = conditions.every((_, i) => this.completed[i]) && this.missing.length === 0;
    if (this.ready) this.completed[3] = true;
    return earned;
  }
};
