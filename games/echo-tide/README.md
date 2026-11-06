# ECHO TIDE · Forge Arcade

Atmospheric exploration with a tiny glowing vessel: sonar reveals a dark ocean but increases disturbance. Find three beacons and sail to the golden sanctuary. Rocks deflect you; awakened shadows threaten three hull points. Quiet water and activated beacons offer recovery. Victory reports sailing time, pulse count and peak disturbance. Failure explains the shadow encounter and offers immediate retry.

## Play and controls

Launch **Echo Tide** from Forge Arcade's Games or Featured collection, or open this folder's `index.html`. Keep `game.js`, `style.css` and `arcade.css` beside the HTML. Every runtime path is relative; no CDN, engine, image/audio files, build tools or backend are required.

- WASD / arrows: steer. Space: sonar. P / Escape: pause. R: restart. M / C: chart.
- On touchscreens: joystick + SONAR support simultaneous fingers. Top-right pause and chart controls remain available.
- Sound starts off. The music-note button enables optional procedural Web Audio tones and a quiet ambient bed after interaction.
- The **← FORGE ARCADE** link returns to the launcher from the opening screen, gameplay, pause, victory or failure. Browser back also follows native document history. Leaving discards the current run; there is no persistent save.
- Losing focus or switching tabs automatically pauses and clears held input.

A 6000 × 4800 deterministic ocean includes island chains, channels, four current regions, ruins, three unique beacons and three fixed shadow patrols. The nearest unlit beacon has an amber bearing; you can take any route. The chart remembers revealed terrain. All three lit beacons unlock the sanctuary. First-play target: 5–8 minutes; a fully charted automated route takes 208 simulated seconds. Human first-play timing has not been measured.

`CONFIG` at the top of `game.js` controls speed, pulse radius/expansion/persistence/cooldown, disturbance recovery, integrity invulnerability and shadow warning. Systems are separated into World, Simulation, Input, Renderer, AudioSystem, UI and Game. Simulation uses delta-time substeps, a single RAF loop, capped particles, viewport culling and capped DPR. Restart creates a fresh deterministic simulation without adding listeners or loops.

## Arcade integration

The root `echo-tide-register.js` adds this game to the existing registry and refreshes the existing counts/collections. `echo-tide-card.css` scopes procedural sonar artwork to this game's cards. The launcher navigates to `games/echo-tide/index.html`; no iframe or shared gameplay store is introduced. Game CSS stays inside its own document. `arcade.css` adds the return link and shifts this game's HUD to keep it clear on small screens.

The existing `node build.mjs` includes this folder and registration/artwork in `dist/`. GitHub Pages project paths work unchanged. The registration is before `game-summaries.js` so launcher summaries retain their existing behavior. No other game is modified.

For local testing from the repository root:

```sh
python3 -m http.server 8420
# Open http://localhost:8420
node --test --test-isolation=none tests/*.test.mjs
node build.mjs
```

With Playwright installed in your development environment and Chromium available:

```sh
ARCADE_TEST_URL=http://localhost:8420 node tests/echo-tide.browser.cjs
ECHO_URL=http://localhost:8420/games/echo-tide/index.html node tests/echo-tide-gameplay.browser.cjs
```

Both browser runners default to `/usr/bin/chromium`; set `CHROMIUM_PATH` to override. The full gameplay runner uses `?test` to explicitly enable the QA inspection surface; normal game launches do not expose it. Tests and Playwright are development-only and are excluded by the existing production build.

## Validation limits

Chromium automation covers the launcher, filters, native navigation, keyboard, simultaneous touch contacts, portrait/landscape, pause, complete beacon-to-sanctuary movement, collision/invulnerability, victory, failure and restart. Physical Android/iPhone, Safari/WebKit and Firefox remain untested. Performance and first-player duration on physical devices are not established. File/ZIP previews that disable JavaScript cannot execute the game; use a web browser with JavaScript enabled or the hosted Arcade page. This integration does not deploy automatically.
