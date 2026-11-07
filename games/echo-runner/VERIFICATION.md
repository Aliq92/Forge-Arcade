# Echo Runner — Fix #03

Implemented and verified locally on 7 November 2026; subsequent integration into Forge Arcade was authorized by the user. The existing Forge Arcade card, navigation and other games were left intact.

## Inspection and changes

Inspected all game modules: fixed-step physics, input recording, per-tick echo playback, trigger evaluation, linked/timed doors, lifts, hazards, crumbling floors, progression, renderer, menus, procedural audio and touch controls. The original 14 room definitions and physics module remain unchanged, including the 22×34 collision body, acceleration, coyote time, jump buffer and variable jump height.

The warm-white explorer now has a cyan visor, backpack and animated limbs, with idle, running and airborne poses, movement glow and landing particles. Violet/turquoise echoes share the silhouette but retain transparency, trails and numbered labels. Chamber ribs, cables, lit platform edges, dust and restrained parallax add atmosphere. Everything uses procedural Canvas artwork; no downloaded assets or runtime dependencies were added.

Recording now resets the attempt to the same spawn and world-clock origin used for replay. Quick jump/interact/record taps survive between simulation ticks. Rejected Record commands no longer repeat a simulation-clock index. Timed doors actually expire even when their source toggle stays on; hazard contact takes precedence over exit contact. Storage failures no longer interrupt play. Pausing freezes simulation and clears held inputs, and restart preserves saved progress.

The timeline distinguishes recording, playback and holding echoes. Touch adds explicit replay, with at least 44px action targets and adaptive portrait/landscape cameras. Sound can be muted; playback waits for user interaction. Completion starts a full-viewport two-second confetti effect immediately, with usable navigation buttons; the final room gets a larger 2.3-second effect, overall progress, replay and main-menu options. Reduced motion uses sparse static confetti and suppresses ambient animation. Particles use a 180-slot pool; confetti is capped at 160.

## Five new rooms and verified solutions

All recordings begin at spawn. Stop recording after the described action; rewind creates an echo that repeats it. Once its recorded input ends, the echo remains physically present and settles onto its plate.

| Room | Solution executed by the real controller | Echoes | Input ticks |
|---|---|---:|---:|
| 15 — First Contact | Record walking onto the violet plate near x=220 and standing still. Rewind, let the echo hold it, then cross the open door to the exit. | 1 | 274 |
| 16 — The Moving Line | Record the plate near x=200. Rewind, jump from x≈300 onto the vertical lift, ride to the upper floor, then cross the echo-held door. | 1 | 525 |
| 17 — Double Exposure | Record one take holding the first plate near x=215, then a second holding the plate near x=485. Both echoes hold the combined lock while the hero crosses. | 2 | 405 |
| 18 — Fractured Timing | Record walking to x≈210 and pressing Interact at the echo-only switch. Rewind, approach x≈500, jump over the moving magenta obstacle toward x≈670, then cross before the eight-second gate closes. | 1 | 295 |
| 19 — The Final Echo | Record separate plate holds near x=215 and x=515. Rewind, board the crossing lift from x≈590, ride toward the far bank, jump to the player-only switch near x=1105, interact, and cross the five-second final gate. | 2 | 716 |

`tests/solutions.mjs` contains executable solutions for **all 19 rooms**, using movement/jump/interact snapshots and normal recording/rewind actions. It never teleports an entity or changes trigger/door states. Each room must reach the controller's real `roomComplete` state without an unexpected reset. Solutions for all five new rooms also pass with deliberate 6, 12, 18 and 24 tick delays after echo creation (0.1–0.4 seconds). Ticks include recorded takes; they are automated traces, not estimates of human completion time. Lift endpoint dwell and the moving hazard were tuned to allow forgiving boarding/jump windows.

## Verification

- **40 Echo Runner tests passed.** Coverage includes original room fingerprint, movement/jump, deterministic replay, simultaneous echoes/plates, timed doors, moving platforms and hazards, recording expiry, completion, confetti bounds/lifetime, reduced motion, old saves, sequential unlocks, pause, restart and quick input edges.
- **258 repository regression tests passed**, zero failures. Command: `node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs`.
- Measured replay position error: **0 world units** for the sampled movement/jump sequence, against a tolerance of `1e-7`. Actual record/replay comparisons also pass at **30, 60 and 144 rendering FPS**. Environment simulation remains fixed at 60 Hz.
- Original 14-room definition SHA-256 remains `afc2a8136f968ed7c615dfe03423f517a7926f831c15b7eaf7e9f87632545fd9`.
- Chrome automation passed at **1440×900, 768×1024, 390×844, 320×740 and 844×390**, including keyboard/touch recording, replay, pause, restart, sound toggle, all five new puzzle solutions on desktop, final-room solution on every layout, completion controls, level selection and Arcade navigation. No page or console errors; no horizontal overflow. Blocked localStorage also passed. The 320px run exercised OS reduced motion.
- Screenshots of chambers, echoes and completion screens were inspected. Corrected mobile Arcade-link overlap, a duplicate final-screen action and mismatched timeline markers.
- A fresh independent code review found a rejected-record timing bug; a failing regression reproduced it before correction. Follow-up review confirmed the correction and reported no remaining important findings.
- `node build.mjs` passed. Relative game-module paths and existing gallery registration are preserved.

Browser command (with Playwright available): `node games/echo-runner/tests/browser.cjs`. Set `FORGE_PLAYWRIGHT` to a Playwright installation when it is not on the local module path. The test expects the repository served at `http://127.0.0.1:8428/` and writes reports/screenshots under `test-results/echo-runner/`.

## Limits and readiness

Ready for authorized publication. Browser checks use desktop Chrome touch emulation; physical Android/iOS devices, mid-range Android frame rate, battery use and human difficulty have not been measured. Automated solutions prove gameplay completion and sampled timing tolerance, rather than every possible action sequence. Audio startup and mute state were checked, but subjective sound quality was not evaluated. Runtime saves remain best-effort when browser storage is unavailable. Set `FORGE_ARCADE_URL` to the published arcade root and `ECHO_RUNNER_RESULTS` to a separate output folder to repeat the browser checks against the public deployment.
