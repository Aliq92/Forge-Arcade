import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('Forge Arcade ships the supplied Impossible Reef build directly', async () => {
  const arcade = await readFile(new URL('index.html', root), 'utf8');
  const game = await readFile(new URL('games/impossible-reef/index.html', root), 'utf8');
  const script = await readFile(new URL('games/impossible-reef/script.js', root), 'utf8');

  assert.match(arcade, /impossible-reef-register\.js/);
  assert.doesNotMatch(arcade, /impossible-garden/i);
  assert.match(game, /<script src="script\.js"><\/script>/);
  assert.match(game, /<svg viewBox="0 0 24 24">/);
  assert.match(script, /const SPECIES =/);
  await assert.rejects(access(new URL('games/impossible-garden', root)));
});
