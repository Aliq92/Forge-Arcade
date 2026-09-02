// Mobile touch-intent guard for Wildfire Simulator.
// Single-finger taps/drags are forwarded to the existing tool path only after
// intent is clear. Two-finger gestures adjust zoom without igniting the map.
(function () {
  'use strict';
  const stage = document.getElementById('canvas-stage');
  const zoomIn = document.getElementById('cam-zoom-in');
  const zoomOut = document.getElementById('cam-zoom-out');
  if (!stage || !window.PointerEvent) return;

  stage.style.touchAction = 'none';
  const touches = new Map();
  const MOVE_THRESHOLD = 8;
  const PINCH_STEP = 1.14;
  const SYNTH_POINTER_ID = 9101;
  let gesture = null;
  let pinchDistance = 0;

  function synth(type, point) {
    stage.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: SYNTH_POINTER_ID,
      pointerType: 'mouse', isPrimary: true, button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: point.x, clientY: point.y,
    }));
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pairDistance = () => {
    const pts = [...touches.values()];
    return pts.length >= 2 ? distance(pts[0], pts[1]) : 0;
  };

  function cancelSingleGesture() {
    if (gesture && gesture.dragging) synth('pointerup', gesture.last);
    gesture = null;
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const point = { x: e.clientX, y: e.clientY };
    touches.set(e.pointerId, point);
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}

    if (touches.size === 2) {
      cancelSingleGesture();
      pinchDistance = pairDistance();
      return;
    }
    if (touches.size > 2) return;
    gesture = { pointerId: e.pointerId, start: point, last: point, dragging: false };
  }, true);

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const point = { x: e.clientX, y: e.clientY };
    if (touches.has(e.pointerId)) touches.set(e.pointerId, point);

    if (touches.size >= 2) {
      const nextDistance = pairDistance();
      if (pinchDistance > 0 && nextDistance > 0) {
        const ratio = nextDistance / pinchDistance;
        if (ratio >= PINCH_STEP) {
          zoomIn && zoomIn.click();
          pinchDistance = nextDistance;
        } else if (ratio <= 1 / PINCH_STEP) {
          zoomOut && zoomOut.click();
          pinchDistance = nextDistance;
        }
      }
      return;
    }

    if (!gesture || gesture.pointerId !== e.pointerId) return;
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
    if (touches.size < 2) pinchDistance = 0;
  }

  stage.addEventListener('pointerup', endTouch, true);
  stage.addEventListener('pointercancel', endTouch, true);
})();
