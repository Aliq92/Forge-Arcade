import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expectedGameSha256 = '982b9bbc5b5cbce6191a4eded90a463fdb98ecf5843f7ca29e6a81b03b96c4ce';

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

test('Neon Drift exposes a bottom-center hold-to-boost control during a run', async () => {
  const html = await readFile(
    new URL('../games/neon-drift-courier/index.html', import.meta.url),
    'utf8',
  );

  assert.match(html, /<button id="boost"[^>]*>BOOST<\/button>/);
  assert.match(html, /#boost\{[^}]*position:fixed[^}]*left:50%[^}]*bottom:/s);
  assert.match(html, /const BOOST_MULTIPLIER=1\.65/);
  assert.match(html, /boostEl\.addEventListener\('pointerdown',.*?setBoost\(true\)/s);
  assert.match(html, /const simulationRate=boostActive\?BOOST_MULTIPLIER:1/);
  assert.match(html, /step\(dt\*simulationRate\)/);
});
