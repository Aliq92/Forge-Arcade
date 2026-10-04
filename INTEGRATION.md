# Forge Beast inside Forge Arcade

Forge Arcade stays a static HTML/CSS/JavaScript app. Forge Beast V0.5.1 is registered through `forge-beast-register.js`, like the other game registrations. It opens `games/forge-beast/index.html` through normal document navigation. No SPA, new router or global gameplay store was added. The launcher and existing games retain their designs.

## Ownership and integration contract

Arcade owns the registry, native route, game viewport, back link, pause button, loading/error messages and exit navigation. Beast owns all pet state, gameplay, audio, haptics, internal navigation, save validation and migration. All imported V0.5.1 source files under `games/forge-beast/src/` are unchanged.

The game page dynamically imports `games/forge-beast/module/forge-beast.js`. The launcher imports only the UI-free `module/launcher.js` and its shared validation/data chunk; it does not download the game UI, CSS, audio or timers. Optional registry `loadSummary()` functions are handled by the generic `game-summaries.js`, including filtered cards and browser-back restoration. Summary errors leave the launcher usable.

```js
import { ArcadeGameHost } from './game-host.mjs';
import { createBeastStorage, SAVE_KEY } from './games/forge-beast/storage.mjs';

const host = new ArcadeGameHost({
  container: document.getElementById('game-viewport'),
  load: () => import('./games/forge-beast/module/forge-beast.js'),
  options: { storage: createBeastStorage(), saveKey: SAVE_KEY, debug: false },
  onExit: () => { window.location.href = './index.html'; },
  onError: (error, fatal) => console.error(error, { fatal }),
});
await host.open(); // createForgeBeast({ mode: 'embedded', ... }), mount(container)
host.pause();
host.resume();
host.save(); // boolean
host.getStateSummary(); // qualitative launcher data, or null after close
host.exit(); // save + destroy + host-owned onExit
// Alternatively, on pagehide:
host.close(); // idempotent, saves and destroys, does not navigate
```

`open()` is idempotent while mounted; a closed host is terminal. Create a new host for another session. A delayed import cannot mount after close. `close()` releases the game, container, loader, options and its visibility listener. The module's `destroy()` cleans up its timers, resize observer, handlers, DOM and audio. Back/Android browser navigation uses the existing document history; an explicit Arcade link also works for direct game links and initialization failures. A restored back-forward-cache page creates a fresh host on `pageshow`.

Beast events are `{ type, payload }`. The adapter handles `exit-requested` and `error`; `options.onEvent` can observe every forwarded event. No event imports Arcade code into Beast. Pause/resume respect both explicit player pause and document visibility. Debug is explicitly false in the production host; `?debug=1` cannot enable it.

## Saves and time

There is no existing shared Arcade game-storage abstraction, so the adapter retains localStorage and the existing `forge-arcade:forge-beast:v1` key. Its backup keys stay in that namespace. Reset never calls `localStorage.clear()` or changes another game's save. Existing V0.1–V0.5 compatible saves migrate through unchanged Beast persistence; app version 0.5.1 and save schema 2 remain separate. Malformed/future saves are protected, with visible recovery information. There is no backend or cloud migration.

V0.5.1 uses **active-play time**, including expeditions. While hidden, paused or closed, care decay, age and expedition progress stop. Reopening preserves the remaining active duration and original departure timestamp. It does not simulate wall-clock/offline progression. Rewards and logs resolve once when the remaining active time completes.

Battles restore their already-resolved HP, stamina, turn and result. Old transient animation beats are cleared. Exiting never automatically attacks, applies another injury or grants another reward. Victory history and inventory rewards remain exactly-once across reopening.

localStorage is origin-bound: same-origin standalone Beast progress loads through the retained key; saves on a different standalone/domain or the original GitHub Pages origin cannot be read automatically by a different hosting origin. No cross-origin save transfer is introduced.

## Metadata and summary

The UI-free launcher export exposes `FORGE_BEAST_METADATA`: `id: 'forge-beast'`, `title: 'Forge Beast'`, `version: '0.5.1'`, `category: 'virtual-pet'`, `orientation: 'portrait'`, `supportsPause: true`, `supportsPersistentSave: true`, `minimumViewport: { width: 280, height: 480 }`, `preferredAspectRatio: '320 / 568'`, and a short description. Arcade maps its launcher category to the existing `Games` filter; all capability fields remain available in the registry's metadata.

`readForgeBeastSummary({ storage, saveKey })` needs no mounted UI. `readLauncherStatus()` formats it into `Pipkin — Baby · Content · Awake`, plus a subtle `Needs care` label when appropriate. Summary fields include `gameId`, `displayName`, `hasSave`, `creatureName`, `species`, `lifeStage`, qualitative hunger/mood/energy/health, sleeping/attention flags, active expedition/battle/pending encounter and `lastPlayedAt`. Hidden personality formulas, numeric stats, inventory and histories are not exposed.

## Layout, audio and hosting

The native game page uses the existing Arcade theme stylesheet and a small page-scoped `host.css`. Beast's original scoped stylesheet and embedded ResizeObserver handle the device. Neither standalone `src/host.css` nor a second global reset is imported. Portrait controls retain 44px touch targets at 320×568, 360×640, 375×667 and 412×915. Landscape fits without overflow; very short landscape panels yield smaller controls, so portrait is preferred. Haptics remain opt-in. Audio initializes only on a device interaction, respects saved mute and closes on exit.

Serve the repository with its existing static-server convention:

```sh
python3 -m http.server 8420
```

Committed `module/` bundles let GitHub Pages and other static hosts serve the game without a runtime toolchain. To update Beast sources, use its existing npm/TypeScript/Vite tooling:

```sh
cd games/forge-beast
npm ci
npm run build
npm test
# In another terminal, serve the Arcade repository on port 8420.
npx playwright install chromium
npm run test:browser
cd ../..
node --test --test-isolation=none tests/*.test.mjs
node build.mjs
```

`node build.mjs` copies the static Arcade and runtime assets into `dist/`; it excludes Beast's development sources, tests and build configuration. No new Arcade framework or package manager is required. The integration browser suite can target a different server with `ARCADE_TEST_URL`.

## Verification and changed files

Production builds pass for Beast and the static Arcade. Verification: 101 Beast simulation tests, 40 Arcade tests (32 original plus 8 new), 8 integration browser tests, 29 original standalone Beast browser tests, and the existing Wildfire canvas-centering assertions. The real-host browser audit performs 12 mount/pause/resume/close cycles: one interval and observer per mount, zero tracked timers/listeners/observers/device nodes after close, and one closed audio context per used session. Adapter tests also perform 20 open/close cycles. Expedition, battle and reset tests exercise the actual native launcher/game pages.

Arcade modified: `.gitignore`, `index.html`, `app.js`, `tests/apogee-integration.test.mjs`, `tests/comet-shepherd-burst.test.mjs`, `tests/echo-miner-integration.test.mjs`. The two existing test fixtures were updated for already-existing Apogee script splitting and Comet input APIs; their gameplay was not changed. The Echo Miner assertion follows the newly cache-busted launcher script, so existing cached launchers also receive the summary slot.

Arcade added: `forge-beast-register.js`, `game-host.mjs`, `game-summaries.js`, `build.mjs`, `tests/forge-beast-integration.test.mjs`, this document.

Beast added under `games/forge-beast/`: unchanged `src/` module; copied 101-test suite (only import paths adjusted); `index.html`, `host.mjs`, `host.css`, `storage.mjs`, `summary.mjs`, `build.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`, `playwright.config.ts`, `tests/integration.browser.spec.ts`, and compiled `module/{forge-beast.js,forge-beast.css,launcher.js,shared-*.js}`. No original Beast gameplay files were modified or removed.

Remaining limits: same-origin local saves only; active-time expeditions; portrait-first touch sizing; CSS namespace isolation rather than Shadow DOM. Actual Android hardware audio/haptics and OS app-switching require device verification; browser automation covers mobile viewports, document visibility and browser back.
