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

test('Signal Garden caps field resolution for smaller devices and reduced motion', () => {
  assert.match(game, /const isCompact = Math\.min\(cssW, cssH\) < 700;/);
  assert.match(game, /const bufMax = prefs\.reduced \? 120 : \(isCompact \? 150 : 190\);/);
});
