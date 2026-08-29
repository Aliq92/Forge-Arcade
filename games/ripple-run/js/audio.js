// Ripple Run - lightweight synthesized audio (no external assets)
window.RR = window.RR || {};

RR.Audio = (function () {
  let ctx = null;
  let master = null;
  let ambientGain = null;
  let ambientNodes = null;
  let enabled = true;
  let musicEnabled = true;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function resume() {
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  function setEnabled(v) { enabled = v; }
  function setMusicEnabled(v) {
    musicEnabled = v;
    if (!v) stopAmbient(); else startAmbient();
  }

  function tone(freq, duration, opts) {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c) return;
    opts = opts || {};
    const type = opts.type || 'sine';
    const peak = opts.peak != null ? opts.peak : 0.2;
    const attack = opts.attack != null ? opts.attack : 0.006;
    const startFreq = opts.startFreq != null ? opts.startFreq : freq;
    const endFreq = opts.endFreq != null ? opts.endFreq : freq;
    const delay = opts.delay || 0;
    const now = c.currentTime + delay;

    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    let node = osc;
    if (opts.filterFreq) {
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = opts.filterFreq;
      osc.connect(filt);
      node = filt;
    }
    node.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  function noiseBurst(duration, opts) {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c) return;
    opts = opts || {};
    const peak = opts.peak != null ? opts.peak : 0.12;
    const filterFreq = opts.filterFreq || 2200;
    const delay = opts.delay || 0;
    const now = c.currentTime + delay;

    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;

    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 0.7;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  function tap() {
    noiseBurst(0.09, { peak: 0.10, filterFreq: 3200 });
    tone(520, 0.12, { type: 'sine', peak: 0.05, endFreq: 380 });
  }

  function ripple(strength) {
    const s = RR.Utils.clamp(strength || 1, 0.3, 2);
    tone(300 + s * 60, 0.4, { type: 'sine', peak: 0.06 * s, endFreq: 180, attack: 0.02 });
  }

  function splash() {
    noiseBurst(0.18, { peak: 0.08, filterFreq: 1600 });
  }

  function orbHit() {
    tone(700, 0.15, { type: 'triangle', peak: 0.07, endFreq: 900, attack: 0.004 });
  }

  function goalPulse() {
    tone(880, 0.5, { type: 'sine', peak: 0.09, endFreq: 660, attack: 0.02 });
    tone(1320, 0.6, { type: 'sine', peak: 0.05, endFreq: 990, attack: 0.05, delay: 0.05 });
  }

  function levelComplete() {
    const notes = [660, 880, 990, 1320];
    notes.forEach((f, i) => {
      tone(f, 0.5, { type: 'sine', peak: 0.09, endFreq: f, attack: 0.01, delay: i * 0.12 });
    });
  }

  function fail() {
    tone(220, 0.35, { type: 'sine', peak: 0.08, endFreq: 120, attack: 0.01 });
  }

  function rockHit() {
    tone(180, 0.12, { type: 'triangle', peak: 0.05, endFreq: 140 });
  }

  function startAmbient() {
    if (!musicEnabled || !enabled) return;
    const c = ensureCtx();
    if (!c || ambientNodes) return;
    ambientGain = c.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(master);
    ambientGain.gain.linearRampToValueAtTime(0.045, c.currentTime + 2);

    const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 165;
    const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.05;
    const lfoGain = c.createGain(); lfoGain.gain.value = 40;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500;

    lfo.connect(lfoGain); lfoGain.connect(filt.frequency);
    o1.connect(filt); o2.connect(filt); filt.connect(ambientGain);
    o1.start(); o2.start(); lfo.start();
    ambientNodes = { o1, o2, lfo, filt };
  }

  function stopAmbient() {
    const c = ctx;
    if (!c || !ambientNodes) return;
    const g = ambientGain;
    g.gain.linearRampToValueAtTime(0, c.currentTime + 1);
    const nodes = ambientNodes;
    ambientNodes = null;
    setTimeout(() => {
      try {
        nodes.o1.stop(); nodes.o2.stop(); nodes.lfo.stop();
      } catch (e) {}
    }, 1100);
  }

  return {
    resume, setEnabled, setMusicEnabled,
    tap, ripple, splash, orbHit, goalPulse, levelComplete, fail, rockHit,
    startAmbient, stopAmbient
  };
})();
