import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('Forge Arcade serves the upgraded static Canvas courier', async () => {
  const html = await readFile(new URL('../games/neon-drift-courier/index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>Neon Drift: Courier<\/title>/);
  assert.match(html, /getContext\('2d'\)/);
  assert.match(html, /href="\.\.\/\.\.\/index.html"/);
  assert.match(html, /localStorage.getItem\('ndc_best'\)/);
});

test('the existing Neon Drift: Courier arcade registration remains intact', async () => {
  const arcade = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const launcher = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const registration = await readFile(
    new URL('../neon-drift-courier-register.js', import.meta.url),
    'utf8',
  );

  assert.match(arcade, /<script src="neon-drift-courier-register\.js"><\/script>/);
  assert.match(registration, /id:\s*['"]neon-drift-courier['"]/);
  assert.match(registration, /title:\s*['"]Neon Drift: Courier['"]/);
  assert.match(launcher, /href="games\/\$\{game\.id\}\/index\.html"/);
});

test('Neon Drift exposes a bottom-center hold-to-boost control during a run', async () => {
  const html = await readFile(
    new URL('../games/neon-drift-courier/index.html', import.meta.url),
    'utf8',
  );

  assert.match(html, /<button id="boost"[^>]*>BOOST<\/button>/);
  assert.match(html, /#boost\{[^}]*position:fixed[^}]*left:50%[^}]*bottom:/s);
  assert.match(html, /const BOOST_MULTIPLIER=1\.65/);
  assert.match(html, /bindHold\(boostEl,'boost'\)/);
  assert.match(html, /boostActive\?BOOST_MULTIPLIER:1/);
  assert.match(html, /step\(dt\)/);
  assert.doesNotMatch(html, /step\(dt\*simulationRate\)/);
});

test('the courier renders as a layered cyan and magenta interceptor without changing its physics body', async () => {
  const html = await readFile(
    new URL('../games/neon-drift-courier/index.html', import.meta.url),
    'utf8',
  );
  const shipSource = html.match(/function drawShip\(\)\{[\s\S]*?\r?\n\}\r?\nfunction draw\(sv\)\{/);
  assert.ok(shipSource, 'drawShip renderer should remain present');

  const commands = [];
  const ctx = new Proxy({}, {
    set(target, property, value) {
      commands.push(['set', property, value]);
      target[property] = value;
      return true;
    },
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => commands.push([property, ...args]);
    },
  });
  const source = shipSource[0].replace(/\r?\nfunction draw\(sv\)\{$/, '');
  vm.runInNewContext(`${source}\ndrawShip();`, {
    ctx,
    P: { x: 100, y: 200, w: 30, h: 50, tilt: 0 },
    inv: 0,
    now: 1000,
    shield: false,
    drifting: false,
    boostActive: false,
    RM: false,
  });

  const assignedColors = commands
    .filter(([kind, property]) => kind === 'set' && ['fillStyle', 'strokeStyle', 'shadowColor'].includes(property))
    .map(([, , value]) => value);
  const pathCount = commands.filter(([kind]) => kind === 'beginPath').length;

  assert.match(html, /P=\{x:\(L\+R\)\/2,y:H-Math\.max\(190,H\*\.25\),w:30,h:50,/);
  assert.ok(pathCount >= 8, `expected a layered ship silhouette, got ${pathCount} paths`);
  assert.ok(assignedColors.includes('#00f0ff'), 'ship should use the game cyan for its luminous wing edges');
  assert.ok(assignedColors.includes('#ff2bd6'), 'ship should use the game magenta for its energy spine');
});
