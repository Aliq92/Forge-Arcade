# Echo Miner — Fix #04

Implemented and verified locally on 7 November 2026; subsequent integration into Forge Arcade was authorized by the user. Only Echo Miner files were changed for this upgrade; Forge Arcade registration, cards, thumbnails, category filters and deployment settings are preserved.

## Existing systems inspected

Read all original source modules, HTML and CSS: seeded room/corridor cave generation and validation, A* and flood connectivity, player collision/sprint/stamina/crystal weight, transient sonar terrain/entity reveals, sound-event scoring, the Hunter state machine, crystal quota and lift extraction, fixed-step run updates, keyboard/Pointer Events input, Canvas rendering, procedural Web Audio, tutorial, pause/outcomes/restart and v1 best-time/haul/settings storage. The existing three Echo Miner integration tests passed before changes; the repository baseline was 258 passing tests.

Cave generation, player physics, Hunter AI, sonar module, sound scoring and storage schema remain intact. New tremor collision grids are supplied to both the original movement and original Hunter pathfinding code. The original cave tiles are never overwritten.

## Navigation and exploration

- Discovery uses a compact typed array plus a list of newly discovered cells. Nearby lamp-lit terrain and the actual expanding sonar radius permanently add knowledge for the current expedition. The main cave still fades after sonar; the map retains its memory.
- The compact map automatically fits all known terrain, the player, lift, discovered crystals and current known dangers. This keeps early discoveries readable while retaining the return route. The expanded map shows the whole cave boundary with unexplored terrain hidden. Both maps use cyan geometry, a white player marker, amber lift/crystals, turquoise passage hints and violet dangers.
- Previously discovered uncollected crystals remain marked. Hunter markers show sonar observations, then freeze as a labelled last sighting and fade over 30 seconds; they do not expose an unseen live Hunter location.
- Terrain is cached into a small offscreen canvas and only newly discovered cells are painted. Map movement/markers reuse that geometry. A new expedition invalidates the cache by discovery-state identity.
- M toggles the compact view. Tab or tapping the map opens the overview. Close, Tab or Escape returns to the exact expedition/tutorial mode. The overview suspends the full simulation, including Hunter, scanner cooldown and tremors; directional inputs are cleared on transition.

## Crystal Scanner

**C / SCAN** emits a distinct turquoise scanning arc and brief directional pointers. It detects remaining crystals within **400 world units**, highlights results for **5 seconds**, and recharges after **15 seconds**. Detected crystals become known map markers; scanning never fills terrain fog. Potential hidden-passage hints identify real, uncharted narrow passages in the existing cave, not new rooms or breakable walls. Hints and arrows expire after five seconds.

The scanner is **silent to the Hunter**. Its gentle player-facing audio cue adds no in-world sound event. Sonar still reveals terrain and attracts the Hunter through the unchanged sound-scoring system. The HUD states that scanning is silent and shows a countdown; the scan button is unavailable until recharged.

## Cave Tremors

Seeded intervals are **90–150 simulation seconds**. Tremors are disabled throughout the tutorial. A tremor provides a **4-second warning**, up to **3 temporary debris obstructions** for **6 seconds**, then **3 seconds of recovery**. The next interval begins after recovery.

Warning selection and activation both check safety. Block candidates stay at least 96 world units from the player, Hunter and lift, and 64 from remaining crystals. Each proposed obstruction must retain connectivity of **every other floor tile**, not merely a route to one objective. Activation only considers already warned cells and rejects cells that have become occupied or unsafe. A cave with no fair block candidate receives dust/rumble without an obstruction.

Debris is a temporary movement obstruction, not a new damage/health system. Dust itself does not injure the player. Original Hunter contact remains the danger. Recovery immediately removes the transient collision grid and restores original routes. Warning text, violet map/world markers, falling dust and restrained camera vibration explain the event. Calm motion/OS reduced motion disables shake and freezes ambient motion while keeping essential sonar/gameplay cues.

## Controls, atmosphere and files

Preserved WASD/arrows, Shift sprint, Space sonar and Escape pause; touch retains drag movement, Sonar and Sprint. Added visible scanner and pause buttons on all layouts, touch map controls, and **R / Restart Expedition** in the expedition pause menu. Restart reuses the current seed/difficulty and clears the current expedition without erasing best scores or settings. Visibility loss safely pauses. Paused/map frames no longer accumulate a simulation backlog.

Added subtle mineral seams, puddle reflections, scanner outlines/arrows, tremor dust and procedural cues while retaining the original dark sonar art and player/Hunter presentation. No external assets or dependencies were added. An inline icon avoids a missing browser favicon request.

New modules: `src/exploration.mjs`, `src/map.mjs`, `src/tremor.mjs`. Integration edits: `src/state.mjs`, `src/main.mjs`, `src/input.mjs`, `src/render.mjs`, `src/audio.mjs`, `index.html`, `styles.css`. Tests and this report are under the game directory.

## Verification evidence

- **21 Echo Miner tests passed.** Coverage includes local/sonar discovery, retained fog memory, crystal visibility, exact scanner radius/cooldown, passage hints and silence, map coordinates/framing/cache reuse/reset, tremor phases and occupied-cell revalidation, temporary collision/recovery, Hunter investigation/hunting, normal-input crystal collection and lift extraction, pause/map/restart, one-shot input, v1 records and a scanner rendering regression.
- **279 repository tests passed**, zero failures. Command: `node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs`.
- Connectivity sweep: **225 generated caves**, seeds 0–74 in Survey, Descent and Abyss. Their original maps validated; **669 accepted temporary blocks** retained every remaining floor tile, lift and crystal in the player's reachable component. All baseline cave arrays remained unchanged.
- Additional activation sweep: **225 positions away from the lift**, sampled at three reachable positions in 25 seeds per difficulty. Warning-to-active transitions preserved all remaining passages, lift and crystals from those player positions. A sole-corridor fixture rejects all blocking candidates; a player moving onto a warned cell causes that candidate to be dropped.
- Seeded scheduling was compared across 100 seeds and constrained to 90–150 seconds. Tutorial suppression, phase durations and restoration were separately exercised.
- Chrome browser checks at **1440×900, 768×1024, 390×844, 320×740 and 844×390** exercise startup, real keyboard/touch movement, sonar discovery, scanner activation/recharge UI, compact visibility, expanded map freeze/return, tremor warning/active/recovery, real collision-grid reachability, pause/resume/restart, tutorial Hunter reaction and preserved stored records. The 320px run uses OS reduced motion. A controlled close Hunter encounter exercises the real defeat/contact path and restart.
- Browser tremor/cooldown clocks are deliberately accelerated through the inspection hook; encounter positioning is a controlled fixture. Ordinary movement/sonar/scanner/map buttons use actual keyboard and touch input. These checks are not claims of full human expeditions or waiting through every natural interval.
- Screenshots of caves, scanner results, expanded maps, warnings and active tremors were inspected. Fixed the observed first-frame negative Canvas radius, landscape movement-area interception of map buttons, early-map readability and missing favicon. Final browser checks report zero page/console errors and no horizontal overflow.
- Fresh independent review and follow-up found no remaining important correctness issues. Its optional compact danger-framing suggestion was implemented and covered by a failing-then-passing regression.
- Production static build (`node build.mjs`) passed. Source/relative paths and original integration tests pass.

Run `node --test games/echo-miner/tests/*.test.mjs` for focused checks. Run `node games/echo-miner/tests/browser.cjs` with Playwright available (or `FORGE_PLAYWRIGHT` pointing to its installation) and the repository served at `http://127.0.0.1:8428/`. Reports/screenshots are written to `test-results/echo-miner/`.

## Limitations and deployment readiness

Ready for authorized publication. Set `FORGE_MINER_URL` to the deployed game URL and `ECHO_MINER_RESULTS` to a separate folder to repeat browser checks on the public site. Browser QA uses desktop Chrome touch emulation; physical Android/iOS performance, battery use and human difficulty have not been measured. Connectivity is checked at runtime for every accepted blockage, but sampled tests do not prove every possible Hunter encounter is escapable. Full procedurally generated expeditions were not played to victory by humans; a small real-controller collection/extraction fixture validates the preserved win path. Audio cue wiring was exercised without subjective listening evaluation.

The original save system stores best times, hauls and settings, not an expedition snapshot. Discovered map memory therefore persists until the expedition ends/restarts, and does not survive page reload. Scanner passage hints refer to existing narrow routes; no separate secret-room/mining system was introduced. These choices preserve the original game scope and storage compatibility.
