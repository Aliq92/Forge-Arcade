const MOVE_KEYS = {
  KeyW: [0, -1],
  KeyA: [-1, 0],
  KeyS: [0, 1],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowRight: [1, 0],
};

const DRAG_DEADZONE = 6;
const DRAG_MAX_RADIUS = 60;

/**
 * Unifies keyboard and touch/pointer input into a single per-frame snapshot:
 * { moveX, moveY, sprint, sonarPressed, pausePressed }.
 * `sonarPressed` and `pausePressed` are one-shot edges that reset once read.
 */
export function createInputManager(element, actions = {}) {
  const target = element ?? (typeof document !== 'undefined' ? document : null);
  const { movePad, sonarButton, sprintButton, pauseButton } = actions;

  const heldKeys = new Set();
  let shiftHeld = false;
  let sonarQueued = false;
  let pauseQueued = false;
  let touchSprintHeld = false;

  let dragPointerId = null;
  let dragOriginX = 0;
  let dragOriginY = 0;
  let dragX = 0;
  let dragY = 0;

  const listeners = [];
  function on(el, type, handler, opts) {
    if (!el) return;
    el.addEventListener(type, handler, opts);
    listeners.push(() => el.removeEventListener(type, handler, opts));
  }

  function keyToVector() {
    let x = 0;
    let y = 0;
    for (const key of heldKeys) {
      const vec = MOVE_KEYS[key];
      if (!vec) continue;
      x += vec[0];
      y += vec[1];
    }
    return { x, y };
  }

  function handleKeyDown(e) {
    if (e.code in MOVE_KEYS) {
      heldKeys.add(e.code);
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      shiftHeld = true;
    } else if (e.code === 'Space') {
      if (!e.repeat) sonarQueued = true;
      e.preventDefault?.();
    } else if (e.code === 'Escape') {
      if (!e.repeat) pauseQueued = true;
    }
  }

  function handleKeyUp(e) {
    if (e.code in MOVE_KEYS) heldKeys.delete(e.code);
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shiftHeld = false;
  }

  function handleBlur() {
    heldKeys.clear();
    shiftHeld = false;
    touchSprintHeld = false;
    dragPointerId = null;
    dragX = 0;
    dragY = 0;
  }

  on(target, 'keydown', handleKeyDown);
  on(target, 'keyup', handleKeyUp);
  on(typeof window !== 'undefined' ? window : null, 'blur', handleBlur);

  function handlePadPointerDown(e) {
    if (dragPointerId !== null) return;
    dragPointerId = e.pointerId;
    dragOriginX = e.clientX;
    dragOriginY = e.clientY;
    dragX = 0;
    dragY = 0;
    movePad.setPointerCapture?.(e.pointerId);
    e.preventDefault?.();
  }

  function handlePadPointerMove(e) {
    if (e.pointerId !== dragPointerId) return;
    const dx = e.clientX - dragOriginX;
    const dy = e.clientY - dragOriginY;
    const dist = Math.hypot(dx, dy);
    if (dist < DRAG_DEADZONE) {
      dragX = 0;
      dragY = 0;
      return;
    }
    const clamped = Math.min(dist, DRAG_MAX_RADIUS);
    dragX = (dx / dist) * (clamped / DRAG_MAX_RADIUS);
    dragY = (dy / dist) * (clamped / DRAG_MAX_RADIUS);
    e.preventDefault?.();
  }

  function endDrag(e) {
    if (e && e.pointerId !== dragPointerId) return;
    dragPointerId = null;
    dragX = 0;
    dragY = 0;
  }

  if (movePad) {
    on(movePad, 'pointerdown', handlePadPointerDown);
    on(movePad, 'pointermove', handlePadPointerMove);
    on(movePad, 'pointerup', endDrag);
    on(movePad, 'pointercancel', endDrag);
    on(movePad, 'pointerleave', endDrag);
  }

  function handleSonarDown(e) {
    sonarQueued = true;
    sonarButton?.classList.add('active');
    e.preventDefault?.();
  }
  function handleSonarUp() {
    sonarButton?.classList.remove('active');
  }
  if (sonarButton) {
    on(sonarButton, 'pointerdown', handleSonarDown);
    on(sonarButton, 'pointerup', handleSonarUp);
    on(sonarButton, 'pointercancel', handleSonarUp);
    on(sonarButton, 'pointerleave', handleSonarUp);
  }

  function handleSprintDown(e) {
    touchSprintHeld = true;
    sprintButton?.classList.add('active');
    e.preventDefault?.();
  }
  function handleSprintUp() {
    touchSprintHeld = false;
    sprintButton?.classList.remove('active');
  }
  if (sprintButton) {
    on(sprintButton, 'pointerdown', handleSprintDown);
    on(sprintButton, 'pointerup', handleSprintUp);
    on(sprintButton, 'pointercancel', handleSprintUp);
    on(sprintButton, 'pointerleave', handleSprintUp);
  }

  function handlePauseDown(e) {
    pauseQueued = true;
    e.preventDefault?.();
  }
  if (pauseButton) {
    on(pauseButton, 'pointerdown', handlePauseDown);
  }

  function getInput() {
    const keyVec = keyToVector();
    let moveX = keyVec.x + dragX;
    let moveY = keyVec.y + dragY;
    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveY /= magnitude;
    }

    const snapshot = {
      moveX,
      moveY,
      sprint: shiftHeld || touchSprintHeld,
      sonarPressed: sonarQueued,
      pausePressed: pauseQueued,
    };

    sonarQueued = false;
    pauseQueued = false;

    return snapshot;
  }

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const off of listeners.splice(0)) off();
    heldKeys.clear();
  }

  return { getInput, destroy };
}

