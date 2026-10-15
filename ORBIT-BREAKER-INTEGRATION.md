# Orbit Breaker integration

Orbit Breaker v1.0 is added through the existing static registry and native page navigation. `orbit-breaker-register.js` registers a featured **Games** entry with **Arcade** metadata, the approved description and Gravity / One-Touch / Physics Arcade tags. The launcher imports its registration and isolated SVG card stylesheet once. No launcher logic, category system, existing registration, hidden shortcut, or other game is changed.

`games/orbit-breaker/index.html` uses relative runtime assets and a native `../../index.html` return link. The runtime physics, game state, chamber data, rendering/input/audio script and stylesheet are identical to the completed standalone v1.0 sources. `arcade.css` only scopes return-link presentation. Saves retain `orbitBreaker_save`; nothing clears or migrates another game's data.

## Validation

- **88 / 88 Arcade tests pass** (`node --test tests/*.test.mjs`), including four new integration tests.
- **33 / 33 Orbit Breaker tests pass** (`node --test games/orbit-breaker/tests/*.test.cjs`), including gravity stress, five-ball Chaos, cancellation/pause/storage and all twelve gravity-only chamber solutions.
- **Static production build passes** (`node build.mjs`), including the new registration, artwork and native game assets.
- Browser verified Games filtering, Featured filtering, native launch, gameplay scoring, pause, and return to the launcher. Existing Arcade summary modules load through its standard Python HTTP server.
- Browser viewports cover desktop and mobile; physical touch hardware and independently recorded audio remain unverified.

The repository's Outpost Orbit byte-hash tests expect Git's LF blob bytes. Windows Git initially checked these unchanged files out with CRLF and the baseline suite failed. Restoring the four files from their exact committed blob bytes made the suite pass; **none of those files are part of this change**.

Local preview: `python -m http.server 8420` from the repository root. Open `http://127.0.0.1:8420/index.html`. GitHub Pages serves the same relative native paths after the integration is merged and deployed.
