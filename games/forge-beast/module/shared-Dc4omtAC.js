const x = {
  hatch: 45,
  evolution: 240,
  tickMs: 250,
  hungerDecay: 0.16,
  energyDecay: 0.08,
  moodDecay: 0.1,
  sleepRecovery: 1.4,
  mistakeInterval: 25,
  actionCooldown: 1.5,
  feedbackDuration: 3
}, j = 2, le = "forge-arcade:forge-beast:v1", ce = ["attack", "guard", "skill", "run"];
function q() {
  return { encounter: null, active: null, result: null, statistics: { started: 0, wins: 0, losses: 0, escapes: 0, declined: 0 }, discoveries: {}, history: [] };
}
const I = ["snack", "energy-berry", "training-chip", "toy", "medicine", "strange-fragment"], de = {
  snack: { name: "Snack", description: "A little bite for a hungry belly.", effects: { hunger: 20 }, consumable: !0, reaction: "feed", message: "{name} enjoyed a trail snack." },
  "energy-berry": { name: "Energy Berry", description: "A bright berry to restore energy.", effects: { energy: 22 }, consumable: !0, reaction: "happy", message: "{name} perked up with an Energy Berry." },
  "training-chip": { name: "Training Chip", description: "A tiny pattern for a new exercise.", effects: { training: 6, discipline: 3 }, consumable: !0, reaction: "train", message: "{name} learned a trick from a Training Chip." },
  toy: { name: "Toy", description: "A springy trinket. A happy moment.", effects: { mood: 22 }, consumable: !0, reaction: "play", message: "{name} bounced a Toy with a little grin." },
  medicine: { name: "Medicine", description: "Gentle care for a poorly beast.", effects: { health: 25 }, consumable: !0, reaction: "happy", message: "{name} feels better after Medicine." },
  "strange-fragment": { name: "Strange Fragment", description: "Warm in your palm. What could it mean?", effects: {}, consumable: !1, reaction: "excited", message: "{name} studied a Strange Fragment. A quiet glow…" }
}, ee = 99;
function te() {
  return {
    active: null,
    result: null,
    inventory: Object.fromEntries(I.map((e) => [e, 0])),
    discoveries: [],
    statistics: { started: 0, completed: 0, rare: 0, failed: 0, zones: { greenfield: 0, "scrap-yard": 0, "dark-grove": 0 } }
  };
}
const H = {
  "cinder-egg": { name: "Cinder egg", type: "Unhatched", description: "A warm little shell. Something inside is finding its spark." },
  pipkin: { name: "Pipkin", type: "Baby", description: "A curious little spark with oversized ears and a lot to learn." },
  cragox: { name: "Cragox", type: "Brute", description: "A steadfast stonehorn. Every small effort built something strong." },
  zephlet: { name: "Zephlet", type: "Agile", description: "Quick feet, bright eyes. A restless little wind with a playful heart." },
  runewisp: { name: "Runewisp", type: "Mystic", description: "A quiet keeper of emberlight. Trust has a magic all its own." },
  bramblejaw: { name: "Bramblejaw", type: "Wild", description: "An untamed thicket spirit. There is beauty in the unexpected." }
};
function W(e = Date.now()) {
  return {
    version: j,
    species: "cinder-egg",
    stage: "egg",
    age: 0,
    stageAge: 0,
    stats: { hunger: 78, energy: 85, mood: 75, training: 0, discipline: 55, health: 100 },
    development: {
      careMistakes: 0,
      overfeeding: 0,
      trainingSessions: 0,
      missedSleep: 0,
      successfulInteractions: 0,
      neglectTime: 0,
      playSessions: 0,
      consistencyTime: 0,
      lastMistakeAge: 0,
      ignoredHunger: 0,
      exhaustedTraining: 0,
      neglectedMood: 0
    },
    sleeping: !1,
    muted: !1,
    hapticsEnabled: !1,
    createdAt: e,
    savedAt: e,
    lastActionAge: -100,
    careHistory: [],
    personality: null,
    eventHistory: [],
    exploration: te(),
    combat: q(),
    life: {
      nextEventAge: 0,
      cooldowns: {},
      sleepStartedAge: null,
      sleepUntilAge: 0,
      lastInteractionAge: 0,
      needTimers: { hunger: 0, energy: 0, mood: 0 }
    }
  };
}
function ge(e) {
  if (e === void 0)
    try {
      return typeof window > "u" ? null : window.localStorage;
    } catch {
      return null;
    }
  return e === null || "getItem" in e ? e : {
    getItem: (t) => e.get(t),
    setItem: (t, n) => e.set(t, n),
    removeItem: (t) => e.remove(t)
  };
}
const ue = (e) => Math.max(0, Math.min(100, e));
function N(e, t) {
  for (const n of Object.keys(t)) {
    const a = t[n];
    a !== void 0 && Number.isFinite(a) && (e.stats[n] = ue(e.stats[n] + a));
  }
}
const D = ["bold", "calm", "curious", "stubborn", "playful"], pe = {
  bold: {
    name: "Bold",
    decay: { hunger: 1.15, energy: 1.1, mood: 0.95, discipline: 0.8 },
    trainingMood: 5,
    trainingEnergy: 11,
    playMood: 17,
    playEnergy: 8,
    sleepRecovery: 1.05,
    refusalChance: 0.15,
    eventChance: 0.5,
    eventWeights: { excited: 2, restless: 1.5 },
    affinity: "brute",
    trainText: "Little steps. Ready for the next challenge!",
    playText: "A daring little leap. Again!",
    sleepText: "One last stretch, then dreams…"
  },
  calm: {
    name: "Calm",
    decay: { hunger: 0.9, energy: 0.85, mood: 0.75, discipline: 0.8 },
    trainingMood: 2,
    trainingEnergy: 10,
    playMood: 16,
    playEnergy: 6,
    sleepRecovery: 1.1,
    refusalChance: 0.1,
    eventChance: 0.35,
    eventWeights: { oversleeps: 3, "wakes-early": 0.25 },
    affinity: "mystic",
    trainText: "Little steps. Quietly getting stronger.",
    playText: "A gentle game. A contented chirp.",
    sleepText: "Settling into a cozy little dream…"
  },
  curious: {
    name: "Curious",
    decay: { hunger: 1.05, energy: 1.05, mood: 1.1, discipline: 1 },
    trainingMood: 3,
    trainingEnergy: 12,
    playMood: 19,
    playEnergy: 7,
    sleepRecovery: 1,
    refusalChance: 0.2,
    eventChance: 0.55,
    eventWeights: { "found-object": 3, restless: 1.5 },
    affinity: "agile",
    trainText: "Little steps. Trying a new little trick!",
    playText: "What happens if…? A happy discovery!",
    sleepText: "Dreaming up the next discovery…"
  },
  stubborn: {
    name: "Stubborn",
    decay: { hunger: 1, energy: 1, mood: 1.15, discipline: 1.2 },
    trainingMood: 1,
    trainingEnergy: 12,
    playMood: 16,
    playEnergy: 7,
    sleepRecovery: 0.9,
    refusalChance: 0.7,
    eventChance: 0.45,
    eventWeights: { restless: 2, "wakes-early": 2 },
    affinity: "wild",
    trainText: "Little steps. On their own terms.",
    playText: "Pretending not to enjoy it. A tiny grin.",
    sleepText: "Not sleepy… just resting those eyes."
  },
  playful: {
    name: "Playful",
    decay: { hunger: 1.1, energy: 1.15, mood: 1.2, discipline: 1.1 },
    trainingMood: 3,
    trainingEnergy: 12,
    playMood: 23,
    playEnergy: 8,
    sleepRecovery: 1,
    refusalChance: 0.25,
    eventChance: 0.6,
    eventWeights: { excited: 3, lonely: 1.5 },
    affinity: "agile",
    trainText: "Little steps. Turning practice into a game!",
    playText: "A little play. A whole lot of happy hops!",
    sleepText: "Even little whirlwinds need a nap…"
  }
};
function f(e) {
  const t = e();
  return Number.isFinite(t) ? Math.max(0, Math.min(0.999999, t)) : 0.5;
}
function J(e, t = Math.random) {
  return e.stage === "egg" ? null : (e.personality || (e.personality = D[Math.floor(f(t) * D.length)]), e.personality);
}
function me(e) {
  return pe[e.personality ?? "calm"];
}
const ne = 24;
function ae(e, t, n, a) {
  e.eventHistory.push({
    eventId: t,
    kind: n,
    message: a.replace("{name}", H[e.species].name),
    age: e.age,
    timestamp: Date.now()
  }), e.eventHistory = e.eventHistory.slice(-ne);
}
const ye = {
  ignoredHunger: "{name} waited too long for food.",
  overfeeding: "{name} had more than their belly wanted.",
  exhaustedTraining: "{name} was pushed to train while exhausted.",
  missedSleep: "{name} needed rest for too long.",
  neglectedMood: "{name} felt forgotten for a while."
};
function fe(e, t) {
  e.development[t]++, e.development.careMistakes++, e.development.lastMistakeAge = e.age, ae(e, t, "care", ye[t]);
}
function Ue(e, t) {
  if (e.stage === "egg") return;
  const n = me(e);
  N(e, {
    hunger: -x.hungerDecay * n.decay.hunger * t,
    energy: (e.sleeping ? x.sleepRecovery * n.sleepRecovery : -x.energyDecay * n.decay.energy) * t,
    mood: -x.moodDecay * n.decay.mood * t * (e.sleeping ? 0.3 : 1),
    discipline: -0.025 * n.decay.discipline * t
  });
  const a = {
    hunger: e.stats.hunger < 25,
    energy: e.stats.energy < 20 && !e.sleeping,
    mood: e.stats.mood < 25
  }, r = { hunger: "ignoredHunger", energy: "missedSleep", mood: "neglectedMood" };
  for (const i of ["hunger", "energy", "mood"])
    for (e.life.needTimers[i] = a[i] ? e.life.needTimers[i] + t : 0; e.life.needTimers[i] >= x.mistakeInterval; )
      e.life.needTimers[i] -= x.mistakeInterval, fe(e, r[i]);
  Object.values(a).some(Boolean) ? (e.development.neglectTime += t, N(e, { health: -0.2 * t })) : (e.development.consistencyTime += t, e.stats.hunger > 40 && e.stats.mood > 40 && (e.sleeping || e.stats.energy > 40) && N(e, { health: 0.12 * t }));
}
function he(e) {
  return e.stage === "egg" ? null : e.stats.health < 35 ? e.sleeping ? "Rest, food and company help healing." : "Feeling poorly. Gentle care and rest?" : e.sleeping ? null : e.stats.hunger < 35 ? "A little snack, please?" : e.stats.energy < 30 ? "Time for a little rest." : e.stats.mood < 35 ? "Could use some company." : e.stats.discipline < 30 ? "Feeling restless. A gentle routine?" : e.stage === "baby" && e.stats.training < 15 && e.stageAge > 65 ? "Ready to try something new!" : null;
}
const C = (e, t) => t[e < 35 ? 0 : e < 70 ? 1 : 2];
function be(e, t) {
  return Object.freeze({
    gameId: "forge-beast",
    displayName: "Forge Beast",
    hasSave: t,
    creatureName: e ? H[e.species].name : null,
    species: e?.species ?? null,
    lifeStage: e?.stage ?? null,
    hungerState: e ? C(e.stats.hunger, ["Hungry", "Peckish", "Content"]) : "Unknown",
    moodState: e ? C(e.stats.mood, ["Lonely", "Okay", "Happy"]) : "Unknown",
    energyState: e ? C(e.stats.energy, ["Spent", "Sleepy", "Ready"]) : "Unknown",
    healthState: e ? C(e.stats.health, ["Poorly", "Worn", "Well"]) : "Unknown",
    sleeping: e?.sleeping ?? !1,
    attentionNeeded: e ? !!he(e) : !1,
    activeExpedition: !!e?.exploration.active,
    activeBattle: e?.combat.active?.status === "ongoing",
    pendingEncounter: !!e?.combat.encounter,
    lastPlayedAt: t ? e?.savedAt ?? null : null
  });
}
const s = {
  damageScale: 1.1,
  defenseScale: 0.55,
  minDamage: 3,
  maxHitFraction: 0.4,
  variance: 0.06,
  criticalChance: 0.06,
  criticalMultiplier: 1.35,
  guardReduction: 0.55,
  guardRecovery: 3,
  skillCost: 5,
  pressureDrain: 2,
  escapeBase: 0.65,
  escapeSpeed: 0.02,
  escapeMin: 0.4,
  escapeMax: 0.95,
  escapeRetry: 0.1,
  minHealth: 20,
  minEnergy: 12,
  minHunger: 10,
  historyLimit: 24,
  trainingAttack: 0.03,
  sessionsAttack: 0.1,
  maxSessionBonus: 2,
  healthHPBase: 0.78,
  healthHPScale: 0.22,
  energyAttackBase: 0.84,
  energyAttackScale: 0.16,
  energyStaminaBase: 0.5,
  energyStaminaScale: 0.5,
  hungryPenalty: 0.85,
  hungryThreshold: 20,
  moodBase: 0.95,
  moodScale: 0.1,
  playfulMoodBase: 0.9,
  playfulMoodScale: 0.2,
  babyEnemyHP: 0.84,
  babyEnemyAttack: 0.9,
  rareEnemyBoost: 1.08,
  enemySkillPower: 1.25,
  maxTurns: 16,
  lowHPThreshold: 0.35,
  unpredictableBoost: 1.08,
  fastEvasion: 0.03,
  escapeHPBonus: 0.05,
  curiousPower: 0.08,
  victory: { training: 4, mood: 5, energy: -5 },
  defeat: { health: -8, energy: -10, mood: -5 },
  escape: { energy: -3 },
  rewardRareBonus: 0.15,
  beatSeconds: { entry: 0.65, attack: 0.4, guard: 0.55, skill: 0.55, hit: 0.4, critical: 0.55, dodge: 0.5, victory: 0.9, defeat: 0.9, escape: 0.75 }
}, ke = {
  pipkin: { hp: 34, attack: 8, defense: 3, speed: 8, stamina: 12 },
  cragox: { hp: 44, attack: 11, defense: 6, speed: 7, stamina: 16 },
  zephlet: { hp: 38, attack: 10, defense: 4, speed: 13, stamina: 16 },
  runewisp: { hp: 40, attack: 9, defense: 6, speed: 9, stamina: 18 },
  bramblejaw: { hp: 42, attack: 11, defense: 4, speed: 10, stamina: 16 }
}, F = {
  bold: { attack: 1.06, speed: 1, guard: 0, evasion: 0, escape: 0, resistance: 1, skillSpark: 0, unpredictable: 0, lowHP: 1.08 },
  calm: { attack: 1, speed: 1, guard: 0.08, evasion: 0, escape: 0.03, resistance: 1, skillSpark: 0, unpredictable: 0, lowHP: 1 },
  curious: { attack: 1, speed: 1, guard: 0, evasion: 0, escape: 0.02, resistance: 1, skillSpark: 0.18, unpredictable: 0, lowHP: 1 },
  stubborn: { attack: 1, speed: 1, guard: 0, evasion: 0, escape: -0.02, resistance: 0.5, skillSpark: 0, unpredictable: 0.12, lowHP: 1 },
  playful: { attack: 1, speed: 1.08, guard: 0, evasion: 0.04, escape: 0.05, resistance: 1, skillSpark: 0, unpredictable: 0, lowHP: 1 }
};
function ve(e) {
  return e.beats.reduce((t, n) => t + s.beatSeconds[n.animation], 0);
}
function Ve(e, t) {
  let n = Math.max(0, t - e.beatStartedAge);
  for (let a = 0; a < e.beats.length; a++) {
    const r = e.beats[a];
    if (n < s.beatSeconds[r.animation]) return { beat: r, index: a };
    n -= s.beatSeconds[r.animation];
  }
  return null;
}
function Se(e, t) {
  return e.status === "ongoing" && t - e.beatStartedAge >= ve(e);
}
const O = ["flinthop", "tinspindle", "gloamfin", "thornmote"], B = {
  flinthop: {
    name: "Flinthop",
    hp: 32,
    attack: 8,
    defense: 3,
    speed: 7,
    stamina: 12,
    behavior: "aggressive",
    rewardChance: 0.75,
    rewards: [{ item: "snack", weight: 3 }, { item: "energy-berry", weight: 1 }],
    pixels: ["....11....11....", "...1221..1221...", "....12211221....", "...1222222221...", "..122122122221..", "..122222222221..", "...1221112221...", "....12222221....", "..112211112211..", ".1221......1221.", "1111........1111"]
  },
  tinspindle: {
    name: "Tinspindle",
    hp: 36,
    attack: 8,
    defense: 5,
    speed: 6,
    stamina: 14,
    behavior: "defensive",
    rewardChance: 0.8,
    rewards: [{ item: "training-chip", weight: 3 }, { item: "medicine", weight: 2 }],
    pixels: ["......11......", "...11122111...", "..1222222221..", ".122112211221.", "11222222222211", ".122211112221.", "..1222222221..", "...11122111...", "..11..11..11..", ".11...11...11."]
  },
  gloamfin: {
    name: "Gloamfin",
    hp: 30,
    attack: 9,
    defense: 3,
    speed: 12,
    stamina: 14,
    behavior: "fast",
    rewardChance: 0.75,
    rewards: [{ item: "toy", weight: 3 }, { item: "energy-berry", weight: 2 }],
    pixels: [".......11.......", "......1221......", "...1112222111...", "..122222222221..", ".12221122211221.", "1222222222222221", ".11222211222211.", "...1122222211...", ".....122221.....", "....11.11.11....", "...11......11..."]
  },
  thornmote: {
    name: "Thornmote",
    hp: 34,
    attack: 9,
    defense: 4,
    speed: 9,
    stamina: 14,
    behavior: "unpredictable",
    rewardChance: 0.85,
    rewards: [{ item: "medicine", weight: 2 }, { item: "training-chip", weight: 2 }, { item: "strange-fragment", weight: 1 }],
    pixels: ["..1....11....1..", "..11..1221..11..", "...1112222111...", "..122222222221..", "1122112222112211", ".12222211222221.", "..122222222221..", "...1112222111...", "...1..1221..1...", "......1111......"]
  }
}, Ae = {
  aggressive: { attack: 7, guard: 1, skill: 2 },
  defensive: { attack: 5, guard: 2, skill: 2 },
  fast: { attack: 6, guard: 1, skill: 3 },
  unpredictable: { attack: 4, guard: 3, skill: 3 }
}, _ = { lowHP: 0.4, defensiveGuardBonus: 5, emptyStaminaGuardBonus: 4 }, ie = {
  pipkin: { name: "Spark Tap", cost: 3, power: 1.15, priority: 0, shield: 0, dodge: 0, description: "A tiny spark. A brave first trick." },
  cragox: { name: "Crag Crash", cost: 6, power: 1.55, priority: 0, shield: 0, dodge: 0, description: "A heavy stomp against the trail." },
  zephlet: { name: "Windskip", cost: 5, power: 1.3, priority: 3, shield: 0, dodge: 0.18, description: "A swift strike and a nimble step." },
  runewisp: { name: "Rune Veil", cost: 5, power: 1.3, priority: 0, shield: 0.3, dodge: 0, description: "A bright pulse; a veil softens one hit." },
  bramblejaw: { name: "Briar Burst", cost: 5, power: 1.15, powerRange: 0.5, priority: 0, shield: 0, dodge: 0, description: "An untamed burst of thicket sparks." }
}, M = ["greenfield", "scrap-yard", "dark-grove"], we = ["common-item", "food", "joy", "training", "fatigue", "injury", "rare-item", "unusual", "wild-encounter", "rare-encounter", "optional-battle", "hostile-encounter", "nothing"], Ye = {
  greenfield: { name: "Greenfield", risk: "Low risk", energy: 8, duration: 20, hunger: 3, description: "Soft paths. Simple little finds.", weights: { "common-item": 20, food: 35, joy: 20, training: 8, fatigue: 5, injury: 0, "rare-item": 1, unusual: 2, "wild-encounter": 12, "rare-encounter": 1, "optional-battle": 6, "hostile-encounter": 1, nothing: 9 } },
  "scrap-yard": { name: "Scrap Yard", risk: "Medium risk", energy: 16, duration: 30, hunger: 5, description: "Old machines. Useful surprises.", weights: { "common-item": 32, food: 12, joy: 10, training: 20, fatigue: 8, injury: 6, "rare-item": 3, unusual: 4, "wild-encounter": 14, "rare-encounter": 3, "optional-battle": 8, "hostile-encounter": 5, nothing: 5 } },
  "dark-grove": { name: "Dark Grove", risk: "Higher risk", energy: 25, duration: 40, hunger: 8, description: "Deep shade. Strange little sparks.", weights: { "common-item": 10, food: 8, joy: 7, training: 10, fatigue: 17, injury: 12, "rare-item": 12, unusual: 18, "wild-encounter": 10, "rare-encounter": 8, "optional-battle": 6, "hostile-encounter": 10, nothing: 6 } }
}, xe = {
  "common-item": { message: "{name} spotted something useful.", effects: { mood: 4 }, items: ["toy", "training-chip", "medicine"] },
  food: { message: "{name} found a treat for later.", effects: { mood: 3 }, items: ["snack", "energy-berry"] },
  joy: { message: "{name} chased sunflecks. A happy little outing!", effects: { mood: 14 } },
  training: { message: "{name} mastered a tricky path.", effects: { training: 7, discipline: 3, mood: 3 } },
  fatigue: { message: "{name} returned tired. A little rest?", effects: { energy: -10, mood: -2 }, failed: !0 },
  injury: { message: "{name} got a small scrape. Gentle care helps.", effects: { health: -10, energy: -5, mood: -4 }, failed: !0 },
  "rare-item": { message: "{name} found a softly glowing fragment!", effects: { mood: 8 }, items: ["strange-fragment"], rare: !0 },
  unusual: { message: "Something strange happened around {name}. The leaves hummed!", effects: { mood: 10, training: 3 }, unusual: !0 },
  "wild-encounter": { message: "{name} met a wild creature on the trail.", effects: {} },
  "rare-encounter": { message: "{name} noticed a rare wild spark.", effects: {}, rare: !0 },
  "optional-battle": { message: "A curious wild creature invited {name} to spar.", effects: {} },
  "hostile-encounter": { message: "A restless wild creature crossed {name}’s path.", effects: {} },
  nothing: { message: "{name} found nothing this time. Every path has a story.", effects: { mood: 1 } }
}, Je = {
  bold: { energy: 1, mood: 1, riskySuccess: 1.35, riskyFailure: 0.55, discovery: 1, detourChance: 0 },
  calm: { energy: 0.75, mood: 1, riskySuccess: 1, riskyFailure: 1, discovery: 1, detourChance: 0 },
  curious: { energy: 1, mood: 1, riskySuccess: 1, riskyFailure: 1, discovery: 2, detourChance: 0 },
  stubborn: { energy: 1, mood: 1, riskySuccess: 1, riskyFailure: 1, discovery: 1, detourChance: 0.22 },
  playful: { energy: 1, mood: 1.5, riskySuccess: 1, riskyFailure: 1, discovery: 1, detourChance: 0 }
}, Te = { history: 24, minHealth: 35, minHunger: 25, energyReserve: 10 };
function V(e) {
  return I.includes(e);
}
function Ee(e, t, n) {
  return !V(t) || !Number.isFinite(n) ? !1 : (e.exploration.inventory[t] = Math.max(0, Math.min(ee, Math.floor(n))), !0);
}
function Me(e, t, n = 1) {
  if (!V(t) || !Number.isInteger(n) || n < 1) return 0;
  const a = e.exploration.inventory[t];
  return Ee(e, t, a + n), e.exploration.inventory[t] - a;
}
function Ke(e, t, n = 1) {
  return !V(t) || !Number.isInteger(n) || n < 1 || e.exploration.inventory[t] < n ? !1 : (e.exploration.inventory[t] -= n, !0);
}
const K = (e) => e.sleeping && e.life.sleepStartedAge !== null ? e.age - e.life.sleepStartedAge : 0, Ie = [
  {
    id: "refuses-training",
    label: "Refuses training",
    trigger: "training",
    weight: 1,
    cooldown: 30,
    eligible: (e) => !e.sleeping && (e.stats.discipline < 40 || e.stats.mood < 35),
    effects: { mood: -2 },
    behavior: "upset",
    text: "{name} refused training. Some company first?"
  },
  {
    id: "asks-food",
    label: "Asks for food",
    trigger: "ambient",
    weight: 3,
    cooldown: 45,
    eligible: (e) => !e.sleeping && e.stats.hunger < 55,
    effects: {},
    behavior: "hungry",
    text: "{name} asked for an emberberry."
  },
  {
    id: "wakes-early",
    label: "Wakes early",
    trigger: "ambient",
    weight: 1,
    cooldown: 75,
    eligible: (e) => K(e) >= 15 && e.stats.energy >= 45 && e.stats.energy < 92,
    effects: { mood: 3 },
    behavior: "tired",
    sleep: "wake",
    text: "{name} woke early to watch the little lights."
  },
  {
    id: "oversleeps",
    label: "Oversleeps",
    trigger: "ambient",
    weight: 1,
    cooldown: 90,
    eligible: (e) => K(e) >= 20 && e.stats.energy >= 80,
    effects: { hunger: -3, mood: 2 },
    behavior: "sleep",
    sleep: "extend",
    text: "{name} slept in. One more tiny dream."
  },
  {
    id: "excited",
    label: "Becomes excited",
    trigger: "ambient",
    weight: 2,
    cooldown: 50,
    eligible: (e) => !e.sleeping && e.stats.mood >= 55 && e.stats.energy >= 35 && e.stats.health >= 35,
    effects: { mood: 6, energy: -2 },
    behavior: "excited",
    text: "{name} burst into a little victory dance."
  },
  {
    id: "found-object",
    label: "Finds a shiny pebble",
    trigger: "ambient",
    weight: 1,
    cooldown: 90,
    eligible: (e) => !e.sleeping && e.stats.energy >= 35 && e.stats.health >= 35,
    effects: { mood: 7 },
    behavior: "excited",
    text: "{name} found a shiny pebble, then left it for the stars."
  },
  {
    id: "lonely",
    label: "Feels lonely",
    trigger: "ambient",
    weight: 2,
    cooldown: 60,
    eligible: (e) => !e.sleeping && e.stats.mood < 65 && e.age - e.life.lastInteractionAge >= 35,
    effects: { mood: -4 },
    behavior: "upset",
    text: "{name} looked around for a familiar friend."
  },
  {
    id: "restless",
    label: "Becomes restless",
    trigger: "ambient",
    weight: 1,
    cooldown: 60,
    eligible: (e) => !e.sleeping && e.stats.energy >= 40 && (e.stats.discipline < 45 || e.age - e.life.lastInteractionAge >= 60),
    effects: { mood: -2, discipline: -2 },
    behavior: "restless",
    text: "{name} paced in circles. Time for something new?"
  }
], Be = { minInterval: 18, intervalJitter: 12, initialDelay: 15, minimumSleep: 20, extraSleep: 20 };
function He(e) {
  if (e.stage === "egg" || e.species === "cinder-egg") return null;
  const t = ke[e.species], n = F[e.personality ?? "calm"], a = Math.round(t.hp * (s.healthHPBase + s.healthHPScale * e.stats.health / 100)), r = Math.round(t.stamina * (s.energyStaminaBase + s.energyStaminaScale * e.stats.energy / 100)), i = e.personality === "playful" ? s.playfulMoodBase + s.playfulMoodScale * e.stats.mood / 100 : s.moodBase + s.moodScale * e.stats.mood / 100, o = s.energyAttackBase + s.energyAttackScale * e.stats.energy / 100, l = e.stats.hunger < s.hungryThreshold ? s.hungryPenalty : 1, d = e.stats.training * s.trainingAttack + Math.min(s.maxSessionBonus, e.development.trainingSessions * s.sessionsAttack);
  return {
    hp: a,
    maxHP: a,
    attack: (t.attack + d) * o * i * l * n.attack,
    defense: t.defense * (s.healthHPBase + s.healthHPScale * e.stats.health / 100),
    speed: t.speed * n.speed,
    stamina: r,
    maxStamina: r,
    shield: 0,
    dodgeBoost: 0
  };
}
function Pe(e, t, n) {
  const a = B[e], r = n ? s.rareEnemyBoost : 1, i = Math.round(a.hp * r * (t === "baby" ? s.babyEnemyHP : 1));
  return {
    hp: i,
    maxHP: i,
    attack: a.attack * r * (t === "baby" ? s.babyEnemyAttack : 1),
    defense: a.defense,
    speed: a.speed,
    stamina: a.stamina,
    maxStamina: a.stamina,
    shield: 0,
    dodgeBoost: 0
  };
}
function Re(e, t) {
  const n = B[e.opponent].behavior, a = { ...Ae[n] };
  e.enemy.stamina < s.skillCost && (a.skill = 0, a.guard += _.emptyStaminaGuardBonus), n === "defensive" && e.enemy.hp / e.enemy.maxHP < _.lowHP && (a.guard += _.defensiveGuardBonus);
  let r = f(t) * (a.attack + a.guard + a.skill);
  for (const i of ["attack", "guard", "skill"])
    if (r -= a[i], r < 0) return i;
  return "attack";
}
function Ce(e, t, n, a = {}) {
  const r = f(n) < (a.evasion ?? 0) + t.dodgeBoost;
  if (t.dodgeBoost = 0, r) return { damage: 0, critical: !1, dodged: !0 };
  const i = a.critical ?? f(n) < s.criticalChance, o = 1 - s.variance + f(n) * s.variance * 2, l = e.attack * (a.attackBoost ?? 1) * s.damageScale * (a.power ?? 1) - t.defense * s.defenseScale, d = 1 - (a.guard ?? 0), m = 1 - t.shield;
  return t.shield = 0, { damage: Math.max(1, Math.min(Math.floor(t.maxHP * s.maxHitFraction), Math.round(Math.max(s.minDamage, l) * o * (i ? s.criticalMultiplier : 1) * d * m))), critical: i, dodged: !1 };
}
function Oe(e, t) {
  const n = ie[e.playerSpecies];
  if (e.player.stamina < n.cost) return null;
  e.player.stamina -= n.cost, e.player.shield = n.shield, e.player.dodgeBoost = n.dodge;
  const a = f(t) < F[e.personality].skillSpark;
  return a && (e.player.stamina = Math.min(e.player.maxStamina, e.player.stamina + 1)), { name: n.name, power: n.power + (n.powerRange ?? 0) * f(t) + (a ? s.curiousPower : 0), spark: a };
}
function Ne(e, t) {
  const n = B[e.opponent];
  if (f(t) > Math.min(1, n.rewardChance + (e.rare ? s.rewardRareBonus : 0))) return null;
  const a = [...n.rewards, ...e.rare ? [{ item: "strange-fragment", weight: 2 }] : []];
  let r = f(t) * a.reduce((i, o) => i + o.weight, 0);
  for (const i of a)
    if (r -= i.weight, r < 0) return i.item;
  return a[0].item;
}
function je(e, t, n, a) {
  const r = e.combat.statistics, i = { victory: s.victory, defeat: s.defeat, escape: s.escape };
  if (N(e, i[n]), n === "victory") {
    r.wins++;
    const g = e.combat.discoveries[t.opponent];
    g && g.defeated++;
  } else n === "defeat" ? r.losses++ : r.escapes++;
  const o = n === "victory" ? Ne(t, a) : null, l = !!o && Me(e, o) > 0, d = H[t.playerSpecies].name;
  let m = n === "victory" ? `Victory! ${d} learned a little.` : n === "defeat" ? `${d} needs rest. A setback, a new day.` : "Escaped safely. Back to little adventures.";
  o && (m += ` ${de[o].name}${l ? " tucked into Items." : " found; stack full."}`);
  const y = { opponent: t.opponent, playerSpecies: t.playerSpecies, rare: t.rare, outcome: n, turns: t.turn, startedAt: t.startedAt, endedAt: Date.now(), age: e.age, item: o, stored: l, message: m };
  return e.combat.result = y, e.combat.history.push(y), e.combat.history = e.combat.history.slice(-24), e.life.lastInteractionAge = e.age, ae(e, `battle:${n}`, "life", m), y;
}
function De(e) {
  return e.stage === "egg" ? "Hatch first. Battles can wait." : e.sleeping ? "Let your beast wake before battling." : e.combat.active || e.combat.result ? "Finish this encounter first." : e.exploration.active ? "Still exploring. Wait for the encounter." : e.combat.encounter ? e.stats.health < s.minHealth ? "Feeling poorly. Run safely and recover." : e.stats.energy < s.minEnergy ? "Too sleepy. Run safely and rest." : e.stats.hunger < s.minHunger ? "Too hungry. Run safely and find food." : null : "No wild creature here.";
}
function k(e, t, n, a) {
  e.beats.push({ actor: t, animation: n, text: a, playerHP: e.player.hp, enemyHP: e.enemy.hp, playerStamina: e.player.stamina, enemyStamina: e.enemy.stamina });
}
function Ze(e) {
  const t = De(e);
  if (t) return { success: !1, message: t };
  const n = e.combat.encounter, a = He(e), r = {
    opponent: n.opponent,
    playerSpecies: e.species,
    personality: e.personality ?? "calm",
    rare: n.rare,
    player: a,
    enemy: Pe(n.opponent, e.stage, n.rare),
    turn: 0,
    failedRuns: 0,
    startedAge: e.age,
    startedAt: Date.now(),
    status: "ongoing",
    beats: [],
    beatStartedAge: e.age
  };
  return k(r, "system", "entry", `${B[r.opponent].name} steps closer!`), e.combat.active = r, e.combat.encounter = null, e.combat.statistics.started++, { success: !0, message: "A little courage. A little care." };
}
function Fe(e) {
  const t = F[e.personality], n = s.escapeBase + (e.player.speed - e.enemy.speed) * s.escapeSpeed + t.escape + e.player.hp / e.player.maxHP * s.escapeHPBonus + e.failedRuns * s.escapeRetry;
  return Math.max(s.escapeMin, Math.min(s.escapeMax, n));
}
function z(e, t, n = Math.random) {
  const a = e.combat.active;
  return !a || a.status !== "ongoing" ? !1 : (a.status = t, t === "victory" && (a.enemy.hp = 0), t === "defeat" && (a.player.hp = 0), je(e, a, t, n), k(a, "player", t, t === "victory" ? "Victory!" : t === "defeat" ? "A little rest. You will be okay." : "Escaped safely."), !0);
}
function Qe(e, t, n = Math.random, a = {}) {
  const r = e.combat.active;
  if (!r || !ce.includes(t) || !Se(r, e.age)) return { success: !1, message: "One little moment…" };
  const i = ie[r.playerSpecies];
  if (t === "skill" && r.player.stamina < i.cost) return { success: !1, message: "Not enough stamina. Guard to recharge." };
  r.turn++, r.beats = [], r.beatStartedAge = e.age;
  const o = Re(r, n), l = F[r.personality], d = t === "skill" ? Oe(r, n) : null;
  if (t === "run") {
    if (a.escape ?? f(n) < Fe(r))
      return z(e, "escape", n), { success: !0, message: "Escaped safely." };
    r.failedRuns++, k(r, "player", "dodge", "Path blocked! Try again.");
  }
  const m = { player: t === "guard" ? s.guardReduction + l.guard : 0, enemy: o === "guard" ? s.guardReduction : 0 }, y = r.player.speed + (t === "skill" ? i.priority : 0) >= r.enemy.speed ? ["player", "enemy"] : ["enemy", "player"];
  for (const g of y) {
    if (r.status !== "ongoing") break;
    const P = g === "player" ? t : o;
    if (P === "run") continue;
    const v = r[g], A = g === "player" ? "enemy" : "player", w = r[A], R = g === "player" ? H[r.playerSpecies].name : B[r.opponent].name;
    if (P === "guard") {
      v.stamina = Math.min(v.maxStamina, v.stamina + s.guardRecovery), k(r, g, "guard", `${R} guarded. Stamina restored.`);
      continue;
    }
    let L = 1;
    if (P === "skill")
      if (g === "player") {
        const $ = d;
        L = $.power, k(r, g, "skill", `${R} used ${$.name}.${$.spark ? " A curious spark!" : ""}`);
      } else
        v.stamina -= s.skillCost, L = s.enemySkillPower, k(r, g, "skill", `${R} used Trail Pulse.`);
    else k(r, g, "attack", `${R} attacks!`);
    let Y = g === "player" && v.hp / v.maxHP < s.lowHPThreshold ? l.lowHP : 1;
    g === "player" && l.unpredictable > 0 && f(n) < l.unpredictable && (Y *= s.unpredictableBoost);
    const oe = A === "player" ? l.evasion : B[r.opponent].behavior === "fast" ? s.fastEvasion : 0, S = Ce(v, w, n, { power: L, guard: m[A], evasion: oe, attackBoost: Y, critical: g === "player" ? a.critical : void 0 });
    w.hp = Math.max(0, w.hp - S.damage), g === "enemy" && P === "skill" && !S.dodged && (w.stamina = Math.max(0, w.stamina - Math.ceil(s.pressureDrain * l.resistance))), k(r, A, S.dodged ? "dodge" : S.critical ? "critical" : "hit", S.dodged ? "Attack missed. A quick step!" : S.critical ? "Critical hit!" : `${S.damage} HP · ${m[A] ? "Guard softened the hit." : "A little impact."}`), w.hp === 0 && z(e, A === "enemy" ? "victory" : "defeat", n);
  }
  return r.status === "ongoing" && r.turn >= s.maxTurns && z(e, "escape", n), { success: !0, message: r.beats.at(-1)?.text ?? "Ready for the next turn." };
}
function Xe(e) {
  return e.combat.result ? (e.combat.active = null, e.combat.result = null, e.exploration.result = null, !0) : !1;
}
function Le(e) {
  e.combat.active && (e.combat.active.beats = [], e.combat.active.beatStartedAge = e.age);
}
const h = (e) => !!e && typeof e == "object" && !Array.isArray(e), u = (e) => typeof e == "number" && Number.isFinite(e) && e >= 0, T = (e) => u(e) && Number.isSafeInteger(e), Z = (e) => typeof e == "string" && e !== "cinder-egg" && Object.hasOwn(H, e), Q = (e) => h(e) && ["hp", "maxHP", "attack", "defense", "speed", "stamina", "maxStamina", "shield", "dodgeBoost"].every((t) => u(e[t])) && e.maxHP > 0 && e.maxHP <= 200 && e.hp <= e.maxHP && e.maxStamina > 0 && e.maxStamina <= 60 && e.stamina <= e.maxStamina && e.attack > 0 && e.attack <= 100 && e.defense <= 100 && e.speed <= 100 && e.shield <= 1 && e.dodgeBoost <= 1;
function $e(e) {
  const t = e.combat;
  if (!h(t) || !h(t.statistics) || !h(t.discoveries) || !Array.isArray(t.history) || t.history.length > s.historyLimit) return !1;
  const n = t.statistics;
  if (!["started", "wins", "losses", "escapes", "declined"].every((i) => T(n[i]))) return !1;
  const a = n.wins + n.losses + n.escapes;
  if (a > n.started || t.history.length > a || !Object.entries(t.discoveries).every(([i, o]) => O.includes(i) && h(o) && T(o.encountered) && T(o.defeated) && o.defeated <= o.encountered)) return !1;
  const r = (i) => h(i) && O.includes(i.opponent) && Z(i.playerSpecies) && typeof i.rare == "boolean" && ["victory", "defeat", "escape"].includes(i.outcome) && T(i.turns) && i.turns <= s.maxTurns && u(i.startedAt) && u(i.endedAt) && u(i.age) && i.age <= e.age && (i.item === null || I.includes(i.item)) && typeof i.stored == "boolean" && (!i.stored || i.item !== null) && typeof i.message == "string" && i.message.length <= 240;
  if (!t.history.every(r) || t.result !== null && !r(t.result)) return !1;
  if (t.encounter !== null) {
    const i = t.encounter;
    if (!h(i) || !O.includes(i.opponent) || typeof i.rare != "boolean" || typeof i.hostile != "boolean" || typeof i.optional != "boolean" || !(i.zone === null || M.includes(i.zone)) || !u(i.age) || i.age > e.age || !u(i.timestamp) || t.active !== null || t.result !== null || e.exploration.active || e.stage === "egg" || e.sleeping) return !1;
  }
  if (t.active !== null) {
    const i = t.active;
    if (!h(i) || !O.includes(i.opponent) || !Z(i.playerSpecies) || i.playerSpecies !== e.species || !D.includes(i.personality) || typeof i.rare != "boolean" || !Q(i.player) || !Q(i.enemy) || !T(i.turn) || i.turn > s.maxTurns || !T(i.failedRuns) || i.failedRuns > i.turn || !u(i.startedAge) || i.startedAge > e.age || !u(i.startedAt) || !u(i.beatStartedAge) || i.beatStartedAge > e.age || !["ongoing", "victory", "defeat", "escape"].includes(i.status) || e.stage === "egg" || e.sleeping || e.exploration.active || !Array.isArray(i.beats) || i.beats.length > 6 || !i.beats.every((o) => h(o) && ["player", "enemy", "system"].includes(o.actor) && Object.hasOwn(s.beatSeconds, o.animation) && typeof o.text == "string" && o.text.length <= 160 && u(o.playerHP) && o.playerHP <= i.player.maxHP && u(o.enemyHP) && o.enemyHP <= i.enemy.maxHP && u(o.playerStamina) && o.playerStamina <= i.player.maxStamina && u(o.enemyStamina) && o.enemyStamina <= i.enemy.maxStamina)) return !1;
    if (i.status === "ongoing") {
      if (i.player.hp <= 0 || i.enemy.hp <= 0 || t.result !== null || n.started !== a + 1) return !1;
    } else if (!t.result || t.result.outcome !== i.status || t.result.opponent !== i.opponent || n.started !== a || i.status === "victory" && i.enemy.hp !== 0 || i.status === "defeat" && i.player.hp !== 0) return !1;
  } else if (t.result !== null || n.started !== a) return !1;
  return !0;
}
const E = (e) => !!e && typeof e == "object" && !Array.isArray(e), b = (e) => typeof e == "number" && Number.isFinite(e) && e >= 0, G = (e) => b(e) && Number.isSafeInteger(e);
function _e(e) {
  const t = e.exploration;
  if (!E(t) || !E(t.inventory) || !E(t.statistics) || Object.keys(t.inventory).length !== I.length || !I.every((r) => G(t.inventory[r]) && t.inventory[r] <= ee)) return !1;
  const n = t.statistics;
  if (!["started", "completed", "rare", "failed"].every((r) => G(n[r])) || !E(n.zones) || !M.every((r) => G(n.zones[r])) || n.completed > n.started || n.rare > n.completed || n.failed > n.completed || M.reduce((r, i) => r + n.zones[i], 0) !== n.completed) return !1;
  const a = (r) => {
    if (!E(r) || !M.includes(r.zone) || !we.includes(r.outcome)) return !1;
    const i = xe[r.outcome];
    return b(r.startedAt) && b(r.returnedAt) && b(r.returnedAge) && r.returnedAge <= e.age && typeof r.message == "string" && r.message.length <= 240 && (r.item === null || I.includes(r.item) && !!i.items?.includes(r.item)) && typeof r.stored == "boolean" && (!r.stored || r.item !== null) && r.rare === !!i.rare && r.failed === !!i.failed;
  };
  if (!Array.isArray(t.discoveries) || t.discoveries.length > Te.history || t.discoveries.length > n.completed || !t.discoveries.every(a) || t.result !== null && (!a(t.result) || n.completed === 0)) return !1;
  if (t.active !== null) {
    const r = t.active;
    if (!E(r) || !M.includes(r.zone) || !M.includes(r.requestedZone) || !b(r.startedAge) || r.startedAge > e.age || !b(r.endsAge) || r.endsAge <= r.startedAge || !b(r.startedAt) || !b(r.energyCost) || r.energyCost > 100 || typeof r.detoured != "boolean" || e.stage === "egg" || e.sleeping || t.result !== null || n.started <= n.completed) return !1;
  }
  return !0;
}
const p = (e) => !!e && typeof e == "object" && !Array.isArray(e), c = (e) => typeof e == "number" && Number.isFinite(e) && e >= 0, re = (e) => c(e) && e <= 100, ze = ["hunger", "energy", "mood", "training"], Ge = ["careMistakes", "overfeeding", "trainingSessions", "missedSleep", "successfulInteractions", "neglectTime", "playSessions", "consistencyTime", "lastMistakeAge"];
function se(e) {
  if (!p(e)) return !1;
  const t = e;
  return typeof t.species == "string" && Object.hasOwn(H, t.species) && (t.stage === "egg" && t.species === "cinder-egg" || t.stage === "baby" && t.species === "pipkin" || t.stage === "evolved" && !["pipkin", "cinder-egg"].includes(t.species)) && c(t.age) && c(t.stageAge) && t.stageAge <= t.age && typeof t.sleeping == "boolean" && typeof t.muted == "boolean" && c(t.createdAt) && c(t.savedAt) && typeof t.lastActionAge == "number" && Number.isFinite(t.lastActionAge) && p(t.stats) && ze.every((n) => re(t.stats[n])) && p(t.development) && Ge.every((n) => c(t.development[n])) && Array.isArray(t.careHistory) && t.careHistory.length <= 100 && t.careHistory.every((n) => p(n) && typeof n.action == "string" && n.action.length < 80 && c(n.age));
}
function U(e) {
  if (!se(e) || e.version !== j || typeof e.hapticsEnabled != "boolean") return !1;
  const t = e, n = W();
  return _e(t) && $e(t) && Object.keys(n.stats).every((a) => re(t.stats[a])) && Object.keys(n.development).every((a) => c(t.development[a])) && (t.stage === "egg" ? t.personality === null : D.includes(t.personality)) && Array.isArray(t.eventHistory) && t.eventHistory.length <= ne && t.eventHistory.every((a) => p(a) && typeof a.eventId == "string" && a.eventId.length <= 80 && ["action", "life", "care", "lifecycle"].includes(a.kind) && typeof a.message == "string" && a.message.length <= 240 && c(a.age) && a.age <= t.age && c(a.timestamp)) && p(t.life) && c(t.life.nextEventAge) && c(t.life.sleepUntilAge) && c(t.life.lastInteractionAge) && (t.life.sleepStartedAge === null || c(t.life.sleepStartedAge) && t.life.sleepStartedAge <= t.age) && (!t.sleeping || t.life.sleepStartedAge !== null) && p(t.life.needTimers) && ["hunger", "energy", "mood"].every((a) => c(t.life.needTimers[a])) && p(t.life.cooldowns) && Object.entries(t.life.cooldowns).every(([a, r]) => Ie.some((i) => i.id === a) && c(r));
}
function X(e, t = Math.random) {
  if (p(e) && e.version === j) {
    const i = W(c(e.createdAt) ? e.createdAt : Date.now()), o = (m, y) => y === void 0 ? m : p(y) ? { ...m, ...y } : y, l = o(i.life, e.life), d = {
      ...e,
      hapticsEnabled: e.hapticsEnabled === void 0 ? !1 : e.hapticsEnabled,
      stats: o(i.stats, e.stats),
      development: o(i.development, e.development),
      careHistory: e.careHistory === void 0 ? [] : e.careHistory,
      eventHistory: e.eventHistory === void 0 ? [] : e.eventHistory,
      lastActionAge: e.lastActionAge === void 0 ? -100 : e.lastActionAge,
      savedAt: e.savedAt === void 0 ? e.createdAt : e.savedAt,
      exploration: e.exploration === void 0 ? te() : e.exploration,
      combat: e.combat === void 0 ? q() : e.combat,
      life: p(l) ? {
        ...l,
        needTimers: o(i.life.needTimers, l.needTimers)
      } : l,
      personality: e.personality === void 0 ? null : e.personality
    };
    return d.personality === null && e.personality === void 0 && e.stage !== "egg" && J(d, t), e.life === void 0 && p(d.life) && e.sleeping === !0 && (d.life.sleepStartedAge = e.age, d.life.lastInteractionAge = e.age), U(d) ? structuredClone(d) : null;
  }
  if (!se(e) || e.version !== 1) return null;
  const n = e, a = W(n.createdAt), r = {
    ...a,
    ...structuredClone(n),
    version: j,
    stats: { ...a.stats, ...n.stats },
    development: { ...a.development, ...n.development },
    personality: null,
    eventHistory: [],
    life: {
      ...a.life,
      nextEventAge: n.age + Be.initialDelay,
      sleepStartedAge: n.sleeping ? n.age : null,
      lastInteractionAge: n.age
    }
  };
  return J(r, t), U(r) ? r : null;
}
class We {
  constructor(t, n = le, a = Math.random) {
    this.storage = t, this.key = n, this.random = a, this.available = !!t;
  }
  available = !0;
  hasSave = !1;
  loadStatus = "empty";
  error = null;
  protectedRaw = null;
  pendingLegacyBackup = null;
  load() {
    this.error = null, this.hasSave = !1, this.protectedRaw = null, this.loadStatus = "empty";
    let t;
    try {
      t = this.storage?.getItem(this.key) ?? null;
    } catch {
      return this.available = !1, this.loadStatus = "unavailable", this.error = "Storage could not be read.", null;
    }
    if (!t) return null;
    let n = null;
    try {
      const a = JSON.parse(t);
      n = X(a, this.random), n && p(a) && a.version === 1 && (this.pendingLegacyBackup = t);
    } catch {
    }
    if (n)
      this.loadStatus = "loaded";
    else {
      this.protectedRaw = t, this.available = !1, this.loadStatus = "invalid", this.error = "Saved data could not be loaded. It is preserved; reset explicitly to start again.";
      try {
        const a = this.storage?.getItem(`${this.key}:backup:v1`);
        a && (n = X(JSON.parse(a), this.random));
      } catch {
      }
      if (!n) return null;
      this.loadStatus = "recovered";
    }
    return this.hasSave = !0, Le(n), n;
  }
  save(t, n = {}) {
    try {
      if (!U(t)) throw new Error("Refusing to write an invalid game state.");
      if (!this.storage) throw new Error("No storage");
      if (this.protectedRaw !== null) {
        if (!n.replaceInvalid) throw new Error("Original save is protected. Reset explicitly to replace it.");
        this.storage.setItem(`${this.key}:backup:invalid`, this.protectedRaw);
      }
      this.pendingLegacyBackup !== null && (this.storage.getItem(`${this.key}:backup:v1`) || this.storage.setItem(`${this.key}:backup:v1`, this.pendingLegacyBackup));
      const a = Date.now();
      return this.storage.setItem(this.key, JSON.stringify({ ...t, savedAt: a })), t.savedAt = a, this.pendingLegacyBackup = null, this.protectedRaw = null, this.available = !0, this.hasSave = !0, this.error = null, !0;
    } catch (a) {
      return this.available = !1, this.error = a instanceof Error ? a.message : "Save failed.", !1;
    }
  }
  get enabled() {
    return this.storage !== null;
  }
  clearResetBackup() {
    this.pendingLegacyBackup = null;
    try {
      this.storage?.removeItem(`${this.key}:backup:v1`);
    } catch {
    }
  }
  reset() {
    this.pendingLegacyBackup = null, this.protectedRaw = null, this.hasSave = !1;
    try {
      this.storage?.removeItem(this.key), this.storage?.removeItem(`${this.key}:backup:v1`);
    } catch {
      this.available = !1;
    }
  }
  dispose() {
    this.storage = null, this.pendingLegacyBackup = null, this.protectedRaw = null;
  }
}
const qe = Object.freeze({
  id: "forge-beast",
  title: "Forge Beast",
  version: "0.5.1",
  orientation: "portrait",
  category: "virtual-pet",
  supportsPause: !0,
  supportsPersistentSave: !0,
  description: "Raise a little spark, explore, and meet wild beasts.",
  minimumViewport: Object.freeze({ width: 280, height: 480 }),
  preferredAspectRatio: "320 / 568"
});
function et(e = {}) {
  const t = new We(ge(e.storage), e.saveKey);
  return be(t.load(), t.hasSave);
}
export {
  Xe as A,
  ce as B,
  z as C,
  We as D,
  Je as E,
  ge as F,
  be as G,
  ue as H,
  de as I,
  qe as J,
  j as K,
  Ie as L,
  et as M,
  B as O,
  D as P,
  H as S,
  x as T,
  Ye as Z,
  Se as a,
  Ve as b,
  ie as c,
  O as d,
  f as e,
  xe as f,
  N as g,
  Me as h,
  we as i,
  M as j,
  Te as k,
  I as l,
  he as m,
  W as n,
  pe as o,
  Ke as p,
  V as q,
  ae as r,
  Ee as s,
  Be as t,
  me as u,
  fe as v,
  J as w,
  Ue as x,
  Ze as y,
  Qe as z
};
