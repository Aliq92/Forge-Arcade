# Tiny Excavator — The Treasure Beneath Update

Verified 12 November 2026 on `codex/tiny-excavator-treasure-beneath`, based on main `ae66b33`. **Local development build only. No integration, push, merge or deployment.** All changes are under `games/tiny-excavator/`. Homepage, other games, shared cards, filters, navigation and deployment settings are untouched; pre-existing unrelated workspace changes were preserved.

## 1. Existing game analysis

The actual target is `games/tiny-excavator/index.html`, originally one classic HTML/CSS/Canvas2D document. It already had terrain textures, quarry scenery, a tracked vehicle, automatic timed digging, a depot and persistent expeditions. The original is preserved in `tests/fixtures/original.html`.

World: 34 columns ×98 rows, 32px tiles, surface row5 and92 depth rows. The player collision body is22×22px. Horizontal speed105px/s, winch speed85px/s, gravity480px/s² capped at260px/s. Directional input prioritizes up/down, then horizontal movement. Terrain blocks movement until timed excavation completes. Dirt/clay/gravel/stone/bedrock have distinct existing hardness; boundary walls are indestructible. Unsupported loose stone/gravel can crack for1.5s then collapse; supports stabilize nearby cells. Falling can damage the hull.

Existing resources: Copper12, Silver30, Gold80, Gem Cluster200 fictional credits; trinkets55/70; three story fragments reward250/400/650 immediately and unlock assembly at the depot. Ordinary minerals consume cargo slots and earn credits only when sold. Fuel, hull, cargo capacity, supports, services, four five-level upgrades (dig speed, fuel, cargo and hull), rescue with partial cargo loss, overwrite/restart confirmation and save key `tinyExcavatorSaveV1` already worked. There is no manual arm-control mode, movable bucket physics or difficulty selector; none was invented.

Baseline regression:390 tests passed before changes. Original menu, surface, underground and machine captures were taken at desktop/portrait/landscape sizes.

## 2. Excavator design and animation

The excavator now has a compact yellow/orange chassis, a soft-blue glass cabin with highlights, roof/beacon, worklight, graphite tracks with three rollers, moving tread marks, hydraulic cylinder/rod, pinned boom/elbow joints and a recognizable grey bucket with teeth. The same renderer supplies the in-game machine and main-menu illustration. Subtitle: **“Dig deeper. Discover more.”**

The rigid body stays within the existing22×22 collision footprint; the clearly visible boom/bucket are non-solid tools, as before. They never expand digging reach or change collisions. A pure inverse-kinematics pose solves two connected links (18px boom,16px stick) toward the existing adjacent dig tile. Visual targets ease into digging and return to rest; reduced motion snaps to the useful operational pose while suppressing decorative sway/recoil. The original digging action begins immediately and retains its exact timer and fuel cost. Tracks move only with actual horizontal velocity. Dig dust, debris and gentle bucket/chassis reactions reinforce work without delaying input.

## 3. Underground graphics

Cached32×32 procedural tile art adds brown topsoil, warm clay, darker earth/stone bands, rocky strata, embedded stones, fissures and soft edge shading. Six depth bands and four coordinate-driven variants per material provide variation. Mineral inclusions appear in shaded host rock; fragments retain their distinct original violet objective outline. Worklight, a lighter underground background and restrained vignette improve readability. The quarry/depot, supports, winch cable, crack warnings and dig-progress bar remain recognizable.

Textures and visual randomness do not alter collision data. Cached textures use independent deterministic seeds; terrain/deposit generation remains reproducible from the expedition seed.

## 4. Minerals, rarity and economy

Existing ids, configured values and hardness are retained. Five new ids add Iron, Platinum, Emerald, Ruby and Diamond. Metals are labelled ore deposits; gems are labelled embedded gemstones. The old generic Gem Cluster remains as a legacy resource, with its original200-credit value.

| Mineral | Rarity | Value | Tiles per new world, seeds0–499 |
| --- | --- | ---: | ---: |
| Copper Ore | Common | 12 | 57–102 |
| Iron Ore | Common | 15 | 32 |
| Silver Ore | Uncommon | 30 | 32 |
| Gold Ore | Rare | 80 | 12 |
| Platinum Ore | Rare | 120 | 10 |
| Gem Cluster | Epic | 200 | 6 |
| Emerald | Epic | 180 | 7 |
| Ruby | Epic | 220 | 6 |
| Diamond | Legendary | 400 | 2 |

All values are **fictional in-game credits**, not real market prices. Copper12 and Silver30 intentionally preserve the game's established prices instead of substituting the brief's suggested10/35. Existing trinkets, fragment rewards and upgrade/service prices remain unchanged. There are no real-money purchases.

### Intentional new-expedition distribution change

Inspection found seed42 originally contained85 copper,162 silver,174 gold and217 generic gems; gold/gems were therefore not rare. A deterministic post-generation pass now retains seeded subsets of silver/gold/gems, capped at32/12/6, and replaces the surplus with depth-appropriate solid host rock. It then places controlled new deposits:32 iron,10 platinum,7 emerald,6 ruby,2 diamonds. Common > uncommon > rare > epic > legendary mineral counts hold across the500 tested worlds.

Air/starting pocket, boundary walls, copper guarantees, trinkets and all story fragments are preserved exactly. New deposits use eligible clay/gravel/stone/bedrock hosts; gems and platinum use stone/bedrock. They never overwrite retained cargo resources or fragments. First finds are offered near the central corridor; one diamond appears at depth16–28 and the other below28. Remaining placements favor deeper candidates. No extra calls to gameplay `Math.random` are used.

This intentionally changes mineral availability and which tile hardness/loose-material properties occur in **new** expeditions; it is not a claim that the full new-world difficulty distribution is identical. The underlying movement, digging, fuel, collision, support and cave-in formulas are preserved. Loaded saved worlds are never regenerated or rebalanced.

### Visual identification and rewards

Each mineral has a distinct silhouette as well as color: copper chunks, iron bars, silver veins, gold flakes, platinum plates, clustered legacy gems, hexagonal emeralds, octagonal rubies and crisp pale diamonds. A test renders their geometry while ignoring colors and verifies all nine differ.

Common finds use small particles and the existing collection cue. Rare/epic finds display mineral name, rarity and cargo value; epic notes are more noticeable. Legendary finds add bounded gold sparkles, a brief gentle highlight and a short celebratory cue. The highlight is removed in reduced motion. Notifications explicitly say **cargo value**; collection never also awards sale credits. Selling at the depot remains the credit transaction. Cargo-full attempts leave the tile, value and discovery count intact.

## 5. Journal, UI and save compatibility

The compact journal shows each mineral's icon, category, rarity, value, collected count and best find. Counts track discoveries during the expedition, including finds later sold or lost in rescue. It is available from the HUD or pause screen and freezes play. The HUD retains fuel/hull/cargo/depth/credits/fragments and now shows collected-mineral count and four active upgrade levels. No additional survival meter or large upgrade system was added.

Existing controls remain: A/D or arrows move/dig horizontally, S/down digs beneath, W/up digs upward or winches through clear shafts, F places support, E enters the depot and Escape pauses. Touch uses the same large directional/support/depot zones. All essential action targets are at least44px. Panels scroll; portrait and landscape remain supported. Screens under a visible modal are inert, focus is contained and Escape resumes even when the calm-motion checkbox has focus. Pause freezes active animation, dig/crack progress and held input. Visibility loss requires explicit resume.

Save schema/key remain `v:1` / `tinyExcavatorSaveV1`, with optional `finds` metadata. Valid legacy grids, cargo prices, credits, upgrades, fragments and progress load unchanged. Missing legacy discovery history is inferred only from remaining saved mineral cargo; past sales cannot be reconstructed and are not invented. Optional malformed counts are ignored; missing supports/crack dictionaries are normalized. Invalid tiles/player bounds/supports/crack records are rejected safely. Saved cargo names are escaped before depot/recap HTML rendering. Denied storage still allows play. Reduced-motion preference uses its own key `tinyExcavatorCalmMotion`; existing sound/tutorial keys remain.

New tile ids require the updated client; old clients are not promised forward compatibility with newly generated expanded worlds. The upgrade safely reads existing supported saves, but does not provide a full cross-version or cross-tab save-conflict system.

## 6. Source files

- `index.html`: retains the original simulation and menus, integrates the extension, journal, discovery metadata, focus/input safety, reduced motion and audio master gain.
- `treasure.js`: mineral catalog, deterministic balancing/deposits, articulated poses/renderer, cached strata/mineral art, bounded pools, discovery feedback and journal-count recovery.
- `treasure.css`: scoped visual polish, compact HUD and responsive44px controls.
- `card-art.svg`: prepared640×360 illustration of the redesigned machine and colorful underground treasures, **unwired**. Shared gallery files are unchanged.
- `tests/`: executable world, gameplay, save, pose, browser and lifecycle checks plus original fixture.
- `BRIEF.md`, `UPGRADE-PLAN.md`, `MINERAL-RESULTS.json`, this report: requirements, decisions and measured evidence.

## 7. Automated test results

**405 tests passed,0 failed**:390 existing regression checks and15 new Tiny Excavator tests.

```powershell
node --test games/tiny-excavator/tests/*.test.cjs
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs games/molt/tests/*.test.cjs games/particle-lab/tests/*.test.cjs games/button-that-judges-you/tests/*.test.cjs games/ripple-run/tests/*.test.cjs games/mandelbrot-explorer/tests/*.test.cjs games/tiny-excavator/tests/*.test.cjs
node build.mjs
```

Coverage:900-tick original/new movement/fuel/digging/collision comparison given the same legacy world; unchanged legacy save/price/progress loading; every old/new mineral collection value; no credit until sale; full cargo preserving deposit; discovery metadata round-trip/corruption; upgrade costs/capacity and insufficient funds; fragment rewards and depot-only victory; pause/input/reset and checkbox-focused Escape; all new metadata; connected finite arm joints across orientations/progress; easing/return without mutating simulation coordinates; reduced decorative motion; particle caps/expiry; and color-independent icon geometry.

The500-seed test compares each enriched world with a second generation, validates all new hosts/counts/depths and proves unchanged air/boundaries/copper/trinkets/fragments. Raw observed count ranges are in [MINERAL-RESULTS.json](MINERAL-RESULTS.json). Original/new physics comparison intentionally supplies matching legacy terrain to isolate preserved controller behavior; it does not hide the documented new-world resource-layout change.

## 8. Browser testing

Five Chrome layouts passed with **zero page/console errors**:

| Viewport | Input |
| --- | --- |
| 1440×900 | Keyboard/mouse |
| 768×1024 | Emulated touch |
| 390×844 | Emulated touch |
| 320×740 | Emulated touch + OS reduced motion |
| 844×390 | Emulated touch |

Commands with the local server on port8428 (optionally set `FORGE_PLAYWRIGHT`):

```powershell
node games/tiny-excavator/tests/browser.cjs
node games/tiny-excavator/tests/lifecycle.cjs
```

Verified loading/tutorial; actual native keyboard and touch movement; real held-direction digging and terrain removal; pause/time/arm freeze; journal listing and return; legendary discovery using the actual timed dig/collection path; unchanged credit until depot sale; sale recap; cargo upgrade; sound/motion controls; save/reload; viewport rotation without overflow; fragment delivery/assembly/victory; continue digging; cancel/confirm restart; fresh reset; and bounded caches/effects/DPR.

The rare-find test deliberately positions the player in a cleared fixture chamber and inserts an adjacent diamond, then invokes the real timed dig method; it is a regression fixture, not a natural discovery-probability claim. Fragment delivery also uses controlled positions. Generation reachability/rarity is tested separately with500 seeds. No complete natural three-fragment playthrough or full economy balance across every route is claimed.

Additional lifecycle checks passed: paused checkbox Escape; topmost confirmation focus; visibility freeze and explicit resume; unavailable/malformed saves allowing fresh play; full pooled effects and complete expiry. The visibility test overrides the hidden getter and dispatches its event; physical mobile app switching is not claimed.

Independent read-only review found no material P1/P2 issue in economy, collection, save handling, progression or poses. It identified the minor focused-checkbox Escape case; that case was reproduced failing, fixed and regression tested. Final review verified the fix and visual easing/nonmutation behavior with no material residual findings. A later icon-geometry test caught identical copper/gold silhouettes; gold flakes now differ and the test passes.

## 9. Visual evidence

Before/after capture uses the original source fixture, seed42, the same cleared underground pocket and proportional camera framing. New mineral-layout differences are intentional. Machine close-ups use the same6× scale. Desktop, portrait, machine and underground screenshots were opened and visually inspected for joint connection, silhouette, mineral shapes, controls and readable strata.

| View | Before | After |
| --- | --- | --- |
| Machine close-up | [Original](../../test-results/tiny-excavator/before-machine.png) | [Treasure Beneath](../../test-results/tiny-excavator/after-machine.png) |
| Desktop underground | [Original](../../test-results/tiny-excavator/before-depth-1440.png) | [Updated](../../test-results/tiny-excavator/after-depth-1440.png) |
| Phone underground | [Original](../../test-results/tiny-excavator/before-depth-390.png) | [Updated](../../test-results/tiny-excavator/after-depth-390.png) |
| Landscape | [Original](../../test-results/tiny-excavator/before-depth-844.png) | [Updated](../../test-results/tiny-excavator/after-depth-844.png) |

[Updated menu](../../test-results/tiny-excavator/after-menu-1440.png) · [Legendary find fixture](../../test-results/tiny-excavator/legendary-390.png) · [Prepared card](card-art.svg).

Screenshots and raw logs/reports are local ignored artifacts under `test-results/tiny-excavator/`, not included in the source commit. The committed test scripts regenerate primary after-game captures; matching original comparisons use the preserved fixture.

## 10. Performance findings

Final desktop Chrome benchmark:240 synchronous render iterations at1440×900 CSS pixels, DPR1, with180 legacy particles plus180 discovery particles active and an underground view. Mean **0.66ms**, p95 **0.80ms**;83 cached tile sprites in that scene. Both pools then expired to0. Five-layout checks observed43–63 cached sprites during play/restart and enforced DPR≤1.5, ≤180 particles per pool and ≤528 texture combinations.

Cached32×32 art has a finite22 material ×4 variant ×6 band key space. The world remains fixed3332 cells; catalog lookup is constant-time. There is one existing RAF chain, bounded effect pools, viewport tile/entity culling and a small fixed-link arm solve. No external models, assets, frameworks, expensive world blur or fluid simulation were added. Desktop timings measure CPU Canvas submission, not GPU completion, display FPS or Android performance.

## 11. Known limitations and readiness

Physical Android/iPhone, Safari/Firefox, speaker levels, assistive technology and long mobile thermal/battery behavior were not tested. Mobile findings use Chrome emulation. New-world economy quantities were structurally validated, but no exhaustive natural victory/economy playthrough was performed. Existing narrow-tunnel/large-view interactions remain the original game. Native input/controller regression covers the existing mechanics, while rare/victory UI uses labelled fixtures.

Ready for local review with405 tests, five browser layouts, lifecycle checks and the static build passing. Preview: <http://127.0.0.1:8428/games/tiny-excavator/>. The game retains its existing arcade id/route, so future authorized integration needs no new registration or shared system. The prepared thumbnail may be adopted separately after approval. **Do not deploy or merge this branch until explicitly authorized.**
