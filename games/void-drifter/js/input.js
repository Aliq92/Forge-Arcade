// ---------------- Input: keyboard + mobile touch buttons ----------------
class InputManager {
  constructor() {
    this.keys = new Set();
    this.touch = { thrust: false, reverse: false, left: false, right: false, boost: false };
    this._pauseCb = null;
    this._interactCb = null;
    this._anyKeyCb = null;
    this._reserveCb=null;this.buttons=[];this._touchResetters=[];

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));
    window.addEventListener('blur', () => this.clearHeld());

    this._bindTouchButton('touchLeft', 'left');
    this._bindTouchButton('touchRight', 'right');
    this._bindTouchButton('touchThrust', 'thrust');
    this._bindTouchButton('touchReverse', 'reverse');
    this._bindTouchButton('touchBoost', 'boost');
  }

  onPause(cb) { this._pauseCb = cb; }
  onInteract(cb) { this._interactCb = cb; }
  onAnyKey(cb) { this._anyKeyCb = cb; }
  onReserve(cb){this._reserveCb=cb;}

  _onKeyDown(e) {
    if(/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName))return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
    if (this._anyKeyCb) this._anyKeyCb(e.code);
    if(e.repeat)return;
    if (e.code === 'Escape' && this._pauseCb) this._pauseCb();
    if (e.code === 'KeyE' && this._interactCb) this._interactCb();
    if(e.code==='KeyR'&&this._reserveCb)this._reserveCb();
  }
  _onKeyUp(e) { this.keys.delete(e.code); }

  _bindTouchButton(id, flag) {
    const el = document.getElementById(id);
    if (!el) return;
    this.buttons.push(el);let pointer=null;
    this._touchResetters.push(()=>{const previous=pointer;pointer=null;if(previous!==null&&el.hasPointerCapture?.(previous))el.releasePointerCapture(previous);});
    el.setAttribute('aria-pressed','false');
    el.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;el.setPointerCapture(pointer);this.touch[flag]=true;el.setAttribute('aria-pressed','true');});
    const end=e=>{if(e.pointerId!==pointer)return;pointer=null;this.touch[flag]=false;el.setAttribute('aria-pressed','false');};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,end);
  }

  isDown(...codes) { return codes.some((c) => this.keys.has(c)); }

  getState() {
    return {
      thrust: this.isDown('KeyW', 'ArrowUp') || this.touch.thrust,
      reverse: this.isDown('KeyS', 'ArrowDown') || this.touch.reverse,
      left: this.isDown('KeyA', 'ArrowLeft') || this.touch.left,
      right: this.isDown('KeyD', 'ArrowRight') || this.touch.right,
      boost: this.isDown('Space') || this.touch.boost,
    };
  }

  clearHeld() { this.keys.clear();this._touchResetters.forEach(reset=>reset()); Object.keys(this.touch).forEach((k) => (this.touch[k] = false));this.buttons.forEach(b=>b.setAttribute('aria-pressed','false')); }
}
