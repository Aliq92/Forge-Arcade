import {
  create,
  step,
  TYPES,
  place,
  mood,
  taskLabel,
  dist,
} from './simulation.js';
import { Renderer } from './renderer.js';
const $ = (q) => document.querySelector(q),
  key = 'outpost-orbit-v1';
let state;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  state =
    saved?.saveVersion === 1 &&
    Array.isArray(saved.aliens) &&
    saved.aliens.length
      ? saved
      : create();
} catch {
  state = create();
}
const renderer = new Renderer($('#world'));
let selected = null,
  building = null,
  ghost = null,
  panelType = null,
  cinematic = false,
  last = performance.now(),
  accumulator = 0,
  lastUI = 0,
  lastSave = 0,
  seenEvent = state.latestEvent?.time || 0,
  toastUntil = 0,
  focus = 0,
  focusAt = 0,
  audio = null;
const safe = (t) =>
  String(t).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
function save() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    $('#save-status') &&
      ($('#save-status').textContent = 'Colony saved just now.');
  } catch {
    $('#save-status') &&
      ($('#save-status').textContent =
        'Storage unavailable. Keep this tab open.');
  }
}
function tone() {
  if (state.muted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    [330, 495, 660].forEach((f, i) => {
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(audio.destination);
      let t = audio.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      o.start(t);
      o.stop(t + 0.7);
    });
  } catch {}
}
function setSpeed(v) {
  state.speed = v;
  accumulator = 0;
  document
    .querySelectorAll('[data-speed]')
    .forEach((b) =>
      b.classList.toggle('active', Number(b.dataset.speed) === v),
    );
  if (v === 0) save();
}
function close() {
  document.body.classList.remove('panel-open');
  panelType = null;
  $('#panel').hidden = true;
  document
    .querySelectorAll('[data-panel]')
    .forEach((b) => b.classList.remove('active'));
}
function show(type) {
  if (type === panelType) {
    close();
    return;
  }
  panelType = type;
  document.body.classList.add('panel-open');
  $('#hint').hidden = true;
  $('#panel').hidden = false;
  renderPanel();
  document
    .querySelectorAll('[data-panel]')
    .forEach((b) => b.classList.toggle('active', b.dataset.panel === type));
}
function head(label, title, intro = '') {
  return `<div class="panel-top"><small>${label}</small><button id="close-panel" aria-label="Close panel">×</button></div><h2>${title}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}`;
}
function renderPanel() {
  const p = $('#panel');
  if (!panelType) return;
  if (panelType === 'build')
    p.innerHTML =
      head(
        'SHAPE THE VILLAGE',
        'Make room for life.',
        'Place a foundation. Your villagers will take it from there.',
      ) +
      `<div class="build-grid">${Object.entries(TYPES)
        .filter(([k]) => !['landing', 'camp'].includes(k))
        .map(
          ([k, v]) =>
            `<button class="build-card" data-build="${k}" ${state.resources.material < v.cost || state.resources.knowledge < (v.unlock || 0) ? 'disabled' : ''} title="${v.description}"><span class="glyph">${v.icon}</span><b>${v.name}</b><small>${v.unlock && state.resources.knowledge < v.unlock ? `Unlock at ${v.unlock} knowledge` : `${v.cost} material · ${v.description.split('.')[0]}`}</small></button>`,
        )
        .join('')}</div>`;
  if (panelType === 'priorities')
    p.innerHTML =
      head(
        'BROAD INTENTIONS',
        'A gentle nudge.',
        'Needs and personalities still matter. Nobody receives a direct order.',
      ) +
      Object.keys(state.priorities)
        .map(
          (k) =>
            `<div class="priority"><label>${k.toUpperCase()}</label><div class="segmented">${['Low', 'Normal', 'High'].map((v, i) => `<button data-priority="${k}" data-value="${i}" class="${state.priorities[k] === i ? 'active' : ''}">${v}</button>`).join('')}</div></div>`,
        )
        .join('');
  if (panelType === 'villagers')
    p.innerHTML =
      head(
        'THE LITTLE LOCALS',
        `${state.aliens.length} lives, unfolding.`,
        'Select someone to get to know them.',
      ) +
      state.aliens
        .map(
          (a) =>
            `<button class="villager-row" data-alien="${a.id}"><span class="portrait" style="background:${a.color}">••</span><span><b>${a.name}${a.age < 180 ? ' · little one' : ''}</b><small>${safe(taskLabel(a))}</small></span></button>`,
        )
        .join('');
  if (panelType === 'alien') {
    const a = state.aliens.find((a) => a.id === selected);
    if (!a) return close();
    const friend = Object.entries(a.relationships).sort(
        (a, b) => b[1] - a[1],
      )[0],
      f = friend && state.aliens.find((b) => b.id === Number(friend[0]));
    p.innerHTML =
      head('A LITTLE LIFE', a.name) +
      `<p class="tag">${a.traits.join(' · ')}</p><div class="info-row"><span>Right now</span><b>${safe(taskLabel(a))}</b></div><div class="info-row"><span>Mood</span><b>${mood(a)}</b></div><div class="info-row"><span>Favorite place</span><b>${state.discoveries.find((d) => d.id === a.favoritePlace)?.name || 'Still finding one'}</b></div><div class="info-row"><span>${friend?.[1] > 70 ? 'Close friend' : 'Friend'}</span><b>${friend?.[1] >= 25 ? f.name : 'Getting acquainted'}</b></div><div class="info-row"><span>Home</span><b>${a.homeId ? 'Habitat pod' : 'Landing camp'}</b></div>${Object.entries(
        a.needs,
      )
        .map(
          ([k, v]) =>
            `<div class="need">${k === 'hunger' ? 'WELL FED' : k === 'rest' ? 'RESTED' : 'CONNECTED'}<i><em style="width:${100 - v}%"></em></i></div>`,
        )
        .join(
          '',
        )}${a.visualTraits.length ? `<p class="tag">MOON TOUCHED · ${a.visualTraits.join(' · ').toUpperCase()}</p>` : ''}<div class="memory">${safe(a.memories[0] || '“Everything here is a little strange. I think I like it.”')}</div>`;
  }
  if (panelType === 'log') {
    p.innerHTML =
      head(
        'COLONY JOURNAL',
        'The story so far.',
        'Small moments make a home.',
      ) +
      state.log
        .map(
          (e) =>
            `<div class="log-entry"><small>DAY ${e.day} · ${e.kind}</small>${safe(e.message)}</div>`,
        )
        .join('');
    $('#log-dot').hidden = true;
  }
  if (panelType === 'settings')
    p.innerHTML =
      head(
        'YOUR LITTLE WORLD',
        'Take your time.',
        'Your colony saves automatically. It rests while this tab is hidden.',
      ) +
      `<button id="sound" style="width:100%">Sound: ${state.muted ? 'off' : 'on'}</button><p class="intro" id="save-status">Saved locally in this browser.</p><button id="save" style="width:100%">Save colony</button><div class="priority"><button id="new-colony">New colony</button> <button id="reset-colony">Reset colony</button></div><p class="intro">Space · pause<br>1 / 2 / 3 / 4 · speed<br>C · cinematic<br>Drag · pan &nbsp; Scroll / pinch · zoom<br>Escape · close / pause</p>`;
  if (panelType === 'object') {
    const b = state.buildings.find((b) => b.id === selected);
    p.innerHTML =
      head(
        'A PLACE IN THE WORLD',
        TYPES[b.type].name,
        TYPES[b.type].description || 'The beginning of everything.',
      ) +
      `<div class="info-row"><span>Status</span><b>${b.progress >= 1 ? 'Active' : `Building · ${Math.floor(b.progress * 100)}%`}</b></div>`;
  }
  $('#close-panel').onclick = close;
  p.querySelectorAll('[data-build]').forEach(
    (b) =>
      (b.onclick = () => {
        building = b.dataset.build;
        ghost = {
          type: building,
          ...renderer.world(innerWidth / 2, innerHeight * 0.5),
        };
        close();
        $('#placement').hidden = false;
      }),
  );
  p.querySelectorAll('[data-priority]').forEach(
    (b) =>
      (b.onclick = () => {
        state.priorities[b.dataset.priority] = Number(b.dataset.value);
        renderPanel();
        save();
      }),
  );
  p.querySelectorAll('[data-alien]').forEach(
    (b) => (b.onclick = () => selectAlien(Number(b.dataset.alien))),
  );
  if ($('#sound'))
    $('#sound').onclick = () => {
      state.muted = !state.muted;
      tone();
      save();
      renderPanel();
    };
  if ($('#save')) $('#save').onclick = save;
  for (const id of ['new-colony', 'reset-colony'])
    if ($('#' + id)) $('#' + id).onclick = () => $('#confirm').showModal();
}
function selectAlien(id) {
  selected = id;
  panelType = null;
  show('alien');
  const a = state.aliens.find((a) => a.id === id);
  renderer.camera.x = a.x;
  renderer.camera.y = a.y;
}
function cancelBuild() {
  building = null;
  ghost = null;
  $('#placement').hidden = true;
}
function cinema() {
  cinematic = !cinematic;
  cancelBuild();
  document.body.classList.toggle('cinematic', cinematic);
  $('#cinematic').innerHTML = cinematic
    ? '▭ <span>Exit cinematic</span>'
    : '▭ <span>Cinematic</span>';
  focusAt = 0;
}
function updateUI(now) {
  $('#resources').innerHTML = Object.entries(state.resources)
    .map(
      ([k, v], i) =>
        `<div class="resource"><span class="symbol">${['♧', 'ϟ', '◇', '✧'][i]}</span><small>${k.toUpperCase()}</small><b>${Math.floor(v)}</b></div>`,
    )
    .join('');
  $('#population').textContent =
    `${state.aliens.length} little lives unfolding`;
  $('#day').textContent =
    `DAY ${String(Math.floor(state.time / 180) + 1).padStart(2, '0')}`;
  const phase = state.time % 180;
  $('#clock').textContent =
    phase < 55
      ? '☀ MORNING'
      : phase < 110
        ? '☀ AFTERNOON'
        : phase < 135
          ? '◒ EVENING'
          : '☾ NIGHTFALL';
  $('#day-track i').style.width = `${phase / 1.8}%`;
  if (state.buildings.some((b) => b.type === 'habitat'))
    $('#hint').hidden = true;
  if (state.latestEvent && state.latestEvent.time > seenEvent) {
    seenEvent = state.latestEvent.time;
    $('#toast').innerHTML =
      `<div class="event"><small>${state.latestEvent.kind}</small>${safe(state.latestEvent.message)}</div>`;
    toastUntil = now + 7500;
    $('#log-dot').hidden = false;
    tone();
    if (state.latestEvent.kind === 'BUILT') save();
  }
  if (now > toastUntil) $('#toast').innerHTML = '';
  if (
    panelType === 'alien' ||
    panelType === 'villagers' ||
    panelType === 'object'
  )
    renderPanel();
}
const pointers = new Map();
let gesture = null;
const cv = $('#world');
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gesture = {
    x: e.clientX,
    y: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    moved: false,
  };
  if (pointers.size === 2) {
    let p = [...pointers.values()];
    gesture.pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
});
cv.addEventListener('pointermove', (e) => {
  const w = renderer.world(e.clientX, e.clientY);
  if (building) ghost = { type: building, ...w };
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    let p = [...pointers.values()],
      d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (gesture.pinch)
      renderer.camera.zoom = Math.min(
        2.8,
        Math.max(0.45, (renderer.camera.zoom * d) / gesture.pinch),
      );
    gesture.pinch = d;
    gesture.moved = true;
  } else {
    let dx = e.clientX - gesture.lastX,
      dy = e.clientY - gesture.lastY;
    if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 7)
      gesture.moved = true;
    if (gesture.moved) {
      renderer.camera.x -= dx / renderer.camera.zoom;
      renderer.camera.y -= dy / renderer.camera.zoom;
      renderer.camera.x = Math.max(-800, Math.min(800, renderer.camera.x));
      renderer.camera.y = Math.max(-550, Math.min(550, renderer.camera.y));
    }
    gesture.lastX = e.clientX;
    gesture.lastY = e.clientY;
  }
});
cv.addEventListener('pointerup', (e) => {
  const moved = gesture?.moved;
  pointers.delete(e.pointerId);
  if (moved || pointers.size) return;
  const w = renderer.world(e.clientX, e.clientY);
  if (building) {
    if (place(state, building, w.x, w.y)) {
      cancelBuild();
      save();
      tone();
    }
    return;
  }
  let a = state.aliens
    .filter((a) => dist(a, { x: w.x, y: w.y + 10 }) < 22 / renderer.camera.zoom)
    .sort((a, b) => dist(a, w) - dist(b, w))[0];
  if (a) {
    selected = a.id;
    panelType = null;
    show('alien');
    return;
  }
  let b = state.buildings.find((b) => dist(b, w) < TYPES[b.type].r);
  if (b) {
    selected = b.id;
    panelType = null;
    show('object');
  } else {
    selected = null;
    close();
  }
});
cv.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
cv.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const before = renderer.world(e.clientX, e.clientY);
    renderer.camera.zoom = Math.max(
      0.45,
      Math.min(2.8, renderer.camera.zoom * Math.exp(-e.deltaY * 0.001)),
    );
    const after = renderer.world(e.clientX, e.clientY);
    renderer.camera.x += before.x - after.x;
    renderer.camera.y += before.y - after.y;
  },
  { passive: false },
);
window.addEventListener('resize', () => renderer.resize());
document.querySelectorAll('[data-panel]').forEach(
  (b) =>
    (b.onclick = () => {
      cancelBuild();
      show(b.dataset.panel);
    }),
);
document
  .querySelectorAll('[data-speed]')
  .forEach((b) => (b.onclick = () => setSpeed(Number(b.dataset.speed))));
$('#settings').onclick = () => show('settings');
$('#hint-build').onclick = () => show('build');
$('#hint-close').onclick = () => ($('#hint').hidden = true);
$('#cancel-build').onclick = cancelBuild;
$('#cinematic').onclick = cinema;
$('#zoom-in').onclick = () =>
  (renderer.camera.zoom = Math.min(2.8, renderer.camera.zoom * 1.2));
$('#zoom-out').onclick = () =>
  (renderer.camera.zoom = Math.max(0.45, renderer.camera.zoom / 1.2));
$('#home').onclick = () =>
  Object.assign(renderer.camera, {
    x: 15,
    y: 20,
    zoom: innerWidth < 760 ? 0.85 : 1.12,
  });
$('#keep').onclick = () => $('#confirm').close();
$('#restart').onclick = () => {
  state = create();
  save();
  selected = null;
  cancelBuild();
  close();
  $('#confirm').close();
  $('#hint').hidden = false;
  seenEvent = 0;
  $('#home').click();
  setSpeed(1);
};
document.addEventListener('keydown', (e) => {
  if ($('#confirm').open) return;
  if (e.code === 'Space') {
    e.preventDefault();
    setSpeed(state.speed ? 0 : 1);
  }
  if (['1', '2', '3', '4'].includes(e.key))
    setSpeed([1, 2, 4, 8][Number(e.key) - 1]);
  if (e.key.toLowerCase() === 'c') cinema();
  if (e.key === 'Escape') {
    if (cinematic) cinema();
    else if (building) cancelBuild();
    else if (panelType) close();
    else setSpeed(0);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    setSpeed(0);
    save();
  }
});
window.addEventListener('pagehide', save);
if (innerWidth < 760) renderer.camera.zoom = 0.85;
setSpeed(state.speed);
updateUI(performance.now());
function frame(now) {
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!document.hidden) {
    accumulator += dt * state.speed;
    let n = 0;
    while (accumulator >= 0.1 && n++ < 12) {
      step(state, 0.1);
      accumulator -= 0.1;
    }
    if (!state.speed) accumulator = 0;
    if (cinematic) {
      if (now > focusAt) {
        focus = state.aliens[Math.floor(now / 26000) % state.aliens.length].id;
        focusAt = now + 26000;
      }
      const a = state.aliens.find((a) => a.id === focus);
      renderer.camera.x += (a.x - renderer.camera.x) * Math.min(1, dt * 0.24);
      renderer.camera.y += (a.y - renderer.camera.y) * Math.min(1, dt * 0.24);
      $('#cinema-story').textContent =
        `${a.name} · ${taskLabel(a).toLowerCase()}`;
    }
    renderer.render(
      state,
      now,
      panelType === 'alien' ? selected : null,
      ghost,
      state.speed ? accumulator / 0.1 : 1,
    );
    if (now - lastUI > 500) {
      updateUI(now);
      lastUI = now;
    }
    if (now - lastSave > 30000) {
      save();
      lastSave = now;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Small read-only inspection surface for browser QA; no player-facing debug UI.
window.outpost = {
  get state() {
    return state;
  },
  get camera() {
    return renderer.camera;
  },
  screen: (x, y) => renderer.screen(x, y),
  save,
};
