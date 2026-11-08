// Ripple Run - DOM/UI wiring (menus, HUD, overlays)
window.RR = window.RR || {};

RR.UI = (function () {
  const G = RR.Game;
  let el = {};let settingsReturn='title',lastTheme='';

  function q(id) { return document.getElementById(id); }

  function cacheEls() {
    el = {
      hud: q('hud'), hudLevelName: q('hud-level-name'), hudTaps: q('hud-taps'),
      btnPause: q('btn-pause'), btnRestart: q('btn-restart'),btnVisual:q('btn-visual'),btnTitleSound:q('btn-title-sound'),btnZenSettings:q('btn-zen-settings'),setTheme:q('set-theme'),setIntensity:q('set-intensity'),setParticles:q('set-particles'),
      levelTip: q('level-tip'),

      screenTitle: q('screen-title'), btnPlay: q('btn-play'), btnLevelSelect: q('btn-level-select'),
      btnZen: q('btn-zen'), btnHowto: q('btn-howto'), btnSettings: q('btn-settings'),

      screenLevelSelect: q('screen-level-select'), levelGrid: q('level-grid'), btnLsBack: q('btn-ls-back'),

      modalHowto: q('modal-howto'), btnHowtoBack: q('btn-howto-back'), btnHowtoClose: q('btn-howto-close'),

      modalSettings: q('modal-settings'), btnSettingsBack: q('btn-settings-back'),
      setSound: q('set-sound'), setMusic: q('set-music'), setGlow: q('set-glow'),
      setShake: q('set-shake'), setMotion: q('set-motion'), setContrast: q('set-contrast'),

      overlayPause: q('overlay-pause'), btnResume: q('btn-resume'),
      btnPauseRestart: q('btn-pause-restart'), btnPauseQuit: q('btn-pause-quit'),

      overlayComplete: q('overlay-complete'), completeStars: q('complete-stars'),
      completeTaps: q('complete-taps'), completeTime: q('complete-time'),
      btnNext: q('btn-next'), btnCompleteRetry: q('btn-complete-retry'), btnCompleteMenu: q('btn-complete-menu'),

      overlayFail: q('overlay-fail'),

      zenUi: q('zen-ui'), btnZenExit: q('btn-zen-exit'), zenControls: q('zen-controls'),
      btnZenAddOrb: q('btn-zen-add-orb'), btnZenClear: q('btn-zen-clear'),
      btnZenRain: q('btn-zen-rain'), btnZenTheme: q('btn-zen-theme'),
      btnZenCinematic: q('btn-zen-cinematic'), zenStrength: q('zen-strength'),
      btnCinematicExit: q('btn-cinematic-exit')
    };
  }

  const screens = () => [el.screenTitle, el.screenLevelSelect, el.modalHowto, el.modalSettings];

  function hideAllScreens() { screens().forEach(s => s.classList.add('hidden')); }
  function hideOverlays() {
    el.overlayPause.classList.add('hidden');
    el.overlayComplete.classList.add('hidden');
    el.overlayFail.classList.add('hidden');
  }

  function showTitle() {
    hideAllScreens(); hideOverlays();
    el.hud.classList.add('hidden');
    el.levelTip.classList.add('hidden');
    el.zenUi.classList.add('hidden');
    el.btnCinematicExit.classList.add('hidden');
    G.state = 'title';
    el.screenTitle.classList.remove('hidden');
  }

  function showLevelSelect() {
    buildLevelGrid();
    hideAllScreens();
    G.state = 'levelSelect';
    el.screenLevelSelect.classList.remove('hidden');
  }

  function buildLevelGrid() {
    const progress = RR.Storage.getProgress();
    el.levelGrid.innerHTML = '';
    RR.Levels.DATA.forEach((def, i) => {
      const unlocked = (i + 1) <= progress.unlocked;
      const stars = progress.ratings[def.id] || 0;
      const stone = document.createElement('button');stone.type='button';stone.disabled=!unlocked;stone.setAttribute('aria-label',`Level ${i+1}: ${def.name}${unlocked?'':' — locked'}`);
      stone.className = 'level-stone' + (unlocked ? '' : ' locked');
      if (unlocked) {
        stone.innerHTML = `<span class="num">${i + 1}</span><span class="stars-mini">${'★'.repeat(stars)}</span>`;
        stone.addEventListener('click', () => {
          hideAllScreens();
          startLevelFlow(i);
        });
      } else {
        stone.innerHTML = `<span class="lock-icon">🔒</span>`;
      }
      el.levelGrid.appendChild(stone);
    });
  }

  function startLevelFlow(index) {
    G.startLevel(index);
    el.hud.classList.remove('hidden');
  }

  function firstPlayableIndex() {
    const p = RR.Storage.getProgress();
    const unlockedCount = U_clamp(p.unlocked, 1, RR.Levels.count);
    for (let i = 0; i < unlockedCount; i++) {
      const def = RR.Levels.DATA[i];
      if (!(p.ratings[def.id] >= 3)) return i;
    }
    return unlockedCount - 1;
  }
  function U_clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function initSettingsUI() {
    const s = G.settings;el.setTheme.value=s.visualTheme;el.setIntensity.value=s.glowIntensity;el.setParticles.checked=s.particleEffects;
    el.setSound.checked = !!s.sound;
    el.setMusic.checked = !!s.music;
    el.setGlow.checked = !!s.rippleGlow;
    el.setShake.checked = !!s.screenShake;
    el.setMotion.checked = !!s.reducedMotion;
    el.setContrast.checked = !!s.highContrast;
    document.body.classList.toggle('high-contrast', !!s.highContrast);
  }

  function bindEvents() {
    el.btnPlay.addEventListener('click', () => { hideAllScreens(); startLevelFlow(firstPlayableIndex()); });
    el.btnLevelSelect.addEventListener('click', showLevelSelect);
    el.btnZen.addEventListener('click', enterZenUI);
    el.btnHowto.addEventListener('click', () => { hideAllScreens(); el.modalHowto.classList.remove('hidden'); });
    el.btnSettings.addEventListener('click',openSettings);el.btnVisual.addEventListener('click',openSettings);el.btnZenSettings.addEventListener('click',openSettings);el.btnTitleSound.addEventListener('click',()=>{RR.Audio.resume();G.applySettings({sound:!G.settings.sound});sync();});el.setTheme.addEventListener('change',()=>{G.applySettings({visualTheme:el.setTheme.value});sync();});el.setIntensity.addEventListener('input',()=>G.applySettings({glowIntensity:Number(el.setIntensity.value)}));el.setParticles.addEventListener('change',()=>G.applySettings({particleEffects:el.setParticles.checked}));

    el.btnLsBack.addEventListener('click', showTitle);
    el.btnHowtoBack.addEventListener('click', showTitle);
    el.btnHowtoClose.addEventListener('click', showTitle);
    el.btnSettingsBack.addEventListener('click',closeSettings);

    el.setSound.addEventListener('change', () => G.applySettings({ sound: el.setSound.checked }));
    el.setMusic.addEventListener('change', () => G.applySettings({ music: el.setMusic.checked }));
    el.setGlow.addEventListener('change', () => G.applySettings({ rippleGlow: el.setGlow.checked }));
    el.setShake.addEventListener('change', () => G.applySettings({ screenShake: el.setShake.checked }));
    el.setMotion.addEventListener('change', () => G.applySettings({ reducedMotion: el.setMotion.checked }));
    el.setContrast.addEventListener('change', () => {
      G.applySettings({ highContrast: el.setContrast.checked });
      document.body.classList.toggle('high-contrast', el.setContrast.checked);
    });

    // HUD
    el.btnPause.addEventListener('click', () => {
      pause();
    });
    el.btnRestart.addEventListener('click', () => { G.retryLevel(); });

    // Pause overlay
    el.btnResume.addEventListener('click',resume);
    el.btnPauseRestart.addEventListener('click',()=>{el.overlayPause.classList.add('hidden');if(G.prevState==='zen'){G.clearZenOrbs();G.resumeGame();}else G.retryLevel();RR.Audio.setVisible(true);});
    el.btnPauseQuit.addEventListener('click', () => {
      el.overlayPause.classList.add('hidden');
      el.hud.classList.add('hidden');
      if(G.zenActive)G.exitZen();else G.quitToMenu();RR.Audio.setVisible(true);
      showTitle();
    });

    // Complete overlay
    el.btnNext.addEventListener('click', () => {
      el.overlayComplete.classList.add('hidden');
      if (G.pendingResult && G.pendingResult.isLast) {
        el.hud.classList.add('hidden');
        showTitle();
      } else {
        G.nextLevel();
      }
    });
    el.btnCompleteRetry.addEventListener('click', () => { el.overlayComplete.classList.add('hidden'); G.retryLevel(); });
    el.btnCompleteMenu.addEventListener('click', () => {
      el.overlayComplete.classList.add('hidden');
      el.hud.classList.add('hidden');
      G.quitToMenu();
      showTitle();
    });

    // Zen
    el.btnZenExit.addEventListener('click', exitZenUI);
    el.btnCinematicExit.addEventListener('click', () => { G.setZenCinematic(false); syncZenUI(); });
    el.btnZenAddOrb.addEventListener('click', () => G.addZenOrb());
    el.btnZenClear.addEventListener('click', () => G.clearZenOrbs());
    el.btnZenRain.addEventListener('click', () => { G.setZenRain(!G.zen.rain); syncZenUI(); });
    el.btnZenTheme.addEventListener('click',()=>{const order=['day','violet','coral','night'],current=RR.Chromatic.activeTheme(G),key=current==='aqua'?'day':current;G.applySettings({visualTheme:'auto'});G.setZenTheme(order[(order.indexOf(key)+1)%order.length]);syncZenUI();});
    el.btnZenCinematic.addEventListener('click', () => { G.setZenCinematic(true); syncZenUI(); });
    el.zenStrength.addEventListener('input', () => G.setZenRippleStrength(parseFloat(el.zenStrength.value)));

    // Game callbacks
    G.on('levelStart', ({ index, level }) => {
      RR.Audio.setVisible(!document.hidden);
      hideOverlays();
      el.hudLevelName.textContent = `${index + 1} · ${level.name}`;
      el.hudTaps.textContent = '0';
      el.levelTip.textContent = level.tip || '';
      el.levelTip.classList.remove('hidden');
      // restart the fade animation
      el.levelTip.style.animation = 'none';
      void el.levelTip.offsetWidth;
      el.levelTip.style.animation = '';
    });
    G.on('tapsChanged', (taps) => { el.hudTaps.textContent = String(taps); });
    G.on('levelComplete', (result) => {
      el.completeStars.textContent = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
      el.completeTaps.textContent = String(result.taps);
      el.completeTime.textContent = result.time.toFixed(1) + 's';
      el.btnNext.textContent = result.isLast ? 'Finish' : 'Next';
      el.overlayComplete.classList.remove('hidden');
    });
    G.on('fail', () => {
      el.overlayFail.classList.remove('hidden');
      const runId=G.runId;
      setTimeout(() => {
        if(G.runId!==runId||G.state!=='fail')return;
        el.overlayFail.classList.add('hidden');
        G.retryLevel();
      }, 700);
    });
  }

  function enterZenUI() {
    hideAllScreens();
    G.enterZen();
    el.zenUi.classList.remove('hidden');
    syncZenUI();
  }
  function exitZenUI() {
    G.exitZen();
    el.zenUi.classList.add('hidden');
    el.btnCinematicExit.classList.add('hidden');
    showTitle();
  }
  function syncZenUI() {
    el.btnZenRain.classList.toggle('active', !!G.zen.rain);
    el.btnZenTheme.textContent=RR.Chromatic.THEMES[RR.Chromatic.activeTheme(G)].name;
    el.zenStrength.value = G.zen.rippleStrength || 1;
    if (G.zen.cinematic) {
      el.zenControls.classList.add('hidden');
      el.btnZenExit.classList.add('hidden');
      el.btnCinematicExit.classList.remove('hidden');
    } else {
      el.zenControls.classList.remove('hidden');
      el.btnZenExit.classList.remove('hidden');
      el.btnCinematicExit.classList.add('hidden');
    }
  }

  function openSettings(){settingsReturn=G.state;if(G.state==='playing'||G.state==='zen'){G.pauseGame();RR.Audio.setVisible(false);}else G.state='settings';hideAllScreens();initSettingsUI();el.modalSettings.classList.remove('hidden');}
  function closeSettings(){el.modalSettings.classList.add('hidden');if(settingsReturn==='playing'||settingsReturn==='zen'){G.resumeGame();RR.Audio.setVisible(true);}else showTitle();}
  function pause(){if(!['playing','zen'].includes(G.state))return;G.pauseGame();el.overlayPause.classList.remove('hidden');RR.Audio.setVisible(false);}
  function resume(){G.resumeGame();el.overlayPause.classList.add('hidden');RR.Audio.setVisible(true);}
  function sync(){const theme=RR.Chromatic.activeTheme(G);if(theme!==lastTheme){document.documentElement.style.setProperty('--accent',RR.Chromatic.THEMES[theme].accent);document.body.dataset.theme=theme;lastTheme=theme;}document.body.classList.toggle('reduced-motion',!!G.settings.reducedMotion);q('hud-theme').textContent=RR.Chromatic.THEMES[theme].name;q('goal-fill').style.width=Math.min(100,G.goalHoldTimer/.55*100)+'%';q('goal-progress').setAttribute('aria-valuenow',String(Math.round(Math.min(100,G.goalHoldTimer/.55*100))));el.btnTitleSound.textContent=G.settings.sound?'♪ Sound on':'♪ Sound off';el.btnTitleSound.setAttribute('aria-pressed',String(G.settings.sound));el.hud.inert=G.state!=='playing';el.zenUi.inert=G.state!=='zen';el.btnCinematicExit.inert=G.state!=='zen';for(const node of document.querySelectorAll('.screen,.overlay'))node.inert=node.classList.contains('hidden');}
  function init() {
    cacheEls();
    bindEvents();
    document.body.classList.toggle('high-contrast', !!G.settings.highContrast);
    showTitle();
    sync();
    document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.repeat)return;const key=e.key.toLowerCase();if(key==='escape'&&!el.modalSettings.classList.contains('hidden')){closeSettings();return;}if(key==='escape'||key==='p'){if(G.state==='paused'&&el.modalSettings.classList.contains('hidden'))resume();else pause();}if(key==='r'&&['playing','zen','paused'].includes(G.state)&&el.modalSettings.classList.contains('hidden')){if(G.zenActive)G.clearZenOrbs();else G.retryLevel();}});
  }

  return { init, showTitle,sync,pause,resume };
})();
