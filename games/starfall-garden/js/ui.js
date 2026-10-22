// DOM-based HUD and menu screens.
SG.UI = class {
  constructor(handlers) {
    this.h = handlers;
    this.save = SG.storage.load();
    this.difficulty = 'normal';
    this._cacheDom();
    this._buildPlantTray();
    this._buildPlantGuide();
    this._bindEvents();
    this._applySettingsToInputs();
    this._refreshBestStats();
  }

  _cacheDom() {
    this.el = {};
    const ids = [
      'hud', 'bar-health', 'bar-energy', 'stat-fragments', 'stat-plants', 'stat-health', 'bar-planet',
      'phase-label', 'phase-timer', 'plant-tray', 'action-hint', 'warning-banner', 'toast-banner', 'btn-pause', 'mobile-controls',
      'btn-mobile-interact', 'plant-detail', 'objective-list', 'objective-next', 'aura-status', 'plant-guide', 'victory-confetti',
      'screen-title', 'screen-howto', 'screen-settings', 'screen-pause', 'screen-upgrade', 'screen-gameover', 'screen-victory',
      'btn-begin', 'btn-endless', 'btn-howto', 'btn-settings', 'btn-howto-close', 'btn-settings-close',
      'btn-resume', 'btn-pause-restart', 'btn-pause-settings', 'btn-pause-howto', 'btn-pause-title',
      'upgrade-cards', 'gameover-stats', 'btn-retry', 'btn-gameover-title',
      'victory-stats', 'btn-endless-continue', 'btn-victory-retry', 'btn-victory-title',
      'set-music', 'set-sfx', 'set-shake', 'set-particles', 'set-motion', 'set-fps',
      'best-stats', 'fps-counter',
    ];
    for (const id of ids) this.el[id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = document.getElementById(id);
  }

  _buildPlantTray() {
    this.el.plantTray.innerHTML = '';
    this.plantSlotEls = {};
    Object.values(SG.PLANT_TYPES).forEach((cfg) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'plant-slot';
      div.innerHTML = `<span class="key">${cfg.key}</span><span class="icon">${cfg.icon}</span><span class="cost">${cfg.cost}</span>`;
      div.title = `${cfg.name} — ${cfg.desc}`;
      div.setAttribute('aria-label', `${cfg.name}, ${cfg.cost} fragments. ${cfg.desc}`);
      div.addEventListener('click', () => this.h.onSelectPlantClick && this.h.onSelectPlantClick(cfg.id));
      this.el.plantTray.appendChild(div);
      this.plantSlotEls[cfg.id] = div;
    });
  }

  _buildPlantGuide() {
    this.el.plantGuide.innerHTML = Object.values(SG.PLANT_TYPES).map(cfg =>
      `<article class="guide-plant"><div><b>${cfg.name}</b><span>${cfg.cost}✦</span></div><p>${cfg.desc}</p></article>`
    ).join('');
  }

  celebrate() {
    this.clearCelebration();
    const reduced = this.save.settings.reducedMotion;
    this.el.victoryConfetti.classList.toggle('reduced', reduced);
    const colors = ['#6ff0e8', '#f0c96e', '#c98cf0', '#7ea8ff', '#fff6e0'];
    const count = reduced ? 12 : 72;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = (reduced ? (i % 2 ? 94 : 4) : Math.random() * 100) + '%';
      piece.style.top = reduced ? (12 + Math.floor(i / 2) * 13) + '%' : '-20px';
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.setProperty('--drift', (Math.random() * 140 - 70) + 'px');
      piece.style.setProperty('--spin', (Math.random() * 1080 - 540) + 'deg');
      piece.style.setProperty('--duration', (4.8 + Math.random() * 1.2) + 's');
      piece.style.animationDelay = (reduced ? 0 : Math.random() * 0.7) + 's';
      this.el.victoryConfetti.appendChild(piece);
    }
  }

  clearCelebration() { this.el.victoryConfetti.replaceChildren(); }

  _bindEvents() {
    const h = this.h;
    this.el.btnBegin.addEventListener('click', () => h.begin(this.difficulty));
    this.el.btnEndless.addEventListener('click', () => h.beginEndless());
    this.el.btnHowto.addEventListener('click', () => this.show('howto'));
    this.el.btnSettings.addEventListener('click', () => this.show('settings'));
    this.el.btnHowtoClose.addEventListener('click', () => h.closeOverlay());
    this.el.btnSettingsClose.addEventListener('click', () => h.closeOverlay());
    this.el.btnResume.addEventListener('click', () => h.resume());
    this.el.btnPauseRestart.addEventListener('click', () => h.restart());
    this.el.btnPauseSettings.addEventListener('click', () => this.show('settings', true));
    this.el.btnPauseHowto.addEventListener('click', () => this.show('howto', true));
    this.el.btnPauseTitle.addEventListener('click', () => h.toTitle());
    this.el.btnRetry.addEventListener('click', () => h.restart());
    this.el.btnGameoverTitle.addEventListener('click', () => h.toTitle());
    this.el.btnEndlessContinue.addEventListener('click', () => h.continueEndless());
    this.el.btnVictoryRetry.addEventListener('click', () => h.restart());
    this.el.btnVictoryTitle.addEventListener('click', () => h.toTitle());
    this.el.btnPause.addEventListener('click', () => h.pauseToggle());

    document.querySelectorAll('.chip-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chip-btn[data-diff]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.diff;
      });
    });

    this.el.setMusic.addEventListener('input', () => this._onSettingsChange());
    this.el.setSfx.addEventListener('input', () => this._onSettingsChange());
    this.el.setShake.addEventListener('change', () => this._onSettingsChange());
    this.el.setParticles.addEventListener('change', () => this._onSettingsChange());
    this.el.setMotion.addEventListener('change', () => this._onSettingsChange());
    this.el.setFps.addEventListener('change', () => this._onSettingsChange());
  }

  _applySettingsToInputs() {
    const s = this.save.settings;
    this.el.setMusic.value = s.musicVol;
    this.el.setSfx.value = s.sfxVol;
    this.el.setShake.checked = s.screenShake;
    this.el.setParticles.value = s.particles;
    this.el.setMotion.checked = s.reducedMotion;
    this.el.setFps.checked = s.showFPS;
    this.el.fpsCounter.classList.toggle('hidden', !s.showFPS);
  }

  _onSettingsChange() {
    const s = this.save.settings;
    s.musicVol = Number(this.el.setMusic.value);
    s.sfxVol = Number(this.el.setSfx.value);
    s.screenShake = this.el.setShake.checked;
    s.particles = this.el.setParticles.value;
    s.reducedMotion = this.el.setMotion.checked;
    s.showFPS = this.el.setFps.checked;
    SG.storage.save(this.save);
    this.el.fpsCounter.classList.toggle('hidden', !s.showFPS);
    this.h.onSettingsChanged && this.h.onSettingsChanged(s);
  }

  _refreshBestStats() {
    const st = this.save.stats;
    if (st.bestRestoration > 0) {
      this.el.bestStats.textContent = `Best Restoration: ${Math.round(st.bestRestoration)}%` +
        (st.victoryAchieved ? ` · Garden Restored${st.bestTimeVictory ? ' in ' + SG.util.formatTime(st.bestTimeVictory) : ''}` : '');
    } else {
      this.el.bestStats.textContent = '';
    }
    this.el.btnEndless.style.display = st.victoryAchieved ? 'block' : 'none';
  }

  saveStatsIfBest(restorationPct, victory, timeSec) {
    const st = this.save.stats;
    st.bestRestoration = Math.max(st.bestRestoration, restorationPct);
    if (victory) {
      st.victoryAchieved = true;
      if (!st.bestTimeVictory || timeSec < st.bestTimeVictory) st.bestTimeVictory = timeSec;
    }
    SG.storage.save(this.save);
    this._refreshBestStats();
  }

  show(name, fromPause) {
    ['title', 'howto', 'settings', 'pause', 'upgrade', 'gameover', 'victory'].forEach((n) => {
      this.el['screen' + n[0].toUpperCase() + n.slice(1)].classList.add('hidden');
    });
    this._returnToPause = !!fromPause;
    this.currentScreen = name || null;
    if (name) this.el['screen' + name[0].toUpperCase() + name.slice(1)].classList.remove('hidden');
  }

  hideAllScreens() { this.show(null); }

  setHudVisible(v) { this.el.hud.classList.toggle('hidden', !v); }
  setMobileControlsVisible(v) { this.el.mobileControls.classList.toggle('active', v); this.el.mobileControls.classList.toggle('hidden', !v); }

  _updateActionHint(hint) {
    if (!hint || hint.type === 'occupied') {
      this.el.actionHint.classList.add('hidden');
      if (this.el.btnMobileInteract) this.el.btnMobileInteract.textContent = 'E';
      return;
    }
    let text, cls;
    if (hint.type === 'locked') { text = 'LOCKED'; cls = 'deny'; }
    else {
      const costText = hint.cost != null ? ` · ${hint.cost}✦` : '';
      text = hint.afford ? `${hint.label}${costText}` : `${hint.label}${costText} — NOT ENOUGH`;
      cls = hint.afford ? 'ok' : 'deny';
    }
    this.el.actionHint.textContent = text;
    this.el.actionHint.className = 'action-hint ' + cls;
    if (this.el.btnMobileInteract) {
      this.el.btnMobileInteract.textContent = hint.type === 'restore' ? 'RESTORE' : hint.type === 'plant' ? 'PLANT' : 'E';
      this.el.btnMobileInteract.classList.toggle('contextual', hint.type === 'restore' || hint.type === 'plant');
    }
  }

  updateHUD(s) {
    this.el.barHealth.style.width = SG.util.clamp((s.health / s.maxHealth) * 100, 0, 100) + '%';
    this.el.barEnergy.style.width = SG.util.clamp((s.energy / s.maxEnergy) * 100, 0, 100) + '%';
    this.el.statFragments.textContent = Math.floor(s.fragments);
    this.el.statPlants.textContent = s.plantsAlive;
    const hp = Math.floor(s.healthPct);
    this.el.statHealth.textContent = hp;
    this.el.barPlanet.style.width = hp + '%';

    this.el.phaseLabel.textContent = s.phaseLabel;
    this.el.phaseLabel.className = 'phase-label' + (s.phase === 'warning' ? ' warning' : s.phase === 'night' ? ' night' : '');
    this.el.phaseTimer.textContent = SG.util.formatTime(s.phaseTimer);

    if (s.warningText) {
      this.el.warningBanner.textContent = s.warningText;
      this.el.warningBanner.classList.remove('hidden');
    } else {
      this.el.warningBanner.classList.add('hidden');
    }

    if (s.toastText) {
      this.el.toastBanner.textContent = s.toastText;
      this.el.toastBanner.classList.remove('hidden');
    } else {
      this.el.toastBanner.classList.add('hidden');
    }

    this._updateActionHint(s.actionHint);

    Object.entries(this.plantSlotEls).forEach(([id, el]) => {
      const cfg = SG.PLANT_TYPES[id];
      const cost = Math.max(1, Math.round(cfg.cost * s.plantCostMul));
      el.querySelector('.cost').textContent = cost;
      el.classList.toggle('selected', s.selectedPlant === id);
      el.setAttribute('aria-pressed', String(s.selectedPlant === id));
      el.setAttribute('aria-label', `${cfg.name}, ${cost} fragments. ${cfg.desc}`);
      el.classList.toggle('unaffordable', s.fragments < cost);
    });

    const selected = SG.PLANT_TYPES[s.selectedPlant];
    const cost = Math.max(1, Math.round(selected.cost * s.plantCostMul));
    this.el.plantDetail.textContent = `${selected.name} · ${cost}✦ — ${selected.desc} Benefits start at maturity.`;
    const o = s.objectives;
    if (o) {
      const labels = ['Restore 25%', 'Mature all four species', 'Survive a full starfall night', '100% + six mature plants, all species'];
      this.el.objectiveList.textContent = labels.map((label,i) => `${o.completed[i] ? '✓' : '○'} ${i+1}. ${label}`).join('\n');
      const next = o.completed.findIndex(done => !done);
      let detail = next === 1 ? 'Grow ' + Object.keys(SG.PLANT_TYPES).filter(id => !o.speciesGrown.has(id)).map(id => SG.PLANT_TYPES[id].name).join(', ') : next === 2 ? 'Stay through a complete night; no deadline.' : next === 0 ? `${Math.floor(s.healthPct)}% / 25% restored` : o.missing.join(' · ');
      if (next === -1) detail = s.endless ? 'Endless · Tend your living sanctuary.' : 'Your sanctuary is alive.';
      this.el.objectiveNext.textContent = detail;
    }
    const a = s.auras || {};
    this.el.auraStatus.textContent = [a.healBonus > 0 && '✿ Healing + energy', a.magnetBonus > 0 && '✦ Fragment attraction', a.damageReduction > 0 && '◈ Protected'].filter(Boolean).join(' · ');

    if (s.showFPS) this.el.fpsCounter.textContent = Math.round(s.fps) + ' FPS';
  }

  showUpgradeChoices(choices, onPick) {
    this.el.upgradeCards.innerHTML = '';
    choices.forEach((u, i) => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `<span class="u-key">${i + 1}</span><div class="u-icon">${u.icon}</div><div class="u-name">${u.name}</div><div class="u-desc">${u.desc}</div>`;
      card.addEventListener('click', () => onPick(u.id));
      this.el.upgradeCards.appendChild(card);
    });
    this.show('upgrade');
  }

  _statsRows(pairs) {
    return pairs.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
  }

  showGameOver(stats) {
    this.el.gameoverStats.innerHTML = this._statsRows([
      ['Restoration Reached', Math.floor(stats.healthPct) + '%'],
      ['Starfalls Survived', stats.cyclesCompleted],
      ['Fragments Collected', stats.fragmentsCollected],
      ['Plants Grown', stats.plantsGrown],
      ['Meteors Dodged', stats.meteorsDodged],
      ['Meteor Hits Taken', stats.meteorHits],
      ['Best Restoration', Math.floor(Math.max(stats.healthPct, this.save.stats.bestRestoration)) + '%'],
    ]);
    this.show('gameover');
  }

  showVictory(stats) {
    this.el.victoryStats.innerHTML = this._statsRows([
      ['Time to Restore', SG.util.formatTime(stats.timeSec)],
      ['Starfalls Survived', stats.cyclesCompleted],
      ['Fragments Collected', stats.fragmentsCollected],
      ['Plants Grown', stats.plantsGrown],
      ['Meteors Dodged', stats.meteorsDodged],
      ['Meteor Hits Taken', stats.meteorHits],
    ]);
    this.show('victory');
  }
};
