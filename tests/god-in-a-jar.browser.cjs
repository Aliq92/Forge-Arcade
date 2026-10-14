const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const base = process.env.ARCADE_TEST_URL || "http://127.0.0.1:8420/";
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    badAssets = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().includes("god-in-a-jar"))
      badAssets.push({ url: r.url(), status: r.status() });
  });
  const home = await page.goto(base, { waitUntil: "domcontentloaded" });
  assert.equal(home.status(), 200);
  await page.waitForSelector('#grid [data-game="god-in-a-jar"]');
  assert.equal(
    await page.locator('#featured-grid [data-game="god-in-a-jar"]').count(),
    1,
  );
  await page.locator('[data-cat="Simulations"]').click();
  const card = page.locator('#grid [data-game="god-in-a-jar"]');
  assert.equal(await card.count(), 1);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/workspace/god-in-a-jar/artifacts/forge-catalog.png",
  });
  await card.click();
  await page.waitForFunction(() => window.jar?.world.agents.length === 6);
  assert.ok(page.url().endsWith("/games/god-in-a-jar/index.html"));
  assert.equal(
    await page.locator("#forge-back-link").getAttribute("href"),
    "../../index.html",
  );
  await page.locator('[data-speed="20"]').click();
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => jar.world.tick > 50));
  await page.locator('[data-power="LIGHT"]').click();
  const spot = await page.evaluate(() => {
    const a = jar.world.agents[0],
      p = jar.renderer.worldToScreen(a),
      r = document.querySelector("canvas").getBoundingClientRect();
    return { x: p.x + r.left, y: p.y + r.top };
  });
  await page.mouse.click(spot.x, spot.y);
  assert.ok(
    await page.evaluate(() =>
      jar.world.effects.some((e) => e.kind === "LIGHT"),
    ),
  );
  await page.locator("#experiment").click();
  await page.locator('[data-action="confetti"]').click();
  await page.waitForTimeout(700);
  const p = await page.evaluate(() => {
    const p = jar.renderer.worldToScreen({ x: 430, y: 230 }),
      r = document.querySelector("canvas").getBoundingClientRect();
    return { x: p.x + r.left, y: p.y + r.top };
  });
  await page.mouse.click(p.x, p.y);
  assert.equal(await page.evaluate(() => jar.world.artifacts.length), 1);
  await page.locator('[data-speed="0"]').click();
  await page.evaluate(() => jar.save());
  const saved = await page.evaluate(() => ({
    seed: jar.world.seed,
    tick: jar.world.tick,
  }));
  await page.locator("#journal").click();
  assert.ok(await page.locator("#panel").isVisible());
  await page.locator('[data-action="close"]').click();
  await page.screenshot({
    path: "/workspace/god-in-a-jar/artifacts/forge-game.png",
  });
  await page.locator("#forge-back-link").click();
  await page.waitForSelector('#grid [data-game="god-in-a-jar"]');
  await page.locator('#grid [data-game="god-in-a-jar"]').click();
  await page.waitForFunction(() => window.jar);
  assert.equal(await page.evaluate(() => jar.world.seed), saved.seed);
  assert.ok(await page.evaluate((t) => jar.world.tick >= t, saved.tick));
  assert.equal(await page.evaluate(() => jar.world.artifacts.length), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const back = await page.locator("#forge-back-link").boundingBox(),
    zoom = await page.locator(".zoom").boundingBox(),
    hint = await page.locator("#hint").boundingBox();
  assert.ok(back.x >= 0 && back.x + back.width <= 390);
  assert.ok(back.height >= 44);
  assert.ok(back.x + back.width < zoom.x);
  assert.ok(back.y + back.height < hint.y);
  await page.screenshot({
    path: "/workspace/god-in-a-jar/artifacts/forge-game-mobile.png",
  });
  await page.locator("#forge-back-link").click();
  await page.waitForSelector('#grid [data-game="god-in-a-jar"]');
  assert.deepEqual(errors, []);
  assert.deepEqual(badAssets, []);
  const report = {
    passed: true,
    base,
    checks: [
      "featured registration",
      "Simulations filter",
      "native launch",
      "relative runtime assets",
      "time progression",
      "Light response",
      "confetti",
      "journal",
      "return link",
      "same-origin save retained across return/relaunch",
      "mobile return/zoom/hint separation",
      "mobile return navigation",
    ],
    errors,
    badAssets,
  };
  fs.writeFileSync(
    "/workspace/god-in-a-jar/artifacts/forge-live-browser-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
