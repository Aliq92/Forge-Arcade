import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expectedGameSha256 = 'b26a435f70a7ba7b736bfcd3ddeae47f691b9c22c1b83a8f0ca8720314f94d8b';

test('Forge Arcade serves the approved Neon Drift: Courier build', async () => {
  const html = await readFile(new URL('../games/neon-drift-courier/index.html', import.meta.url));
  const digest = createHash('sha256').update(html).digest('hex');

  assert.equal(digest, expectedGameSha256);
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
