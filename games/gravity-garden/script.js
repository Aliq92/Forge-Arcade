'use strict';
(function(){
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, prevW = null, prevH = null;

  // ---------- constants ----------
  const G = 1400;
  const SOFTEN = 26;
  const WELL_MIN_MASS = 0.25;
  const WELL_MAX_MASS = 5.0;
  const WELL_BASE_R = 9;
  const MAX_WELLS = 16;
  const isMobile = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || window.innerWidth < 700;
  const MAX_PARTICLES = isMobile ? 400 : 800;
  const FIXED_STEP = 16.6667;
  const MAX_FRAME_MS = 250;
  const MAX_STEPS_PER_FRAME = 40;
  const HOLD_MS = 480;
  const DRAG_THRESHOLD = 8;
  const MERGE_OVERLAP_FACTOR = 0.55;
  const TRAIL_LENGTHS = { off: 0, short: 6, medium: 14, long: 24 };
  const SPEED_STEPS = [0.25, 0.5, 1, 2, 4, 8];
  const MAX_SPEED = 42; // safety clamp on particle speed (units/tick)
  const STORAGE_KEY = 'gravityGardenSettings';

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const wellRadius = (mass) => WELL_BASE_R + (mass - 1) * 4;

  function toast(msg, ms){
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms || 1600);
  }

  // ---------- settings (persisted) ----------
  const settings = {
    speed: 1,
    trail: 'medium',
    color: 'velocity',
    field: 'off',
    boundary: 'wrap',
    reducedMotion: false,
    merge: true,
    absorb: true,
    com: false
  };
  function loadSettings(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw){
        const parsed = JSON.parse(raw);
        Object.assign(settings, parsed);
      }
    } catch (e) { /* ignore corrupt storage */ }
  }
  function saveSettings(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // ---------- state ----------
  const wells = [];
  const particles = [];
  const flashes = [];
  const sparks = [];
  let wellCounter = 0;
  let selectedWell = null;
  let nextWellPolarity = 1;
  let paused = false;
  let currentPresetKey = 'classic';

  // ---------- starfield (normalized, stable across resize) ----------
  let stars = [];
  function initStars(){
    stars = [];
    const layers = [
      { count: 55, rMin: 0.3, rMax: 0.8, aMin: 0.1, aMax: 0.35, speed: [0.0004, 0.0009] },
      { count: 34, rMin: 0.6, rMax: 1.2, aMin: 0.2, aMax: 0.5, speed: [0.0007, 0.0014] },
      { count: 8,  rMin: 1.2, rMax: 1.9, aMin: 0.35, aMax: 0.6, speed: [0.001, 0.002] }
    ];
    for (const layer of layers){
      for (let i = 0; i < layer.count; i++){
        stars.push({
          nx: Math.random(), ny: Math.random(),
          r: rand(layer.rMin, layer.rMax),
          baseAlpha: rand(layer.aMin, layer.aMax),
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: rand(layer.speed[0], layer.speed[1])
        });
      }
    }
  }

  // ---------- resize ----------
  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const newW = window.innerWidth, newH = window.innerHeight;
    if (newW <= 0 || newH <= 0) return; // layout not settled yet
    if (prevW && prevH && (newW !== prevW || newH !== prevH)){
      const sx = newW / prevW, sy = newH / prevH;
      for (const w of wells){ w.x *= sx; w.y *= sy; }
      for (const p of particles){ p.x *= sx; p.y *= sy; p.trail.length = 0; }
    }
    W = newW; H = newH;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    prevW = W; prevH = H;
    fieldGrid = null; // force rebuild at new resolution
  }
  window.addEventListener('resize', resize);

  // ---------- velocity color ----------
  function velocityColor(speed){
    const t = Math.min(speed / 2.2, 1);
    const r = Math.round(111 + (255 - 111) * t);
    const g = Math.round(214 + (235 - 214) * t);
    const b = Math.round(208 + (190 - 208) * t);
    return `${r}, ${g}, ${b}`;
  }
  const CYAN = [111, 214, 208];
  const GOLD = [232, 184, 114];
  const CORAL = [255, 122, 105];
  function polarityColor(bias){
    // bias: -1 (repel dominant) .. 0 (neutral, cyan) .. 1 (attract dominant)
    if (bias >= 0){
      const t = clamp(bias, 0, 1);
      return [lerp(CYAN[0], GOLD[0], t), lerp(CYAN[1], GOLD[1], t), lerp(CYAN[2], GOLD[2], t)];
    }
    const t = clamp(-bias, 0, 1);
    return [lerp(CYAN[0], CORAL[0], t), lerp(CYAN[1], CORAL[1], t), lerp(CYAN[2], CORAL[2], t)];
  }

  // ---------- wells ----------
  function addWell(x, y, polarity, mass){
    if (wells.length >= MAX_WELLS){ toast('Max wells reached'); return null; }
    const m = clamp(mass || 1, WELL_MIN_MASS, WELL_MAX_MASS);
    const w = {
      x, y,
      mass: m,
      r: wellRadius(m),
      polarity: polarity || 1,
      locked: false,
      pulsePhase: Math.random() * Math.PI * 2,
      id: wellCounter++
    };
    wells.push(w);
    updateStats();
    return w;
  }
  function deleteWell(w){
    const idx = wells.indexOf(w);
    if (idx >= 0) wells.splice(idx, 1);
    if (selectedWell === w) deselectWell();
    updateStats();
  }
  function togglePolarity(w){ w.polarity *= -1; }
  function setWellMass(w, m){
    w.mass = clamp(m, WELL_MIN_MASS, WELL_MAX_MASS);
    w.r = wellRadius(w.mass);
  }
  function duplicateWell(w){
    if (wells.length >= MAX_WELLS){ toast('Max wells reached'); return; }
    const angle = Math.random() * Math.PI * 2;
    const offset = w.r * 2 + 18;
    const nx = clamp(w.x + Math.cos(angle) * offset, 10, W - 10);
    const ny = clamp(w.y + Math.sin(angle) * offset, 10, H - 10);
    const nw = addWell(nx, ny, w.polarity, w.mass);
    if (nw) selectWell(nw);
  }

  function selectWell(w){
    selectedWell = w;
    updateInspector();
    document.getElementById('inspector').style.display = 'block';
  }
  function deselectWell(){
    selectedWell = null;
    document.getElementById('inspector').style.display = 'none';
  }
  function updateInspector(){
    if (!selectedWell) return;
    const label = selectedWell.polarity > 0 ? 'ATTRACT' : 'REPEL';
    document.getElementById('inspTitle').textContent = `${label} · MASS ${selectedWell.mass.toFixed(2)}`;
    document.getElementById('massVal').textContent = selectedWell.mass.toFixed(2);
    document.getElementById('inspLock').textContent = selectedWell.locked ? 'Locked' : 'Lock';
    document.getElementById('inspLock').classList.toggle('active', selectedWell.locked);
  }

  // ---------- particles ----------
  function canSpawn(){ return particles.length < MAX_PARTICLES; }
  function spawnParticle(x, y, vx, vy){
    if (!canSpawn()) return false;
    particles.push({ x, y, vx, vy, trail: [], age: 0, polarityBias: 0 });
    return true;
  }
  function spawnBatch(n, fn){
    let spawned = 0;
    for (let i = 0; i < n; i++){
      if (!canSpawn()){ toast('Particle cap reached'); break; }
      fn(i);
      spawned++;
    }
    updateStats();
    return spawned;
  }

  function seedParticles(n){
    spawnBatch(n, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.min(W, H) * 0.35;
      const cx = W / 2 + (Math.random() - 0.5) * 40;
      const cy = H / 2 + (Math.random() - 0.5) * 40;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const speed = 20 + Math.random() * 40;
      const perp = angle + Math.PI / 2;
      spawnParticle(x, y, Math.cos(perp) * speed * 0.02, Math.sin(perp) * speed * 0.02);
    });
  }

  function spawnBurst(x, y){
    const n = 40;
    spawnBatch(n, (i) => {
      const angle = (i / n) * Math.PI * 2;
      const speed = 0.6 + Math.random() * 0.6;
      spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
    });
  }

  function spawnStream(sx, sy, ex, ey){
    const dx = ex - sx, dy = ey - sy;
    const len = Math.min(Math.hypot(dx, dy), 260);
    if (len < DRAG_THRESHOLD) return;
    const angle = Math.atan2(dy, dx);
    const speed = clamp(len * 0.012, 0.4, 2.6);
    const n = clamp(Math.round(len / 8), 6, 26);
    spawnBatch(n, () => {
      const spread = (Math.random() - 0.5) * 0.28;
      const a = angle + spread;
      const px = sx + (Math.random() - 0.5) * 6;
      const py = sy + (Math.random() - 0.5) * 6;
      spawnParticle(px, py, Math.cos(a) * speed, Math.sin(a) * speed);
    });
  }

  function spawnRing(x, y){
    const nearWell = findWellAt(x, y, 140);
    const count = 30;
    const radius = 46;
    spawnBatch(count, (i) => {
      const angle = (i / count) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      let vx, vy;
      if (nearWell){
        const perp = angle + Math.PI / 2;
        const speed = 0.9;
        vx = Math.cos(perp) * speed; vy = Math.sin(perp) * speed;
      } else {
        vx = Math.cos(angle) * 0.3; vy = Math.sin(angle) * 0.3;
      }
      spawnParticle(px, py, vx, vy);
    });
  }

  function spawnCloud(x, y){
    const count = 26;
    spawnBatch(count, () => {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 34;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      const vx = (Math.random() - 0.5) * 0.6;
      const vy = (Math.random() - 0.5) * 0.6;
      spawnParticle(px, py, vx, vy);
    });
  }

  function clearParticles(){ particles.length = 0; updateStats(); }
  function clearWells(){ wells.length = 0; deselectWell(); updateStats(); }
  function clearAll(){ wells.length = 0; particles.length = 0; flashes.length = 0; sparks.length = 0; deselectWell(); updateStats(); }

  function updateStats(){
    document.getElementById('wellCount').textContent = wells.length;
    document.getElementById('particleCount').textContent = particles.length;
  }

  // ---------- physics ----------
  function simulateStep(dt){
    const absorb = settings.absorb;
    for (let pi = particles.length - 1; pi >= 0; pi--){
      const p = particles[pi];
      let ax = 0, ay = 0, attractMag = 0, repelMag = 0;
      for (let wi = 0; wi < wells.length; wi++){
        const w = wells[wi];
        const dx = w.x - p.x, dy = w.y - p.y;
        const distSq = dx * dx + dy * dy + SOFTEN * SOFTEN;
        const d = Math.sqrt(distSq);
        const force = (G * w.mass * w.polarity) / distSq;
        ax += force * dx / d;
        ay += force * dy / d;
        const mag = Math.abs(force);
        if (w.polarity > 0) attractMag += mag; else repelMag += mag;
      }
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.vx *= 0.9995;
      p.vy *= 0.9995;

      const spd = Math.hypot(p.vx, p.vy);
      if (spd > MAX_SPEED){
        const s = MAX_SPEED / spd;
        p.vx *= s; p.vy *= s;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;

      const total = attractMag + repelMag;
      const targetBias = total > 0 ? (attractMag - repelMag) / total : 0;
      p.polarityBias = lerp(p.polarityBias, targetBias, 0.08);

      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.vx) || !isFinite(p.vy)){
        particles.splice(pi, 1);
        continue;
      }

      let wrapped = false;
      const margin = 60;
      if (settings.boundary === 'wrap'){
        if (p.x < -margin){ p.x = W + margin; wrapped = true; }
        else if (p.x > W + margin){ p.x = -margin; wrapped = true; }
        if (p.y < -margin){ p.y = H + margin; wrapped = true; }
        else if (p.y > H + margin){ p.y = -margin; wrapped = true; }
      } else if (settings.boundary === 'bounce'){
        if (p.x < 0){ p.x = 0; p.vx = Math.abs(p.vx) * 0.7; }
        else if (p.x > W){ p.x = W; p.vx = -Math.abs(p.vx) * 0.7; }
        if (p.y < 0){ p.y = 0; p.vy = Math.abs(p.vy) * 0.7; }
        else if (p.y > H){ p.y = H; p.vy = -Math.abs(p.vy) * 0.7; }
      } else if (settings.boundary === 'fade'){
        if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40){
          particles.splice(pi, 1);
          continue;
        }
      }

      const trailCap = TRAIL_LENGTHS[settings.trail] || 0;
      if (wrapped){
        p.trail.length = 0;
      } else if (trailCap > 0){
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > trailCap) p.trail.shift();
      } else if (p.trail.length){
        p.trail.length = 0;
      }
    }

    if (absorb){
      for (let i = particles.length - 1; i >= 0; i--){
        const p = particles[i];
        for (let w of wells){
          if (w.polarity < 0) continue;
          const d = dist(w.x, w.y, p.x, p.y);
          if (d < w.r * 0.8){
            particles.splice(i, 1);
            setWellMass(w, w.mass + 0.015);
            spawnAbsorbFlash(w);
            break;
          }
        }
      }
    }

    for (let i = flashes.length - 1; i >= 0; i--){
      const f = flashes[i];
      f.age += dt;
      f.r += (f.maxR - f.r) * 0.15 * dt;
      f.alpha -= 0.045 * dt;
      if (f.alpha <= 0) flashes.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--){
      const s = sparks[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= 0.94; s.vy *= 0.94;
      s.alpha -= 0.03 * dt;
      if (s.alpha <= 0) sparks.splice(i, 1);
    }
  }

  function spawnAbsorbFlash(w){
    flashes.push({ x: w.x, y: w.y, r: 2, maxR: w.r * 2.0, alpha: 0.6, age: 0 });
    if (!settings.reducedMotion){
      const n = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++){
        const a = Math.random() * Math.PI * 2;
        const spd = 0.6 + Math.random() * 0.8;
        sparks.push({ x: w.x, y: w.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, alpha: 0.8, r: 1.2 });
      }
    }
  }
  function spawnMergeFlash(w){
    flashes.push({ x: w.x, y: w.y, r: 4, maxR: w.r * 3.1, alpha: 0.9, age: 0 });
    if (!settings.reducedMotion){
      const n = 8;
      for (let i = 0; i < n; i++){
        const a = (i / n) * Math.PI * 2;
        const spd = 1.0 + Math.random() * 0.6;
        sparks.push({ x: w.x, y: w.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, alpha: 0.9, r: 1.6 });
      }
    }
  }

  function tryMergeAfterDrag(w){
    if (w.polarity < 0) return;
    let changed = true;
    let guard = 0;
    while (changed && guard < wells.length){
      changed = false; guard++;
      for (let i = wells.length - 1; i >= 0; i--){
        const ow = wells[i];
        if (ow === w || ow.polarity < 0) continue;
        const d = dist(w.x, w.y, ow.x, ow.y);
        if (d < (w.r + ow.r) * MERGE_OVERLAP_FACTOR){
          const totalMass = w.mass + ow.mass;
          w.x = (w.x * w.mass + ow.x * ow.mass) / totalMass;
          w.y = (w.y * w.mass + ow.y * ow.mass) / totalMass;
          setWellMass(w, totalMass);
          spawnMergeFlash(w);
          if (selectedWell === ow) selectWell(w);
          wells.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
    updateStats();
  }

  // ---------- field visualization ----------
  let fieldGrid = null;
  let fieldAcc = 0;
  const FIELD_UPDATE_MS = 130;
  const FIELD_CELL = 64;
  function rebuildFieldGrid(){
    const cols = Math.max(1, Math.ceil(W / FIELD_CELL));
    const rows = Math.max(1, Math.ceil(H / FIELD_CELL));
    const cells = [];
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        cells.push({ x: (c + 0.5) * FIELD_CELL, y: (r + 0.5) * FIELD_CELL, fx: 0, fy: 0, mag: 0 });
      }
    }
    fieldGrid = cells;
  }
  function updateFieldGrid(){
    if (!fieldGrid) rebuildFieldGrid();
    for (const cell of fieldGrid){
      let fx = 0, fy = 0;
      for (const w of wells){
        const dx = w.x - cell.x, dy = w.y - cell.y;
        const distSq = dx * dx + dy * dy + SOFTEN * SOFTEN;
        const d = Math.sqrt(distSq);
        const force = (w.mass * w.polarity) / distSq;
        fx += force * dx / d;
        fy += force * dy / d;
      }
      cell.fx = fx; cell.fy = fy;
      cell.mag = Math.hypot(fx, fy);
    }
  }

  // ---------- render ----------
  function renderStars(t){
    for (const s of stars){
      const x = s.nx * W, y = s.ny * H;
      const twAmp = settings.reducedMotion ? 0.15 : 0.4;
      const tw = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
      const alpha = s.baseAlpha * (1 - twAmp + twAmp * 2 * tw * 0.5);
      ctx.beginPath();
      ctx.fillStyle = `rgba(207, 216, 227, ${clamp(alpha, 0, 1)})`;
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderField(t){
    if (settings.field === 'off') return;
    if (settings.field === 'rings'){
      for (const w of wells){
        const baseAlpha = w.polarity > 0 ? 0.16 : 0.14;
        const color = w.polarity > 0 ? '245, 217, 168' : '255, 122, 105';
        for (let k = 0; k < 3; k++){
          const phase = ((t * 0.00025) + k / 3) % 1;
          const rr = w.r + phase * w.r * (w.polarity > 0 ? 4.5 : 6);
          const a = baseAlpha * (1 - phase);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${color}, ${a})`;
          ctx.lineWidth = 1;
          ctx.arc(w.x, w.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      return;
    }
    if (!fieldGrid) return;
    if (settings.field === 'lines'){
      ctx.lineWidth = 1;
      for (let i = 0; i < fieldGrid.length; i++){
        const cell = fieldGrid[i];
        if (cell.mag < 0.00002) continue;
        const dirx = cell.fx / cell.mag, diry = cell.fy / cell.mag;
        const len = clamp(cell.mag * 260000, 4, 22);
        const flicker = 0.7 + 0.3 * Math.sin(t * 0.0015 + i);
        const alpha = clamp(cell.mag * 90000, 0, 0.28) * flicker;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(207, 216, 227, ${alpha})`;
        ctx.moveTo(cell.x - dirx * len * 0.5, cell.y - diry * len * 0.5);
        ctx.lineTo(cell.x + dirx * len * 0.5, cell.y + diry * len * 0.5);
        ctx.stroke();
      }
    } else if (settings.field === 'vectors'){
      ctx.lineWidth = 1;
      for (const cell of fieldGrid){
        if (cell.mag < 0.00002) continue;
        const dirx = cell.fx / cell.mag, diry = cell.fy / cell.mag;
        const len = clamp(cell.mag * 220000, 4, 16);
        const alpha = clamp(cell.mag * 90000, 0, 0.32);
        const ex = cell.x + dirx * len, ey = cell.y + diry * len;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(207, 216, 227, ${alpha})`;
        ctx.moveTo(cell.x, cell.y);
        ctx.lineTo(ex, ey);
        const ah = 2.6;
        const backA = Math.atan2(diry, dirx) + Math.PI;
        ctx.lineTo(ex + Math.cos(backA + 0.5) * ah, ey + Math.sin(backA + 0.5) * ah);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(backA - 0.5) * ah, ey + Math.sin(backA - 0.5) * ah);
        ctx.stroke();
      }
    }
  }

  function particleDisplayColor(p, speed){
    switch (settings.color){
      case 'solid': return '111, 214, 208';
      case 'polarity': {
        const c = polarityColor(p.polarityBias);
        return `${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}`;
      }
      case 'age': return velocityColor(speed);
      default: return velocityColor(speed);
    }
  }
  function particleAlphaFactor(p){
    if (settings.color === 'age'){
      return clamp(1 - (p.age / 9000) * 0.5, 0.5, 1);
    }
    return 1;
  }

  function renderParticles(){
    for (const p of particles){
      const speed = Math.hypot(p.vx, p.vy);
      const color = particleDisplayColor(p, speed);
      const alphaFactor = particleAlphaFactor(p);
      const tl = p.trail;
      if (tl.length > 1){
        for (let i = 1; i < tl.length; i++){
          const t = i / tl.length;
          const a = t * 0.5 * alphaFactor;
          const lw = lerp(0.6, 2.2, t);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${color}, ${a})`;
          ctx.lineWidth = lw;
          ctx.moveTo(tl[i - 1].x, tl[i - 1].y);
          ctx.lineTo(tl[i].x, tl[i].y);
          ctx.stroke();
        }
      }
      const headBoost = clamp(speed / 2.2, 0, 1);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${color}, ${(0.85 + headBoost * 0.15) * alphaFactor})`;
      ctx.arc(p.x, p.y, 2.0 + headBoost * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderWells(t){
    for (const w of wells){
      const pulseAmp = settings.reducedMotion ? 0.03 : 0.08;
      const pulse = 1 + Math.sin(t * 0.002 + w.pulsePhase) * pulseAmp;
      const attract = w.polarity > 0;
      const glowR = w.r * (2.6 + w.mass * 0.35) * pulse;
      const glowColor = attract ? '245, 217, 168' : '255, 122, 105';
      const coreColor = attract ? '#e8b872' : '#ff7a69';
      const glowAlpha = attract ? 0.32 + w.mass * 0.03 : 0.28 + w.mass * 0.035;

      const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, glowR);
      grad.addColorStop(0, `rgba(${glowColor}, ${glowAlpha})`);
      grad.addColorStop(1, `rgba(${glowColor}, 0)`);
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(w.x, w.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = coreColor;
      ctx.arc(w.x, w.y, w.r * pulse, 0, Math.PI * 2);
      ctx.fill();

      if (!attract){
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 122, 105, ${0.35 + w.mass * 0.05})`;
        ctx.lineWidth = 1 + w.mass * 0.15;
        ctx.arc(w.x, w.y, w.r * pulse + 5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (w.mass > 1.4){
        ctx.beginPath();
        ctx.strokeStyle = `rgba(245, 217, 168, ${0.15 + (w.mass - 1) * 0.05})`;
        ctx.lineWidth = 1;
        ctx.arc(w.x, w.y, w.r * pulse + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (w.locked){
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(207, 216, 227, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.arc(w.x, w.y, w.r * pulse + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (w === selectedWell){
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(245, 217, 168, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.arc(w.x, w.y, w.r * pulse + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (w === heldWell && didDrag){
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(245, 217, 168, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.arc(w.x, w.y, w.r * pulse + 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function renderFlashesAndSparks(){
    for (const f of flashes){
      ctx.beginPath();
      ctx.strokeStyle = `rgba(245, 217, 168, ${Math.max(f.alpha, 0)})`;
      ctx.lineWidth = 1.5;
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const s of sparks){
      ctx.beginPath();
      ctx.fillStyle = `rgba(245, 217, 168, ${Math.max(s.alpha, 0)})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderCenterOfMass(){
    if (!settings.com) return;
    let mx = 0, my = 0, total = 0;
    for (const w of wells){
      if (w.polarity <= 0) continue;
      mx += w.x * w.mass; my += w.y * w.mass; total += w.mass;
    }
    if (total <= 0) return;
    mx /= total; my /= total;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(207, 216, 227, 0.8)';
    ctx.lineWidth = 1;
    ctx.moveTo(mx - 6, my); ctx.lineTo(mx + 6, my);
    ctx.moveTo(mx, my - 6); ctx.lineTo(mx, my + 6);
    ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  function renderStreamPreview(){
    if (!streamPreview) return;
    const { x, y, curX, curY } = streamPreview;
    const dx = curX - x, dy = curY - y;
    const len = Math.hypot(dx, dy);
    if (len < 4) return;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 217, 168, 0.55)';
    ctx.fillStyle = 'rgba(245, 217, 168, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(curX, curY);
    ctx.stroke();
    const ah = 7;
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX - Math.cos(angle - 0.4) * ah, curY - Math.sin(angle - 0.4) * ah);
    ctx.lineTo(curX - Math.cos(angle + 0.4) * ah, curY - Math.sin(angle + 0.4) * ah);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function render(t){
    ctx.fillStyle = 'rgba(5, 7, 13, 0.28)';
    ctx.fillRect(0, 0, W, H);
    renderStars(t);
    renderField(t);
    renderParticles();
    renderFlashesAndSparks();
    renderCenterOfMass();
    renderWells(t);
    renderStreamPreview();
  }

  // ---------- main loop (fixed-step accumulator) ----------
  let accumulator = 0;
  let lastTime = performance.now();
  let fieldTimerAcc = 0;
  function loop(now){
    let frameMs = now - lastTime;
    lastTime = now;
    if (!isFinite(frameMs) || frameMs < 0) frameMs = 0;
    if (frameMs > MAX_FRAME_MS) frameMs = MAX_FRAME_MS;

    if (!paused){
      accumulator += frameMs * settings.speed;
      const cap = FIXED_STEP * MAX_STEPS_PER_FRAME;
      if (accumulator > cap) accumulator = cap;
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME){
        simulateStep(1);
        accumulator -= FIXED_STEP;
        steps++;
      }
      if (settings.field === 'lines' || settings.field === 'vectors'){
        fieldTimerAcc += frameMs;
        if (fieldTimerAcc >= FIELD_UPDATE_MS){
          fieldTimerAcc = 0;
          updateFieldGrid();
        }
      }
    }
    render(now);
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  let heldWell = null;
  let dragStart = null;
  let pressTimer = null;
  let didDrag = false;
  let removedByHold = false;
  let streamPreview = null;
  let activeTool = 'well';
  let particleMode = 'burst';

  function findWellAt(x, y, radiusOverride){
    for (let i = wells.length - 1; i >= 0; i--){
      const w = wells[i];
      const hit = radiusOverride != null ? radiusOverride : Math.max(w.r + 14, 26);
      if (dist(w.x, w.y, x, y) < hit) return w;
    }
    return null;
  }

  function getPos(e){
    if (e.touches && e.touches.length){
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onDown(e){
    resetCinematicIdle();
    const pos = getPos(e);
    didDrag = false;
    removedByHold = false;
    streamPreview = null;
    const w = findWellAt(pos.x, pos.y);
    if (w){
      heldWell = w;
      dragStart = pos;
      pressTimer = setTimeout(() => {
        if (heldWell && !didDrag){
          deleteWell(heldWell);
          heldWell = null;
          removedByHold = true;
        }
      }, HOLD_MS);
    } else {
      heldWell = null;
      dragStart = pos;
      if (activeTool === 'particles' && particleMode === 'stream'){
        streamPreview = { x: pos.x, y: pos.y, curX: pos.x, curY: pos.y };
      }
    }
  }

  function onMove(e){
    resetCinematicIdle();
    if (!dragStart) return;
    const pos = getPos(e);
    const dx = pos.x - dragStart.x, dy = pos.y - dragStart.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD){
      didDrag = true;
      if (heldWell){
        clearTimeout(pressTimer);
        if (!heldWell.locked){ heldWell.x = pos.x; heldWell.y = pos.y; }
      }
    }
    if (streamPreview){ streamPreview.curX = pos.x; streamPreview.curY = pos.y; }
  }

  function onUp(e){
    clearTimeout(pressTimer);
    const pos = (e.changedTouches && e.changedTouches.length)
      ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
      : getPos(e);

    if (removedByHold){
      // nothing further
    } else if (heldWell){
      if (didDrag){
        if (settings.merge) tryMergeAfterDrag(heldWell);
      } else {
        togglePolarity(heldWell);
        selectWell(heldWell);
      }
    } else if (dragStart){
      if (activeTool === 'well'){
        if (!didDrag){
          addWell(dragStart.x, dragStart.y, nextWellPolarity);
        }
      } else if (activeTool === 'particles'){
        if (particleMode === 'stream'){
          if (didDrag) spawnStream(dragStart.x, dragStart.y, pos.x, pos.y);
        } else if (!didDrag){
          if (particleMode === 'burst') spawnBurst(dragStart.x, dragStart.y);
          else if (particleMode === 'ring') spawnRing(dragStart.x, dragStart.y);
          else if (particleMode === 'cloud') spawnCloud(dragStart.x, dragStart.y);
        }
      }
    }
    heldWell = null;
    dragStart = null;
    didDrag = false;
    removedByHold = false;
    streamPreview = null;
  }

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); onUp(e); }, { passive: false });
  canvas.addEventListener('touchcancel', (e) => { e.preventDefault(); onUp(e); }, { passive: false });

  // ---------- presets ----------
  const PRESETS = {
    classic: {
      name: 'Classic',
      desc: 'Two gentle wells, a seeded cloud between them.',
      setup(){
        addWell(W * 0.35, H * 0.5, 1);
        addWell(W * 0.65, H * 0.42, 1);
        seedParticles(50);
      }
    },
    binary: {
      name: 'Binary',
      desc: 'A close pair with an orbiting halo of particles.',
      setup(){
        const cx = W / 2, cy = H / 2, sep = Math.min(W, H) * 0.16;
        addWell(cx - sep, cy, 1);
        addWell(cx + sep, cy, 1);
        spawnBatch(70, () => {
          const angle = Math.random() * Math.PI * 2;
          const d = sep * 1.8 + Math.random() * sep * 1.6;
          const x = cx + Math.cos(angle) * d;
          const y = cy + Math.sin(angle) * d;
          const speed = 0.9 + Math.random() * 0.5;
          const perp = angle + Math.PI / 2;
          spawnParticle(x, y, Math.cos(perp) * speed, Math.sin(perp) * speed);
        });
      }
    },
    rings: {
      name: 'Rings',
      desc: 'A single well with three concentric orbital rings.',
      setup(){
        addWell(W / 2, H / 2, 1.2);
        const ringDefs = [0.12, 0.22, 0.32];
        ringDefs.forEach((rf, ri) => {
          const count = 26;
          const d = Math.min(W, H) * rf;
          const speed = 1.55 - ri * 0.32;
          for (let i = 0; i < count; i++){
            const angle = (i / count) * Math.PI * 2;
            const x = W / 2 + Math.cos(angle) * d;
            const y = H / 2 + Math.sin(angle) * d;
            const perp = angle + Math.PI / 2;
            spawnParticle(x, y, Math.cos(perp) * speed, Math.sin(perp) * speed);
          }
        });
        updateStats();
      }
    },
    chaos: {
      name: 'Chaos',
      desc: 'Four scattered wells, mixed polarity, wild seeding.',
      setup(){
        for (let i = 0; i < 4; i++){
          const x = W * 0.25 + Math.random() * W * 0.5;
          const y = H * 0.25 + Math.random() * H * 0.5;
          const w = addWell(x, y, 1);
          if (w && Math.random() < 0.4) togglePolarity(w);
        }
        seedParticles(90);
      }
    },
    flower: {
      name: 'Flower',
      desc: 'Central pull ringed by weaker pushes — grows petals.',
      setup(){
        const cx = W / 2, cy = H / 2;
        addWell(cx, cy, 2.0);
        const petals = 5;
        const petalDist = Math.min(W, H) * 0.22;
        for (let i = 0; i < petals; i++){
          const a = (i / petals) * Math.PI * 2;
          const w = addWell(cx + Math.cos(a) * petalDist, cy + Math.sin(a) * petalDist, 0.5);
          if (w) w.polarity = -1;
        }
        spawnBatch(90, () => {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random() * Math.min(W, H) * 0.14;
          const x = cx + Math.cos(a) * d;
          const y = cy + Math.sin(a) * d;
          const perp = a + Math.PI / 2;
          const speed = 0.5 + Math.random() * 0.4;
          spawnParticle(x, y, Math.cos(perp) * speed, Math.sin(perp) * speed);
        });
      }
    },
    fountain: {
      name: 'Fountain',
      desc: 'A repulsive core beneath attractive outer wells.',
      setup(){
        const cx = W / 2, cy = H * 0.58;
        const core = addWell(cx, cy, 1.6);
        if (core) core.polarity = -1;
        const outerDist = Math.min(W, H) * 0.3;
        [-1, 1].forEach((s) => {
          addWell(cx + s * outerDist, cy - outerDist * 0.55, 1.1);
        });
        spawnBatch(80, () => {
          const a = rand(-0.5, 0.5) - Math.PI / 2;
          const speed = 0.9 + Math.random() * 0.9;
          spawnParticle(cx + rand(-20, 20), cy + rand(-10, 10), Math.cos(a) * speed, Math.sin(a) * speed);
        });
      }
    },
    orbitalGarden: {
      name: 'Orbital Garden',
      desc: 'Several asymmetric wells with pre-seeded orbits.',
      setup(){
        const pts = [
          [W * 0.3, H * 0.35, 1.4],
          [W * 0.68, H * 0.3, 0.8],
          [W * 0.55, H * 0.68, 1.1],
          [W * 0.22, H * 0.7, 0.6]
        ];
        for (const [x, y, m] of pts) addWell(x, y, 1, m);
        for (const [x, y, m] of pts){
          const count = 14;
          const d = 30 + m * 20;
          for (let i = 0; i < count; i++){
            const a = (i / count) * Math.PI * 2;
            const px = x + Math.cos(a) * d;
            const py = y + Math.sin(a) * d;
            const perp = a + Math.PI / 2;
            const speed = 0.7 + Math.random() * 0.3;
            spawnParticle(px, py, Math.cos(perp) * speed, Math.sin(perp) * speed);
          }
        }
        updateStats();
      }
    },
    tidal: {
      name: 'Tidal',
      desc: 'Two unequal wells with a broad cloud drifting between.',
      setup(){
        const cy = H / 2;
        addWell(W * 0.28, cy, 2.6);
        addWell(W * 0.74, cy, 0.9);
        spawnBatch(90, () => {
          const x = W * 0.4 + Math.random() * W * 0.2;
          const y = cy + (Math.random() - 0.5) * H * 0.4;
          spawnParticle(x, y, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.4);
        });
      }
    },
    voidBloom: {
      name: 'Void Bloom',
      desc: 'A repulsive center surrounded by pulling wells.',
      setup(){
        const cx = W / 2, cy = H / 2;
        const core = addWell(cx, cy, 2.2);
        if (core) core.polarity = -1;
        const n = 4;
        const d = Math.min(W, H) * 0.26;
        for (let i = 0; i < n; i++){
          const a = (i / n) * Math.PI * 2 + 0.4;
          addWell(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.2);
        }
        spawnBatch(100, () => {
          const a = Math.random() * Math.PI * 2;
          const rd = d * (0.5 + Math.random() * 0.9);
          const x = cx + Math.cos(a) * rd;
          const y = cy + Math.sin(a) * rd;
          const perp = a + Math.PI / 2;
          const speed = 0.4 + Math.random() * 0.5;
          spawnParticle(x, y, Math.cos(perp) * speed, Math.sin(perp) * speed);
        });
      }
    }
  };
  const PRESET_ORDER = ['classic', 'binary', 'rings', 'chaos', 'flower', 'fountain', 'orbitalGarden', 'tidal', 'voidBloom'];

  function applyPreset(key){
    clearAll();
    currentPresetKey = key;
    PRESETS[key].setup();
    updateStats();
    renderPresetList();
  }
  function resetCurrent(){
    if (currentPresetKey && PRESETS[currentPresetKey]) applyPreset(currentPresetKey);
    else clearAll();
  }
  function emptyGarden(){
    currentPresetKey = null;
    clearAll();
    renderPresetList();
  }

  function renderPresetList(){
    const list = document.getElementById('presetList');
    list.innerHTML = '';
    for (const key of PRESET_ORDER){
      const def = PRESETS[key];
      const item = document.createElement('div');
      item.className = 'preset-item' + (key === currentPresetKey ? ' active' : '');
      item.innerHTML = `<div>${def.name}</div><div class="preset-desc">${def.desc}</div>`;
      item.addEventListener('click', () => {
        applyPreset(key);
        closeOverlay(document.getElementById('presetOverlay'));
      });
      list.appendChild(item);
    }
  }

  // ---------- UI wiring ----------
  function setTool(tool){
    activeTool = tool;
    document.getElementById('toolWell').classList.toggle('active', tool === 'well');
    document.getElementById('toolParticles').classList.toggle('active', tool === 'particles');
    document.getElementById('wellSubrow').style.display = tool === 'well' ? 'flex' : 'none';
    document.getElementById('particleSubrow').style.display = tool === 'particles' ? 'flex' : 'none';
  }
  document.getElementById('toolWell').addEventListener('click', () => setTool('well'));
  document.getElementById('toolParticles').addEventListener('click', () => setTool('particles'));

  document.getElementById('polAttract').addEventListener('click', () => {
    nextWellPolarity = 1;
    document.getElementById('polAttract').classList.add('active');
    document.getElementById('polRepel').classList.remove('active');
  });
  document.getElementById('polRepel').addEventListener('click', () => {
    nextWellPolarity = -1;
    document.getElementById('polRepel').classList.add('active');
    document.getElementById('polAttract').classList.remove('active');
  });

  function setParticleMode(mode, btnId){
    particleMode = mode;
    ['pmBurst', 'pmStream', 'pmRing', 'pmCloud'].forEach(id => {
      document.getElementById(id).classList.toggle('active', id === btnId);
    });
  }
  document.getElementById('pmSeed20').addEventListener('click', () => seedParticles(20));
  document.getElementById('pmSeed50').addEventListener('click', () => seedParticles(50));
  document.getElementById('pmSeed100').addEventListener('click', () => seedParticles(100));
  document.getElementById('pmBurst').addEventListener('click', () => setParticleMode('burst', 'pmBurst'));
  document.getElementById('pmStream').addEventListener('click', () => setParticleMode('stream', 'pmStream'));
  document.getElementById('pmRing').addEventListener('click', () => setParticleMode('ring', 'pmRing'));
  document.getElementById('pmCloud').addEventListener('click', () => setParticleMode('cloud', 'pmCloud'));

  // inspector
  document.getElementById('inspClose').addEventListener('click', deselectWell);
  document.getElementById('massUp').addEventListener('click', () => {
    if (!selectedWell) return;
    setWellMass(selectedWell, selectedWell.mass + 0.25);
    updateInspector();
  });
  document.getElementById('massDown').addEventListener('click', () => {
    if (!selectedWell) return;
    setWellMass(selectedWell, selectedWell.mass - 0.25);
    updateInspector();
  });
  document.getElementById('inspLock').addEventListener('click', () => {
    if (!selectedWell) return;
    selectedWell.locked = !selectedWell.locked;
    updateInspector();
  });
  document.getElementById('inspDup').addEventListener('click', () => {
    if (!selectedWell) return;
    duplicateWell(selectedWell);
  });
  document.getElementById('inspDel').addEventListener('click', () => {
    if (!selectedWell) return;
    deleteWell(selectedWell);
  });

  // pause / step
  function setPaused(p){
    paused = p;
    document.getElementById('btnPause').textContent = paused ? 'Play' : 'Pause';
    document.getElementById('btnPause').classList.toggle('active', paused);
    document.getElementById('stepRow').style.display = paused ? 'flex' : 'none';
  }
  document.getElementById('btnPause').addEventListener('click', () => setPaused(!paused));
  document.getElementById('btnStep').addEventListener('click', () => { simulateStep(1); render(performance.now()); });

  // presets overlay
  function openOverlay(el){ el.classList.add('show'); }
  function closeOverlay(el){ el.classList.remove('show'); }
  document.getElementById('btnPresets').addEventListener('click', () => { renderPresetList(); openOverlay(document.getElementById('presetOverlay')); });
  document.getElementById('closePresets').addEventListener('click', () => closeOverlay(document.getElementById('presetOverlay')));
  document.getElementById('presetOverlay').addEventListener('click', (e) => { if (e.target.id === 'presetOverlay') closeOverlay(e.target); });
  document.getElementById('btnResetPreset').addEventListener('click', () => { resetCurrent(); closeOverlay(document.getElementById('presetOverlay')); });
  document.getElementById('btnEmptyGarden').addEventListener('click', () => { emptyGarden(); closeOverlay(document.getElementById('presetOverlay')); });

  // more / settings overlay
  document.getElementById('btnMore').addEventListener('click', () => openOverlay(document.getElementById('moreOverlay')));
  document.getElementById('closeMore').addEventListener('click', () => closeOverlay(document.getElementById('moreOverlay')));
  document.getElementById('moreOverlay').addEventListener('click', (e) => { if (e.target.id === 'moreOverlay') closeOverlay(e.target); });

  document.getElementById('btnClearParticles2').addEventListener('click', clearParticles);
  document.getElementById('btnClearWells2').addEventListener('click', clearWells);
  document.getElementById('btnClearAll2').addEventListener('click', clearAll);
  document.getElementById('btnCinematic').addEventListener('click', () => { enterCinematic(); closeOverlay(document.getElementById('moreOverlay')); });

  // help overlay
  document.getElementById('helpBtn').addEventListener('click', () => openOverlay(document.getElementById('helpOverlay')));
  document.getElementById('closeHelp').addEventListener('click', () => closeOverlay(document.getElementById('helpOverlay')));
  document.getElementById('helpOverlay').addEventListener('click', (e) => { if (e.target.id === 'helpOverlay') closeOverlay(e.target); });

  // ---------- row builders (speed / trail / color / field / boundary) ----------
  function buildRow(containerId, items, getActiveKey, onSelect){
    const row = document.getElementById(containerId);
    row.innerHTML = '';
    for (const item of items){
      const btn = document.createElement('div');
      btn.className = 'btn small' + (item.key === getActiveKey() ? ' active' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        onSelect(item.key);
        for (const child of row.children) child.classList.remove('active');
        btn.classList.add('active');
      });
      row.appendChild(btn);
    }
  }

  function buildSpeedRow(){
    buildRow('speedRow',
      SPEED_STEPS.map(s => ({ key: s, label: (s < 1 ? s.toString().replace('0.', '.') : s) + 'X' })),
      () => settings.speed,
      (key) => { settings.speed = key; saveSettings(); }
    );
  }
  function buildTrailRow(){
    buildRow('trailRow',
      [{ key: 'off', label: 'Off' }, { key: 'short', label: 'Short' }, { key: 'medium', label: 'Medium' }, { key: 'long', label: 'Long' }],
      () => settings.trail,
      (key) => { settings.trail = key; saveSettings(); }
    );
  }
  function buildColorRow(){
    buildRow('colorRow',
      [{ key: 'velocity', label: 'Velocity' }, { key: 'solid', label: 'Solid' }, { key: 'polarity', label: 'Polarity' }, { key: 'age', label: 'Age' }],
      () => settings.color,
      (key) => { settings.color = key; saveSettings(); }
    );
  }
  function buildFieldRow(){
    buildRow('fieldRow',
      [{ key: 'off', label: 'Off' }, { key: 'lines', label: 'Field Lines' }, { key: 'vectors', label: 'Vector Grid' }, { key: 'rings', label: 'Rings' }],
      () => settings.field,
      (key) => { settings.field = key; saveSettings(); if (key === 'lines' || key === 'vectors') rebuildFieldGrid(); }
    );
  }
  function buildBoundaryRow(){
    buildRow('boundaryRow',
      [{ key: 'wrap', label: 'Wrap' }, { key: 'bounce', label: 'Bounce' }, { key: 'fade', label: 'Fade' }],
      () => settings.boundary,
      (key) => { settings.boundary = key; saveSettings(); }
    );
  }

  function buildSwitch(id, key, onChange){
    const el = document.getElementById(id);
    function sync(){ el.classList.toggle('on', settings[key]); }
    el.addEventListener('click', () => {
      settings[key] = !settings[key];
      sync();
      saveSettings();
      if (onChange) onChange();
    });
    sync();
  }

  // ---------- cinematic mode ----------
  let cinematicIdleTimer = null;
  function enterCinematic(){
    document.body.classList.add('cinematic');
    resetCinematicIdle();
  }
  function exitCinematic(){
    document.body.classList.remove('cinematic', 'hide-cursor');
    clearTimeout(cinematicIdleTimer);
  }
  function resetCinematicIdle(){
    if (!document.body.classList.contains('cinematic')) return;
    document.body.classList.remove('hide-cursor');
    clearTimeout(cinematicIdleTimer);
    cinematicIdleTimer = setTimeout(() => document.body.classList.add('hide-cursor'), 2600);
  }
  document.getElementById('exitCinematic').addEventListener('click', exitCinematic);

  // ---------- keyboard shortcuts ----------
  window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key){
      case ' ':
        e.preventDefault();
        setPaused(!paused);
        break;
      case 'r': case 'R':
        resetCurrent();
        break;
      case 'c': case 'C':
        clearParticles();
        break;
      case 'b': case 'B':
        setTool('particles');
        setParticleMode('burst', 'pmBurst');
        break;
      case 'p': case 'P':
        setTool('particles');
        break;
      case 'g': case 'G':
        setTool('well');
        break;
      case 'f': case 'F':
        if (document.body.classList.contains('cinematic')) exitCinematic();
        else enterCinematic();
        break;
    }
  });

  // ---------- init ----------
  function waitForLayout(cb){
    if (window.innerWidth > 0 && window.innerHeight > 0){ cb(); return; }
    requestAnimationFrame(() => waitForLayout(cb));
  }

  function init(){
    loadSettings();
    initStars();

    waitForLayout(() => {
      resize();

      buildSpeedRow();
      buildTrailRow();
      buildColorRow();
      buildFieldRow();
      buildBoundaryRow();
      buildSwitch('swMerge', 'merge');
      buildSwitch('swAbsorb', 'absorb');
      buildSwitch('swCom', 'com');
      buildSwitch('swReduced', 'reducedMotion');

      setTool('well');
      setParticleMode('burst', 'pmBurst');
      document.getElementById('inspector').style.display = 'none';

      applyPreset('classic');

      const hint = document.getElementById('hint');
      setTimeout(() => hint.classList.add('show'), 400);
      setTimeout(() => hint.classList.remove('show'), 5500);

      requestAnimationFrame(loop);
    });
  }

  init();
})();
