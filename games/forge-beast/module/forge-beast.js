import { S as h, b as F, a as ee, B as D, O as k, I as C, c as _, r as d, d as te, e as E, E as R, f as ie, g as f, Z as m, h as se, i as V, j as I, k as H, T as v, l as T, m as j, n as G, P as ae, o as pe, L, p as ne, s as ge, q as fe, t as A, u as B, v as X, w as be, x as me, y as ve, z as ye, A as we, C as Ee, D as ke, F as xe, G as Se, H as Ae } from "./shared-Dc4omtAC.js";
import { J as Ot, K as Pt, M as Nt } from "./shared-Dc4omtAC.js";
class $e {
  species = "";
  battle = "";
  discovery = "";
  initialize(e) {
    this.species = e.species, this.battle = this.battleId(e), this.discovery = this.discoveryId(e);
  }
  battleId(e) {
    const i = e.combat.history.at(-1);
    return i ? `${i.startedAt}:${i.endedAt}:${e.combat.statistics.wins}:${e.combat.statistics.losses}:${e.combat.statistics.escapes}` : "";
  }
  discoveryId(e) {
    const i = e.exploration.discoveries.at(-1);
    return i ? `${i.returnedAt}:${i.returnedAge}:${e.exploration.statistics.completed}` : "";
  }
  observe(e, i) {
    this.species !== e.species && (this.species = e.species, e.stage === "evolved" && i({ type: "creature-evolved", payload: { species: e.species, creatureName: h[e.species].name } }));
    const s = this.battleId(e);
    if (s !== this.battle) {
      this.battle = s;
      const n = e.combat.history.at(-1);
      n && (n.outcome === "victory" || n.outcome === "defeat") && (i({ type: n.outcome === "victory" ? "battle-won" : "battle-lost", payload: { opponent: n.opponent, turns: n.turns, rare: n.rare } }), n.rare && n.item && n.outcome === "victory" && i({ type: "rare-discovery", payload: { source: "battle", id: n.item } }));
    }
    const a = this.discoveryId(e);
    if (a !== this.discovery) {
      this.discovery = a;
      const n = e.exploration.discoveries.at(-1);
      n?.rare && i({ type: "rare-discovery", payload: { source: "expedition", id: n.outcome } });
    }
  }
}
class Ce {
  actionIndex = 0;
  encounterChoice = 0;
  press(e, i) {
    if (e.combat.encounter)
      return i === "select" && (this.encounterChoice = 1 - this.encounterChoice), i === "back" ? { retreat: !0 } : i === "confirm" ? this.encounterChoice ? { retreat: !0 } : { enter: !0 } : {};
    const s = e.combat.active;
    return s ? s.status !== "ongoing" ? { acknowledge: i !== "select" && !F(s, e.age) } : ee(s, e.age) ? (i === "select" && (this.actionIndex = (this.actionIndex + 1) % D.length), i === "back" && (this.actionIndex = 3), i === "confirm" ? { action: D[this.actionIndex] } : {}) : {} : {};
  }
  reset() {
    this.actionIndex = 0, this.encounterChoice = 0;
  }
}
const Me = {
  "cinder-egg": [
    ".......1111.......",
    ".....11222211.....",
    "....1222222221....",
    "...122221122221...",
    "...122221122221...",
    "..12222222222221..",
    "..12222222222221..",
    ".1222112222222221.",
    ".1222112222211221.",
    ".1222222222211221.",
    "122222222222222221",
    "122222221122222221",
    "122222221112222221",
    "122222222212222221",
    "122211222112221221",
    ".1222122112222211.",
    ".1222211222222221.",
    "..12222222222221..",
    "...111111111111..."
  ],
  pipkin: [
    "..111............111..",
    "..1221..........1221..",
    "..12221........12221..",
    "...12221......12221...",
    "...1222211111122221...",
    "....12222222222221....",
    "...1222222222222221...",
    "..122222222222222221..",
    "..122211222222112221..",
    "..122211222222112221..",
    ".12222222211222222221.",
    ".12222222222222222221.",
    "..122222211112222221..",
    "...1222222222222221...",
    "....12222222222221....",
    "...1221222222221221...",
    "..12221111111112221..",
    "..1111........1111...."
  ],
  cragox: [
    "...11..............11...",
    "..1221............1221..",
    "..12221..........12221..",
    "...122211111111112221...",
    "....1222222222222221....",
    "...122222222222222221...",
    "..12221122222222112221..",
    "..12221122222222112221..",
    "..12222222111122222221..",
    "...122222222222222221...",
    "...111222222222222111...",
    ".1112211222222221122111.",
    "122222221222222122222221",
    "122222221222222122222221",
    ".111112222222222211111..",
    "....1222222222222221....",
    "....1222222222222221....",
    "....1222211111222221....",
    "...1222221....12222221..",
    "...1111111....11111111.."
  ],
  zephlet: [
    ".................11.....",
    "...............1121.....",
    "...11........112221.....",
    "...121......1222221.....",
    "...122111111222221......",
    "....1222222222221.......",
    "...122222222222221......",
    "..12221122222112221.....",
    "..12221122222112221.....",
    "...122222222222221......",
    "....1222221122221.......",
    ".....12222222221....11..",
    "....1222222222221..1221.",
    "...1222222222222211221.",
    "...122222222222222221..",
    "....1222211122221111...",
    "...122221...12221......",
    "..122221.....12221.....",
    "..11111......11111....."
  ],
  runewisp: [
    "..........11..........",
    ".........1221.........",
    "..........11..........",
    ".....111111111111.....",
    "....12222222222221....",
    ".....111111111111.....",
    ".......12222221.......",
    "......1222222221......",
    ".....122222222221.....",
    "....12221122112221....",
    "....12221122112221....",
    "....12222222222221....",
    ".....122222222221.....",
    "....12222211222221....",
    "...1222221221222221...",
    "..122222221122222221..",
    ".12222222222222222221.",
    "..111222222222222111..",
    ".....111222222111.....",
    "........111111........"
  ],
  bramblejaw: [
    "..11.............11....",
    "..121.....11....121....",
    "...1221..1221..1221....",
    ".1112221122211122211..",
    "122222222222222222221.",
    ".1222222222222222221..",
    "..12211222222112221...",
    "..12211222222112221...",
    ".1222222222222222221..",
    "..12221111111122221...",
    "..12221212121222221...",
    "...122211111122221....",
    "111122222222222222111.",
    "122221222222222122221.",
    ".1111222222222221111..",
    "....12222222222221....",
    "...1222221112222221...",
    "...122221...1222221...",
    "..1111111...11111111.."
  ]
};
function U(t) {
  const e = Me[t];
  let i = "", s = "";
  return e.forEach(
    (a, n) => [...a].forEach((r, o) => {
      r === "1" && (i += `M${o} ${n}h1v1h-1z`), r === "2" && (s += `M${o} ${n}h1v1h-1z`);
    })
  ), `<svg viewBox="0 0 ${Math.max(...e.map((a) => a.length))} ${e.length}" class="fb-creature" aria-label="${t}" role="img" shape-rendering="crispEdges"><path fill="#b5cf85" d="${s}"/><path fill="#314a29" d="${i}"/></svg>`;
}
const Ie = `<svg class="fb-landscape" viewBox="0 0 320 170" fill="none" aria-hidden="true" shape-rendering="crispEdges">
  <g stroke="#597344" stroke-width="1" opacity=".3"><path d="M0 135h320M0 147h320M0 162h320M20 135l-8 35m49-35-4 35m49-35 1 35m48-35 3 35m44-35 7 35m40-35 11 35m37-35 15 35"/></g>
  <g fill="#647e4c" opacity=".5"><path d="M15 120h3v-5h2v5h3v2h-8zM288 129h3v-6h2v6h4v2h-9zM266 137h3v-4h2v4h3v2h-8zM51 133h3v-5h2v5h3v2h-8z"/><path d="M35 39h2v2h-2zM267 45h2v2h-2zM241 24h2v2h-2zM68 61h2v2h-2zM287 74h2v2h-2z"/></g>
  <path d="M25 25h15v-4h18v4h9v6H25zM253 60h11v-4h19v4h12v5h-42z" stroke="#78915b" opacity=".45"/>
  <ellipse cx="160" cy="134" rx="43" ry="7" fill="#597344" opacity=".15"/>
  <path d="M137 133h46" stroke="#526c3a" stroke-width="2" opacity=".5"/>
</svg>`;
function Z(t) {
  const e = k[t].pixels;
  let i = "", s = "";
  return e.forEach((a, n) => [...a].forEach((r, o) => {
    r === "1" && (i += `M${o} ${n}h1v1h-1z`), r === "2" && (s += `M${o} ${n}h1v1h-1z`);
  })), `<svg class="fb-creature" viewBox="0 0 ${Math.max(...e.map((a) => a.length))} ${e.length}" role="img" aria-label="${k[t].name}" shape-rendering="crispEdges"><path fill="#b5cf85" d="${s}"/><path fill="#314a29" d="${i}"/></svg>`;
}
const Te = {
  explore: '<path d="m12 3 8 18-8-4-8 4zM12 3v14"/>',
  items: '<path d="M5 7h14v14H5zM8 7V4h8v3M5 12h14m-9-2v4h4v-4"/>',
  energy: '<path d="m14 2-9 12h6l-1 8 9-12h-6z"/>',
  health: '<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5z"/>',
  discipline: '<path d="M5 4h14v16H5zM8 8l2 2 5-4M8 15h8"/>',
  feed: '<path d="M5 12h14l-2 7H7zM8 5v3m4-5v5m4-3v3M3 12h18"/>',
  train: '<path d="M7 12h10M4 8v8m3-10v12m10-12v12m3-10v8"/>',
  play: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  sleep: '<path d="M19 15.5A8 8 0 0 1 8.5 5a8 8 0 1 0 10.5 10.5ZM15 3h5l-5 5h5"/>',
  status: '<path d="M5 18v-4m7 4V6m7 12v-8"/><path d="M3 21h18"/>',
  sound: '<path d="m11 5-5 4H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-5 4H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  spark: '<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>'
};
function p(t, e = "") {
  return `<svg class="fb-icon ${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Te[t]}</svg>`;
}
const Oe = (t) => t.replace(/[&<>"']/g, (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[e]);
function Pe(t) {
  const e = t.combat.active;
  return e ? F(e, t.age)?.beat.text ?? t.combat.result?.message ?? "A choose · B act · C choose Run" : t.combat.encounter?.hostile ? "A restless wild spark. Battle or run?" : "A wild spark. Battle or take a quiet path?";
}
function Ne(t, e, i) {
  const s = t.combat.encounter;
  if (s) return `<div class="fb-status-heading">${s.rare ? "Rare encounter" : s.hostile ? "Wild challenge" : s.optional ? "A friendly challenge" : "Wild encounter"}<span>1V1</span></div><div class="fb-encounter-card">${Z(s.opponent)}<strong>${k[s.opponent].name}</strong><div class="fb-encounter-choices"><span class="${e === 0 ? "chosen" : ""}">BATTLE</span><span class="${e === 1 ? "chosen" : ""}">RUN</span></div></div><div class="fb-status-help">A CHOOSE · B CONFIRM · C RUN</div>`;
  const a = t.combat.active;
  if (!a) return null;
  const n = F(a, t.age), r = n?.beat;
  if (a.status !== "ongoing" && !n) {
    const c = t.combat.result;
    return `<div class="fb-status-heading">${c.outcome === "victory" ? "Victory!" : c.outcome === "defeat" ? "A little recovery" : "Escaped safely"}<span>1V1</span></div><div class="fb-battle-result"><strong>${k[a.opponent].name} · ${a.turn} ${a.turn === 1 ? "turn" : "turns"}</strong><p>${Oe(c.message)}</p><small>${c.item ? `${C[c.item].name.toUpperCase()} ${c.stored ? "→ ITEMS" : "· STACK FULL"}` : c.outcome === "defeat" ? "FOOD, COMPANY & REST HELP" : "A SMALL STORY REMEMBERED"}</small></div><div class="fb-status-help">B CONTINUE · C BACK</div>`;
  }
  const o = r?.playerHP ?? a.player.hp, l = r?.enemyHP ?? a.enemy.hp, u = r?.playerStamina ?? a.player.stamina, g = (c, y, b, M, P) => `<div class="fb-fighter fb-fighter-${c}"><span>${M}</span><div class="fb-combat-hp" aria-label="${c === "player" ? "Player" : "Enemy"} HP ${y} of ${b}"><i style="width:${y / b * 100}%"></i></div><small>${y}/${b}</small><div class="fb-combat-sprite">${P}</div></div>`;
  return `<div class="fb-battle-arena" data-animation="${n?.beat.animation ?? ""}" data-actor="${n?.beat.actor ?? ""}" data-beat="${n?.index ?? -1}" data-turn="${a.turn}">${g("player", o, a.player.maxHP, h[a.playerSpecies].name, U(a.playerSpecies))}<span class="fb-versus">×</span>${g("enemy", l, a.enemy.maxHP, k[a.opponent].name, Z(a.opponent))}<span class="fb-combat-cue" aria-hidden="true">${n?.beat.animation === "critical" ? "!" : n?.beat.animation === "guard" ? "▣" : n?.beat.animation === "skill" ? "✦" : n?.beat.animation === "dodge" ? "↝" : ""}</span><div class="fb-stamina"><span>STM</span><div><i style="width:${u / a.player.maxStamina * 100}%"></i></div><span>${i === 2 ? `${_[a.playerSpecies].name} · ${_[a.playerSpecies].cost} STM` : `TURN ${a.turn + 1}`}</span></div></div>`;
}
function Fe(t, e) {
  const i = t.combat.active;
  if (!i || i.status !== "ongoing") return null;
  const s = ee(i, t.age), a = ["train", "health", "spark", "arrow"];
  return D.map((n, r) => `<div class="fb-menu-item${r === e ? " is-selected" : ""}${s ? "" : " fb-action-busy"}" data-battle-action="${n}" aria-current="${r === e}">${p(a[r])}<span>${n}</span><i></i></div>`).join("");
}
const Re = ["wild-encounter", "rare-encounter", "optional-battle", "hostile-encounter"], Le = {
  greenfield: ["flinthop", "gloamfin"],
  "scrap-yard": ["tinspindle", "flinthop"],
  "dark-grove": ["thornmote", "gloamfin"]
};
function re(t, e, i = !1, s = null, a = "wild-encounter") {
  if (!te.includes(e) || t.stage === "egg" || t.sleeping || t.combat.active || t.combat.encounter || t.combat.result || t.exploration.active) return !1;
  t.combat.encounter = { opponent: e, rare: i, hostile: a === "hostile-encounter", optional: a === "optional-battle", zone: s, age: t.age, timestamp: Date.now() };
  const n = t.combat.discoveries[e] ?? { encountered: 0, defeated: 0 };
  return n.encountered++, t.combat.discoveries[e] = n, d(t, `encounter:${e}`, "life", `{name} encountered ${i ? "a rare " : ""}${k[e].name}.`), !0;
}
function Be(t, e, i, s) {
  if (!Re.includes(e)) return !1;
  const a = Le[i], n = a[Math.floor(E(s) * a.length)];
  return re(t, n, e === "rare-encounter", i, e);
}
function He(t) {
  return t.combat.encounter ? (d(t, "encounter:retreat", "life", "{name} took a quiet path around the encounter."), t.combat.encounter = null, t.combat.statistics.declined++, !0) : !1;
}
function ze(t, e, i, s) {
  const a = ie[i], n = R[t.personality ?? "calm"], r = { ...a.effects };
  r.mood && r.mood > 0 && (r.mood *= n.mood), r.energy && r.energy < 0 && (r.energy *= n.energy), f(t, { hunger: -m[e.zone].hunger, mood: 3 * n.mood }), f(t, r);
  const o = a.items ? a.items[Math.floor(E(s) * a.items.length)] : null, l = o !== null && se(t, o) > 0;
  let u = a.message.replace("{name}", h[t.species].name);
  o && (u = `${h[t.species].name} found ${C[o].name === "Medicine" ? "some" : "a"} ${C[o].name}.${l ? "" : " Stack full; left it safely on the trail."}`), d(t, `expedition:${i}`, "life", u);
  const g = {
    zone: e.zone,
    outcome: i,
    startedAt: e.startedAt,
    returnedAt: Date.now(),
    returnedAge: t.age,
    message: u,
    item: o,
    stored: l,
    rare: !!a.rare,
    failed: !!a.failed
  };
  t.exploration.discoveries.push(g), t.exploration.discoveries = t.exploration.discoveries.slice(-24);
  const c = t.exploration.statistics;
  return c.completed++, c.zones[e.zone]++, g.rare && c.rare++, g.failed && c.failed++, g;
}
function oe(t, e) {
  return Math.ceil(m[e].energy * R[t.personality ?? "calm"].energy);
}
function le(t, e) {
  return I.includes(e) ? t.combat.encounter || t.combat.active || t.combat.result ? "Finish the wild encounter first." : t.stage === "egg" ? "Hatch first. A whole world is waiting." : t.sleeping ? "Shhh… your beast is resting." : t.exploration.active ? "Already on an adventure. Wait for their return." : t.exploration.result ? "Meet your returning beast before the next trip." : t.stats.health < H.minHealth ? "Feeling poorly. Gentle care before exploring." : t.stats.hunger < H.minHunger ? "A hungry belly needs food before a journey." : t.stats.energy < oe(t, e) + H.energyReserve ? "Too sleepy for this path. Rest first." : t.age - t.lastActionAge < v.actionCooldown ? "One little moment…" : null : "That path is not available.";
}
function De(t, e, i = Math.random) {
  const s = le(t, e);
  if (s) return { success: !1, message: s };
  const a = R[t.personality ?? "calm"], n = e !== "greenfield" && a.detourChance > 0 && E(i) < a.detourChance, r = n ? "greenfield" : e, o = oe(t, r);
  t.exploration.active = { zone: r, requestedZone: e, startedAge: t.age, endsAge: t.age + m[r].duration, startedAt: Date.now(), energyCost: o, detoured: n }, t.exploration.statistics.started++, f(t, { energy: -o }), t.lastActionAge = t.age, t.life.lastInteractionAge = t.age;
  const l = n ? `${h[t.species].name} chose their own path to Greenfield.` : `${h[t.species].name} explored ${m[e].name}.`;
  return d(t, "expedition:depart", "life", l), { success: !0, message: l };
}
function Ge(t, e) {
  const i = R[t.personality ?? "calm"];
  return V.map((s) => {
    const a = ie[s];
    let n = m[e].weights[s];
    return e !== "greenfield" && (n *= a.failed ? i.riskyFailure : i.riskySuccess), (a.rare || a.unusual) && (n *= i.discovery), t.stats.energy < 25 && s === "fatigue" && (n *= 1.5), { id: s, weight: n };
  });
}
function Ue(t, e, i = Math.random) {
  const s = Ge(t, e);
  let a = E(i) * s.reduce((n, r) => n + r.weight, 0);
  for (const n of s)
    if (a -= n.weight, a < 0) return n.id;
  return "nothing";
}
function J(t, e = Math.random, i, s = !1) {
  const a = t.exploration.active;
  if (!a || !i && !s && t.age < a.endsAge || i && !V.includes(i)) return null;
  const n = i ?? Ue(t, a.zone, e), r = ze(t, a, n, e);
  return t.exploration.active = null, t.exploration.result = r, Be(t, r.outcome, a.zone, e), r;
}
const qe = {
  hunger: { label: "Fullness", icon: "feed", words: ["Hungry", "Peckish", "Content"] },
  energy: { label: "Energy", icon: "energy", words: ["Spent", "Sleepy", "Ready"] },
  mood: { label: "Mood", icon: "play", words: ["Lonely", "Okay", "Happy"] },
  health: { label: "health", icon: "health", words: ["Poorly", "Worn", "Well"] },
  discipline: { label: "discipline", icon: "discipline", words: ["Restless", "Learning", "Steady"] },
  training: { label: "Training", icon: "train", words: ["Starting", "Practicing", "Strong"] }
};
function Ve(t, e) {
  const i = qe[t];
  return { ...i, description: i.words[e < 35 ? 0 : e < 70 ? 1 : 2] };
}
function Q(t, e) {
  return e.map((i) => {
    const s = Ve(i, t.stats[i]);
    return `<div class="fb-stat-row"><span>${p(s.icon)}${s.label}</span><small>${s.description}</small><div class="fb-stat-bar" role="img" aria-label="${i}: ${s.description}">${[0, 1, 2, 3, 4].map((a) => `<i class="${t.stats[i] > a * 20 ? "filled" : ""}"></i>`).join("")}</div></div>`;
  }).join("");
}
function je(t, e) {
  return e.resetFlow.pending ? `<div class="fb-reset-confirm" role="group" aria-label="Confirm start new egg">
      <strong>Start a new egg?</strong><p>${e.resetFlow.error || "Current beast & moments cleared.<br>Sound & haptics kept."}</p>
      <div class="fb-reset-choices"><span class="${e.resetFlow.choice === "keep" ? "chosen" : ""}">Keep beast</span><span class="${e.resetFlow.choice === "reset" ? "chosen" : ""}">New egg</span></div>
    </div>` : `<div class="fb-settings-options">${[`Sound <b>${t.muted ? "OFF" : "ON"}</b>`, `Haptics <b>${t.hapticsEnabled ? "ON" : "OFF"}</b>`, "Start new egg <b>›</b>"].map((s, a) => `<div class="${e.settingIndex === a ? "chosen" : ""}">${s}</div>`).join("")}</div>`;
}
const N = ["Vitals", "Growth", "Field notes", "Device sound", "Wellbeing", "Recent moments", "Settings"], q = 5, $ = 6;
function O(t) {
  return `${Math.floor(t / 60).toString().padStart(2, "0")}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
}
function Ke(t) {
  return t.replace(/[&<>"']/g, (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[e]);
}
function We(t, e, i, s, a) {
  let n = "";
  if (e === 0 && (n = Q(t, ["hunger", "energy", "mood", "training"])), e === 1 && (n = `<div class="fb-status-growth"><span>${h[t.species].type}</span><strong>${O(t.age)} TOGETHER</strong><div class="fb-status-track"><i style="width:${i}%"></i></div><span>${t.stage === "evolved" ? "Your story keeps growing." : t.stage === "egg" ? "A new spark is on its way." : "Care shapes what comes next."}</span></div>`), e === 2 && (n = `<p class="fb-status-lore">${h[t.species].description}</p>`), e === 3 && (n = `<div class="fb-status-sound">${p(t.muted ? "mute" : "sound")}<strong>${t.muted ? "SOUND OFF" : "SOUND ON"}</strong><span>B to ${t.muted ? "unmute" : "mute"}</span></div>`), e === 4) {
    const r = t.stats.health < 35 ? "Feeling poorly. Rest and gentle care." : t.stats.health < 70 ? "A little worn out. Keep caring." : "Bright-eyed and feeling well.", o = t.stats.discipline < 35 ? "Restless. A little routine helps." : t.stats.discipline < 70 ? "Learning a little every day." : "Finding a steady rhythm.";
    n = `${Q(t, ["discipline", "health"])}<p class="fb-wellbeing-copy">${r}<br>${o}</p>`;
  }
  if (e === q) {
    const r = Math.max(0, t.eventHistory.length - 1 - s), o = t.eventHistory[r];
    n = o ? `<div class="fb-event-entry"><div><span>${O(o.age)} TOGETHER</span><span>${r + 1}/${t.eventHistory.length}</span></div><p>${Ke(o.message)}</p></div>` : '<p class="fb-status-lore">A story waiting to begin.<br>Little moments appear after hatching.</p>';
  }
  return e === $ && a && (n = je(t, a)), `<div class="fb-status-heading">${N[e]}<span>${e + 1}/${N.length}</span></div>${n}<div class="fb-status-help">A ${e === $ ? "CHOOSE" : "NEXT"} ${e === 3 ? "" : e === $ ? "· B CONFIRM" : e === q ? "· B OLDER" : "· B NEXT"} · C BACK</div>`;
}
function Ye(t, e, i) {
  if (e === "zones" || e === "confirm") {
    const s = I[i], a = m[s], n = le(t, s);
    return `<div class="fb-status-heading">${e === "confirm" ? "Set off?" : "Explore"}<span>${i + 1}/3</span></div>
      <div class="fb-zone-card" data-zone="${s}"><span class="fb-zone-symbol" aria-hidden="true">${["♧", "▥", "♤"][i]}</span><strong>${a.name}</strong><span>${a.risk} · ${a.energy < 10 ? "Light" : a.energy < 20 ? "Moderate" : "Heavy"} effort</span><small>${O(a.duration)} ACTIVE TRIP</small><p>${n ?? (e === "confirm" ? "Ready for a little adventure?" : a.description)}</p></div>
      <div class="fb-status-help">A ${e === "confirm" ? "CHANGE" : "ZONE"} · B ${e === "confirm" ? "SEND" : "CHOOSE"} · C BACK</div>`;
  }
  if (e === "result" && t.exploration.result) {
    const s = t.exploration.result, a = s.message.replace(/[&<>"']/g, (n) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[n]);
    return `<div class="fb-status-heading">${s.rare ? "Rare discovery" : s.failed ? "Home, at last" : "Back from the trail"}<span>${s.rare ? "✦" : "↟"}</span></div><div class="fb-trip-result" data-outcome="${s.outcome}"><strong>${m[s.zone].name}</strong><p>${a}</p><small>${s.item && s.stored ? "TUCKED INTO ITEMS" : s.failed ? "REST & CARE HELP" : "A LITTLE STORY TO KEEP"}</small></div><div class="fb-status-help">B OKAY · C BACK</div>`;
  }
  return null;
}
function _e(t) {
  const e = t.exploration.active;
  if (!e) return "";
  const i = Math.max(0, e.endsAge - t.age), s = Math.min(100, Math.max(0, (t.age - e.startedAge) / (e.endsAge - e.startedAge) * 100));
  return `<div class="fb-trip-label">${m[e.zone].name}<span>${O(Math.ceil(i))}</span></div><div class="fb-trip-track"><i style="width:${s}%"></i></div><span class="fb-trip-caption">${e.detoured ? "FOLLOWING THEIR OWN PATH" : "A LITTLE ADVENTURE"}</span>`;
}
function Xe(t, e, i) {
  const s = T[e], a = C[s], n = t.exploration.inventory[s];
  return `<div class="fb-status-heading">${i ? a.consumable ? "Use item?" : "Inspect?" : "Items"}<span>${e + 1}/${T.length}</span></div><div class="fb-item-card" data-item="${s}"><span class="fb-item-symbol" aria-hidden="true">${["●", "◆", "▣", "✧", "+", "◇"][e]}</span><strong>${a.name}<span>×${n}</span></strong><p>${n ? a.description : "None yet. Little finds await on the trail."}</p><small>${n ? a.consumable ? "ONE USE · ONE LITTLE BOOST" : "KEPT AFTER INSPECTING" : "EXPLORE TO DISCOVER"}</small></div><div class="fb-status-help">A ITEM · B ${i ? a.consumable ? "USE" : "LOOK" : "CHOOSE"} · C BACK</div>`;
}
function Ze(t) {
  return t.stage === "egg" ? "idle" : t.sleeping ? "sleep" : t.stats.health < 35 ? "sick" : t.stats.hunger < 35 ? "hungry" : t.stats.energy < 30 ? "tired" : t.stats.mood < 35 ? "upset" : t.stats.discipline < 25 ? "restless" : t.stats.mood >= 80 ? "happy" : "idle";
}
function Je(t) {
  return t.stage === "egg" ? "A little patience. A whole lot of potential." : j(t) ?? (t.sleeping ? "Dreaming of little adventures…" : t.stats.mood >= 80 ? "A happy little hum. Life feels good." : "A little life. A little closer to you.");
}
class Qe {
  message = "";
  behavior = "idle";
  until = 0;
  show(e, i, s, a = 3) {
    this.message = i, this.behavior = s, this.until = e.age + a;
  }
  update(e) {
    e.age >= this.until && (this.message = "", this.behavior = Ze(e));
  }
  reset() {
    this.message = "", this.behavior = "idle", this.until = 0;
  }
}
class et {
  paused = !1;
  animations = /* @__PURE__ */ new Set();
  play(e, i) {
    if (this.paused || typeof e.animate != "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const s = i === "confirm" ? [{ filter: "brightness(1.06)" }, { filter: "brightness(1)" }] : i === "page" ? [{ opacity: 0.4, transform: "translateY(3px)" }, { opacity: 1, transform: "translateY(0)" }] : [{ opacity: 0.35 }, { opacity: 1 }], a = e.animate(s, { duration: i === "page" ? 160 : 180, easing: "ease-out" });
    this.animations.add(a), a.onfinish = a.oncancel = () => this.animations.delete(a);
  }
  setPaused(e) {
    this.paused = e;
    for (const i of this.animations)
      e ? i.pause() : i.play();
  }
  destroy() {
    for (const e of this.animations) e.cancel();
    this.animations.clear();
  }
}
class tt {
  pending = !1;
  choice = "keep";
  error = "";
  begin() {
    this.pending = !0, this.choice = "keep", this.error = "";
  }
  select() {
    this.pending && (this.choice = this.choice === "keep" ? "reset" : "keep");
  }
  confirm() {
    if (!this.pending) return null;
    const e = this.choice;
    return e === "keep" && this.cancel(), e;
  }
  cancel() {
    this.pending = !1, this.choice = "keep", this.error = "";
  }
  fail() {
    this.pending = !0, this.choice = "keep", this.error = "Could not save a new egg. Try again.";
  }
}
function it(t, e = {}) {
  const i = G();
  return e.keepSettings && (i.muted = t.muted, i.hapticsEnabled = t.hapticsEnabled), i;
}
const w = ["feed", "train", "play", "sleep", "status", "explore", "items"], st = ["Sound", "Haptics", "Start new egg"];
class at {
  selected = 0;
  expeditionPage = null;
  zoneIndex = 0;
  inventoryOpen = !1;
  itemIndex = 0;
  itemConfirm = !1;
  statusPage = null;
  logOffset = 0;
  settingIndex = 0;
  resetFlow = new tt();
  press(e, i, s = !1) {
    if (this.resetFlow.pending)
      return e === "select" && this.resetFlow.select(), e === "back" && this.resetFlow.cancel(), e === "confirm" ? { reset: this.resetFlow.confirm() === "reset" } : {};
    if (this.expeditionPage) {
      if (this.expeditionPage === "result") return { acknowledge: e !== "select" };
      if (this.expeditionPage === "trip")
        return e !== "select" && (this.expeditionPage = null), {};
      if (e === "back" && (this.expeditionPage = this.expeditionPage === "confirm" ? "zones" : null), e === "select" && (this.zoneIndex = (this.zoneIndex + 1) % I.length, this.expeditionPage = "zones"), e === "confirm") {
        if (this.expeditionPage === "confirm") return { explore: I[this.zoneIndex] };
        this.expeditionPage = "confirm";
      }
      return {};
    }
    if (this.inventoryOpen) {
      if (e === "back" && (this.itemConfirm ? this.itemConfirm = !1 : this.inventoryOpen = !1), e === "select" && (this.itemIndex = (this.itemIndex + 1) % T.length, this.itemConfirm = !1), e === "confirm") {
        if (this.itemConfirm) return { item: T[this.itemIndex] };
        this.itemConfirm = !0;
      }
      return {};
    }
    if (e === "back") {
      if (this.statusPage !== null) this.statusPage = null;
      else
        return this.selected = 0, { hint: !0 };
      return {};
    }
    if (e === "select")
      return this.statusPage === $ ? this.settingIndex = (this.settingIndex + 1) % st.length : this.statusPage !== null ? (this.statusPage = (this.statusPage + 1) % N.length, this.logOffset = 0) : this.selected = (this.selected + 1) % w.length, {};
    if (this.statusPage === $)
      if (this.settingIndex === 2) this.resetFlow.begin();
      else return { toggle: this.settingIndex === 0 ? "sound" : "haptics" };
    else if (this.statusPage === q) this.logOffset = (this.logOffset + 1) % Math.max(1, i);
    else {
      if (this.statusPage === 3) return { toggle: "sound" };
      if (this.statusPage !== null) this.statusPage = (this.statusPage + 1) % N.length;
      else if (w[this.selected] === "status") this.statusPage = 0;
      else if (w[this.selected] === "explore") this.expeditionPage = s ? "trip" : "zones";
      else if (w[this.selected] === "items") this.inventoryOpen = !0;
      else return { action: w[this.selected] };
    }
    return {};
  }
  openReset() {
    this.expeditionPage = null, this.inventoryOpen = !1, this.statusPage = $, this.settingIndex = 2, this.resetFlow.begin();
  }
  reset() {
    this.expeditionPage = null, this.inventoryOpen = !1, this.itemConfirm = !1, this.zoneIndex = 0, this.itemIndex = 0, this.selected = 0, this.statusPage = null, this.logOffset = 0, this.settingIndex = 0, this.resetFlow.cancel();
  }
}
const ce = ["feed", "train", "play", "sleep", "wake", "evolution", "depart", "discover", "rare", "failure"], nt = {
  depart: [{ name: "leave", duration: 1.2 }],
  discover: [{ name: "return", duration: 1.1 }, { name: "success", duration: 2 }],
  rare: [{ name: "return", duration: 1.1 }, { name: "rare", duration: 2 }],
  failure: [{ name: "return", duration: 1.1 }, { name: "failure", duration: 2 }],
  feed: [{ name: "approach", duration: 0.45 }, { name: "chew", duration: 1.15 }, { name: "finish", duration: 1 }],
  train: [{ name: "exercise", duration: 1.2 }, { name: "exert", duration: 0.6 }, { name: "finish", duration: 0.8 }],
  play: [{ name: "chase", duration: 0.45 }, { name: "bounce", duration: 1.3 }, { name: "joy", duration: 0.85 }],
  sleep: [{ name: "settle", duration: 0.7 }, { name: "drowse", duration: 0.8 }],
  wake: [{ name: "rise", duration: 0.6 }, { name: "stretch", duration: 0.8 }, { name: "alert", duration: 0.8 }],
  evolution: [{ name: "glow", duration: 0.4 }, { name: "reveal", duration: 1 }, { name: "celebrate", duration: 1.2 }]
}, ue = ["hunger", "energy", "mood", "discipline", "health", "training"];
function rt() {
  return `<details class="fb-debug"><summary>Developer tools</summary><div class="fb-debug-content">
    ${ue.map((t) => `<label>${t}<input type="range" min="0" max="100" data-stat="${t}"/><output data-output="${t}"></output></label>`).join("")}
    <label>Personality<select class="fb-debug-personality" aria-label="Personality"><option value="">Unhatched</option>${ae.map((t) => `<option value="${t}">${pe[t].name}</option>`).join("")}</select></label>
    <label>Life event<select class="fb-debug-event" aria-label="Life event">${L.map((t) => `<option value="${t.id}">${t.label}</option>`).join("")}</select></label>
    <button data-command="debug-event">Trigger event</button><button data-command="debug-neglect">Simulate neglect</button>
    <label>Animation<select class="fb-debug-animation" aria-label="Action animation">${ce.map((t) => `<option value="${t}">${t}</option>`).join("")}</select></label>
    <button data-command="debug-animation">Preview animation</button>
    <label>Alert<select class="fb-debug-alert" aria-label="Alert state">${["hungry", "tired", "upset", "sick", "restless"].map((t) => `<option value="${t}">${t}</option>`).join("")}</select></label>
    <button data-command="debug-alert">Simulate alert</button><button data-command="debug-reset-flow">Test reset flow</button>
    <label>Expedition zone<select class="fb-debug-zone" aria-label="Expedition zone">${I.map((t) => `<option value="${t}">${m[t].name}</option>`).join("")}</select></label>
    <button data-command="debug-trip-start">Start expedition</button><button data-command="debug-trip-complete">Complete expedition</button>
    <label>Outcome<select class="fb-debug-outcome" aria-label="Expedition outcome">${V.map((t) => `<option value="${t}">${t}</option>`).join("")}</select></label>
    <button data-command="debug-trip-outcome">Force outcome</button><button data-command="debug-trip-rare">Rare discovery</button><button data-command="debug-trip-failed">Failed expedition</button>
    <label>Item<select class="fb-debug-item" aria-label="Inventory item">${T.map((t) => `<option value="${t}">${C[t].name}</option>`).join("")}</select></label>
    <label>Quantity<input type="number" class="fb-debug-quantity" aria-label="Item quantity" min="0" max="99" value="1"/></label>
    <button data-command="debug-item-add">Add item</button><button data-command="debug-item-remove">Remove item</button><button data-command="debug-item-set">Set quantity</button>
    <label>Opponent<select class="fb-debug-opponent" aria-label="Battle opponent">${te.map((t) => `<option value="${t}">${k[t].name}</option>`).join("")}</select></label>
    <button data-command="debug-battle-start">Start battle</button><button data-command="debug-battle-rare">Rare encounter</button>
    <label>Player HP<input type="range" aria-label="Player battle HP" min="0" max="200" data-battle-hp="player"/></label>
    <label>Enemy HP<input type="range" aria-label="Enemy battle HP" min="0" max="200" data-battle-hp="enemy"/></label>
    <button data-command="debug-battle-win">Force victory</button><button data-command="debug-battle-loss">Force defeat</button><button data-command="debug-battle-critical">Next critical hit</button><button data-command="debug-battle-escape">Force escape</button>
    <button data-command="debug-battle-stamina">Refill stamina</button><button data-command="debug-battle-skill">Test creature skill</button>
    <button data-command="debug-age">Advance 60 seconds</button><button data-command="debug-hatch">Hatch</button><button data-command="debug-evolve">Evolve naturally</button>
    <select aria-label="Force evolution species" class="fb-debug-species">${["cragox", "zephlet", "runewisp", "bramblejaw"].map((t) => `<option value="${t}">${h[t].name}</option>`).join("")}</select>
    <button data-command="debug-force">Force selected form</button><button data-command="debug-reset">Reset save</button><pre class="fb-debug-info"></pre>
  </div></details>`;
}
function ot(t, e) {
  t.querySelector(".fb-debug-info").textContent = JSON.stringify({ ...e.development, expeditions: e.exploration.statistics, inventory: e.exploration.inventory, battles: e.combat.statistics, opponents: e.combat.discoveries }, null, 2);
  for (const s of ["player", "enemy"]) {
    const a = t.querySelector(`[data-battle-hp="${s}"]`);
    a.disabled = !e.combat.active || e.combat.active.status !== "ongoing", a.max = String(e.combat.active?.[s].maxHP ?? 200), document.activeElement !== a && (a.value = String(e.combat.active?.[s].hp ?? 0));
  }
  const i = t.querySelector(".fb-debug-personality");
  document.activeElement !== i && (i.value = e.personality ?? ""), i.disabled = e.stage === "egg";
  for (const [s, a] of Object.entries(e.stats)) {
    const n = t.querySelector(`[data-stat="${s}"]`);
    document.activeElement !== n && (n.value = String(Math.round(a))), t.querySelector(`[data-output="${s}"]`).textContent = String(Math.round(a));
  }
}
class lt {
  constructor(e, i, s = !1, a = (n) => console.error("[Forge Beast / layout]", n)) {
    this.root = e, this.debug = i, this.embedded = s, this.onError = a;
  }
  mounted = !1;
  resizeObserver;
  lastSpecies = "";
  lastStatusPage = null;
  lastAlert = !1;
  combatMenu = !1;
  panelMarkup = "";
  menuMarkup = "";
  lastPanel = "";
  motion = new et();
  mount() {
    this.mounted = !0, this.root.classList.add("forge-beast"), this.embedded && this.root.classList.add("fb-embedded"), this.resetCaches(), this.root.innerHTML = `
    <div class="fb-app">
      <header class="fb-header">
        <button class="fb-brand" data-command="exit" aria-label="Request Forge Arcade exit"><span class="fb-brand-mark"><i></i><i></i><i></i><i></i></span><span>FORGE<span class="fb-brand-sub">ARCADE</span></span></button>
        <span class="fb-header-center">SMALL GAMES. BIG WORLDS.</span>
        <div class="fb-header-tools"><button class="fb-guide-toggle" data-command="guide">Field guide <span class="fb-guide-arrow">${p("arrow")}</span></button><span class="fb-header-divider"></span><button class="fb-sound-toggle" data-command="mute" aria-label="Mute device">${p("sound")}</button></div>
      </header>
      <main class="fb-main">
        <div class="fb-intro"><div class="fb-eyebrow"><span></span> YOUR POCKET COMPANION</div><h1>A little life in your hands.</h1><p>Hatch a spark. Raise a beast. See who they become.</p></div>
        <div class="fb-workbench">
          <aside class="fb-left-note"><span class="fb-note-number">01 / THE BEGINNING</span><h2>Every legend<br>starts small.</h2><p>A little care, a little curiosity.<br>Your choices shape the<br>creature within.</p><div class="fb-note-line"></div><span class="fb-label">ONE EGG. FOUR POSSIBILITIES.</span><div class="fb-mini-beasts">${["cragox", "zephlet", "runewisp", "bramblejaw"].map((e) => `<div>${U(e)}</div>`).join("")}</div><span class="fb-note-caption">Who will you discover?</span></aside>
          <section class="fb-device" aria-label="Forge Beast handheld device">
            <span class="fb-screw fb-screw-tl"></span><span class="fb-screw fb-screw-tr"></span><span class="fb-screw fb-screw-bl"></span><span class="fb-screw fb-screw-br"></span>
            <div class="fb-device-top"><div class="fb-device-wordmark">FORGE<span>BEAST</span><span class="fb-wordmark-dot">®</span></div><span class="fb-power"><i></i> LINK ACTIVE</span></div>
            <div class="fb-screen-bezel"><div class="fb-bezel-top"><span>VIRTUAL LIFE SYSTEM</span><span>FB—01</span></div>
              <div class="fb-lcd">
                <div class="fb-lcd-top"><span class="fb-stage"><i></i> EGG</span><span class="fb-lcd-age">00:00</span><span class="fb-battery"><i></i><i></i><i></i></span></div>
                <div class="fb-creature-label"><h2>CINDER EGG</h2><span>A NEW BEGINNING</span></div>
                <div class="fb-world">${Ie}<span class="fb-float fb-float-left">✦</span><div class="fb-sprite-wrap"></div><span class="fb-float fb-float-right">✦</span><span class="fb-zzz" aria-hidden="true"><i>z</i><i>Z</i><i>z</i></span><span class="fb-food" aria-hidden="true"></span><span class="fb-exertion" aria-hidden="true">· ·</span><span class="fb-joy" aria-hidden="true">✦</span><div class="fb-trip-display" hidden></div><span class="fb-trail-spark" aria-hidden="true">✦</span><span class="fb-reaction-cue" aria-hidden="true"></span><div class="fb-status-panel" hidden></div><div class="fb-pause-overlay" hidden>LINK PAUSED<span>Your little world is waiting.</span></div></div>
                <div class="fb-message" role="status" aria-live="polite"></div>
                <div class="fb-menu" aria-label="Care actions">${w.map((e, i) => `<div class="fb-menu-item${i === 0 ? " is-selected" : ""}" data-menu="${i}">${p(e)}<span>${e}</span><i></i></div>`).join("")}</div>
              </div>
              <div class="fb-bezel-bottom"><span class="fb-lcd-mark">DOT MATRIX DISPLAY</span><span class="fb-bezel-dots">● ● ●</span></div>
            </div>
            <div class="fb-buttons">${[
      ["A", "SELECT", "select"],
      ["B", "CONFIRM", "confirm"],
      ["C", "BACK", "back"]
    ].map(
      ([e, i, s]) => `<div class="fb-button-column"><button class="fb-device-button fb-button-${e.toLowerCase()}" data-command="${s}" aria-label="${e}: ${i.toLowerCase()}">${e}</button><span>${i}</span></div>`
    ).join("")}</div>
            <div class="fb-device-bottom"><div class="fb-model">POCKET SERIES <b>01</b><span>BUILT TO BECOME.</span></div><div class="fb-speaker" aria-hidden="true">${"<i></i>".repeat(5)}</div></div>
          </section>
          <aside class="fb-right-note"><div class="fb-live-label"><span></span> LITTLE WORLD, LIVE</div><h2 class="fb-side-title">Something's<br>stirring.</h2><p class="fb-side-description">Your egg is warm and safe.<br>Stay a while. A new friend<br>is almost here.</p><div class="fb-growth"><div><span class="fb-growth-label">HATCHING</span><span class="fb-growth-hint">IN PROGRESS</span></div><div class="fb-growth-track"><i></i></div></div><div class="fb-save-note">${p("spark")}<span>Little moments, remembered.<small>Progress saves automatically.</small></span></div></aside>
        </div>
        <div class="fb-below-device"><span class="fb-connection"><i></i> <span class="fb-save-status">YOUR PROGRESS IS SAVED</span></span><span class="fb-version">V0.5.1 · ARCADE READY</span></div>
        <div class="fb-controls-guide"><span>THREE BUTTONS. A WORLD TO GROW.</span><div><b>A</b> Choose <i></i><b>B</b> Care <i></i><b>C</b> Go back</div></div>
      </main>
      <footer class="fb-footer"><span>MADE OF PIXELS. RAISED WITH CARE.</span><span>AN ORIGINAL FORGE ARCADE EXPERIENCE <span>+</span></span></footer>
      <dialog class="fb-guide"><button data-command="close-guide" class="fb-dialog-close" aria-label="Close field guide">${p("close")}</button><div class="fb-eyebrow">FORGE BEAST / FIELD GUIDE</div><h2>A small spark.<br>A growing friendship.</h2><p>Your Cinder egg hatches after about 45 seconds together. Pipkin then grows for four minutes of active play before discovering a new form.</p><div class="fb-guide-actions">${w.map((e) => `<div>${p(e)}<b>${e}</b><span>${{ feed: "Emberberries fill a hungry belly. Too many can be a little much.", train: "Build strength. Training uses energy and works up an appetite.", play: "Spend time together to brighten your beast’s mood.", sleep: "Let your beast recharge. Choose Sleep again to wake them.", explore: "Choose Greenfield, Scrap Yard or Dark Grove. B chooses a path, then B sends your beast. Trips use active time and energy. Wild encounters offer Battle or Run. In battle, A chooses Attack, Guard, Skill or Run; B acts, C chooses Run. Guard restores stamina. Good care helps; defeat never erases your beast.", items: "Browse six little finds with A. B chooses an item; B again uses it. C backs out. Strange Fragments can be inspected and kept.", status: "Check vitals, growth, sound, wellbeing, and recent moments. A changes pages; B browses older moments. Settings includes sound, optional haptics, and a confirmed new-egg reset." }[e]}</span></div>`).join("")}</div><p>Every beast has a hidden temperament. Get to know their little habits. Training builds discipline; food, company and rest support health. There are four original forms to discover. Time pauses when you leave; your progress is saved on this device.</p><button class="fb-guide-done" data-command="close-guide">LET'S GROW ${p("arrow")}</button></dialog>
      ${this.debug ? rt() : ""}
    </div>`, this.embedded && typeof ResizeObserver < "u" && (this.resizeObserver = new ResizeObserver(() => {
      try {
        this.fitContainer();
      } catch (e) {
        this.onError(e);
      }
    }), this.resizeObserver.observe(this.root), this.resizeObserver.observe(this.el(".fb-device")), this.fitContainer());
  }
  resetCaches() {
    this.lastSpecies = "", this.lastStatusPage = null, this.lastAlert = !1, this.combatMenu = !1, this.panelMarkup = "", this.menuMarkup = "", this.lastPanel = "";
  }
  fitContainer() {
    if (!this.mounted) return;
    const e = this.el(".fb-app"), i = this.el(".fb-device"), s = this.root.clientWidth, a = this.root.clientHeight;
    if (!s || !a) return;
    const n = Math.min(1, Math.max(0, (s - 16) / i.offsetWidth), Math.max(0, (a - 16) / i.offsetHeight));
    e.style.setProperty("--fb-device-scale", String(n));
  }
  setPaused(e) {
    this.root.classList.toggle("fb-paused", e), this.motion.setPaused(e);
  }
  el(e) {
    return this.root.querySelector(e);
  }
  update(e, i) {
    const s = e.state, a = h[s.species];
    s.species !== this.lastSpecies && (this.el(".fb-sprite-wrap").innerHTML = U(s.species), this.lastSpecies = s.species), this.el(".fb-stage").innerHTML = `<i></i> ${s.stage.toUpperCase()}`, this.el(".fb-lcd-age").textContent = O(s.age), this.el(".fb-creature-label h2").textContent = a.name.toUpperCase(), this.el(".fb-creature-label > span").textContent = s.stage === "egg" ? "A NEW BEGINNING" : s.stage === "baby" ? "A LITTLE SPARK OF POTENTIAL" : `${a.type.toUpperCase()} · FULL OF POSSIBILITY`, this.el(".fb-world").dataset.behavior = s.sleeping ? "sleep" : e.behavior, this.el(".fb-world").dataset.stage = s.stage;
    const n = e.animation, r = this.el(".fb-world");
    r.dataset.combat = String(!!(s.combat.encounter || s.combat.active)), r.dataset.expedition = s.exploration.active ? n?.kind === "depart" ? "leaving" : "traveling" : "", r.dataset.zone = s.exploration.active?.zone ?? s.exploration.result?.zone ?? "";
    const o = this.el(".fb-trip-display");
    o.hidden = !s.exploration.active, o.innerHTML = _e(s), r.dataset.action = n?.kind ?? "", r.dataset.phase = n?.phase ?? "", r.dataset.outcome = n?.outcome ?? "", r.dataset.sequence = String(n?.sequence ?? 0);
    const l = !!(s.combat.encounter || s.combat.active), u = l ? e.message && !e.battleFrame ? e.message : Pe(s) : e.message || (s.exploration.active ? "Small steps. A whole world of surprises." : Je(s)), g = { hungry: "…?", tired: "z", happy: "♪", sick: "+", upset: "!", excited: "✦", restless: "↔" };
    this.el(".fb-reaction-cue").textContent = g[e.behavior] ?? "", this.el(".fb-message").textContent !== u && (this.el(".fb-message").textContent = u);
    const c = !l && !s.exploration.active && !!j(s);
    this.el(".fb-message").classList.toggle("is-alert", c), c && !this.lastAlert && this.motion.play(this.el(".fb-message"), "appear"), this.lastAlert = c;
    const y = i.selected, b = Fe(s, i.battleSelected), M = this.el(".fb-menu");
    M.setAttribute("aria-label", b !== null ? "Battle actions" : "Care actions"), b !== null ? (this.menuMarkup !== b && (M.innerHTML = b, this.menuMarkup = b), this.combatMenu = !0) : (this.combatMenu && (M.innerHTML = w.map((x, S) => `<div class="fb-menu-item" data-menu="${S}">${p(x)}<span>${x}</span><i></i></div>`).join(""), this.combatMenu = !1, this.menuMarkup = ""), this.root.querySelectorAll(".fb-menu-item").forEach((x, S) => {
      x.hidden = S < Math.max(0, y - 4) || S >= Math.max(0, y - 4) + 5, x.classList.toggle("is-selected", S === y), x.setAttribute("aria-current", String(S === y));
    }), this.el('.fb-menu-item[data-menu="3"] span').textContent = s.sleeping ? "wake" : "sleep"), this.el(".fb-pause-overlay").hidden = !i.paused, this.el(".fb-power").classList.toggle("is-paused", i.paused), this.el(".fb-power").innerHTML = `<i></i> ${i.paused ? "LINK PAUSED" : "LINK ACTIVE"}`, this.el(".fb-sound-toggle").innerHTML = p(s.muted ? "mute" : "sound"), this.el(".fb-sound-toggle").setAttribute(
      "aria-label",
      s.muted ? "Unmute device" : "Mute device"
    ), this.el(".fb-save-status").textContent = i.saveAvailable ? "YOUR PROGRESS IS SAVED" : "SAVE UNAVAILABLE · KEEP THIS TAB OPEN", this.el(".fb-side-title").innerHTML = s.stage === "egg" ? "Something's<br>stirring." : s.stage === "baby" ? "Hello, little<br>spark." : "A new kind<br>of wonderful.", this.el(".fb-side-description").textContent = s.stage === "egg" ? "Your egg is warm and safe. Stay a while. A new friend is almost here." : a.description, this.el(".fb-growth-label").textContent = s.stage === "egg" ? "HATCHING" : s.stage === "baby" ? "GROWING" : "EVOLVED", this.el(".fb-growth-hint").textContent = s.stage === "evolved" ? a.type.toUpperCase() : "IN PROGRESS";
    const P = s.stage === "evolved" ? 100 : Math.min(
      100,
      s.stageAge / (s.stage === "egg" ? v.hatch : v.evolution) * 100
    );
    this.el(".fb-growth-track i").style.width = `${P}%`, this.renderPanel(s, i, P), this.debug && ot(this.root, s);
  }
  renderPanel(e, i, s) {
    const a = this.el(".fb-status-panel"), n = e.combat.encounter || e.combat.active, r = n ? Ne(e, i.encounterChoice, i.battleSelected) : i.inventoryOpen ? Xe(e, i.itemIndex, i.itemConfirm) : i.expeditionPage ? Ye(e, i.expeditionPage, i.zoneIndex) : i.statusPage !== null ? We(e, i.statusPage, s, i.logOffset, i) : null;
    if (a.hidden = r === null, r === null) {
      this.panelMarkup && a.replaceChildren(), this.panelMarkup = "", this.lastStatusPage = null, this.lastPanel = "";
      return;
    }
    a.classList.toggle("fb-combat-panel", !!n), this.panelMarkup !== r && (a.innerHTML = r, this.panelMarkup = r);
    const o = n ? `combat:${e.combat.encounter ? "encounter" : e.combat.active?.status}` : i.inventoryOpen ? `items:${i.itemIndex}:${i.itemConfirm}` : i.expeditionPage ? `${i.expeditionPage}:${i.zoneIndex}` : `status:${i.statusPage}`;
    (o !== this.lastPanel || i.statusPage !== this.lastStatusPage) && this.motion.play(a, "page"), this.lastPanel = o, this.lastStatusPage = i.statusPage;
  }
  confirmFeedback() {
    this.motion.play(this.el(".fb-lcd"), "confirm");
  }
  guide(e) {
    const i = this.el(".fb-guide");
    e && !i.open ? i.showModal() : !e && i.open && i.close();
  }
  destroy() {
    this.mounted = !1, this.resizeObserver?.disconnect(), this.resizeObserver = void 0, this.motion.destroy(), this.root.innerHTML = "", this.root.classList.remove("forge-beast", "fb-embedded", "fb-paused");
  }
}
function ct(t, e, i, s, a) {
  const n = (r) => e.querySelector(r).value;
  if ((i.state.combat.active || i.state.combat.encounter) && ["debug-hatch", "debug-evolve", "debug-force", "debug-event"].includes(t)) {
    i.feedback("Finish the battle before changing form or life events.");
    return;
  }
  if (t === "debug-battle-start" && i.debugBattle(n(".fb-debug-opponent")), t === "debug-battle-rare" && i.debugBattle(n(".fb-debug-opponent"), !0, !0), t === "debug-battle-win" && i.debugBattleResult("victory"), t === "debug-battle-loss" && i.debugBattleResult("defeat"), t === "debug-battle-escape" && i.debugBattleResult("escape"), t === "debug-battle-critical" && i.debugCritical(), t === "debug-battle-stamina" || t === "debug-battle-skill") {
    const r = i.state.combat.active;
    r && r.status === "ongoing" && (r.player.stamina = r.player.maxStamina, t === "debug-battle-skill" && (r.beats = [], i.battleAction("skill")));
  }
  if (t === "debug-trip-start" && i.explore(n(".fb-debug-zone")), t === "debug-trip-complete" && i.debugCompleteExpedition(), t === "debug-trip-outcome" && i.debugCompleteExpedition(n(".fb-debug-outcome")), t === "debug-trip-rare" && i.debugCompleteExpedition("rare-item"), t === "debug-trip-failed" && i.debugCompleteExpedition("fatigue"), t.startsWith("debug-item-")) {
    const r = n(".fb-debug-item"), o = Number(e.querySelector(".fb-debug-quantity").value);
    t === "debug-item-add" && se(i.state, r, o), t === "debug-item-remove" && ne(i.state, r, o), t === "debug-item-set" && ge(i.state, r, o);
  }
  if (t === "debug-event" && i.debugEvent(n(".fb-debug-event")), t === "debug-neglect" && i.debugNeglect(), t === "debug-age" && i.advance(60), t === "debug-hatch" && i.debugHatch(), t === "debug-evolve" && i.debugEvolve(), t === "debug-force" && (i.state.stage === "evolved" && (i.state.stage = "baby", i.state.species = "pipkin"), i.debugEvolve(n(".fb-debug-species"))), t === "debug-animation") {
    const r = n(".fb-debug-animation");
    ce.includes(r) && i.debugAnimation(r);
  }
  t === "debug-alert" && i.debugAlert(n(".fb-debug-alert")), t === "debug-reset-flow" && a(), t === "debug-reset" && s();
}
function ut(t, e) {
  const i = (a) => ({ success: !1, message: a, behavior: "idle" });
  if (!fe(e) || t.exploration.inventory[e] < 1) return i("Nothing here yet. Explore to find little treasures.");
  if (t.combat.encounter || t.combat.active || t.combat.result) return i("Finish the wild encounter first.");
  if (t.stage === "egg") return i("Your egg is still growing. Save that for later.");
  if (t.exploration.active) return i("Your beast is exploring. Wait for their return.");
  if (t.exploration.result) return i("Meet your returning beast first.");
  if (t.sleeping) return i("Shhh… save that for when they wake.");
  if (t.age - t.lastActionAge < v.actionCooldown) return i("One little moment…");
  const s = C[e];
  return s.consumable && !ne(t, e) ? i("That item is no longer here.") : (f(t, s.effects), t.lastActionAge = t.age, t.life.lastInteractionAge = t.age, s.consumable && t.development.successfulInteractions++, e === "snack" && (t.life.needTimers.hunger = 0), e === "toy" && (t.life.needTimers.mood = 0), d(t, `item:${e}`, "action", s.message), { success: !0, message: t.eventHistory.at(-1).message, behavior: s.reaction });
}
function K(t, e = !1) {
  t.sleeping = !1, t.life.sleepStartedAge = null, t.life.sleepUntilAge = 0, e && f(t, { mood: 4, health: 2 });
}
function W(t, e) {
  return f(t, e.effects), e.sleep === "wake" && K(t), e.sleep === "extend" && (t.life.sleepUntilAge = t.age + A.extraSleep), t.life.cooldowns[e.id] = t.age + e.cooldown, d(t, e.id, "life", e.text), { id: e.id, message: e.text.replace("{name}", h[t.species].name), behavior: e.behavior };
}
function Y(t, e) {
  return t.stage !== "egg" && t.age >= (t.life.cooldowns[e.id] ?? 0) && e.eligible(t);
}
function dt(t, e) {
  const i = L.find((s) => s.id === "refuses-training");
  return Y(t, i) && E(e) < B(t).refusalChance ? W(t, i) : null;
}
function ht(t, e) {
  if (t.stage === "egg") return null;
  let i = null;
  if (t.age >= t.life.nextEventAge) {
    t.life.nextEventAge = t.age + A.minInterval + E(e) * A.intervalJitter;
    const a = B(t), n = L.filter((r) => r.trigger === "ambient" && Y(t, r));
    if (n.length && E(e) < a.eventChance) {
      const r = (u) => u.weight * (a.eventWeights[u.id] ?? 1);
      let o = E(e) * n.reduce((u, g) => u + r(g), 0);
      const l = n.find((u) => (o -= r(u), o < 0)) ?? n.at(-1);
      i = W(t, l);
    }
  }
  const s = t.life.sleepStartedAge === null ? 0 : t.age - t.life.sleepStartedAge;
  return !i && t.sleeping && t.stats.energy >= 98 && s >= A.minimumSleep && t.age >= t.life.sleepUntilAge && (K(t, !0), d(t, "woke-refreshed", "life", "{name} woke up refreshed."), i = { id: "woke-refreshed", message: `${h[t.species].name} woke up refreshed.`, behavior: "happy" }), i;
}
function pt(t, e, i = !1) {
  const s = L.find((a) => a.id === e);
  return !s || t.stage === "egg" || !i && !Y(t, s) ? null : (i && s.sleep && (t.sleeping = !0, t.life.sleepStartedAge = Math.max(0, t.age - A.minimumSleep)), W(t, s));
}
function gt(t, e, i = Math.random) {
  const s = (n, r = "idle", o = !1) => ({ message: n, behavior: r, success: o });
  if (t.combat.encounter || t.combat.active || t.combat.result) return s("Finish the wild encounter first.");
  if (t.exploration.active) return s("Your beast is exploring. Wait for their return.");
  if (t.exploration.result) return s("Meet your returning beast first.");
  if (t.stage === "egg") return s("Still growing. Keep your egg company.");
  if (e === "sleep" && t.sleeping) {
    const n = t.stats.energy >= 80;
    return K(t, n), t.life.lastInteractionAge = t.age, d(t, "wake", "action", n ? "{name} woke up refreshed." : "{name} opened sleepy eyes."), s("Rise and shine, little one!", "celebrate", !0);
  }
  if (t.sleeping) return s("Shhh… your beast is resting.", "sleep");
  if (t.age - t.lastActionAge < v.actionCooldown) return s("One little moment…");
  if ((e === "train" || e === "play") && t.stats.energy < 15)
    return t.lastActionAge = t.age, e === "train" && (X(t, "exhaustedTraining"), f(t, { health: -3, mood: -3 })), s("Too sleepy. A little rest first?", "tired");
  if (e === "train" && t.stats.health < 25)
    return t.lastActionAge = t.age, s("Feeling poorly. Gentle care before training.", "sick");
  if (t.lastActionAge = t.age, e === "train") {
    const n = dt(t, i);
    if (n) return s(n.message, n.behavior);
  }
  t.careHistory.push({ action: e, age: t.age }), t.careHistory = t.careHistory.slice(-100), t.development.successfulInteractions++, t.life.lastInteractionAge = t.age;
  const a = B(t);
  return e === "feed" ? t.stats.hunger > 88 ? (X(t, "overfeeding"), f(t, { hunger: 22, mood: -5, health: -3 }), s("Oof… a little too full!", "upset", !0)) : (f(t, { hunger: 24, mood: 4, health: 1 }), t.life.needTimers.hunger = 0, d(t, "feed", "action", "{name} enjoyed an emberberry."), s("A tasty emberberry. Happy belly!", "feed", !0)) : e === "train" ? (t.development.trainingSessions++, f(t, { training: 10, discipline: 8, energy: -a.trainingEnergy, hunger: -7, mood: a.trainingMood }), d(t, "train", "action", `{name} practiced. ${a.trainText}`), s(a.trainText, "train", !0)) : e === "play" ? (t.development.playSessions++, f(t, { mood: a.playMood, discipline: 2, energy: -a.playEnergy, hunger: -3 }), t.life.needTimers.mood = 0, d(t, "play", "action", `{name} played. ${a.playText}`), s(a.playText, "play", !0)) : (t.sleeping = !0, t.life.sleepStartedAge = t.age, t.life.sleepUntilAge = 0, t.life.needTimers.energy = 0, d(t, "sleep", "action", "{name} curled up for a little rest."), s(a.sleepText, "sleep", !0));
}
const ft = [
  { species: "bramblejaw", matches: (t) => t.development.careMistakes >= 3 || t.development.overfeeding >= 4 || t.development.neglectTime > 55 || t.stats.health < 30 },
  { species: "cragox", matches: (t) => t.development.trainingSessions >= 5 && t.stats.training >= 45 && t.development.careMistakes < 3 },
  { species: "zephlet", matches: (t) => t.development.playSessions >= 5 && t.development.trainingSessions >= 2 && t.stats.hunger > 30 },
  { species: "runewisp", matches: (t) => t.stats.mood >= 60 && t.development.successfulInteractions >= 4 && t.development.careMistakes <= 1 }
];
function bt(t) {
  const e = t.development, i = {
    cragox: e.trainingSessions * 2 + t.stats.discipline / 25,
    zephlet: e.playSessions * 2 + t.stats.energy / 40,
    runewisp: t.stats.mood / 25 + e.consistencyTime / 90 - e.careMistakes * 2,
    bramblejaw: e.careMistakes * 3 + e.exhaustedTraining * 2 + (100 - t.stats.health) / 20
  }, s = { brute: "cragox", agile: "zephlet", mystic: "runewisp", wild: "bramblejaw" };
  return i[s[B(t).affinity]] += 2, i;
}
function mt(t) {
  const e = ft.find((s) => s.matches(t));
  if (e) return e.species;
  const i = bt(t);
  return Object.keys(i).sort((s, a) => i[a] - i[s])[0];
}
function de(t, e = Math.random) {
  return t.stage !== "egg" ? !1 : (t.stage = "baby", t.species = "pipkin", t.stageAge = 0, be(t, e), t.life.nextEventAge = t.age + A.initialDelay, t.life.lastInteractionAge = t.age, !0);
}
function he(t, e) {
  return t.stage !== "baby" || e && ["cinder-egg", "pipkin"].includes(e) ? !1 : (t.species = e ?? mt(t), t.stage = "evolved", t.stageAge = 0, t.sleeping = !1, t.life.sleepStartedAge = null, t.life.sleepUntilAge = 0, !0);
}
function vt(t, e = Math.random) {
  return t.stage === "egg" && t.stageAge >= v.hatch ? (de(t, e), "hatch") : t.stage === "baby" && t.stageAge >= v.evolution ? (he(t), "evolution") : null;
}
class yt {
  current = null;
  sequence = 0;
  start(e, i, s = "happy") {
    this.current = { kind: e, started: i, outcome: s, sequence: ++this.sequence };
  }
  frame(e) {
    if (!this.current) return null;
    let i = Math.max(0, e - this.current.started);
    for (const s of nt[this.current.kind]) {
      if (i < s.duration) return { ...this.current, phase: s.name };
      i -= s.duration;
    }
    return this.current = null, null;
  }
  reset() {
    this.current = null;
  }
}
class wt {
  constructor(e, i = Math.random) {
    this.random = i, this.state = e ?? G(), this.reactions.update(this.state);
  }
  state;
  reactions = new Qe();
  animations = new yt();
  criticalNext = !1;
  get battleFrame() {
    return this.state.combat.active ? F(this.state.combat.active, this.state.age) : null;
  }
  get animation() {
    return this.animations.frame(this.state.age);
  }
  event = null;
  get message() {
    return this.reactions.message;
  }
  get behavior() {
    return this.reactions.behavior;
  }
  /** Substeps keep debug advances and real clock ticks on the same simulation path. */
  tick(e) {
    if (!Number.isFinite(e) || e <= 0) return;
    this.event = null;
    let i = e;
    for (; i > 0; ) {
      const s = Math.min(0.25, i);
      this.state.age += s, this.state.stageAge += s;
      const a = this.state.combat.encounter || this.state.combat.active;
      a || me(this.state, s);
      const n = J(this.state, this.random);
      n && this.returnFeedback(n);
      const r = this.state.exploration.active || this.state.exploration.result || a, o = r ? null : vt(this.state, this.random);
      if (o)
        this.event = o, this.lifecycleFeedback(o);
      else if (!r) {
        const l = ht(this.state, this.random);
        l && (this.feedback(l.message, l.behavior, 5), ["wakes-early", "woke-refreshed"].includes(l.id) && this.animations.start("wake", this.state.age));
      }
      this.reactions.update(this.state), i -= s;
    }
  }
  lifecycleFeedback(e) {
    const i = e === "hatch" ? "Hello, Pipkin! Your adventure begins." : `Meet ${h[this.state.species].name}. A new spark!`;
    d(this.state, e, "lifecycle", i), this.feedback(i, "celebrate", e === "hatch" ? 6 : 8), this.animations.start("evolution", this.state.age);
  }
  enterBattle() {
    const e = ve(this.state);
    return this.feedback(e.message), e;
  }
  battleAction(e) {
    const i = ye(this.state, e, this.random, { critical: this.criticalNext && (e === "attack" || e === "skill") ? !0 : void 0 });
    return i.success && (e === "attack" || e === "skill") && (this.criticalNext = !1), this.feedback(i.message), i;
  }
  retreatEncounter() {
    return He(this.state);
  }
  acknowledgeBattle() {
    return we(this.state);
  }
  debugBattle(e, i = !1, s = !1) {
    return this.state.exploration.active || this.state.exploration.result || this.state.combat.active || this.state.combat.encounter ? (this.feedback("Finish the current adventure first."), !1) : re(this.state, e, i) ? s || this.enterBattle().success : (this.feedback("An awake, hatched beast can meet wild creatures."), !1);
  }
  debugBattleResult(e) {
    const i = this.state.combat.active;
    return i ? (i.beats = [], i.beatStartedAge = this.state.age, Ee(this.state, e, this.random)) : !1;
  }
  debugCritical() {
    this.criticalNext = !0, this.feedback("Next player strike: critical.");
  }
  explore(e) {
    const i = De(this.state, e, this.random);
    return this.feedback(i.message, i.success ? "excited" : "idle", 4), i.success && this.animations.start("depart", this.state.age), i;
  }
  returnFeedback(e) {
    this.event = "expedition", this.feedback(e.message, e.failed ? "tired" : "excited", 6), this.animations.start(e.rare ? "rare" : e.failed ? "failure" : "discover", this.state.age);
  }
  acknowledgeExpedition() {
    this.state.exploration.result = null;
  }
  useItem(e) {
    const i = ut(this.state, e);
    if (this.feedback(i.message, i.behavior, 4), i.success) {
      const s = i.behavior === "feed" ? "feed" : i.behavior === "train" ? "train" : "play";
      this.animations.start(s, this.state.age);
    }
    return i;
  }
  debugCompleteExpedition(e) {
    if (!this.state.exploration.active)
      return this.feedback("Send your beast exploring first."), !1;
    const s = J(this.state, this.random, e, !0);
    return s ? (this.returnFeedback(s), !0) : !1;
  }
  action(e) {
    const i = this.state.sleeping, s = gt(this.state, e, this.random);
    if (this.feedback(s.message, s.behavior), s.success) {
      const a = e === "sleep" && i ? "wake" : e;
      this.animations.start(a, this.state.age, s.behavior === "upset" ? "overfed" : e === "train" && this.state.stats.energy < 25 ? "fatigue" : e === "train" ? "success" : "happy");
    }
    return s;
  }
  feedback(e, i = "idle", s = v.feedbackDuration) {
    this.reactions.show(this.state, e, i, s);
  }
  debugHatch() {
    de(this.state, this.random) && this.lifecycleFeedback("hatch");
  }
  debugEvolve(e) {
    this.debugHatch(), he(this.state, e) && this.lifecycleFeedback("evolution");
  }
  debugPersonality(e) {
    return !ae.includes(e) || this.state.stage === "egg" ? !1 : (this.state.personality = e, !0);
  }
  debugEvent(e) {
    const i = pt(this.state, e, !0);
    return i ? (this.feedback(i.message, i.behavior, 5), ["wakes-early", "woke-refreshed"].includes(i.id) && this.animations.start("wake", this.state.age), !0) : (this.feedback("Hatch first to try a life event."), !1);
  }
  debugNeglect() {
    this.state.stage === "egg" && this.debugHatch(), this.state.sleeping = !1, this.state.life.sleepStartedAge = null, this.state.life.sleepUntilAge = 0, this.state.stats.hunger = 10, this.state.stats.energy = 10, this.state.stats.mood = 10, this.advance(60);
  }
  debugAnimation(e) {
    if (this.state.stage === "egg") {
      this.feedback("Hatch first to preview a creature action.");
      return;
    }
    this.animations.start(e, this.state.age);
  }
  debugAlert(e) {
    this.state.stage === "egg" && this.debugHatch(), this.animations.reset(), this.reactions.reset();
    const i = { hungry: "hunger", tired: "energy", upset: "mood", sick: "health", restless: "discipline" };
    this.state.stats[i[e]] = 10, this.reactions.update(this.state);
  }
  advance(e) {
    this.tick(e);
  }
  reset(e = G()) {
    this.state = e, this.reactions.reset(), this.animations.reset(), this.event = null, this.criticalNext = !1;
  }
}
class Et {
  constructor(e) {
    this.tick = e;
  }
  timer;
  last = 0;
  resume() {
    this.timer || (this.last = performance.now(), this.timer = setInterval(() => {
      const e = performance.now(), i = Math.min((e - this.last) / 1e3, 1);
      this.last = e, this.tick(i);
    }, v.tickMs));
  }
  pause() {
    this.timer && clearInterval(this.timer), this.timer = void 0;
  }
  destroy() {
    this.pause();
  }
}
const kt = {
  "battle-start": { notes: [330, 660, 440], duration: 0.07, gap: 0.1, volume: 0.014 },
  attack: { notes: [280, 420], duration: 0.045, gap: 0.05, volume: 0.015 },
  hit: { notes: [180, 130], duration: 0.045, gap: 0.04, volume: 0.015 },
  guard: { notes: [390, 390], duration: 0.05, gap: 0.08, volume: 0.012 },
  skill: { notes: [440, 550, 740], duration: 0.07, gap: 0.07, volume: 0.016 },
  critical: { notes: [220, 880], duration: 0.075, gap: 0.06, volume: 0.017 },
  victory: { notes: [440, 555, 660, 880], duration: 0.1, gap: 0.1, volume: 0.016 },
  defeat: { notes: [390, 280, 220], duration: 0.1, gap: 0.12, volume: 0.012 },
  button: { notes: [520], duration: 0.045, gap: 0.055, volume: 0.012 },
  confirm: { notes: [620, 830], duration: 0.055, gap: 0.06, volume: 0.014 },
  feed: { notes: [370, 440, 555], duration: 0.07, gap: 0.12, volume: 0.016 },
  training: { notes: [260, 260, 520], duration: 0.06, gap: 0.14, volume: 0.016 },
  play: { notes: [440, 660, 880, 660], duration: 0.065, gap: 0.075, volume: 0.014 },
  sleep: { notes: [440, 330, 220], duration: 0.13, gap: 0.15, volume: 9e-3 },
  wake: { notes: [220, 330, 520], duration: 0.08, gap: 0.1, volume: 0.013 },
  alert: { notes: [660, 440], duration: 0.09, gap: 0.14, volume: 0.014 },
  evolution: { notes: [330, 440, 555, 660, 880], duration: 0.12, gap: 0.13, volume: 0.017 }
};
class xt {
  constructor(e = () => new AudioContext(), i = !0) {
    this.createContext = e, this.unlocked = i;
  }
  context;
  tones = /* @__PURE__ */ new Map();
  silent = !1;
  paused = !1;
  unlocked;
  unlock() {
    this.unlocked = !0;
  }
  lock() {
    this.unlocked = !1;
  }
  pause() {
    this.paused = !0, this.stopTones();
    try {
      this.context?.suspend?.().catch(() => {
      });
    } catch {
    }
  }
  resume() {
    this.paused = !1;
  }
  get muted() {
    return this.silent;
  }
  set muted(e) {
    this.silent = e, e && this.stopTones();
  }
  play(e, i = 0) {
    if (!(this.silent || this.paused || !this.unlocked))
      try {
        this.context ??= this.createContext(), this.context.resume().catch(() => {
        });
        const s = kt[e];
        s.notes.forEach((a, n) => {
          const r = this.context.createOscillator(), o = this.context.createGain(), l = this.context.currentTime + i + n * s.gap;
          r.type = "square", r.frequency.value = a, o.gain.setValueAtTime(s.volume, l), o.gain.exponentialRampToValueAtTime(1e-3, l + s.duration), r.connect(o), o.connect(this.context.destination), this.tones.set(r, o), r.onended = () => {
            this.tones.delete(r), r.disconnect(), o.disconnect();
          }, r.start(l), r.stop(l + s.duration);
        });
      } catch {
      }
  }
  stopTones() {
    for (const [e, i] of this.tones) {
      e.onended = null;
      try {
        e.stop(), e.disconnect(), i.disconnect();
      } catch {
      }
    }
    this.tones.clear();
  }
  destroy() {
    this.stopTones(), this.context?.close().catch(() => {
    }), this.context = void 0;
  }
}
const St = { confirm: 8, alert: 12, evolution: [12, 30, 18], attack: 6, critical: [12, 20, 12], victory: [8, 25, 8, 25, 12] };
class At {
  constructor(e = typeof navigator < "u" && typeof navigator.vibrate == "function" ? (s) => navigator.vibrate(s) : null, i = () => typeof matchMedia < "u" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    this.vibrate = e, this.reducedMotion = i;
  }
  active = !1;
  paused = !1;
  allowed = !1;
  get enabled() {
    return this.allowed;
  }
  set enabled(e) {
    this.allowed = e, e || this.cancel();
  }
  play(e) {
    if (this.paused || !this.allowed || !this.vibrate || this.reducedMotion()) return !1;
    try {
      return this.active = this.vibrate(St[e]), this.active;
    } catch {
      return !1;
    }
  }
  cancel() {
    if (this.active)
      try {
        this.vibrate?.(0);
      } catch {
      }
    this.active = !1;
  }
  pause() {
    this.paused = !0, this.cancel();
  }
  resume() {
    this.paused = !1;
  }
  destroy() {
    this.pause();
  }
}
class $t {
  constructor(e, i = {}) {
    this.options = i, this.root = e, this.persistence = new ke(xe(i.storage), i.saveKey), this.engine = new wt(this.persistence.load()), this.observer.initialize(this.engine.state), this.clock = new Et((s) => this.safely("clock", () => {
      this.engine.tick(s), this.engine.event === "expedition" ? this.returnFeedback() : this.engine.event && (this.audio.play("evolution"), this.haptics.play("evolution"));
      const a = j(this.engine.state);
      a && a !== this.lastAlert && !this.engine.state.sleeping && !this.engine.state.exploration.active && !this.engine.state.combat.active && !this.engine.state.combat.encounter && (this.audio.play("alert"), this.haptics.play("alert")), this.lastAlert = a, this.engine.state.age - this.autosaveAge >= 5 && this.save(), this.render();
    }));
  }
  engine;
  view;
  root;
  disposed = !1;
  tearingDown = !1;
  running = !1;
  runtimeFailed = !1;
  reportingError = !1;
  emitting = /* @__PURE__ */ new Set();
  retainedUnsaved = !1;
  mountedBefore = !1;
  summaryKey = "";
  observer = new $e();
  clock;
  persistence;
  navigation = new at();
  battleNavigation = new Ce();
  lastBattleCue = "";
  audio = new xt(void 0, !1);
  haptics = new At();
  initialized = !1;
  hostPaused = !1;
  guideOpen = !1;
  autosaveAge = 0;
  lastAlert = null;
  lastStorageError = "";
  /** Legacy constructor(container).init() and factory.mount(container) share one lifecycle. */
  init() {
    if (!this.root) throw new Error("Forge Beast requires a mount container.");
    return this.mount(this.root);
  }
  mount(e) {
    if (this.disposed || this.tearingDown) throw new Error("Forge Beast is destroyed. Create a new instance.");
    if (this.initialized) {
      if (e !== this.root) throw new Error("Unmount before changing containers.");
      return this;
    }
    const i = z.get(e);
    if (i && i !== this) throw new Error("This container already hosts Forge Beast.");
    if (this.root = e, this.mountedBefore && (!this.retainedUnsaved || this.runtimeFailed)) {
      const s = this.persistence.load();
      (s || this.runtimeFailed) && this.engine.reset(s ?? void 0);
    }
    return this.mountedBefore = !0, this.runtimeFailed = !1, this.navigation.reset(), this.battleNavigation.reset(), this.guideOpen = !1, this.lastBattleCue = "", this.summaryKey = "", this.observer.initialize(this.engine.state), this.view = new lt(e, this.options.debug === !0, this.options.mode ? this.options.mode === "embedded" : !!this.options.embedded, (s) => this.reportError("layout", s)), this.view.mount(), this.initialized = !0, z.set(e, this), e.addEventListener("click", this.onClick), e.addEventListener("input", this.onInput), e.addEventListener("close", this.onDialogClose, !0), document.addEventListener("visibilitychange", this.onVisibility), window.addEventListener("pagehide", this.onPageHide), window.addEventListener("pageshow", this.onPageShow), this.audio.lock(), this.audio.pause(), this.haptics.pause(), this.persistence.error && (this.lastStorageError = this.persistence.error, this.reportError("storage", this.persistence.error), this.engine.feedback("Save needs recovery. Original data kept. Reset in Settings.")), this.save(), this.emit({ type: "ready", payload: this.getStateSummary() }), this.syncClock("mount"), this.render(), this;
  }
  pause() {
    this.disposed || this.hostPaused || (this.hostPaused = !0, this.syncClock("host"), this.initialized && this.save(), this.render());
  }
  resume() {
    this.disposed || (this.hostPaused = !1, this.syncClock("host"), this.render());
  }
  save() {
    if (this.disposed) return !1;
    const e = this.persistence.save(this.engine.state);
    return this.retainedUnsaved = !e && this.persistence.enabled, this.autosaveAge = this.engine.state.age, this.emit({ type: "save", payload: { success: e, summary: this.getStateSummary() } }), e ? this.lastStorageError = "" : this.persistence.enabled && this.persistence.error && this.lastStorageError !== this.persistence.error && (this.lastStorageError = this.persistence.error, this.reportError("storage", this.persistence.error)), e;
  }
  /** Normal reset keeps preferences; direct reset() retains the original full-reset default. */
  reset(e = {}) {
    if (this.disposed) return !1;
    const i = it(this.engine.state, e);
    return !this.persistence.save(i, { replaceInvalid: !0 }) && this.persistence.enabled ? (this.navigation.resetFlow.pending ? this.navigation.resetFlow.fail() : this.engine.feedback("Could not save a new egg. Try again."), this.render(), !1) : (this.persistence.clearResetBackup(), this.engine.reset(i), this.navigation.reset(), this.battleNavigation.reset(), this.lastBattleCue = "", this.lastAlert = null, this.autosaveAge = 0, this.retainedUnsaved = !1, this.observer.initialize(this.engine.state), this.emit({ type: "reset", payload: this.getStateSummary() }), this.syncClock(), this.render(), !0);
  }
  getState() {
    return structuredClone(this.engine.state);
  }
  getStateSummary() {
    return Se(this.engine.state, this.persistence.hasSave);
  }
  requestExit() {
    this.disposed || this.emit({ type: "exit-requested", payload: this.getStateSummary() });
  }
  /** Reusable teardown. Mount again with a dedicated container to resume the save. */
  unmount() {
    if (this.tearingDown) return;
    if (!this.initialized) {
      this.root = void 0;
      return;
    }
    this.tearingDown = !0, this.stopActivity("unmount"), this.save();
    const e = this.root;
    e.removeEventListener("click", this.onClick), e.removeEventListener("input", this.onInput), e.removeEventListener("close", this.onDialogClose, !0), document.removeEventListener("visibilitychange", this.onVisibility), window.removeEventListener("pagehide", this.onPageHide), window.removeEventListener("pageshow", this.onPageShow), this.view?.destroy(), z.delete(e), this.audio.destroy(), this.haptics.destroy(), this.view = void 0, this.root = void 0, this.initialized = !1, this.guideOpen = !1, this.navigation.reset(), this.battleNavigation.reset(), this.lastBattleCue = "", this.tearingDown = !1;
  }
  /** Terminal teardown. Repeated calls are harmless; use a fresh instance afterwards. */
  destroy() {
    this.disposed || (this.unmount(), this.clock.destroy(), this.audio.destroy(), this.haptics.destroy(), this.persistence.dispose(), this.options = {}, this.disposed = !0);
  }
  stopActivity(e) {
    this.clock.pause(), this.audio.pause(), this.haptics.pause(), this.view?.setPaused(!0), this.running && (this.running = !1, this.emit({ type: "pause", payload: { reason: e } }));
  }
  syncClock(e = "internal") {
    this.initialized && !this.tearingDown && !this.disposed && !this.hostPaused && !document.hidden && !this.guideOpen && !this.navigation.resetFlow.pending && !this.runtimeFailed ? (this.audio.resume(), this.haptics.resume(), this.view?.setPaused(!1), this.clock.resume(), this.running || (this.running = !0, this.emit({ type: "resume", payload: { reason: e } }))) : this.stopActivity(this.runtimeFailed ? "error" : this.hostPaused ? "host" : document.hidden ? "visibility" : this.guideOpen ? "guide" : "reset");
  }
  emit(e) {
    if (!(!this.options.onEvent || this.disposed || this.emitting.has(e.type))) {
      this.emitting.add(e.type);
      try {
        this.options.onEvent(structuredClone(e));
      } catch (i) {
        this.reportError("host-callback", i);
      } finally {
        this.emitting.delete(e.type);
      }
    }
  }
  reportError(e, i, s = !0) {
    if (this.reportingError) return;
    this.reportingError = !0;
    const a = i instanceof Error ? i.message : String(i);
    console.error(`[Forge Beast / ${e}] ${a}`);
    try {
      this.options.onEvent?.({ type: "error", payload: { subsystem: e, message: a, recoverable: s } });
    } catch {
    } finally {
      this.reportingError = !1;
    }
  }
  safely(e, i) {
    try {
      i();
    } catch (s) {
      if (this.runtimeFailed = !0, this.stopActivity("error"), this.reportError(e, s, !1), this.root) {
        const a = this.root.querySelector(".fb-message");
        a && (a.textContent = "Device paused after an error. Exit and reopen safely.");
      }
      this.save();
    }
  }
  onVisibility = () => {
    document.hidden && this.save(), this.syncClock("visibility"), this.render();
  };
  onPageShow = () => {
    this.syncClock("visibility"), this.render();
  };
  onPageHide = () => {
    this.stopActivity("visibility"), this.save();
  };
  onDialogClose = () => {
    this.guideOpen = !1, this.syncClock(), this.render();
  };
  onInput = (e) => this.safely("input", () => this.handleInput(e));
  handleInput(e) {
    if (!this.options.debug || !this.running) return;
    const i = e.target;
    if (i.dataset.battleHp) {
      const s = this.engine.state.combat.active, a = Number(i.value);
      if (!s || s.status !== "ongoing" || !Number.isFinite(a)) return;
      const n = i.dataset.battleHp === "player" ? "player" : "enemy";
      s[n].hp = Math.max(0, Math.min(s[n].maxHP, Math.round(a))), s.beats = [], s[n].hp === 0 && this.engine.debugBattleResult(n === "player" ? "defeat" : "victory");
    } else if (i.matches(".fb-debug-personality")) this.engine.debugPersonality(i.value);
    else {
      const s = i.dataset.stat, a = Number(i.value);
      if (!ue.includes(s) || !Number.isFinite(a)) return;
      this.engine.state.stats[s] = Ae(a);
    }
    this.save(), this.render();
  }
  onClick = (e) => this.safely("input", () => this.handleClick(e));
  handleClick(e) {
    if (!this.initialized || this.hostPaused || document.hidden || this.runtimeFailed) return;
    const i = e.target.closest("[data-command]")?.dataset.command;
    if (i) {
      if (i === "exit") {
        this.requestExit();
        return;
      }
      if (i === "guide") {
        this.guideOpen = !0, this.syncClock(), this.view.guide(!0), this.render();
        return;
      }
      if (i === "close-guide") {
        this.guideOpen = !1, this.view.guide(!1), this.syncClock(), this.render();
        return;
      }
      if (i === "mute") {
        this.audio.unlock(), this.toggleMute(), this.save(), this.render();
        return;
      }
      if (this.audio.unlock(), this.configureFeedback(), ["select", "confirm", "back"].includes(i)) {
        if (this.audio.play(i === "confirm" ? "confirm" : "button"), i === "confirm" && (this.haptics.play("confirm"), this.view.confirmFeedback()), this.engine.state.combat.encounter || this.engine.state.combat.active) {
          this.onBattleInput(i), this.save(), this.render();
          return;
        }
        const s = this.navigation.press(i, this.engine.state.eventHistory.length, !!this.engine.state.exploration.active);
        if (s.toggle === "sound" && this.toggleMute(), s.toggle === "haptics" && (this.engine.state.hapticsEnabled = !this.engine.state.hapticsEnabled, this.configureFeedback(), this.haptics.play("confirm")), s.reset && this.reset({ keepSettings: !0 }), s.acknowledge && (this.engine.acknowledgeExpedition(), this.navigation.expeditionPage = null), s.explore && this.engine.explore(s.explore).success && (this.navigation.expeditionPage = "trip", this.audio.play("play", 0.13)), s.item) {
          const a = this.engine.useItem(s.item);
          this.navigation.itemConfirm = !1, a.success && (this.navigation.inventoryOpen = !1, this.audio.play(a.behavior === "feed" ? "feed" : a.behavior === "train" ? "training" : "play", 0.13));
        }
        if (s.hint && this.engine.feedback("A to choose · B to care · C to return"), s.action) {
          const a = this.engine.state.sleeping;
          if (this.engine.action(s.action).success) {
            const r = s.action === "sleep" ? a ? "wake" : "sleep" : s.action === "train" ? "training" : s.action;
            this.audio.play(r, 0.13);
          }
        }
      }
      if (this.options.debug && i.startsWith("debug-")) {
        const s = this.engine.state.species, a = this.engine.state.exploration.result;
        ct(i, this.root, this.engine, () => {
          this.reset();
        }, () => this.navigation.openReset()), a !== this.engine.state.exploration.result && this.engine.state.exploration.result && this.returnFeedback(), s !== this.engine.state.species && i !== "debug-reset" && (this.audio.play("evolution"), this.haptics.play("evolution"));
      }
      this.syncClock(), this.save(), this.render();
    }
  }
  onBattleInput(e) {
    const i = this.battleNavigation.press(this.engine.state, e);
    i.enter && this.engine.enterBattle().success && this.battleNavigation.reset(), i.retreat && (this.engine.retreatEncounter(), this.battleNavigation.reset()), i.action && this.engine.battleAction(i.action), i.acknowledge && (this.engine.acknowledgeBattle(), this.navigation.reset(), this.battleNavigation.reset());
  }
  battleFeedback() {
    if (!this.running) return;
    const e = this.engine.state.combat.active, i = this.engine.battleFrame;
    if (!e || !i) {
      this.lastBattleCue = "";
      return;
    }
    const s = `${e.startedAt}:${e.beatStartedAge}:${e.turn}:${i.index}`;
    if (s === this.lastBattleCue) return;
    this.lastBattleCue = s;
    const a = { entry: "battle-start", attack: "attack", guard: "guard", skill: "skill", hit: "hit", critical: "critical", dodge: "button", victory: "victory", defeat: "defeat", escape: "wake" };
    this.audio.play(a[i.beat.animation]);
    const n = i.beat.animation === "critical" ? "critical" : i.beat.animation === "victory" ? "victory" : i.beat.animation === "attack" ? "attack" : void 0;
    n && this.haptics.play(n);
  }
  returnFeedback() {
    const e = this.engine.state.exploration.result;
    this.audio.play(e?.rare ? "evolution" : e?.failed ? "alert" : "confirm"), this.haptics.play(e?.rare ? "evolution" : "confirm"), this.save();
  }
  configureFeedback() {
    this.audio.muted = this.engine.state.muted, this.haptics.enabled = this.engine.state.hapticsEnabled;
  }
  toggleMute() {
    this.engine.state.muted = !this.engine.state.muted, this.audio.muted = this.engine.state.muted, this.audio.muted || this.audio.play("button");
  }
  render() {
    this.safely("render", () => this.updateView());
  }
  updateView() {
    if (!this.initialized) return;
    this.configureFeedback(), this.battleFeedback();
    const e = this.navigation;
    this.engine.state.exploration.result && !this.engine.animation && !e.resetFlow.pending && !this.engine.state.combat.active && !this.engine.state.combat.encounter && (e.expeditionPage = "result", e.statusPage = null, e.inventoryOpen = !1, e.selected = 5), this.view.update(this.engine, {
      battleSelected: this.battleNavigation.actionIndex,
      encounterChoice: this.battleNavigation.encounterChoice,
      expeditionPage: e.expeditionPage,
      zoneIndex: e.zoneIndex,
      inventoryOpen: e.inventoryOpen,
      itemIndex: e.itemIndex,
      itemConfirm: e.itemConfirm,
      selected: e.selected,
      statusPage: e.statusPage,
      logOffset: e.logOffset,
      settingIndex: e.settingIndex,
      resetFlow: e.resetFlow,
      paused: !this.running,
      saveAvailable: this.persistence.available
    }), this.observer.observe(this.engine.state, (a) => this.emit(a));
    const i = this.getStateSummary(), s = JSON.stringify(i);
    s !== this.summaryKey && (this.summaryKey = s, this.emit({ type: "game-state-change", payload: i }));
    try {
      this.options.onStateChange?.(this.getState());
    } catch (a) {
      this.reportError("host-callback", a);
    }
  }
}
const z = /* @__PURE__ */ new WeakMap();
function Mt(t = {}) {
  return new $t(void 0, t);
}
export {
  Ot as FORGE_BEAST_METADATA,
  $t as ForgeBeastGame,
  Pt as SAVE_VERSION,
  v as TIMING,
  Mt as createForgeBeast,
  Nt as readForgeBeastSummary
};
