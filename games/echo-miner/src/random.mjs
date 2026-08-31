// Deterministic PRNG (mulberry32). Same seed always produces the same
// sequence, which is required for reproducible cave generation and tests.
function mulberry32(seedInt) {
  let a = seedInt >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return Math.floor(seed) >>> 0;
  const str = String(seed);
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed) {
  const next = mulberry32(hashSeed(seed));

  return {
    next,
    float(min = 0, max = 1) {
      return min + next() * (max - min);
    },
    int(min, max) {
      // inclusive of min, exclusive of max
      return Math.floor(min + next() * (max - min));
    },
    intInclusive(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    chance(probability) {
      return next() < probability;
    },
    pick(array) {
      if (array.length === 0) return undefined;
      return array[Math.floor(next() * array.length)];
    },
    shuffle(array) {
      const copy = array.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

