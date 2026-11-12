# Frontier Station implementation plan

**Goal:** Give the existing moon colony a finite, varied frontier-station campaign while preserving its autonomous villagers and living simulation.
**Architecture:** Keep Canvas2D Renderer, fixed 0.1-second simulation, native DOM controls and version-1 save key. Add a pure frontier progression module with optional state and a validated persistence adapter. Hook actual deliveries, discoveries and active buildings into objectives; do not invent flight physics for a game without ships.
**Tech:** Vanilla ES modules, Canvas2D, Node tests, Playwright/Chrome.
**Spec:** BRIEF.md. User authorized the implementation; no deployment or shared-card changes.

## Design and choices

- Preserve all four resources: food, energy, material (ore/construction) and knowledge (research data). No fifth currency.
- Nine missions across Survival Outpost, Orbital Expansion and Frontier Station: delivery, shelter, food, survey, power, workshop, distant research, relay upgrades, final commissioning. Missions reward existing resources once; final commissioning consumes a small clear stockpile. Continue exploring after completion.
- Cargo increases delivered loads; engine improves crew transit (no ship exists); scanner increases discovery/reveal range; energy improves recovery/cap; station expansion adds solar wings, docking apron and relay, and supplies passive energy/material. Two levels each, modest costs.
- Existing infinite food/material nodes, free daylight trickle and optional relief supplies prevent shortage deadlocks. No death/failure is added. Research becomes available from repeat visits and research buildings. Events have warnings, expire automatically and cannot destroy progress.
- Mission navigation marks current sites/buildings, reports distance in moon-map units and focuses the camera only on request. Villagers remain autonomous; mission scoring nudges eligible choices without suppressing needs.
- Compact objective chip; detailed missions, upgrades and focus/distance navigation in a panel. Preserve build/priorities/villagers/journal, speeds, cinematic, zoom/pan, reset confirmation and Arcade return. Add native start/completion dialogs, keyboard camera pan, reduced motion and audio gesture gating.
- Validate old saves and optional frontier data; preserve all valid old colony progress without rewriting terrain or discoveries. Bound effects, background cache, DPR 1.5 and viewport culling.

## Tasks

- [x] Preserve original fixtures, record baseline screenshots and tests; document original loop/limits.
- [x] Red/green progression tests: missions, resource hooks, all five functional upgrades, events, navigation, legacy decode, reset and complete campaign.
- [x] Add frontier hooks to existing AI, collection, delivery and time stepping; retain unextended movement regression.
- [x] Add menu, tracker, mission/upgrade panel, navigation, sound/motion preferences, completion/continue and persistence.
- [x] Enhance cached sky, station growth, delivery rings, routes and bounded feedback; prepare unwired card-art.svg.
- [x] Run seeded full progression, browser input/progression/save/pause/reset/completion and five layouts; compare visuals and measure rendering.
- [x] Review complete branch, fix findings, report evidence and limits, commit locally. Do not push/merge/deploy.

## Review focus

Legacy saves with active tasks; repeat mission/reward clicks; zero inventories; events while paused/hidden; short mobile landscape panels; purchased upgrades affecting actual AI; no fabricated ship/orbital claims.

## Ledger

- Inspection: six original runtime files read. Actual game is an autonomous five-villager colony, with A* routes, walking/working/return delivery, eight buildings, nine discoveries, needs/friendships/births, monolith/egg arcs, four resources, seeded RNG, 180-second days, 1/2/4/8× speeds. No ship, orbital velocity, docking, mission campaign, upgrades, victory or main menu exists. Save key outpost-orbit-v1, saveVersion1; old loader only checked aliens. Original sprites/planet/ground are preserved.
- Baseline: 180 root tests pass. Existing Outpost integration pins original source hashes; move those assertions to preserved baseline fixtures and add behavioral tests for the enhanced runtime.
- Ruling: use colony delivery hub and autonomous crews rather than introducing piloted flight; preserves the actual game's identity. Engine is a transit assist, scanner is a crew sensor.
- Final:418 tests pass;100/100 campaigns complete without resource injection;5 Chrome layouts pass with no errors/404s. Paced completed-colony CPU submissions averaged3.72ms,p95 6.10ms versus original3.48ms,p95 6.30ms. Scheduling was variable; no physical Android FPS claim.
- Review fixes: required node identities and defensive navigation; preserve large older colonies; normalize original arrival-tick needs above100. Reviewer independently reran12/12 frontier tests with no remaining findings. Browser fixes include completion panel close, stable discovery-record order, narrow footer overlap, paused cinematic motion and modal reset cancellation.
- Ruling: no extra radar; the finite existing map, zoom, objective markers, distance and camera-focus action suffice without another persistent HUD block.
