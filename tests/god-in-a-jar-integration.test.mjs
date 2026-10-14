import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import vm from "node:vm";
const root = new URL("../", import.meta.url),
  read = (p) => readFile(new URL(p, root), "utf8");
test("God in a Jar registers exactly one featured simulation and preserves the existing catalog", async () => {
  const old = { id: "existing", featured: true },
    GAMES = [old];
  let renders = 0,
    filter = null;
  const ctx = {
    GAMES,
    heroStatus: {},
    footerCount: {},
    renderFeaturedCollection() {
      renders++;
    },
    render(f) {
      filter = f;
    },
  };
  vm.runInNewContext(await read("god-in-a-jar-register.js"), ctx);
  assert.equal(GAMES.length, 2);
  assert.equal(GAMES[0], old);
  assert.equal(GAMES[1].id, "god-in-a-jar");
  assert.equal(GAMES[1].title, "God in a Jar");
  assert.equal(GAMES[1].category, "Simulations");
  assert.equal(GAMES[1].featured, true);
  assert.equal(GAMES[1].artId, "god-in-a-jar");
  assert.equal(renders, 1);
  assert.equal(filter, "All");
  assert.equal(ctx.footerCount.textContent, "2");
  assert.match(ctx.heroStatus.textContent, /2 playable/);
});
test("launcher excludes retired simulations and keeps archived jar artwork scoped", async () => {
  const html = await read("index.html");
  assert.doesNotMatch(html, /(?:wildform|god-in-a-jar)-(?:register\.js|card\.css)/);
  const css = await read("god-in-a-jar-card.css");
  assert.match(css, /\.art-custom-god-in-a-jar/);
  assert.doesNotMatch(css, /(^|\n)(body|html|:root|button)\s*\{/);
  assert.match(await read("god-in-a-jar-card.svg"), /<svg/);
});
test("native game has relative runtime assets, its original save namespace, and an accessible return link", async () => {
  const html = await read("games/god-in-a-jar/index.html");
  assert.equal((html.match(/id="forge-back-link"/g) || []).length, 1);
  assert.match(html, /href="\.\.\/\.\.\/index.html"/);
  assert.match(html, /href="arcade.css"/);
  assert.match(html, /type="module" src="js\/main.js"/);
  assert.doesNotMatch(html, /localhost|\/workspace|<iframe/);
  for (const [, href] of html.matchAll(
    /(?:href|src)="([^"#]+\.(?:js|css|svg))"/g,
  ))
    await access(new URL("games/god-in-a-jar/" + href, root));
  assert.match(
    await read("games/god-in-a-jar/js/persistence.js"),
    /godInAJar_save_v1/,
  );
  assert.doesNotMatch(
    await read("games/god-in-a-jar/js/persistence.js"),
    /localStorage.clear/,
  );
});
test("integrated game still develops autonomous settlements and deterministic saves", async () => {
  const sim = await import("../games/god-in-a-jar/js/world.js");
  const persist = await import("../games/god-in-a-jar/js/persistence.js");
  const a = sim.createWorld("arcade"),
    b = sim.createWorld("arcade");
  assert.deepEqual(a, b);
  assert.equal(a.agents.length, 6);
  for (let n = 0; n < 4000; n++) sim.step(a);
  assert.ok(a.groups.length);
  assert.ok(a.structures.some((s) => s.progress === 1));
  const restored = persist.decode(persist.encode(a)).world;
  for (let n = 0; n < 100; n++) {
    sim.step(a);
    sim.step(restored);
  }
  assert.deepEqual(restored, JSON.parse(JSON.stringify(a)));
});
