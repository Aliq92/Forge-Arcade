export function createInput(canvas) {
    const state = {
        pointerHeld: false,
        pointerX: 0,
        pointerY: 0,
        boost: false,
        keys: new Set(),
        touchKeys: new Set(),
        injectedKeys: null,
        pausePressed: false
    };
    const GAME_KEYS = new Set([
        "Space",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "Escape",
        "KeyP"
    ]);
    function setPointer(e) {
        const r = canvas.getBoundingClientRect();
        state.pointerX = e.clientX - r.left;
        state.pointerY = e.clientY - r.top;
    }
    function onPointerDown(e) {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        if (e.target?.closest?.("[data-ui]")) return;
        canvas.setPointerCapture(e.pointerId);
        state.pointerHeld = true;
        setPointer(e);
        e.preventDefault();
    }
    function onPointerMove(e) {
        setPointer(e);
        if (state.pointerHeld) e.preventDefault();
    }
    function onPointerUp(e) {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        state.pointerHeld = false;
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch  {}
    }
    function onKeyDown(e) {
        if (e.repeat) {
            if (GAME_KEYS.has(e.code)) e.preventDefault();
            return;
        }
        state.keys.add(e.code);
        if (e.code === "Escape" || e.code === "KeyP") state.pausePressed = true;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
    }
    function onKeyUp(e) {
        state.keys.delete(e.code);
    }
    function onBlur() {
        state.keys.clear();
        state.touchKeys.clear();
        state.pointerHeld = false;
        state.boost = false;
    }
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return {
        state,
        consumePause () {
            const v = state.pausePressed;
            state.pausePressed = false;
            return v;
        },
        destroy () {
            canvas.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onBlur);
        }
    };
}
export function activeKeys(state) {
    if (state.injectedKeys) return new Set(state.injectedKeys);
    return new Set([
        ...state.keys,
        ...state.touchKeys
    ]);
}
export function keyboardAxis(keys) {
    let x = 0;
    let y = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;
    const m = Math.hypot(x, y);
    if (m > 1) {
        x /= m;
        y /= m;
    }
    return {
        x,
        y
    };
}
