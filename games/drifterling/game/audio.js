import { clamp } from "./math.js";
export function createAudio(startMuted) {
    let ctx = null;
    let master = null;
    let sfx = null;
    let music = null;
    let padFilter = null;
    let muted = startMuted;
    let restored = 0;
    let padStarted = false;
    const voices = [];
    function ensure() {
        if (ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC({ latencyHint: "interactive" });
        master = ctx.createGain();
        sfx = ctx.createGain();
        music = ctx.createGain();
        master.gain.value = muted ? 0 : 0.22;
        sfx.gain.value = 0.7;
        music.gain.value = 0.38;
        sfx.connect(master); music.connect(master); master.connect(ctx.destination);
    }
    function resume() {
        ensure();
        if (ctx && ctx.state === "suspended") void ctx.resume();
    }
    function setMaster() {
        if (!master || !ctx) return;
        const g = muted ? 0 : 0.22;
        master.gain.setTargetAtTime(g, ctx.currentTime, 0.04);
    }
    function envGain(peak, attack, release) {
        if (!ctx || !sfx) throw new Error("audio");
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + attack + release);
        g.connect(sfx);
        return g;
    }
    function tone(freq, type, peak, attack, release, detune = 0) {
        if (!ctx) return;
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = freq; o.detune.value = detune;
        o.connect(envGain(peak, attack, release));
        o.start(); o.stop(ctx.currentTime + attack + release + 0.02);
    }
    function noiseBurst(peak, release, hp = 800) {
        if (!ctx) return;
        const len = Math.max(0.08, release);
        const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for(let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = "highpass"; f.frequency.value = hp;
        src.connect(f); f.connect(envGain(peak, 0.008, release)); src.start();
    }
    function startPad() {
        if (!ctx || !music || padStarted) return;
        padStarted = true;
        padFilter = ctx.createBiquadFilter();
        padFilter.type = "lowpass"; padFilter.frequency.value = 420; padFilter.Q.value = 0.7;
        padFilter.connect(music);
        const freqs = [110,164.81,196,246.94];
        for(let i = 0; i < freqs.length; i++){
            const o = ctx.createOscillator();
            o.type = i % 2 === 0 ? "sine" : "triangle";
            o.frequency.value = freqs[i]; o.detune.value = i * 3 - 4;
            const g = ctx.createGain(); g.gain.value = 0.07 - i * 0.01;
            o.connect(g); g.connect(padFilter); o.start(); voices.push(o);
        }
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.07; lfoGain.gain.value = 80;
        lfo.connect(lfoGain); lfoGain.connect(padFilter.frequency); lfo.start(); voices.push(lfo);
        const noise = ctx.createBufferSource();
        const nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const nd = nbuf.getChannelData(0);
        for(let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.15;
        noise.buffer = nbuf; noise.loop = true;
        const nf = ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 380; nf.Q.value = 0.5;
        const ng = ctx.createGain(); ng.gain.value = 0.04;
        noise.connect(nf); nf.connect(ng); ng.connect(music); noise.start();
    }
    function enrichPad() {
        if (!padFilter || !ctx) return;
        const f = 420 + restored * 90;
        padFilter.frequency.setTargetAtTime(f, ctx.currentTime, 0.8);
    }
    const api = {
        muted,
        unlock () { resume(); startPad(); },
        setMuted (v) { muted = v; api.muted = v; ensure(); setMaster(); },
        setRestoredCount (n) { restored = n; enrichPad(); },
        collect (kind) {
            resume();
            const base = kind === "cyan" ? 620 : kind === "gold" ? 540 : kind === "violet" ? 700 : 840;
            const jitter = 0.94 + Math.random() * 0.12;
            tone(base * jitter, "sine", 0.18, 0.01, 0.35);
            tone(base * 1.5 * jitter, "triangle", 0.08, 0.01, 0.28);
        },
        restore () {
            resume();
            tone(261.63, "sine", 0.16, 0.04, 1.8);
            tone(329.63, "sine", 0.12, 0.08, 1.9, 4);
            tone(392.0, "sine", 0.1, 0.12, 2.1);
            tone(523.25, "triangle", 0.06, 0.2, 2.0);
        },
        chirp () { resume(); tone(880 + Math.random() * 80, "sine", 0.07, 0.005, 0.12); },
        bloom () {
            resume();
            tone(523, "sine", 0.1, 0.02, 0.5);
            tone(659, "sine", 0.08, 0.05, 0.55);
            tone(784, "triangle", 0.06, 0.08, 0.6);
            noiseBurst(0.05, 0.25, 1200);
        },
        pop () { resume(); tone(1400 + Math.random() * 200, "sine", 0.04, 0.004, 0.08); },
        destroy () {
            for (const v of voices) { try { v.stop(); } catch  {} }
            voices.length = 0;
            if (ctx) void ctx.close();
            ctx = null;
        }
    };
    document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState === "visible") resume(); });
    return api;
}
export function preferReducedMotion() {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function isCoarsePointer() {
    return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}
void clamp;
