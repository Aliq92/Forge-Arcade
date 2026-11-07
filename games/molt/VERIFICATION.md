# MOLT Fix #05 — Living World

Verified build, 8 November 2026. The user subsequently authorized integration into Forge Arcade. The arcade registry, gallery and existing card assets are unchanged by this update.

## Existing game and preserved rules

The original was one self-contained Canvas document with circular organisms, a dark arena, six random mutations and lineage inheritance. Its exact source is retained in `tests/fixtures/original.html` for comparison. It has a fixed viewport arena, not a scrolling world; mass/starvation, not a separate health meter; eleven molt thresholds, not eleven different mechanical species.

Player speed remains 96 px/s, NPC base speed 68, population 16, and collision radius `9 + sqrt(mass) * 1.55`. Algae still give +6 mass; edible creatures give radius × 2.15. Hunger, starvation floor, hunting/pack alerts, eating/danger ratios, mutation effects, Second Wind, inheritance and generation bonuses retain their original formulas. Thresholds remain 40, 90, 160, 260, 400, 600, 850, 1150, 1500, 1950 and 2500. The original **1.7-second simulation freeze during molting** remains intact.

Seeded original/new simulations compare movement, hunger, AI, spawns, all thresholds and mutations, collisions, food gains, fatal contact, Second Wind and inheritance. Visual randomness uses a separate generator. Original burst RNG calls are retained. This does not promise identical full-session RNG sequences across different audio/frame schedules: the original sound synthesis already consumes gameplay `Math.random`.

## New presentation

The lantern nymph has a warm body, mint fins, expressive eyes, antennae, shell patterns and swimming squash. Eating opens its mouth; growth creates a halo; nearby hunters widen its eyes; hurt produces an outline and bounded shake; leaving danger adds a brief relief reaction. Molting splits a translucent shell, leaves a fading husk and celebrates the existing mutation. Actual body radius, movement and hit detection remain simulation-owned.

| Form | Existing mass milestone | Visual identity |
|---|---:|---|
| Hatchling | Start | Honey body, mint fins, three shell ribs |
| Ripplebud | 40 | Warm peach, bright aqua vein and dots |
| Coralback | 90 | Coral body and rose shell spots |
| Mossling | 160 | Olive shell, pale green ribs |
| Velvetfin | 260 | Lilac body and lavender vein |
| Lanterntail | 400 | Amber body, luminous mint spots and extra fins |
| Ambergill | 600 | Copper/amber shell and coral ribs |
| Bloomback | 850 | Blush shell, violet vein and longer antennae |
| Aurorafin | 1150 | Sage body with aqua spots |
| Mooncrest | 1500 | Blue/lilac body and lavender ribs |
| Prismshell | 1950 | Sand/gold body, turquoise vein |
| Elderlight | 2500 | Pale gold body, bright mint spots and longest antennae |

These are visual appearances corresponding to existing milestones, independent of randomly awarded traits. The player retains the recognizable creature silhouette throughout.

Cached pool lighting, organic floor shapes, reactive flora and drifting spores add habitat detail. Food uses luminous seed petals; edible NPCs have mint leaf-like fins, similar-size NPCs are lavender, and predators have coral angular bodies, spikes and visible pack bands. These decorations add no collisions or AI rules.

The HUD shows the current form and next mass target. Menu, pause and results use the new palette and creature illustration. “Peak mass” is corrected to “Mass at end” because the original never recorded a peak. Pause/Resume, restarting the current generation, visibility/blur pausing and Calm motion are added. Pause clears held keyboard/joystick input. Restart preserves generation and its inherited trait; Retry continues to the next generation as before. Sound and Calm motion preferences alone persist in `molt.presentation.v1`, with blocked storage handled safely. Sound starts only after user interaction.

## Source and artwork

- `index.html`: original simulation, presentation hooks, input, one RAF chain and UI lifecycle.
- `living-world.js`: creature/NPC/habitat drawing, isolated visual randomness and bounded effects.
- `living-world.css`: responsive presentation, 44px action buttons and reduced motion.
- `card-art.html`: editable composition using the same creature renderer.
- `card-art.png`: exported 1200 × 675 artwork, **not wired into the gallery**.
- `tests/`: original fixture, VM comparison tests and browser checks.

## Verification

All **312 automated tests passed**, including 13 MOLT tests and the existing 299 checks, with zero failures:

```powershell
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs games/molt/tests/*.test.cjs
node build.mjs
```

The production build succeeded. MOLT tests also cover focused-button keyboard shortcuts, pause/input cleanup, visibility loss, draining death effects, twelve forms, particle/shell expiry and resets. Independent review found two lifecycle issues (button focus blocked keys, death effects did not settle); both were fixed, regression checked and reviewed again with no remaining blocking findings.

Chrome browser automation passed all five layouts: **1440×900, 768×1024, 390×844, 320×740 and 844×390**. Checked real keyboard and emulated touch movement, frozen pause, blur pause, Escape after HUD button focus, pause/resume during molt, real food-contact threshold triggers, death, settled death effects, next-generation retry, restart, mute, 44px buttons, no horizontal overflow, OS reduced motion and a single RAF chain after repeated state transitions. Desktop exercised all eleven molts; other layouts exercised the first. Food/predator fixtures reposition existing objects through the inspection hook; they do not add gameplay mechanics. Browser console/page errors: **0**.

Browser check command (set `FORGE_PLAYWRIGHT` to an installed Playwright module): `node games/molt/tests/browser.cjs`. Local preview must serve the repository at `http://127.0.0.1:8428/`.

## Performance findings

The browser captured the last 240 measured frame-work samples, including simulation, Canvas rendering and HUD work. These are CPU execution times, not display frame intervals or GPU completion measurements.

| Viewport width | Mean frame work | 95th percentile |
|---:|---:|---:|
| 1440 | 1.66 ms | 2.70 ms |
| 768 | 1.12 ms | 2.00 ms |
| 390 | 0.65 ms | 1.20 ms |
| 320 (reduced motion) | 0.60 ms | 1.10 ms |
| 844 | 0.65 ms | 1.30 ms |

There is one game RAF chain. Particles are pooled and capped at 240, fading shells capped at 12, floating labels capped at 32. Expired effects return to the pool; restart clears them. Dead creatures stop emitting movement trails and shake settles to zero. The static habitat is cached until viewport resize; offscreen organisms/food are culled. No external assets, libraries, filters in the world renderer or network dependencies are introduced. Reduced motion suppresses sway, shake, trails and ambient movement, with fewer stationary celebration particles.

## Screenshots and raw evidence

Evidence is stored locally under `../../test-results/molt/` (ignored by Git).

- [Before desktop](../../test-results/molt/before-play-1440.png) · [After desktop](../../test-results/molt/after-play-1440.png)
- [Before portrait](../../test-results/molt/before-play-390.png) · [After portrait](../../test-results/molt/after-play-390.png)
- [Menu desktop](../../test-results/molt/after-menu-1440.png) · [Menu landscape](../../test-results/molt/after-menu-844.png)
- [320px gameplay](../../test-results/molt/after-play-320.png) · [Eleventh molt](../../test-results/molt/molt-1440-stage-11.png)
- [Browser measurements](../../test-results/molt/browser-report.json) · [Full test output](../../test-results/molt/full-tests.log)
- [Prepared card artwork](card-art.png)

## Limits and readiness

Integration and publication were authorized after local review. This report records the tested source; deployment is confirmed separately against its GitHub revision. Existing unrelated work in the workspace is outside this delivery.

Browser testing used desktop Chrome with emulated mobile dimensions/touch. Physical Android/iOS, Safari, prolonged thermal/battery behavior and low-end GPU frame pacing remain unmeasured; the timing data does not establish 60 FPS on those devices. Automated fixtures verify existing mechanics, not game balance or the emotional quality of animation. The fixed viewport can still become crowded at high mass on small screens, as in the original game. Existing random spawns can still place threats nearby; no balance changes were made. The inspection hook exposes live objects for local QA, consistent with this static game's development approach.

