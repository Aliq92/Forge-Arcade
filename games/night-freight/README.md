# NIGHT FREIGHT

A finished, standalone magnetic-crane browser game for Forge Arcade. Carry steel from North Quay to the gently rocking Nightjar, settle all five pieces, and dispatch the shipment. No timer, remote assets, services, accounts or keys.

## Play

From the Forge Arcade repository root, build and serve the integrated Arcade:

```sh
node build.mjs
python3 -m http.server 8080 --directory dist
```

Open **http://localhost:8080**, select NIGHT FREIGHT in Games or Featured, and use the header’s Arcade link to return. The game ships at `games/night-freight/index.html` within the production build. All runtime dependencies, including Matter.js 0.20.0 and its license, are bundled locally. Players need no package install.

The source game page also works when the repository root is served directly. For an isolated developer preview, run `npm run build` followed by `npm start` from `games/night-freight/`; this creates and serves a nested `dist/` that is not committed. Its Arcade return link is intended for the integrated repository route.

## Controls and rules

- **A / D** or **Left / Right**: trolley travel.
- **W / S** or **Up / Down**: raise / lower the cable.
- **Space** or **Magnet**: arm / release the electromagnet.
- **Escape / P** or **Pause**: pause; use Resume to continue.
- Touch: hold the large travel and cable buttons, independently or together. Tap Magnet separately. Pointer cancellation releases held controls.

The dotted ring shows magnetic reach. A highlighted lift eye means a piece is within range. Arming without a nearby piece leaves the magnet seeking. An icon and text show released, seeking or attached state. Lift clear of the quay before travelling, let the swing fade, then lower close to the deck before releasing.

**Shipment mode:** three handcrafted shipments, five pieces each. Broad crates progress to tall machinery, then offset centres of mass indicated by cream diagonal marks. Use the whole deck or stack. Physical deck support, at least 75% of each piece's width over the deck, and low linear / angular velocity must hold for three continuous seconds. Dispatch then becomes available. There is no countdown. Cargo lost in the water ends the attempt; Retry and Restart restore exactly the same arrangement.

**Scoring:** 160 points per retained piece (800 for the required five), plus up to 200 for proximity to the five marked deck bays. Best scores are stored separately for each shipment.

**Free Lift:** renewable cargo, optional gentle rocking, no score or completion gate, reset anytime. At the 20-cargo cap, the harbour crew collects an older settled load to keep the supply renewable. Lost cargo does not end practice. Particle count is capped at 100.

**Sound:** synthesized lift, release, landing and departure tones. Muted on initial load. A saved sound preference is restored only after Start / Resume interaction. Best scores, sound and Free Lift rocking preferences use `forge-arcade:night-freight:v1` in localStorage. Read/write failures are tolerated.

## Source and build

- `src/simulation.js`: Matter.js world, 120 Hz stepping, rope and magnetic constraints, support graph, progression and scoring.
- `src/render.js`: procedural Canvas harbour, cargo and feedback; portrait camera and overview.
- `src/app.js`: DOM HUD, input, lifecycle, menus, preferences and synthesized audio.
- `style.css`, `index.html`: responsive shell and controls.
- `vendor/`: local Matter.js distribution and MIT license.
- `scripts/build.cjs`: creates the standalone `dist/` by copying the runtime files.
- `tests/qa.cjs`: browser acceptance suite with a control-driven crane pilot.
- `evidence/`: screenshots, structured results and test output.

The simulation always uses the same 1200 × 760 world. Portrait uses a 760-unit camera window that follows the trolley; the overview strip shows both ends of the harbour. Resizing changes only presentation. Physics advances at fixed 1/120-second steps with limited frame accumulation, high constraint/contact iterations and velocity caps. The barge rocks by at most 0.43°. The magnet has one cargo constraint at a time. Hidden tabs pause and clear inputs; resuming resets timing, avoiding catch-up.

To rebuild or run developer checks:

```sh
npm ci
npm run check
npm run build
npm test
```

Tests require an installed Chromium executable (`/usr/bin/chromium` by default). Override with `CHROMIUM_PATH=/path/to/chromium npm test`. The suite starts its own temporary local static server. `QA_BASE=http://localhost:8080 npm test` uses an existing server instead. Playwright is a development dependency only.

`?test=1` disables automatic time advancement and exposes a small fixed-step inspection harness. Acceptance playthroughs send the same keyboard / button input used during play; they do not reposition bodies, inject successful states, or bypass the stability gate. Normal play has no test global.

## Verification and limits

The acceptance suite plays through and dispatches **all three shipments**, then checks a two-piece stack, deliberate water loss and retry, exact restart arrangement, resizing with attached cargo, button holds and cancellation, pause / hidden lifecycle, Free Lift replenishment and rocking preference, persistent scores, sound interaction gating, storage denial, zero external runtime requests and browser exceptions. Desktop and portrait screenshots were reviewed for visual clarity and obstruction. See `evidence/qa-results.json` and `evidence/qa-run.log` for the actual run and scores.

Coverage is headless Chromium, including Chromium touch-event emulation and a real-time animation/input smoke pass. The full shipment pilot advances controlled fixed steps to keep tests repeatable. Visibility transitions are explicitly simulated. Physical phones, Safari / Firefox, hardware audio output and exhaustive performance testing remain unverified. The physics is deliberately forgiving arcade handling: a sensor magnet, capped speeds, and a prescribed gently rocking barge, rather than a fluid or ship-buoyancy simulation.
