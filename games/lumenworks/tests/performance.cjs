/* Run against the local integrated game: node games/lumenworks/tests/performance.cjs [base URL]. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch { playwright = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const base = (process.argv[2] || process.env.LUMENWORKS_BASE_URL || 'http://127.0.0.1:8428').replace(/\/$/, '');
const output = path.resolve(__dirname, '../../../test-results/lumenworks');
const frames = Math.max(60, Math.min(600, Number(process.env.LUMENWORKS_BENCHMARK_FRAMES) || 180));
const metricsMap = result => Object.fromEntries(result.metrics.map(m => [m.name, m.value]));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await playwright.chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : process.platform === 'win32' ? { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const errors = [], failures = [], resourceWarnings = [], httpErrors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const entry = { text: message.text(), url: message.location().url || '' };
    // A browser's implicit root favicon request is outside the standalone game.
    if (/\/favicon\.ico(?:\?|$)/.test(entry.url)) resourceWarnings.push(entry);
    else errors.push(entry);
  });
  page.on('requestfailed', request => failures.push({ url: request.url(), reason: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() }); });
  const report = { generatedAt: new Date().toISOString(), url: base, browser: await browser.version(), viewport: { width: 1440, height: 900, dpr: 1.5 }, samplesPerCase: frames, note: 'Integrated requestAnimationFrame measurements in desktop headless Chrome. Draw timings measure CPU canvas submission; frame intervals include the integrated UI. Forced-GC heap samples indicate retained memory, not physical mobile performance. Automatic root favicon warnings are recorded separately from game resources.', cases: [], errors, failures, resourceWarnings, httpErrors };
  try {
    await page.goto(`${base}/games/lumenworks/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.lumenworks?.renderer);
    await page.locator('#sandbox').click();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    for (const fixture of ['level8', 'sandbox48']) for (const quality of ['high', 'low']) {
      await cdp.send('HeapProfiler.collectGarbage');
      const before = metricsMap(await cdp.send('Performance.getMetrics'));
      const result = await page.evaluate(async ({ fixture, quality, frames }) => {
        const [{ Game }, { LEVELS, createSandbox }, { allocate, validateNetwork }] = await Promise.all([import('./game.js'), import('./levels.js'), import('./network.js')]);
        let game;
        if (fixture === 'level8') {
          game = new Game(LEVELS[7]);
          for (const action of game.board.solution) { const result = game.act(action); if (!result.ok) throw new Error(`Reference action failed: ${result.message}`); }
          if (!game.ready || game.stars !== 3) throw new Error('Level eight is not fully illuminated at three stars.');
        } else {
          const board = createSandbox(), styles = ['house', 'apartment', 'market', 'shop', 'tram', 'factory', 'public'];
          board.nodes = [{ id: 'benchmark-generator', type: 'generator', name: 'Benchmark Supply', x: .5, y: .5, capacity: 47 }, ...Array.from({ length: 47 }, (_, i) => ({ id: `benchmark-house-${i}`, type: 'building', name: `City Block ${i + 1}`, style: styles[i % styles.length], demand: 1, priority: i, x: 1 + i % 8 * 1.4, y: 1 + Math.floor(i / 8) * 1.5 }))];
          board.edges = board.nodes.slice(1).map((n, i) => ({ id: `benchmark-cable-${i}`, from: board.nodes[0].id, to: n.id, capacity: 1, enabled: true, damaged: false }));
          board.title = '48-component illuminated city'; board.constraints.maxLength = 16;
          const valid = validateNetwork(board); if (!valid.ok) throw new Error(valid.errors.join('; '));
          game = new Game(board, 'sandbox');
        }
        if (Object.values(game.allocation.served).some(served => !served)) throw new Error('Benchmark contains an unpowered load.');
        // Install fixtures into the game's actual live render loop; simulation remains in planning.
        Object.assign(window.lumenworks.game, game); window.lumenworks.game.running = false;
        const renderer = window.lumenworks.renderer; renderer.resize(); renderer.fit(game.board, { left: 40, right: 320, top: 170, bottom: 175 });
        const snapshots = JSON.stringify([game.board, game.allocation]);
        const allocationSamples = [];
        for (let i = 0; i < 100; i++) { const start = performance.now(); allocate(game.board); if (i >= 10) allocationSamples.push(performance.now() - start); }
        const summary = values => { const sorted = [...values].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)], min: sorted[0], max: sorted.at(-1) }; };
        const durations = [], intervals = [], pulses = [], cacheStart = renderer.metrics.cacheBuilds, cityCacheStart = renderer.metrics.cityCacheBuilds || 0;
        const original = renderer.draw;
        let previous = 0, count = 0;
        const measurements = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => { renderer.draw = original; reject(new Error('Benchmark render loop timed out.')); }, 25000);
          renderer.draw = function (board, allocation, options) {
            try {
              const start = performance.now();
              original.call(this, board, allocation, { ...options, quality, reduced: quality === 'low' });
              const duration = performance.now() - start;
              if (count >= 15) { durations.push(duration); if (previous) intervals.push(start - previous); pulses.push(this.metrics.activePulses); }
              previous = start; count++;
              if (count >= frames + 15) {
                clearTimeout(timeout); renderer.draw = original;
                resolve({ drawMs: summary(durations), frameIntervalMs: summary(intervals), approximateFps: 1000 / summary(intervals).median, allocationMs: summary(allocationSamples), maxPulses: Math.max(...pulses), cacheBuilds: renderer.metrics.cacheBuilds - cacheStart, cityCacheBuilds: (renderer.metrics.cityCacheBuilds || 0) - cityCacheStart, actualDpr: renderer.metrics.dpr, nodes: board.nodes.length, edges: board.edges.length, powered: Object.values(allocation.served).filter(Boolean).length, screenshot: renderer.canvas.toDataURL('image/png') });
              }
            } catch (error) { clearTimeout(timeout); renderer.draw = original; reject(error); }
          };
        });
        if (JSON.stringify([game.board, game.allocation]) !== snapshots) throw new Error('Rendering mutated benchmark network state.');
        return measurements;
      }, { fixture, quality, frames });
      const screenshot = result.screenshot; delete result.screenshot;
      fs.writeFileSync(path.join(output, `performance-${fixture}-${quality}.png`), Buffer.from(screenshot.split(',')[1], 'base64'));
      await cdp.send('HeapProfiler.collectGarbage');
      const after = metricsMap(await cdp.send('Performance.getMetrics'));
      result.heapBytes = { before: before.JSHeapUsedSize, after: after.JSHeapUsedSize, delta: after.JSHeapUsedSize - before.JSHeapUsedSize };
      result.domNodes = { before: before.Nodes, after: after.Nodes };
      report.cases.push({ fixture, quality, reduced: quality === 'low', ...result });
      console.log(JSON.stringify(report.cases.at(-1)));
    }
    report.resources = await page.evaluate(() => ({ entries: performance.getEntriesByType('resource').map(e => ({ name: e.name, durationMs: e.duration, transferBytes: e.transferSize })), canvasCount: document.querySelectorAll('canvas').length, usedHeapBytes: performance.memory?.usedJSHeapSize || null }));
    assert.equal(errors.length, 0, `Console/page errors: ${JSON.stringify(errors)}`);
    assert.equal(failures.length, 0, `Failed requests: ${JSON.stringify(failures)}`);
    assert.equal(httpErrors.filter(e => !/\/favicon\.ico(?:\?|$)/.test(e.url)).length, 0, `Game HTTP errors: ${JSON.stringify(httpErrors)}`);
    for (const result of report.cases) { assert.equal(result.nodes, result.fixture === 'sandbox48' ? 48 : 14); assert.ok(result.drawMs.median < 16.67, 'Median draw time exceeded 60Hz frame budget.'); assert.equal(result.actualDpr, 1.5); if (result.reduced) assert.equal(result.maxPulses, 0); }
  } catch (error) { report.failure = error.stack || String(error); throw error; }
  finally { fs.writeFileSync(path.join(output, 'performance.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
