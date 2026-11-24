const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8420';
const artifacts = process.env.ARCADE_ARTIFACTS || path.join(os.tmpdir(), 'terraform-playtest');

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(artifacts, name + '.png') });
}

async function checkLayout(page) {
  const size = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.ok(size.page <= size.viewport + 1, 'Horizontal overflow: ' + JSON.stringify(size));
}

async function canvasCenter(canvas) {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  assert.ok(box && box.width > 100 && box.height > 100, 'Globe must have a usable surface');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, size: Math.min(box.width, box.height) };
}

// CDP generates native touch input, including pointer capture and two simultaneous contacts.
async function touchGesture(client, start, end) {
  const send = (type, positions) => client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: positions.map(({ x, y }, id) => ({ x, y, id: id + 1 })),
  });
  await send('touchStart', start);
  for (let step = 1; step <= 8; step++) {
    await send('touchMove', start.map((p, i) => ({
      x: p.x + (end[i].x - p.x) * step / 8,
      y: p.y + (end[i].y - p.y) * step / 8,
    })));
  }
  await send('touchEnd', []);
}

async function watchErrors(context, errors) {
  await context.route('https://**/*', route => route.abort());
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && page.url().includes('/games/terraform/') &&
          !message.text().includes('Failed to load resource')) errors.push(message.text());
    });
    page.on('response', response => {
      if (response.url().startsWith(origin + '/games/terraform/') && response.status() >= 400)
        errors.push(response.status() + ' ' + response.url());
    });
  });
}

async function changeAttribute(canvas, name, action) {
  const before = await canvas.getAttribute(name);
  await action();
  await canvas.page().waitForFunction(([name, before]) =>
    document.querySelector('#planet').getAttribute(name) !== before, [name, before]);
}

async function desktopCamera(page) {
  const canvas = page.locator('#planet');
  const p = await canvasCenter(canvas);
  await page.mouse.click(p.x, p.y);
  const originalRegion = await page.locator('#region-title').innerText();
  await changeAttribute(canvas, 'data-camera', async () => {
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + p.size * .18, p.y + 8, { steps: 10 });
    await page.mouse.up();
  });
  await page.mouse.click(p.x, p.y);
  const rotatedRegion = await page.locator('#region-title').innerText();
  assert.notEqual(rotatedRegion, originalRegion, 'Rotation must expose another region at the center');
  await changeAttribute(canvas, 'data-zoom', async () => {
    await page.mouse.move(p.x, p.y);
    await page.mouse.wheel(0, -200);
  });
  await changeAttribute(canvas, 'data-zoom', () => page.locator('#zoom-out').click());
  await changeAttribute(canvas, 'data-camera', () => canvas.press('ArrowRight'));
  await canvas.press('Enter');
  await page.locator('#reset-camera').click();
}

async function mobileCamera(browser, errors) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  await watchErrors(context, errors);
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(origin + '/games/terraform/index.html');
  await page.locator('#mission-title').filter({ hasText: 'First Rain' }).waitFor();
  await checkLayout(page);
  const canvas = page.locator('#planet');
  const client = await context.newCDPSession(page);
  let p = await canvasCenter(canvas);
  await page.touchscreen.tap(p.x, p.y);
  await changeAttribute(canvas, 'data-camera', async () => {
    await touchGesture(client, [p], [{ x: p.x + p.size * .2, y: p.y - 18 }]);
  });
  const distance = Math.round(p.size * .1);
  const pair = spread => [
    { x: p.x - spread, y: p.y }, { x: p.x + spread, y: p.y },
  ];
  const initialRegion = await canvas.getAttribute('data-region');
  await changeAttribute(canvas, 'data-zoom', () => touchGesture(client, pair(distance), pair(distance * 1.7)));
  assert.equal(await canvas.getAttribute('data-region'), initialRegion, 'Pinch must not apply a tool');
  await screenshot(page, 'phone-portrait');
  await page.locator('#tools-toggle').tap();
  await selectedTool(page, 'Climate tools', 'Add Moisture');
  const energy = Number.parseInt(await page.locator('#energy').innerText());
  p = await canvasCenter(canvas);
  await page.touchscreen.tap(p.x, p.y);
  assert.equal(Number.parseInt(await page.locator('#energy').innerText()), energy - 4);
  await page.locator('#tools-toggle').tap();
  await page.setViewportSize({ width: 844, height: 390 });
  await checkLayout(page);
  p = await canvasCenter(canvas);
  await page.touchscreen.tap(p.x, p.y);
  await screenshot(page, 'phone-landscape');
  await page.setViewportSize({ width: 320, height: 568 });
  await checkLayout(page);
  await context.close();
}

async function openGame(page) {
  await page.goto(origin);
  await page.getByRole('tab', { name: 'Simulations', exact: true }).click();
  const card = page.locator('#grid [data-game="terraform"]');
  assert.equal(await card.count(), 1);
  await card.scrollIntoViewIfNeeded();
  await card.locator('img').first().evaluate(img => img.decode());
  await card.screenshot({ path: path.join(artifacts, 'arcade-card.png') });
  await card.click();
  await page.waitForURL('**/games/terraform/index.html');
  await page.locator('#mission-title').filter({ hasText: 'First Rain' }).waitFor();
  await checkLayout(page);
}

async function session(page) {
  return page.evaluate(async () => {
    const store = await import('./storage.mjs');
    const saved = store.loadSession();
    return saved && {
      seed: saved.world.seed,
      mode: saved.world.mode,
      tick: saved.world.tick,
      energy: saved.world.energy,
      settings: saved.settings,
      selectedCell: saved.world.cells[saved.settings.selected],
      target: saved.world.mission?.target,
    };
  });
}

// Pause, change the view, save twice, and ensure later mode switches cannot mutate either snapshot.
async function storedPlanets(page) {
  return page.evaluate(async () => {
    const store = await import('./storage.mjs');
    return store.listPlanets().map(({ id, tick, mode, seed }) => ({ id, tick, mode, seed }));
  });
}

async function selectedTool(page, group, tool) {
  await page.locator('#groups').getByRole('button', { name: group, exact: true }).click();
  const action = page.locator('#tools').getByRole('button', { name: new RegExp(tool) });
  assert.equal(await action.isEnabled(), true);
  await action.click();
}

async function waitForGamePaint(page) {
  // Capture two different overlays under a stationary camera, with the simulation paused.
  const canvas = page.locator('#planet');
  const before = await canvas.screenshot();
  await page.locator('#overlay-open').click();
  await page.locator('#dialog-content').getByRole('button', { name: /temperature/i }).click();
  await page.waitForTimeout(250);
  const after = await canvas.screenshot();
  assert.equal(before.equals(after), false, 'Surface and temperature must render differently');
  assert.match(await page.locator('#view-name').innerText(), /temperature/i);
  await page.locator('#overlay-open').click();
  await page.locator('#dialog-content').getByRole('button', { name: /^surface /i }).click();
}

async function setSpeed(page, speed) {
  const button = page.locator('[data-speed="' + speed + '"]');
  await button.click();
  assert.equal(await button.getAttribute('aria-pressed'), 'true');
}

async function firstMission(page) {
  await setSpeed(page, 0);
  const pausedDay = await page.locator('#day').innerText();
  await desktopCamera(page);
  await waitForGamePaint(page);
  assert.equal(await page.locator('#day').innerText(), pausedDay, 'Camera/inspection advanced a paused world');

  await page.locator('#focus').click();
  const canvas = page.locator('#planet');
  const budget = Number.parseInt(await page.locator('#energy').innerText());
  await selectedTool(page, 'Climate tools', 'Add Moisture');
  const p = await canvasCenter(canvas);
  await page.mouse.click(p.x, p.y);
  assert.equal(Number.parseInt(await page.locator('#energy').innerText()), budget - 4);
  await selectedTool(page, 'Water tools', 'Create Rainfall Zone');
  await canvas.press('Enter');
  assert.equal(Number.parseInt(await page.locator('#energy').innerText()), budget - 12);

  await setSpeed(page, 2);
  await page.waitForFunction(day => document.getElementById('day').textContent !== day, pausedDay);
  await setSpeed(page, 4);
  await page.waitForFunction(() => document.getElementById('mission-kicker').textContent.includes('MISSION COMPLETE'));
  await setSpeed(page, 0);
  const awards = await page.evaluate(async () => (await import('./storage.mjs')).completedMissions());
  assert.ok(awards.includes(0));
  await page.screenshot({ path: path.join(artifacts, 'campaign-restoration.png'), fullPage: true });
}

async function canvasFallback(browser, errors) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await watchErrors(context, errors);
  await context.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...options) {
      if (type === 'webgl' || type === 'webgl2') return null;
      return getContext.call(this, type, ...options);
    };
  });
  const page = await context.newPage();
  await page.goto(origin + '/games/terraform/index.html');
  const canvas = page.locator('#planet');
  await page.waitForSelector('#planet[data-renderer="canvas"][data-region]');
  await setSpeed(page, 0);
  await canvas.press('ArrowLeft');
  await canvas.press('Enter');
  const pixels = await canvas.evaluate(element => {
    const ctx = element.getContext('2d');
    const { data } = ctx.getImageData(0, 0, element.width, element.height);
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] >= 230) painted++;
    return painted / (element.width * element.height);
  });
  assert.ok(pixels > 0.1 && pixels < 0.75, 'Fallback renderer must paint a bounded globe');
  await screenshot(page, 'canvas-fallback');
  await context.close();
}

async function practice(page) {
  await page.locator('#help').click();
  await page.getByRole('button', { name: /start interactive tutorial/i }).click();
  const canvas = page.locator('#planet');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  await page.keyboard.press('Enter');
  for (const lesson of ['Prepare the soil', 'Add surface water', 'Plant pioneer grass']) {
    assert.equal(await page.locator('#lesson-title').innerText(), lesson);
    if (lesson === 'Add surface water') await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
  }
  await setSpeed(page, 4);
  await page.locator('#tutorial').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#feedback').innerText(), /training completed/i);
  assert.match(await page.locator('#mode-name').innerText(), /campaign/i);
  await page.locator('#help').click();
  await page.getByRole('button', { name: /start interactive tutorial/i }).click();
  await page.locator('#skip').click();
  assert.equal(await page.locator('#tutorial').isVisible(), false);
}

async function archiveAndModes(page) {
  await page.locator('#worlds').click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: /save planet/i }).click();
    await page.getByText('Planet saved in this browser.').waitFor();
  }
  const before = await storedPlanets(page);
  assert.equal(before.length, 2);
  assert.notEqual(before[0].id, before[1].id);
  await page.locator('#close').click();
  await page.reload();
  assert.match(await page.locator('#mission-kicker').innerText(), /complete/i);
  await page.locator('#missions').click();
  await page.getByRole('button', { name: /next mission/i }).click();
  assert.match(await page.locator('#mission-title').innerText(), /green beginnings/i);
  await page.locator('#mode').click();
  await page.getByRole('button', { name: /creative sandbox/i }).click();
  await setSpeed(page, 0);
  assert.match(await page.locator('#energy').innerText(), /∞/);
  await selectedTool(page, 'Terrain tools', 'Create Mountain');
  const canvas = page.locator('#planet');
  await canvas.press('Enter');
  assert.match(await page.locator('#feedback').innerText(), /create mountain applied/i);
  await page.locator('#missions').click();
  await page.getByRole('combobox', { name: 'Weather pattern' }).selectOption('wet');
  await page.getByRole('combobox', { name: 'Disturbance' }).selectOption('volcano');
  await page.getByRole('button', { name: /trigger disturbance/i }).click();
  assert.match(await page.locator('#feedback').innerText(), /volcano/i);
  const sandboxSeed = await page.locator('#world-seed').innerText();
  await page.reload();
  assert.equal(await page.locator('#world-seed').innerText(), sandboxSeed);
  const resumed = await session(page);
  assert.ok(resumed.selectedCell.elevation > .6 && resumed.selectedCell.heat > .5);
  await page.locator('#mode').click();
  await page.getByRole('button', { name: /^survival/i }).click();
  assert.match(await page.locator('#mission-title').innerText(), /endure/i);
  assert.match(await page.locator('#energy').innerText(), /^140 TE/);
  const after = await storedPlanets(page);
  assert.ok(before.every(slot => after.some(saved => JSON.stringify(saved) === JSON.stringify(slot))));
  await page.locator('#worlds').click();
  await page.locator('#dialog-content').getByRole('button', { name: /PELAGOS-042.*Campaign/ }).last().click();
  await page.getByText('Planet restored', { exact: true }).waitFor();
  assert.equal(await page.locator('#mode-name').innerText(), 'Campaign');
  assert.match(await page.locator('#mission-kicker').innerText(), /complete/i);
  await page.locator('#worlds').click();
  await page.locator('#seed-input').fill('QA-WORLD-12');
  await page.getByRole('button', { name: /^New Planet/ }).click();
  assert.match(await page.locator('#world-seed').innerText(), /QA-WORLD-12/);
  await page.locator('#worlds').click();
  await page.getByRole('button', { name: /^Regenerate/ }).click();
  assert.match(await page.locator('#world-seed').innerText(), /QA-WORLD-12/);
  assert.match(await page.locator('#mission-kicker').innerText(), /active/i);
}

(async function run() {
  await fs.mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await watchErrors(context, errors);
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    await openGame(page);
    await screenshot(page, 'desktop');
    await firstMission(page);
    await practice(page);
    await archiveAndModes(page);
    await page.getByRole('link', { name: 'Return to Forge Arcade' }).click();
    await page.waitForURL('**/index.html');
    await mobileCamera(browser, errors);
    await canvasFallback(browser, errors);
    assert.deepEqual(errors, []);
    console.log('TERRAFORM passed launcher, desktop, native touch, fallback, progression, tutorial, mode, archive and refresh checks. Screenshots in ' + artifacts);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
