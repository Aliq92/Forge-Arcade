import { TYPES, explored, validPlacement, mood } from './simulation.js';
const TAU = Math.PI * 2;
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 15, y: 20, zoom: 1.12 };
    this.w = 0;
    this.h = 0;
    this.decor = [];
    let seed = 9182;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 520; i++) {
      const x = rand() * 1600 - 800,
        y = rand() * 1100 - 550;
      this.decor.push({
        x,
        y,
        size: 3 + rand() * 13,
        type: rand(),
        phase: rand() * TAU,
      });
    }
    this.stars = Array.from({ length: 100 }, () => ({
      x: rand(),
      y: rand(),
      r: rand() * 1.2 + 0.3,
    }));
    this.resize();
  }
  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    const d = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.w * d;
    this.canvas.height = this.h * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  screen(x, y) {
    return {
      x: (x - this.camera.x) * this.camera.zoom + this.w / 2,
      y: (y - this.camera.y) * this.camera.zoom + this.h * 0.53,
    };
  }
  world(x, y) {
    return {
      x: (x - this.w / 2) / this.camera.zoom + this.camera.x,
      y: (y - this.h * 0.53) / this.camera.zoom + this.camera.y,
    };
  }
  ellipse(x, y, rx, ry, color) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    c.fill();
  }
  line(points, color, width = 2) {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
    c.stroke();
  }
  glow(x, y, r, color) {
    const c = this.ctx,
      g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  text(text, x, y, color = '#c3d8cf', size = 9) {
    const c = this.ctx;
    c.font = `${size}px system-ui`;
    c.textAlign = 'center';
    c.fillStyle = color;
    c.fillText(text, x, y);
  }
  plant(d, t) {
    const c = this.ctx,
      { x, y, size: r } = d;
    this.ellipse(x, y + 3, r * 0.7, r * 0.3, '#141e2940');
    if (d.type < 0.32) {
      this.line(
        [
          [x, y],
          [x, y - r * 1.8],
        ],
        '#426668',
        2,
      );
      this.ellipse(x - 4, y - r, 5, r * 0.55, '#5d998e');
      this.ellipse(x + 4, y - r * 1.6, 5, r * 0.55, '#7ab5a2');
      this.ellipse(x, y - r * 1.9, 3, 3, '#aedabb');
    } else if (d.type < 0.64) {
      this.line(
        [
          [x, y],
          [x, y - r],
        ],
        '#738c8a',
        3,
      );
      this.ellipse(x, y - r, r, r * 0.45, '#659eaa');
      this.line(
        [
          [x - r * 0.7, y - r],
          [x + r * 0.6, y - r],
        ],
        '#b0ddbb40',
        1,
      );
      this.ellipse(x - 3, y - r - 2, r * 0.35, r * 0.12, '#a1d0c0');
    } else if (d.type < 0.84) {
      c.fillStyle = '#4d485b';
      c.beginPath();
      c.moveTo(x - r, y);
      c.lineTo(x - r * 0.7, y - r * 0.7);
      c.lineTo(x + r * 0.4, y - r);
      c.lineTo(x + r, y);
      c.closePath();
      c.fill();
      this.line(
        [
          [x - r * 0.7, y - r * 0.7],
          [x + r * 0.4, y - r],
          [x + r, y],
        ],
        '#706677',
        1,
      );
    } else {
      this.line(
        [
          [x - 4, y],
          [x - 7, y - 7],
          [x - 9, y - 10],
        ],
        '#558d86',
        1,
      );
      this.line(
        [
          [x + 2, y],
          [x + 6, y - 11],
        ],
        '#558d86',
        1,
      );
      this.ellipse(x + 6, y - 12, 2.4, 2.4, '#abcf9b');
      this.ellipse(x - 9, y - 11, 2, 2, '#aac8b1');
    }
  }
  crystal(x, y, r = 25, color = '#9bd8db') {
    const c = this.ctx;
    this.glow(x, y, 55, '#70cfb516');
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, y - r);
    c.lineTo(x + r * 0.45, y - r * 0.4);
    c.lineTo(x + r * 0.25, y + 5);
    c.lineTo(x - r * 0.35, y + 2);
    c.lineTo(x - r * 0.5, y - r * 0.4);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffffff30';
    c.beginPath();
    c.moveTo(x, y - r);
    c.lineTo(x, y);
    c.lineTo(x - r * 0.5, y - r * 0.4);
    c.fill();
    this.line(
      [
        [x, y - r],
        [x + r * 0.45, y - r * 0.4],
        [x + r * 0.25, y + 5],
      ],
      '#dbf3e9',
      1,
    );
  }
  building(b, s, time, ghost = false) {
    const c = this.ctx,
      { x, y, type } = b;
    const r = TYPES[type].r;
    this.ellipse(x, y + 12, r + 10, r * 0.42, '#0b172840');
    if (b.progress < 1 && !ghost) {
      this.ellipse(x, y + 4, r, r * 0.45, '#5a626c');
      this.ellipse(x, y + 4, r - 4, r * 0.39, '#343a4d');
      this.line(
        [
          [x - r, y + 6],
          [x - r, y - 26],
          [x, y - 42],
          [x + r, y - 25],
          [x + r, y + 6],
        ],
        '#b9c4ad70',
        2,
      );
      for (let i = 0; i < 4; i++) {
        this.line(
          [
            [x - r + i * r * 0.66, y + 7],
            [x - r + i * r * 0.66, y - 18],
          ],
          '#b8c5b650',
          1,
        );
      }
      this.text('BUILDING', x, y - 52, '#c9dec3', 7);
      c.fillStyle = '#32464c';
      c.fillRect(x - 22, y + 20, 44, 3);
      c.fillStyle = '#c0deb2';
      c.fillRect(x - 22, y + 20, 44 * b.progress, 3);
      return;
    }
    if (
      [
        'landing',
        'habitat',
        'research',
        'observatory',
        'workshop',
        'storage',
      ].includes(type)
    ) {
      this.ellipse(x, y + 5, r, r * 0.5, '#7a9994');
      this.ellipse(x, y, r, r * 0.64, '#bbcec0');
      const g = c.createLinearGradient(x, y - r, x, y);
      g.addColorStop(0, '#d2ddc6');
      g.addColorStop(1, '#89a99f');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, y - 7, r - 2, r * 0.68, 0, Math.PI, TAU);
      c.lineTo(x + r - 2, y);
      c.quadraticCurveTo(x, y + 17, x - r + 2, y);
      c.fill();
      this.line(
        [
          [x - r + 6, y],
          [x + r - 6, y],
        ],
        '#527b78',
        3,
      );
      if (type === 'storage') {
        for (let i = -1; i <= 1; i++)
          this.line(
            [
              [x + i * 12, y - 20],
              [x + i * 12, y + 3],
            ],
            '#527b7860',
            2,
          );
      } else {
        this.ellipse(x, y - 6, 12, 13, '#38535a');
        this.ellipse(x, y - 9, 8, 9, '#e5c884');
        this.line(
          [
            [x, y - 17],
            [x, y],
          ],
          '#547377',
          2,
        );
        this.glow(x, y - 2, 30, '#ffd99126');
      }
      if (type === 'landing') {
        this.line(
          [
            [x - 38, y + 7],
            [x - 47, y + 18],
            [x - 28, y + 22],
          ],
          '#829b99',
          4,
        );
        this.line(
          [
            [x + 38, y + 7],
            [x + 47, y + 18],
            [x + 28, y + 22],
          ],
          '#829b99',
          4,
        );
        this.line(
          [
            [x + 21, y - 24],
            [x + 25, y - 60],
          ],
          '#bbd0bb',
          2,
        );
        this.ellipse(x + 25, y - 61, 3, 3, '#d8d8a3');
        this.text('O 7', x, y - 29, '#58776d', 8);
      }
      if (type === 'research') {
        this.line(
          [
            [x + 13, y - 23],
            [x + 17, y - 52],
          ],
          '#adcbb6',
          2,
        );
        this.ellipse(x + 17, y - 51, 15, 5, '#d2dfc6');
        this.line(
          [
            [x - 19, y - 22],
            [x - 19, y - 38],
          ],
          '#728c88',
          3,
        );
        this.ellipse(x - 19, y - 39, 5, 5, '#c2d7a0');
      }
      if (type === 'observatory') {
        this.line(
          [
            [x, y - 25],
            [x + 16, y - 57],
          ],
          '#546f72',
          13,
        );
        this.ellipse(x + 18, y - 59, 11, 5, '#bcd0bc');
        this.ellipse(x + 18, y - 59, 6, 3, '#485d71');
      }
      if (type === 'workshop') {
        this.line(
          [
            [x - 18, y - 20],
            [x - 18, y - 42],
            [x - 8, y - 42],
          ],
          '#6e8a82',
          5,
        );
        this.ellipse(x - 8, y - 40, 4, 3, '#ebd09d');
      }
    } else if (type === 'garden') {
      this.ellipse(x, y, 40, 23, '#526b66');
      this.ellipse(x, y - 2, 36, 20, '#333e43');
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4; col++) {
          let px = x - 24 + col * 16,
            py = y - 11 + row * 11;
          this.line(
            [
              [px, py],
              [px, py - 12],
            ],
            '#85ae78',
            2,
          );
          this.ellipse(px - 4, py - 8, 5, 3, '#7ac6a2');
          this.ellipse(px + 3, py - 12, 4, 3, '#b3dca1');
          this.ellipse(px + 3, py - 14, 3, 3, '#e5b77f');
        }
      this.line(
        [
          [x - 39, y],
          [x - 39, y - 24],
          [x + 39, y - 24],
          [x + 39, y],
        ],
        '#8dad9850',
        1,
      );
    } else if (type === 'energy') {
      this.ellipse(x, y, 24, 12, '#778e86');
      this.crystal(x, y - 3, 45, '#a5d9ca');
      this.crystal(x - 17, y + 1, 20, '#8bc1c3');
      this.glow(x, y - 15, 65, '#b3e6ac25');
    } else {
      this.ellipse(x, y, 23, 12, '#716e62');
      this.ellipse(x, y, 18, 8, '#333c3f');
      this.line(
        [
          [x, y],
          [x, y - 31],
        ],
        '#b4bba0',
        5,
      );
      this.glow(x, y - 32, 76, '#ffd18028');
      this.ellipse(x, y - 32, 9, 12, '#f3d491');
      this.ellipse(x, y - 35, 5, 6, '#ffe8ac');
      for (let i = 0; i < 3; i++) {
        const ang = (i * TAU) / 3 + 1;
        this.ellipse(
          x + Math.cos(ang) * 31,
          y + Math.sin(ang) * 16,
          8,
          5,
          '#8c9d87',
        );
      }
    }
    this.text(
      type === 'landing' ? 'LANDING POD' : TYPES[type].name.toUpperCase(),
      x,
      y + r * 0.6 + 22,
      '#a8b9ac',
      7,
    );
  }
  discovery(d, s, time) {
    const { x, y, kind } = d;
    const c = this.ctx;
    c.globalAlpha = d.found ? 1 : 0.35;
    if (kind === 'water') {
      this.ellipse(x, y, 107, 57, '#506276');
      this.ellipse(x, y, 99, 49, '#3b6470');
      this.ellipse(x - 12, y - 7, 78, 33, '#447780');
      for (let i = 0; i < 5; i++)
        this.line(
          [
            [x - 65 + i * 26, y + (i % 2) * 12],
            [x - 52 + i * 26, y + (i % 2) * 12],
          ],
          '#9ad6bb70',
          1,
        );
      for (let i = 0; i < 8; i++) {
        let ang = (i / 8) * TAU;
        this.plant(
          {
            x: x + Math.cos(ang) * 105,
            y: y + Math.sin(ang) * 55,
            size: 9,
            type: 0.9,
          },
          time,
        );
      }
    } else if (kind === 'crystal') {
      for (let i = 0; i < 7; i++)
        this.crystal(
          x + Math.sin(i * 4) * 45,
          y + Math.cos(i * 5) * 20,
          18 + i * 4,
          i % 2 ? '#9ca3d9' : '#9ad6d2',
        );
    } else if (kind === 'fungal') {
      for (let i = 0; i < 12; i++)
        this.plant(
          {
            x: x + Math.sin(i * 8) * 55,
            y: y + Math.cos(i * 7) * 35,
            size: 14 + (i % 3) * 6,
            type: 0.5,
          },
          time,
        );
    } else if (kind === 'monolith') {
      this.ellipse(x, y + 10, 47, 19, '#666172');
      for (let i = 0; i < 5; i++)
        this.ellipse(
          x + Math.cos(i * 1.3) * 40,
          y + Math.sin(i * 1.3) * 16,
          8,
          5,
          '#898596',
        );
      c.fillStyle = '#454652';
      c.beginPath();
      c.moveTo(x - 17, y);
      c.lineTo(x - 13, y - 91);
      c.lineTo(x + 15, y - 99);
      c.lineTo(x + 24, y - 5);
      c.closePath();
      c.fill();
      this.line(
        [
          [x - 13, y - 91],
          [x + 15, y - 99],
          [x + 24, y - 5],
        ],
        '#96949b',
        2,
      );
      for (let i = 0; i < 5; i++) {
        this.line(
          [
            [x - 5, y - 69 + i * 12],
            [x + 5, y - 73 + i * 12],
            [x + 10, y - 65 + i * 12],
          ],
          s.monolith > 1 ? '#c3e5bb' : '#737685',
          2,
        );
      }
      if (s.monolith === 4) {
        this.glow(x, y - 40, 120, '#b6eccc35');
        this.line(
          [
            [x + 3, y - 99],
            [x + 3, y - 290],
          ],
          '#cef4ba55',
          2,
        );
      }
    } else if (kind === 'bones') {
      this.line(
        [
          [x - 48, y + 12],
          [x + 45, y - 10],
        ],
        '#c4c1a8',
        7,
      );
      for (let i = 0; i < 6; i++)
        this.line(
          [
            [x - 30 + i * 12, y + 5 - i * 3],
            [x - 33 + i * 12, y - 17 - i * 3],
            [x - 20 + i * 12, y - 25 - i * 3],
          ],
          '#b5b5a0',
          4,
        );
      this.ellipse(x + 49, y - 14, 15, 12, '#c7c6ad');
      this.ellipse(x + 54, y - 15, 4, 5, '#41485a');
    } else if (kind === 'egg') {
      this.glow(x, y - 8, 50, '#dbc09225');
      this.ellipse(x, y - 9, 13, 20, s.eggStage === 3 ? '#8a9d94' : '#d2d3b1');
      this.ellipse(x - 4, y - 13, 3, 4, '#a5cba4');
      this.ellipse(x + 5, y - 4, 3, 4, '#b0cba9');
    } else if (kind === 'cave') {
      this.ellipse(x, y - 10, 44, 31, '#626274');
      this.ellipse(x, y, 27, 24, '#202a3c');
      this.crystal(x + 12, y, 17);
    } else if (kind === 'vent') {
      this.ellipse(x, y, 35, 16, '#7b746e');
      this.ellipse(x, y - 2, 22, 11, '#c8ae88');
      for (let i = 0; i < 4; i++)
        this.ellipse(
          x + Math.sin(time * 0.3 + i) * 9,
          y - 18 - ((time * 7 + i * 13) % 65),
          15,
          6,
          '#d0d9c013',
        );
    } else {
      this.ellipse(x, y, 37, 18, '#52656b');
      this.line(
        [
          [x - 27, y],
          [x - 23, y - 30],
          [x + 22, y - 30],
          [x + 28, y],
        ],
        '#a3a69c',
        8,
      );
      this.crystal(x, y - 16, 16, '#d4c89b');
    }
    c.globalAlpha = 1;
    if (d.found) this.text(d.name.toUpperCase(), x, y + 36, '#acb8b0', 8);
  }
  alien(a, time, selected, alpha) {
    const c = this.ctx;
    const x = a.px + (a.x - a.px) * alpha,
      y = a.py + (a.y - a.py) * alpha;
    const walking = a.task?.phase === 'walk',
      sleep = a.task?.kind === 'sleep' && !walking;
    const baby = a.age < 180,
      scale = baby ? 0.66 : 1;
    const bob = walking
      ? Math.sin(time * 9 + a.id) * 2
      : Math.sin(time * 2 + a.id) * 0.6;
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    if (selected) {
      c.strokeStyle = '#d8eac1';
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(0, 3, 18, 9, 0, 0, TAU);
      c.stroke();
      this.glow(0, 0, 32, '#cbeab522');
    }
    this.ellipse(0, 4, 11, 4, '#12243265');
    this.line(
      [
        [-5, 0],
        [-6 + Math.sin(time * 9) * (walking ? 3 : 0), 5],
      ],
      '#7b998f',
      3,
    );
    this.line(
      [
        [5, 0],
        [6 - Math.sin(time * 9) * (walking ? 3 : 0), 5],
      ],
      '#7b998f',
      3,
    );
    c.translate(0, bob);
    if (a.visualTraits.length) this.glow(0, -11, 30, '#a7e4cd35');
    this.ellipse(0, -9, 10, 13, a.color);
    this.ellipse(-2, -15, 9, 7, a.color);
    this.line(
      [
        [0, -22],
        [2, -29],
        [5, -30],
      ],
      a.color,
      2,
    );
    this.ellipse(5, -30, 2.5, 2.5, '#e5deb0');
    if (a.visualTraits.includes('water')) {
      this.line(
        [
          [-8, -10],
          [-15, -17],
          [-13, -4],
        ],
        '#a0d1c3',
        3,
      );
      this.line(
        [
          [8, -10],
          [15, -17],
          [13, -4],
        ],
        '#a0d1c3',
        3,
      );
    }
    if (sleep) {
      this.line(
        [
          [-6, -15],
          [-3, -14],
        ],
        '#2c4146',
        1.5,
      );
      this.line(
        [
          [3, -14],
          [6, -15],
        ],
        '#2c4146',
        1.5,
      );
    } else {
      this.ellipse(-4, -15, 2.5, 3, '#263a46');
      this.ellipse(4, -15, 2.5, 3, '#263a46');
      this.ellipse(-4.5, -16, 1, 1, '#f0f5d9');
      this.ellipse(3.5, -16, 1, 1, '#f0f5d9');
    }
    this.line(
      [
        [-2, -9],
        [1, -8],
        [3, -9],
      ],
      '#536e6450',
      1,
    );
    if (a.visualTraits.length)
      for (let i = 0; i < 3; i++)
        this.ellipse(-5 + i * 5, -3 - (i % 2) * 3, 1.7, 1.7, '#daf8c1');
    if (a.carrying) {
      c.fillStyle = a.carrying.kind === 'food' ? '#e6bc83' : '#a2b5ac';
      c.fillRect(6, -9, 8, 8);
    }
    if (
      !walking &&
      ['socialize', 'sleep', 'research', 'build', 'eat', 'observe'].includes(
        a.task?.kind,
      )
    ) {
      let symbol = {
        socialize: ['♥', '☆', '…'][Math.floor(time * 0.3 + a.id) % 3],
        sleep: 'z',
        research: '?',
        build: '⌁',
        eat: '•',
        observe: '!',
      }[a.task.kind];
      this.ellipse(16, -32, 9, 8, '#e0e3cddd');
      this.text(symbol, 16, -29, '#4c665e', 10);
    }
    this.text(a.name, 0, 18, selected ? '#eef5d8' : '#c6d2ba', 8);
    c.restore();
  }
  render(s, now, selection, ghost, alpha = 1) {
    const c = this.ctx,
      w = this.w,
      h = this.h,
      t = now / 1000;
    const night = Math.max(
      0,
      Math.sin(((s.time % 180) / 180) * TAU - Math.PI * 0.9),
    );
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, night > 0.4 ? '#171e32' : '#293544');
    sky.addColorStop(1, '#313442');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    for (const star of this.stars)
      this.ellipse(
        star.x * w,
        star.y * h,
        star.r,
        star.r,
        `rgba(212,226,217,${0.25 + night * 0.45})`,
      );
    this.glow(w * 0.78, h * 0.23, 140, '#a4b8aa08');
    this.ellipse(w * 0.8, h * 0.18, 62, 62, '#657b7830');
    this.ellipse(w * 0.8 - 13, h * 0.18 - 7, 47, 51, '#94a99616');
    c.save();
    c.translate(w / 2, h * 0.53);
    c.scale(this.camera.zoom, this.camera.zoom);
    c.translate(-this.camera.x, -this.camera.y);
    this.ellipse(0, 65, 850, 572, '#151e2c');
    this.ellipse(0, 42, 840, 555, '#353346');
    this.ellipse(0, 25, 822, 542, night > 0.4 ? '#302b41' : '#3b354c');
    this.ellipse(-80, 25, 710, 470, '#3e3b50');
    this.ellipse(170, -90, 260, 180, '#4a465933');
    this.ellipse(-240, -180, 170, 135, '#39555338');
    this.ellipse(-270, 120, 190, 130, '#3c545e55');
    this.ellipse(350, 220, 180, 90, '#5b536340');
    this.glow(0, 35, 280, '#b0bda011');
    // Gentle ground grain and low shelves give the moon a tactile surface.
    for (let i = 0; i < 180; i++) {
      const x = Math.sin(i * 43.17) * 790,
        y = Math.cos(i * 21.33) * 510;
      if (Math.hypot(x / 1.5, y) < 510)
        this.ellipse(x, y, 1.2 + (i % 3), 0.6, '#c1b0bb0b');
    }
    this.line(
      [
        [-600, -290],
        [-460, -335],
        [-340, -330],
        [-260, -367],
        [-170, -355],
      ],
      '#6b60762a',
      3,
    );
    this.line(
      [
        [320, 340],
        [430, 310],
        [480, 325],
        [550, 280],
        [650, 273],
      ],
      '#77627a24',
      4,
    );
    for (const [key, val] of Object.entries(s.paths)) {
      const [x, y] = key.split(',').map(Number);
      this.ellipse(x * 18, y * 18, 11, 6, `rgba(182,164,133,${val * 0.22})`);
    }
    for (const d of this.decor) {
      if (
        Math.hypot(d.x / 1.5, d.y) > 540 ||
        s.buildings.some(
          (b) => Math.hypot(b.x - d.x, b.y - d.y) < TYPES[b.type].r + 6,
        ) ||
        s.discoveries.some(
          (v) =>
            Math.hypot(v.x - d.x, v.y - d.y) < (v.kind === 'water' ? 112 : 48),
        )
      )
        continue;
      const known = explored(s, d.x, d.y);
      c.globalAlpha = known ? 0.9 : 0.25;
      this.plant(d, t);
    }
    c.globalAlpha = 1;
    for (const n of s.nodes) {
      if (n.kind === 'food') {
        for (let i = 0; i < 6; i++) {
          this.plant(
            {
              x: n.x + Math.sin(i * 5) * 22,
              y: n.y + Math.cos(i * 4) * 12,
              size: 8,
              type: 0.2,
            },
            t,
          );
          this.ellipse(
            n.x + Math.sin(i * 5) * 22 + 4,
            n.y + Math.cos(i * 4) * 12 - 11,
            3,
            3,
            '#d8b393',
          );
        }
      } else
        for (let i = 0; i < 5; i++)
          this.plant(
            {
              x: n.x + Math.sin(i * 3) * 20,
              y: n.y + Math.cos(i * 4) * 10,
              size: 12,
              type: 0.75,
            },
            t,
          );
    }
    const items = [
      ...s.discoveries.map((d) => ({
        y: d.y,
        draw: () => this.discovery(d, s, t),
      })),
      ...s.buildings.map((b) => ({
        y: b.y,
        draw: () => this.building(b, s, t),
      })),
      ...s.aliens.map((a) => ({
        y: a.y,
        draw: () => this.alien(a, t, a.id === selection, alpha),
      })),
    ].sort((a, b) => a.y - b.y);
    items.forEach((i) => i.draw());
    for (let i = 0; i < 10 + (s.eggStage === 3 ? 1 : 0); i++) {
      const x = Math.sin(t * 0.065 + i * 4) * 390,
        y = Math.cos(t * 0.045 + i * 7) * 270;
      this.ellipse(x, y + 3, 7, 3, '#1b293c40');
      if (i % 2) {
        this.ellipse(x, y - 7 - Math.sin(t * 2 + i) * 4, 6, 7, '#b1c4b78a');
        this.line(
          [
            [x - 4, y - 1],
            [x - 5, y + 7],
            [x - 1, y + 4],
          ],
          '#c6d8c050',
          1,
        );
      } else {
        this.ellipse(
          x,
          y - 3 - Math.abs(Math.sin(t * 2 + i)) * 4,
          7,
          5,
          '#9fa9c4',
        );
        this.ellipse(x - 2, y - 5, 1, 1, '#33475b');
      }
    }
    if (ghost) {
      c.globalAlpha = 0.65;
      const good =
        validPlacement(s, ghost.type, ghost.x, ghost.y) &&
        s.resources.material >= TYPES[ghost.type].cost;
      this.ellipse(
        ghost.x,
        ghost.y + 4,
        TYPES[ghost.type].r + 10,
        25,
        good ? '#b8e8ac60' : '#ee998866',
      );
      this.building({ ...ghost, progress: 1 }, s, t, true);
      this.text(
        good ? 'TAP TO PLACE' : 'NEEDS A CLEAR PATCH',
        ghost.x,
        ghost.y - 65,
        good ? '#dbf4cc' : '#ffc1b2',
        9,
      );
      c.globalAlpha = 1;
    }
    // Soft fog skirts the unexplored rim; every revealed object stays readable.
    for (const d of s.discoveries.filter((v) => !v.found))
      this.glow(d.x, d.y, 120, '#20273560');
    for (let i = 0; i < 18; i++) {
      let x = Math.sin(t * 0.015 + i * 3) * 750,
        y = Math.cos(t * 0.012 + i * 8) * 460;
      this.ellipse(x, y, 100, 25, '#bfddd304');
    }
    if (night > 0.1) {
      c.fillStyle = `rgba(12,20,42,${night * 0.25})`;
      c.fillRect(-900, -650, 1800, 1300);
      for (const b of s.buildings.filter((b) => b.progress >= 1))
        this.glow(
          b.x,
          b.y - 7,
          65,
          b.type === 'energy' ? '#bde8cc24' : '#f9d68d22',
        );
      for (const d of s.discoveries.filter(
        (d) => d.found && ['water', 'crystal', 'fungal'].includes(d.kind),
      ))
        this.glow(d.x, d.y, 95, '#95d1bb12');
    }
    c.restore();
    // A distant ringed world peeks through the atmospheric edge of the moon.
    const planetX = w * 0.85,
      planetY = h * 0.19;
    this.glow(planetX, planetY, 90, '#bdc7b709');
    this.ellipse(planetX, planetY, 37, 37, '#9cafaf16');
    c.save();
    c.translate(planetX, planetY);
    c.rotate(-0.35);
    c.strokeStyle = '#bec6ac19';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(0, 0, 65, 14, 0, 0, TAU);
    c.stroke();
    c.restore();
    const vignette = c.createRadialGradient(
      w / 2,
      h * 0.5,
      h * 0.2,
      w / 2,
      h * 0.5,
      w * 0.8,
    );
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, '#08162466');
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
  }
}
