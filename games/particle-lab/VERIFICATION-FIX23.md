# Particle Lab Fix 23 — implementation and verification

## Delivered
The free-floating particle and force-field game has been replaced by a deterministic material laboratory. The existing Particle Lab route, title, gallery registration and Arcade return link are preserved. All changes are inside games/particle-lab. Nothing was committed, merged, pushed, deployed or published by this implementation agent.

## Architecture and material behavior
The engine stores a fixed 96×64 simulation in typed material, temperature, lifetime and source-provenance arrays. Heat diffusion exchanges energy between neighbors. A moved mask limits each cell to one movement per tick. Alternating horizontal order avoids a permanent left/right bias. A 30 Hz accumulator is independent of display refresh; rendering has a six-tick / 10 ms catch-up ceiling. Canvas pixel density and display resizing do not change the grid.

The registry defines air plus nine primary materials: falling/piling sand; flowing water; fixed stone; conducting metal; combustible fixed wood; lighter floating oil; slow hot lava; melting ice; rising/condensing steam. Temporary fire heats its surroundings and becomes smoke; smoke rises and dissipates. Movement and phase changes preserve occupied-cell mass, while combustion explicitly consumes fuel and ultimately dissipates smoke. Temperatures are bounded to −100…1500°C. The model is intentionally simplified rather than physical fluid dynamics.

Sandbox provides brush, line, filled rectangle, flood fill, eraser, heating, cooling and inspection; brush size/rate; pause/play/step/speed; editing undo; reset/clear; five templates; local save/load and JSON export/import. Mouse, touch drag and a keyboard canvas cursor are supported. The interactive tour reacts to material drawing, pausing and heat selection. Reduced motion removes decorative shimmer.

Challenges use the same grid engine and a public Session.apply action interface. Fixture cells cannot be edited; allowed palettes/tools and budgets are checked atomically. Source phase work, collection counts, stable containment, elapsed protection and intermediate meltwater flow provide measurable objectives. Failures offer instant retry. Completed levels unlock their successor and remain replayable. Tested solution recipes appear in field notes with exact grid coordinates.

## Twelve completed experiments
| Level | Actual browser completion tick | Budget used |
|---|---:|---:|
| Sandfall | 36 | 24 |
| Waterworks | 223 | 21 |
| The Dam | 100 | 29 |
| Icebreaker | 17 | 1 |
| Steam Lift | 30 | 1 |
| Oil and Water | 60 | 34 |
| Firebreak | 120 | 29 |
| Lava Crossing | 50 | 34 |
| Cooling Chamber | 1 | 3 |
| Pressure Path | 69 | 18 |
| Chain Reaction | 98 | 2 |
| The Grand Laboratory | 98 | 5 |

Every row was completed in Chrome using visible toolbar controls and pointer gestures, followed by actual timed simulation. The browser debug surface is read-only; tests never inject a world, completion flag, tick counter, objective or progress value. Separate Node tests replay the same public legal recipes deterministically. Browser ticks around multi-stage waits can vary slightly because a running frame may advance before the pause click arrives.

## Storage
Sandbox key: forge.particle-lab.sandbox.v2. Progress key: forge.particle-lab.challenges.v2. Both formats are versioned. The legacy forge.particle-lab.experiment.v1 slot is never overwritten or deleted. Imports validate the entire scene before replacing live state, reject challenge fixtures, and leave the current experiment intact on error. Browser storage exceptions preserve the scene and keep challenge progress for the visit. Export remains available as a fallback.

## Verification commands and results
- Baseline before edits: `node --test games/particle-lab/tests/*.test.cjs` — 22 legacy tests passed. Actual Chrome baseline loaded the former Particle Renaissance and all six old tools.
- Replacement: `node --test games/particle-lab/tests/*.test.cjs` — 20/20 passed, about 12 seconds. Covers deterministic movement, single-move bounds, heat conduction, all phase changes, actual source-driven ignition, density, static solids, finite combustion, extinguishing, conservation, malformed saves, separate persistence, all twelve solutions, all twelve full-timeout idle controls, irrelevant edits and Firebreak's real threat.
- `node games/particle-lab/tests/browser.cjs` — PASS. Installed Chrome via bundled Playwright; local preview server. Desktop 1440×900, touch 390×844, narrow touch/reduced-motion 320×740, touch landscape 844×390. Zero console/page errors. All twelve challenge visible-tool solutions, progression/replay/retry, pause/step, tools/heat/inspect/undo, sandbox save/load, malformed import, blocked storage, mode isolation, tour, resize/rotation, and actual browser Back/Forward restore.
- Chrome's automation default disables back/forward caching. The final test explicitly removes that flag, uses browser history.back(), and records actual pageshow.persisted=true for all four layouts. After restoration, Step and painting still work.
- Full 6,144-cell Node stress over 180 ticks: sand mean0.55 ms/max6.18; water mean0.70/max6.32; fire mean0.87/max11.50. These are desktop measurements, not physical mobile benchmarks.
- Final browser simulation samples mean1.10 /0.89 /1.05 /1.34 ms per tick across the four layouts; max5.8 ms. Browser report and screenshots are in qa/.

## Review fix wave
Two significant review findings were fixed together:
1. Before the fix, an empty thermal action consumed budget and allowed naturally occurring phase changes to claim success (review reproduction: Icebreaker 347 ticks; Cooling Chamber 71). Empty actions now do nothing and spend nothing. Distinct touched source cells must receive the appropriate thermal tool, in addition to actual transformation/flow/collection requirements. Regression tests exercise empty, irrelevant and insufficient one-cell thermal actions; all fail to claim completion. All twelve idle sessions time out without winning. Protection/containment tests reject irrelevant construction.
2. Before the fix, pagehide disposed the game even for the browser back/forward cache. Persisted pagehide now cancels the gesture but retains the live listeners/observer/frame callback; pageshow resets timing and resizing. All four actual persisted restores passed.

Browser QA additionally caught paused sandbox state being resumed on a mode return, and a narrow-screen tour overlay covering its drawing area. The sandbox running preference is now preserved, and the tour occupies a separate row above the workbench. The final full browser run passed both regressions.

## File inventory and legacy cleanup
Rewritten: index.html, lab.css, lab.js, materials.js, renderer.js, experiment.js, tests/browser.cjs.
Added: challenges.js, tests/challenges.test.cjs, tests/physics.test.cjs, tests/storage.test.cjs, BRIEF-FIX23.md, INSPECTION-FIX23.md, this report, qa/browser-report.json and screenshots.
Removed: particles.js, old field-specific collision/particle/experiment/material comparison tests, original.html fixture, obsolete UPGRADE-PLAN.md and VERIFICATION.md. The old well implementation is removed rather than left disabled. New asset URLs consistently use cache version23.

## Practical limits
Simulation uses cell counts rather than real pressure, volume or fluid momentum. Combustion propagation depends on contact duration and accumulated heat. The genuine source regression uses a 12×12 world initially filled with 20°C stone, replaces coordinates (2,2)…(8,8) with a 7×7 fire reservoir at its default800°C or lava at1100°C, places ambient20°C wood or oil at (9,5), and runs100ticks. All four source/fuel combinations ignite. A lone short-lived source encased beside three cold stone neighbors can lose heat before reaching the fuel ignition threshold; sufficient source energy and contact duration are required. No extra contact-heating rule was retained; final runtime is the original tested conservative-diffusion model. Challenge undo is intentionally unavailable; retry restores the full initial state and budget fairly. Save/load is one local sandbox slot with export for additional creations. Browser tests emulate mobile viewport/touch in installed desktop Chrome; physical devices and other browser engines were not available. The pre-existing gallery description still mentions forces and motion because root gallery files were explicitly outside this task's ownership.
