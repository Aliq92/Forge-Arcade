// ui.js — DOM menu wiring and HUD sync. Keeps all direct DOM access in one place.
import { LEVELS, CHAPTERS, chapterOf, levelById } from './levels.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game, audio) {
    this.game = game;
    this.audio = audio;
    this.el = {
      hud: $('hud'),
      hudChapter: $('hud-chapter'),
      hudRoom: $('hud-room'),
      hudEchoCount: $('hud-echo-count'),
      timelineWrap: $('timeline-wrap'),
      timelineTime: $('timeline-time'),
      timelineFill: $('timeline-fill'),
      timelineMarkers: $('timeline-markers'),
      hintBanner: $('hint-banner'),
      toast: $('toast'),
      fps: $('fps-counter'),
      rotateHint: $('rotate-hint'),
      screens: {
        title: $('screen-title'),
        levelSelect: $('screen-level-select'),
        howToPlay: $('screen-how-to-play'),
        settings: $('screen-settings'),
        paused: $('screen-pause'),
        roomComplete: $('screen-room-complete'),
      },
      levelGrid: $('level-grid'),
      rcTitle: $('rc-title'),
      rcStats: $('rc-stats'),
      rcFragment: $('rc-fragment'),
    };
    this._bind();
    this._buildLevelGrid();
    this._syncSettingsInputs();
  }

  _bind() {
    const g = this.game;
    const click = (id, fn) => $(id).addEventListener('click', () => { this.audio.uiClick(); fn(); });

    click('btn-begin', () => { this.audio.resume(); g.loadLevel(Math.min(g.progress.unlockedLevel, LEVELS.length)); });
    click('btn-level-select', () => { this.audio.resume(); g.goLevelSelect(); this._buildLevelGrid(); });
    click('btn-how-to-play', () => g.goHowToPlay());
    click('btn-settings', () => g.goSettings());
    click('btn-ls-back', () => g.goTitle());
    click('btn-htp-back', () => g.backFromSubmenu());
    click('btn-set-back', () => g.backFromSubmenu());

    click('btn-resume', () => g.resume());
    click('btn-pause-restart', () => g.restartRoom());
    click('btn-pause-clear-last', () => g.clearLastEcho());
    click('btn-pause-clear', () => { g.clearAllEchoes(); });
    click('btn-pause-settings', () => g.goSettings());
    click('btn-pause-levelselect', () => { g.quitToLevelSelect(); this._buildLevelGrid(); });
    click('btn-pause-title', () => g.quitToTitle());

    click('btn-rc-next', () => {g.nextLevel();if(g.state==='levelSelect')this._buildLevelGrid();});
    click('btn-rc-levelselect', () => { g.quitToLevelSelect(); this._buildLevelGrid(); });
    click('btn-rc-replay',()=>g.restartRoom());
    click('btn-rc-title',()=>g.goTitle());

    click('btn-clear-last', () => g.clearLastEcho());
    click('btn-clear-all', () => g.clearAllEchoes());
    click('btn-restart-room', () => g.restartRoom());

    $('set-music').addEventListener('input', (e) => { g.settings.musicVolume = parseFloat(e.target.value); g.saveSettings(); this.audio.setVolumes(g.settings); });
    $('set-sfx').addEventListener('input', (e) => { g.settings.sfxVolume = parseFloat(e.target.value); g.saveSettings(); this.audio.setVolumes(g.settings); });
    $('set-shake').addEventListener('change', (e) => { g.settings.screenShake = e.target.checked; g.saveSettings(); });
    $('set-trail').addEventListener('input', (e) => { g.settings.echoTrailIntensity = parseFloat(e.target.value); g.saveSettings(); });
    $('set-reduced').addEventListener('change', (e) => { g.settings.reducedMotion = e.target.checked; g.saveSettings(); });
    $('set-fps').addEventListener('change', (e) => { g.settings.showFPS = e.target.checked; g.saveSettings(); this.el.fps.classList.toggle('hidden', !e.target.checked); });
    $('set-sound-enabled').addEventListener('change',e=>{g.settings.muted=!e.target.checked;g.saveSettings();this.audio.setVolumes(g.settings);});

    g.on((evt) => this._onGameEvent(evt));
  }

  _onGameEvent(evt) {
    switch (evt.type) {
      case 'recordStart': this.audio.recordStart(); break;
      case 'jump':this.audio.jump();break;
      case 'land':this.audio.land();break;
      case 'echoMaterialize':this.audio.echoMaterialize();break;
      case 'echoHolding':this.game._showToast('E'+(evt.index+1)+' HOLDING POSITION');break;
      case 'recordStop': this.audio.recordStop(); this.audio.rewind(); break;
      case 'recordExpired': this.audio.death(); break;
      case 'death': this.audio.death(); break;
      case 'manualReset': break;
      case 'roomComplete':
        this.audio.levelComplete();
        this._showRoomComplete();
        break;
      case 'objectEvents':
        for (const e of evt.events) {
          if (e.type === 'switchToggle' || e.type === 'plateOn') this.audio.switchClick();
          if (e.type === 'doorOpen' || e.type === 'doorClose') this.audio.doorMove();
        }
        break;
    }
  }

  _syncSettingsInputs() {
    const s = this.game.settings;
    $('set-music').value = s.musicVolume;
    $('set-sfx').value = s.sfxVolume;
    $('set-shake').checked = s.screenShake;
    $('set-trail').value = s.echoTrailIntensity;
    $('set-reduced').checked = s.reducedMotion;
    $('set-fps').checked = s.showFPS;
    $('set-sound-enabled').checked=!s.muted;
    this.el.fps.classList.toggle('hidden', !s.showFPS);
  }

  _buildLevelGrid() {
    const grid = this.el.levelGrid;
    grid.innerHTML = '';
    let lastChapter = null;
    for (const level of LEVELS) {
      if (level.chapter !== lastChapter) {
        lastChapter = level.chapter;
        const ch = chapterOf(level);
        const h = document.createElement('div');
        h.className = 'chapter-heading';
        h.textContent = `${ch.title} — ${ch.subtitle}`;
        grid.appendChild(h);
      }
      const unlocked = this.game.isLevelUnlocked(level.id);
      const completed = !!this.game.progress.completed[level.id];
      const btn = document.createElement('button');
      btn.className = 'level-tile' + (unlocked ? '' : ' locked') + (completed ? ' completed' : '');
      const mastered = completed && level.parEchoes != null && this.game.progress.completed[level.id].bestEchoes <= level.parEchoes;
      btn.innerHTML = `${mastered ? '<span class="lv-mastered">★</span>' : ''}<span class="lv-num">${level.id}</span><span class="lv-name">${level.name}</span>`;
      if (unlocked) {
        btn.addEventListener('click', () => { this.audio.resume(); this.audio.uiClick(); this.game.loadLevel(level.id); });
      }
      grid.appendChild(btn);
    }
  }

  _showRoomComplete() {
    const g = this.game;
    const stats = g.completeStats;
    const def = g.levelDef;
    this.el.rcTitle.textContent = stats.isLast ? 'THE FINAL ECHO — COMPLETE!' : 'LEVEL COMPLETE!';
    this.el.rcStats.innerHTML = `
      <div class="row"><span>Level</span><span>${def.id} / ${LEVELS.length}</span></div>
      <div class="row"><span>Time</span><span>${stats.timeSec.toFixed(1)}s${stats.isBest ? ' (best)' : ''}</span></div>
      <div class="row"><span>Echoes Used</span><span>${stats.echoesUsed}${def.parEchoes != null ? ` (par ${def.parEchoes})` : ''}</span></div>
      <div class="row"><span>Total Recording Time</span><span>${stats.recordingSec.toFixed(1)}s</span></div>
      ${stats.mastered ? '<div class="row"><span>Mastery</span><span>★ within par</span></div>' : ''}
      ${stats.isLast?'<div class="row"><span>Adventure progress</span><span>'+Object.keys(g.progress.completed).length+' / '+LEVELS.length+' levels</span></div>':''}
    `;
    this.el.rcFragment.textContent = def.fragment || '';
    $('btn-rc-next').textContent = stats.isLast ? 'LEVEL SELECT' : 'NEXT LEVEL';
    $('btn-rc-levelselect').classList.toggle('hidden',stats.isLast);
  }

  // ------------------------------------------------------------ per-frame sync
  syncScreens() {
    const g = this.game;
    const map = {
      title: 'title', levelSelect: 'levelSelect', howToPlay: 'howToPlay',
      settings: 'settings', paused: 'paused', roomComplete: 'roomComplete',
    };
    for (const key in this.el.screens) {
      const shouldShow = map[key] === g.state;
      this.el.screens[key].classList.toggle('hidden', !shouldShow);
    }
    const inGameplay = g.state === 'playing' || g.state === 'paused';
    this.el.hud.classList.toggle('hidden', !inGameplay);
    // actual visibility is further restricted to portrait/narrow screens via CSS media queries
    this.el.rotateHint.classList.toggle('hidden', !inGameplay);
    document.body.classList.toggle('reduced-motion',g.settings.reducedMotion);
  }

  syncHUD() {
    const g = this.game;
    if (g.state !== 'playing' && g.state !== 'paused') return;
    const def = g.levelDef;
    const ch = chapterOf(def);
    this.el.hudChapter.textContent = `${ch.subtitle} · `;
    this.el.hudRoom.textContent = `${def.id}. ${def.name}`;
    const holding=g.recorder.echoes.filter(e=>g.attemptTick>=e.inputs.length).length;
    this.el.hudEchoCount.textContent = `ECHOES ${g.recorder.echoes.length} / ${def.maxEchoes}`;

    if (def.maxEchoes === 0) {
      this.el.timelineWrap.classList.add('hidden');
    } else {
      this.el.timelineWrap.classList.remove('hidden');
      const maxSec = def.recordingTime;
      const maxPlayback=Math.max(0,...g.recorder.echoes.map(e=>e.inputs.length));
      const cur = g.recorder.isRecording ? g.recorder.buffer.length / 60 :Math.min(maxPlayback,g.attemptTick)/60;
      const duration=g.recorder.isRecording?maxSec:maxPlayback/60||maxSec;
      $('timeline-status').textContent=g.recorder.isRecording?'RECORDING':maxPlayback?'PLAYBACK · '+holding+' HOLDING':'READY · R TO RECORD';
      this.el.timelineTime.textContent = `${cur.toFixed(1)}s / ${duration.toFixed(1)}s`;
      const pct = Math.min(100, (cur / duration) * 100);
      this.el.timelineFill.style.width = `${pct}%`;
      this.el.timelineFill.style.background = g.recorder.isRecording
        ? 'linear-gradient(90deg, rgba(255,140,160,0.5), rgba(255,93,122,0.85))'
        : 'linear-gradient(90deg, rgba(127,227,255,0.35), rgba(127,227,255,0.75))';

      const markerKey=g.recorder.echoes.map(e=>e.id).join(',')+':'+duration;
      if(this._markerKey!==markerKey){this._markerKey=markerKey;this.el.timelineMarkers.innerHTML = '';
      for (const echo of g.recorder.echoes) {
        const m = document.createElement('div');
        m.className = 'timeline-marker';
        m.style.left = `${Math.min(100, (echo.inputs.length / 60 / duration) * 100)}%`;
        this.el.timelineMarkers.appendChild(m);
      }
      }
    }

    // hint banner: show the most recent visible hint
    const visible = g.activeHints.filter((h) => h.shown);
    const hint = visible[visible.length - 1];
    if (hint) {
      this.el.hintBanner.textContent = hint.text;
      this.el.hintBanner.classList.add('visible');
    } else {
      this.el.hintBanner.classList.remove('visible');
    }

    if (g.toast) {
      this.el.toast.textContent = g.toast.text;
      this.el.toast.classList.add('visible');
    } else {
      this.el.toast.classList.remove('visible');
    }

    if (g.settings.showFPS && this._fps != null) this.el.fps.textContent = `${this._fps} FPS`;
  }

  setFPS(fps) { this._fps = fps; }
}
