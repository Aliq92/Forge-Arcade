'use strict';
const { chromium } = require(process.env.FORGE_PLAYWRIGHT || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { Simulation, WORLD, CONFIG, angleDifference } = require('../games/the-last-lighthouse/simulation.js');
const { chooseInput } = require('./the-last-lighthouse-balance.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results/the-last-lighthouse');
const storageKey = 'forge-arcade:the-last-lighthouse:v1';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const report = { checks: [], layouts: [], captures: [], errors: [], missing: [] };
const qa = page => page.evaluate(() => ({ state: LastLighthouseTest.state, sim: LastLighthouseTest.sim, audio: LastLighthouseTest.audioState }));
const state = (page, value) => page.waitForFunction(wanted => window.LastLighthouseTest?.state === wanted, value);
const advance = (page, seconds, input = {}) => page.evaluate(({ seconds, input }) => LastLighthouseTest.advance(seconds, input), { seconds, input });
function observe(page, label) {
  page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`${label}: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) report.missing.push(`${label}: ${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => report.missing.push(`${label}: ${request.failure()?.errorText} ${request.url()}`));
}
async function capture(page, name, canvas = true) {
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  if (canvas) {
    const data = await page.locator('#ocean').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set(); let opaque = 0;
      for (let i = 0; i < pixels.length; i += 80) { if (pixels[i + 3]) opaque++; colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`); }
      return { png: canvas.toDataURL('image/png').split(',')[1], colors: colors.size, opaque, width: canvas.width, height: canvas.height };
    });
    assert.ok(data.opaque > 100 && data.colors > 20, 'Canvas must contain rendered ocean artwork');
    await fs.writeFile(path.join(output, name + '-canvas.png'), Buffer.from(data.png, 'base64'));
    report.captures.push({ name, width: data.width, height: data.height, colors: data.colors });
  } else report.captures.push({ name });
}
async function layout(page, viewport) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal document overflow');
  const box = await page.locator('#ocean').boundingBox();
  assert.ok(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, 'Entire ocean fits the viewport');
  for (const id of ['beam-button', 'pause-button', 'sound-button']) {
    const target = await page.locator('#' + id).boundingBox();
    assert.ok(target && target.width >= 44 && target.height >= 44, `${id}: target at least 44px`);
    assert.ok(target.x >= 0 && target.y >= 0 && target.x + target.width <= viewport.width + 1 && target.y + target.height <= viewport.height + 1, `${id}: visible in viewport ${JSON.stringify({ target, viewport, scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })) })}`);
  }
  report.layouts.push(viewport);
}
function serve() {
  return http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const content = await fs.readFile(file); res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(content);
    } catch { res.writeHead(404).end(); }
  });
}
async function run() {
  await fs.mkdir(output, { recursive: true });
  const server = serve(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.FORGE_URL || `http://127.0.0.1:${server.address().port}/`;
  const url = new URL('games/the-last-lighthouse/index.html?test=1', base).href;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.FORGE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); observe(page, 'desktop');
    await page.goto(url, { waitUntil: 'load' }); await state(page, 'MENU');
    assert.equal((await qa(page)).audio.created, false, 'No AudioContext before gesture');
    await capture(page, 'desktop-menu', false);
    await page.locator('#how-button').click(); await state(page, 'TUTORIAL');
    await page.locator('#tutorial-start').click(); await state(page, 'PLAYING');
    report.checks.push('Menu, instructions, start, no audio before interaction');

    await page.locator('#ocean').focus();
    const beforeKey = (await qa(page)).sim.beamAngle;
    await page.keyboard.down('d'); await page.waitForTimeout(140); await page.keyboard.up('d');
    assert.ok(angleDifference((await qa(page)).sim.beamAngle, beforeKey) > 0.05, 'D rotates clockwise');
    const afterRight = (await qa(page)).sim.beamAngle;
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(140); await page.keyboard.up('ArrowLeft');
    assert.ok(angleDifference((await qa(page)).sim.beamAngle, afterRight) < -0.05, 'Left arrow rotates counterclockwise');
    for (const [key, sign] of [['a', -1], ['ArrowRight', 1]]) {
      const before = (await qa(page)).sim.beamAngle;
      await page.keyboard.down(key); await page.waitForTimeout(100); await page.keyboard.up(key);
      assert.ok(angleDifference((await qa(page)).sim.beamAngle, before) * sign > 0.03, `${key} rotates correctly`);
    }
    const initiallyOn = (await qa(page)).sim.beamOn;
    await page.keyboard.press('Space'); assert.equal((await qa(page)).sim.beamOn, !initiallyOn);
    await page.keyboard.press('Space'); assert.equal((await qa(page)).sim.beamOn, initiallyOn);
    await advance(page, 3);
    const first = (await qa(page)).sim.ships[0]; assert.ok(first, 'First vessel spawned');
    const board = await page.locator('#ocean').boundingBox();
    const target = { x: board.x + first.x / WORLD.size * board.width, y: board.y + first.y / WORLD.size * board.height };
    await page.mouse.move(board.x + board.width * 0.5, board.y + board.height * 0.47);
    await page.mouse.down(); await page.mouse.move(target.x, target.y, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(650);
    const guided = (await qa(page)).sim.ships.find(ship => ship.id === first.id);
    assert.ok(guided.illuminated && guided.confidence > first.confidence, 'Actual mouse drag illuminates and guides the vessel');
    report.checks.push('A/D and arrow-key rotation; Space toggle; actual mouse drag guides first ship');

    await page.locator('#pause-button').click(); await state(page, 'PAUSED');
    const paused = (await qa(page)).sim;
    const modalButtons = page.locator('#dialog button');
    await modalButtons.first().focus(); await page.keyboard.press('Shift+Tab');
    assert.equal(await modalButtons.last().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Tab'); assert.equal(await modalButtons.first().evaluate(node => node === document.activeElement), true);
    await advance(page, 20, { turn: 1, beam: false });
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    await page.waitForTimeout(150); assert.deepEqual((await qa(page)).sim, paused, 'Pause freezes every simulation field');
    await page.waitForTimeout(350);
    const resumeGap = await page.evaluate(async () => {
      const before = LastLighthouseTest.sim.time;
      LastLighthouseTest.resume();
      await new Promise(requestAnimationFrame);
      return LastLighthouseTest.sim.time - before;
    });
    assert.ok(resumeGap <= 1 / 60 + 1e-8, `Resume must discard paused wall time; first frame advanced ${resumeGap}s`);
    await state(page, 'PLAYING');
    for (let cycle = 0; cycle < 3; cycle++) { await page.keyboard.press('p'); await state(page, 'PAUSED'); await page.keyboard.press('Escape'); await state(page, 'PLAYING'); }
    const beamBefore = (await qa(page)).sim.beamOn;
    await page.locator('#beam-button').click(); assert.equal((await qa(page)).sim.beamOn, !beamBefore, 'Repeated pause/resume preserves one toggle per click');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await state(page, 'PAUSED'); const hidden = (await qa(page)).sim;
    await advance(page, 10, { turn: 1 }); assert.deepEqual((await qa(page)).sim, hidden);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await state(page, 'PAUSED'); await page.locator('#resume-button').click();
    await page.evaluate(() => { LastLighthouseTest.restart(); LastLighthouseTest.pause(); });
    const baseline = new Simulation(71024); baseline.pause();
    assert.deepEqual((await qa(page)).sim, JSON.parse(JSON.stringify(baseline)), 'Restart restores the exact seeded simulation');
    await page.locator('#resume-button').click();
    await page.locator('#sound-button').click();
    await page.waitForFunction(() => LastLighthouseTest.audioState.created && LastLighthouseTest.audioState.state === 'running');
    await page.locator('#pause-button').click(); await page.waitForFunction(() => LastLighthouseTest.audioState.state === 'suspended');
    await page.locator('#resume-button').click(); await page.waitForFunction(() => LastLighthouseTest.audioState.state === 'running');
    await page.reload({ waitUntil: 'load' }); await state(page, 'MENU');
    assert.equal((await qa(page)).audio.enabled, true); assert.equal((await qa(page)).audio.created, false, 'Saved sound preference does not autoplay after reload');
    await page.locator('#sound-button').click();
    report.checks.push('Full pause freeze, focus trap, repeated resume, background auto-pause, exact seeded restart, gesture audio suspension, saved preference without autoplay');

    await page.evaluate(({ source }) => {
      window.__keeper = new Function('sim', `const {WORLD,CONFIG,angleDifference}=LastLighthouseSimulation; return (${source})(sim);`);
      LastLighthouseTest.start(71024);
    }, { source: chooseInput.toString() });
    const classes = new Set(); let stormCaptured = false;
    for (let chunk = 0; chunk < 180; chunk++) {
      const run = await page.evaluate(() => {
        for (let i = 0; i < 50 && LastLighthouseTest.state === 'PLAYING'; i++) LastLighthouseTest.advance(0.2, window.__keeper(LastLighthouseTest.sim));
        return { state: LastLighthouseTest.state, sim: LastLighthouseTest.sim };
      });
      for (const type of ['fishing', 'sail', 'cargo']) if (!classes.has(type) && run.sim.ships.some(ship => ship.type === type)) { await capture(page, 'vessel-' + type); classes.add(type); }
      if (!stormCaptured && run.sim.storm > 0.5) { await capture(page, 'high-storm'); stormCaptured = true; }
      if (run.state !== 'PLAYING') break;
    }
    await state(page, 'VICTORY');
    const winning = (await qa(page)).sim;
    assert.equal(winning.rescued, 12); assert.ok(winning.lost < 3); assert.deepEqual([...classes].sort(), ['cargo', 'fishing', 'sail']); assert.equal(stormCaptured, true);
    report.winningRun = { seed: winning.seed, time: winning.time, rescued: winning.rescued, lost: winning.lost, activeBeamSeconds: winning.activeBeamSeconds };
    await capture(page, 'victory');
    await page.locator('#play-again-button').click(); await state(page, 'PLAYING'); assert.equal((await qa(page)).sim.rescued, 0);
    await page.evaluate(() => LastLighthouseTest.start(71024));
    for (let chunk = 0; chunk < 50 && (await qa(page)).state === 'PLAYING'; chunk++) await advance(page, 10, { beam: false, turn: 0 });
    await state(page, 'GAME_OVER'); assert.equal((await qa(page)).sim.lost, 3); await capture(page, 'game-over');
    await page.locator('#retry-button').click(); await state(page, 'PLAYING'); assert.equal((await qa(page)).sim.lost, 0);
    report.checks.push('Real winning-policy inputs reach 12 rescues; unassisted real run reaches 3 losses; victory replay and loss retry reset counters; all vessel types and high storm captured');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    await advance(page, 3); await capture(page, 'desktop-reduced-motion');
    for (const viewport of [{ width: 1440, height: 1000 }]) { await layout(page, viewport); }
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const touch = await touchContext.newPage(); observe(touch, 'touch');
    await touch.goto(url, { waitUntil: 'load' }); await state(touch, 'MENU'); await capture(touch, 'touch-menu', false);
    await touch.locator('#start-button').tap(); await state(touch, 'PLAYING');
    const touchBox = await touch.locator('#ocean').boundingBox();
    const desired = { x: touchBox.x + touchBox.width * 0.8, y: touchBox.y + touchBox.height * 0.3 };
    const oldAngle = (await qa(touch)).sim.beamAngle, desiredAngle = Math.atan2(-0.17, 0.3);
    const cdp = await touchContext.newCDPSession(touch);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchBox.x + touchBox.width / 2, y: touchBox.y + touchBox.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [desired] });
    await touch.waitForTimeout(600);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(Math.abs(angleDifference((await qa(touch)).sim.beamAngle, desiredAngle)) < Math.abs(angleDifference(oldAngle, desiredAngle)), 'Actual touch drag aims beam');
    const on = (await qa(touch)).sim.beamOn; await touch.locator('#beam-button').tap(); assert.equal((await qa(touch)).sim.beamOn, !on);
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
      await touch.setViewportSize(viewport); await touch.waitForTimeout(100); await layout(touch, viewport); await capture(touch, `touch-${viewport.width}x${viewport.height}`);
    }
    report.checks.push('Reduced motion; desktop/portrait/landscape entire arena fit; 44px visible controls; actual touch drag and beam button');

    const blockedContext = await browser.newContext();
    await blockedContext.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
    const blocked = await blockedContext.newPage(); observe(blocked, 'blocked-storage');
    await blocked.goto(url, { waitUntil: 'load' }); await blocked.locator('#start-button').click(); await state(blocked, 'PLAYING');
    await blocked.locator('#sound-button').click(); await blocked.locator('#beam-button').click(); await advance(blocked, 3);
    assert.ok((await qa(blocked)).sim.ships.length > 0);
    const offlineContext = await browser.newContext({ offline: true });
    const offline = await offlineContext.newPage(); observe(offline, 'offline-file');
    await offline.goto(pathToFileURL(path.join(root, 'games/the-last-lighthouse/index.html')).href + '?test=1', { waitUntil: 'load' });
    await state(offline, 'MENU'); await offline.locator('#start-button').click(); await state(offline, 'PLAYING'); await advance(offline, 3); await capture(offline, 'offline-file');
    report.checks.push('Blocked preference storage remains playable; direct file:// works offline with local scripts/styles/audio/artwork');

    assert.deepEqual(report.errors, []); assert.deepEqual(report.missing, []);
    report.passed = true;
  } finally {
    await fs.writeFile(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
    await browser.close(); server.close(); server.closeAllConnections();
  }
  console.log(JSON.stringify(report, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
