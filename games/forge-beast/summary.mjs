import { readForgeBeastSummary } from './module/launcher.js';
import { createBeastStorage, SAVE_KEY } from './storage.mjs';
export function readLauncherStatus() {
  let storage;
  try { storage = createBeastStorage(); } catch { storage = null; }
  const summary = readForgeBeastSummary({ storage, saveKey: SAVE_KEY });
  const stage = { egg: 'Egg', baby: 'Baby', evolved: 'Evolved' }[summary.lifeStage];
  const activity = summary.activeBattle ? 'In battle' : summary.activeExpedition ? 'Exploring' : summary.sleeping ? 'Asleep' : 'Awake';
  return {
    text: summary.hasSave ? `${summary.creatureName} — ${stage} · ${summary.hungerState} · ${activity}` : 'A new egg is waiting',
    attentionNeeded: summary.attentionNeeded,
    summary,
  };
}
