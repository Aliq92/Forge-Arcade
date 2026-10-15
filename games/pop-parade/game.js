import { Game } from './engine.mjs';
import { BalloonAtlas, COLORS as colors, rgba } from './balloon-atlas.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const atlas = new BalloonAtlas();
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
let lastTaps = -1, liveChainId = null, liveUntil = 0, specialUntil = 0;
let effectTime = 0, rafId = null, renderDirty = true, pulsePending = false, scoreAnimation;
let recordsDirty = false, recordsTimer;
const format = n => Math.round(n).toLocaleString('en-US');
const recordKey = () => mode === 'classic' ? 'bestScore' : 'zenBestScore';

function unlockAudio() {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch { /* The game remains playable without an audio device. */ }
}
function tone(frequency, duration = .12, gain = .035, delay = 0, type = 'sine', slide = .65) {
  if (muted || game?.paused || !audio || audio.state !== 'running' || soundCount >= 6) return;
  soundCount++;
  const oscillator = audio.createOscillator(), envelope = audio.createGain();
  const t = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, t);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * slide, t + duration);
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
  const notes = [0, 2, 4, 7, 9];
  const step = Math.min(count - 1, 12);
  const pitch = 294 * 2 ** ((notes[step % 5] + Math.floor(step / 5) * 12) / 12);
  tone(pitch, .1, .024, 0, 'sine', .78);
  if (special === 'freeze') tone(1175, .32, .013, .03, 'sine', 1.02);
  if (special === 'lightning') tone(440, .18, .014, .025, 'triangle', 2);
  if (special === 'rainbow') [0,4,7].forEach((n,i)=>tone(523*2**(n/12),.22,.01,.025+i*.045,'sine',1));
}
function chime() {
  [523.25, 659.25, 783.99].forEach((f, i) => tone(f, .4, .018, i * .085));
}

// All particles start at gameplay coordinates; none are spawned across the screen.
function burst(x, y, count, colorIndex, power = 1) {
  count = Math.round(count * (reducedMotion ? .4 : 1));
  for (let i = 0; i < count; i++) {
    const angle = i/count*Math.PI*2+(Math.random()-.5)*.45, speed = (65 + Math.random() * 145) * power;
    const kind = Math.random(), life = 1.05 + Math.random() * 1.75;
    particles.push({ x, y, originX:x, originY:y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 65,
      age: 0, life, color: colors[colorIndex ?? Math.floor(Math.random() * 5)],
      rotation: Math.random() * 6.28, spin: (Math.random() - .5) * 12,
      size: 2 + Math.random() * 3.5, flutter: Math.random()*6.28, kind: kind < .5 ? 'rect' : kind < .78 ? 'streamer' : 'sparkle' });
  }
  if (particles.length > 650) particles.splice(0, particles.length - 650);
}
function callout(title, subtitle) {
  const el = $('chain-callout');
  el.replaceChildren(document.createTextNode(title));
  const small = document.createElement('small'); small.textContent = subtitle; el.append(small);
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  calloutUntil = effectTime + 1.65;
}
function paintChain(chain, complete = false) {
  liveChainId = chain.id;
  liveUntil = complete ? effectTime+1.8 : Infinity;
  $('chain-meter').hidden = false;
  $('chain-meter').dataset.state = complete ? 'complete' : 'running';
  $('live-chain-count').textContent = chain.count;
  $('chain-label').textContent = complete ? 'CHAIN COMPLETE' : 'CHAIN REACTION';
  const goal = chain.count < 5 ? 5 : chain.count < 10 ? 10 : chain.count < 25 ? 25 : 50;
  $('chain-goal').textContent = complete ? `+${format(chain.score)} POINTS` : chain.count>=50 ? 'INCREDIBLE CHAIN' : `NEXT · ${goal}`;
  $('chain-meter').style.setProperty('--chain-progress',Math.min(1,chain.count/goal));
  if(complete) $('chain-meter').setAttribute('aria-label',`${chain.count} balloons in a chain. ${chain.score} points.`);
}
function specialFeedback(special) {
  const descriptions={lightning:'WIDER SHOCKWAVE',freeze:'DRIFT ON HOLD',rainbow:'EVERY COLOR CONNECTS'};
  const el=$('special-feedback');el.replaceChildren(document.createTextNode(special));
  const small=document.createElement('small');small.textContent=descriptions[special];el.append(small);
  el.dataset.special=special;el.hidden=false;specialUntil=effectTime+1.65;
}
function handleEvent(e) {
  if (e.type === 'pop') {
    const b = e.balloon;
    burst(b.x, b.y, b.special ? 27 : 15, b.color, .75);
    floats.push({ x: b.x, y: b.y - b.r, text: `+${e.points}`, age: 0, color: colors[b.color] });
    if (floats.length > 18) floats.shift();
    popSound(e.chain.count, b.special);
    if (e.chain.count > largestChain) { largestChain = e.chain.count; recordsDirty = true; }
    pulsePending=true;
    const active=[...game.chains.values()].filter(c=>!c.finished).sort((a,b)=>b.count-a.count);
    paintChain(active[0]||e.chain);
    if(b.special) specialFeedback(b.special);
  } else if (e.type === 'milestone') {
    burst(e.x, e.y, e.count === 5 ? 27 : e.count === 10 ? 65 : 140, null, e.count === 25 ? 1.4 : 1);
    if (e.count >= 10) {
      // Extra bursts remain attached to real popped balloons in this reaction.
      game.balloons.filter(b => b.state === 'dead'&&b.chainId===e.chainId).slice(-2).forEach(b => burst(b.x, b.y, 22, null, .85));
      chime();
    }
    callout(`${e.count} in a row${e.count >= 25 ? '!' : '.'}`, e.count === 5 ? 'THERE IT IS' : e.count === 10 ? 'NOW THAT’S A CHAIN' : 'A BEAUTIFUL CASCADE');
  } else if (e.type === 'clear') {
    burst(e.x, e.y, 190, null, 1.5);
    const points = game.balloons.filter(b => b.state === 'dead');
    for (const b of [points[0], points[Math.floor(points.length / 2)], points.at(-1)]) if (b) burst(b.x, b.y, 45, null, 1.15);
    callout('A clean sweep.', 'EVERY LAST ONE · +2,000'); chime();
  } else if (e.type === 'chainEnd') {
    if(e.chainId===liveChainId) paintChain({id:e.chainId,count:e.count,score:e.score},true);
    updateRecords();flushRecords();
  } else if (e.type === 'end') showResult();
  updateRecords();
}
function updateRecords() {
  if (game.score > record) {
    record = game.score; newRecord = true; recordsDirty=true;
    $('record').textContent = format(record);
  }
  if(recordsDirty&&!recordsTimer)recordsTimer=setTimeout(flushRecords,1000);
}
function flushRecords() {
  clearTimeout(recordsTimer);recordsTimer=null;
  if(recordsDirty){save(recordKey(),record);save('largestChain',largestChain);recordsDirty=false;}
}
function dismissHint() {
  hintDismissed = true; $('hint').classList.add('dismissed');
}
function start(nextMode = mode) {
  flushRecords();
  mode = nextMode; save('mode', mode);
  record = number(recordKey()); newRecord = false;
  particles = []; floats = []; selected = -1; hovered = -1; displayScore = 0;
  effectTime=0;calloutUntil=0;liveChainId=null;liveUntil=0;specialUntil=0;
  $('chain-meter').hidden=true;$('special-feedback').hidden=true;
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
  resize(); updateHUD(0);wake();
}
function updateHUD(dt) {
  displayScore += (game.score - displayScore) * (1-Math.exp(-12*dt));
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
  if(lastTaps!==game.taps){
    lastTaps=game.taps;
    [...$('taps').children].forEach((el, i) => el.classList.toggle('used', i >= game.taps));
    $('taps').setAttribute('aria-label', `${game.taps} taps remaining`);
  }
  if(pulsePending&&!reducedMotion){scoreAnimation?.cancel();scoreAnimation=$('score').animate([{color:'#95e6ca',transform:'translateY(-1px)'},{color:'inherit',transform:'none'}],{duration:220});}
  pulsePending=false;
  if (game.taps === 0 && mode === 'classic' && !game.ended && $('field-status').textContent!=='LET THE MAGIC SETTLE') $('field-status').textContent = 'LET THE MAGIC SETTLE';
}
function showResult() {
  updateRecords();
  flushRecords();
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
  flushRecords();
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
  if(value)scoreAnimation?.pause();else scoreAnimation?.play();
  lastTime=0;wake();
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
  atlas.setDpr(dpr);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (game && (Math.abs(rect.width-game.width) > .5 || Math.abs(rect.height-game.height) > .5)) {
    const sx = rect.width/game.width, sy = rect.height/game.height;
    game.resize(rect.width, rect.height);
    for (const p of [...particles, ...floats]) { p.x *= sx; p.y *= sy; }
  }
  wake();
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
  ctx.drawImage(atlas.get(b.color,b.special),-r*1.75,-r*1.75,r*3.5,r*3.5);
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
    p.x += (p.vx+Math.sin(p.age*6+p.flutter)*9) * dt; p.y += p.vy * dt; p.rotation += p.spin * dt;
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
function wake() {
  renderDirty=true;
  if(rafId===null&&!document.hidden)rafId=requestAnimationFrame(frame);
}
function frame(time) {
  rafId=null;
  if(document.hidden||(game.paused&&!renderDirty))return;
  const dt = lastTime ? Math.min(.033,(time-lastTime)/1000) : 0;lastTime=time;
  renderDirty=false;
  if (!game.paused) {effectTime+=dt;game.update(dt);}
  ctx.clearRect(0, 0, game.width, game.height);
  for (const w of game.waves) {
    const color = w.special === 'freeze' ? '#b9eeff' : colors[w.color];
    const alpha = Math.max(0, 1 - w.age / w.life);
    ctx.beginPath();ctx.arc(w.x,w.y,Math.max(.1,w.radius),0,Math.PI*2);
    ctx.fillStyle=rgba(color,alpha*.035);ctx.fill();
    ctx.strokeStyle=rgba(color,alpha*.65);ctx.lineWidth=w.special === 'lightning' ? 2 : 1.3;ctx.stroke();
    ctx.beginPath();ctx.arc(w.x,w.y,Math.max(.1,w.radius*.87),0,Math.PI*2);
    ctx.strokeStyle=rgba(color,alpha*.14);ctx.lineWidth=4;ctx.stroke();
    if(w.rainbow){
      colors.forEach((c,i)=>{
        ctx.beginPath();ctx.arc(w.x,w.y,Math.max(.1,w.radius),i*Math.PI*.4,(i+1)*Math.PI*.4);
        ctx.strokeStyle=rgba(c,alpha*.85);ctx.lineWidth=2;ctx.stroke();
      });
    }else if(w.special==='lightning'){
      ctx.beginPath();
      for(let i=0;i<=48;i++){
        const angle=i/48*Math.PI*2,r=w.radius*(i%2?.96:1.04);
        const x=w.x+Math.cos(angle)*r,y=w.y+Math.sin(angle)*r;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle=rgba('#f4ce80',alpha*.6);ctx.lineWidth=1;ctx.stroke();
    }
  }
  game.balloons.forEach(balloon);
  effects(game.paused ? 0 : dt);
  if (!game.paused) updateHUD(dt);
  if (calloutUntil && effectTime > calloutUntil) { $('chain-callout').classList.remove('show'); calloutUntil=0; }
  if(liveUntil&&effectTime>liveUntil){$('chain-meter').hidden=true;liveUntil=0;}
  if(specialUntil&&effectTime>specialUntil){$('special-feedback').hidden=true;specialUntil=0;}
  const effectsActive=particles.length||floats.length||calloutUntil||liveUntil||specialUntil||Math.abs(game.score-displayScore)>=1;
  if(!game.paused&&(!game.ended||effectsActive))rafId=requestAnimationFrame(frame);
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
  if(game.paused||game.ended)wake();
});
canvas.addEventListener('pointerleave',()=>{hovered=-1;if(game.paused||game.ended)wake();});
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
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){flushRecords();if(!game.ended)pause(true);if(rafId!==null)cancelAnimationFrame(rafId);rafId=null;}
  else{lastTime=0;wake();}
});
window.addEventListener('pagehide',flushRecords);
new ResizeObserver(resize).observe($('playfield'));
syncSound();start();
