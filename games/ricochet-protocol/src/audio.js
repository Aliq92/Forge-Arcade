export function createAudio(profile = {}) {
  let context = null;
  let musicMuted = profile.musicMuted === true;
  let effectsMuted = profile.effectsMuted === true;

  function ensureContext() {
    try {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return null;
      context ??= new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    } catch { return null; }
  }

  function play(name) {
    if (effectsMuted) return;
    const audio = ensureContext();
    if (!audio) return;
    const frequencies = { launch: 520, hit: 720, damage: 160, unlock: 880, victory: 1040 };
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequencies[name] ?? 440;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.13);
  }

  return {
    play,
    setMusicMuted(value) { musicMuted = Boolean(value); },
    setEffectsMuted(value) { effectsMuted = Boolean(value); },
    get settings() { return { musicMuted, effectsMuted }; }
  };
}
