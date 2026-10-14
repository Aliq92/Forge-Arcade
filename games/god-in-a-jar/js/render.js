import { DAY, clamp } from "./world.js";
export const project = (p) => ({ x: 140 + p.x * 0.91, y: 395 + p.y * 0.55 });
export const unproject = (p) => ({
  x: (p.x - 140) / 0.91,
  y: (p.y - 395) / 0.55,
});
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.plantSprites = new WeakMap();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width;
    this.height = r.height;
    // Bound fill cost on phones and large/high-density displays.
    const d = Math.min(devicePixelRatio || 1, r.width < 600 ? 1.5 : 2,
      Math.sqrt(2000000 / Math.max(1, r.width * r.height)));
    this.canvas.width = r.width * d;
    this.canvas.height = r.height * d;
    this.dpr = d;
    this.scale = Math.min(r.width / 1100, r.height / 790);
    this.scaleX =
      r.width / r.height < 0.85
        ? Math.min(r.width / 960, r.height / 900)
        : this.scale;
    this.scaleY =
      r.width / r.height < 0.85
        ? Math.min(r.height / 820, this.scaleX * 1.48)
        : this.scale;
    this.scale = this.scaleX;
    this.ox = (r.width - 1100 * this.scaleX) / 2;
    this.oy = (r.height - 790 * this.scaleY) / 2;
  }
  screenToJar(x, y) {
    return {
      x: ((x - this.ox) / this.scale - 550 - this.pan.x) / this.zoom + 550,
      y: ((y - this.oy) / this.scaleY - 435 - this.pan.y) / this.zoom + 435,
    };
  }
  worldToScreen(p) {
    const q = project(p);
    return {
      x: this.ox + this.scale * ((q.x - 550) * this.zoom + 550 + this.pan.x),
      y: this.oy + this.scaleY * ((q.y - 435) * this.zoom + 435 + this.pan.y),
    };
  }
  ellipse(x, y, rx, ry, color, stroke = null) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (color) {
      c.fillStyle = color;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.stroke();
    }
  }
  jarPath() {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(294, 125);
    c.lineTo(294, 160);
    c.bezierCurveTo(294, 207, 154, 211, 147, 293);
    c.bezierCurveTo(130, 412, 135, 590, 151, 640);
    c.bezierCurveTo(165, 702, 932, 702, 947, 640);
    c.bezierCurveTo(965, 583, 968, 414, 952, 293);
    c.bezierCurveTo(945, 211, 806, 207, 806, 160);
    c.lineTo(806, 125);
    c.closePath();
  }
  render(
    w,
    { target = null, power = "TOUCH", selected = null, snapshot = false } = {},
  ) {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    const bg = c.createRadialGradient(
      this.width * 0.5,
      this.height * 0.52,
      20,
      this.width * 0.5,
      this.height * 0.52,
      this.width * 0.6,
    );
    bg.addColorStop(0, "#14232d");
    bg.addColorStop(1, "#0b1118");
    c.fillStyle = bg;
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.translate(this.ox, this.oy);
    c.scale(this.scaleX, this.scaleY);
    c.translate(550 + this.pan.x, 435 + this.pan.y);
    c.scale(this.zoom, this.zoom);
    c.translate(-550, -435);
    this.ellipse(550, 728, 410, 22, "#0007");
    const table = c.createLinearGradient(0, 700, 0, 790);
    table.addColorStop(0, "#223039");
    table.addColorStop(1, "#0a1017");
    c.fillStyle = table;
    c.fillRect(-100, 714, 1300, 100);
    c.strokeStyle = "#bfd5d411";
    c.beginPath();
    c.moveTo(-100, 714);
    c.lineTo(1200, 714);
    c.stroke();
    this.jarPath();
    const glass = c.createLinearGradient(130, 0, 980, 0);
    glass.addColorStop(0, "#8bc9e10b");
    glass.addColorStop(0.2, "#8bc9e102");
    glass.addColorStop(0.8, "#8bc9e102");
    glass.addColorStop(1, "#8bc9e115");
    c.fillStyle = glass;
    c.fill();
    c.strokeStyle = "#b8e0ee38";
    c.lineWidth = 1.5;
    c.stroke();
    c.save();
    this.jarPath();
    c.clip();
    const nightTarget = (1 - Math.sin((w.time / DAY) * Math.PI * 2)) * 0.5;
    this.night =
      this.night === undefined
        ? nightTarget
        : this.night + (nightTarget - this.night) * 0.05;
    const night = this.night,
      visualTime = w.reducedMotion ? 0 : w.fastVisual ? w.time * 0.1 : w.time;
    const halo = c.createRadialGradient(550, 480, 20, 550, 480, 360);
    halo.addColorStop(0, `rgba(64,157,129,${0.12 + night * 0.03})`);
    halo.addColorStop(1, "#27404c00");
    c.fillStyle = halo;
    c.fillRect(130, 190, 840, 520);
    this.terrain(w, night);
    for (const water of w.water) {
      const q = project(water);
      this.ellipse(
        q.x,
        q.y,
        water.amount * 0.5 + 12,
        17,
        "#2a6b72",
        "#72c3c23b",
      );
      this.ellipse(q.x - 5, q.y - 3, water.amount * 0.35, 7, "#8bd8cc17");
      c.strokeStyle = "#a8eee44b";
      c.lineWidth = 0.7;
      c.beginPath();
      c.ellipse(q.x, q.y, water.amount * 0.3, 6, 0, 0.2, 2.5);
      c.stroke();
    }
    const objects = [
      ...w.plants.map((p) => ({ kind: "plant", p })),
      ...w.rocks.map((p) => ({ kind: "rock", p })),
      ...w.structures.map((p) => ({ kind: "structure", p })),
      ...w.agents.map((p) => ({ kind: "agent", p })),
      ...w.artifacts.map((p) => ({ kind: "artifact", p })),
    ].sort((a, b) => a.p.y - b.p.y);
    for (const { kind, p } of objects) {
      const q = project(p);
      if (kind === "plant") this.plant(q, p, night, visualTime);
      if (kind === "rock") this.rock(q, p);
      if (kind === "agent")
        this.agent(
          q,
          p,
          visualTime,
          selected?.kind === "agent" && selected.id === p.id,
        );
      if (kind === "structure") this.structure(q, p, night);
      if (kind === "artifact") {
        c.save();
        c.translate(q.x, q.y - (p.z || 0));
        c.rotate(p.rotation || 0.3);
        c.fillStyle = "#ef8cbb";
        c.fillRect(-5, -3, 10, 6);
        c.fillStyle = "#f4de81";
        c.fillRect(-4, -2, 3, 4);
        c.restore();
      }
    }
    for (const g of w.groups) {
      const q = project(g);
      c.font = '9px "Space Grotesk", sans-serif';
      c.textAlign = "center";
      c.fillStyle = "#d5cba979";
      c.fillText(g.name.toUpperCase(), q.x, q.y + 38);
    }
    this.effects(w);
    if (target && !snapshot) {
      const q = project(target);
      const col = {
        TOUCH: "#aeddd8",
        LIGHT: "#efdc9b",
        RAIN: "#7acbe0",
        MUTATE: "#c4a0ed",
        DISTORT: "#b4b5ee",
        CONFETTI: "#e5a9c4",
      }[power];
      this.ellipse(q.x, q.y, 95 * 0.91, 95 * 0.55, null, col + "55");
      c.setLineDash([3, 5]);
      this.ellipse(q.x, q.y, 95 * 0.91, 95 * 0.55, null, col + "99");
      c.setLineDash([]);
      c.strokeStyle = col;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(q.x - 5, q.y);
      c.lineTo(q.x + 5, q.y);
      c.moveTo(q.x, q.y - 5);
      c.lineTo(q.x, q.y + 5);
      c.stroke();
    }
    for (let i = 0; i < 23; i++) {
      const x = 210 + (Math.sin(i * 17.32) * 0.5 + 0.5) * 680,
        y = 270 + (Math.sin(i * 7.91 + visualTime * 0.04) * 0.5 + 0.5) * 285;
      this.ellipse(x, y, 1.2, 1.2, "#b0e8d443");
    }
    c.restore();
    c.lineWidth = 1;
    this.jarPath();
    c.strokeStyle = "#bfdde738";
    c.stroke();
    c.save();
    c.strokeStyle = "#d9f3f54b";
    c.lineWidth = 3;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(185, 303);
    c.bezierCurveTo(177, 373, 176, 441, 181, 515);
    c.stroke();
    c.strokeStyle = "#d9f3f522";
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(197, 278);
    c.bezierCurveTo(182, 349, 184, 377, 185, 408);
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = "#c0e7ed35";
    c.beginPath();
    c.moveTo(921, 306);
    c.bezierCurveTo(935, 395, 929, 531, 924, 576);
    c.stroke();
    for (let i = 0; i < 15; i++) {
      const x = 209 + ((i * 67) % 690),
        y = 238 + ((i * 41) % 153);
      this.ellipse(x, y, 1.8, 3, "#d1e6ef13");
    }
    c.restore();
    this.ellipse(550, 125, 257, 29, "#13212b", "#c0dde44d");
    this.ellipse(550, 126, 245, 20, "#09151c", "#b1d7df20");
    c.fillStyle = "#b4d3d709";
    c.fillRect(294, 123, 512, 33);
    this.ellipse(550, 154, 257, 25, null, "#b1d7df28");
    c.strokeStyle = "#b6d5dc4d";
    c.beginPath();
    c.ellipse(550, 671, 383, 24, 0, 0.1, Math.PI - 0.1);
    c.stroke();
    c.font = "8px monospace";
    c.fillStyle = "#7a999a79";
    c.textAlign = "center";
    c.fillText("G I A J  /  L I V I N G   A R C H I V E", 550, 694);
    c.restore();
  }
  terrain(w, night) {
    const c = this.ctx;
    if (this.terrainSeed !== w.seed) {
      this.terrainSeed = w.seed;
      this.terrainCache = document.createElement("canvas");
      this.terrainCache.width = 1100;
      this.terrainCache.height = 800;
      const original = this.ctx;
      this.ctx = this.terrainCache.getContext("2d");
      const t = this.ctx;
      this.ellipse(550, 610, 394, 51, "#151b2b");
      const soil = t.createLinearGradient(0, 538, 0, 672);
      soil.addColorStop(0, "#49405c");
      soil.addColorStop(1, "#262638");
      this.ellipse(550, 563, 391, 105, soil);
      t.save();
      t.beginPath();
      t.ellipse(550, 563, 390, 103, 0, 0, Math.PI * 2);
      t.clip();
      for (let i = 0; i < 70; i++) {
        const x = 172 + ((i * 113.77) % 750),
          y = 578 + ((i * 17.13) % 80);
        this.ellipse(x, y, 2 + (i % 3), 1.1, "#b5a1cb20");
      }
      t.strokeStyle = "#baa8bc20";
      t.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const x = 225 + i * 42;
        t.beginPath();
        t.moveTo(x, 563);
        t.bezierCurveTo(x - 10, 580, x + 12, 590, x - 8, 625);
        t.moveTo(x + 2, 583);
        t.lineTo(x + 13, 595);
        t.stroke();
      }
      t.restore();
      const moss = t.createRadialGradient(510, 470, 40, 550, 515, 400);
      moss.addColorStop(0, "#30584b");
      moss.addColorStop(0.65, "#27443e");
      moss.addColorStop(1, "#1c3438");
      this.ellipse(550, 514, 389, 101, moss, "#7cad9833");
      for (let i = 0; i < 140; i++) {
        const a = i * 2.39996,
          r = Math.sqrt((i + 0.5) / 140),
          p = {
            x: 450 + Math.cos(a) * 414 * r,
            y: 210 + Math.sin(a) * 176 * r,
          },
          q = project(p);
        this.ellipse(q.x, q.y, 1.3, 1, "#a3bea332");
        if (i % 5 === 0) {
          t.strokeStyle = "#629c813a";
          t.beginPath();
          t.moveTo(q.x, q.y);
          t.lineTo(q.x - 2, q.y - 4);
          t.moveTo(q.x, q.y);
          t.lineTo(q.x + 3, q.y - 5);
          t.stroke();
        }
      }
      this.ctx = original;
    }
    c.drawImage(this.terrainCache, 0, 0);
    this.ellipse(550, 514, 389, 100, `rgba(0,8,23,${night * 0.18})`);
    c.lineWidth = 2;
    c.setLineDash([1, 5]);
    c.strokeStyle = "#c1d4a315";
    for (const g of w.groups) {
      const q = project(g);
      for (const b of w.structures.filter(
        (b) => b.groupId === g.id && b.progress > 0.3,
      )) {
        const v = project(b);
        c.beginPath();
        c.moveTo(q.x, q.y);
        c.lineTo(v.x, v.y);
        c.stroke();
      }
    }
    c.setLineDash([]);
  }
  plant(q, p, night, t) {
    // Plants grow slowly. Rasterize their glow once per visible growth/light
    // band, then sway the cached artwork rather than blurring paths each frame.
    const h = Math.round(p.size * (0.65 + (p.food / p.capacity) * 0.55));
    const light = Math.round(night * 8) / 8;
    const key = `${h}:${light}:${p.color}`;
    let sprite = this.plantSprites.get(p);
    if (!sprite || sprite.key !== key) {
      const pad = 24, width = Math.ceil(h * 1.2 + pad * 2), height = h + pad * 2;
      const image = document.createElement("canvas");
      image.width = width * 2; image.height = height * 2;
      const original = this.ctx;
      try {
        this.ctx = image.getContext("2d");
        this.ctx.scale(2, 2);
        this.paintPlant({x: width / 2, y: height - pad},
          {...p, size: h / (0.65 + (p.food / p.capacity) * 0.55)}, light, -p.id / 1.3);
      } finally { this.ctx = original; }
      sprite = {key, image, width, height, pad};
      this.plantSprites.set(p, sprite);
    }
    const c = this.ctx;
    c.save(); c.translate(q.x, q.y);
    c.rotate(Math.sin(t * 1.3 + p.id) * 2 / Math.max(1, h));
    c.drawImage(sprite.image, -sprite.width / 2, -sprite.height + sprite.pad,
      sprite.width, sprite.height);
    c.restore();
  }
  paintPlant(q, p, night, t) {
    const c = this.ctx;
    const growth = 0.65 + (p.food / p.capacity) * 0.55,
      h = p.size * growth;
    const sway = Math.sin(t * 1.3 + p.id) * 2;
    c.save();
    c.translate(q.x, q.y);
    c.strokeStyle = "#73b6a3";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(sway, -h * 0.5, sway, -h);
    c.stroke();
    c.shadowColor = `hsl(${p.color} 65% 65%)`;
    c.shadowBlur = night * 12;
    this.ellipse(
      sway,
      -h,
      h * 0.52,
      h * 0.23,
      `hsl(${p.color} 48% ${49 + night * 13}%)`,
    );
    this.ellipse(sway - 2, -h - 2, h * 0.25, h * 0.08, "#d3ffe772");
    c.shadowBlur = 0;
    this.ellipse(-4, -h * 0.45, 5, 2, "#58a58e");
    c.restore();
  }
  rock(q, p) {
    const c = this.ctx;
    c.save();
    c.translate(q.x, q.y);
    c.beginPath();
    c.moveTo(-p.size * 0.55, 0);
    c.lineTo(-p.size * 0.3, -p.size);
    c.lineTo(p.size * 0.2, -p.size * 1.3);
    c.lineTo(p.size * 0.65, -p.size * 0.3);
    c.lineTo(p.size * 0.4, 3);
    c.closePath();
    c.fillStyle = "#61758a";
    c.fill();
    c.strokeStyle = "#b2c8da3a";
    c.stroke();
    c.beginPath();
    c.moveTo(-p.size * 0.3, -p.size);
    c.lineTo(p.size * 0.15, -p.size * 0.4);
    c.lineTo(p.size * 0.2, -p.size * 1.3);
    c.stroke();
    c.restore();
  }
  agent(q, a, t, selected) {
    const c = this.ctx;
    const s = a.appearance.size * (a.age < 12 ? 0.65 : 1),
      walking = a.target && Math.hypot(a.x - a.target.x, a.y - a.target.y) > 7;
    const bounce = walking
      ? Math.sin(t * 10 + a.id) * 1.5
      : Math.sin(t * 2 + a.id) * 0.5;
    c.save();
    c.translate(q.x, q.y);
    this.ellipse(0, 1, s * 0.85, 2, "#05121155");
    if (selected) this.ellipse(0, 1, s + 7, 4, null, "#e5f7c8");
    c.translate(0, bounce);
    c.strokeStyle = `hsl(${a.appearance.hue} 30% 64%)`;
    c.lineWidth = 1.4;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(side * s * 0.4, -3);
      c.lineTo(
        side * (s * 0.7 + (walking ? Math.sin(t * 10 + a.id) * 1 : 0)),
        1,
      );
      c.stroke();
    }
    c.fillStyle = `hsl(${a.appearance.hue} 49% 72%)`;
    c.beginPath();
    c.ellipse(0, -s, s * 0.73, s, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(-2, -s * 1.8);
    c.quadraticCurveTo(
      -s,
      -s * 2.2,
      -s * 0.5,
      -s * 2 - a.appearance.antenna * 0.5,
    );
    c.stroke();
    this.ellipse(
      -s * 0.5,
      -s * 2 - a.appearance.antenna * 0.5,
      1.4,
      1.4,
      "#e0ffed",
    );
    if (a.action === "REST") {
      c.strokeStyle = "#425663";
      c.beginPath();
      c.moveTo(-3, -s - 1);
      c.lineTo(-1, -s - 1);
      c.moveTo(1, -s - 1);
      c.lineTo(3, -s - 1);
      c.stroke();
    } else {
      for (const side of [-1, 1]) {
        this.ellipse(side * 2, -s - 2, 1.9, 2.3, "#edf6ea");
        this.ellipse(side * 2 + 0.5, -s - 2, 1, 1.2, "#273b48");
      }
    }
    if (a.appearance.spots) {
      this.ellipse(-1, -s + 3, 1, 1, "#e8ffdabb");
      this.ellipse(2, -s + 4, 0.8, 0.8, "#e8ffdabb");
    }
    if (a.cargo) {
      this.ellipse(s * 0.85, -4, 3, 3, "#b9b0a1");
    }
    if (a.carriedArtifact) {
      c.fillStyle = "#efa0cd";
      c.fillRect(s * 0.5, -10, 6, 4);
    }
    if (a.fear > 0.4) {
      c.font = "9px sans-serif";
      c.fillStyle = "#f5d99d";
      c.fillText("!", 0, -s * 3 - 3);
    }
    c.restore();
  }
  structure(q, s, night) {
    const c = this.ctx;
    c.save();
    c.translate(q.x, q.y);
    c.globalAlpha = 0.4 + 0.6 * s.progress;
    if (
      s.kind === "gathering circle" ||
      s.kind === "display" ||
      s.kind === "monument"
    ) {
      for (let i = 0; i < 7; i++)
        this.ellipse(
          Math.cos((i / 7) * Math.PI * 2) * 17,
          Math.sin((i / 7) * Math.PI * 2) * 6,
          3,
          2,
          "#b1bcaa",
        );
      if (s.kind !== "gathering circle") {
        c.fillStyle = "#afa5c1";
        c.fillRect(-4, -20, 8, 20);
        this.ellipse(0, -22, 7, 3, "#ecc3c6");
      }
    } else if (s.kind === "storage") {
      c.fillStyle = "#6c7462";
      c.fillRect(-13, -10, 26, 12);
      for (let i = 0; i < 5; i++)
        this.ellipse(-9 + i * 4, -12, 3, 3, "#a8b888");
    } else {
      const tall = s.kind === "observatory";
      const h = tall ? 38 : 21;
      c.fillStyle = "#667e74";
      c.fillRect(-12, -h * s.progress, 24, h * s.progress);
      c.beginPath();
      c.moveTo(-18, -h * s.progress);
      c.lineTo(0, -(h + 16) * s.progress);
      c.lineTo(18, -h * s.progress);
      c.closePath();
      c.fillStyle = tall ? "#9ea6a2" : "#98aaa0";
      c.fill();
      c.fillStyle = "#e7c47d";
      c.shadowColor = "#e7c47d";
      c.shadowBlur = night * 10;
      c.fillRect(-3, -12, 6, 8);
      c.shadowBlur = 0;
      if (tall) this.ellipse(0, -h - 12, 8, 5, null, "#d1eac1");
    }
    if (s.progress < 1) {
      c.fillStyle = "#afe2cd";
      c.fillRect(-15, 7, 30 * s.progress, 2);
      c.fillStyle = "#ffffff16";
      c.fillRect(-15 + 30 * s.progress, 7, 30 * (1 - s.progress), 2);
    }
    c.restore();
  }
  effects(w) {
    const c = this.ctx;
    for (const e of w.effects) {
      const q = project(e),
        color =
          {
            TOUCH: "173,222,218",
            LIGHT: "249,222,138",
            RAIN: "115,207,227",
            MUTATE: "199,154,230",
            DISTORT: "172,160,225",
          }[e.kind] || "200,200,200";
      const alpha = Math.min(1, e.ttl);
      if (e.kind === "TOUCH") {
        this.ellipse(
          q.x,
          q.y,
          (1 - e.ttl / 3) * e.radius * 1.9,
          (1 - e.ttl / 3) * e.radius * 0.95,
          null,
          `rgba(${color},${alpha * 0.6})`,
        );
      } else {
        this.ellipse(
          q.x,
          q.y,
          e.radius * 0.91,
          e.radius * 0.55,
          `rgba(${color},${alpha * 0.1})`,
          `rgba(${color},${alpha * 0.3})`,
        );
        if (e.kind === "LIGHT") {
          const beam = c.createLinearGradient(q.x, q.y - 230, q.x, q.y);
          beam.addColorStop(0, "#f7e4a500");
          beam.addColorStop(1, "#f7e4a518");
          c.fillStyle = beam;
          c.beginPath();
          c.moveTo(q.x - 15, q.y - 260);
          c.lineTo(q.x + 15, q.y - 260);
          c.lineTo(q.x + e.radius * 0.91, q.y);
          c.lineTo(q.x - e.radius * 0.91, q.y);
          c.closePath();
          c.fill();
        }
        if (e.kind === "RAIN")
          for (let i = 0; i < 25; i++) {
            const x = q.x + Math.sin(i * 19) * e.radius * 0.8,
              y = q.y - ((w.time * 90 + i * 23) % 160);
            c.strokeStyle = "#a5dce66b";
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x - 2, y + 8);
            c.stroke();
          }
        if (e.kind === "DISTORT") {
          c.strokeStyle = "#b4a4db80";
          c.beginPath();
          for (let i = 0; i < 80; i++) {
            const t = i * 0.15 + w.time,
              r = i * 0.95;
            c.lineTo(q.x + Math.cos(t) * r, q.y + Math.sin(t) * r * 0.55);
          }
          c.stroke();
        }
      }
    }
    for (const p of w.particles) {
      const q = project(p);
      c.save();
      c.translate(q.x, q.y - p.z);
      c.rotate(p.rotation);
      c.globalAlpha = Math.min(1, p.ttl);
      c.fillStyle = p.color;
      if (p.kind === "dust") {
        c.beginPath();
        c.arc(0, 0, 1.7, 0, Math.PI * 2);
        c.fill();
      } else c.fillRect(-2, -1, 4, 2);
      c.restore();
    }
  }
}
