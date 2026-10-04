// Keep the existing Beast key and backup namespace. No Arcade-wide clear operation.
export const SAVE_KEY = 'forge-arcade:forge-beast:v1';
export function createBeastStorage(storage = globalThis.localStorage) {
  return {
    get: key => storage.getItem(key),
    set: (key, value) => storage.setItem(key, value),
    remove: key => storage.removeItem(key),
  };
}
