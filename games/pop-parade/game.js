import { Game } from './engine.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const colors = ['#76d7ec', '#b39aee', '#ff927e', '#f4ce80', '#90dfbe'];
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
const rgba = (color, alpha) => `rgba(${rgb(color)},${alpha})`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const save = (key, value) => { try { localStorage.setItem(`popParade_${key}`, String(value)); } catch {} };
const load = (key, fallback) => { try { return localStorage.getItem(`popParade_${key}`) ?? fallback; } catch { return fallback; } };
const number = key => Math.max(0, Math.min(1e12, Number(load(key, 0)) || 0));
let mode = load('mode', 'classic') === 'zen' ? 'zen' : 'classic';
let muted = load('sound', 'true') !== 'true';
let record = 0, largestChain = number('largestChain'), newRecord = false;
let particles = [], floats = [], displayScore = 0, selected = -1, hovered = -1;
let game, audio, soundCount = 0, lastPopSound = -1, lastTime = 0, dpr = 1;
let hintDismissed = false, calloutUntil = 0;
let lastScoreText = '', lastChainText = '';
const format = n => Math.round(n).toLocaleString('en-US');
const recordKey = () => mode === 'classic' ? 'bestScore' : 'zenBestScore';

function unlockAudio() {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch { /* The game remains playable without an audio device. */ }
}
function tone(frequency, duration = .12, gain = .035, delay = 0, type = 'sine') {
  if (muted || !audio || audio.state !== 'running' || soundCount >= 6) return;
  soundCount++;
  const oscillator = audio.createOscillator(), envelope = audio.createGain();
  const t = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, t);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * .65, t + duration);
  envelope.gain.setValueAtTime(.0001, t);
  envelope.gain.exponentialRampToValueAtTime(gain, t + .008);
  envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
  oscillator.connect(envelope); envelope.connect(audio.destination);
  oscillator.start(t); oscillator.stop(t + duration + .015);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); soundCount--; };
}
function popSound(count, special) {
  if (!audio || audio.currentTime - lastPopSound < .045) return;
  lastPopSound = audio.currentTime;
  const notes = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  tone(330 * 2 ** (notes[Math.min(count - 1, 10)] / 12), .095, .027);
  if (special) tone(special === 'freeze' ? 1300 : 880, .27, .018, .04, 'triangle');
}
function chime() {
  [523.25, 659.25, 783.99].forEach((f, i) => tone(f, .4, .018, i * .085));
}

// All particles start at gameplay coordinates; none are spawned across the screen.
function burst(x, y, count, colorIndex, power = 1) {
  count = Math.round(count * (reducedMotion ? .4 : 1));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, speed = (45 + Math.random() * 150) * power;
    const kind = Math.random(), life = .9 + Math.random() * 1.9;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 50,
      age: 0, life, color: colors[colorIndex ?? Math.floor(Math.random() * 5)],
      rotation: Math.random() * 6.28, spin: (Math.random() - .5) * 12,
      size: 2 + Math.random() * 3.5, kind: kind < .5 ? 'rect' : kind < .78 ? 'streamer' : 'sparkle' });
  }
  if (particles.length > 650) particles.splice(0, particles.length - 650);
}
function callout(title, subtitle) {
  const el = $('chain-callout');
  el.replaceChildren(document.createTextNode(title));
  const small = document.createElement('small'); small.textContent = subtitle; el.append(small);
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  calloutUntil = game.time + 1.65;
}
function handleEvent(e) {
  if (e.type === 'pop') {
    const b = e.balloon;
    burst(b.x, b.y, b.special ? 24 : 13, b.color, .7);
    floats.push({ x: b.x, y: b.y - b.r, text: `+${e.points}`, age: 0, color: colors[b.color] });
    if (floats.length > 18) floats.shift();
    popSound(e.chain.count, b.special);
    if (e.chain.count > largestChain) { largestChain = e.chain.count; save('largestChain', largestChain); }
    $('score').classList.remove('bump'); void $('score').offsetWidth; $('score').classList.add('bump');
  } else if (e.type === 'milestone') {
    burst(e.x, e.y, e.count === 5 ? 27 : e.count === 10 ? 65 : 140, null, e.count === 25 ? 1.4 : 1);
    if (e.count >= 10) {
      // Extra bursts remain attached to real popped balloons in this reaction.
      game.balloons.filter(b => b.state === 'dead').slice(-2).forEach(b => burst(b.x, b.y, 22, null, .85));
      chime();
    }
    callout(`${e.count} in a row${e.count >= 25 ? '!' : '.'}`, e.count === 5 ? 'THERE IT IS' : e.count === 10 ? 'NOW THAT’S A CHAIN' : 'A BEAUTIFUL CASCADE');
  } else if (e.type === 'clear') {
    burst(e.x, e.y, 190, null, 1.5);
    const points = game.balloons.filter(b => b.state === 'dead');
    for (const b of [points[0], points[Math.floor(points.length / 2)], points.at(-1)]) if (b) burst(b.x, b.y, 45, null, 1.15);
    callout('A clean sweep.', 'EVERY LAST ONE · +2,000'); chime();
  } else if (e.type === 'end') showResult();
  updateRecords();
}
function updateRecords() {
  if (game.score > record) {
    record = game.score; newRecord = true; save(recordKey(), record);
    $('record').textContent = format(record);
  }
}
function dismissHint() {
  hintDismissed = true; $('hint').classList.add('dismissed');
}
function start(nextMode = mode) {
  mode = nextMode; save('mode', mode);
  record = number(recordKey()); newRecord = false;
  particles = []; floats = []; selected = -1; hovered = -1; displayScore = 0;
  $('playfield').style.minHeight = '';
  const rect = canvas.getBoundingClientRect();
  game = new Game({ width: rect.width, height: rect.height, mode,
    seed: (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0, onEvent: handleEvent });
  $('pause-overlay').hidden = true; $('result-overlay').hidden = true;
  $('chain-callout').classList.remove('show');
  $('chain-callout').style.animationPlayState = 'running';
  $('hint').classList.toggle('dismissed', hintDismissed);
  $('classic').setAttribute('aria-pressed', String(mode === 'classic'));
  $('zen').setAttribute('aria-pressed', String(mode === 'zen'));
  $('taps').hidden = mode === 'zen'; $('zen-label').hidden = mode !== 'zen';
  $('tap-label').textContent = mode === 'classic' ? 'TAPS REMAINING' : 'NO LIMITS';
  $('mode-description').textContent = mode === 'classic' ? '3 taps. Make them count.' : 'No rush. Just one more pop.';
  $('field-mode').textContent = mode === 'classic' ? 'CLASSIC SESSION' : 'ZEN SESSION';
  $('field-status').textContent = mode === 'classic' ? 'MAKE IT A CHAIN' : 'STAY A LITTLE LONGER';
  $('record').textContent = format(record);
  $('pause').setAttribute('aria-label', 'Pause game');
  $('pause').setAttribute('aria-pressed', 'false');
  resize(); updateHUD();
}
function updateHUD() {
  displayScore += (game.score - displayScore) * .18;
  if (Math.abs(game.score - displayScore) < 1) displayScore = game.score;
  const digits = String(Math.round(displayScore));
  if (digits !== lastScoreText) {
    lastScoreText = digits;
    $('score').replaceChildren();
    if (digits.length < 5) {
      const zeros = document.createElement('span'); zeros.className = 'score-zero';
      zeros.textContent = '0'.repeat(5 - digits.length); $('score').append(zeros);
    }
    $('score').append(document.createTextNode(digits));
  }
  const chainText = format(Math.max(largestChain, game.bestChain));
  if (lastChainText !== chainText) { $('best-chain').textContent = chainText; lastChainText = chainText; }
  [...$('taps').children].forEach((el, i) => el.classList.toggle('used', i >= game.taps));
  $('taps').setAttribute('aria-label', `${game.taps} taps remaining`);
  if (game.taps === 0 && mode === 'classic' && !game.ended) $('field-status').textContent = 'LET THE MAGIC SETTLE';
}
function showResult() {
  updateRecords();
  $('final-score').textContent = format(game.score);
  $('final-chain').textContent = format(game.bestChain);
  $('final-best').textContent = format(record);
  $('result-kicker').textContent = newRecord ? 'A NEW PERSONAL BEST' : 'THAT WAS A GOOD POP';
  $('result-overlay').hidden = false;
  $('play-again').focus({ preventScroll: true });
}
function pause(value = !game.paused) {
  if (game.ended) return;
  game.paused = value;
  $('pause-overlay').hidden = !value;
  $('pause').setAttribute('aria-label', value ? 'Resume game' : 'Pause game');
  $('pause').setAttribute('aria-pressed', String(value));
  if (audio) {
    if (value) audio.suspend().catch(() => {}); else unlockAudio();
  }
  if (value) $('resume').focus({ preventScroll: true });
  else canvas.focus({ preventScroll: true });
  // CSS callout animation must stop with the simulation as well.
  $('chain-callout').style.animationPlayState = value ? 'paused' : 'running';
}
function syncSound() {
  $('sound').setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
  $('sound').setAttribute('aria-pressed', String(muted));
  $('sound').innerHTML = muted
    ? '<svg viewBox="0 0 24 24"><path d="m11 5-5 4H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="m11 5-5 4H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
}
function toggleSound() {
  muted = !muted; save('sound', !muted); syncSound();
  if (muted) audio?.suspend().catch(() => {});
  else if (!game.paused) { unlockAudio(); tone(660, .12, .025); }
}

function resize() {
  let rect = canvas.getBoundingClientRect();
  if (game) {
    const columns = Math.max(4,Math.floor((rect.width-36)/46));
    const minimum = Math.ceil(game.balloons.length/columns)*48+80;
    $('playfield').style.minHeight = `${minimum}px`;
    rect = canvas.getBoundingClientRect();
  }
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (game && (Math.abs(rect.width-game.width) > .5 || Math.abs(rect.height-game.height) > .5)) {
    const sx = rect.width/game.width, sy = rect.height/game.height;
    game.resize(rect.width, rect.height);
    for (const p of [...particles, ...floats]) { p.x *= sx; p.y *= sy; }
  }
}
function balloon(b) {
  if (b.state === 'dead') return;
  const color = colors[b.color], frozen = b.frozenUntil > game.time;
  const compress = b.state === 'popping' ? Math.max(.72, (b.popAt - game.time) / .085) : 1;
  const birth = b.born === undefined ? 1 : Math.min(1, (game.time - b.born) / .4);
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.scale(compress * birth, (1 + (1 - compress) * .35) * birth);
  const r = b.r, ry = r * 1.14;
  // Fine trailing thread, tied to the base, with an individual gentle bend.
  ctx.beginPath(); ctx.moveTo(0, ry + 4);
  ctx.bezierCurveTo(-7, ry + 11, 7 + Math.sin(game.time + b.phase) * 3, ry + 16, -2, ry + 25);
  ctx.strokeStyle = rgba(color, .25); ctx.lineWidth = .65; ctx.stroke();
  const glow = ctx.createRadialGradient(0, 0, r * .4, 0, 0, r * 1.65);
  glow.addColorStop(0, rgba(color, b.special ? .1 : .045)); glow.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2); ctx.fill();
  const fill = ctx.createRadialGradient(-r * .38, -ry * .45, 0, r * .1, ry * .1, r * 1.5);
  fill.addColorStop(0, rgba(color, .84)); fill.addColorStop(.32, rgba(color, .49));
  fill.addColorStop(.72, rgba(color, .23)); fill.addColorStop(1, rgba(color, .7));
  ctx.fillStyle = fill; ctx.strokeStyle = rgba(color, .68); ctx.lineWidth = .9;
  ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // The lower inner rim and two soft highlights give the balloon translucent volume.
  ctx.beginPath(); ctx.ellipse(0, ry * .03, r * .91, ry * .94, 0, .18, 2.45);
  ctx.strokeStyle = rgba(color, .28); ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-r * .32, -ry * .39, r * .14, ry * .27, .5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-r * .1, -ry * .65, r * .07, ry * .05, -.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3, ry + 4); ctx.lineTo(0, ry - 1); ctx.lineTo(3, ry + 4);
  ctx.closePath(); ctx.fillStyle = rgba(color, .65); ctx.fill();
  if (b.special) {
    ctx.save();ctx.translate(0,3);ctx.scale(r*.8,r*.8);
    ctx.fillStyle = '#f4f1e9';ctx.strokeStyle='#f4f1e9';ctx.lineWidth=.06;ctx.lineJoin='round';ctx.lineCap='round';
    if(b.special==='lightning'){
      ctx.beginPath();ctx.moveTo(.12,-.55);ctx.lineTo(-.35,.08);ctx.lineTo(-.02,.08);
      ctx.lineTo(-.12,.55);ctx.lineTo(.35,-.1);ctx.lineTo(.02,-.1);ctx.closePath();ctx.fill();
    }else{
      for(let i=0;i<(b.special==='freeze'?6:8);i++){
        ctx.save();ctx.rotate(i*Math.PI*2/(b.special==='freeze'?6:8));
        ctx.beginPath();ctx.moveTo(0,.13);ctx.lineTo(0,.49);
        if(b.special==='freeze'){ctx.moveTo(-.13,.3);ctx.lineTo(0,.4);ctx.lineTo(.13,.3);}
        ctx.stroke();ctx.restore();
      }
      ctx.beginPath();ctx.arc(0,0,.07,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    if (b.special === 'rainbow') {
      for (let i=0;i<5;i++) {
        ctx.beginPath(); ctx.ellipse(0,0,r+2,ry+2,0,i*1.257,(i+1)*1.257);
        ctx.strokeStyle = rgba(colors[i], .85); ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }
  if (frozen) {
    ctx.beginPath(); ctx.ellipse(0,0,r+4,ry+4,0,0,Math.PI*2);
    ctx.strokeStyle = '#b9eeff88'; ctx.lineWidth = 1; ctx.setLineDash([2,5]); ctx.stroke(); ctx.setLineDash([]);
  }
  if (b.id === selected || b.id === hovered) {
    ctx.beginPath(); ctx.ellipse(0,0,r+7,ry+7,0,0,Math.PI*2);
    ctx.strokeStyle = rgba(color,.6); ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}
function effects(dt) {
  for (const p of particles) {
    p.age += dt;
    p.vx *= Math.exp(-.8 * dt); p.vy += 77 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rotation += p.spin * dt;
    const fade = Math.min(1, (p.life - p.age) * 1.7);
    if (fade <= 0) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
    ctx.globalAlpha = fade; ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
    const s = p.size, tumble = Math.cos(p.age * 7 + p.spin);
    if (p.kind === 'rect') ctx.fillRect(-s/2, -s, Math.max(.6, Math.abs(tumble)*s), s*1.8);
    else if (p.kind === 'streamer') {
      ctx.beginPath(); ctx.moveTo(-s,-s*1.7); ctx.bezierCurveTo(s*tumble, -s, -s*tumble,s,s,s*1.7);
      ctx.lineWidth=1.5;ctx.stroke();
    } else {
      ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.moveTo(0,-s);ctx.lineTo(0,s);
      ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();
  }
  particles = particles.filter(p => p.age < p.life && p.y < game.height + 30);
  for (const f of floats) {
    f.age += dt;
    ctx.globalAlpha = Math.max(0, 1 - f.age / .85);ctx.fillStyle = f.color;
    ctx.font = '500 11px Arial';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y-f.age*25);
  }
  ctx.globalAlpha = 1;floats = floats.filter(f=>f.age < .85);
}
function frame(time) {
  const dt = Math.min(.033, (time - lastTime) / 1000 || 0); lastTime = time;
  if (!game.paused) game.update(dt);
  ctx.clearRect(0, 0, game.width, game.height);
  for (const w of game.waves) {
    const color = w.special === 'freeze' ? '#b9eeff' : colors[w.color];
    const alpha = Math.max(0, 1 - w.age / w.life);
    ctx.beginPath();ctx.arc(w.x,w.y,Math.max(.1,w.radius),0,Math.PI*2);
    ctx.fillStyle=rgba(color,alpha*.035);ctx.fill();
    ctx.strokeStyle=rgba(color,alpha*.65);ctx.lineWidth=w.special === 'lightning' ? 2 : 1.3;ctx.stroke();
    ctx.beginPath();ctx.arc(w.x,w.y,Math.max(.1,w.radius*.87),0,Math.PI*2);
    ctx.strokeStyle=rgba(color,alpha*.14);ctx.lineWidth=4;ctx.stroke();
  }
  game.balloons.forEach(balloon);
  effects(game.paused ? 0 : dt);
  if (!game.paused) updateHUD();
  if (calloutUntil && game.time > calloutUntil) { $('chain-callout').classList.remove('show'); calloutUntil=0; }
  requestAnimationFrame(frame);
}

function atPointer(e) {
  const rect = canvas.getBoundingClientRect(); return { x: e.clientX-rect.left, y:e.clientY-rect.top };
}
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !e.isPrimary || game.paused || game.ended) return;
  e.preventDefault(); unlockAudio();
  const p = atPointer(e);
  if (game.tap(p.x,p.y)) { dismissHint(); selected=-1; }
  canvas.focus({ preventScroll:true });
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const p=atPointer(e);
  hovered = game.balloons.find(b=>b.state==='alive'&&Math.hypot(p.x-b.x,(p.y-b.y)/1.14)<b.r+5)?.id ?? -1;
  canvas.style.cursor = hovered < 0 ? 'crosshair' : 'pointer';
});
canvas.addEventListener('pointerleave',()=>hovered=-1);
canvas.addEventListener('keydown',e=>{
  if (game.paused || game.ended) return;
  const alive=game.balloons.filter(b=>b.state==='alive');
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const current=alive.find(b=>b.id===selected);
    if (!current) { selected=alive[0]?.id ?? -1;return; }
    const dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
    const candidates=alive.filter(b=>(b.x-current.x)*dx+(b.y-current.y)*dy>5);
    candidates.sort((a,b)=>{
      const cost=p=>Math.hypot(p.x-current.x,p.y-current.y)+Math.abs((p.x-current.x)*dy-(p.y-current.y)*dx)*2;
      return cost(a)-cost(b);
    });
    if (candidates[0]) selected=candidates[0].id;
  } else if (e.key==='Enter'||e.key===' ') {
    e.preventDefault();unlockAudio();
    const b=alive.find(b=>b.id===selected)||alive[0];
    if(b&&game.tap(b.x,b.y)){dismissHint();selected=-1;}
  }
});
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key.toLowerCase()==='p'||e.key==='Escape'){e.preventDefault();pause();}
  if(e.key.toLowerCase()==='m')toggleSound();
  if(e.key.toLowerCase()==='r'){unlockAudio();start();}
});
$('classic').addEventListener('click',()=>{unlockAudio();if(mode!=='classic')start('classic');});
$('zen').addEventListener('click',()=>{unlockAudio();if(mode!=='zen')start('zen');});
$('pause').addEventListener('click',()=>pause());
$('resume').addEventListener('click',()=>pause(false));
$('sound').addEventListener('click',toggleSound);
for(const id of ['restart','play-again'])$(id).addEventListener('click',()=>{unlockAudio();start();});
$('help-toggle').addEventListener('click',()=>{
  const show=$('how-to').hidden; $('how-to').hidden=!show;$('help-toggle').setAttribute('aria-expanded',String(show));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!game.ended)pause(true);});
new ResizeObserver(resize).observe($('playfield'));
syncSound();start();requestAnimationFrame(frame);
