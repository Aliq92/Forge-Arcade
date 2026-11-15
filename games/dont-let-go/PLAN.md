# FIX #22 — Heroic Multiverse implementation plan

The supplied FIX #22 brief is the design specification. Work stays on
`codex/fix-22-heroic-multiverse`, inside this game's directory. No deployment.

Existing implementation: one HTML file, Three.js r128, camera flight controlled
by held Space/pointer and mouse/touch movement or WASD/arrows. Release loses.
Six timed sectors interpolate speed 16–60. Gates score within radius 6, perfect
within 1.6; misses reset combo. Cubes use swept ship collision radius 1.5.
Only best survival time is saved under dlg_best_time. No existing game tests,
pause, audio, or levels. Root baseline: 32/32 tests pass.

Architecture: retain inline original simulation. Add pure challenge rules in
challenges.js, independent decorative renderer in environment.js, DOM mission
selection and controls in index.html. Keep original endless flight as default.
Original movement and collision formulas remain. Deterministic mission routes
use integrated original sector speeds and reuse gate/cube mesh factories.
Challenge-only interference walls have an open, marked lane and >=3s warning.
All tiers are selectable; optional precision badges never block medals.

- [x] Test challenge definitions, trajectory feasibility, warning timing,
      objective evaluation, hazard boundaries and idempotent save rewards.
- [x] Implement twelve courses / three tiers and a separate additive save key.
- [x] Render cached sky, instanced city layers, clouds, transit, aircraft,
      geometric portals, reactors and storm effects outside gameplay collisions.
- [x] Integrate selection, objectives, completion, optional badges, pause,
      restart, reduced motion, quality and opt-in procedural audio.
- [x] Browser-test original inputs, all courses, failure, rewards/reload,
      responsive layouts, reduced motion, pause/restart and console errors.
- [x] Review before/after screenshots; run node tests and root regression suite.

Review focus: held input across UI and pause; stale objects on restart; storage
blocked/corrupt; narrow portrait HUD; background memory/draw-call growth.
Tests must exercise these. Performance measurements in headless software WebGL
are diagnostic, not evidence of mid-range Android frame rates.

## Follow-up after review

- [x] Reproduce and fix held-Space repeat resuming pause/restart.
- [x] Reproduce and fix landscape mission-brief overlap with bottom controls.
- [x] Benchmark original and expanded flight sequentially; isolate raster cost.
- [x] Batch repeated city technology and traffic; enforce a draw-object budget.
- [x] Render opaque towers near-to-far; render the sky after opaque geometry.
- [x] Lower desktop fallback DPR to 0.75 while retaining native DOM text.
- [x] Add environment and browser regressions; rerun all twelve routes/replays.
- [x] Extend console/HTTP monitoring; fix the missing favicon using existing art.
- [x] Make manual reduced motion suppress CSS animation as well as JS effects.
- [x] Refresh final live GPU-resource checks, root regressions and static build.
