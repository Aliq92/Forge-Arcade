import { CONFIG } from './config.js';

const MIN_DRAG = 12;
const SHOT_SPEED = 780;
const AIM_ZONE_TOP = 520;

export function toLogicalPoint(point, rect) {
  if (!point || !rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)
      || rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: (point.x - rect.left) * CONFIG.logicalWidth / rect.width,
    y: (point.y - rect.top) * CONFIG.logicalHeight / rect.height
  };
}

export function aimFromDrag(start, end) {
  if (!start || !end) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < MIN_DRAG) return null;
  return {
    start: { ...start },
    end: { ...end },
    velocity: { x: dx / distance * SHOT_SPEED, y: dy / distance * SHOT_SPEED }
  };
}

export function createInput(canvas, dispatch) {
  let phase = 'aim';
  let blocked = false;
  let activePointer = null;
  let start = null;

  function pointFor(event) {
    return toLogicalPoint({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect());
  }

  function pointerDown(event) {
    if (blocked) return;
    if (phase === 'shot') {
      dispatch({ type: 'activate' });
      return;
    }
    if (phase !== 'aim' || event.button !== undefined && event.button !== 0) return;
    const point = pointFor(event);
    if (!point || point.y < AIM_ZONE_TOP) return;
    activePointer = event.pointerId;
    start = point;
    canvas.setPointerCapture?.(event.pointerId);
    dispatch({ type: 'aim', aim: null });
  }

  function pointerMove(event) {
    if (event.pointerId !== activePointer || !start || blocked) return;
    dispatch({ type: 'aim', aim: aimFromDrag(start, pointFor(event)) });
  }

  function pointerUp(event) {
    if (event.pointerId !== activePointer || !start) return;
    const aim = blocked ? null : aimFromDrag(start, pointFor(event));
    activePointer = null;
    start = null;
    dispatch({ type: aim ? 'fire' : 'aim', aim });
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);

  return {
    setPhase(value) { phase = value; },
    setBlocked(value) { blocked = Boolean(value); },
    destroy() {
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
    }
  };
}
