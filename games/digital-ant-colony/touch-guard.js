// Mobile touch-intent guard for the Digital Ant Colony canvas.
(function () {
  'use strict';
  const canvas = document.getElementById('canvas');
  if (!canvas || !window.PointerEvent) return;
  canvas.style.touchAction = 'none';
  const touches = new Map();
  const MOVE_THRESHOLD = 8;
  const SYNTH_POINTER_ID = 9001;
  let gesture = null;

  function synth(type, point) {
    canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: SYNTH_POINTER_ID,
      pointerType: 'mouse', isPrimary: true, button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: point.x, clientY: point.y,
    }));
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const point = { x: e.clientX, y: e.clientY };
    touches.set(e.pointerId, point);
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    if (touches.size > 1) {
      if (gesture && gesture.dragging) synth('pointerup', gesture.last);
      gesture = null;
      return;
    }
    gesture = { pointerId: e.pointerId, start: point, last: point, dragging: false };
  }, true);

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const point = { x: e.clientX, y: e.clientY };
    if (touches.has(e.pointerId)) touches.set(e.pointerId, point);
    if (!gesture || gesture.pointerId !== e.pointerId || touches.size !== 1) return;
    if (!gesture.dragging && distance(gesture.start, point) >= MOVE_THRESHOLD) {
      gesture.dragging = true;
      synth('pointerdown', gesture.start);
    }
    if (gesture.dragging) synth('pointermove', point);
    gesture.last = point;
  }, true);

  function endTouch(e) {
    if (e.pointerType !== 'touch') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const point = { x: e.clientX, y: e.clientY };
    const wasSingle = touches.size === 1;
    touches.delete(e.pointerId);
    if (gesture && gesture.pointerId === e.pointerId) {
      if (gesture.dragging) synth('pointerup', point);
      else if (wasSingle) { synth('pointerdown', point); synth('pointerup', point); }
      gesture = null;
    }
  }
  canvas.addEventListener('pointerup', endTouch, true);
  canvas.addEventListener('pointercancel', endTouch, true);
})();
