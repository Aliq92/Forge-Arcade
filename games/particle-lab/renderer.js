(function () {
  'use strict';
  const {ID} = ParticleLabMaterials;
  const palettes = [
    [13, 20, 22], [222, 177, 104], [22, 129, 182], [109, 114, 111],
    [158, 176, 182], [142, 84, 54], [127, 79, 30], [229, 84, 41],
    [122, 193, 214], [193, 225, 229], [245, 132, 50], [139, 139, 143],
  ];
  const effectColors = {
    melted:'#9ce2f1', boiled:'#c9eded', condensed:'#50c6e8',
    cooled:'#cc7850', ignited:'#ffd082', extinguished:'#bbd6d9',
  };
  const zoneColors = ['#adf5bf','#f5ce89','#d0bafa'];
  const zoneFills = ['#adf5bf19','#f5ce8919','#d0bafa19'];
  const wave = Float32Array.from({length:128}, (_, i) => Math.sin(i * Math.PI / 64));
  const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  const channel = value => Math.min(255, Math.max(0, Math.round(value)));
  function pack(r, g, b) {
    r = channel(r); g = channel(g); b = channel(b);
    return littleEndian ? (0xff000000 | b << 16 | g << 8 | r) : (r << 24 | g << 16 | b << 8 | 255);
  }
  const swatches = palettes.map(rgb => '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join(''));

  class Renderer {
    static swatches = swatches;

    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', {alpha:false});
      this.buffer = document.createElement('canvas');
      this.bc = this.buffer.getContext('2d', {alpha:false});
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.quality = 'auto';
      this.cursor = null;
      this.preview = null;
      this.effects = [];
      this.verticalMotion = new Int8Array(96*64);
      this.invalidate();
    }

    get reduced() { return this.motion.matches; }
    get low() { return this.quality === 'low'; }
    invalidate() { this.textureWorld = null; }
    clearEffects() { this.effects.length = 0; }

    resize() {
      const {width, height} = this.canvas.getBoundingClientRect();
      const limit = this.quality === 'high' ? 2 : this.low ? 1 : 1.5;
      const scale = Math.min(devicePixelRatio || 1, limit, Math.sqrt(1650000 / (width * height)));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      if (w !== this.canvas.width || h !== this.canvas.height) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }

    addEffect(index, id, event, tick, width) {
      const stride = this.quality === 'high' ? 3 : 5;
      if (this.reduced || this.low || this.effects.length >= 32 || (index * 7 + tick) % stride) return;
      const x = index % width;
      const y = Math.floor(index / width);
      const age = performance.now();
      const sign = (index + tick) % 2 ? -1 : 1;
      this.effects.push({x:x+.5,y:y+.55,age,sign,event,
        color:effectColors[event] || swatches[id]});
    }

    prepare(width, height) {
      this.textureWidth = width;
      this.textureHeight = height;
      this.buffer.width = width * 2;
      this.buffer.height = height * 2;
      this.image = this.bc.createImageData(width * 2, height * 2);
      this.pixels = new Uint32Array(this.image.data.buffer);
      this.background = new Uint32Array(this.pixels.length);
      this.ambient = new Uint8Array(width * height);
      this.grain = new Int8Array(width * height);
      for (let y=0, i=0; y<height; y++) {
        for (let x=0; x<width; x++, i++) {
          const row = y * width * 4 + x * 2;
          const seed = Math.imul(x+31,73856093)^Math.imul(y+23,19349663);
          const grain = ((Math.imul(seed ^ (seed >>> 13),0x45d9f3b) >>> 20) % 17) - 8;
          this.grain[i] = grain;
          const light = Math.max(0, 9 - Math.hypot((x-width*.46)*.20,(y-height*.24)*.28));
          this.ambient[i] = light + (x % 8 === 0 || y % 8 === 0 ? 2 : 0);
          const bg = this.ambient[i];
          const color = pack(12+bg,18+bg,20+bg);
          this.background[row] = this.background[row+1] = color;
          this.background[row+width*2] = this.background[row+width*2+1] = color;
        }
      }
    }

    raster(world, phase, settling) {
      const {width, height, cells, temp, locked, origin, life} = world;
      if (this.textureWidth !== width || this.textureHeight !== height) this.prepare(width, height);
      const {pixels, background, ambient, grain} = this;
      const verticalMotion = this.motionWorld === world && this.motionTick === world.tick ? this.verticalMotion : null;
      const stride = width * 2;
      pixels.set(background);
      this.animated = false;
      this.hasMotion = false;
      for (let y=0, i=0; y<height; y++) {
        for (let x=0; x<width; x++, i++) {
          const id = cells[i];
          if (!id) continue;
          const above = y > 0 ? cells[i-width] : -1;
          const below = y+1 < height ? cells[i+width] : -1;
          const left = x > 0 ? cells[i-1] : -1;
          const right = x+1 < width ? cells[i+1] : -1;
          const [red,green,blue] = palettes[id];
          let r = red, g = green, b = blue;
          let texture = grain[i], rim = above !== id ? 8 : 0, foot = below !== id ? -6 : 0;
          let rounded = false;
          switch (id) {
            case ID.sand:
              texture *= 1.3;
              rim = above === ID.air ? 15 : 1;
              break;
            case ID.water:
            case ID.oil:
            case ID.lava: {
              this.animated = true;
              rounded = true;
              const surface = above !== id;
              const flow = wave[(x*4 + y*3 - phase + 128) & 127];
              texture = texture*.22 + flow*(surface ? 10 : 4);
              rim = surface ? (id === ID.water ? 34 : 29) + flow*8 : 0;
              foot = surface ? 2 : below === id ? 0 : -12;
              if (id === ID.water) {
                g += surface ? 18 : 0;
                b += surface ? 11 : -Math.min(20, y*.22);
              } else if (id === ID.lava) {
                const heat = Math.max(0, Math.min(1,(temp[i]-650)/510));
                r = 123 + heat*126;
                g = 44 + heat*71;
                b = 36 + heat*9;
              } else if (above === ID.air) {
                g += 10;
              }
              break;
            }
            case ID.stone:
              texture += (x*3+y*5)%11 === 0 ? 8 : 0;
              if (origin[i] === ID.lava) { r+=18; g-=13; b-=19; }
              break;
            case ID.metal:
              texture += y%3 === 0 ? 13 : -3;
              rim += x%4 === 0 ? 17 : 7;
              r += Math.min(80, Math.max(0,temp[i]-100)*.13);
              break;
            case ID.wood:
              texture += (y+(x>>3))%3 === 0 ? 14 : -5;
              texture -= Math.max(0,temp[i]-90)*.15;
              break;
            case ID.ice:
              texture += (x+y*2)%7 === 0 ? 21 : -4;
              rim += temp[i] > -4 ? 17 : 7;
              b += 13;
              break;
            case ID.steam:
            case ID.smoke: {
              this.animated = true;
              const vapor = id === ID.steam;
              const alpha = vapor ? .41 + Math.min(.14, Math.max(0,temp[i]-75)*.002) : .23 + Math.min(.34,life[i]*.0034);
              const bg = ambient[i];
              r = 12+bg+(r-12-bg)*alpha;
              g = 18+bg+(g-18-bg)*alpha;
              b = 20+bg+(b-20-bg)*alpha;
              texture = grain[i]*.48+wave[(x*5+y*3+phase)&127]*4;
              rim = vapor ? 8 : 2;
              rounded = true;
              break;
            }
            case ID.fire: {
              this.animated = true;
              const flame = wave[(x*9+y*7+phase*2)&127];
              g += 34*flame + (origin[i] === ID.oil ? 20 : 0);
              b += origin[i] === ID.wood ? -12 : 12;
              rim = 8+flame*6;
              foot = 15+flame*15;
              rounded = true;
              break;
            }
          }
          r += texture; g += texture; b += texture;
          // Mark locked fixtures at their perimeter without shifting their occupied boundary.
          if (locked[i] && (left !== id || right !== id || above !== id || below !== id)) {
            r += 7; g += 14; b += 16;
          }
          // Ease the leading highlight within the occupied destination cell.
          // A dense surface keeps its continuous shading, and the source cell is never redrawn.
          const movement = verticalMotion?.[i];
          if (movement && left !== id && right !== id) {
            this.hasMotion = true;
            const shift = settling * movement * .17;
            rim += shift;
            foot -= shift;
          }
          const top = pack(r+rim,g+rim,b+rim), bottom = pack(r+foot,g+foot,b+foot);
          const row = y*stride*2+x*2;
          if (rounded && above === ID.air) {
            const corner = pack((r+rim)*.68+5,(g+rim)*.68+7,(b+rim)*.68+9);
            pixels[row] = left === ID.air ? corner : top;
            pixels[row+1] = right === ID.air ? corner : top;
          } else {
            pixels[row] = top;
            pixels[row+1] = top;
          }
          pixels[row+stride] = bottom;
          pixels[row+stride+1] = bottom;
        }
      }
      this.bc.putImageData(this.image, 0, 0);
      this.textureWorld = world;
      this.tick = world.tick;
      this.phase = phase;
      this.settling = settling;
    }

    beginStep(world, interval) {
      this.motionWorld = world;
      this.motionTick = world.tick+1;
      this.motionStart = performance.now();
      this.motionDuration = interval*1000;
      return this.verticalMotion;
    }

    movementLight(time, running) {
      if (!running || this.low || this.reduced || !this.motionWorld) return 0;
      return 16*Math.ceil(4*Math.max(0,1-Math.max(0,time-this.motionStart)/this.motionDuration));
    }

    wantsFrame(time, running) {
      if (this.effects.length) return true;
      if (!running || this.reduced || this.low) return false;
      return (this.animated && this.phase !== (Math.floor(time/16)&127)) ||
        (this.hasMotion && this.settling !== this.movementLight(time,running));
    }

    draw(world, zones, time, running) {
      const phase = this.reduced || this.low ? 0 : running ? (Math.floor(time / 16) & 127) : this.phase || 0;
      const settling = this.movementLight(time,running);
      if (this.textureWorld !== world || this.tick !== world.tick || (this.animated && phase !== this.phase) ||
        (this.hasMotion && this.settling !== settling)) {
        this.raster(world, phase, settling);
      }
      const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
      const sx = w / world.width, sy = h / world.height;
      c.imageSmoothingEnabled = !this.low;
      c.drawImage(this.buffer, 0, 0, w, h);
      this.drawEffects(c, sx, sy, time);
      c.save();
      c.lineWidth = Math.max(1,w/850);
      zones.forEach((z,i) => {
        const x=z.x*sx, y=z.y*sy;
        c.strokeStyle = zoneColors[i % zoneColors.length];
        c.fillStyle = zoneFills[i % zoneFills.length];
        c.fillRect(x,y,z.w*sx,z.h*sy);
        c.setLineDash([4,3]);
        c.strokeRect(x,y,z.w*sx,z.h*sy);
        c.setLineDash([]);
        const font = Math.max(9,w/105), label = z.label || 'Goal';
        c.font = '600 '+font+'px system-ui';
        const width = c.measureText(label).width+8, labelX = Math.max(0,Math.min(x,w-width));
        c.fillStyle = '#0e181a';
        c.fillRect(labelX,y,width,font+5);
        c.fillStyle = zoneColors[i % zoneColors.length];
        c.fillText(label,labelX+4,y+font);
      });
      if (this.cursor) this.drawCursor(c, sx, sy);
      if (this.preview) this.drawPreview(c, sx, sy);
      c.restore();
    }

    drawEffects(c, sx, sy, time) {
      if (!this.effects.length) return;
      c.save();
      for (let i=this.effects.length-1; i>=0; i--) {
        const effect = this.effects[i], age = Math.max(0,(time-effect.age)/320);
        if (age >= 1) { this.effects.splice(i,1); continue; }
        const down = effect.event === 'melted' || effect.event === 'condensed';
        const x = (effect.x + effect.sign * age*.9)*sx;
        const y = (effect.y + (down ? 1 : -1)*age*1.2)*sy;
        c.fillStyle = effect.color;
        c.globalAlpha = (1-Math.max(0,age))*.72;
        c.beginPath();
        c.ellipse(x,y,sx*.18,sy*(.18+(1-age)*.12),0,0,Math.PI*2);
        c.fill();
      }
      c.restore();
    }

    drawCursor(c,sx,sy) {
      const {x,y,radius,tint} = this.cursor;
      c.beginPath();
      c.ellipse((x+.5)*sx,(y+.5)*sy,(radius+.5)*sx,(radius+.5)*sy,0,0,Math.PI*2);
      c.strokeStyle = '#071313';
      c.lineWidth = Math.max(2,sx*.26);
      c.stroke();
      c.strokeStyle = tint;
      c.lineWidth = Math.max(1,sx*.13);
      c.stroke();
    }

    drawPreview(c,sx,sy) {
      const {x,y,x2,y2,tool,radius,tint} = this.preview;
      c.strokeStyle = tint;
      c.fillStyle = tint+'38';
      if (tool === 'rect') {
        const left=Math.min(x,x2)*sx, top=Math.min(y,y2)*sy;
        const width=(Math.abs(x2-x)+1)*sx, height=(Math.abs(y2-y)+1)*sy;
        c.fillRect(left,top,width,height);
        c.setLineDash([4,3]);
        c.strokeRect(left,top,width,height);
      } else {
        c.beginPath();
        c.moveTo((x+.5)*sx,(y+.5)*sy);
        c.lineTo((x2+.5)*sx,(y2+.5)*sy);
        c.lineCap = 'round';
        c.strokeStyle = tint+'66';
        c.lineWidth = Math.max(1,(radius*2+1)*sx);
        c.stroke();
        c.strokeStyle = tint;
        c.lineWidth = Math.max(1,sx*.13);
        c.setLineDash([4,3]);
        c.stroke();
      }
    }
  }
  window.ParticleLabRenderer = Renderer;
})();
