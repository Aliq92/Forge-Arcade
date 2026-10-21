const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8431';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    for (const touch of [true, false]) {
      const page = await browser.newPage({ viewport: touch ? { width: 375, height: 667 } : { width: 1280, height: 800 }, hasTouch: touch });
      page.setDefaultTimeout(5000);
      page.on('pageerror', e => errors.push(e.message));
      // Expose the real game only in the test browser; production has no test hook.
      await page.route('**/js/main.js', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('const game = new Game(canvas);', 'const game = new Game(canvas); window.testGame = game;') });
      });
      const visible = async id => assert.equal(await page.locator(id).isVisible(), true, id);
      const state = async value => page.waitForFunction(s => testGame.state === s, value);
      const action = async name => page.locator('.screen:not(.hidden) [data-action="' + name + '"]').click();
      const use = async () => touch ? page.locator('#touch-interact').click() : page.keyboard.press('e');
      const pause = async () => touch ? page.locator('#touch-pause').click() : page.keyboard.press('Escape');
      await page.goto(base + '/games/lantern-vale/index.html');
      await visible('#screen-title');
      assert.equal(await page.locator('#touch-controls').isVisible(), false);
      await action('howto');
      await visible('#screen-howto');
      await action('back-title');
      await action('settings');
      await page.locator('#set-reduced').check();
      await page.locator('#set-fog').evaluate(el => { el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.locator('#set-particles').evaluate(el => { el.value = '0.5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await action('back-prev');
      await page.reload();
      await action('settings');
      assert.equal(await page.locator('#set-reduced').isChecked(), true);
      assert.equal(await page.locator('#set-fog').inputValue(), '0.3');
      await action('back-prev');
      await action('begin');
      await page.locator('[data-mode="peaceful"]').click();
      await state('playing');
      assert.equal(await page.evaluate(() => testGame.particles.density), 0.5);

      // Real keyboard movement and pause must not leave the player walking.
      const x = await page.evaluate(() => testGame.player.x);
      await page.keyboard.down('d');
      await page.waitForFunction(x => testGame.player.x > x + 10, x);
      await pause();
      await state('paused');
      await page.keyboard.up('d');
      assert.equal(await page.locator('#touch-controls').isVisible(), false);
      await action('pause-howto');
      await action('back-title');
      await visible('#screen-pause');
      await action('pause-settings');
      await action('back-prev');
      await visible('#screen-pause');
      await page.keyboard.press('Escape');
      await state('playing');
      assert.deepEqual(await page.evaluate(() => testGame.input.getMoveAxis()), { x: 0, y: 0 });

      const flare = page.locator('#touch-flare');
      if (touch) {
        // Actual multi-touch: hold the stick while firing with a second finger.
        const client = await page.context().newCDPSession(page);
        const stick = await page.locator('#touch-stick').boundingBox();
        const button = await flare.boundingBox();
        const finger = { x: stick.x + stick.width * 0.8, y: stick.y + stick.height / 2, id: 1 };
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
        const beforeMove = await page.evaluate(() => testGame.player.x);
        await page.waitForFunction(x => testGame.player.x > x + 5, beforeMove);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger, { x: button.x + button.width / 2, y: button.y + button.height / 2, id: 2 }] });
        await page.waitForFunction(() => testGame.stats.flares === 1);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(() => !testGame.input.touch.move.active);
        await flare.tap({ force: true });
        await page.waitForFunction(() => !testGame.input.touch.flare);
        assert.equal(await page.evaluate(() => testGame.stats.flares), 1);
        await page.evaluate(() => { testGame.player.lantern.energy = 10; testGame.player.lantern.flareCooldown = 0; });
        await page.waitForFunction(() => document.querySelector('#touch-flare .touch-btn-label').textContent === 'Low energy');
        await flare.tap({ force: true });
        await page.waitForFunction(() => !testGame.input.touch.flare);
        assert.equal(await page.evaluate(() => testGame.stats.flares), 1);
        await page.evaluate(() => { testGame.player.lantern.energy = 100; testGame.player.lantern.flareCooldown = 0; });
        await page.waitForFunction(() => document.querySelector('#touch-flare').getAttribute('aria-disabled') === 'false');
        await flare.click();
        await page.waitForFunction(() => testGame.stats.flares === 2);
      }
      await page.evaluate(() => { testGame.player.lantern.energy = 100; testGame.player.lantern.flareCooldown = 0; });
      const before = await page.evaluate(() => testGame.stats.flares);
      await page.keyboard.press('Space');
      await page.waitForFunction(n => testGame.stats.flares === n + 1, before);

      // Reed use: deterministic placement, actual Use button/key and cooldown.
      await page.evaluate(() => {
        const p = testGame.player;
        p.lantern.energy = 10;
        testGame.world.objects.emberReeds = [{ x: p.x, y: p.y, ready: true, cooldown: 0 }];
      });
      await page.waitForFunction(() => !document.querySelector('#prompt-interact').classList.contains('hidden'));
      await use();
      await page.waitForFunction(() => testGame.player.lantern.energy > 20);
      assert.equal(await page.evaluate(() => testGame.world.objects.emberReeds[0].ready), false);

      // Complete all five shrines through the real interaction/upgrade flow.
      for (let i = 0; i < 5; i++) {
        await page.evaluate(i => {
          const shrine = testGame.shrines.shrines[i];
          Object.assign(testGame.player, { x: shrine.x, y: shrine.y });
          testGame.player.lantern.energy = 1;
        }, i);
        await use();
        await state('upgrade');
        assert.equal(await page.evaluate(() => testGame.player.lantern.energy === testGame.player.lantern.maxEnergy), true);
        assert.equal(await page.locator('.upgrade-card').count(), 3);
        const card = page.locator('.upgrade-card').first();
        assert.equal(await card.evaluate(el => el.tagName), 'BUTTON');
        await card.focus();
        await page.keyboard.press('Enter');
        await state('playing');
        assert.equal(await page.evaluate(() => testGame.shrines.activatedCount), i + 1);
      }
      assert.equal(await page.evaluate(() => testGame.world.gateOpen), true);
      await page.evaluate(() => Object.assign(testGame.player, { x: testGame.shrines.heart.x, y: testGame.shrines.heart.y }));
      await use();
      await state('victory');
      await visible('#screen-victory');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.lv_progress).victories), 1);
      await page.waitForFunction(() => document.querySelector('#toast-container').childElementCount === 0);
      await page.screenshot({ path: '/tmp/lantern-vale-victory-' + (touch ? 'mobile' : 'desktop') + '.png' });
      await action('continue-exploring');
      await state('playing');
      await pause();
      await action('restart');
      await state('playing');
      assert.equal(await page.evaluate(() => testGame.shrines.activatedCount), 0);
      await page.evaluate(() => { testGame.player.health = 0; });
      await state('gameover');
      await action('retry');
      await state('playing');
      assert.equal(await page.evaluate(() => testGame.player.health), 3);
      await pause();
      await action('title');
      await visible('#screen-title');
      await action('modes');
      await page.locator('[data-mode="endless"]').click();
      await page.waitForFunction(() => /Wander freely/.test(document.querySelector('#objective-text').textContent));
      await page.screenshot({ path: '/tmp/lantern-vale-' + (touch ? 'mobile' : 'desktop') + '.png' });
      await page.close();
      console.log('PASS: ' + (touch ? 'mobile/multitouch' : 'desktop/keyboard') + ' menus, settings, movement, flare, reeds, 5 shrines, victory, continue, restart, death/retry, endless');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: no browser exceptions');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
