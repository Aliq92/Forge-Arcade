// Ripple Run - canvas rendering: water, light, decorations, ripples, orb
window.RR = window.RR || {};

RR.Renderer = (function () {
  const U = RR.Utils;

  let canvas, ctx;
  let t = 0; // internal animation clock
  let rainDrops = [];

  const THEMES = {
    night: {
      bgTop: '#0a1420', bgBottom: '#050a12',
      water1: 'rgba(30,60,90,0.35)', water2: 'rgba(10,20,35,0.0)',
      ripple: '200,235,255', rippleCore: '190,230,255',
      orb: '210,240,255', orbCore: '255,255,255',
      goal: '160,220,255',
      moon: 'rgba(220,235,255,0.10)',
      vignette: 'rgba(0,0,0,0.55)',
      lily: 'rgba(90,140,120,0.35)', reed: 'rgba(70,110,90,0.4)',
      koi: 'rgba(255,150,120,0.10)',
      firefly: '255,244,190'
    },
    day: {
      bgTop: '#bfe3ea', bgBottom: '#8fc4d6',
      water1: 'rgba(255,255,255,0.28)', water2: 'rgba(140,200,220,0.0)',
      ripple: '255,255,255', rippleCore: '235,250,255',
      orb: '255,250,235', orbCore: '255,255,255',
      goal: '255,236,190',
      moon: 'rgba(255,255,255,0.0)',
      vignette: 'rgba(10,30,40,0.18)',
      lily: 'rgba(60,120,90,0.55)', reed: 'rgba(60,110,80,0.55)',
      koi: 'rgba(255,120,90,0.28)',
      firefly: '255,244,190'
    }
  };

  function init(cnv) {
    canvas = cnv;
    ctx = canvas.getContext('2d');
    return ctx;
  }

  function generateDecorations(seed, W, H) {
    const rng = U.mulberry32(U.hashString('deco-' + seed));
    const lilies = [];
    const reeds = [];
    const petals = [];
    const koi = [];

    const lilyCount = 6;
    for (let i = 0; i < lilyCount; i++) {
      let nx = rng(), ny = rng();
      // bias toward edges so the play area stays clear
      nx = nx < 0.5 ? nx * 0.35 : 1 - (1 - nx) * 0.35;
      ny = ny < 0.5 ? ny * 0.35 : 1 - (1 - ny) * 0.35;
      lilies.push({ nx, ny, r: U.rand.call(null, 0.02, 0.036) * 1000 / 1000, rot: rng() * Math.PI * 2, scale: 0.7 + rng() * 0.6 });
    }
    const reedCount = 8;
    for (let i = 0; i < reedCount; i++) {
      const edge = Math.floor(rng() * 4);
      let nx, ny;
      if (edge === 0) { nx = rng() * 0.12; ny = rng(); }
      else if (edge === 1) { nx = 1 - rng() * 0.12; ny = rng(); }
      else if (edge === 2) { nx = rng(); ny = rng() * 0.10; }
      else { nx = rng(); ny = 1 - rng() * 0.10; }
      reeds.push({ nx, ny, h: 0.05 + rng() * 0.06, sway: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.6 });
    }
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
      petals.push({ nx: rng(), ny: rng(), rot: rng() * Math.PI * 2, drift: rng() * Math.PI * 2, scale: 0.6 + rng() * 0.5 });
    }
    const koiCount = 2;
    for (let i = 0; i < koiCount; i++) {
      koi.push({
        cx: 0.2 + rng() * 0.6, cy: 0.2 + rng() * 0.6,
        r: 0.18 + rng() * 0.18, speed: 0.05 + rng() * 0.06,
        phase: rng() * Math.PI * 2, len: 0.028 + rng() * 0.012
      });
    }
    return { lilies, reeds, petals, koi };
  }

  function setRain(active) {
    if (active && rainDrops.length === 0) {
      for (let i = 0; i < 60; i++) {
        rainDrops.push({ x: Math.random(), y: Math.random(), speed: 0.4 + Math.random() * 0.3, len: 8 + Math.random() * 10 });
      }
    } else if (!active) {
      rainDrops = [];
    }
  }

  function drawBackground(W, H, theme, reducedMotion) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.bgTop);
    g.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // slow moving light bands
    const bandCount = 3;
    for (let i = 0; i < bandCount; i++) {
      const speed = reducedMotion ? 0 : 0.06 + i * 0.02;
      const yBase = H * (0.2 + i * 0.28) + Math.sin(t * speed + i * 2) * H * 0.06;
      const grad = ctx.createLinearGradient(0, yBase - H * 0.12, 0, yBase + H * 0.12);
      grad.addColorStop(0, theme.water2);
      grad.addColorStop(0.5, theme.water1);
      grad.addColorStop(1, theme.water2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, yBase - H * 0.12, W, H * 0.24);
    }

    // moon reflection (night only, alpha near-0 in day theme so cheap no-op)
    const moonX = W * 0.78;
    const shimmer = reducedMotion ? 0 : Math.sin(t * 0.8) * 4;
    const grad2 = ctx.createLinearGradient(moonX - 26, 0, moonX + 26, 0);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(0.5, theme.moon);
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(moonX - 26 + shimmer, 0, 52, H * 0.55);
  }

  function drawVignette(W, H, theme, highContrast) {
    const innerR = Math.min(W, H) * (highContrast ? 0.5 : 0.35);
    const g = ctx.createRadialGradient(W / 2, H / 2, innerR, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, highContrast ? 'rgba(0,0,0,0.35)' : theme.vignette);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawKoi(koi, W, H, theme, reducedMotion) {
    ctx.save();
    ctx.fillStyle = theme.koi;
    for (const k of koi) {
      const speed = reducedMotion ? 0 : k.speed;
      const a = k.phase + t * speed;
      const cx = k.cx * W + Math.cos(a) * k.r * Math.min(W, H);
      const cy = k.cy * H + Math.sin(a * 1.3) * k.r * Math.min(W, H) * 0.6;
      const angle = Math.atan2(Math.cos(a * 1.3) * 1.3 * Math.cos(a), -Math.sin(a));
      const len = k.len * Math.min(W, H);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(Math.sin(a * 1.3 + 0.01), -Math.sin(a + 0.01)));
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-len * 0.9, 0);
      ctx.lineTo(-len * 1.5, len * 0.35);
      ctx.lineTo(-len * 1.5, -len * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawLilyShape(x, y, r, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.35, Math.PI * 2 - 0.35);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDecorations(deco, W, H, theme, reducedMotion) {
    const min = Math.min(W, H);
    for (const l of deco.lilies) {
      drawLilyShape(l.nx * W, l.ny * H, 0.03 * min * l.scale, l.rot, theme.lily);
    }
    ctx.save();
    ctx.strokeStyle = theme.reed;
    ctx.lineWidth = Math.max(1.2, min * 0.003);
    for (const r of deco.reeds) {
      const sway = reducedMotion ? 0 : Math.sin(t * 0.6 + r.sway) * 0.08;
      const x = r.nx * W, y = r.ny * H;
      const h = r.h * min;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + h * (r.tilt + sway) * 0.6, y - h * 0.6, x + h * (r.tilt + sway), y - h);
      ctx.stroke();
    }
    ctx.restore();
    for (const p of deco.petals) {
      const drift = reducedMotion ? 0 : Math.sin(t * 0.15 + p.drift) * 0.012;
      ctx.save();
      ctx.translate((p.nx + drift) * W, p.ny * H);
      ctx.rotate(p.rot + (reducedMotion ? 0 : t * 0.1));
      ctx.fillStyle = theme.lily;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.012 * min * p.scale, 0.006 * min * p.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawShallow(zones, theme) {
    ctx.save();
    for (const z of zones) {
      const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      g.addColorStop(0, 'rgba(180,210,220,0.16)');
      g.addColorStop(1, 'rgba(180,210,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCurrents(zones, reducedMotion) {
    ctx.save();
    for (const z of zones) {
      ctx.save();
      ctx.beginPath();
      if (z.shape === 'circle') ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      else ctx.rect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
      ctx.clip();

      const bounds = z.shape === 'circle'
        ? { x: z.x - z.r, y: z.y - z.r, w: z.r * 2, h: z.r * 2 }
        : { x: z.x - z.w / 2, y: z.y - z.h / 2, w: z.w, h: z.h };

      const lineCount = 10;
      const speed = reducedMotion ? 0 : z.strength * 0.35;
      for (let i = 0; i < lineCount; i++) {
        const seedOff = i * 137.5;
        const along = ((t * speed * 0.02 + seedOff) % 140) / 140;
        const px = bounds.x + ((i * 0.618) % 1) * bounds.w;
        const py = bounds.y + ((i * 0.382 + along) % 1) * bounds.h;
        const len = 16;
        ctx.strokeStyle = 'rgba(180,220,255,0.22)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px - z.dirX * len, py - z.dirY * len);
        ctx.lineTo(px + z.dirX * len, py + z.dirY * len);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHazards(hazards, reducedMotion) {
    for (const h of hazards) {
      const pulse = reducedMotion ? 0 : Math.sin(t * 2.2) * 0.5 + 0.5;
      const glowR = h.r * (1 + pulse * 0.08);
      ctx.save();
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, glowR);
      const alpha = h.triggered ? 0.10 : 0.28;
      g.addColorStop(0, `rgba(255,150,190,${alpha})`);
      g.addColorStop(1, 'rgba(255,150,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(h.x, h.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,180,210,${h.triggered ? 0.25 : 0.55})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRocks(rocks) {
    for (const r of rocks) {
      ctx.save();
      const g = ctx.createRadialGradient(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.1, r.x, r.y, r.r);
      g.addColorStop(0, `rgba(120,135,150,${0.95})`);
      g.addColorStop(1, 'rgba(35,42,52,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.fill();

      if (r.flash > 0.01) {
        ctx.globalAlpha = r.flash * 0.6;
        ctx.strokeStyle = 'rgba(210,235,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawGoal(goal, theme, reducedMotion, highContrast) {
    if (!goal) return;
    const pulse = reducedMotion ? 0 : Math.sin(t * 1.6) * 0.5 + 0.5;
    const outerR = goal.r * (1.5 + pulse * 0.15 + goal.pulse * 0.6);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(goal.x, goal.y, 0, goal.x, goal.y, outerR);
    g.addColorStop(0, `rgba(${theme.goal},${highContrast ? 0.34 : 0.22})`);
    g.addColorStop(0.6, `rgba(${theme.goal},0.08)`);
    g.addColorStop(1, `rgba(${theme.goal},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, outerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${theme.goal},${highContrast ? 1 : 0.75})`;
    ctx.lineWidth = highContrast ? 3 : 2;
    ctx.shadowColor = `rgba(${theme.goal},0.8)`;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2);
    ctx.stroke();

    // lotus-like petals
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(${theme.goal},0.5)`;
    const petals = 6;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + (reducedMotion ? 0 : t * 0.15);
      const px = goal.x + Math.cos(a) * goal.r * 0.55;
      const py = goal.y + Math.sin(a) * goal.r * 0.55;
      ctx.beginPath();
      ctx.ellipse(px, py, goal.r * 0.22, goal.r * 0.11, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRipples(ripples, theme, glowEnabled, highContrast) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const rp of ripples) {
      const lifeFade = U.clamp(1 - rp.age / rp.life, 0, 1);
      const radiusFade = U.clamp(1 - rp.radius / rp.maxRadius, 0, 1);
      let alpha = (rp.isRain ? 0.18 : 0.5) * lifeFade * (0.4 + radiusFade * 0.6);
      if (highContrast && !rp.isRain) alpha = Math.min(1, alpha * 1.6);
      if (alpha <= 0.005 || rp.radius <= 0) continue;

      const color = rp.isRain ? '210,230,245' : theme.ripple;
      ctx.strokeStyle = `rgba(${color},${alpha})`;
      ctx.lineWidth = rp.isRain ? 1 : (highContrast ? 3 : 2);
      if (glowEnabled && !rp.isRain) {
        ctx.shadowColor = `rgba(${theme.rippleCore},${alpha})`;
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (!rp.isRain) {
        ctx.strokeStyle = `rgba(${theme.rippleCore},${alpha * 0.35})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, Math.max(0, rp.radius - 9), 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const p of rp.ringPulses) {
        const pf = U.clamp(1 - p.age / p.life, 0, 1);
        ctx.strokeStyle = `rgba(${theme.rippleCore},${pf * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSplashParticles(particles) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const f = U.clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = `rgba(220,240,255,${f * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * f), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOrb(orb, theme, glowEnabled) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // trail
    for (let i = 0; i < orb.trail.length; i++) {
      const pt = orb.trail[i];
      const f = U.clamp(1 - pt.age / 0.55, 0, 1);
      const r = orb.radius * (0.15 + f * 0.5);
      ctx.fillStyle = `rgba(${theme.orb},${f * 0.22})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const bright = orb.brighten;
    const glowR = orb.radius * (2.6 + bright * 1.4);
    const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, glowR);
    g.addColorStop(0, `rgba(${theme.orbCore},${0.55 + bright * 0.3})`);
    g.addColorStop(0.4, `rgba(${theme.orb},${0.35 + bright * 0.2})`);
    g.addColorStop(1, `rgba(${theme.orb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${theme.orbCore},${0.9 + bright * 0.1})`;
    if (glowEnabled) {
      ctx.shadowColor = `rgba(${theme.orb},0.9)`;
      ctx.shadowBlur = 16 + bright * 10;
    }
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius * (0.62 + bright * 0.15), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRain(W, H, reducedMotion) {
    if (!rainDrops.length) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,220,240,0.35)';
    ctx.lineWidth = 1;
    for (const d of rainDrops) {
      if (!reducedMotion) d.y += d.speed * 0.012;
      if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
      const x = d.x * W, y = d.y * H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + d.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFireflies(W, H, theme, reducedMotion, seed) {
    const rng = U.mulberry32(U.hashString('fly-' + seed));
    const count = 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const baseX = rng(), baseY = rng(), phase = rng() * 10, spd = 0.15 + rng() * 0.15;
      const tt = reducedMotion ? phase : t * spd + phase;
      const x = (baseX + Math.sin(tt) * 0.03) * W;
      const y = (baseY + Math.cos(tt * 1.3) * 0.03) * H;
      const flick = reducedMotion ? 0.5 : (Math.sin(tt * 3) * 0.5 + 0.5);
      ctx.fillStyle = `rgba(${theme.firefly},${0.15 + flick * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render(dt, state) {
    if (!ctx) return;
    t += dt;
    const W = state.W, H = state.H;
    const theme = THEMES[state.theme] || THEMES.night;
    const reducedMotion = !!state.reducedMotion;
    const highContrast = !!state.highContrast;

    ctx.save();
    if (state.shakeX || state.shakeY) ctx.translate(state.shakeX || 0, state.shakeY || 0);

    drawBackground(W, H, theme, reducedMotion);
    if (state.deco) drawDecorations(state.deco, W, H, theme, reducedMotion);
    if (state.deco && state.deco.koi && state.theme === 'night') drawKoi(state.deco.koi, W, H, theme, reducedMotion);
    if (state.shallow) drawShallow(state.shallow, theme);
    if (state.currents) drawCurrents(state.currents, reducedMotion);
    if (state.hazards) drawHazards(state.hazards, reducedMotion);
    if (state.rocks) drawRocks(state.rocks);
    if (state.goal) drawGoal(state.goal, theme, reducedMotion, highContrast);
    if (state.ripples) drawRipples(state.ripples, theme, state.rippleGlow !== false, highContrast);
    if (state.particles) drawSplashParticles(state.particles);
    if (state.orbs) for (const orb of state.orbs) drawOrb(orb, theme, state.rippleGlow !== false);
    if (state.theme === 'night' && !reducedMotion) drawFireflies(W, H, theme, reducedMotion, state.sceneSeed || 1);
    if (state.rain) drawRain(W, H, reducedMotion);
    drawVignette(W, H, theme, highContrast);

    ctx.restore();
  }

  return { init, render, generateDecorations, setRain };
})();
