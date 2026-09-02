// touch.js — on-screen touch controls for mobile/tablet play. Drives the same
// InputTracker key set the keyboard uses, so no game/physics code needs to know
// input came from a finger instead of a key.
export class TouchControls {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.root = document.getElementById('touch-controls');
    this.buttons = {
      left: document.getElementById('tc-left'),
      right: document.getElementById('tc-right'),
      jump: document.getElementById('tc-jump'),
      interact: document.getElementById('tc-interact'),
      record: document.getElementById('tc-record'),
      reset: document.getElementById('tc-reset'),
      pause: document.getElementById('tc-pause'),
    };

    this._bindKey('left', 'ArrowLeft');
    this._bindKey('right', 'ArrowRight');
    this._bindKey('jump', 'Space');
    this._bindKey('interact', 'KeyE');
    this._bindKey('record', 'KeyR');
    this._bindKey('reset', 'KeyQ');

    const pauseDown = (e) => {
      e.preventDefault();
      if (this.buttons.pause.setPointerCapture) {
        try { this.buttons.pause.setPointerCapture(e.pointerId); } catch (_) {}
      }
      if (this.game.state === 'playing') this.game.pause();
    };
    this.buttons.pause.addEventListener('pointerdown', pauseDown);

    this._watchDeviceType();
  }

  // Holding a touch button is equivalent to holding the matching key. Pointer
  // capture keeps a held control active even when a finger drifts a few pixels
  // outside the visible button — a common source of dropped mobile input.
  _bindKey(name, code) {
    const el = this.buttons[name];
    let activePointerId = null;

    const press = (e) => {
      e.preventDefault();
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      if (el.setPointerCapture) {
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      }
      this.game.input.keys.add(code);
      el.classList.add('pressed');
    };

    const release = (e) => {
      if (e) e.preventDefault();
      if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
      if (activePointerId !== null && el.releasePointerCapture) {
        try {
          if (el.hasPointerCapture && el.hasPointerCapture(activePointerId)) {
            el.releasePointerCapture(activePointerId);
          }
        } catch (_) {}
      }
      activePointerId = null;
      this.game.input.keys.delete(code);
      el.classList.remove('pressed');
    };

    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  }

  _watchDeviceType() {
    const check = () => {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const touchCapable = coarse || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.enabled = touchCapable || window.innerWidth < 820;
      document.body.classList.toggle('touch-mode', this.enabled);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
  }

  // called once per frame from main.js, alongside ui.syncScreens()/syncHUD()
  sync() {
    const visible = this.enabled && this.game.state === 'playing';
    this.root.classList.toggle('hidden', !visible);
    if (visible) this.buttons.record.classList.toggle('active', this.game.recorder.isRecording);
  }
}
