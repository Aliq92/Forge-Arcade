# Neon Drift: Courier — driving and neon upgrade

This remains the existing standalone Canvas/JavaScript game registered by
`neon-drift-courier-register.js`. Forge Arcade still launches its native document
at `games/neon-drift-courier/index.html`; the Arcade link returns to
`../../index.html`.

## Play

Collect three rotating data packets, then steer through the pink delivery gate.
The objective names its lane and gives an approximate approach time. Deliveries
award 50 data plus up to 20 for a quick approach, multiplied by the existing combo.
Missing a gate retains cargo and offers another approach. Drones, blockades,
shields, graze rewards, combos and timed sector progression remain active.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | Left/right arrows or A/D | Left/right pad or hold either screen side |
| Boost | Up arrow, W or Space | Hold BOOST |
| Brake | Down arrow or S | Hold BRAKE |
| Drift | Shift while steering | Hold DRIFT with a steering pad |
| Pause/resume | P or Escape | PAUSE/RESUME |
| Restart | R while paused | Restart run in the pause menu |
| Sound | M | SOUND ON/OFF |

Boost changes target road speed, with smooth acceleration. It does not multiply
steering, scoring time or sector time. Braking takes priority over boost. Drift
reduces lateral grip and raises the steering speed limit; releasing steering
while drifting produces a longer slide. Normal grip quickly regains control.
Steering velocity and travel use an exponential relaxation/integration so they
agree at 30, 60 and 120 Hz.

Each touch pointer owns its held control. Pointer cancellation, lost capture,
blur, hidden tabs, pause and restart release input. Resizing retains relative
horizontal positions for the ship and world objects. Controls are at least 44px
and use safe-area insets; portrait offers the most room to anticipate hazards.

The cyan/magenta interceptor and its 30×50 collision body remain intact. Twin
thrust cones, drift trails and road reflectors add speed feedback. Stars are
capped at 140 (30 with reduced motion), particle history at 500, and canvas pixel
density at 2. Reduced motion disables shake, lowers trail frequency and removes
boost scaling. No new runtime dependencies or assets are needed.

## Persistence

The existing origin-local `ndc_best` key is retained. Best score also saves when
restarting or leaving the page. `ndc_muted` stores sound preference. Other games'
saves are never cleared. Storage failures leave the game playable. There is no
shared Arcade score adapter or backend save migration.

## Validation

From the repository root:

```sh
node --test --test-isolation=none tests/*.test.mjs
node --test games/wildfire-simulator/tests/canvas-centering.test.js
node build.mjs
python3 -m http.server 8420
```

The root suite passes 50 tests, including ten new gameplay tests. The legacy
exact-file checksum assertion was replaced by identity/integration assertions
because this upgrade intentionally changes that previously supplied build.

Browser playtests reuse Playwright from the environment or the existing Forge
Beast development dependencies; they add no root package/toolchain:

```sh
# If Playwright is not already available: install the existing Beast dev tools.
(cd games/forge-beast && npm ci && npx playwright install chromium)
NODE_PATH="$PWD/games/forge-beast/node_modules" node games/neon-drift-courier/tests/playtest.cjs
```

`CHROMIUM_PATH` optionally selects a system browser. `ARCADE_TEST_URL` optionally
selects a different static server. Screenshots/results go to `tests/artifacts/`
inside this game and are excluded by the static production build.

Chromium checks pass at 320×568, 360×640, 412×915 (reduced motion), 640×360 and
1280×800: launcher entry, simultaneous touch steering/drift, individual release
and cancellation, keyboard boost/brake, focus-loss pause, delivery, pause/resume,
restart, obstacle death, game-over restart, orientation change, Arcade return,
best-score/sound persistence and unrelated-save isolation. Pickups and gates use
controlled fixtures through the real collision/mission loop. Screenshots were
reviewed for mobile HUD/menu/control readability. No browser JavaScript errors.

Physical Android touch latency, audio output and sustained device frame rate
still require hardware testing. Browser emulation does not establish those.
