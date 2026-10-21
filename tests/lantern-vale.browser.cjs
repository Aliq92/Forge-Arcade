const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8431';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    for (const touch of [true, false]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: touch });
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/js/main.js', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('const game = new Game(canvas);', 'const game = new Game(canvas); window.testGame = game;') });
      });
      await page.goto(base + '/games/lantern-vale/index.html');
      await page.locator('[data-action="begin"]').click();
      await page.locator('[data-mode="peaceful"]').click();
      const flare = page.locator('#touch-flare');
      if (touch) {
        await flare.tap();
        await page.waitForFunction(() => testGame.stats.flares === 1);
        await page.waitForFunction(() => /\d+s/.test(document.querySelector('#touch-flare .touch-btn-label').textContent));
        await flare.tap();
        assert.equal(await page.evaluate(() => testGame.stats.flares), 1, 'cooldown prevents a second burst');
        await page.evaluate(() => { testGame.player.lantern.energy = 100; testGame.player.lantern.flareCooldown = 0; });
        // Pointer activation must work with a mouse/stylus on a touch-capable device too.
        await flare.click();
        await page.waitForFunction(() => testGame.stats.flares === 2, { timeout: 2000 });
        await page.evaluate(() => { testGame.player.lantern.energy = 10; testGame.player.lantern.flareCooldown = 0; });
        await page.waitForFunction(() => document.querySelector('#touch-flare .touch-btn-label').textContent === 'Low energy');
        await flare.tap();
        assert.equal(await page.evaluate(() => testGame.stats.flares), 2);
        await page.evaluate(() => { testGame.player.lantern.energy = 100; testGame.player.lantern.flareCooldown = 0; });
        await page.waitForFunction(() => document.querySelector('#touch-flare .touch-btn-label').textContent === 'Flare');
        await page.locator('#touch-pause').tap();
        await page.waitForFunction(() => testGame.state === 'paused');
        await page.locator('[data-action="resume"]').click();
      }
      await page.evaluate(() => { testGame.player.lantern.energy = 100; testGame.player.lantern.flareCooldown = 0; });
      const before = await page.evaluate(() => testGame.stats.flares);
      await page.keyboard.press('Space');
      await page.waitForFunction(n => testGame.stats.flares === n + 1, before);
      await page.screenshot({ path: '/tmp/lantern-vale-' + (touch ? 'mobile' : 'desktop') + '.png' });
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: touch and pointer flare, cooldown, low energy, recovery, pause/resume, desktop Space; no browser exceptions');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
