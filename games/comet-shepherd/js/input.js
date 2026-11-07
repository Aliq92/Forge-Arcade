import { dist } from './utils.js';
import { CONFIG } from './config.js';

export class InputManager{
  constructor(canvas){
    this.canvas = canvas;
    this.pointerScreen = { x: window.innerWidth/2, y: window.innerHeight/2 - 100 };
    this.dragging = false;
    this.dragStartScreen = null;
    this.lastAimVector = null;
    this.keys = { left:false, right:false,up:false,down:false,brake:false };
    this.pointerId=null;
    this.events = [];
    this.enabled = true;

    canvas.addEventListener('pointerdown', (e) => {
      if(!this.enabled||this.dragging||e.button>0) return;
      this.pointerId=e.pointerId;e.preventDefault?.();
      canvas.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.dragStartScreen = { x: e.clientX, y: e.clientY };
      this.pointerScreen = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointermove', (e) => {
      if(this.dragging&&e.pointerId!==this.pointerId)return;
      this.pointerScreen = { x: e.clientX, y: e.clientY };
    });
    const endDrag = (e) => {
      if(!this.dragging||e.pointerId!==this.pointerId) return;
      this.dragging = false;
      const dx = e.clientX - this.dragStartScreen.x;
      const dy = e.clientY - this.dragStartScreen.y;
      if(Math.hypot(dx, dy) >= CONFIG.CORRECTION_MIN_DRAG){
        this.lastAimVector = { dx, dy };
      }
      this.events.push({ type:'drag_end', start:this.dragStartScreen, end:{x:e.clientX,y:e.clientY} });
      this.dragStartScreen = null;
      this.pointerId=null;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel',e=>{if(e.pointerId===this.pointerId){this.dragging=false;this.dragStartScreen=null;this.pointerId=null;}});
    canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===this.pointerId){this.dragging=false;this.dragStartScreen=null;this.pointerId=null;}});
    canvas.addEventListener('pointerleave', (e) => { if(e.pointerType !== 'touch') return; });

    window.addEventListener('keydown', (e) => {
      if(!this.enabled) return;
      if(/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName))return;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','KeyB'].includes(e.code))e.preventDefault();
      switch(e.code){
        case 'ArrowUp': case 'KeyW': this.keys.up=true;break;
        case 'ArrowDown': this.keys.down=true;break;
        case 'KeyS': case 'KeyB': this.keys.brake=true;break;
        case 'ArrowLeft': case 'KeyA': this.keys.left = true; break;
        case 'ArrowRight': case 'KeyD': this.keys.right = true; break;
        case 'Space': this.events.push({type:'emergency'}); e.preventDefault(); break;
        case 'KeyE': this.events.push({type:'toggle_preview'}); break;
        case 'KeyC': this.events.push({type:'toggle_cinematic'}); break;
        case 'Escape': this.events.push({type:'pause'}); break;
      }
    });
    window.addEventListener('keyup', (e) => {
      switch(e.code){
        case 'ArrowUp': case 'KeyW': this.keys.up=false;break;
        case 'ArrowDown': this.keys.down=false;break;
        case 'KeyS': case 'KeyB': this.keys.brake=false;break;
        case 'ArrowLeft': case 'KeyA': this.keys.left = false; break;
        case 'ArrowRight': case 'KeyD': this.keys.right = false; break;
      }
    });
    window.addEventListener('blur', () => this.reset());
  }

  dragVector(){
    if(!this.dragging || !this.dragStartScreen) return null;
    const dx = this.pointerScreen.x - this.dragStartScreen.x;
    const dy = this.pointerScreen.y - this.dragStartScreen.y;
    const d = Math.hypot(dx, dy);
    return { dx, dy, dist: d, strengthFrac: Math.min(1, Math.max(0, (d - CONFIG.CORRECTION_MIN_DRAG) / (CONFIG.CORRECTION_MAX_DRAG - CONFIG.CORRECTION_MIN_DRAG))) };
  }

  pollEvents(){ const e = this.events; this.events = []; return e; }

  reset(){
    this.dragging=false;this.dragStartScreen=null;this.pointerId=null;this.lastAimVector=null;this.events=[];
    for(const k of Object.keys(this.keys))this.keys[k]=false;
    this.touchButtons?.forEach(b=>b.setAttribute('aria-pressed','false'));
  }
  bindTouchControls(root){
    this.touchButtons=[...root.querySelectorAll('[data-steer]')];
    for(const button of this.touchButtons){
      let pointer=null;
      button.addEventListener('pointerdown',e=>{
        if(pointer!==null||!this.enabled)return;e.preventDefault();pointer=e.pointerId;button.setPointerCapture(pointer);
        this.keys[button.dataset.steer]=true;button.setAttribute('aria-pressed','true');
      });
      const stop=e=>{if(e.pointerId!==pointer)return;pointer=null;this.keys[button.dataset.steer]=false;button.setAttribute('aria-pressed','false');};
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,stop);
    }
  }

  setEnabled(v){
    this.enabled = v;
    if(!v)this.reset();
  }
}
