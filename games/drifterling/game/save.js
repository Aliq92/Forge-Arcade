const KEY = "drifterling-save-v1";
export const SAVE_VERSION = 1;
export const defaultSave = ()=>({
        version: SAVE_VERSION,
        restored: [],
        affinity: { cyan: 0, gold: 0, violet: 0, prism: 0 },
        stage: 0,
        region: "start",
        muted: false,
        endingDone: false,
        discoveredSecrets: [],
        lastIsland: null
    });
function migrate(raw) {
    const base = defaultSave();
    return {
        ...base,
        ...raw,
        affinity: { ...base.affinity, ...raw.affinity ?? {} },
        restored: Array.isArray(raw.restored) ? raw.restored : [],
        discoveredSecrets: Array.isArray(raw.discoveredSecrets) ? raw.discoveredSecrets : [],
        version: SAVE_VERSION
    };
}
export function loadSave() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return defaultSave();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return defaultSave();
        return migrate(parsed);
    } catch  { return defaultSave(); }
}
export function writeSave(data) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...data, version: SAVE_VERSION })); } catch  {}
}
export function clearSave() {
    try { localStorage.removeItem(KEY); } catch  {}
}
export function hasSave() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.restored?.length || parsed?.endingDone);
    } catch  { return false; }
}
