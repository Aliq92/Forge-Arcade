# Ripple Run — Chromatic Waters verification

Prepared 8 November 2026 on `codex/ripple-run-chromatic-waters`. This report records the verified development build. Integration and publication were subsequently authorized by the user; public verification is recorded separately against the published GitHub revision.

## Existing game analysis

Ripple Run uses classic JavaScript modules and Canvas 2D without a framework or runtime dependencies. `Ripples`, `Orb`, `Obstacles` and `Levels` own simulation; `Game` owns progression and state; `Renderer` draws; `UI`/`main` own menus, input and viewport changes. There are 15 normalized viewport puzzles and a seven-orb Zen pond. No scrolling camera exists or is needed.

The original ripple advances by speed × dt, affects each orb once as the wavefront crosses it, and fades/deletes by its original radius/lifetime limits. Gameplay includes exponential drag, bounded speed, rock collisions, currents, shallow zones, hazards and a 0.55-second goal hold. Completion retains the original slowdown, ratings and unlock rules. The original impulse includes dt × 60; this update deliberately retains that behavior rather than changing timestep or puzzle tuning.

## Implemented changes

- Cached water gradients, slow reflected bands and caustic-inspired patterns; private presentation RNG and time-based decorative rain. Existing koi, reeds, lilies and petals retained.
- Gradient ripple rings, restrained luminous edges and inner wakes. The leading circle uses the real `rp.radius`; inner layers remain behind it. Overlap glints appear at actual circle intersections and apply no force. Rock reflection rings remain decorative as in the original game.
- Clear rock silhouettes and physical rims, current arrows, shallow-zone outlines, full hazard boundaries, bright orb core and warm golden goal. Goal hold feedback also appears in the HUD.
- Input sparkles, rock-hit highlights, fading trails, completion fragments, a brief warm wash and dashed elliptical celebration rings. Celebration rings are distinct from physical wavefronts.
- Restyled title, subtitle, menus, level selection, completion message, pause panel and responsive Zen controls. Mouse/touch placement uses canvas-relative coordinates and one primary pointer event.
- Saved theme, glow, particle and reduced-motion controls alongside all existing preferences. OS reduced motion is the initial default; calm mode removes decorative movement, trails and moving splash particles while preserving gameplay motion.
- Audio waits for user interaction. Master mute covers scheduled notes; pause/hidden state silences audio. No new audio assets or libraries.
- Visibility stops the RAF chain and pauses active play. Resize events are deduplicated. Paused Zen resize scales orbs once. Failure callbacks cannot replace a restarted run or interrupt pause/settings; cinematic controls are cleared on menu exit. Keyboard R after pause restores gameplay audio.

## Themes

| Theme | Automatic levels | Visual treatment |
| --- | --- | --- |
| Aqua Dawn | 1–4 | Turquoise water, pale cyan rings, warm gold |
| Violet Twilight | 5–8 | Deep violet, lavender rings, soft pink highlights |
| Coral Dream | 9–12 | Ocean blue, coral rings, golden reflections |
| Luminous Night | 13–15 | Navy, cyan bioluminescence, purple wakes |

Settings can override automatic progression. Zen retains its legacy `day`/`night` values, supports the four visual themes, rain, strength, cinematic view, add/clear orb and exit controls.

## Source and save compatibility

All changed or added source is under `games/ripple-run/`. Shared homepage, cards, thumbnails, filters, navigation and deployment configuration are untouched. The optional shared card replacement was not needed for this game-only update.

`js/utils.js`, `js/orb.js`, `js/ripples.js`, `js/obstacles.js` and `js/levels.js` are byte-identical to original fixtures. `Game` has presentation state, particle bounds and lifecycle fixes; the simulation loop and level definitions are retained. `generateDecorations` preserves its six legacy global random calls, while new rendering effects use their own generator and do not consume gameplay randomness.

The keys `rippleRun.progress.v1`, `rippleRun.settings.v1` and `rippleRun.zen.v1` are retained. Existing sound/music, glow, shake, contrast, reduced-motion, ratings, unlocks and unknown saved fields remain compatible. Storage access failures are caught. The original game has no checkpoint system, so no checkpoints were invented.

## Automated checks

**369 tests passed, 0 failed** in the repository regression run (baseline: 351). The 18 Ripple Run checks cover original/new traces for all 15 levels, geometry and physical module identity, ripple creation/radius/lifetime/once-only interactions, movement, collision, hold detection, completion/rating/unlock outcomes, restart, pause, pending failures, Zen, settings migration, storage failures, audio gesture/mute/visibility, visual radius, private RNG, particle caps and cleanup.

All-level completion tests hold an orb at its goal to compare completion rules and save outcomes. They are fixtures, not a claim that browser automation solved all 15 puzzles. Solvability confidence comes from identical level definitions/physics and matching seeded simulation traces; the browser additionally solves the first puzzle through normal input at every tested size.

Command:

```powershell
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs games/molt/tests/*.test.cjs games/particle-lab/tests/*.test.cjs games/button-that-judges-you/tests/*.test.cjs games/ripple-run/tests/*.test.cjs
```

`node build.mjs` completed successfully. `git diff --check` found no whitespace errors. Independent source review identified three pause/audio/menu issues; all three were corrected and verified. No remaining material P1/P2 issue was found in that review.

## Browser checks

Headless installed Chrome, served from `http://127.0.0.1:8428/games/ripple-run/`. The browser suite is `tests/browser.cjs`; set `FORGE_PLAYWRIGHT` when Playwright is not on the Node module path. It uses the installed Windows Chrome path. No runtime dependency is downloaded by the game.

Passed: 1440×900 desktop, 768×1024 tablet, 390×844 phone at emulated DPR 2 (render cap 1.5), 320×740 with initial OS reduced motion, and 844×390 landscape. Each layout loads with no pre-gesture audio context, solves puzzle 1 by real mouse/touch input, advances/restarts, verifies exact ripple input coordinates and single-count input, freezes state during pause, changes all themes/preferences, checks keyboard pause/restart, level selection, help, saved progress/preferences, Zen controls and limit, rain, cinematic exit cleanup, visibility stop/resume and absence of horizontal overflow. Desktop resizing was also checked. **Zero page or console errors.**

Browser outputs and screenshots are generated local evidence in the ignored `test-results/ripple-run/` directory.

## Before and after screenshots

Menu comparisons use the same viewport. Gameplay captures show the old first puzzle and new second puzzle, so they demonstrate appearance rather than pixel-identical scene comparison.

| View | Before | After |
| --- | --- | --- |
| Desktop menu | [Original](../../test-results/ripple-run/before-menu-1440.png) | [Updated](../../test-results/ripple-run/after-menu-1440.png) |
| Phone menu | [Original](../../test-results/ripple-run/before-menu-390.png) | [Updated](../../test-results/ripple-run/after-menu-390.png) |
| Landscape menu | [Original](../../test-results/ripple-run/before-menu-844.png) | [Updated](../../test-results/ripple-run/after-menu-844.png) |
| Desktop play | [Original](../../test-results/ripple-run/before-play-1440.png) | [Updated](../../test-results/ripple-run/after-play-1440.png) |
| Phone play | [Original](../../test-results/ripple-run/before-play-390.png) | [Updated](../../test-results/ripple-run/after-play-390.png) |

Theme captures: [Aqua](../../test-results/ripple-run/water-aqua.png), [Violet](../../test-results/ripple-run/water-violet.png), [Coral](../../test-results/ripple-run/water-coral.png), [Night](../../test-results/ripple-run/water-night.png). [Phone completion](../../test-results/ripple-run/after-complete-390.png), [small-phone Zen](../../test-results/ripple-run/after-zen-320.png).

## Performance and limits

The 40-ripple stress scenario measured approximately 4–6 ms mean update/render/UI work per frame and 7–10 ms p95 across the five layouts in the first passing run. These are browser CPU work durations, not measured device FPS or GPU/compositor time. Exact most recent measurements are in [browser-report.json](../../test-results/ripple-run/browser-report.json); full regression output is [full-tests.log](../../test-results/ripple-run/full-tests.log).

Presentation particles are pooled/capped at 240 (32 stationary particles in reduced mode); legacy splashes are separately capped at 240. Ripples retain their original cap of 40. Interference considers at most 12 waves. Canvas DPR is capped at 1.5; background textures are cached; no expensive blur or per-pixel fluid pass is used. Low-effect settings disable particles and glow, and reduced motion stops decorative water/foliage/rain motion.

Physical Android/iOS hardware and Safari were not available for measurement. Phone layouts use Chrome touch/device emulation. Hidden-tab behavior is checked with visibility events, not a mobile operating-system suspension test. All 15 puzzles have not been solved end-to-end manually in this update.

## Readiness

Automated checks, browser checks and production build pass. The user subsequently authorized Forge Arcade integration and publication. Release only the Ripple Run scope; retain unrelated local work and verify the public source and Arcade launch/return after Pages deployment.
