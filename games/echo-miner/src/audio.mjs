function createContext() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    return new Ctx();
  } catch {
    return null;
  }
}

/**
 * Lazily-initialized, procedurally-generated audio. Every method is a safe
 * no-op when Web Audio is unavailable, blocked, or not yet unlocked by a
 * user gesture, so missing audio support never blocks play.
 */
export function createAudioManager() {
  let ctx = null;
  let masterGain = null;
  let droneOsc = null;
  let droneGain = null;
  let muted = false;

  function ensureContext() {
    if (ctx) return ctx;
    ctx = createContext();
    if (!ctx) return null;
    try {
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.7;
      masterGain.connect(ctx.destination);
    } catch {
      ctx = null;
      masterGain = null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensureContext();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
  }

  function playable() {
    return Boolean(ctx) && Boolean(masterGain) && ctx.state === 'running';
  }

  function envelope(startGain, duration) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(startGain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    return g;
  }

  function tone(freq, duration, type, gainValue) {
    if (!playable()) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = envelope(gainValue, duration);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.05);
    } catch {
      /* audio glitches must never interrupt play */
    }
  }

  function noiseBurst(duration, gainValue) {
    if (!playable()) return;
    try {
      const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = gainValue;
      source.connect(g);
      g.connect(masterGain);
      source.start();
    } catch {
      /* ignore */
    }
  }

  const cues = {
    sonar: () => tone(660, 0.5, 'sine', 0.3),
    crystal: () => tone(880, 0.25, 'triangle', 0.3),
    sprintStep: () => noiseBurst(0.08, 0.05),
    uiClick: () => tone(320, 0.08, 'square', 0.12),
    victory: () => {
      tone(523.25, 0.3, 'sine', 0.28);
      setTimeout(() => tone(659.25, 0.3, 'sine', 0.28), 120);
      setTimeout(() => tone(783.99, 0.45, 'sine', 0.28), 240);
    },
    defeat: () => tone(110, 0.9, 'sawtooth', 0.3),
    heartbeat: (options = {}) => tone(90, 0.15, 'sine', 0.22 * (options.intensity ?? 1)),
  };

  function playCue(name, options) {
    const cue = cues[name];
    if (!cue) return;
    try {
      cue(options);
    } catch {
      /* ignore */
    }
  }

  function ensureDrone() {
    if (!playable() || droneOsc) return;
    try {
      droneOsc = ctx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.value = 55;
      droneGain = ctx.createGain();
      droneGain.gain.value = 0;
      droneOsc.connect(droneGain);
      droneGain.connect(masterGain);
      droneOsc.start();
    } catch {
      droneOsc = null;
      droneGain = null;
    }
  }

  function setAwareness(value) {
    if (!playable()) return;
    ensureDrone();
    if (!droneGain || !droneOsc) return;
    const clamped = Math.max(0, Math.min(1, value));
    try {
      droneGain.gain.setTargetAtTime(clamped * 0.16, ctx.currentTime, 0.2);
      droneOsc.frequency.setTargetAtTime(50 + clamped * 40, ctx.currentTime, 0.3);
    } catch {
      /* ignore */
    }
  }

  function disposeRun() {
    if (!droneGain || !ctx) return;
    try {
      droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    } catch {
      /* ignore */
    }
  }

  function setMuted(value) {
    muted = value;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.7;
  }

  return { unlock, playCue, setAwareness, disposeRun, setMuted };
}

