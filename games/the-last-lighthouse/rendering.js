/* The Last Lighthouse — a deterministic, render-only nautical chart. */
(function (global) {
  'use strict';
  const TAU = Math.PI * 2;
  const C = { ocean: '#0a252b', mint: '#a2ccba', coral: '#c48b7c', ivory: '#eee5ca', gold: '#edce86' };
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
  function line(c, x, y, x2, y2) { c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); }
  function polygon(c, x, y, r, sides, phase) {
    c.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = phase + i * TAU / sides;
      const rr = r * (0.86 + 0.14 * Math.sin(i * 13.7 + x));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }
  class Renderer {
    constructor(canvas, world, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.world = world;
      this.size = world.size || 1000;
      this.reducedMotion = !!options.reducedMotion;
      this.beamWidth = options.beamWidth || 38 * Math.PI / 180;
      this.beamRange = options.beamRange || 760;
      this.cache = document.createElement('canvas');
      this.effects = [];
      this.clock = 0;
      this.waves = [];
      let seed = 521729;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 100; i++) this.waves.push({ x: random() * this.size, y: random() * this.size, w: 7 + random() * 22, phase: random() * TAU });
      this.resize(canvas.clientWidth || 600, canvas.clientHeight || 600, global.devicePixelRatio || 1);
    }
    resize(width, height, dpr = 1) {
      this.width = Math.max(1, width); this.height = Math.max(1, height);
      this.dpr = Math.max(1, Math.min(2, dpr || 1));
      this.edge = Math.min(this.width, this.height);
      this.left = (this.width - this.edge) / 2; this.top = (this.height - this.edge) / 2;
      this.scale = this.edge / this.size;
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px'; this.canvas.style.height = this.height + 'px';
      const resolution = Math.max(1, Math.round(this.edge * this.dpr));
      this.cache.width = resolution; this.cache.height = resolution;
      const c = this.cache.getContext('2d');
      c.setTransform(resolution / this.size, 0, 0, resolution / this.size, 0, 0);
      this.drawChart(c);
    }
    screenToWorld(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      const x = (clientX - r.left) * this.width / (r.width || 1);
      const y = (clientY - r.top) * this.height / (r.height || 1);
      return { x: (x - this.left) / this.scale, y: (y - this.top) / this.scale };
    }
    setReducedMotion(value) { this.reducedMotion = !!value; }
    event(e) {
      if (!e) return;
      const kind = e.type || e.kind;
      if (!/rescue|arrival|lost|loss/i.test(kind || '')) return;
      const p = e.ship || e;
      this.effects.push({ x: Number.isFinite(p.x) ? p.x : this.world.harbor.x, y: Number.isFinite(p.y) ? p.y : this.world.harbor.y, good: /rescue|arrival/i.test(kind), born: this.clock });
      if (this.effects.length > 16) this.effects.shift();
    }
    drawChart(c) {
      const n = this.size;
      const sea = c.createRadialGradient(n * .45, n * .48, 30, n * .5, n * .5, n * .75);
      sea.addColorStop(0, '#153a3e'); sea.addColorStop(.6, '#0d2d33'); sea.addColorStop(1, '#071c25');
      c.fillStyle = sea; c.fillRect(0, 0, n, n);
      c.strokeStyle = 'rgba(154,197,186,.035)'; c.lineWidth = 1;
      for (let x = 50; x < n; x += 100) line(c, x, 0, x, n);
      for (let y = 50; y < n; y += 100) line(c, 0, y, n, y);
      // Chart margin and sparse sounding marks give the ocean a tangible scale.
      c.strokeStyle = 'rgba(179,208,195,.12)'; c.lineWidth = 1;
      c.strokeRect(18, 18, n - 36, n - 36);
      for (let p = 50; p < n; p += 50) {
        const tick = p % 100 === 0 ? 7 : 3;
        line(c, p, 18, p, 18 + tick); line(c, 18, p, 18 + tick, p);
        line(c, p, n - 18, p, n - 18 - tick); line(c, n - 18, p, n - 18 - tick, p);
      }
      const h = this.world.harbor;
      c.setLineDash([2, 13]); c.strokeStyle = 'rgba(149,196,184,.10)';
      for (let i = 0; i < 4; i++) {
        const x = i < 2 ? 80 : n - 80, y = i % 2 ? n - 130 : 130;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x, h.y, h.x, h.y); c.stroke();
      }
      c.setLineDash([]);
      for (const reef of this.world.reefs || []) this.drawReef(c, reef, false);
      for (const rock of this.world.rocks || []) this.drawRock(c, rock);
      this.drawHarbor(c);
      const island = this.world.island;
      for (let i = 3; i >= 1; i--) {
        polygon(c, island.x, island.y, island.r + i * 9, 13, .2);
        c.fillStyle = i === 1 ? '#344b4a' : 'rgba(139,172,151,.07)'; c.fill();
        c.strokeStyle = 'rgba(179,195,167,.12)'; c.lineWidth = 1; c.stroke();
      }
      polygon(c, island.x, island.y, island.r, 11, .2); c.fillStyle = '#526057'; c.fill();
      polygon(c, island.x - 6, island.y + 6, island.r * .7, 8, .6); c.fillStyle = '#697061'; c.fill();
      // A modest compass rose is secondary to the rescue routes.
      c.save(); c.translate(n - 83, 83); c.strokeStyle = 'rgba(184,204,190,.25)';
      circle(c, 0, 0, 24); c.stroke(); line(c, 0, -31, 0, 31); line(c, -31, 0, 31, 0);
      c.fillStyle = '#b9c7b8'; c.font = '12px monospace'; c.textAlign = 'center'; c.fillText('N', 0, -40);
      c.restore();
    }
    drawReef(c, reef, lit) {
      const r = reef.r || 25;
      polygon(c, reef.x, reef.y, r + 9, 10, .4);
      c.fillStyle = lit ? 'rgba(195,139,111,.17)' : 'rgba(117,105,96,.15)'; c.fill();
      c.strokeStyle = lit ? 'rgba(224,162,133,.66)' : 'rgba(187,139,121,.34)';
      c.lineWidth = 1.5; c.setLineDash([4, 6]); c.stroke(); c.setLineDash([]);
      c.save(); polygon(c, reef.x, reef.y, r, 10, .4); c.clip();
      c.strokeStyle = lit ? 'rgba(217,158,127,.45)' : 'rgba(164,124,107,.22)';
      for (let x = reef.x - r * 2; x < reef.x + r * 2; x += 9) line(c, x, reef.y - r, x + r, reef.y + r);
      c.restore();
      for (let i = 0; i < 4; i++) {
        const a = i * 2.3 + reef.x;
        polygon(c, reef.x + Math.cos(a) * r * .5, reef.y + Math.sin(a) * r * .5, r * .22, 5, a);
        c.fillStyle = lit ? '#9b8470' : '#455454'; c.fill();
      }
    }
    drawRock(c, rock) {
      circle(c, rock.x, rock.y, rock.r + 7); c.strokeStyle = 'rgba(151,174,158,.16)'; c.lineWidth = 2; c.stroke();
      polygon(c, rock.x + 2, rock.y + 4, rock.r, 7, .3); c.fillStyle = '#132c30'; c.fill();
      polygon(c, rock.x - 2, rock.y - 2, rock.r * .88, 7, .3); c.fillStyle = '#586461'; c.fill();
      c.strokeStyle = '#7d8271'; c.lineWidth = 1; c.stroke();
    }
    drawHarbor(c) {
      const h = this.world.harbor;
      const g = c.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r * 1.8);
      g.addColorStop(0, 'rgba(134,207,171,.12)'); g.addColorStop(1, 'rgba(134,207,171,0)');
      c.fillStyle = g; circle(c, h.x, h.y, h.r * 1.8); c.fill();
      c.strokeStyle = 'rgba(159,208,181,.48)'; c.lineWidth = 1.5;
      circle(c, h.x, h.y, h.r); c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#7e8b77'; c.lineWidth = 7;
      line(c, h.x - h.r - 6, h.y - 23, h.x - h.r - 6, h.y + 22);
      line(c, h.x + h.r + 6, h.y - 23, h.x + h.r + 6, h.y + 22);
      c.fillStyle = C.mint;
      for (const side of [-1, 1]) {
        circle(c, h.x + side * (h.r + 6), h.y + 24, 4); c.fill();
      }
      c.font = '12px monospace'; c.textAlign = 'center'; c.fillStyle = '#acd0b9';
      c.fillText('SAFE HARBOR', h.x, h.y + h.r + 25);
      c.strokeStyle = 'rgba(173,209,187,.55)'; c.lineWidth = 1.5;
      line(c, h.x - 9, h.y + 4, h.x, h.y + 12); line(c, h.x, h.y + 12, h.x + 14, h.y - 8);
    }
    drawBeam(c, sim, time) {
      if (!sim.beamOn) return;
      const l = this.world.lighthouse, a = sim.beamAngle || 0, half = this.beamWidth / 2;
      c.save(); c.translate(l.x, l.y); c.rotate(a);
      const gradient = c.createRadialGradient(0, 0, 8, 0, 0, this.beamRange);
      gradient.addColorStop(0, 'rgba(255,223,157,.34)'); gradient.addColorStop(.35, 'rgba(240,206,134,.15)'); gradient.addColorStop(1, 'rgba(233,209,146,.015)');
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, this.beamRange, -half, half); c.closePath();
      c.fillStyle = gradient; c.fill(); c.clip();
      c.strokeStyle = 'rgba(247,218,160,.12)'; c.lineWidth = 1;
      line(c, 0, 0, Math.cos(half) * this.beamRange, Math.sin(half) * this.beamRange);
      line(c, 0, 0, Math.cos(half) * this.beamRange, -Math.sin(half) * this.beamRange);
      if (!this.reducedMotion) for (let i = 0; i < 16; i++) {
        const x = 45 + (i * 89 + time * 13) % (this.beamRange - 45), y = Math.sin(i * 7.3) * x * .28;
        c.fillStyle = 'rgba(249,226,173,.17)'; c.fillRect(x, y, 2 + i % 2, 1);
      }
      c.restore();
      for (const reef of this.world.reefs || []) {
        const dx = reef.x - l.x, dy = reef.y - l.y;
        const d = Math.atan2(Math.sin(Math.atan2(dy, dx) - a), Math.cos(Math.atan2(dy, dx) - a));
        if (Math.abs(d) < half + .07 && Math.hypot(dx, dy) < this.beamRange) this.drawReef(c, reef, true);
      }
    }
    drawCurrents(c, time, storm) {
      c.strokeStyle = 'rgba(139,185,189,' + (.14 + storm * .09) + ')'; c.lineWidth = 1.5;
      for (const current of this.world.currents || []) {
        c.save(); c.translate(current.x, current.y); c.rotate(current.angle || 0);
        for (let i = -1; i <= 1; i++) {
          const x = i * 28 + (this.reducedMotion ? 0 : Math.sin(time * .4 + i) * 5);
          c.beginPath(); c.moveTo(x - 13, -12); c.quadraticCurveTo(x + 20, 0, x - 13, 12); c.stroke();
        }
        c.restore();
      }
    }
    drawWeather(c, time, storm) {
      // Broad, transparent banks pass below vessels and warning indicators.
      for (let i = 0; i < 4; i++) {
        const x = (i * 327 + Math.sin(time * .023 + i * 2) * 90 + 100) % this.size;
        const y = 130 + i * 240;
        const g = c.createRadialGradient(x, y, 20, x, y, 360);
        g.addColorStop(0, 'rgba(157,185,191,' + (.022 + storm * .046) + ')');
        g.addColorStop(1, 'rgba(157,185,191,0)');
        c.fillStyle = g; c.fillRect(x - 360, y - 360, 720, 720);
      }
      if (storm > .38 && !this.reducedMotion) {
        c.strokeStyle = 'rgba(172,199,205,' + storm * .11 + ')'; c.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
          const x = ((i * 157.1 - time * 47) % this.size + this.size) % this.size;
          const y = (i * 83.7 + time * 160) % this.size;
          line(c, x, y, x - 5, y + 15);
        }
      }
    }
    drawShip(c, ship, time) {
      const lit = !!ship.illuminated, confidence = Math.max(0, Math.min(1, ship.confidence || 0));
      c.save(); c.translate(ship.x, ship.y);
      // Wake doubles as a heading cue even when the light is elsewhere.
      c.save(); c.rotate(ship.angle || 0);
      c.strokeStyle = lit ? 'rgba(217,227,204,.32)' : 'rgba(151,188,185,.22)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-18, -6); c.quadraticCurveTo(-32, -13, -49, -12); c.moveTo(-18, 6); c.quadraticCurveTo(-32, 13, -49, 12); c.stroke();
      if (lit) {
        c.strokeStyle = 'rgba(211,221,177,.4)'; c.setLineDash([3, 7]); line(c, 24, 0, 65, 0); c.setLineDash([]);
      }
      c.shadowColor = '#020e13'; c.shadowBlur = 6; c.shadowOffsetY = 4;
      c.beginPath();
      const cargo = ship.type === 'cargo', sail = ship.type === 'sail';
      const length = cargo ? 29 : 23, breadth = cargo ? 11 : 10;
      c.moveTo(length, 0); c.lineTo(length - 10, -breadth); c.lineTo(-length, -breadth + 2); c.lineTo(-length - 3, 0); c.lineTo(-length, breadth - 2); c.lineTo(length - 10, breadth); c.closePath();
      c.fillStyle = cargo ? '#b9b4a0' : sail ? '#ddd6bb' : '#c18f67'; c.fill();
      c.shadowBlur = 0; c.shadowOffsetY = 0; c.strokeStyle = lit ? '#f2dfac' : '#e0ccb0'; c.lineWidth = 1; c.stroke();
      if (cargo) {
        c.fillStyle = '#5e7b77'; c.fillRect(-5, -8, 12, 16); c.fillStyle = '#9a7561'; c.fillRect(10, -7, 9, 14);
        c.fillStyle = '#d2d0b8'; c.fillRect(-23, -7, 12, 14); c.fillStyle = '#304e55'; c.fillRect(-18, -5, 3, 10);
      } else if (sail) {
        c.strokeStyle = '#715f48'; c.lineWidth = 2; line(c, -15, 0, 15, 0);
        c.beginPath(); c.moveTo(3, -2); c.lineTo(-7, -28); c.lineTo(-15, -2); c.closePath(); c.fillStyle = '#f3ead1'; c.fill();
        c.beginPath(); c.moveTo(5, 1); c.lineTo(12, 18); c.lineTo(-12, 1); c.closePath(); c.fillStyle = '#bcbba9'; c.fill();
      } else {
        c.fillStyle = '#e0d9bd'; c.fillRect(-12, -7, 12, 14); c.fillStyle = '#34535b'; c.fillRect(-9, -5, 5, 10);
        c.strokeStyle = '#d9c5a1'; line(c, 4, -6, 4, 6);
      }
      c.fillStyle = C.mint; circle(c, 10, -breadth + 1, 2); c.fill();
      c.restore();
      if (confidence > .01 || lit) {
        c.strokeStyle = 'rgba(169,204,178,.18)'; c.lineWidth = 2.5; circle(c, 0, 0, 35); c.stroke();
        c.strokeStyle = lit ? '#e8d397' : '#a3c9b3';
        c.beginPath(); c.arc(0, 0, 35, -Math.PI / 2, -Math.PI / 2 + Math.max(.025, confidence) * TAU); c.stroke();
      }
      const warning = ship.warning || ship.danger > .35;
      if (warning) {
        const wy = -47;
        c.beginPath(); c.moveTo(0, wy - 11); c.lineTo(12, wy + 10); c.lineTo(-12, wy + 10); c.closePath();
        c.fillStyle = '#d6a78b'; c.fill(); c.fillStyle = '#132b30'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.fillText('!', 0, wy + 6);
      }
      c.font = '13px monospace'; c.textAlign = 'center';
      c.fillStyle = lit ? '#f0dfb0' : '#c2d2c8';
      c.fillText(String(ship.id).replace(/^ship-/, '').padStart(2, '0'), 0, 53);
      c.restore();
    }
    drawLighthouse(c, sim, time) {
      const l = this.world.lighthouse;
      c.save(); c.translate(l.x, l.y);
      c.fillStyle = 'rgba(0,12,17,.24)'; c.beginPath(); c.ellipse(12, 42, 26, 12, -.3, 0, TAU); c.fill();
      // Lantern is exactly the beam origin; the ivory tower extends toward shore.
      c.beginPath(); c.moveTo(-10, 8); c.lineTo(-18, 43); c.quadraticCurveTo(0, 51, 18, 43); c.lineTo(10, 8); c.closePath();
      const stone = c.createLinearGradient(-18, 0, 18, 0); stone.addColorStop(0, '#9caa98'); stone.addColorStop(.5, '#f1e7c9'); stone.addColorStop(1, '#c3c4a9');
      c.fillStyle = stone; c.fill(); c.strokeStyle = '#778278'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#40565a'; c.fillRect(-3, 21, 6, 9); c.fillStyle = '#6a7362'; c.fillRect(-4, 38, 8, 9);
      c.strokeStyle = 'rgba(114,125,110,.5)'; line(c, -13, 30, 13, 30);
      c.fillStyle = '#64766c'; circle(c, 0, 6, 19); c.fill();
      c.strokeStyle = '#c7c6a8'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 6, 21, 10, 0, 0, TAU); c.stroke();
      for (let i = -1; i <= 1; i++) line(c, i * 16, 0, i * 16, 11);
      if (sim.beamOn) {
        const halo = c.createRadialGradient(0, 0, 2, 0, 0, 40); halo.addColorStop(0, 'rgba(250,220,145,.4)'); halo.addColorStop(1, 'rgba(250,220,145,0)');
        c.fillStyle = halo; circle(c, 0, 0, 40); c.fill();
      }
      c.fillStyle = sim.beamOn ? '#f4dc9a' : '#617b75'; c.fillRect(-9, -9, 18, 16);
      c.strokeStyle = '#4b625d'; c.lineWidth = 2; c.strokeRect(-10, -10, 20, 18); line(c, 0, -10, 0, 8);
      c.beginPath(); c.moveTo(-16, -10); c.lineTo(0, -22); c.lineTo(16, -10); c.closePath(); c.fillStyle = '#6f8176'; c.fill();
      c.strokeStyle = '#b7bca1'; c.lineWidth = 1; line(c, -15, -10, 15, -10); line(c, 0, -22, 0, -28);
      c.restore();
    }
    render(sim, renderTime, dt = 0) {
      if (!this.ctx || !sim) return;
      const c = this.ctx;
      this.clock += Math.max(0, Math.min(.1, dt || 0));
      const time = this.reducedMotion ? 0 : (Number.isFinite(renderTime) ? renderTime : sim.time || 0);
      const storm = Math.max(0, Math.min(1, sim.storm || 0));
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = '#071c25'; c.fillRect(0, 0, this.width, this.height);
      c.save(); c.translate(this.left, this.top); c.scale(this.scale, this.scale);
      c.beginPath(); c.rect(0, 0, this.size, this.size); c.clip();
      c.drawImage(this.cache, 0, 0, this.size, this.size);
      c.lineWidth = 1.2;
      for (let i = 0; i < this.waves.length; i++) {
        const w = this.waves[i], drift = Math.sin(time * .27 + w.phase);
        c.strokeStyle = 'rgba(159,197,187,' + (.025 + (drift + 1) * .023) + ')';
        c.beginPath(); c.moveTo(w.x, w.y); c.quadraticCurveTo(w.x + w.w * .5, w.y + 2 + drift * 2, w.x + w.w, w.y); c.stroke();
      }
      this.drawCurrents(c, time, storm);
      this.drawBeam(c, sim, time);
      this.drawWeather(c, time, storm);
      this.drawLighthouse(c, sim, time);
      for (const ship of sim.ships || []) this.drawShip(c, ship, time);
      for (let i = this.effects.length - 1; i >= 0; i--) {
        const e = this.effects[i], age = this.clock - e.born;
        if (age > 2.2) { this.effects.splice(i, 1); continue; }
        const fade = 1 - age / 2.2;
        c.globalAlpha = fade * .8; c.strokeStyle = e.good ? C.mint : C.coral; c.lineWidth = 2;
        circle(c, e.x, e.y, this.reducedMotion ? 34 : 20 + age * 30); c.stroke();
        c.font = 'bold 16px monospace'; c.fillStyle = e.good ? C.mint : C.coral; c.textAlign = 'center';
        c.fillText(e.good ? 'HOME' : 'LOST', e.x, e.y - 28 - (this.reducedMotion ? 0 : age * 12));
        c.globalAlpha = 1;
      }
      c.restore();
    }
    destroy() { this.effects.length = 0; this.waves.length = 0; this.cache.width = 1; this.cache.height = 1; this.ctx = null; }
  }
  global.LastLighthouseRendering = Object.freeze({ Renderer });
})(globalThis);
