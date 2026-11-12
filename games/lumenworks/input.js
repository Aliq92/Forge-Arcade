import { connectionError } from './network.js';

const SOURCE_TYPES = new Set(['generator', 'substation', 'switch', 'battery']);
const moved = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) > 5;

/** Native mouse, pen and touch input. All coordinates use canvas CSS pixels. */
export class Input {
  constructor(canvas, renderer, callbacks = {}) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.drag = null;
    this._source = null;
    this._pointers = new Map();
    this._gesture = null;
    this._pinch = null;
    this._blocked = false;
    this._lastTool = callbacks.tool?.();
    this._oldTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = 'none';
    this._listeners = [];
    this._listen('pointerdown', event => this._down(event));
    this._listen('pointermove', event => this._move(event));
    this._listen('pointerup', event => this._up(event));
    this._listen('pointercancel', () => this.cancel());
    this._listen('lostpointercapture', event => { if (this._pointers.has(event.pointerId)) this.cancel(); });
    this._listen('wheel', event => this._wheel(event), { passive: false });
    this._listen('contextmenu', event => { if (this._enabled()) { event.preventDefault(); this.cancel(); } });
    this._listen('keydown', event => { if (event.key === 'Escape') this.cancel(); });
  }

  _listen(type, handler, options) { this.canvas.addEventListener(type, handler, options); this._listeners.push([type, handler, options]); }
  _enabled() {
    const tool = this.callbacks.tool?.();
    if (tool !== this._lastTool) { this.cancel(); this._lastTool = tool; }
    if (this.callbacks.active?.() === false) { this.cancel(); return false; }
    return true;
  }
  _point(event) { const rect = this.canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  _board() { return this.callbacks.board?.(); }
  _hit(point, board = this._board()) { return board ? this.renderer.hitNode(point.x, point.y, board) : null; }
  _preview(point) {
    const board = this._board();
    if (!this._source || !board?.nodes.some(n => n.id === this._source)) { this._source = null; this.drag = null; return; }
    const target = this._hit(point, board);
    this.drag = { fromId: this._source, point, valid: !!target && target.id !== this._source && !connectionError(board, this._source, target.id) };
  }
  _pinchState() {
    const [a, b] = [...this._pointers.values()];
    return a && b ? { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) } : null;
  }
  _down(event) {
    if (!this._enabled() || (event.pointerType !== 'touch' && event.button !== 0)) return;
    event.preventDefault();
    const point = this._point(event);
    this._pointers.set(event.pointerId, point);
    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* A pointer can end before capture on a busy device. */ }
    if (this._pointers.size > 1) {
      this._blocked = true;
      this._gesture = null;
      this._source = null;
      this.drag = null;
      this._pinch = this._pinchState();
      return;
    }
    const board = this._board(), node = this._hit(point, board), tool = this.callbacks.tool?.();
    this._gesture = { id: event.pointerId, start: point, last: point, node, tool, moved: false, queuedSource: this._source };
    if (tool === 'cable') {
      if (!this._source && node && SOURCE_TYPES.has(node.type)) this._source = node.id;
      if (this._source) this._preview(point);
    }
  }
  _move(event) {
    if (!this._enabled()) { this.cancel(); return; }
    const point = this._point(event);
    if (!this._pointers.has(event.pointerId)) {
      if (this.callbacks.tool?.() === 'cable' && this._source && event.pointerType !== 'touch') this._preview(point);
      return;
    }
    event.preventDefault();
    this._pointers.set(event.pointerId, point);
    if (this._pointers.size > 1) {
      const next = this._pinchState();
      if (next && this._pinch) {
        this.renderer.pan(next.center.x - this._pinch.center.x, next.center.y - this._pinch.center.y);
        this.renderer.zoomAt(next.distance / this._pinch.distance, next.center.x, next.center.y);
      }
      this._pinch = next;
      return;
    }
    if (this._blocked || !this._gesture || this._gesture.id !== event.pointerId) return;
    const gesture = this._gesture;
    if (moved(point, gesture.start)) gesture.moved = true;
    if (gesture.tool === 'cable' && this._source && (gesture.node || gesture.queuedSource)) {
      this._preview(point);
    } else if (!gesture.node && gesture.moved) {
      this.renderer.pan(point.x - gesture.last.x, point.y - gesture.last.y);
    }
    gesture.last = point;
  }
  _up(event) {
    if (!this._pointers.has(event.pointerId)) return;
    event.preventDefault();
    const point = this._point(event), gesture = this._gesture;
    this._pointers.delete(event.pointerId);
    try { if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId); } catch { /* Native capture may already have ended. */ }
    if (this._blocked) {
      this._pinch = this._pinchState();
      if (!this._pointers.size) { this._blocked = false; this._gesture = null; this._pinch = null; }
      return;
    }
    this._gesture = null;
    if (!this._enabled() || !gesture || gesture.id !== event.pointerId) { this.cancel(); return; }
    const board = this._board(); if (!board) { this.cancel(); return; }
    const tool = this.callbacks.tool?.(), target = this._hit(point, board);
    const hasMoved = gesture.moved || moved(point, gesture.start);
    if (tool === 'cable') {
      if (!this._source) {
        if (!hasMoved && target) this.callbacks.invalid?.('Start a cable at a generator, substation, switch or battery port.');
        return;
      }
      // A background drag always belongs to the camera unless a source was already queued.
      if (!gesture.node && !gesture.queuedSource && hasMoved) { this._source = null; this.drag = null; return; }
      if (target && target.id !== this._source) {
        const error = connectionError(board, this._source, target.id);
        if (error) { this._preview(point); this.callbacks.invalid?.(error); return; }
        const from = this._source;
        this._source = null; this.drag = null;
        this.callbacks.connect?.(from, target.id);
      } else if (target?.id === this._source) {
        if (gesture.queuedSource === this._source && !hasMoved) { this._source = null; this.drag = null; }
        else this._preview(point);
      } else {
        this._preview(point);
        if (hasMoved || gesture.queuedSource) this.callbacks.invalid?.('Release on a destination port to connect the cable.');
      }
      return;
    }
    if (hasMoved) return;
    if (tool === 'place' || String(tool).startsWith('place:')) { this.callbacks.place?.(this.renderer.world(point.x, point.y)); return; }
    if (target) { this.callbacks.node?.(target); return; }
    const edge = this.renderer.hitEdge(point.x, point.y, board);
    if (edge) this.callbacks.edge?.(edge);
  }
  _wheel(event) {
    if (!this._enabled()) return;
    event.preventDefault();
    const point = this._point(event);
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.renderer.height : 1);
    this.renderer.zoomAt(Math.exp(-Math.max(-300, Math.min(300, delta)) * .0015), point.x, point.y);
    if (this._source) this._preview(point);
  }
  cancel() {
    const ids = [...this._pointers.keys()];
    this._pointers.clear(); this._gesture = null; this._pinch = null; this._blocked = false; this._source = null; this.drag = null;
    for (const id of ids) { try { if (this.canvas.hasPointerCapture?.(id)) this.canvas.releasePointerCapture(id); } catch { /* Already released. */ } }
  }
  dispose() {
    this.cancel();
    for (const [type, handler, options] of this._listeners) this.canvas.removeEventListener(type, handler, options);
    this._listeners.length = 0;
    this.canvas.style.touchAction = this._oldTouchAction;
  }
}
