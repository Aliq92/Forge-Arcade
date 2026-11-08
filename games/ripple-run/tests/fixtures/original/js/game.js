// Ripple Run - core game state machine and update loop
window.RR = window.RR || {};

RR.Game = (function () {
  const U = RR.Utils;
  const O = RR.Obstacles;
  const OrbMod = RR.Orb;
  const RippleMod = RR.Ripples;

  const HOLD_REQUIRED = 0.55;
  const BASE_RIPPLE = { speedFactor: 0.85, radiusFactor: 0.62, life: 1.35 };

  function computeRating(taps, time, par, penalties) {
    let stars = 3;
    if (taps > par.taps) stars--;
    if (time > par.time) stars--;
    if (penalties > 0) stars--;
    return U.clamp(stars, 1, 3);
  }

  const Game = {
    W: 800, H: 500,
    state: 'title', // title | levelSelect | howto | settings | playing | paused | levelComplete | fail | zen
    prevState: 'playing',
    currentLevelIndex: 0,
    level: null,
    orbs: [],
    rippleManager: new RippleMod.RippleManager(),
    particles: [],
    deco: null,
    sceneSeed: 0,
    taps: 0,
    elapsed: 0,
    goalHoldTimer: 0,
    hazardPenalties: 0,
    completing: false,
    completingTimer: 0,
    timeScale: 1,
    failing: false,
    shakeAmount: 0,
    settings: RR.Storage.getSettings(),
    zen: RR.Storage.getZen(),
    zenActive: false,
    callbacks: {},
    ambientOrb: null,
    ambientDeco: null,
    ambientTimer: 0,

    on(name, fn) { this.callbacks[name] = fn; },
    emit(name, payload) { if (this.callbacks[name]) this.callbacks[name](payload); },

    init(W, H) {
      this.W = W; this.H = H;
      this.settings = RR.Storage.getSettings();
      this.zen = RR.Storage.getZen();
      this.ambientOrb = new OrbMod.Orb(W * 0.5, H * 0.55, { radius: 10 });
      this.ambientDeco = RR.Renderer.generateDecorations('ambient', W, H);
      this.ambientTimer = 1;
      RR.Audio.setEnabled(this.settings.sound);
      RR.Audio.setMusicEnabled(this.settings.music);
    },

    resize(W, H) {
      const oldW = this.W || W, oldH = this.H || H;
      const sx = W / oldW, sy = H / oldH;
      this.W = W; this.H = H;

      if (this.level && (this.state === 'playing' || this.state === 'paused')) {
        for (const orb of this.orbs) { orb.x *= sx; orb.y *= sy; }
        this.level = RR.Levels.build(this.currentLevelIndex, W, H);
        this.deco = RR.Renderer.generateDecorations('level-' + this.level.id, W, H);
      }
      if (this.zenActive) {
        for (const orb of this.orbs) { orb.x = U.clamp(orb.x * sx, 20, W - 20); orb.y = U.clamp(orb.y * sy, 20, H - 20); }
        this.deco = RR.Renderer.generateDecorations('zen', W, H);
      }
      if (this.ambientOrb) { this.ambientOrb.x *= sx; this.ambientOrb.y *= sy; }
      this.ambientDeco = RR.Renderer.generateDecorations('ambient', W, H);
    },

    applySettings(patch) {
      Object.assign(this.settings, patch);
      RR.Storage.saveSettings(this.settings);
      if ('sound' in patch) RR.Audio.setEnabled(this.settings.sound);
      if ('music' in patch) RR.Audio.setMusicEnabled(this.settings.music);
    },

    // ---------------- Level flow ----------------
    startLevel(index) {
      this.currentLevelIndex = index;
      this.level = RR.Levels.build(index, this.W, this.H);
      this.orbs = [new OrbMod.Orb(this.level.start.x, this.level.start.y, { radius: 12 })];
      this.rippleManager.clear();
      this.particles = [];
      this.taps = 0;
      this.elapsed = 0;
      this.goalHoldTimer = 0;
      this.hazardPenalties = 0;
      this.completing = false;
      this.failing = false;
      this.timeScale = 1;
      this._goalPulsed = false;
      for (const hz of this.level.hazards) hz.reset();
      this.deco = RR.Renderer.generateDecorations('level-' + this.level.id, this.W, this.H);
      this.sceneSeed = this.level.id;
      this.state = 'playing';
      this.emit('levelStart', { index, level: this.level });
    },

    retryLevel() { this.startLevel(this.currentLevelIndex); },

    nextLevel() {
      if (this.currentLevelIndex + 1 < RR.Levels.count) {
        this.startLevel(this.currentLevelIndex + 1);
      } else {
        this.state = 'title';
        this.emit('allLevelsComplete');
      }
    },

    pauseGame() {
      if (this.state === 'playing') { this.prevState = 'playing'; this.state = 'paused'; }
    },
    resumeGame() {
      if (this.state === 'paused') { this.state = this.prevState || 'playing'; }
    },
    quitToMenu() {
      this.zenActive = false;
      this.state = 'title';
    },

    completeLevel() {
      if (this.completing) return;
      this.completing = true;
      this.completingTimer = 0.85;
      this.timeScale = 0.35;
      const stars = computeRating(this.taps, this.elapsed, this.level.par, this.hazardPenalties);
      RR.Storage.setRating(this.level.id, stars);
      RR.Storage.unlockLevel(this.currentLevelIndex + 2);
      this.pendingResult = {
        taps: this.taps, time: this.elapsed, stars,
        levelIndex: this.currentLevelIndex, isLast: this.currentLevelIndex + 1 >= RR.Levels.count
      };
      RR.Audio.levelComplete();
    },

    failNow() {
      if (this.failing || this.completing) return;
      this.failing = true;
      RR.Audio.fail();
      this.triggerShake(4);
      setTimeoutFail(this);
    },

    triggerShake(mag) {
      if (!this.settings.screenShake) return;
      this.shakeAmount = Math.max(this.shakeAmount, mag);
    },

    spawnSplash(x, y, count) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = U.rand(30, 110);
        this.particles.push({
          x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 20,
          size: U.rand(1.2, 3), life: U.rand(0.3, 0.6), maxLife: 0.6
        });
      }
    },

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= Math.exp(-dt * 2);
        p.vy *= Math.exp(-dt * 2);
      }
    },

    // ---------------- Input ----------------
    handleTap(x, y) {
      RR.Audio.resume();
      if (this.state === 'playing') {
        const min = Math.min(this.W, this.H);
        this.rippleManager.spawn(x, y, {
          speed: min * BASE_RIPPLE.speedFactor,
          maxRadius: min * BASE_RIPPLE.radiusFactor,
          strength: 300,
          life: BASE_RIPPLE.life
        });
        this.taps++;
        this.spawnSplash(x, y, 10);
        this.triggerShake(1.4);
        RR.Audio.tap();
        RR.Audio.ripple(1);
        this.emit('tapsChanged', this.taps);
      } else if (this.state === 'zen') {
        const min = Math.min(this.W, this.H);
        const s = this.zen.rippleStrength || 1;
        this.rippleManager.spawn(x, y, {
          speed: min * BASE_RIPPLE.speedFactor,
          maxRadius: min * (BASE_RIPPLE.radiusFactor + 0.1) * (0.85 + s * 0.2),
          strength: 300 * s,
          life: BASE_RIPPLE.life + 0.2
        });
        this.spawnSplash(x, y, 12);
        this.triggerShake(1.2);
        RR.Audio.tap();
        RR.Audio.ripple(s);
      }
    },

    // ---------------- Zen ----------------
    enterZen() {
      this.zenActive = true;
      this.state = 'zen';
      this.zen = RR.Storage.getZen();
      this.orbs = [new OrbMod.Orb(this.W * 0.5, this.H * 0.5, { radius: 13 })];
      this.rippleManager.clear();
      this.particles = [];
      this.deco = RR.Renderer.generateDecorations('zen', this.W, this.H);
      this.sceneSeed = 'zen';
      RR.Renderer.setRain(this.zen.rain);
      RR.Audio.startAmbient();
    },
    exitZen() {
      this.zenActive = false;
      RR.Storage.saveZen(this.zen);
      RR.Renderer.setRain(false);
      this.state = 'title';
    },
    addZenOrb() {
      if (this.orbs.length >= 7) return;
      const hue = U.rand(170, 260);
      this.orbs.push(new OrbMod.Orb(
        U.rand(this.W * 0.2, this.W * 0.8), U.rand(this.H * 0.2, this.H * 0.8),
        { radius: U.rand(9, 15), hue }
      ));
    },
    clearZenOrbs() {
      this.orbs = [new OrbMod.Orb(this.W * 0.5, this.H * 0.5, { radius: 13 })];
      this.rippleManager.clear();
      this.particles = [];
    },
    setZenRain(v) { this.zen.rain = v; RR.Renderer.setRain(v); RR.Storage.saveZen(this.zen); },
    setZenTheme(theme) { this.zen.theme = theme; RR.Storage.saveZen(this.zen); },
    setZenRippleStrength(v) { this.zen.rippleStrength = v; RR.Storage.saveZen(this.zen); },
    setZenCinematic(v) { this.zen.cinematic = v; RR.Storage.saveZen(this.zen); },

    // ---------------- Update ----------------
    updateAmbient(dt) {
      this.ambientTimer -= dt;
      if (this.ambientTimer <= 0) {
        this.ambientTimer = U.rand(2.0, 3.4);
        const min = Math.min(this.W, this.H);
        this.rippleManager.spawn(U.rand(this.W * 0.25, this.W * 0.75), U.rand(this.H * 0.25, this.H * 0.75), {
          speed: min * 0.42, maxRadius: min * 0.5, strength: 130, life: 2.1
        });
      }
      this.rippleManager.update(dt, { orbs: [this.ambientOrb], rocks: [], goal: null });
      this.ambientOrb.update(dt, { W: this.W, H: this.H, dragMultiplier: 1 });
      this.updateParticles(dt);
      this.shakeAmount *= Math.exp(-dt * 10);
    },

    updateLevel(dt) {
      const realDt = dt;
      if (this.completing) {
        this.completingTimer -= realDt;
        if (this.completingTimer <= 0) {
          this.completing = false;
          this.timeScale = 1;
          this.state = 'levelComplete';
          this.emit('levelComplete', this.pendingResult);
        }
      }
      const scaledDt = dt * this.timeScale;
      this.elapsed += scaledDt;

      const level = this.level;
      const t = this.elapsed;
      level.goal.update(t, scaledDt);
      for (const rock of level.rocks) rock.update(t, scaledDt);

      for (const orb of this.orbs) {
        let dragMul = 1, forceX = 0, forceY = 0;
        for (const cz of level.currents) {
          if (cz.contains(orb.x, orb.y)) { forceX += cz.dirX * cz.strength; forceY += cz.dirY * cz.strength; }
        }
        for (const sz of level.shallow) {
          if (sz.contains(orb.x, orb.y)) dragMul = Math.max(dragMul, sz.dragMultiplier);
        }
        orb.update(scaledDt, { W: this.W, H: this.H, dragMultiplier: dragMul, forceX, forceY });

        for (const rock of level.rocks) {
          if (O.collideOrbRock(orb, rock)) RR.Audio.rockHit();
        }
        for (const hz of level.hazards) {
          if (!hz.triggered && hz.contains(orb.x, orb.y)) {
            hz.triggered = true;
            hz.pulse = 1;
            this.hazardPenalties++;
            this.triggerShake(2);
            if (hz.type === 'drain') { this.failNow(); }
          }
        }
      }

      if (!this.completing && !this.failing) {
        const orb = this.orbs[0];
        const d = U.dist(orb.x, orb.y, level.goal.x, level.goal.y);
        if (d <= level.goal.r + orb.radius * 0.25) {
          this.goalHoldTimer += scaledDt;
          if (!this._goalPulsed) { this._goalPulsed = true; level.goal.pulse = 1; RR.Audio.goalPulse(); }
        } else {
          this.goalHoldTimer = Math.max(0, this.goalHoldTimer - scaledDt * 2.2);
          this._goalPulsed = false;
        }
        if (this.goalHoldTimer >= HOLD_REQUIRED) this.completeLevel();
      }

      this.rippleManager.update(scaledDt, {
        orbs: this.orbs, rocks: level.rocks, goal: level.goal,
        onOrbHit: (orb) => { orb.brighten = 1; },
        onGoalHit: (goal) => { goal.pulse = Math.min(1, goal.pulse + 0.5); }
      });
      this.updateParticles(scaledDt);
      this.shakeAmount *= Math.exp(-realDt * 10);
    },

    updateZen(dt) {
      for (const orb of this.orbs) {
        orb.update(dt, { W: this.W, H: this.H, dragMultiplier: 1 });
      }
      this.rippleManager.update(dt, { orbs: this.orbs, rocks: [], goal: null });
      this.updateParticles(dt);
      this.shakeAmount *= Math.exp(-dt * 10);
    },

    update(dt) {
      dt = U.clamp(dt, 0, 1 / 20);
      if (this.state === 'playing' || (this.state === 'paused' && false)) {
        this.updateLevel(dt);
      } else if (this.state === 'zen') {
        this.updateZen(dt);
      } else if (this.state === 'title' || this.state === 'levelSelect' || this.state === 'howto' || this.state === 'settings') {
        this.updateAmbient(dt);
      }
    },

    getShakeOffset() {
      if (this.shakeAmount < 0.05) return { x: 0, y: 0 };
      return {
        x: (Math.random() - 0.5) * this.shakeAmount,
        y: (Math.random() - 0.5) * this.shakeAmount
      };
    },

    getRenderState() {
      const shake = this.getShakeOffset();
      const base = { W: this.W, H: this.H, shakeX: shake.x, shakeY: shake.y,
        reducedMotion: this.settings.reducedMotion, rippleGlow: this.settings.rippleGlow,
        highContrast: this.settings.highContrast };

      if (this.state === 'playing' || this.state === 'paused' || this.state === 'levelComplete' || this.state === 'fail') {
        const level = this.level;
        return Object.assign(base, {
          theme: 'night', sceneSeed: this.sceneSeed, deco: this.deco,
          orbs: this.orbs, ripples: this.rippleManager.ripples, particles: this.particles,
          rocks: level ? level.rocks : [], currents: level ? level.currents : [],
          shallow: level ? level.shallow : [], hazards: level ? level.hazards : [],
          goal: level ? level.goal : null, rain: false
        });
      }
      if (this.state === 'zen') {
        return Object.assign(base, {
          theme: this.zen.theme, sceneSeed: this.sceneSeed, deco: this.deco,
          orbs: this.orbs, ripples: this.rippleManager.ripples, particles: this.particles,
          rocks: [], currents: [], shallow: [], hazards: [], goal: null,
          rain: this.zen.rain
        });
      }
      return Object.assign(base, {
        theme: 'night', sceneSeed: 'ambient', deco: this.ambientDeco,
        orbs: [this.ambientOrb], ripples: this.rippleManager.ripples, particles: this.particles,
        rocks: [], currents: [], shallow: [], hazards: [], goal: null, rain: false
      });
    }
  };

  function setTimeoutFail(game) {
    window.setTimeout(() => {
      game.failing = false;
      game.state = 'fail';
      game.emit('fail');
    }, 550);
  }

  return Game;
})();
