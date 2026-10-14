import { bound, event, clamp, distance, random } from "./world.js";
import { createSite, visitSite } from "./culture.js";
function visualRandom(w) {
  w.fxRng = (Math.imul(w.fxRng || 73519, 1664525) + 1013904223) >>> 0;
  return w.fxRng / 4294967296;
}
export function dropConfetti(w, p) {
  if (w.artifacts.length >= 6) return null;
  const q = bound({ x: p.x, y: p.y }),
    e = event(
      w,
      "UNUSUAL_ENVIRONMENTAL_EVENT",
      "A fleck enters the world",
      "One absurdly bright fragment falls through the glass.",
      q,
    );
  const a = {
    ...q,
    id: w.nextArtifact++,
    z: 220,
    vz: 0,
    rotation: 0.2,
    origin: e.id,
    originDay: e.day,
    observations: 0,
    inspectors: [],
    carrierId: null,
    stored: false,
    everCarried: false,
    landed: false,
  };
  w.artifacts.push(a);
  return a;
}
export function inspectArtifact(w, a, artifact) {
  if (
    !artifact ||
    artifact.z > 0 ||
    artifact.carrierId ||
    distance(a, artifact) > 18
  )
    return;
  const site = w.sites.find((s) => s.artifactId === artifact.id);
  if (!visitSite(w, a, site)) return;
  artifact.observations++;
  if (!artifact.inspectors.includes(a.id)) {
    artifact.inspectors.push(a.id);
    artifact.inspectors = artifact.inspectors.slice(-24);
  }
  if (artifact.observations === 1)
    event(
      w,
      "STRANGE_OBJECT_DISCOVERED",
      "A color without a source",
      `${a.name} inspected a fragment unlike anything growing here.`,
      artifact,
      artifact.origin,
      a.groupId,
    );
  if (
    !artifact.stored &&
    artifact.observations >= 2 &&
    a.groupId &&
    a.traits.curiosity > 0.4 &&
    a.traits.inventiveness > 0.42 &&
    !a.carriedArtifact &&
    random(w) < 0.35 + a.traits.inventiveness * 0.4
  ) {
    artifact.carrierId = a.id;
    artifact.everCarried = true;
    a.carriedArtifact = artifact.id;
    a.decision = 0;
  }
}
export function storeArtifact(w, a) {
  const artifact = w.artifacts.find((p) => p.id === a.carriedArtifact),
    home = w.groups.find((g) => g.id === a.groupId);
  if (!artifact || !home || distance(a, home) > 18) return;
  artifact.carrierId = null;
  artifact.stored = true;
  artifact.z = 0;
  artifact.x = home.x + 10;
  artifact.y = home.y + 10;
  a.carriedArtifact = null;
  const s = w.sites.find((s) => s.artifactId === artifact.id);
  if (s) {
    s.x = artifact.x;
    s.y = artifact.y;
  }
  event(
    w,
    "ARTIFACT_CARRIED",
    "The journey of a fragment",
    `${a.name} carried the strange color home. Others can now encounter it beside the settlement.`,
    artifact,
    artifact.origin,
    home.id,
  );
  a.decision = 0;
}
export function celebrate(w, p) {
  if (w.reducedMotion || w.fastVisual) return;
  const colors = ["#b4e1c4", "#eac48b", "#c0abe1", "#e29cba"];
  for (let i = 0; i < 24; i++)
    w.particles.push({
      x: p.x,
      y: p.y,
      z: 8,
      vx: (visualRandom(w) - 0.5) * 45,
      vy: (visualRandom(w) - 0.5) * 25,
      vz: 35 + visualRandom(w) * 55,
      rotation: visualRandom(w) * 6,
      spin: visualRandom(w) * 3,
      ttl: 3 + visualRandom(w) * 2,
      color: colors[i % 4],
    });
  w.particles = w.particles.slice(-90);
}
export function updateArtifacts(w, dt) {
  for (const a of w.artifacts) {
    if (a.carrierId) {
      const carrier = w.agents.find((b) => b.id === a.carrierId);
      if (carrier) {
        a.x = carrier.x;
        a.y = carrier.y;
        a.z = 12;
        const site = w.sites.find((s) => s.artifactId === a.id);
        if (site) {
          site.x = a.x;
          site.y = a.y;
        }
      } else {
        a.carrierId = null;
        a.z = 0;
        const site = w.sites.find((s) => s.artifactId === a.id);
        if (site) {
          site.x = a.x;
          site.y = a.y;
        }
      }
    } else if (a.z > 0) {
      a.vz -= 52 * dt;
      a.z = Math.max(0, a.z + a.vz * dt);
      a.rotation += dt * 0.4;
      if (a.z === 0 && !a.landed) {
        a.landed = true;
        const s = createSite(
          w,
          "CONFETTI",
          a,
          { id: a.origin, day: a.originDay, title: "A fleck enters the world" },
          a.id,
        );
        if (s) a.siteId = s.id;
      }
    }
  }
  for (const p of w.particles) {
    p.vz -= 35 * dt;
    p.vx *= Math.exp(-dt * 0.8);
    p.vy *= Math.exp(-dt * 0.8);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    bound(p);
    p.z = Math.max(0, p.z + p.vz * dt);
    p.rotation += p.spin * dt;
    p.ttl -= dt;
  }
  w.particles = w.reducedMotion ? [] : w.particles.filter((p) => p.ttl > 0);
}

export function disturbDust(w, p) {
  if (w.reducedMotion || w.fastVisual) return;
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10;
    w.particles.push({
      x: p.x + Math.cos(angle) * 14,
      y: p.y + Math.sin(angle) * 10,
      z: 2,
      vx: Math.cos(angle) * 26,
      vy: Math.sin(angle) * 18,
      vz: 15 + visualRandom(w) * 12,
      rotation: 0,
      spin: 0,
      ttl: 1.8,
      color: "#bed7c15c",
      kind: "dust",
    });
  }
  w.particles = w.particles.slice(-90);
}
