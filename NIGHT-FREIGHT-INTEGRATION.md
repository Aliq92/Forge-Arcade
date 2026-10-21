# NIGHT FREIGHT inside Forge Arcade

NIGHT FREIGHT uses the existing static launcher and native game-document navigation. `night-freight-register.js` adds one Games / Featured entry; `night-freight-card.css` and its procedural SVG apply only to its cards. Existing catalog entries, spotlight, filters and storage namespaces remain unchanged.

The game lives at `games/night-freight/index.html`. Its header contains a 44px-high native `../../index.html` Arcade return link. There is no iframe, new framework, router or global gameplay store. Matter.js 0.20.0 and its MIT license ship locally. The launcher never loads Matter.js or starts the game's animation loop. Gameplay source is the standalone implementation; integration changes only the native return link, page metadata and header layout.

The game retains three handcrafted shipments, Free Lift, fixed 120 Hz physics, physical magnetic constraints, cargo stacking, gentle barge rocking, loss / same-layout retry, three-second stability check and player Dispatch. The viewport changes only rendering; portrait follows the trolley with an overview strip. Pause clears controls, hidden tabs pause without catch-up, and audio starts muted until interaction. Namespaced best scores and sound / rocking preferences remain `forge-arcade:night-freight:v1`; another game's save is never cleared. localStorage remains origin-bound; standalone progress on another origin is not automatically transferred.

## Build and check

```sh
node --test --test-isolation=none tests/*.test.mjs
node build.mjs
python3 -m http.server 8420
# With Playwright available in the local Node dependency path:
node tests/night-freight.browser.cjs
```

`build.mjs` includes the game's HTML, CSS, source JS, bundled Matter.js and license, while excluding developer scripts, tests, package metadata, evidence and nested build output. Runtime files retain relative paths under `dist/games/night-freight/`.

The full control-driven gameplay suite also lives at `games/night-freight/tests/qa.cjs`. To run it against the production Arcade build, install its development dependencies and set the nested game URL:

```sh
cd games/night-freight
npm ci
QA_BASE=http://127.0.0.1:8420/dist/games/night-freight npm test
```

The tests use installed Chromium (`CHROMIUM_PATH`, default `/usr/bin/chromium`). The `?test=1` harness advances the real fixed-step physics through keyboard / button inputs, without teleporting cargo or injecting completion. Normal gameplay uses requestAnimationFrame and exposes no test global.

## Actual verification

- All 90 pre-existing repository tests and four new NIGHT FREIGHT integration tests passed (94 total).
- The Arcade browser pass verified all five catalog filters, single archive / featured entries, preserved spotlight and catalog counts, artwork, native launch, real-time keyboard movement, magnet, pause / resume, explicit return, browser back, unrelated-save preservation, 390px portrait layout and 44px return target. It also launched and returned through the built `dist/` paths, checked runtime asset responses and confirmed developer files were excluded. No browser exceptions or failed runtime asset requests occurred.
- All 36 gameplay acceptance checks passed against the **built nested Arcade game URL**, including physical pickup / release for all 15 pieces, all three shipments completed and dispatched, two-piece stacking, water loss / retry, restart, attachment-preserving resize, pointer / two-finger touch hold and cancellation, hidden-tab handling, Free Lift supply, persistent preferences, storage denial and zero external game-runtime requests. Shipment scores: **977, 981, 936**.
- The game card, desktop game and portrait game screenshots were visually reviewed.

Coverage is headless Chromium, with actual Chromium touch events, controlled-step shipment playthroughs, a real-time input smoke pass and simulated visibility events. Physical phones, Safari / Firefox and hardware audio remain unverified. This integration does not change the separately hosted AppDeploy copy of the hub or deploy to a new service.
