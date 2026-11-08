// Ripple Run - bootstrap: canvas setup, input capture, main loop
(function () {
  const canvas = document.getElementById('game-canvas');
  const ctx = RR.Renderer.init(canvas);

  function applyCanvasSize(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  const container = document.getElementById('app');
  let W = container.clientWidth || window.innerWidth;
  let H = container.clientHeight || window.innerHeight;
  let initialized = false;

  function boot(w, h) {
    applyCanvasSize(w, h);
    if (!initialized) {
      RR.Game.init(w, h);
      RR.UI.init();
      initialized = true;
    } else {
      RR.Game.resize(w, h);
    }
  }

  if (W > 0 && H > 0) boot(W, H);

  function onResize() {
    W = container.clientWidth || window.innerWidth;
    H = container.clientHeight || window.innerHeight;
    if (W <= 0 || H <= 0) return; // ignore transient zero-size layout passes
    boot(W, H);
  }
  window.addEventListener('resize', debounce(onResize, 150));
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

  // Robust fallback: catches viewport becoming available/changing even when
  // no window 'resize' event fires (embedded panes, mobile chrome show/hide).
  if (window.ResizeObserver) {
    let lastW = W, lastH = H;
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      if (w > 0 && h > 0) boot(w, h);
    });
    ro.observe(container);
  }

  // ---- Input: unified pointer handling, tap-to-ripple ----
  function tapAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    RR.Game.handleTap(x, y);
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tapAt(e.clientX, e.clientY);
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // ---- Main loop ----
  let last = performance.now();
  function frame(now) {
    if (!initialized) {
      last = now;
      requestAnimationFrame(frame);
      return;
    }
    let dt = (now - last) / 1000;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 1 / 20);
    last = now;

    RR.Game.update(dt);
    RR.Renderer.render(dt, RR.Game.getRenderState());

    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) last = performance.now();
  });

  requestAnimationFrame(frame);
})();
