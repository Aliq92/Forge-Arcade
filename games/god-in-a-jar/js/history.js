// Recorded views, not reversible simulation states. No nested history or relationships.
export function takeSnapshot(w) {
  const s = {
    time: w.time,
    tick: w.tick,
    era: w.era,
    maxGeneration: w.maxGeneration,
    agents: w.agents.map((a) => ({
      id: a.id,
      name: a.name,
      x: a.x,
      y: a.y,
      age: a.age,
      generation: a.generation,
      appearance: { ...a.appearance },
      traits: { ...a.traits },
      action: a.action,
      target: a.target ? { ...a.target } : null,
      fear: a.fear,
      cargo: a.cargo,
      carriedArtifact: a.carriedArtifact || null,
      groupId: a.groupId,
      memories: a.memories.slice(-3).map((m) => ({ ...m })),
    })),
    effects: [],
    particles: [],
  };
  for (const key of [
    "groups",
    "structures",
    "plants",
    "rocks",
    "water",
    "regions",
    "sites",
    "artifacts",
  ])
    s[key] = structuredClone(w[key]);
  w.snapshots.push(s);
  if (w.snapshots.length > 32) w.snapshots.shift();
  return s;
}
