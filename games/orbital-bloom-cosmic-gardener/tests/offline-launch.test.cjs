const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const browserErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('requestfailed', (request) => {
      browserErrors.push(`${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`);
    });

    const indexPath = path.resolve(__dirname, '..', 'index.html');
    await page.goto(pathToFileURL(indexPath).href, { waitUntil: 'load' });
    await page.locator('#btn-enter-sandbox').click();
    await page.waitForTimeout(300);

    const sandboxIsHidden = await page.locator('#sandbox-screen').evaluate(
      (element) => element.classList.contains('hidden'),
    );

    assert.equal(
      sandboxIsHidden,
      false,
      `Double-click launch did not enter the sandbox. Browser errors:\n${browserErrors.join('\n')}`,
    );
    assert.deepEqual(browserErrors, [], 'The offline page produced browser errors.');
  } finally {
    await browser.close();
  }
}

run().then(
  () => console.log('PASS: index.html runs directly from file:/// and Enter Sandbox works.'),
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
