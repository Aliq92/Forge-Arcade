import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../games/neon-drift-courier/index.html', import.meta.url), 'utf8');
function boot({ storageBlocked = false } = {}) {
  const elements = new Map(), saved = new Map([['ndc_best', '120'], ['other-game', 'keep']]);
  const canvas = new Proxy({}, { get: (target, name) => name === 'createRadialGradient' ? () => ({ addColorStop() {} }) : target[name] ?? (() => {}) });
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set(), events = new Map();
      elements.set(id, { style: {}, dataset: {}, textContent: '', innerHTML: '',
        classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
        addEventListener: (name, fn) => events.set(name, fn),
        dispatch: (name, pointerId) => events.get(name)?.({ pointerId, preventDefault() {}, clientX: 250 }),
        setPointerCapture() {}, setAttribute() {}, focus() {}, blur() {}, getContext: () => canvas });
    }
    return elements.get(id);
  }
  const pads = ['left', 'right', 'drift', 'brake'].map(name => { const el = element(name); el.dataset.control = name; return el; });
  const context = vm.createContext({ console, Math, Map, innerWidth: 1000, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }), addEventListener() {}, requestAnimationFrame() {},
    document: { getElementById: element, querySelectorAll: () => pads, addEventListener() {} },
    localStorage: { getItem: k => { if (storageBlocked) throw Error('blocked'); return saved.get(k); }, setItem: (k, v) => { if (storageBlocked) throw Error('blocked'); saved.set(k, String(v)); } },
  });
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  const run = source => vm.runInContext(source, context);
  run('start(); spawnD=Infinity;');
  return { run, element, saved };
}

test('steering travel and velocity agree at 30, 60 and 120 Hz', () => {
  const results = [30, 60, 120].map(hz => {
    const { run } = boot();
    return run(`K.d=true; for(let i=0;i<${hz}/2;i++)step(1/${hz}); ({x:P.x,vx:P.vx})`);
  });
  for (const result of results) {
    assert.ok(Math.abs(result.x - results[0].x) < 0.001);
    assert.ok(Math.abs(result.vx - results[0].vx) < 0.001);
  }
});

test('boost accelerates the road without accelerating steering or sector time; brake overrides boost', () => {
  const a = boot(), b = boot();
  a.run("K.d=true; K[' ']=true; for(let i=0;i<30;i++)step(1/60)");
  b.run('K.d=true; for(let i=0;i<30;i++)step(1/60)');
  assert.equal(a.run('t'), b.run('t'));
  assert.equal(a.run('P.x'), b.run('P.x'));
  assert.ok(a.run('speed') > b.run('speed'));
  a.run('K.s=true; for(let i=0;i<60;i++)step(1/60)');
  assert.ok(a.run('speed') < 3);
  assert.equal(a.run('boostActive'), false);
});

test('drift maintains a longer slide and shows low-grip feedback', () => {
  const a = boot(), b = boot();
  a.run('P.vx=400; K.shift=true; step(.05)');
  b.run('P.vx=400; step(.05)');
  assert.ok(a.run('P.vx') > b.run('P.vx') * 1.4);
  assert.equal(a.run('drifting'), true);
  assert.match(a.element('drive-state').textContent, /DRIFT/);
});

test('independent touch pointers allow steering and boost; cancellation releases only that pointer', () => {
  const { element, run } = boot();
  element('left').dispatch('pointerdown', 1);
  element('boost').dispatch('pointerdown', 2);
  assert.equal(run("pressed('left') && boostActive"), true);
  element('boost').dispatch('pointercancel', 2);
  assert.equal(run("pressed('left')"), true);
  assert.equal(run('boostActive'), false);
  element('left').dispatch('lostpointercapture', 1);
  assert.equal(run('held.size'), 0);
});

test('three pickups activate a gate; delivery rewards exactly once and resets cargo', () => {
  const { run, element } = boot();
  for (let i = 0; i < 3; i++) run("pks=[{k:'p',x:P.x,y:P.y,c:'#00ffff'}]; step(1/60)");
  assert.equal(run('cargo'), 3);
  assert.ok(run('gate'));
  assert.match(element('objective').textContent, /DELIVER/);
  run('gate.x=P.x;gate.y=P.y;');
  const before = run('score');
  run('step(1/60)');
  assert.equal(run('deliveries'), 1);
  assert.equal(run('cargo'), 0);
  assert.equal(run('gate'), null);
  assert.ok(run('score') - before >= 50);
  run('step(1/60)');
  assert.equal(run('deliveries'), 1);
});

test('missing the delivery gate preserves cargo and offers another approach', () => {
  const { run } = boot();
  run('cargo=3;makeGate();gate.x=L+50;P.x=R-50;gate.y=P.y+60;step(1/60)');
  assert.equal(run('cargo'), 3);
  assert.equal(run('deliveries'), 0);
  assert.ok(run('gate.y') < 0);
});

test('shield pickup and collision protection still work while carrying a delivery', () => {
  const { run } = boot();
  run("cargo=3;makeGate();pks=[{k:'s',x:P.x,y:P.y,c:'#00ffff'}];step(1/60)");
  assert.equal(run('shield'), true);
  run("obs=[{k:'b',x:P.x,y:P.y,w:64,h:42,hw:32,hh:21,off:0,c:'#ff3355'}];step(1/60)");
  assert.equal(run('state'), 'PLAYING');
  assert.equal(run('shield'), false);
  assert.ok(run('inv') > 1);
  assert.equal(run('cargo'), 3);
});

test('pause freezes cargo, timer, obstacles and input; resume and restart remain distinct', () => {
  const { run } = boot();
  run("cargo=3;makeGate();score=123;held.set(1,'left');K.d=true;pause()");
  const before = run('JSON.stringify({t,cargo,score,gate})');
  run('loop(100);loop(150)');
  assert.equal(run('JSON.stringify({t,cargo,score,gate})'), before);
  assert.equal(run('held.size'), 0);
  assert.equal(run('K.d'), false);
  run('act()');
  assert.equal(run('state'), 'PLAYING');
  assert.equal(run('cargo'), 3);
  run('pause();start()');
  assert.equal(run('cargo+deliveries+score+t'), 0);
  assert.equal(run('gate'), null);
  assert.equal(run('P.vx'), 0);
});

test('best-score key and unrelated saves survive death/restart; blocked storage remains playable', () => {
  const { run, saved } = boot();
  run('score=175;die();start()');
  assert.equal(saved.get('ndc_best'), '175');
  assert.equal(saved.get('other-game'), 'keep');
  assert.equal(run('best'), 175);
  const blocked = boot({ storageBlocked: true });
  assert.doesNotThrow(() => blocked.run('score=50;die();start();toggleSound()'));
  assert.equal(blocked.run('state'), 'PLAYING');
});

test('resize retains relative lanes for the ship, pickups, obstacles and gate', () => {
  const { run } = boot();
  run("cargo=3;gate={x:L+(R-L)*.5,y:30};obs=[{x:L+(R-L)*.25,y:20}];pks=[{x:L+(R-L)*.75,y:10}];innerWidth=320;innerHeight=568;fit()");
  assert.equal(run('P.x'), 160);
  assert.equal(run('gate.x'), 160);
  assert.equal(run('obs[0].x'), 84);
  assert.equal(run('pks[0].x'), 236);
  assert.ok(run('P.y+P.h/2') < 568-145);
});
