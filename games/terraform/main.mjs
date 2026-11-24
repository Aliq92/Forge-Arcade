import {
  createWorld,
  step,
  applyTool,
  metrics,
  triggerDisaster,
  TOOLS,
  DISASTERS,
  HABITABILITY_FORMULA,
} from "./simulation.mjs";
import {
  MISSIONS,
  startMission,
  updateMission,
  missionProgress,
} from "./campaign.mjs";
import { Globe } from "./globe.mjs";
import {
  savePlanet,
  listPlanets,
  loadPlanet,
  deletePlanet,
  saveSession,
  loadSession,
  markComplete,
  completedMissions,
} from "./storage.mjs";
import { icon } from "./icons.mjs";

const $ = (id) => document.getElementById(id);
const on = (id, action) => $(id).addEventListener("click", action);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const seedDefault = "PELAGOS-042";
const modes = {
  campaign: "Campaign",
  sandbox: "Creative Sandbox",
  survival: "Survival",
};
const overlays = {
  surface: "Surface",
  temperature: "Temperature",
  moisture: "Moisture",
  elevation: "Elevation",
  habitability: "Habitability",
};
const keys = {
  temperature: [
    "Cold",
    "Hot",
    "linear-gradient(90deg,#3078c2,#e0c473,#d93d2e)",
  ],
  moisture: ["Dry", "Wet", "linear-gradient(90deg,#b87d42,#40a694,#2b5eb8)"],
  elevation: ["Low", "High", "linear-gradient(90deg,#214d78,#668f63,#d6c9a8)"],
  habitability: [
    "Low",
    "High",
    "linear-gradient(90deg,#8a4a4f,#b59c52,#3bb880)",
  ],
};
function updateOverlay() {
  $("view-name").textContent = overlays[overlay];
  const key = keys[overlay];
  $("overlay-key").hidden = !key;
  if (key) {
    $("overlay-low").textContent = key[0];
    $("overlay-high").textContent = key[1];
    $("overlay-key").style.setProperty("--scale", key[2]);
  }
}
const groups = {
  Inspection: "target",
  Terrain: "terrain",
  Climate: "climate",
  Water: "water",
  Life: "life",
};
const inspection = [
  {
    id: "inspect",
    name: "Inspect Region",
    description:
      "Select a surface region to read its terrain, climate and ecology.",
    symbol: "target",
  },
  ...Object.entries(overlays)
    .slice(1)
    .map(([id, label]) => ({
      id,
      name: label + " Overlay",
      description:
        "Map " +
        label.toLowerCase() +
        " across the surface. Select a region for local readings.",
      symbol: { moisture: "water", habitability: "pulse" }[id] || id,
    })),
];
const allTools = [...inspection, ...TOOLS];
const stats = [
  ["temperature", "Global temperature", "temperature", "#eeb392", "°C", 1],
  ["pressure", "Pressure", "pressure", "#b6a4e0", " bar", 2],
  ["oxygen", "Oxygen", "oxygen", "#80cbd3", "%", 1],
  ["co2", "Carbon dioxide", "co2", "#c5ae8f", "%", 2],
  ["water", "Water coverage", "water", "#80b9e3", "%", 1],
  ["vegetation", "Vegetation", "life", "#99cb95", "%", 1],
  ["wildlife", "Wildlife health", "wildlife", "#d3b39a", "%", 1],
];
for (const node of document.querySelectorAll("[data-icon]"))
  node.innerHTML = icon(node.dataset.icon);
$("stats").innerHTML = stats
  .map(
    ([key, label, symbol, color]) =>
      '<div class="stat" style="--tint:' +
      color +
      '">' +
      icon(symbol) +
      "<span>" +
      label +
      '</span><b id="stat-' +
      key +
      '"></b></div>',
  )
  .join("");
let world,
  speed = 1,
  selected = 0,
  overlay = "surface",
  tool = "inspect",
  group = "Inspection",
  lastScore = 0,
  trend = 0,
  dirty = false,
  lesson = -1,
  practice = null,
  lessonHold = 0;
let archiveBlocked = false,
  storageMessage = "",
  timer = 0,
  alive = true,
  carry = 0,
  previous = 0,
  frame = 0,
  lastWrite = 0;
let medals = new Set();
try {
  medals = new Set(completedMissions());
} catch (e) {
  storageMessage = e.message;
}
const globe = new Globe($("planet"), {
  onSelect: useRegion,
  onZoom: () => advance("zoom"),
  onRotate: () => advance("rotate"),
});
function toast(message) {
  $("feedback").textContent = message;
  clearTimeout(timer);
  if (message) timer = setTimeout(() => ($("feedback").textContent = ""), 4800);
}
function settings() {
  return { speed, selected, overlay };
}
function autosave() {
  if (!dirty || archiveBlocked || practice) return;
  try {
    saveSession(world, settings());
    dirty = false;
    lastWrite = performance.now();
  } catch (e) {
    archiveBlocked = true;
    toast(e.message);
  }
}
function newSeed() {
  return (
    "PELAGOS-" +
    crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36)
      .slice(-5)
      .toUpperCase()
  );
}
function install(w, s = {}) {
  world = w;
  selected =
    s.selected ??
    w.mission?.target ??
    Math.floor(w.cells.length / 2) + Math.floor(w.width / 2);
  speed = s.speed ?? 1;
  overlay = s.overlay ?? "surface";
  tool = "inspect";
  group = "Inspection";
  carry = 0;
  globe.setWorld(w);
  globe.setOverlay(overlay);
  globe.select(selected);
  lastScore = metrics(w).habitability;
  trend = 0;
  dirty = true;
  $("world-name").textContent =
    w.seed === seedDefault
      ? "Pelagos"
      : w.seed.startsWith("PELAGOS-")
        ? "Pelagos " + w.seed.slice(8)
        : w.seed;
  $("world-seed").textContent = "Seed " + w.seed;
  $("world-region").textContent = w.cells.length.toLocaleString() + " regions";
  $("mode-name").textContent = practice ? "Field training" : modes[w.mode];
  $("focus").hidden = !w.mission && !practice;
  drawTools();
  render();
  drawSpeeds();
}
function selectTool(id, restoreFocus = false) {
  tool = id;
  const def = allTools.find((t) => t.id === id);
  if (inspection.includes(def)) {
    overlay = id === "inspect" ? "surface" : id;
    globe.setOverlay(overlay);
  } else if (overlay !== "surface") {
    overlay = "surface";
    globe.setOverlay(overlay);
  }
  drawTools();
  if (restoreFocus)
    $("tools")
      .querySelector("[aria-pressed=true]")
      ?.focus({ preventScroll: true });
  updateOverlay();
  dirty = true;
}
function drawTools() {
  $("groups").replaceChildren();
  for (const [name, symbol] of Object.entries(groups)) {
    const b = document.createElement("button");
    b.title = name;
    b.setAttribute("aria-label", name + " tools");
    b.setAttribute("aria-pressed", group === name);
    b.classList.toggle("active", group === name);
    b.innerHTML = icon(symbol);
    b.onclick = () => {
      group = name;
      drawTools();
      $("groups")
        .querySelector("[aria-pressed=true]")
        ?.focus({ preventScroll: true });
    };
    $("groups").append(b);
  }
  $("tool-heading").textContent = group;
  $("tools").replaceChildren();
  for (const def of group === "Inspection"
    ? inspection
    : TOOLS.filter((t) => t.group === group)) {
    const locked =
      group !== "Inspection" &&
      world.mode === "campaign" &&
      !world.mission.allowed.includes(def.id);
    const b = document.createElement("button");
    b.className = "toolrow" + (tool === def.id ? " active" : "");
    b.dataset.tool = def.id;
    b.disabled = locked;
    b.title = locked ? "Unlocks in a later campaign mission" : def.description;
    b.innerHTML =
      icon(def.symbol || groups[group]) +
      "<span>" +
      def.name +
      "</span>" +
      (locked
        ? "<small>" + icon("lock") + "</small>"
        : def.cost && world.mode !== "sandbox"
          ? "<small>" + def.cost + " TE</small>"
          : "");
    b.onclick = () => selectTool(def.id, true);
    b.setAttribute("aria-pressed", tool === def.id);
    $("tools").append(b);
  }
  $("tool-hint").textContent = allTools.find((t) => t.id === tool).description;
  $("apply-selected").hidden = !TOOLS.some((t) => t.id === tool);
}
on("apply-selected", () => useRegion(selected));
function coords(i) {
  const lat = (0.5 - (Math.floor(i / world.width) + 0.5) / world.height) * 180,
    lon = (((i % world.width) + 0.5) / world.width - 0.5) * 360;
  return (
    Math.abs(lat).toFixed(1) +
    "°" +
    (lat >= 0 ? "N" : "S") +
    " / " +
    Math.abs(lon).toFixed(1) +
    "°" +
    (lon >= 0 ? "E" : "W")
  );
}
function biome(c) {
  if (c.fire > 0.05) return "Wildfire";
  if (c.heat > 0.35) return "Volcanic terrain";
  if (c.ice > 0.04) return "Ice field";
  if (c.water > 0.045) return "Open water";
  if (c.forest > 0.15) return "Woodland";
  if (c.grass > 0.13) return "Grassland";
  if (c.elevation > 0.71) return "Highlands";
  return c.moisture < 0.23 ? "Arid lowlands" : "Rocky lowlands";
}
function useRegion(i) {
  if (!Number.isInteger(i) || !world.cells[i]) return;
  selected = i;
  dirty = true;
  if (inspection.some((d) => d.id === tool)) {
    advance("inspect");
    toast(biome(world.cells[i]) + " · " + coords(i));
  } else {
    if (!applyTool(world, tool, i)) {
      render();
      toast(
        "Insufficient terraforming energy. Survey income arrives as time advances.",
      );
      return;
    }
    globe.update();
    const def = TOOLS.find((t) => t.id === tool);
    toast(
      def.name +
        " applied" +
        (world.mode === "sandbox" ? "" : "  ·  −" + def.cost + " TE"),
    );
    advance(tool);
  }
  render();
}
function drawSpeeds() {
  $("speeds").replaceChildren();
  for (const v of [0, 1, 2, 4]) {
    const b = document.createElement("button");
    b.dataset.speed = v;
    b.innerHTML = v ? v + "×" : icon("pause");
    b.title = v ? v + "× speed" : "Pause";
    b.setAttribute("aria-label", b.title);
    b.classList.toggle("active", speed === v);
    b.setAttribute("aria-pressed", speed === v);
    b.onclick = () => {
      speed = v;
      carry = 0;
      dirty = true;
      drawSpeeds();
      $("speeds")
        .querySelector("[aria-pressed=true]")
        .focus({ preventScroll: true });
      advance("speed");
    };
    $("speeds").append(b);
  }
  $("time-status").textContent = speed ? "Simulation live" : "Paused";
}
function render() {
  const m = metrics(world);
  for (const [key, , , , unit, n] of stats)
    $("stat-" + key).textContent = m[key].toFixed(n) + unit;
  $("habit").textContent = Math.round(m.habitability);
  $("habit-bar").style.width = m.habitability + "%";
  $("trend").textContent =
    trend > 0.04 ? "↗ Rising" : trend < -0.04 ? "↘ Falling" : "→ Steady";
  $("day").textContent = String(world.tick + 1).padStart(4, "0");
  $("energy").textContent =
    world.mode === "sandbox" ? "∞ TE" : world.energy + " TE";
  updateOverlay();
  const c = world.cells[selected];
  $("region-title").textContent = biome(c) + " · " + coords(selected);
  const readings = [
    c.temperature.toFixed(1) + " °C",
    Math.round(c.moisture * 100) + "% soil moisture",
    Math.round(c.elevation * 100) + "% elevation",
    Math.round(c.water * 100) + "% water depth",
    Math.round(100 * (c.herbivores + c.predators + c.aquatic)) +
      "% wildlife density",
  ];
  if (c.rain > 0.01) readings.push("Rain falling");
  if (c.flow > 0.004 && c.downstream >= 0)
    readings.push("Runoff toward " + coords(c.downstream));
  $("region-data").textContent = readings.join(" · ");
  let fraction = 0,
    label = "",
    title = "",
    description = "",
    kicker = "";
  if (world.mode === "campaign") {
    const { index, complete } = world.mission;
    const mission = MISSIONS[index],
      progress = missionProgress(world);
    kicker =
      (complete ? "MISSION COMPLETE" : "ACTIVE OBJECTIVE") +
      "   /   " +
      String(index + 1).padStart(2, "0") +
      " OF 15";
    title = mission.name;
    description = mission.objective;
    fraction = progress.fraction;
    label = progress.label;
  } else if (world.mode === "survival") {
    kicker = "SURVIVAL OBJECTIVE";
    title = "Endure the storm";
    description =
      "Survive 180 sols and sustain a living ecosystem for 12 consecutive sols. Aim for habitability above 48, vegetation above 3%, wildlife health above 22%, and wildlife abundance above 0.12%.";
    fraction = world.survivalComplete
      ? 1
      : Math.min(1, world.tick / 180, world.stableTicks / 12);
    label = world.survivalComplete
      ? "Expedition achieved"
      : Math.min(180, world.tick) +
        "/180 sols · " +
        Math.min(12, world.stableTicks) +
        "/12 stable · " +
        m.abundance.toFixed(2) +
        "% wildlife abundance";
    if (world.warning) description = world.warning;
  } else {
    kicker = practice ? "TRAINING OBJECTIVE" : "CREATIVE SANDBOX";
    title = practice ? "A pocket ecosystem" : "World laboratory";
    description = practice
      ? "Keep the training site moist and vegetated for three sols."
      : "Shape the surface freely. Set the weather or trigger a local disturbance in your selected region.";
    label = practice
      ? lessonHold + "/3 stable sols"
      : "Weather · " + cap(world.weather);
    fraction = practice ? lessonHold / 3 : 0;
  }
  $("mission-kicker").textContent = kicker;
  $("mission-title").textContent = title;
  $("mission-text").textContent = description;
  $("progress").style.width = 100 * fraction + "%";
  $("progress-label").textContent = label;
  $("missions").title =
    world.mode === "sandbox" ? "Weather controls" : "Objectives";
  $("missions").setAttribute("aria-label", $("missions").title);
}
function simulate() {
  const oldWarning = world.warning;
  step(world);
  if (world.mode === "campaign" && updateMission(world)) {
    medals.add(world.mission.index);
    try {
      markComplete(world.mission.index);
    } catch (e) {
      toast(e.message);
    }
    toast("Mission complete · +30 TE. Open objectives to continue.");
  }
  if (
    world.mode === "survival" &&
    world.tick >= 180 &&
    world.stableTicks >= 12 &&
    !world.survivalComplete
  ) {
    world.survivalComplete = true;
    toast("Survival objective achieved!");
  }
  if (world.warning && world.warning !== oldWarning) toast(world.warning);
  if (world.event?.tick === world.tick)
    toast(cap(world.event.type) + " · " + coords(world.event.index));
  if (practice && lesson === 7) {
    const site = world.cells[practice.target];
    lessonHold = site.grass > 0.08 && site.moisture > 0.18 ? lessonHold + 1 : 0;
    if (lessonHold >= 3) advance("objective");
  }
  dirty = true;
}
function animate(time) {
  if (!alive) return;
  const dt = Math.min(250, time - (previous || time));
  previous = time;
  if (!document.hidden && !$("dialog").open && speed) {
    carry += dt * speed;
    if (carry >= 1000) {
      while (carry >= 1000) {
        simulate();
        carry -= 1000;
      }
      const score = metrics(world).habitability;
      trend = score - lastScore;
      lastScore = score;
      globe.update();
      render();
    }
  }
  if (dirty && time - lastWrite > 15000) {
    lastWrite = time;
    autosave();
  }
  frame = requestAnimationFrame(animate);
}

const dialog = $("dialog"),
  content = $("dialog-content");
function panel(title) {
  $("dialog-title").textContent = title;
  content.replaceChildren();
  if (!dialog.open) dialog.showModal();
  carry = 0;
}
function paragraph(text, kind = "dialog-copy") {
  const p = document.createElement("p");
  p.className = kind;
  p.textContent = text;
  content.append(p);
  return p;
}
function heading(text) {
  const h = document.createElement("h3");
  h.textContent = text;
  content.append(h);
}
function choice(
  title,
  detail,
  action,
  { disabled = false, active = false } = {},
) {
  const b = document.createElement("button");
  b.className = "choice" + (active ? " active" : "");
  b.disabled = disabled;
  const strong = document.createElement("strong");
  strong.textContent = title;
  b.append(strong);
  if (detail) {
    const sub = document.createElement("span");
    sub.textContent = detail;
    b.append(sub);
  }
  b.onclick = () => {
    try {
      action();
    } catch (e) {
      paragraph(e.message, "notice");
    }
  };
  content.append(b);
  return b;
}
function exitDialog() {
  dialog.close();
  carry = 0;
}
on("close", exitDialog);
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      exitDialog();
  }
});
function startOther(w, s) {
  if (practice) endPractice(false);
  if (world.tick > 0 || dirty) savePlanet(world, settings());
  install(w, s);
  exitDialog();
  autosave();
}
function startNew(mode, seed, index = 0) {
  startOther(
    mode === "campaign" ? startMission(index, seed) : createWorld(seed, mode),
  );
}
function openModes() {
  panel("Simulation mode");
  paragraph("Changing mode archives a snapshot of your current world.");
  for (const [id, description] of Object.entries({
    campaign:
      "Restore a planet across 15 field missions with a limited energy budget.",
    sandbox: "Explore with unlimited energy, weather controls and every tool.",
    survival:
      "Endure disasters and keep an ecosystem stable for the long term.",
  })) {
    choice(
      modes[id],
      id === world.mode ? "Current expedition · " + description : description,
      () => {
        if (id === world.mode) exitDialog();
        else startNew(id, newSeed());
      },
      { active: id === world.mode },
    );
  }
}
on("mode", openModes);
function openWorlds(note = "") {
  panel("Planet archive");
  if (note) paragraph(note, "notice");
  choice(
    "Save planet",
    "Create a new snapshot of this planet, including its current systems and simulation speed.",
    () => {
      if (practice)
        throw new Error("Finish field training to save your expedition.");
      savePlanet(world, settings());
      openWorlds("Planet saved in this browser.");
    },
  );
  heading("Saved planets");
  try {
    const slots = listPlanets();
    if (!slots.length) paragraph("Your saved planets will appear here.");
    for (const slot of slots)
      choice(
        slot.seed,
        slot.error ||
          modes[slot.mode] +
            " · Sol " +
            (slot.tick + 1) +
            " · " +
            new Date(slot.savedAt).toLocaleString(),
        () => {
          const { world: w, settings: s } = loadPlanet(slot.id);
          startOther(w, s);
          toast("Planet restored");
        },
        { disabled: !!slot.error },
      );
  } catch (e) {
    paragraph(e.message, "notice");
  }
  choice(
    "Manage snapshots",
    "Free browser storage by removing individual snapshots.",
    manageSnapshots,
  );
  if (archiveBlocked) {
    choice(
      "Restore automatic saving",
      "Replace the active resume slot with this world. Archived snapshots are kept.",
      () => {
        if (practice) throw new Error("Finish field training first.");
        saveSession(world, settings());
        archiveBlocked = false;
        dirty = false;
        openWorlds("Automatic saving restored.");
      },
    );
  }
  heading("Planet generation");
  const label = document.createElement("label");
  label.htmlFor = "seed-input";
  label.textContent = "Seed for new planet (optional)";
  const input = document.createElement("input");
  input.id = "seed-input";
  input.maxLength = 48;
  input.autocomplete = "off";
  input.placeholder = "Generate a random seed";
  content.append(label, input);
  choice(
    "New Planet",
    "Archive this world and generate a fresh planet in the current mode.",
    () =>
      startNew(
        world.mode,
        input.value.trim() || newSeed(),
        world.mission?.index,
      ),
  );
  choice(
    "Regenerate",
    "Archive a snapshot, then restart this seed with its original conditions.",
    () => startNew(world.mode, world.seed, world.mission?.index),
  );
}
function manageSnapshots() {
  panel("Manage snapshots");
  choice("Back to planet archive", "", () => openWorlds());
  const slots = listPlanets();
  if (!slots.length) paragraph("There are no snapshots to remove.");
  for (const slot of slots) {
    const date = slot.savedAt ? new Date(slot.savedAt).toLocaleString() : "";
    choice(
      slot.seed,
      [modes[slot.mode], date].filter(Boolean).join(" · "),
      () => {
        panel("Remove snapshot?");
        paragraph(slot.seed + (date ? " · " + date : ""));
        choice("Keep snapshot", "", manageSnapshots);
        choice(
          "Remove this snapshot",
          "Permanently delete this snapshot from this browser.",
          () => {
            deletePlanet(slot.id);
            manageSnapshots();
          },
        );
      },
    );
  }
}
on("worlds", () => openWorlds());
function weather() {
  panel("Climate laboratory");
  paragraph(
    "Weather changes affect the entire planet. Disturbances begin at the selected surface region.",
  );
  heading("Weather");
  const options = document.createElement("select");
  options.setAttribute("aria-label", "Weather pattern");
  for (const id of ["normal", "wet", "dry", "hot", "cold"])
    options.add(new Option(cap(id), id));
  options.value = world.weather;
  options.onchange = () => {
    world.weather = options.value;
    dirty = true;
    render();
  };
  content.append(options);
  heading("Local disturbance");
  const disaster = document.createElement("select");
  disaster.setAttribute("aria-label", "Disturbance");
  for (const d of DISASTERS) disaster.add(new Option(cap(d), d));
  content.append(disaster);
  choice(
    "Trigger disturbance",
    "Affect the region at " + coords(selected) + ".",
    () => {
      triggerDisaster(world, disaster.value, selected);
      dirty = true;
      globe.update();
      render();
      exitDialog();
      toast(cap(disaster.value) + " at " + coords(selected));
    },
  );
}
function objectives() {
  if (world.mode === "sandbox") {
    weather();
    return;
  }
  panel(world.mode === "campaign" ? "Mission log" : "Survival log");
  if (world.mode === "survival") {
    paragraph($("mission-text").textContent);
    paragraph($("progress-label").textContent, "notice");
    if (world.event)
      paragraph(
        "Latest disturbance · " +
          cap(world.event.type) +
          " at " +
          coords(world.event.index),
      );
    choice(
      "Restart survival",
      "Archive a snapshot and begin this seed again.",
      () => startNew("survival", world.seed),
    );
    return;
  }
  const index = world.mission.index;
  if (world.mission.complete && index < 14)
    choice("Next mission", MISSIONS[index + 1].name, () =>
      startNew("campaign", world.seed, index + 1),
    );
  choice(
    "Restart mission",
    MISSIONS[index].name +
      " · " +
      MISSIONS[index].budget +
      " TE starting allowance.",
    () => startNew("campaign", world.seed, index),
  );
  MISSIONS.forEach((m, i) => {
    if (i % 5 === 0)
      heading(
        ["First life", "Living systems", "Planetary mastery"][
          Math.floor(i / 5)
        ],
      );
    const unlocked =
      i === 0 || medals.has(i - 1) || medals.has(i) || index === i;
    choice(
      String(i + 1).padStart(2, "0") + " · " + m.name,
      (medals.has(i)
        ? "Completed · "
        : i === index
          ? "Active · "
          : !unlocked
            ? "Locked · "
            : "") +
        m.budget +
        " TE",
      () => {
        if (index === i) exitDialog();
        else startNew("campaign", world.seed, i);
      },
      { disabled: !unlocked, active: index === i },
    );
  });
}
on("missions", objectives);
on("formula", () => {
  panel("Habitability index");
  paragraph("A gameplay score from 0 to 100. " + HABITABILITY_FORMULA);
  paragraph(
    "The trend compares the latest simulation reading with the previous one.",
  );
});
on("overlay-open", () => {
  panel("Surface overlays");
  for (const [id, name] of Object.entries(overlays))
    choice(
      name,
      id === "surface"
        ? "Natural terrain, water, vegetation and weather."
        : "Color the surface by regional " + name.toLowerCase() + ".",
      () => {
        group = "Inspection";
        selectTool(id === "surface" ? "inspect" : id);
        exitDialog();
      },
      { active: id === overlay },
    );
});
on("focus", () => {
  selected = world.mission?.target ?? practice?.target ?? selected;
  globe.select(selected);
  render();
  toast("Survey target · " + coords(selected));
  dirty = true;
});
on("zoom-out", () => {
  globe.zoomBy(0.88);
  advance("zoom");
});
on("zoom-in", () => {
  globe.zoomBy(1.14);
  advance("zoom");
});
on("reset-camera", () => globe.resetCamera());
const mq = matchMedia(
  "(max-width:760px), (max-width:1000px) and (max-height:560px)",
);
function collapse() {
  for (const id of ["tools-toggle", "telemetry-toggle"])
    $(id).setAttribute("aria-expanded", String(!mq.matches));
}
for (const id of ["tools-toggle", "telemetry-toggle"])
  on(id, () => {
    if (mq.matches)
      $(id).setAttribute(
        "aria-expanded",
        String($(id).getAttribute("aria-expanded") !== "true"),
      );
  });
collapse();
mq.addEventListener("change", collapse);
function guide() {
  panel("Field guide");
  choice(
    "Start interactive tutorial",
    "Practice eight controls in a temporary training world. Your expedition resumes afterward.",
    beginPractice,
  );
  heading("Camera & regions");
  paragraph(
    "Drag to rotate, scroll or pinch to zoom. With the planet focused, use the arrow keys to rotate and Enter to use the active tool at the center. Focus target centers the campaign survey site.",
  );
  heading("Terraforming");
  paragraph(
    "Choose a toolbox category, select a tool, then click or tap a region. Each tool acts on a cluster of nearby regions. Check the price beside its name before applying it.",
  );
  heading("Reading the planet");
  paragraph(HABITABILITY_FORMULA);
  paragraph(
    "Water coverage measures regions with standing water or ice. Wildlife health averages food and habitat quality across animal populations. Water depth, elevation and populations use normalized game units.",
  );
  heading("Time & energy");
  paragraph(
    "Each sol advances one environmental step. Pausing freezes the planet and its event clock. Limited-energy expeditions receive periodic survey income and earn extra TE for ecological stability.",
  );
  heading("Planet archive");
  paragraph(
    "Your active expedition resumes on refresh. Save planet makes an independent snapshot. Switching expeditions archives the current world in this browser.",
  );
}
on("help", guide);
on("guide", guide);
const lessons = [
  [
    "rotate",
    "Rotate the planet",
    "Drag the globe or focus it and press an arrow key.",
  ],
  [
    "zoom",
    "Move closer",
    "Scroll over the globe, pinch, or use the + and − buttons.",
  ],
  [
    "inspect",
    "Inspect a region",
    "Select any point on the surface to read its local conditions.",
  ],
  [
    "moisten",
    "Prepare the soil",
    "Climate → Add Moisture is selected. Apply it to the marker at the center.",
  ],
  [
    "water",
    "Add surface water",
    "Add Water is selected. Release water into a region beside the marker.",
  ],
  [
    "grass",
    "Plant pioneer grass",
    "Plant Grass is selected. Sow the marked region.",
  ],
  ["speed", "Run the simulation", "Select 1×, 2× or 4× to advance time."],
  [
    "objective",
    "Sustain the habitat",
    "Keep the target moist and vegetated for three sols. Focus target to return there.",
  ],
];
function beginPractice() {
  if (practice) endPractice(false);
  autosave();
  const w = createWorld("FIELD-TRAINING", "sandbox");
  const target = worldTrainingSite(w);
  practice = { world, settings: settings(), target };
  lesson = 0;
  lessonHold = 0;
  install(w, { speed: 0, selected: target });
  exitDialog();
  showLesson();
  $("tutorial").scrollIntoView({ block: "nearest" });
}
function worldTrainingSite(w) {
  const y = Math.floor(w.height * 0.52);
  let best = y * w.width;
  for (let i = y * w.width; i < (y + 1) * w.width; i++)
    if (
      Math.abs(w.cells[i].elevation - 0.53) <
      Math.abs(w.cells[best].elevation - 0.53)
    )
      best = i;
  return best;
}
function showLesson() {
  $("tutorial").hidden = false;
  $("lesson-count").textContent =
    "FIELD TRAINING   /   " + (lesson + 1) + " OF 8";
  $("lesson-title").textContent = lessons[lesson][1];
  $("lesson-text").textContent = lessons[lesson][2];
  if ([3, 4, 5].includes(lesson)) {
    const def = TOOLS.find((t) => t.id === lessons[lesson][0]);
    group = def.group;
    selectTool(def.id);
    globe.select(practice.target);
    selected = practice.target;
    render();
  }
  toast(lessons[lesson][2]);
}
function advance(event) {
  if (
    !practice ||
    lessons[lesson]?.[0] !== event ||
    (event === "speed" && !speed)
  )
    return;
  if (
    (event === "grass" || event === "moisten") &&
    selected !== practice.target
  ) {
    toast("Select Focus target, then apply the tool at the center.");
    return;
  }
  if (lesson === 7) {
    endPractice(true);
    return;
  }
  lesson++;
  showLesson();
}
function endPractice(finished) {
  if (!practice) return;
  const prior = practice;
  practice = null;
  lesson = -1;
  $("tutorial").hidden = true;
  install(prior.world, prior.settings);
  toast(
    finished
      ? "Field training completed · Expedition resumed"
      : "Expedition resumed",
  );
}
on("skip", () => endPractice(false));
function drawStars() {
  const c = $("stars"),
    r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.round(r.width));
  c.height = Math.max(1, Math.round(r.height));
  const ctx = c.getContext("2d");
  let seed = 391;
  const rand = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < (c.width * c.height) / 850; i++) {
    const x = rand() * c.width,
      y = rand() * c.height,
      size = rand();
    ctx.fillStyle = "rgba(194,221,218," + (0.14 + rand() * 0.55) + ")";
    ctx.fillRect(x, y, size > 0.97 ? 2 : 1, size > 0.97 ? 2 : 1);
    if (size > 0.985) {
      ctx.fillStyle = "#b2d3d644";
      ctx.fillRect(x - 2, y + 0.5, 6, 1);
      ctx.fillRect(x + 0.5, y - 2, 1, 6);
    }
  }
}
const starObserver = new ResizeObserver(drawStars);
starObserver.observe($("stars"));
let resumed = null;
try {
  resumed = loadSession();
} catch (e) {
  archiveBlocked = true;
  storageMessage =
    e.message +
    " Automatic saving is paused to preserve that session. New snapshots are available in Worlds.";
}
install(resumed?.world ?? startMission(0, seedDefault), resumed?.settings);
if (world.mission?.complete) {
  medals.add(world.mission.index);
  try {
    markComplete(world.mission.index);
  } catch (e) {
    storageMessage = e.message;
  }
}
if (storageMessage) toast(storageMessage);
document.addEventListener("visibilitychange", () => {
  carry = 0;
  previous = 0;
  if (document.hidden) autosave();
});
window.addEventListener("pagehide", (event) => {
  autosave();
  if (!event.persisted) {
    alive = false;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    starObserver.disconnect();
    mq.removeEventListener("change", collapse);
    globe.destroy();
  }
});
frame = requestAnimationFrame(animate);
