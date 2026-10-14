import { DAY } from "./world.js";
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pretty = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export function createUI(state, actions) {
  const panel = document.querySelector("#panel");
  let mode = null,
    tab = "HISTORY",
    inspect = null,
    lastKey = "",
    toastTimer;
  function toast(message) {
    const t = document.querySelector("#toast");
    t.textContent = message;
    t.style.opacity = 1;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.style.opacity = 0), 5500);
  }
  function close() {
    panel.hidden = true;
    mode = null;
    inspect = null;
    lastKey = "";
  }
  function open(m, item = null) {
    mode = m;
    inspect = item;
    panel.hidden = false;
    lastKey = "";
    render(true);
  }
  const viewed = () =>
    state.snapshot === null
      ? state.world
      : state.world.snapshots[state.snapshot] || state.world;
  const causal = (e) =>
    e.origin
      ? `<button class="causal" data-origin="${e.origin}">↳ Origin event #${e.origin}</button>`
      : "";
  function historyHTML() {
    const w = state.world;
    if (tab === "CIVILIZATIONS")
      return w.groups.length
        ? w.groups
            .map(
              (g) =>
                `<button class="group-card" data-group="${g.id}"><strong>${escape(g.name)}</strong><small>${w.agents.filter((a) => a.groupId === g.id).length} creatures · formed on day ${Math.floor(g.formed / DAY) + 1}</small></button>`,
            )
            .join("")
        : '<p class="detail">There are no settlements yet. Watch where creatures meet and return.</p>';
    const filter =
      tab === "DISCOVERIES"
        ? (e) =>
            [
              "STRANGE_OBJECT_DISCOVERED",
              "NEW_LANDMARK",
              "NEW_CULTURAL_PRACTICE",
              "ARTIFACT_CARRIED",
              "ENVIRONMENTAL_ADAPTATION",
            ].includes(e.type)
        : tab === "GENERATIONS"
          ? (e) =>
              ["NEW_GENERATION", "POPULATION_MILESTONE", "ELDER"].includes(
                e.type,
              )
          : () => true;
    const entries = w.history.filter(filter).slice().reverse();
    const snapshots = w.snapshots;
    return `${tab === "HISTORY" ? `<div class="timeline"><span class="eyebrow">RECORDED HISTORY</span><p class="tip">Snapshots every five days and at major milestones. Past views are read only.</p>${snapshots.length ? `<input id="timeline" aria-label="Recorded historical snapshot" type="range" min="0" max="${snapshots.length}" value="${state.snapshot === null ? snapshots.length : state.snapshot}" step="1"><p class="snapshot-note">${state.snapshot === null ? "Viewing the present" : `Recorded snapshot · day ${Math.floor(snapshots[state.snapshot]?.time / DAY) + 1}`}</p><button class="panel-action" data-action="present">Return to present →</button>` : '<p class="detail">The archive begins after the first gathering.</p>'}</div>` : ""}${entries.length ? entries.map((e) => `<article><span class="eyebrow">DAY ${e.day} / ${escape(e.type.replaceAll("_", " "))}</span><h3>${escape(e.title)}</h3><p>${escape(e.description)}</p>${causal(e)}<button class="causal" data-locate="${e.id}">Locate ↗</button></article>`).join("") : '<p class="detail">This page is still unwritten.</p>'}`;
  }
  function groupHTML(g, w) {
    if (!g)
      return '<p class="detail">This settlement is absent from this recorded view.</p>';
    const traditions = w.sites.filter((s) => s.traditions.includes(g.id));
    return `<span class="eyebrow">SETTLEMENT / DAY ${Math.floor(g.formed / DAY) + 1}</span><p class="detail">${w.agents.filter((a) => a.groupId === g.id).length} inhabitants · ${w.structures.filter((s) => s.groupId === g.id && s.progress >= 1).length} completed structures</p>${Object.entries(
      g.culture,
    )
      .map(
        ([k, v]) =>
          `<div class="bar"><label>${k}<span>${Math.round(v * 100)}%</span></label><div><i style="width:${v * 100}%"></i></div></div>`,
      )
      .join(
        "",
      )}<h4>PLACES THAT MATTER</h4>${traditions.length ? traditions.map((s) => `<article><h3>${escape(s.title)}</h3><p>${s.visits} recorded visits · ${s.witnesses.length} recent witnesses<br>Significance ${Math.round(s.significance[g.id] || 0)} / 100</p><button class="causal" data-origin="${s.origin}">↳ Origin · day ${s.originDay}</button></article>`).join("") : '<p class="detail">No established traditions yet. Shared experience takes time.</p>'}<h4>STRUCTURES</h4><p class="detail">${
      w.structures
        .filter((s) => s.groupId === g.id)
        .map(
          (s) =>
            `${escape(pretty(s.kind))} ${s.progress < 1 ? Math.round(s.progress * 100) + "% built" : ""}`,
        )
        .join(" · ") || "None yet"
    }</p><button class="panel-action" data-action="follow">Follow this settlement</button>`;
  }
  function inspectionHTML() {
    const w = viewed();
    if (inspect.kind === "group")
      return groupHTML(
        w.groups.find((g) => g.id === inspect.id),
        w,
      );
    if (inspect.kind === "agent") {
      const a = w.agents.find((a) => a.id === inspect.id);
      if (!a)
        return '<p class="detail">This creature has completed its life. Its settlement and shared memories continue.</p>';
      const traits = Object.entries(a.traits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(
          ([k]) =>
            ({
              curiosity: "Curious",
              caution: "Cautious",
              social: "Social",
              inventiveness: "Inventive",
              tradition: "Traditional",
            })[k],
        );
      const home = w.groups.find((g) => g.id === a.groupId),
        site = w.sites.find((s) => s.id === a.target?.siteId);
      return `<span class="eyebrow">GENERATION ${a.generation} / ${a.age < 12 ? "YOUNG" : a.age > 85 ? "ELDER" : "ADULT"}</span><p class="detail">${Math.floor(a.age)} days old · ${traits.join(" · ")}<br>${home ? escape(home.name) : "An unclaimed world"}</p><h4>CURRENTLY</h4><p class="detail">${pretty(a.action)}${site ? " · " + escape(site.title) : ""}</p><h4>SIGNIFICANT MEMORIES</h4>${
        a.memories.length
          ? a.memories
              .slice()
              .reverse()
              .map(
                (m) =>
                  `<article><h3>${escape(m.title)}</h3><small>Day ${m.day} · ${m.learned ? "Learned through social contact" : "Witnessed directly"}</small><br><button class="causal" data-origin="${m.eventId}">Trace this memory →</button></article>`,
              )
              .join("")
          : '<p class="detail">Nothing strange has happened yet.</p>'
      }<button class="panel-action" data-action="follow">Follow ${escape(a.name)}</button>`;
    }
    if (inspect.kind === "artifact") {
      const a = w.artifacts.find((a) => a.id === inspect.id);
      if (!a) return '<p class="detail">No fragment in this recorded view.</p>';
      return `<span class="eyebrow">ARTIFACT / ${a.z > 0 ? "FALLING" : a.carrierId ? "BEING CARRIED" : a.stored ? "STORED NEAR HOME" : "ON THE GROUND"}</span><p class="detail">A tiny piece of confetti. Entirely unnecessary.<br>${a.observations} inspections · ${a.inspectors.length} distinct recent observers</p><p class="detail">${a.everCarried ? "A creature has carried this fragment." : "It has not been carried yet."}</p><button class="causal" data-origin="${a.origin}">↳ Dropped on day ${a.originDay}</button>`;
    }
    const s =
      inspect.kind === "site"
        ? w.sites.find((s) => s.id === inspect.id)
        : w.structures.find((s) => s.id === inspect.id);
    if (!s) return "";
    if (inspect.kind === "site")
      return `<p class="detail">${s.visits} visits · ${s.witnesses.length} recent witnesses<br>${s.traditions.length} settlement traditions</p><button class="causal" data-origin="${s.origin}">↳ Origin · day ${s.originDay}</button>`;
    return `<p class="detail">${pretty(s.kind)} · ${Math.round(s.progress * 100)}% complete<br>Built autonomously by ${escape(w.groups.find((g) => g.id === s.groupId)?.name)}</p>${s.siteId ? `<button class="panel-action" data-site="${s.siteId}">Why this place matters →</button>` : ""}`;
  }
  function title() {
    if (mode === "journal") return "Experiment Journal";
    if (mode === "experiment" || mode === "confirm") return "Experiments";
    if (mode === "settings") return "Settings";
    if (mode === "origin") return "A causal thread";
    const w = viewed();
    if (inspect?.kind === "agent")
      return (
        w.agents.find((a) => a.id === inspect.id)?.name || "A remembered life"
      );
    if (inspect?.kind === "group")
      return w.groups.find((g) => g.id === inspect.id)?.name || "Settlement";
    if (inspect?.kind === "artifact") return "The fallen color";
    if (inspect?.kind === "site")
      return (
        w.sites.find((s) => s.id === inspect.id)?.title || "Remembered place"
      );
    return "A small structure";
  }
  function body() {
    const w = state.world;
    if (mode === "journal")
      return `<div class="tabs">${["HISTORY", "CIVILIZATIONS", "DISCOVERIES", "GENERATIONS"].map((t) => `<button data-tab="${t}" class="${t === tab ? "active" : ""}">${pretty(t)}</button>`).join("")}</div>${historyHTML()}`;
    if (mode === "inspect") return inspectionHTML();
    if (mode === "experiment")
      return `<span class="eyebrow">WORLD SEED</span><p class="seed">${escape(w.seed)}</p><button class="panel-action" data-action="copy">Copy seed ↗</button><button class="panel-action" data-action="confetti">✧ Drop confetti</button><p class="tip">Place one physical fragment inside the jar. Whether anyone cares is up to them. Maximum six fragments.</p><button class="panel-action" data-action="save">Save experiment</button><button class="panel-action" data-action="export">Export save file</button><button class="panel-action" data-action="new">New experiment →</button><p class="tip">Your world saves locally every 45 seconds. A fresh experiment replaces this jar.</p>`;
    if (mode === "confirm")
      return `<p class="detail">Begin a new jar? This will replace your current local progress. Export a save file first if you want to keep this experiment.</p><label class="eyebrow" for="new-seed">OPTIONAL REPEATABLE SEED</label><input id="new-seed" type="text" maxlength="80" placeholder="Leave blank for a new seed" style="width:100%;padding:12px;margin-top:10px;border:1px solid #ffffff20;border-radius:6px;background:#0003"><button class="panel-action" data-action="confirm-new">Begin new experiment</button><button class="panel-action" data-action="cancel-new">Keep this jar</button>`;
    if (mode === "settings")
      return `<label class="checkbox"><input type="checkbox" id="sound" ${state.settings.sound ? "checked" : ""}> Quiet laboratory sound</label><label class="checkbox"><input type="checkbox" id="reduced" ${state.settings.reducedMotion ? "checked" : ""}> Reduce motion and celebrations</label><p class="tip">Sound starts only after you enable it. This is a stylized artificial-life model, driven by traceable rules.</p><h4>CONTROLS</h4><p class="detail">Tap a creature or structure to inspect it.<br>Choose a power, then touch the terrain.<br>Drag to pan when zoomed. Pinch or use +/− to zoom.<br>Space: pause · 1–5: powers<br>J: journal · O: observe · Esc: close</p><p class="tip">At high speed, the simulation runs discrete steps. Effective speed is measured; slow devices may achieve less than 100×.</p>`;
    if (mode === "origin") {
      const e = w.history.find((e) => e.id === inspect.id),
        s = w.sites.find((s) => s.origin === inspect.id),
        a = w.artifacts.find((a) => a.origin === inspect.id);
      return e
        ? `<article><span class="eyebrow">DAY ${e.day} / EVENT #${e.id}</span><h3>${escape(e.title)}</h3><p>${escape(e.description)}</p>${causal(e)}</article>${s ? `<p class="detail">This place has since received ${s.visits} visits and holds ${s.traditions.length} established traditions.</p>` : ""}`
        : s
          ? `<span class="eyebrow">DAY ${s.originDay} / EVENT #${s.origin}</span><h3>${escape(s.originTitle)}</h3><p class="detail">The original entry has left the bounded journal. This place preserves its origin and ${s.visits} later visits.</p>`
          : a
            ? `<p class="detail">A confetti fragment entered on day ${a.originDay}. Its origin is preserved by the artifact.</p>`
            : '<p class="detail">This event has left the bounded journal. The creature still carries its memory.</p>';
    }
    return "";
  }
  function render(force = false) {
    const w = viewed();
    document.querySelector("#day").textContent =
      "Day " + (Math.floor(w.time / DAY) + 1);
    document.querySelector("#population").textContent =
      w.agents.length + " creatures";
    document.querySelector("#generation").textContent =
      "Generation " + w.maxGeneration;
    document.querySelector(".specimen h1").textContent = w.era;
    document.querySelector(".specimen .eyebrow").textContent =
      state.snapshot === null
        ? "LIVE SPECIMEN / " + state.world.seed.slice(-6).toUpperCase()
        : "RECORDED SNAPSHOT / READ ONLY";
    if (!mode) return;
    const key = mode + tab + inspect?.id + w.tick + state.snapshot;
    if (!force && key === lastKey) return;
    if (
      ["experiment", "confirm", "settings", "origin"].includes(mode) &&
      !force &&
      lastKey
    )
      return;
    if (!force && panel.contains(document.activeElement)) return;
    lastKey = key;
    const scroll = panel.scrollTop;
    panel.innerHTML = `<div class="panel-head"><h2>${escape(title())}</h2><button class="close" aria-label="Close panel" data-action="close">×</button></div>${body()}`;
    panel.scrollTop = force ? 0 : scroll;
  }
  panel.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if (d.tab) {
      tab = d.tab;
      mode = "journal";
      render(true);
    }
    if (d.group) open("inspect", { kind: "group", id: +d.group });
    if (d.site) open("inspect", { kind: "site", id: +d.site });
    if (d.origin) open("origin", { id: +d.origin });
    if (d.locate) {
      const event = state.world.history.find((e) => e.id === +d.locate);
      if (event) actions.locate(event);
    }
    switch (d.action) {
      case "close":
        close();
        break;
      case "present":
        actions.present();
        render(true);
        break;
      case "confetti":
        actions.power("CONFETTI");
        close();
        toast("Place a fragment inside the jar.");
        break;
      case "save":
        actions.save();
        break;
      case "copy":
        actions.copy();
        break;
      case "export":
        actions.export();
        break;
      case "new":
        mode = "confirm";
        render(true);
        break;
      case "confirm-new":
        actions.newWorld(document.querySelector("#new-seed").value.trim());
        close();
        break;
      case "cancel-new":
        mode = "experiment";
        render(true);
        break;
      case "follow":
        state.follow = { ...inspect };
        close();
        toast("Following gently. Drag to release.");
        break;
    }
  };
  panel.oninput = (e) => {
    if (e.target.id === "timeline") {
      const value = +e.target.value;
      actions.snapshot(value >= state.world.snapshots.length ? null : value);
      document.querySelector(".snapshot-note").textContent =
        state.snapshot === null
          ? "Viewing the present"
          : "Recorded snapshot · day " +
            (Math.floor(state.world.snapshots[state.snapshot].time / DAY) + 1);
    }
  };
  panel.onchange = (e) => {
    if (e.target.id === "sound" || e.target.id === "reduced") {
      state.settings[e.target.id === "sound" ? "sound" : "reducedMotion"] =
        e.target.checked;
      actions.settings();
    }
  };
  document.querySelector("#journal").onclick = () => open("journal");
  document.querySelector("#experiment").onclick = () => open("experiment");
  document.querySelector("#settings").onclick = () => open("settings");
  document.querySelector("#observe").onclick = actions.observe;
  document.querySelector("#exit-observe").onclick = actions.observe;
  return {
    toast,
    close,
    render,
    journal: () => open("journal"),
    inspect: (item) => {
      state.selected = item;
      open("inspect", item);
    },
    civilizations: () => {
      tab = "CIVILIZATIONS";
      open("journal");
    },
    isOpen: () => !!mode,
  };
}
