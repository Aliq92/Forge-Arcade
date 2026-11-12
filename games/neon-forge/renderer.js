const TAU = Math.PI * 2;
const COLORS = { spark: '#51deee', drifter: '#b393ff', bulwark: '#ffad66', splinter: '#ff7ebc' };
const BURST_COLORS = ['#51efff', '#ff58b0', '#ffe36b', '#ae80ff', '#66ffbb', '#ff9166'];
const TINTS = [
  ['#122a3c', '#48b7cc', '#9764d2'], ['#211d3a', '#b579e5', '#e367ab'],
  ['#142c30', '#59c8a4', '#d9a34d'], ['#2c2030', '#e47ca9', '#6e9ce0'],
  ['#202738', '#e1b763', '#6cbab8'], ['#19233c', '#759ee6', '#bc7ed5'],
];
const clock = () => globalThis.performance?.now?.() ?? Date.now();

/** Presentation only. Every coordinate accepted or returned is a canvas CSS pixel. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = this.height = 0;
    this.center = { x: 0, y: 0 };
    this.scale = 1;
    this.metrics = { frameMs: 0, particles: 0, shockwaves: 0, drawnTargets: 0, dpr: 1, stage: 1, tint: 0, cacheBuilds: 0 };
    this.pool = Array.from({ length: 320 }, () => ({ life: 0, maxLife: 1, x: 0, y: 0, vx: 0, vy: 0, color: '', size: 0 }));
    this.shockwaves = Array.from({ length: 8 }, () => ({ life: 0, maxLife: 1, x: 0, y: 0, radius: 0, speed: 0, color: '', width: 0 }));
    this.pending = [];
    this.labels = [];
    this._time = null;
    this._cacheKey = '';
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const dpr = Math.min(1.5, Math.max(1, globalThis.devicePixelRatio || 1));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    const portrait = this.width < 700 && this.height > this.width;
    const short = this.height < 520;
    const top = short ? 80 : portrait ? 155 : 110;
    const bottom = short ? 65 : portrait ? 160 : 90;
    const available = Math.max(1, this.height - top - bottom);
    // World edge includes a ten-unit containment border. All decorative machinery stays inside.
    this.scale = Math.max(0.001, Math.min((this.width - 28) / 580, available / 580));
    this.center.x = this.width / 2;
    this.center.y = top + available / 2;
    this.metrics.dpr = dpr;
    this.metrics.safeTop = top;
    this.metrics.safeBottom = bottom;
    this._cacheKey = '';
  }

  screen(angle, r) {
    return { x: this.center.x + Math.cos(angle) * r * this.scale, y: this.center.y + Math.sin(angle) * r * this.scale };
  }

  angle(x, y) { return Math.atan2(y - this.center.y, x - this.center.x); }

  feedback(events) {
    for (const event of events || []) {
      if (this.pending.length === 128) this.pending.shift();
      // Copy only fields that are used; no references into mutable simulation objects.
      this.pending.push({ type: event.type, angle: event.angle || 0, r: event.r || 0, perfect: !!event.perfect, text: event.text, value: event.value, targetType: event.targetType });
    }
  }

  _circle(ctx, r) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); }
  _polygon(ctx, sides, radius, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = rotation + TAU * i / sides;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  _arena(stage, low, tint) {
    const key = `${this.width}:${this.height}:${this.metrics.dpr}:${stage}:${low}:${tint}`;
    if (key === this._cacheKey) return;
    const doc = this.canvas.ownerDocument || globalThis.document;
    this._arenaCanvas ||= doc.createElement('canvas');
    const canvas = this._arenaCanvas;
    canvas.width = this.canvas.width; canvas.height = this.canvas.height;
    const c = canvas.getContext('2d');
    c.setTransform(this.metrics.dpr, 0, 0, this.metrics.dpr, 0, 0);
    c.fillStyle = '#070b17'; c.fillRect(0, 0, this.width, this.height);
    const gradient = c.createRadialGradient(this.center.x, this.center.y, 10, this.center.x, this.center.y, Math.max(this.width, this.height) * .7);
    const palette = TINTS[tint];
    gradient.addColorStop(0, palette[0]); gradient.addColorStop(.55, '#0b1425'); gradient.addColorStop(1, '#060913');
    c.fillStyle = gradient; c.fillRect(0, 0, this.width, this.height);
    c.save(); c.translate(this.center.x, this.center.y); c.scale(this.scale, this.scale);
    c.fillStyle = '#0a1524'; this._circle(c, 280); c.fill();
    c.strokeStyle = '#243b4c'; c.lineWidth = 1;
    for (const r of [30, 132, 206, 270, 280]) { this._circle(c, r); c.stroke(); }
    c.strokeStyle = '#203547';
    for (let i = 0; i < 48; i++) {
      const a = i * TAU / 48, inner = i % 4 ? 264 : 250;
      c.beginPath(); c.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); c.lineTo(Math.cos(a) * 277, Math.sin(a) * 277); c.stroke();
      if (i % 4 === 0) { c.beginPath(); c.moveTo(Math.cos(a) * 143, Math.sin(a) * 143); c.lineTo(Math.cos(a) * 244, Math.sin(a) * 244); c.stroke(); }
    }
    // Mechanical perimeter sectors: evolutions remain away from incoming silhouettes.
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      c.save(); c.rotate(a); c.fillStyle = '#101e30'; c.strokeStyle = '#345165'; c.lineWidth = 1;
      c.fillRect(258, -11, 26, 22); c.strokeRect(258, -11, 26, 22);
      c.fillStyle = i % 3 === 0 ? '#ebbc75' : i % 2 ? palette[2] : palette[1]; c.fillRect(270, -6, 4, 12);
      // Bright colour is confined to the machinery outside the playable lanes.
      c.strokeStyle = i % 2 ? palette[1] : palette[2]; c.lineWidth = stage >= 4 ? 3 : 2;
      c.beginPath(); c.arc(0, 0, 284, -.033, .033); c.stroke();
      if (stage >= 3) { c.fillStyle = i % 2 ? '#4d426f' : '#255c73'; c.fillRect(249, -5, 5, 10); }
      c.restore();
    }
    if (stage >= 2) {
      c.strokeStyle = stage >= 5 ? '#348ba0' : '#235b6b'; c.lineWidth = 2; this._circle(c, 244); c.stroke();
    }
    if (stage >= 3) {
      c.strokeStyle = '#413859'; c.lineWidth = 1; this._polygon(c, 12, 232, Math.PI / 12); c.stroke();
    }
    if (stage >= 4) {
      c.strokeStyle = '#4a3751'; c.setLineDash([3, 14]); this._circle(c, 188); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * TAU / 6); c.fillStyle = '#254257'; c.fillRect(214, -2, 15, 4); c.restore(); }
    }
    if (stage >= 5) {
      c.strokeStyle = palette[1]; c.lineWidth = 2; this._polygon(c, 24, 277, Math.PI / 24); c.stroke();
      c.strokeStyle = '#805a9b'; this._circle(c, 217); c.stroke();
    }
    // The dashed ideal line is radius86. Per-target caps below show the exact speed-dependent band.
    c.strokeStyle = '#52717c'; c.lineWidth = 1; c.setLineDash([2, 7]); this._circle(c, 86); c.stroke(); c.setLineDash([]);
    c.font = '7px monospace'; c.textAlign = 'center'; c.fillStyle = '#65818c'; c.fillText('PERFECT', 0, -91);
    c.restore();
    this.metrics.cacheBuilds++;
    this._cacheKey = key;
  }

  _effects(dt, low, reduced) {
    const cap = reduced ? 0 : low ? 80 : 320;
    const ringCap = reduced ? 0 : low ? 3 : 8;
    for (let i = cap; i < this.pool.length; i++) this.pool[i].life = 0;
    for (let i = ringCap; i < this.shockwaves.length; i++) this.shockwaves[i].life = 0;
    if (reduced) this.labels.length = 0;
    for (const e of this.pending) {
      const special = ['perfect', 'combo', 'upgrade', 'bossPhase', 'victory', 'bossDefeat', 'level'].includes(e.type);
      if (special && !reduced && this.labels.length < 4) {
        const text = e.type === 'perfect' ? 'PERFECT' : e.type === 'combo' ? `${e.value || ''} CHAIN` : e.type === 'bossPhase' ? 'CORE SHIFT' : e.type === 'bossDefeat' ? 'CORE SHATTERED' : e.type === 'level' ? `LEVEL ${e.value || ''}` : e.type === 'victory' ? 'FORGE COMPLETE' : 'UPGRADED';
        this.labels.push({ text, life: .8, angle: e.angle, r: e.r || 62 });
      }
      if (!['hit', 'perfect', 'destroy', 'strike', 'echo', 'chain', 'damage', 'combo', 'upgrade', 'victory', 'bossPhase', 'bossDefeat', 'level'].includes(e.type)) continue;
      const boss = e.type === 'bossDefeat';
      let count = reduced ? 0 : low ? boss ? 36 : special ? 20 : 8 : boss ? 120 : special ? 60 : 24;
      if (ringCap && (special || e.type === 'hit' || e.type === 'destroy')) {
        const ring = this.shockwaves.find((ring, index) => index < ringCap && ring.life <= 0);
        if (ring) {
          ring.x = Math.cos(e.angle) * e.r; ring.y = Math.sin(e.angle) * e.r;
          ring.life = ring.maxLife = boss ? .85 : special ? .56 : .32;
          ring.radius = boss ? 12 : 3; ring.speed = boss ? 160 : special ? 108 : 72;
          ring.color = boss ? '#ff74ca' : e.type === 'perfect' ? '#ffe36b' : BURST_COLORS[count % BURST_COLORS.length];
          ring.width = boss ? 4 : special ? 2.7 : 1.5;
        }
      }
      for (let i = 0; i < cap && count > 0; i++) {
        const p = this.pool[i]; if (p.life > 0) continue;
        const a = e.angle + count * 2.399963, speed = (special ? 62 : 34) + (count % 9) * (boss ? 22 : special ? 15 : 9);
        p.x = Math.cos(e.angle) * e.r; p.y = Math.sin(e.angle) * e.r;
        p.vx = Math.cos(a) * speed; p.vy = Math.sin(a) * speed;
        p.life = p.maxLife = (boss ? .5 : special ? .35 : .25) + (count % 5) * .07;
        p.color = e.type === 'damage' ? count % 2 ? '#ff829d' : '#ffc07d' : count % 4 === 0 && COLORS[e.targetType] ? COLORS[e.targetType] : BURST_COLORS[count % BURST_COLORS.length];
        p.size = boss ? 3 + count % 3 : special ? 2.5 + count % 3 : 1.8 + count % 2; count--;
      }
    }
    this.pending.length = 0;
    const c = this.ctx;
    let rings = 0;
    for (let i = 0; i < ringCap; i++) {
      const ring = this.shockwaves[i];
      if (ring.life <= 0) continue;
      ring.life -= dt; if (ring.life <= 0) continue;
      ring.radius += ring.speed * dt;
      c.globalAlpha = .7 * ring.life / ring.maxLife; c.strokeStyle = ring.color; c.lineWidth = ring.width * (.4 + .6 * ring.life / ring.maxLife);
      c.beginPath(); c.arc(ring.x, ring.y, ring.radius, 0, TAU); c.stroke(); rings++;
    }
    this.metrics.shockwaves = rings;
    let alive = 0;
    for (let i = 0; i < cap; i++) {
      const p = this.pool[i]; if (p.life <= 0) continue;
      p.life -= dt; if (p.life <= 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      c.globalAlpha = p.life / p.maxLife; c.fillStyle = p.color;
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); alive++;
    }
    c.globalAlpha = 1;
    this.metrics.particles = alive;
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const label = this.labels[i]; label.life -= dt;
      if (label.life <= 0) { this.labels.splice(i, 1); continue; }
      c.globalAlpha = Math.min(1, label.life * 3);
      c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillStyle = '#fff0b5';
      c.fillText(label.text, Math.cos(label.angle) * label.r, Math.sin(label.angle) * label.r - 14 - (1 - label.life) * 9 - i * 16);
    }
    c.globalAlpha = 1;
  }

  _target(target) {
    const c = this.ctx, size = target.child ? 7 : target.type === 'bulwark' ? 13 : 10;
    c.save(); c.translate(Math.cos(target.angle) * target.r, Math.sin(target.angle) * target.r);
    c.rotate(target.angle + Math.PI);
    const color = COLORS[target.type] || COLORS.spark;
    // Dark backing keeps edges distinct even over evolved arena geometry.
    c.fillStyle = '#050a12'; c.strokeStyle = '#050a12'; c.lineWidth = 6;
    const sides = target.type === 'spark' ? 3 : target.type === 'bulwark' ? 6 : 4;
    const rotation = target.type === 'splinter' ? Math.PI / 4 : 0;
    this._polygon(c, sides, size, rotation); c.fill(); c.stroke();
    c.lineWidth = 2; c.strokeStyle = color; c.stroke();
    c.fillStyle = color;
    if (target.child) { c.fillRect(-2, -2, 4, 4); }
    else if (target.type === 'spark') { this._polygon(c, 3, 4, 0); c.fill(); }
    else if (target.type === 'drifter') { c.beginPath(); c.moveTo(-4, 0); c.lineTo(0, -4); c.lineTo(4, 0); c.stroke(); }
    else if (target.type === 'splinter') { c.fillRect(-4, -1, 8, 2); c.fillRect(-1, -4, 2, 8); }
    else if (target.cracked || target.hp < target.maxHp) {
      c.strokeStyle = '#fff1cc'; c.lineWidth = 2; c.beginPath(); c.moveTo(-7, -8); c.lineTo(-1, -3); c.lineTo(-4, 2); c.lineTo(3, 5); c.lineTo(5, 11); c.stroke();
    } else { this._polygon(c, 6, 6); c.stroke(); }
    c.restore();
    if (Math.abs(target.r - 86) < 22) {
      const tolerance = target.speed * .05;
      c.strokeStyle = Math.abs(target.r - 86) <= tolerance ? '#ffdf89' : '#6e919b'; c.lineWidth = 1.5;
      for (const r of [86 - tolerance, 86 + tolerance]) { c.beginPath(); c.arc(0, 0, r, target.angle - .065, target.angle + .065); c.stroke(); }
    }
  }

  _boss(boss, time, reduced) {
    const c = this.ctx, color = boss.vulnerable ? '#ffde88' : boss.phase === 3 ? '#ff7ebc' : '#b393ff';
    const angle = boss.angle || 0, r = boss.r;
    if (boss.telegraph && !boss.vulnerable) {
      c.strokeStyle = '#8a697a'; c.lineWidth = 1.5; c.setLineDash([4, 5]);
      c.beginPath(); c.moveTo(Math.cos(angle) * 98, Math.sin(angle) * 98); c.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); c.stroke(); c.setLineDash([]);
      c.save(); c.translate(Math.cos(angle) * 104, Math.sin(angle) * 104); c.strokeStyle = '#ffbe99'; this._polygon(c, 4, 12, Math.PI / 4); c.stroke(); c.restore();
    }
    c.save(); c.translate(Math.cos(angle) * r, Math.sin(angle) * r);
    c.fillStyle = '#070b17'; this._circle(c, 27); c.fill();
    c.strokeStyle = color; c.lineWidth = 2;
    c.save(); c.rotate(reduced ? 0 : time * .16); this._polygon(c, 8, 25, Math.PI / 8); c.stroke(); c.restore();
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + (reduced ? 0 : time * -.2);
      c.lineWidth = 4; c.strokeStyle = boss.vulnerable ? '#76586d' : '#62517d'; c.beginPath(); c.arc(0, 0, 18, a, a + .56); c.stroke();
    }
    c.fillStyle = boss.vulnerable ? '#fff2b5' : '#4b3d68'; this._polygon(c, boss.phase === 3 ? 3 : 6, boss.vulnerable ? 10 : 7); c.fill();
    if (boss.vulnerable) { c.strokeStyle = '#ffde88'; c.lineWidth = 1; this._circle(c, 12); c.stroke(); }
    c.lineWidth = 3; c.strokeStyle = '#28324b'; c.beginPath(); c.arc(0, 0, 31, -.5 * Math.PI, 1.5 * Math.PI); c.stroke();
    c.strokeStyle = color; c.beginPath(); c.arc(0, 0, 31, -.5 * Math.PI, -.5 * Math.PI + TAU * Math.max(0, Math.min(1, boss.hp / boss.maxHp))); c.stroke();
    c.font = 'bold 7px monospace'; c.textAlign = 'center'; c.fillStyle = color; c.fillText(`P${boss.phase} ${boss.vulnerable ? 'OPEN' : boss.telegraph ? 'INCOMING' : 'SEALED'}`, 0, -37);
    c.restore();
  }

  _robot(player, time, reduced) {
    const c = this.ctx;
    c.save(); c.rotate(player.angle);
    c.strokeStyle = '#294b5a'; c.lineWidth = 1; c.setLineDash([3, 6]); c.beginPath(); c.moveTo(30, 0); c.lineTo(132, 0); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#06131e'; c.strokeStyle = '#6eeaff'; c.lineWidth = 2;
    c.fillRect(-11, -15, 18, 30); c.strokeRect(-11, -15, 18, 30);
    c.fillStyle = '#18364a'; c.fillRect(-15, -12, 5, 8); c.fillRect(-15, 4, 5, 8);
    c.fillStyle = '#111f31'; this._circle(c, 13); c.fill(); c.stroke();
    c.fillStyle = player.invulnerable > 0 ? '#fff0c5' : '#70edff'; this._circle(c, 5); c.fill();
    c.fillStyle = '#224e61'; c.fillRect(10, -6, 14, 12); c.strokeRect(10, -6, 14, 12);
    c.fillStyle = '#c7faff'; c.fillRect(22, -5, 4, 10);
    c.restore();
    const shields = Math.max(0, player.shields || 0), max = Math.max(3, player.maxShields || 3);
    c.lineWidth = 2;
    for (let i = 0; i < max; i++) { c.strokeStyle = i < shields ? '#46a8bb' : '#283748'; c.beginPath(); c.arc(0, 0, 22, i * TAU / max + .12, (i + 1) * TAU / max - .12); c.stroke(); }
    if (player.recovery > 0 && !player.attack) { c.lineWidth = 1.5; c.strokeStyle = '#d59bee'; c.beginPath(); c.arc(0, 0, 28, -.5 * Math.PI, -.5 * Math.PI + TAU * Math.min(1, player.recovery / .22)); c.stroke(); }
  }

  draw(game, options = {}) {
    const begin = clock(), time = Number.isFinite(options.time) ? options.time : (game.time || 0);
    const dt = this._time === null ? 0 : Math.max(0, Math.min(.05, time - this._time)); this._time = time;
    const low = options.quality === 'low', reduced = !!options.reduced;
    const stage = Math.max(1, Math.min(5, game.stage || 1));
    const tint = Math.floor((Math.max(1, game.waveNumber || 1) - 1) / 3) % TINTS.length;
    this.metrics.tint = tint;
    this._arena(stage, low, tint);
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this._arenaCanvas, 0, 0);
    c.setTransform(this.metrics.dpr, 0, 0, this.metrics.dpr, 0, 0);
    c.save(); c.translate(this.center.x, this.center.y); c.scale(this.scale, this.scale);
    if (stage >= 3 && !reduced) {
      c.save(); c.rotate(time * .025); c.strokeStyle = stage >= 5 ? '#344861' : '#233348'; c.lineWidth = 1;
      c.setLineDash(low ? [3, 28] : [3, 12]); this._circle(c, 226); c.stroke(); c.restore();
    }
    const attack = game.player?.attack;
    if (attack) {
      c.save(); c.rotate(attack.angle); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, attack.reach, -attack.arc / 2, attack.arc / 2); c.closePath();
      c.fillStyle = '#1e647c66'; c.fill(); c.strokeStyle = '#8ef4ff'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(0, 0, attack.reach - 5, -attack.arc / 2, attack.arc / 2); c.strokeStyle = '#37a6c0'; c.lineWidth = 1; c.stroke(); c.restore();
    }
    this._effects(dt, low, reduced);
    let count = 0;
    for (const target of game.targets || []) { this._target(target); count++; }
    if (game.boss) this._boss(game.boss, time, reduced);
    if (game.player) this._robot(game.player, time, reduced);
    c.restore();
    this.metrics.drawnTargets = count; this.metrics.stage = stage;
    this.metrics.quality = low ? 'low' : 'high'; this.metrics.reduced = reduced;
    this.metrics.frameMs = clock() - begin;
  }
}
