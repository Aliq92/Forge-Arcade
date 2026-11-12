const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const out = 'test-results/neon-forge';
const base = 'http://127.0.0.1:8428/games/neon-forge/';
fs.mkdirSync(out, { recursive: true });
const quantile = (a, q) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))];
const summary = a => ({ median: quantile(a, .5), p95: quantile(a, .95), max: Math.max(...a) });

// These are synthetic maximum-load fixtures, NOT evidence of playing through
// campaign or unlocking Endless. The actual main loop still advances the core.
async function fixture(page, mode) {
  await page.evaluate(async mode => {
    const { Game } = await import('./game.js');
    const fixture = new Game({ mode, seed: 817, endlessUnlocked: true });
    fixture.waveNumber = mode === 'boss' ? 10 : 25;
    fixture._beginWave();
    fixture.stage = 5;
    // Normal health/damage/invulnerability rules remain intact. Starting outer
    // targets at 48 units/s keeps the brief sample before any center arrivals.
    if (fixture.boss) { fixture.boss.hp = 4; fixture.boss.phase = 3; fixture.boss.phaseTime = 3.5; }
    for (let i = 0; i < fixture.wave.maxTargets; i++) {
      fixture._spawn({ type: ['spark', 'drifter', 'bulwark', 'splinter'][i % 4], angle: i * Math.PI * 2 / fixture.wave.maxTargets, speed: 48 });
    }
    Object.assign(window.neonForge.game, fixture);
  }, mode);
}

(async () => {
  let browser;
  const errors = [], scenarios = [];
  try {
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    for (const mode of ['boss', 'endless']) for (const setting of ['high', 'low', 'reduced']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      page.on('requestfailed', r => errors.push(`${r.failure()?.errorText} ${r.url()}`));
      page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:8428/')) errors.push(`External asset: ${r.url()}`); });
      await page.goto(base);
      await page.click('#settings');
      await page.selectOption('#quality', setting === 'low' ? 'low' : 'high');
      await page.locator('#reduced').setChecked(setting === 'reduced');
      await page.click('#settingsDialog [data-close]');
      await page.click('#start');
      await fixture(page, mode);
      await page.evaluate(() => {
        const renderer = window.neonForge.renderer, original = renderer.draw.bind(renderer);
        window.bench = { frames: [], inputs: [], count: 0, previous: null, cacheStart: renderer.metrics.cacheBuilds };
        window.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat) window.bench.pendingInput = { at: performance.now(), attempts: window.neonForge.game.stats.attempts }; }, true);
        renderer.draw = (game, options) => {
          // Saturate the bounded effect pool on every integrated frame. Feedback
          // does not alter targets, scoring or combat state.
          // Recycle presentation particles before their update so feedback fills
          // the exact cap instead of leaving a few expired slots for one frame.
          for (const particle of renderer.pool) particle.life = 0;
          renderer.feedback(Array.from({ length: 12 }, (_, i) => ({ type: i % 2 ? 'perfect' : 'combo', angle: i, r: 86, value: 35 })));
          const b = window.bench, start = performance.now();
          original(game, options);
          const end = performance.now();
          if (b.pendingInput) {
            b.inputs.push({ keydownToDrawMs: end - b.pendingInput.at, accepted: game.stats.attempts === b.pendingInput.attempts + 1, attackVisible: !!game.player.attack });
            b.pendingInput = null;
          }
          if (b.count >= 30 && b.count < 150) b.frames.push({ drawMs: end - start, intervalMs: b.previous === null ? 0 : start - b.previous, particles: renderer.metrics.particles, shockwaves: renderer.metrics.shockwaves, targets: renderer.metrics.drawnTargets, stage: renderer.metrics.stage, state: game.state, cacheBuilds: renderer.metrics.cacheBuilds, dpr: renderer.metrics.dpr });
          b.previous = start; b.count++;
        };
      });
      await page.waitForFunction(() => window.bench.count >= 60);
      await page.locator('#arena').focus();
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.bench.count >= 150);
      const data = await page.evaluate(() => ({ frames: window.bench.frames, inputs: window.bench.inputs, cacheStart: window.bench.cacheStart, cacheEnd: window.neonForge.renderer.metrics.cacheBuilds, finalTime: window.neonForge.game.time, shields: window.neonForge.game.player.shields }));
      assert.equal(data.frames.length, 120);
      const cap = setting === 'reduced' ? 0 : setting === 'low' ? 80 : 320;
      const targetCap = await page.evaluate(() => window.neonForge.game.wave.maxTargets);
      assert.ok(data.frames.every(f => f.particles === cap && f.shockwaves <= (setting === 'high' ? 8 : setting === 'low' ? 3 : 0) && f.targets === targetCap && f.stage === 5 && f.dpr === 1.5 && f.state === 'playing'), 'maximum load must be maintained');
      assert.ok(data.inputs.length === 1 && data.inputs[0].accepted && data.inputs[0].attackVisible, 'native input must reach real game and next draw');
      assert.equal(data.cacheEnd - data.frames[0].cacheBuilds, 0, 'static arena cache reused throughout steady sample');
      assert.equal(data.shields, 3, 'sample completed before center collisions, with ordinary health');
      const cdp = await context.newCDPSession(page), memory = [];
      await cdp.send('Performance.enable');
      for (let i = 0; i < 3; i++) {
        // Fresh bounded fixtures avoid turning this performance-only sample into
        // artificial death/health bypass. The integrated loop remains running.
        await fixture(page, mode);
        const before = await page.evaluate(() => window.bench.count);
        await page.waitForFunction(n => window.bench.count >= n + 60, before);
        await cdp.send('HeapProfiler.collectGarbage');
        const metrics = await cdp.send('Performance.getMetrics'), dom = await cdp.send('Memory.getDOMCounters');
        memory.push({ heapBytes: metrics.metrics.find(m => m.name === 'JSHeapUsedSize').value, ...dom });
      }
      scenarios.push({ fixture: mode === 'boss' ? 'boss level10 phase3 synthetic maximum load' : 'Endless level25 synthetic maximum load', setting, viewport: '1440x900 CSS px', sampleFrames: 120, dpr: 1.5, stage: 5, activeTargets: targetCap, particles: cap, maxShockwaves: Math.max(...data.frames.map(f=>f.shockwaves)), drawMs: summary(data.frames.map(f => f.drawMs)), frameIntervalMs: summary(data.frames.map(f => f.intervalMs)), input: data.inputs[0], arenaCacheBuildsDuringWarmupAndSample: data.cacheEnd - data.cacheStart, arenaCacheBuildsDuringSteadySample: 0, memory, heapDeltaBytes: memory[2].heapBytes - memory[0].heapBytes, domNodeDelta: memory[2].nodes - memory[0].nodes });
      await context.close();
    }
    assert.deepEqual(errors, []);
    const report = { browser: await browser.version(), environment: 'Headless installed Windows Chrome; real main requestAnimationFrame, simulation, input and draw; desktop viewport with requested device scale2 capped1.5', limitations: ['Synthetic maximum-load fixtures; no campaign completion or genuine Endless unlock claim.', 'Presentation particles recycled and replenished through bounded feedback every draw to sustain exact caps; these synthetic effect timings are not a normal playthrough.', 'Real core advances during samples; this is not a renderer-purity assertion.', '120 measured frames after30 warmup frames per setting; intervals include scheduling and automation overhead.', 'Draw timing measures JavaScript submission, not complete GPU presentation latency.', 'Input is browser keydown-to-next completed draw, excluding physical device/display latency; one sample per scenario.', 'Three forced-GC short samples per setting; stable retained heap/DOM over this short interval is not a long-duration leak proof.', 'Desktop headless measurements do not establish physical Android FPS or real-device performance.'], scenarios, errors };
    fs.writeFileSync(`${out}/performance.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { if (browser) await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
