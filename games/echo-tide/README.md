# ECHO TIDE · Forge Arcade

Atmospheric exploration with a tiny glowing vessel: sonar reveals a dark ocean but increases disturbance. Find three beacons and sail to the golden sanctuary. The Deepwater Surge update adds a 0.6-second burst in the vessel's facing direction, a 4-second recharge, optional narrow channels, readable currents, echo interference, warned siltfalls and local shadow pursuit. Burst adds disturbance; quiet water and activated beacons offer recovery. Rocks deflect you; awakened shadows threaten three hull points. Victory retains sailing time, pulse count and peak disturbance, with additional optional run accomplishments. Failure offers immediate retry.

## Play and controls

Launch **Echo Tide** from Forge Arcade's Games or Featured collection, or open this folder's `index.html`. Keep `game.js`, `style.css`, `surge.css` and `arcade.css` beside it. Every runtime path is relative; no CDN, engine, image/audio files, build tools or backend are required. See INTEGRATION.md for the authorized Arcade integration and VERIFICATION.md for the standalone test history.

- WASD / arrows: steer. Space: sonar. Shift / B: burst. P / Escape: pause. R: restart. M / C: chart.
- On touchscreens: joystick + SONAR + BURST support simultaneous fingers. Top-right pause and chart controls remain available. Pause also contains a reduced-motion option, initialized from the system preference.
- Sound starts off. The music-note button enables optional procedural Web Audio tones and a quiet ambient bed after interaction.
- The **← FORGE ARCADE** link returns to the launcher from the opening screen, gameplay, pause, victory or failure. Browser back also follows native document history. Leaving discards the current run; there is no persistent save.
- Losing focus or switching tabs automatically pauses and clears held input.

A 6000 × 4800 deterministic ocean includes island chains, optional narrow channels, four current regions, two echo-shadow regions, two warned siltfalls, ruins, three unique beacons and three shadow patrols. The nearest unlit beacon has an amber bearing; you can take any route. The chart remembers revealed terrain, current directions and echo shadows. All three lit beacons unlock the sanctuary. Charted automated routes take about206 seconds without burst or173 seconds with it; human first-play timing and balance are not established.

`CONFIG` at the top of `game.js` controls speed, burst, pulse behavior, disturbance recovery, integrity invulnerability and shadow warning. Systems remain separated into World, Simulation, Input, Renderer, AudioSystem, UI and Game. Simulation uses bounded 1/120-second steps and a static terrain index. One RAF loop,180-particle cap, viewport culling, cached sea gradient and1.5 DPR cap keep work bounded. Restart creates a fresh deterministic simulation without adding listeners or loops.

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
