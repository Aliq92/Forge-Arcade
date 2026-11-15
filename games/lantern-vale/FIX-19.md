# Fix #19 — The Everlasting Flare

Implemented on `fix/19-lantern-vale-everlasting-flare`. No deployment or remote push performed.

## Root cause

The actual game is `games/lantern-vale/`. `Lantern.tryFlare()` required and consumed 22 lantern energy in addition to a 9-second cooldown. Normal lantern light also drains 2.6 energy per second. Starting at 100 energy, two activations plus 18 seconds of normal drain leave approximately 9.2 energy before a third attempt. Waiting alone cannot restore energy; fireflies, reeds or shrines were required. There was no hard two-use limit or saved flare ammunition.

## Behavior and scope

- Flare uses explicit `READY → ACTIVE → COOLDOWN → READY` states, without charges, energy costs or pickup requirements. The statistical use counter remains informational.
- Preserve the 0.55-second effect, 260-unit base radius, existing expanding ring, illumination, plant/path discovery, shadow knockback/stun, sound call and camera shake behavior.
- A 5-second cooldown starts when the effect ends: 5.55 seconds between base activations. Existing Bright Flare and Quick Spark upgrades still work; Quick Spark reduces the cooldown by 20% per upgrade.
- Advance flare timing with elapsed frame time from the existing monotonic `performance.now()` loop, only during gameplay. Keep the existing physics timestep clamp and ordinary energy drain unchanged. Carry excess elapsed time across state boundaries, including slow frames.
- Pause, upgrades, victory, game over and title screens freeze flare timing. Restart/retry/new game create a fresh ready lantern and clear pending inputs. There are no new timer callbacks, listeners or particle emitters.
- Space and the existing touch button remain the controls. Explicitly ignore repeated Space keydowns, including after pause has cleared the held-key set. Existing touch compatibility-click suppression remains intact.
- HUD and touch button display `FLARE READY`, `FLARE ACTIVE`, or a decimal countdown such as `FLARE — 3.4s`. Both show recovery progress. The touch target and position stay the same. Readiness has a static glow; no new motion or sound was added.
- Lantern energy remains a separate survival resource: ordinary light, low-energy warnings, damage, fireflies and reeds retain their roles.

## Updated files

- `js/lantern.js`: state machine and removal of flare energy dependency.
- `js/game.js`: elapsed gameplay time for flare, retaining the physics clamp.
- `js/input.js`: held-Space repeat guard.
- `js/ui.js`, `index.html`, `styles.css`: readiness/countdown, button progress and instructions.
- `../../tests/lantern-vale-flare.test.mjs`: new ability, timing, interaction, lifecycle and save regression tests.
- `../../tests/lantern-vale-input.test.mjs`: updated HUD expectations and keyboard repeat coverage.
- `../../tests/lantern-vale.browser.cjs`: expanded desktop/mobile complete-journey regression.

No changes to the launcher, other games, assets, navigation, filters or deployment configuration.

## Save compatibility

`js/storage.js` saves settings (`lv_settings`), best/cumulative progress (`lv_progress`) and achievements (`lv_achievements`). It does not save or restore a live journey, lantern energy or flare timers. No schema migration, save version bump or deletion is needed. Tests seed obsolete zero-energy/zero-charge fields and confirm they cannot gate the new flare; unrelated records survive round trips.

## Executed verification

Baseline: existing root test files passed, and the original desktop/mobile browser regression passed. New flare tests failed against the original implementation, including activation at zero energy. The held-Space-after-reset regression also failed before its guard was added.

Final root suite:

```sh
node --test --test-isolation=none tests/*.test.mjs
```

**182 passed, 0 failed, 0 skipped** across 32 root test files, including 29 Lantern Vale tests. Coverage includes start/first/second/third/ten activations; active/cooldown input rejection; automatic completion; 10–144 FPS timing; pause/resume; restart/new game; illumination/radius upgrades; shadow and environmental interactions; mobile pointer/assistive input; desktop/held keys; obsolete depleted save fields; rapid input; game over/title; and prevention of repeated effects.

Browser regression (local static server, Playwright and system Chromium):

```sh
python3 -m http.server 8431 --bind 127.0.0.1
CHROMIUM_PATH=/usr/bin/chromium node tests/lantern-vale.browser.cjs
```

**Desktop 1280×800 and touch 375×667 both passed.** Each scripted complete journey exercised movement, settings persistence, reed use, all five shrine interactions/upgrades, ten additional zero-energy flare activations using real cooldown waits, pause during cooldown, Heart Lantern victory, continue, restart, death/retry and a new endless game. Timers were not reset or accelerated for these ten cycles. Journey traversal uses deterministic player placement to reach objectives; it is not a manual exploration playthrough. Touch testing includes simultaneous joystick movement and flare input. Desktop testing includes holding Space through readiness. No page exceptions or relevant console errors occurred.

Captured and visually reviewed active, cooldown and ready screenshots, including the expanding ring and mobile button/HUD. Evidence is available in `/tmp/lantern-vale-flare-{active,cooldown,ready}-{mobile,desktop}.png`; unit output is `/tmp/lantern-vale-unit-results.txt`. `git diff --check` passed.

## Limitations and readiness

No known critical regression was observed. Browser coverage is headless Chromium with emulated touch; physical mobile devices, Safari/Firefox and subjective sound playback were not tested. Automated interaction checks and scripted journeys validate the repair; longer human exploration would provide additional balance feedback.

Ready for review and an explicitly authorized deployment. The static game requires no build step or dependency changes. Changes remain on the separate development branch.
