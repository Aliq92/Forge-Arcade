import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('Forge Arcade ships Apogee as a static playable build', async () => {
  const arcade = await readFile(new URL('index.html', root), 'utf8');
  const game = await readFile(new URL('games/apogee/index.html', root), 'utf8');
  const register = await readFile(new URL('apogee-register.js', root), 'utf8');

  assert.match(arcade, /apogee-register\.js/);
  assert.match(register, /id: 'apogee'/);
  assert.match(game, /<canvas id="gameCanvas"><\/canvas>/);
  // Apogee's current static build splits runtime and persistence into linked scripts.
  const scripts = [...game.matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"/g)].map(match => match[1]);
  assert.equal(scripts.length, 9);
  const runtime = (await Promise.all(scripts.map(script => readFile(new URL(`games/apogee/${script}`, root), 'utf8')))).join('\n');
  assert.match(runtime, /function launch\(/);
  assert.match(runtime, /requestAnimationFrame/);
  assert.match(runtime, /localStorage/);
});
