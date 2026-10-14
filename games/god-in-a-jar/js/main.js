import { createWorld, step, DT, DAY, bound, distance } from "./world.js";
import { Renderer, unproject, project } from "./render.js";
import { applyPower, POWERS } from "./interventions.js";
import { dropConfetti } from "./artifacts.js";
import { createUI } from "./ui.js";
import { load, save, encode, SAVE_KEY } from "./persistence.js";
import { SimulationClock } from "./time.js";
import { LabAudio } from "./audio.js";
const canvas = document.querySelector("#world"),
  renderer = new Renderer(canvas),
  clock = new SimulationClock(),
  audio = new LabAudio();
const seed = () => {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return "jar-" + Array.from(values, (v) => v.toString(36)).join("-");
};
let loaded = null,
  loadError = null;
try {
  loaded = load(localStorage);
} catch (e) {
  loadError = e.message;
}
const state = {
  world: loaded?.world || createWorld(seed()),
  settings: loaded?.settings || {
    sound: false,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  },
  speed: 1,
  power: "TOUCH",
  target: null,
  selected: null,
  snapshot: null,
  follow: null,
  armed: false,
  observing: false,
};
state.world.reducedMotion = state.settings.reducedMotion;
let speedBeforeHistory = 1,
  lastSave = performance.now(),
  lastSavedEvent = 0,
  cooldownUntil = 0,
  last = performance.now(),
  lastRender = 0,
  uiAcc = 0,
  effectiveSteps = 0,
  effectiveReal = 0,
  autosaveDue = false;
function saveNow(manual = false) {
  let result;
  try {
    result = save(localStorage, state.world, state.settings);
  } catch (e) {
    result = { ok: false, message: e.message };
  }
  lastSave = performance.now();
  lastSavedEvent = state.world.nextEvent;
  if (manual || !result.ok)
    ui.toast(
      result.ok
        ? result.trimmed
          ? "Saved. Older snapshots trimmed to fit local storage."
          : "Experiment saved locally."
        : result.message,
    );
  return result;
}
function setSpeed(value) {
  if (state.snapshot !== null) {
    ui.toast("Return to present to change time.");
    return;
  }
  state.speed = value;
  clock.reset();
  effectiveSteps = effectiveReal = 0;
  document
    .querySelectorAll("[data-speed]")
    .forEach((b) => b.classList.toggle("active", +b.dataset.speed === value));
  document.querySelector("#effective").textContent =
    value === 0
      ? "Paused"
      : value === 1
        ? "Real time"
        : "Measuring effective speed…";
}
function choosePower(power) {
  if (state.snapshot !== null) {
    ui.toast("Recorded snapshots are read only.");
    return;
  }
  state.power = power;
  state.armed = true;
  state.selected = null;
  document.querySelectorAll("[data-power]").forEach((b) => {
    b.classList.toggle("active", b.dataset.power === power);
    b.setAttribute("aria-pressed", String(b.dataset.power === power));
  });
  const descriptions = {
    TOUCH: "A momentary ripple. Nearby creatures may flee or return.",
    LIGHT: "A local beam. Plants grow faster; creatures may investigate.",
    RAIN: "Local rainfall replenishes moisture and freshwater.",
    MUTATE: "A temporary field increases variation in future offspring.",
    DISTORT: "A local swirl bends motion gently.",
    CONFETTI: "Place one ridiculous fragment in the world.",
  };
  ui.toast(descriptions[power]);
}
function showSnapshot(index) {
  if (state.snapshot === null && index !== null)
    speedBeforeHistory = state.speed;
  state.snapshot = index;
  clock.reset();
  state.follow = null;
  state.target = null;
  if (index === null) setSpeed(speedBeforeHistory);
  else
    document.querySelector("#effective").textContent =
      "Recorded view · time paused";
}
function toggleObserve() {
  state.observing = !state.observing;
  document.body.classList.toggle("observing", state.observing);
  document.querySelector("#exit-observe").hidden = !state.observing;
  ui.close();
  renderer.resize();
}
const ui = createUI(state, {
  power: choosePower,
  save: () => saveNow(true),
  present: () => showSnapshot(null),
  snapshot: showSnapshot,
  observe: toggleObserve,
  settings: () => {
    state.world.reducedMotion = state.settings.reducedMotion;
    if (state.settings.reducedMotion) state.world.particles = [];
    audio
      .setEnabled(state.settings.sound)
      .catch(() => ui.toast("Audio is unavailable in this browser."));
    saveNow();
  },
  copy: () =>
    navigator.clipboard
      ?.writeText(state.world.seed)
      .then(() => ui.toast("Seed copied."))
      .catch(() => ui.toast("Seed: " + state.world.seed)),
  export: () => {
    const blob = new Blob([encode(state.world, state.settings)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "god-in-a-jar-" + state.world.seed + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ui.toast("Save file exported.");
  },
  newWorld: (s) => {
    state.world = createWorld(s || seed());
    state.world.reducedMotion = state.settings.reducedMotion;
    state.snapshot = null;
    state.selected = null;
    state.follow = null;
    state.armed = false;
    renderer.zoom = 1;
    renderer.pan = { x: 0, y: 0 };
    setSpeed(1);
    choosePower("TOUCH");
    state.armed = false;
    document.querySelector("#hint b").textContent = "TOUCH THE GLASS";
    saveNow(true);
  },
  locate: (p) => {
    const q = project(p);
    renderer.zoom = Math.max(1.3, renderer.zoom);
    renderer.pan = {
      x: (550 - q.x) * renderer.zoom,
      y: (510 - q.y) * renderer.zoom,
    };
    state.follow = null;
    ui.toast("Located the recorded event.");
  },
});
window.jar = {
  get world() {
    return state.world;
  },
  renderer,
  state,
  save: () => saveNow(true),
};
if (loadError)
  setTimeout(
    () =>
      ui.toast(
        "Could not load the stored jar: " +
          loadError +
          ". A fresh jar is open.",
      ),
    200,
  );
else if (loaded)
  setTimeout(() => ui.toast("Your experiment continues. Welcome back."), 200);
document
  .querySelectorAll("[data-power]")
  .forEach((b) => (b.onclick = () => choosePower(b.dataset.power)));
document
  .querySelectorAll("[data-speed]")
  .forEach((b) => (b.onclick = () => setSpeed(+b.dataset.speed)));
function zoomTo(value) {
  renderer.zoom = Math.min(2.8, Math.max(1, value));
  if (renderer.zoom === 1) renderer.pan = { x: 0, y: 0 };
  document.querySelector("#zoom-level").textContent =
    Math.round(renderer.zoom * 100) + "%";
}
document.querySelector("#zoom-in").onclick = () => zoomTo(renderer.zoom + 0.25);
document.querySelector("#zoom-out").onclick = () =>
  zoomTo(renderer.zoom - 0.25);
document.querySelector("#reset-camera").onclick = () => {
  state.follow = null;
  zoomTo(1);
};
function local(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function targeting(p) {
  const q = renderer.screenToJar(p.x, p.y);
  const valid =
    q.y >= 125 &&
    q.y <= 683 &&
    (q.y < 205 ? q.x >= 294 && q.x <= 806 : q.x > 147 && q.x < 952);
  state.target = valid ? bound(unproject(q)) : null;
  return q;
}
function hitTest(p, w) {
  let best = null,
    bd = 17;
  for (const kind of ["agent", "artifact", "structure", "group", "site"]) {
    const list =
      w[
        {
          agent: "agents",
          artifact: "artifacts",
          structure: "structures",
          group: "groups",
          site: "sites",
        }[kind]
      ];
    for (const obj of list) {
      const s = renderer.worldToScreen(obj);
      s.y -=
        (kind === "agent"
          ? obj.appearance.size
          : kind === "artifact"
            ? obj.z || 0
            : kind === "structure"
              ? 12
              : 0) *
        renderer.scaleY *
        renderer.zoom;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < bd) {
        bd = d;
        best = { kind, id: obj.id };
      }
    }
    if (best) break;
  }
  return best;
}
function activate(p) {
  targeting(p);
  if (!state.target) return;
  const viewed =
    state.snapshot === null
      ? state.world
      : state.world.snapshots[state.snapshot];
  const hit = hitTest(p, viewed);
  if (!state.armed && hit) {
    ui.inspect(hit);
    return;
  }
  if (state.snapshot !== null) {
    ui.toast("Recorded snapshots are read only.");
    return;
  }
  if (performance.now() < cooldownUntil) {
    ui.toast("Let the disturbance settle for a moment.");
    return;
  }
  const result =
    state.power === "CONFETTI"
      ? dropConfetti(state.world, state.target)
      : applyPower(state.world, state.power, state.target);
  if (!result) {
    ui.toast("This jar already holds six confetti fragments.");
    return;
  }
  cooldownUntil = performance.now() + 650;
  audio.ping(state.power);
  state.armed = false;
  document.querySelector("#hint b").textContent = "WATCH WHAT THEY DO.";
  document.querySelector("#hint small").textContent =
    "Tap a creature to inspect its life and memories.";
  if (state.power === "CONFETTI") {
    state.power = "TOUCH";
    document
      .querySelectorAll("[data-power]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.power === "TOUCH"),
      );
  }
  ui.toast(
    state.power === "TOUCH"
      ? "The world noticed. Watch nearby creatures."
      : "An influence is active. Its consequences take time.",
  );
  autosaveDue = true;
}
const pointers = new Map();
let gesture = null;
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = local(e);
  pointers.set(e.pointerId, p);
  if (pointers.size === 1)
    gesture = { start: p, last: p, moved: false, pinched: false };
  if (pointers.size === 2) {
    const a = [...pointers.values()];
    gesture.pinched = true;
    gesture.baseDistance = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    gesture.baseZoom = renderer.zoom;
  }
  targeting(p);
  if (state.settings.sound) audio.setEnabled(true).catch(() => {});
});
canvas.addEventListener("pointermove", (e) => {
  const p = local(e);
  targeting(p);
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, p);
  if (pointers.size === 2) {
    const a = [...pointers.values()];
    zoomTo(
      (gesture.baseZoom * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)) /
        Math.max(10, gesture.baseDistance),
    );
    gesture.moved = true;
    state.follow = null;
    return;
  }
  if (!gesture || gesture.pinched) return;
  if (Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) > 7)
    gesture.moved = true;
  if (gesture.moved && renderer.zoom > 1) {
    renderer.pan.x += (p.x - gesture.last.x) / renderer.scale;
    renderer.pan.y += (p.y - gesture.last.y) / renderer.scaleY;
    renderer.pan.x = Math.max(-750, Math.min(750, renderer.pan.x));
    renderer.pan.y = Math.max(-450, Math.min(450, renderer.pan.y));
    state.follow = null;
  }
  gesture.last = p;
});
canvas.addEventListener("pointerup", (e) => {
  const p = local(e);
  if (pointers.size === 1 && gesture && !gesture.moved && !gesture.pinched)
    activate(p);
  pointers.delete(e.pointerId);
  if (pointers.size === 0) gesture = null;
});
canvas.addEventListener("pointercancel", (e) => {
  pointers.clear();
  gesture = null;
});
canvas.addEventListener("pointerleave", () => {
  if (!pointers.size) state.target = null;
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    state.follow = null;
    zoomTo(renderer.zoom - e.deltaY * 0.001);
  },
  { passive: false },
);
document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (e.code === "Space") {
    e.preventDefault();
    setSpeed(state.speed === 0 ? 1 : 0);
  }
  if (/^[1-5]$/.test(e.key)) choosePower(POWERS[+e.key - 1]);
  if (e.key.toLowerCase() === "j") ui.journal();
  if (e.key.toLowerCase() === "o") toggleObserve();
  if (e.key === "Escape") {
    ui.close();
    if (state.snapshot !== null) showSnapshot(null);
    if (state.observing) toggleObserve();
  }
});
document.addEventListener("visibilitychange", () => {
  last = performance.now();
  clock.reset();
  if (document.hidden) saveNow();
});
window.addEventListener("pagehide", () => saveNow());
function frame(now) {
  if (document.hidden) {
    last = now;
    clock.reset();
    requestAnimationFrame(frame);
    return;
  }
  if (now - lastRender < 1000 / 60 - 0.5) {
    requestAnimationFrame(frame);
    return;
  }
  lastRender = now;
  const elapsed = Math.max(0, (now - last) / 1000);
  last = now;
  const running = state.snapshot === null && !document.hidden ? state.speed : 0;
  state.world.fastVisual = running >= 20;
  const result = clock.advance(elapsed, running, () => step(state.world));
  effectiveSteps += result.steps;
  effectiveReal += elapsed;
  if (state.follow && state.snapshot === null) {
    const obj = state.world[
      state.follow.kind === "agent" ? "agents" : "groups"
    ].find((p) => p.id === state.follow.id);
    if (obj) {
      const q = project(obj),
        f = state.settings.reducedMotion ? 1 : Math.min(0.08, elapsed * 2);
      renderer.zoom += (1.8 - renderer.zoom) * f;
      renderer.pan.x += ((550 - q.x) * renderer.zoom - renderer.pan.x) * f;
      renderer.pan.y += ((500 - q.y) * renderer.zoom - renderer.pan.y) * f;
    } else state.follow = null;
  }
  const viewed =
    state.snapshot === null
      ? state.world
      : state.world.snapshots[state.snapshot] || state.world;
  renderer.render(viewed, {
    target: state.target,
    power: state.power,
    selected: state.selected,
    snapshot: state.snapshot !== null,
  });
  uiAcc += elapsed;
  if (uiAcc > 0.35) {
    ui.render();
    document.querySelector("#zoom-level").textContent =
      Math.round(renderer.zoom * 100) + "%";
    uiAcc = 0;
  }
  if (effectiveReal >= 1) {
    if (state.snapshot !== null)
      document.querySelector("#effective").textContent =
        "Recorded view · time paused";
    else
      document.querySelector("#effective").textContent =
        state.speed === 0
          ? "Paused"
          : state.speed === 1
            ? "Real time"
            : `${Math.min(state.speed, (effectiveSteps * DT) / effectiveReal).toFixed(1)}× effective / ${state.speed}× requested`;
    effectiveSteps = effectiveReal = 0;
  }
  if (
    now - lastSave > 45000 ||
    (autosaveDue && now - lastSave > 5000) ||
    (state.world.nextEvent - lastSavedEvent > 3 && now - lastSave > 12000)
  ) {
    saveNow();
    autosaveDue = false;
  }
  requestAnimationFrame(frame);
}
ui.render(true);
requestAnimationFrame(frame);
