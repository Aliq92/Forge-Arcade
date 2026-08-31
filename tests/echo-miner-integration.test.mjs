import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const appSource = readFileSync(join(root, 'app.js'), 'utf8');
const arcadeIndex = readFileSync(join(root, 'index.html'), 'utf8');
const gameRoot = join(root, 'games', 'echo-miner');

test('Echo Miner is registered as a featured Forge Arcade game', () => {
  const entry = appSource.match(/\{\s*id:\s*'echo-miner',[\s\S]*?\n\s*\},/);
  assert.ok(entry, 'missing echo-miner entry in GAMES');
  assert.match(entry[0], /title:\s*'Echo Miner'/);
  assert.match(entry[0], /category:\s*'Games'/);
  assert.match(entry[0], /featured:\s*true/);
});

test('Echo Miner runtime is self-contained under games/echo-miner', () => {
  const required = [
    'index.html',
    'styles.css',
    'src/main.mjs',
    'src/cave.mjs',
    'src/hunter.mjs',
    'src/render.mjs',
    'src/state.mjs',
  ];
  for (const relativePath of required) {
    assert.equal(
      existsSync(join(gameRoot, relativePath)),
      true,
      `missing Echo Miner runtime file: ${relativePath}`,
    );
  }

  const gameIndex = readFileSync(join(gameRoot, 'index.html'), 'utf8');
  assert.match(gameIndex, /<script type="module" src="src\/main\.mjs"><\/script>/);
  assert.match(gameIndex, /<link rel="stylesheet" href="styles\.css"\s*\/?>/);
});

test('Forge Arcade cache-busts the launcher containing Echo Miner', () => {
  assert.match(arcadeIndex, /<script src="app\.js\?v=20260901-echo-miner"><\/script>/);
});
