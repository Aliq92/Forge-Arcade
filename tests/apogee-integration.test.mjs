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
  assert.match(game, /<canvas id="c"><\/canvas>/);
  assert.match(game, /window\.__gameTest/);
  assert.match(game, /Stage burn/);
  assert.match(game, /localStorage/);
});
