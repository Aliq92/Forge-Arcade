// Simulation is independent of canvas and audio. Every pop belongs to one chain;
// reserving it immediately makes overlapping shockwaves safe and deterministic.
export class Game {
  constructor({ width = 1000, height = 500, seed = 1, mode = 'classic', onEvent = () => {} } = {}) {
    this.width = width; this.height = height; this.seed = seed >>> 0;
    this.onEvent = onEvent; this.mode = mode;
    this.reset();
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  reset() {
    this.time = 0; this.score = 0; this.taps = 3; this.bestChain = 0;
    this.totalPopped = 0; this.waves = []; this.chains = new Map();
    this.nextId = 0; this.nextChain = 0; this.generate();
    this.paused = false; this.ended = false; this.cleared = false; this.quiet = 0;
  }
  generate() {
    const cols = Math.max(4, Math.min(12, Math.floor(this.width / (this.width < 600 ? 64 : 94))));
    const rows = Math.max(3, Math.min(8, Math.floor(80 / cols), Math.floor((this.height - 70) / 78)));
    const sx = (this.width - 36) / cols, sy = (this.height - 80) / rows;
    const r = Math.max(18, Math.min(31, Math.min(sx, sy) * .35));
    this.range = Math.max(sx, sy) * 1.34;
    const offset = Math.floor(this.random() * 5), items = [];
    const broad = this.random() > .65 && cols >= 8;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const color = (Math.floor(col / (broad ? 5 : 3)) + Math.floor(row / 3) * 2 + offset) % 5;
      items.push({ x: 18 + sx * (col + .5) + (this.random() - .5) * sx * .24,
        y: 39 + sy * (row + .5) + (this.random() - .5) * sy * .18, color,
        r: r * (.92 + this.random() * .13),
        phase: this.random() * Math.PI * 2, speed: .7 + this.random() * .5 });
    }
    // Exactly three specials, well separated, with ordinary color rules unless rainbow.
    for (const [i, special] of ['lightning', 'freeze', 'rainbow'].entries()) {
      items[Math.min(items.length - 1, Math.floor(items.length * (.16 + i * .31)))].special = special;
    }
    this.setBoard(items, r, this.range);
  }
  setBoard(items, r = 24, range = 80) {
    this.range = range;
    this.balloons = items.map(item => ({ r, phase: 0, speed: 1, state: 'alive',
      radiusRatio: (item.r ?? r) / Math.sqrt(this.width * this.height),
      ...item, id: this.nextId++, baseX: item.x, baseY: item.y }));
  }
  tap(x, y) {
    if (this.paused || this.ended || (this.mode === 'classic' && this.taps <= 0)) return false;
    let target, closest = Infinity;
    for (const b of this.balloons) {
      const d = Math.hypot(x - b.x, (y - b.y) / 1.14);
      if (b.state === 'alive' && d <= b.r + 5 && d < closest) { target = b; closest = d; }
    }
    if (!target) return false;
    if (this.mode === 'classic') this.taps--;
    this.quiet = 0;
    const chain = { id: this.nextChain++, count: 0, x: 0, y: 0 };
    this.chains.set(chain.id, chain);
    this.reserve(target, chain.id);
    return true;
  }
  reserve(b, chainId) {
    if (b.state !== 'alive') return;
    b.state = 'popping'; b.popAt = this.time + .085; b.chainId = chainId;
  }
  pop(b) {
    b.state = 'dead';
    const chain = this.chains.get(b.chainId);
    chain.count++; chain.x += b.x; chain.y += b.y;
    this.totalPopped++;
    const points = 100 + Math.min(chain.count - 1, 30) * 25 + (b.special ? 150 : 0);
    this.score += points; this.bestChain = Math.max(this.bestChain, chain.count);
    this.waves.push({ x: b.x, y: b.y, color: b.color, chainId: b.chainId,
      rainbow: b.special === 'rainbow', special: b.special,
      age: 0, radius: 0, max: this.range * (b.special === 'lightning' ? 1.85 : 1), life: .48 });
    if (b.special === 'freeze') {
      for (const other of this.balloons) if (other.state === 'alive' && Math.hypot(other.x-b.x,other.y-b.y) < this.range*1.8) {
        other.frozenUntil = this.time + 2.8;
      }
    }
    this.onEvent({ type: 'pop', balloon: b, chain: { ...chain }, points });
    if ([5,10,25].includes(chain.count)) this.onEvent({type:'milestone',count:chain.count,x:chain.x/chain.count,y:chain.y/chain.count,color:b.color});
  }
  update(dt) {
    if (this.paused || this.ended) return;
    this.time += dt;
    for (const b of this.balloons) {
      if (b.state === 'alive' && !(b.frozenUntil > this.time)) {
        b.x = b.baseX + Math.sin(this.time * .45 * b.speed + b.phase) * 4;
        b.y = b.baseY + Math.sin(this.time * .6 * b.speed + b.phase) * 5;
      } else if (b.state === 'popping' && this.time >= b.popAt) this.pop(b);
    }
    for (const w of this.waves) {
      w.age += dt;
      w.radius = w.max * Math.min(1, w.age / .34);
      for (const b of this.balloons) {
        if (b.state === 'alive' && (b.color === w.color || w.rainbow || b.special === 'rainbow') && Math.hypot(b.x - w.x, b.y - w.y) <= w.radius) this.reserve(b, w.chainId);
      }
    }
    this.waves = this.waves.filter(w => w.age < w.life);
    for (const chain of this.chains.values()) {
      if (!chain.finished && !this.waves.some(w=>w.chainId===chain.id) && !this.balloons.some(b=>b.state==='popping'&&b.chainId===chain.id)) {
        chain.finished = true;
        this.onEvent({type:'chainEnd',count:chain.count});
      }
    }
    const active = this.waves.length || this.balloons.some(b=>b.state==='popping');
    const alive = this.balloons.filter(b=>b.state==='alive').length;
    if (!active) {
      this.quiet += dt;
      if (!alive && !this.cleared) {
        this.cleared = true; this.score += 2000;
        const last = [...this.chains.values()].at(-1);
        this.onEvent({type:'clear',x:last ? last.x/last.count : this.width/2,y:last ? last.y/last.count : this.height/2});
      }
      if (this.mode === 'classic' && (this.taps === 0 || !alive) && this.quiet > 1.1) {
        this.ended = true; this.onEvent({type:'end'});
      } else if (this.mode === 'zen' && alive < this.balloons.length*.65 && this.quiet > .8) {
        const old = this.balloons;
        this.generate();
        this.balloons = this.balloons.map((b,i)=>old[i]?.state==='alive' ? old[i] : {...b,born:this.time});
        this.cleared = false; this.quiet = 0; this.chains.clear();
      }
    } else this.quiet = 0;
  }
  resize(width, height) {
    const sx = width/this.width, sy = height/this.height;
    const scale = Math.sqrt(sx * sy);
    const reflow = Math.abs(Math.log(sx / sy)) > .18;
    const cols = Math.max(4,Math.round(Math.sqrt(this.balloons.length*(width-36)/(height-80))));
    const rows = Math.ceil(this.balloons.length/cols), cellX = (width-36)/cols, cellY = (height-80)/rows;
    for (const b of this.balloons) {
      b.x *= sx; b.y *= sy; b.baseX *= sx; b.baseY *= sy;
      b.r = Math.max(18,Math.min(31,b.radiusRatio*Math.sqrt(width*height)));
      b.x = Math.max(b.r+6,Math.min(width-b.r-6,b.x));
      b.y = Math.max(b.r+6,Math.min(height-b.r-6,b.y));
      b.baseX = Math.max(b.r+6,Math.min(width-b.r-6,b.baseX));
      b.baseY = Math.max(b.r*1.14+6,Math.min(height-b.r*1.14-6,b.baseY));
      if (reflow) {
        const index = this.balloons.indexOf(b);
        b.baseX = b.x = 18+cellX*(index%cols+.5);
        b.baseY = b.y = 39+cellY*(Math.floor(index/cols)+.5);
        b.r = Math.max(18,Math.min(31,Math.min(cellX,cellY)*.35));
      }
    }
    this.range *= scale;
    for (const w of this.waves) { w.x *= sx; w.y *= sy; w.max *= scale; }
    for (const c of this.chains.values()) { c.x *= sx; c.y *= sy; }
    this.width = width; this.height = height;
  }
}
