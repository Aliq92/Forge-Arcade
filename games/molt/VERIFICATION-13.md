# MOLT Fix #13 — Colourful Creatures

Initially verified 9 November 2026 on `codex/molt-colourful-creatures`, based on main `5304ef0`, source commit `8914cb5`. **Integration and publication were authorized on 12 November 2026.** The update is integrated into main, with a fresh 390-test regression run. The homepage, shared cards, other games, filters, navigation and deployment configuration are unchanged. All delivered changes stay inside `games/molt/`; unrelated workspace changes remain untouched. Deployment is verified separately against the published revision after pushing.

Integration recheck, 12 November: 390/390 regression tests, 18/18 MOLT tests, all five full browser layouts and five genuine-input opening runs passed. Browser regression initialization now uses seed 42 so incidental random opening encounters cannot preempt its near-threshold fixtures. Runtime gameplay randomness is unchanged. The static build passed. Current local evidence remains under `test-results/molt-13/`.

## 1. Existing MOLT and Fix #05 analysis

Fix #05 was already implemented and published. It supplied the layered pool, cached floor/light decoration, reactive plants, spores, twelve visual forms, pooled effects, expressive creature rendering, pause/restart, keyboard/touch input, results/lineage UI and presentation preferences. Its creature design included multiple fins, shell ribs/patterns and larger antennae; predators had spikes and pack bands.

The game is a fixed-viewport survival arena: move, eat, gain mass, molt, survive, then continue the lineage after death. Player speed 96px/s; NPC base speed 68; 16 NPCs; collision radius `9 + sqrt(mass) * 1.55`; algae +6 mass; edible NPC gain `radius * 2.15`. Eleven thresholds remain 40, 90, 160, 260, 400, 600, 850, 1150, 1500, 1950, 2500. Molting freezes simulation for the existing 1.7 seconds. All six mutation effects, hunger/starvation, edible/danger size ratios, pack targeting, Second Wind, inherited traits and generation bonuses remain intact. There is no new health meter or terminal victory screen: this remains an endless lineage game with results and immediate Retry.

All 13 existing MOLT tests passed before changes. Fix #05 HTML, art and CSS snapshots are retained under `tests/fixtures/`; the earlier pre-Fix05 original fixture also remains.

## 2. Creature redesign

The player is now one rounded gradient body, two expressive eyes, one pair of tiny fins and two short antennae. Shell ribs, multiple fin rows and elaborate body marks are removed. A form has either no body mark, one simple stripe or two small dots. At a small 16px render radius, every one of twelve forms uses at most 18 drawing paths and draws two eyes. Growth still changes actual body size through the unchanged mass-radius formula. The stage sheet holds radius constant specifically to compare color/pattern differences.

| Existing form | New main color |
| --- | --- |
| Hatchling | Turquoise |
| Ripplebud | Mint |
| Coralback | Soft coral |
| Mossling | Sage green |
| Velvetfin | Lavender |
| Lanterntail | Golden yellow |
| Ambergill | Warm peach |
| Bloomback | Warm pink |
| Aurorafin | Aqua |
| Mooncrest | Sky blue |
| Prismshell | Lilac |
| Elderlight | Pale gold |

No new growth stages or mechanics are added. Each form stays recognizable through the same simple silhouette. Eating now produces a restrained squash/bounce, an open mouth, existing colorful particles and immediate mass/progress feedback. Existing smooth turning, eye movement, idle wobble, movement trails and soft molting shell separation remain. Escaping danger briefly brightens the outline. Reduced motion suppresses bounce/wobble/trails and keeps reactions stationary.

Predators are friendly coral/peach teardrops with two readable eyes and a small hunting warning arc. Spikes and complex anatomy are removed; a pack has one simple band. Edible creatures remain mint/turquoise rounded forms and neutral creatures lavender. Player fins/antennae and bright outline distinguish it from these roles, including when a player stage has warm colors. All these shapes are decorative: collision circles and AI consume original entity data, not animated geometry.

## 3. Gameplay refinement

**Intentional pacing change:** four of the existing six opening algae are repositioned into a nearby trail, 38–101px forward with small lateral variation. Eight candidate directions are scored against existing larger predators; invalid screen/HUD-edge locations are rejected. The clearest candidate is used. This does not guarantee a safe run, remove predators, add immunity, spawn extra food or change any reward. The remaining two starting algae and all later random spawns retain their existing rules. Placement consumes **no additional gameplay random calls** and preserves all original algae phases and NPC spawns.

The HUD now gives context: follow +6 seeds, swim away from a nearby coral hunter, enjoy a fresh mutation, or pursue larger edible creatures for more mass. The original progress bar, stage, survival time, mass, mutation chips, pause and restart remain; no extra survival meter is introduced. Valuable prey still reward their original size-based mass, distinct from bright organic seed food.

Unchanged movement responsiveness was verified rather than retuned. The original existing 1.7-second molt freeze already provides the requested short pause/glow/shell/emergence/reward sequence. The menu subtitle is exactly **“Eat. Grow. Transform.”** and prominently shows the new creature. Results retain actual end mass, time, generation and traits plus immediate next-generation Retry.

### Actual progression proof

`node games/molt/tests/pacing-report.cjs` steers through the real simulation, leaving all NPCs active and without repositioning food, changing mass or changing rewards. Five seeded 960×640 runs reached the first molt:

| Seed | Simulated seconds | Resulting mass | Mutation |
| ---: | ---: | ---: | --- |
| 1 | 0.817 | 45.612 | Keen Eye |
| 7 | 0.817 | 45.612 | Shadow Skin |
| 42 | 0.817 | 45.612 | Iron Jaw |
| 123 | 0.817 | 45.612 | Second Wind |
| 987 | 0.600 | 100.720 | Broad Shell, including its existing +55 reward |

An additional **real-input browser run** follows ordinary food positions with keyboard on desktop and native emulated touch gestures on four other layouts. With seed 42 and all 16 NPCs active, it reaches the first molt in 0.87–0.99 simulated seconds on all five layouts. No positions, mass, danger rules or progress values are edited in this check. This demonstrates early progression; it does not establish that every random run is safe or all eleven milestones can be naturally completed within a particular duration. A separate controlled predator test proves swimming away increases clearance and avoids contact while the original hunting AI runs.

## 4. Source and preserved environment

- `living-world.js`: replaces only creature palettes/player/NPC drawing, adds the eating bounce/escape outline. The existing backdrop, flora, visual RNG, pose smoothing, effect pool and shell lifecycle remain.
- `index.html`: nearby opening food placement, contextual objective cue, menu copy, DPR cap 1.5 and versioned local assets. Core update, food values, NPC spawn/AI, mutation, collision and death functions are unchanged.
- `living-world.css`: cohesive turquoise/gold guidance/progress styling; existing responsive panels and control zones remain.
- `card-art.html` / `card-art.png`: refreshed 1200×675 composition using the same new creature renderer. **Unwired:** shared arcade gallery assets are untouched.
- `tests/`: updated same-world compatibility fixtures, new simplicity/pacing/core-preservation tests, real-input opening test and pacing report runner.

Existing `molt.presentation.v1` preferences remain unchanged. Runs/lineage are session-based as before; no new save model is introduced. Existing audio sounds remain gesture-gated. Relative paths, classic scripts and the existing Canvas renderer are retained. No external runtime assets or libraries were added.

## 5. Automated results

**390 tests passed, 0 failed**: the previous 385-test selection plus five new tests; MOLT now has **18 tests**, all passing.

```powershell
node --test games/molt/tests/*.test.cjs
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs games/molt/tests/*.test.cjs games/particle-lab/tests/*.test.cjs games/button-that-judges-you/tests/*.test.cjs games/ripple-run/tests/*.test.cjs games/mandelbrot-explorer/tests/*.test.cjs
node build.mjs
```

Coverage: movement/hunger/steering/spawns/bounds for up to 600 seeded ticks; actual algae/prey/fatal collisions; all thresholds and mutations; pack alerts; Second Wind; lineage/restart; pause; focused-button keyboard input; visibility input cleanup; settled death effects; twelve visual appearances; bounded particle/shell expiry; visual RNG isolation and no geometry mutation; simple two-eye rendering; opening food count/phase/NPC preservation; first-molt steering and predator avoidance. Byte comparison against Fix #05 verifies the actual `update`, radius, NPC/food spawn, player construction, molt, death and input-vector functions are identical.

Because opening positions are deliberately changed, original/new comparison tests give the old simulation the same updated opening-food fixture before comparing subsequent world records. They continue to compare every other field. A separate test explicitly verifies that only the first four positions change: six food items remain, phases match and initial NPC records are identical. This is not a claim of identical whole sessions under two intentionally different food layouts. The original audio noise synthesis can consume gameplay randomness on death, as previously documented.

## 6. Browser results

Chrome checks passed at **1440×900, 768×1024, 390×844, 320×740 and 844×390**, with **zero page/console errors** in the main suite. Desktop uses keyboard; other layouts use emulated native touch. The 320px layout exercises OS reduced motion.

Commands (set `FORGE_PLAYWRIGHT` to an installed Playwright module; local preview on port 8428):

```powershell
node games/molt/tests/browser.cjs
node games/molt/tests/opening-browser.cjs
```

Verified initial load/menu; no audio before interaction; movement; growth feedback; all eleven molts on desktop and first molt elsewhere; pause/resume during transformation; controlled predator contact/game over; effects drain; retry to generation two; restart without adding a generation; mute; 44px HUD controls; no horizontal overflow; reduced motion and one pending animation-loop chain after repeated transitions. The all-molts/encounter suite positions existing food/entities and sets near-threshold mass to exercise transitions; it is explicitly a fixture-based regression check. The separate opening suite proves genuine keyboard/touch progression with no such state editing.

Independent read-only review found no material P1/P2 issues in rendering, pacing, collision isolation or resource lifecycle. One minor CSS override-order finding was corrected. Before/after sheets and desktop/portrait/landscape images were opened and inspected for simple silhouettes, eyes, stage colors, role readability and HUD placement.

## 7. Before/after evidence

Comparisons use the same seed and NPC layout fixture, with the intended new food layout visible after. Menus are allowed to finish their transition before gameplay captures. Contact sheets use a fixed radius to isolate character design differences. Screenshots/raw reports are local ignored evidence in `test-results/molt-13/`, outside the source commit.

- [Fix #05 forms](../../test-results/molt-13/before-forms.png) · [New forms](../../test-results/molt-13/after-forms.png)
- [Before desktop](../../test-results/molt-13/before-play-1440.png) · [After desktop](../../test-results/molt-13/after-play-1440.png)
- [Before portrait](../../test-results/molt-13/before-play-390.png) · [After portrait](../../test-results/molt-13/after-play-390.png)
- [Before landscape](../../test-results/molt-13/before-play-844.png) · [After landscape](../../test-results/molt-13/after-play-844.png)
- [Menu portrait](../../test-results/molt-13/after-menu-390.png) · [Prepared card artwork](card-art.png)
- [Full browser report](../../test-results/molt-13/browser-report.json) · [Real-input opening report](../../test-results/molt-13/opening-browser-report.json) · [Full tests](../../test-results/molt-13/full-tests.log)

## 8. Performance

The main browser suite records the last 240 CPU frame-work samples (simulation + rendering + HUD). These are not display frame intervals or GPU completion timings.

| Width | Mean | p95 |
| ---: | ---: | ---: |
| 1440 | 1.49ms | 2.40ms |
| 768 | 1.04ms | 2.20ms |
| 390 | 0.89ms | 1.60ms |
| 320, reduced motion | 0.62ms | 1.30ms |
| 844 | 0.61ms | 1.30ms |

One RAF chain remains. Pooled particles cap at 240, fading shells at 12, labels at 32. Effects expire/reset; dead creatures emit no new trails and shake settles. Cached environment and viewport culling remain; DPR caps at 1.5. Flat NPC fills and lightweight player paths replace more elaborate outlines; no expensive world blur filter is added. A single small player gradient is drawn per frame. Calm motion retains fewer stationary reactions and suppresses nonessential movement.

## 9. Limits and readiness

Physical Android/iPhone, Safari/Firefox, speaker levels, screen readers and prolonged thermal/battery behavior were not tested. Mobile findings use Chrome emulation, and CPU times do not establish a physical-device FPS guarantee. Real-input opening checks cover one browser seed across five layouts; simulation strategy checks cover five seeds at the desktop arena size. They prove reachable early progress, not complete balance for every lineage or device. Existing small-viewport crowding at high mass and occasional nearby random threats remain; no invulnerability or spawn-AI overhaul was added.

Integration/publication authorized 12 November 2026. The existing arcade entry continues to open `games/molt/index.html`; no new registration or shared card changes are required. Public game: <https://aliq92.github.io/Forge-Arcade/games/molt/>. The prepublication test evidence above remains applicable; the publication result is confirmed separately after GitHub Pages completes.
