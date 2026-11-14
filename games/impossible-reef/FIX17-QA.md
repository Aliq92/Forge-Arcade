# Fix17 execution report ·14 November2026

Publication follow-up: the user has now explicitly authorized Forge Arcade integration. The publication candidate retains all14 planting choices, removes automatic background vegetation, and uses the existing native game route/card. Local script/style URLs are versioned17 to refresh cached clients. The standalone no-publish statements below describe the original build stage.

Visual follow-up: automatic background vegetation rendering was removed at the user's request. The reef now displays only planted garden organisms. The original dense-background screenshots/performance figures below describe the earlier expansion, not the current default appearance. All14 planting choices remain available.

Planting follow-up: added eight actual planting choices (14 total), reusing the cached distinct silhouettes. tests/plantable-browser.cjs passed all eight placements, distinct geometry, nurture, reload persistence and mobile palette access with no page errors. The existing garden/Survey browser suite and advanced compatibility/touch suite were rerun with the14-choice palette. The original six-species save records remain compatible.

## Existing game and scope

Inspected index.html, styles.css, all of script.js, the registry and the existing integration test before editing. The game is a single-screen coral garden; planting/tending and hybrid/rare growth are its original progression. It has no existing swimmer, enemies, collision terrain, campaign or win/loss gate. The expansion therefore adds optional Survey mode rather than replacing the garden with an adventure game. Baseline integration test passed before changes; original before screenshots were captured from copied original files with24 seeded mature corals.

Only games/impossible-reef is changed. Shared gallery metadata/artwork/styles/deployment and unrelated local work remain untouched. No card refresh is necessary for this gameplay-only update. No merge, push or deployment was performed.

## Automated tests

The final combined run includes376 tests: existing tracked root checks plus Domino Disaster, Lumenworks, Neon Forge and the14 new pure ocean tests. All passed,0 failed. Unrelated unfinished Hollow Signal files were excluded. New tests exercise deterministic regional scenery/life, all eight flora types, rare distribution/rewards, proximity/one-time collection, safe reload, bounded/current-counteracting motion, vent phase, gate blocking/open/bypass, ordinary-steering reachability of all32 treasures/four habitats, optional challenge persistence, pause/restart, malformed journal data, bounded effects/life, schooling/reactions, explicit one-time completion feedback and distinct regional routes.

Regressions were first reproduced for newly required schooling/completion, lost upstream progress and repeated regional layouts, then fixed and rerun. A fresh independent review identified resize-particle accumulation, paused wall-clock mood/ambient changes, narrow-landscape toolbar overlap and upstream-badge persistence. Each was corrected. The targeted re-review reported no new substantive issue; final model/browser checks cover the fixes.

## Browser checks executed

Local installed Chrome, headless Playwright; no page errors in the final runs.

- Original24-corals v1 save loads, six species remain, mouse planting/select/nurture/remove works, and actual timed mature-neighbor crossbreeding creates a hybrid with a controlled random roll. Hybrid persists after reload.
- Pause freezes growth/wildlife/probe. An artificial ten-minute Date.now advance while paused leaves the mood label and saved mood elapsed unchanged. Ambient expiry now uses simulation time.
- Survey activates with playfield keyboard focus. Keyboard movement works; all32 treasures are reached through normal tap-destination steering/model steps with no teleporting or direct journal edits. Four habitats are discovered, completion is journaled, and all rewards persist. Simulation stepping is accelerated in the automated full-route test; a human play session is not represented as real-time benchmark evidence.
- Journal/help/quality, restart preserving discoveries, saved progression, Zen hide/restore, auto-grow, screenshot download, sound opt-in, reduced-motion preference and Garden/Survey touch controls were exercised.
- Malformed legacy saves skip invalid species, blocked localStorage still permits play, and loaded sound=true creates no AudioContext until interaction. Twelve repeated resizes retain bounded snow/cache counts.
- Screenshots/overflow checks:1440×900,390×844,844×390,320×740,568×320 and667×375. Actual touch-enabled mobile context verifies planting/nurture, Survey movement, dialog controls and tapping all last three species in narrow landscape. Species and action button rectangles no longer overlap.

Before/after and per-region screenshots plus JSON/test logs are under ignored test-results/impossible-reef-fix17/. The comparable before-desktop.png and after-desktop.png use the same24 seeded mature original corals. The expansion adds the background organisms/life without replacing those corals. Screenshot inspection prompted drawing decorative foreground before interactive planted corals, and hiding the planting hint during Survey.

## Measured dense-scene performance

Each case measured180 animation frames in Kelp Forest with70 mature planted corals,160 model decorations and58 background animals. High drew152 decorations/58 animals; Low drew77/29 while retaining type variety. Sprite cache remained23 entries in these samples (maximum24), snow58 desktop/14 mobile. These are local host measurements, not physical-device guarantees.

| Viewport / quality / CPU emulation | Average FPS | Draw mean /95th percentile | Update mean /95th percentile |
|---|---:|---:|---:|
|1440×900 / High /1× |57.35 |4.57 /7.30ms |0.14 /0.30ms |
|390×844 / High /1× |83.07 |3.23 /5.40ms |0.10 /0.20ms |
|390×844 / Low /4× slower CPU |48.39 |14.89 /26.00ms |0.36 /0.70ms |

Headless scheduling can exceed60FPS; the mobile viewport measurement uses the desktop host CPU. The4× case demonstrates a slower emulated CPU and is not a named Android-device benchmark. First sample maximum frame was171ms; short-run average/percentiles include normal scheduling variation. JS heap before/after was2.50→2.78MB desktop,2.71→2.44MB mobile High and2.61→14.25MB with slowed CPU/Low. No forced GC was used; these numbers include transient allocation and do not establish long-term leak behavior. Explicit population/cache caps and repeated-resize checks provide bounded-resource evidence.

A final touch pointerup-to-next-animation-frame sample was54.60ms (an earlier run measured6.20ms, illustrating host scheduling variability). It is an emulated event-to-frame observation, not end-to-end physical touchscreen latency. Reduced motion and Low quality are available for slower devices.

## Limitations / readiness

Physical Android/iPhone, Safari/Firefox and extended heap profiling were not tested. Regions are optional environmental themes within the existing single-screen garden; no campaign, new enemies or forced win/loss progression was invented. Ocean life is decorative lightweight behavior, not a food-chain/fluid simulation. Glowing flora is clearly fictional, and corals/fans/anemones are identified as animals.

The expanded source is ready for local review and subsequent integration authorization. The public site remains unchanged under the brief's explicit no-automatic-deployment instruction.
