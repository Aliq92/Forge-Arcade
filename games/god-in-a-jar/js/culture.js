import { event, clamp, distance } from "./world.js";
const titles = {
  TOUCH: "The Trembling Ground",
  LIGHT: "The Great Light",
  RAIN: "The Returning Water",
  MUTATE: "The Violet Garden",
  DISTORT: "The Crooked Air",
  CONFETTI: "The Fallen Color",
};
export function remember(w, a, e, site, learned = false) {
  if (a.memories.some((m) => m.eventId === e.id)) return;
  a.memories.push({
    eventId: e.id,
    siteId: site?.id || null,
    title: e.title,
    kind: site?.kind || e.type,
    day: e.day,
    x: e.x,
    y: e.y,
    strength: learned ? 0.4 : clamp(1 - distance(a, e) / 180, 0.15, 1),
    learned,
  });
  if (a.memories.length > 8) a.memories.shift();
}
export function createSite(w, kind, p, e, artifactId = null) {
  let s = w.sites.find(
    (s) => s.kind === kind && distance(s, p) < 80 && !s.artifactId,
  );
  if (s) return s;
  if (w.sites.length >= 24) {
    const removable = w.sites
      .filter(
        (s) => !s.artifactId && !w.structures.some((b) => b.siteId === s.id),
      )
      .sort((a, b) => a.visits - b.visits)[0];
    if (!removable) return null;
    w.sites = w.sites.filter((s) => s.id !== removable.id);
    for (const a of w.agents) {
      a.memories = a.memories.filter((m) => m.siteId !== removable.id);
      if (a.siteVisits) delete a.siteVisits[removable.id];
    }
    for (const g of w.groups)
      g.knownLandmarks = g.knownLandmarks.filter((id) => id !== removable.id);
  }
  s = {
    id: w.nextSite++,
    kind,
    x: p.x,
    y: p.y,
    title: titles[kind],
    origin: e.id,
    originDay: e.day,
    originTitle: e.title,
    artifactId,
    witnesses: [],
    visits: 0,
    significance: {},
    traditions: [],
    landmarkGroups: [],
  };
  w.sites.push(s);
  return s;
}
export function recordIntervention(w, kind, p) {
  const e = event(
    w,
    "UNUSUAL_ENVIRONMENTAL_EVENT",
    titles[kind],
    {
      TOUCH: "A ripple disturbed the ground. Some fled; some turned back.",
      LIGHT: "A small pool of light warmed the garden.",
      RAIN: "Rain fell into a small part of the world.",
      MUTATE: "A violet field changed the pressures on future life.",
      DISTORT: "Motion bent around a fold in the air.",
    }[kind],
    p,
  );
  const s = createSite(w, kind, p, e);
  for (const a of w.agents)
    if (distance(a, p) < 145) {
      remember(w, a, e, s);
      const g = w.groups.find((g) => g.id === a.groupId);
      if (g && kind === "TOUCH")
        g.culture.caution = clamp(
          g.culture.caution + (1 - distance(a, p) / 145) * 0.004,
        );
      if (s && !s.witnesses.includes(a.id)) {
        s.witnesses.push(a.id);
        s.witnesses = s.witnesses.slice(-24);
      }
      a.decision = 0;
    }
  return e;
}
export function visitSite(w, a, s) {
  if (!s || distance(a, s) > 18) return false;
  a.siteVisits ??= {};
  if (w.time - (a.siteVisits[s.id] ?? -100) < 6) return false;
  a.siteVisits[s.id] = w.time;
  s.visits = Math.min(100000, s.visits + 1);
  if (!s.witnesses.includes(a.id)) {
    s.witnesses.push(a.id);
    s.witnesses = s.witnesses.slice(-24);
  }
  if (!a.memories.some((m) => m.siteId === s.id))
    remember(
      w,
      a,
      {
        id: s.origin,
        title: s.title,
        day: s.originDay,
        x: s.x,
        y: s.y,
        type: s.kind,
      },
      s,
    );
  const g = w.groups.find((g) => g.id === a.groupId);
  if (!g) return true;
  s.significance[g.id] = clamp(
    (s.significance[g.id] || 0) + 0.4 + a.traits.curiosity * 0.25,
    0,
    100,
  );
  g.knowledge = clamp(g.knowledge + 0.1, 0, 1000);
  if (!g.knownLandmarks.includes(s.id)) g.knownLandmarks.push(s.id);
  g.culture.curiosity = clamp(
    g.culture.curiosity +
      ((s.kind === "CONFETTI" ? 0.9 : s.kind === "LIGHT" ? 0.85 : 0.6) -
        g.culture.curiosity) *
        0.003,
  );
  g.culture.caution = clamp(
    g.culture.caution + (0.25 - g.culture.caution) * 0.0005,
  );
  g.culture.tradition = clamp(
    g.culture.tradition + (0.88 - g.culture.tradition) * 0.002,
  );
  if (s.artifactId)
    g.culture.inventiveness = clamp(
      g.culture.inventiveness + (0.8 - g.culture.inventiveness) * 0.003,
    );
  if (
    s.significance[g.id] >= 5 &&
    s.visits >= 8 &&
    s.witnesses.length >= 3 &&
    !s.traditions.includes(g.id)
  ) {
    s.traditions.push(g.id);
    g.importantMemories.push(s.origin);
    g.importantMemories = g.importantMemories.slice(-8);
    event(
      w,
      "NEW_CULTURAL_PRACTICE",
      s.title,
      `${g.name} return to this place after repeated visits by several witnesses.`,
      s,
      s.origin,
      g.id,
    );
  }
  return true;
}
export function shareMemory(w, a, b) {
  if (!b || distance(a, b) > 35) return;
  const m = a.memories.find(
    (m) => !b.memories.some((n) => n.eventId === m.eventId),
  );
  if (m) {
    const s = w.sites.find((s) => s.id === m.siteId);
    remember(
      w,
      b,
      {
        id: m.eventId,
        title: m.title,
        day: m.day,
        x: m.x,
        y: m.y,
        type: m.kind,
      },
      s,
      true,
    );
  }
}
