import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readOrEmpty = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const index = readOrEmpty('index.html');
const register = readOrEmpty('signal-garden-register.js');
const game = readOrEmpty('games/signal-garden/index.html');

test('Signal Garden is registered as a Forge Arcade experiment', () => {
  assert.match(index, /signal-garden-register\.js/);
  assert.match(register, /id:\s*['"]signal-garden['"]/);
  assert.match(register, /category:\s*['"]Experiments['"]/);
});

test('Signal Garden keeps touch controls comfortably sized on mobile', () => {
  assert.match(game, /\.icon-btn\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px;/s);
  assert.match(game, /\.btn\s*\{[^}]*min-height:\s*44px;/s);
});

test('Signal Garden caps field resolution for compact devices and reduced motion', () => {
  assert.match(game, /isCompact\s*=\s*Math\.min\([^)]*\)\s*<\s*700/);
  assert.match(game, /reducedMotion\s*=\s*window\.matchMedia/);
  assert.match(game, /bufMax\s*=\s*reducedMotion\s*\?\s*110\s*:\s*\(isCompact\s*\?\s*140\s*:\s*190\)/);
});
