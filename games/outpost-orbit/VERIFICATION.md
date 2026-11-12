# Outpost Orbit — The Frontier Station Update

Development branch: `codex/outpost-orbit-frontier-station`, based on published main `79d0038`. **Local only: not merged, pushed or deployed.** Homepage, ELEMENTAL's secret entrance, all other games, registrations, shared cards and deployment settings are unchanged. The only supporting change outside this game is its existing integration test.

## Existing game analysis

The original is a Canvas2D moon-colony simulation, not a piloted orbital-flight game. Five autonomous villagers choose needs-driven tasks using traits, priorities and seeded scoring. They walk coarse A* routes, build foundations, gather food/material, return carried loads to storage or the landing pod, research and explore. The player places eight facility types, sets priorities, inspects villagers, pans/zooms, changes simulation speed and watches their stories. The finite map contains four inexhaustible resource nodes and nine fixed discoveries. Social relationships, births/arrivals, favorite places, environmental traits, the egg and the multi-stage monolith mystery are retained.

There was no flight/gravity model, mission campaign, purchased module system, victory screen or main menu. No replacement ship physics has been invented. “Engine” now means rover-assisted crew transit; “docking” is feedback at the existing delivery hub. Original source files are preserved under `tests/fixtures/original/` for behavioral and visual comparison.

The simulation still uses 0.1-second fixed steps in the browser and 180-second days, with 1/2/4/8× speed and active-tab time. Original initial resources remain food38, energy24, material64 and knowledge0. Existing facility costs, unlock thresholds, construction timers, collection/work loops, needs, routes, personality rules and mysteries remain. Purposeful mission scoring is an intentional addition; default movement with the frontier extension absent matches the original over 200 steps.

## Campaign and progression

| Stage | Mission | Requirement | Reward |
| --- | --- | --- | --- |
| Survival Outpost | First delivery | Crew deliver8 material | 12 material,4 energy |
| Survival Outpost | A place to stay | Finish a habitat | 16 material,6 energy |
| Survival Outpost | Food on the frontier | Finish a garden and deliver8 food | 16 material,6 data |
| Orbital Expansion | Survey the near moon | Discover two landmarks | 16 material,10 data |
| Orbital Expansion | Power for tomorrow | Energy crystal and Energy level1 | 20 material,8 data |
| Orbital Expansion | Tools for the crew | Workshop and Cargo level1 | 24 material,10 energy |
| Frontier Station | Beyond the landing lights | Research hut and a discovery at least450 map units away | 24 material,12 data |
| Frontier Station | Link the frontier | Engine, Scanner and Station level1 | 26 material,12 energy |
| Frontier Station | Commission the station | Six core facilities, Station level2, stockpile16 material/12 energy/12 data | Completion screen; the stockpile is consumed |

The active tracker opens a compact mission/upgrade panel. Each mission shows its category, concise objective, progress, reward and completion action. Claims and purchases validate requirements atomically; repeated claims cannot repeat the same reward. Objectives can recognize work already done, allowing planning ahead. The completion summary lists travelers, discoveries, active time and module levels. Continue exploring preserves the completed colony and original mysteries.

## Resources and upgrades

Reuse all four existing currencies; no credits were added. Material serves construction, upgrades, repair and commissioning; knowledge is labelled **DATA** in the HUD and retains its original storage field. Food sustains the crew; energy supports research, modules and commissioning.

Every module has two levels. Level2 costs twice level1. Costs are shown before purchase; Station expansion unlocks in stage2.

| Module | Level1 cost | Functional effect per level |
| --- | --- | --- |
| Cargo | 12 material,3 data | +4 units to each actual crew load, including workshop and farm loads |
| Engine | 14 material,4 energy | +20% crew walking speed; adult27 →32.4 →37.8 map units/s |
| Scanner | 10 material,6 data | Discovery radius80 →105 →130; reveal radius125 →155 →185 |
| Energy | 12 material,2 data | +0.06 energy/s and +80 energy capacity |
| Station | 24 material,8 energy,6 data | +0.04 energy/s, +0.025 material/s, solar wings and an expanded station silhouette |

The original material/food sources remain renewable. A baseline energy trickle of0.025/s works without a crystal. Free relief adds8 food/8 material/4 energy, with a60-active-second cooldown. Research and repeated landmark observations keep data obtainable. Existing shortages do not kill villagers; no new irreversible failure condition is introduced.

## Exploration, events and navigation

All nine original discoveries remain fixed and attainable. First discoveries retain the original8 knowledge reward and additionally grant8 food at the pond,8 energy at the crystals or6 material elsewhere, once per site. Existing repeat observation still grants2 data; favorite places, traits and mystery progression give reasons to return. Saved already-found sites are marked as previously rewarded during migration.

A separate seeded event stream leaves the original colony RNG intact. Events first warn at90 active seconds, then recur after100–140 seconds. Each has an8-second warning and20-second active window. Solar disturbance reduces recovery to35%; a relay malfunction reduces it to50% and can be repaired for4 material or allowed to self-correct. Supply signals yield6 material/6 food once. Rare anomalies add4 data to a new discovery during their window. No event destroys facilities, discoveries or mission progress.

Gold objective markers, offscreen direction/distance indicators and a focus-target action assist navigation. Home, drag, mouse-wheel and pinch remain; arrow keys also pan the camera. Focus moves the view rather than commanding the crew. The actual storage/landing delivery hub receives a clear ring and delivery pulse. The small finite map can already be viewed by zooming out, so no additional radar panel is necessary.

## Presentation and controls

The new native start menu uses the requested subtitle, **“Build humanity's next frontier.”** Existing build/priorities/villagers/journal, speed controls, cinematic view, save/reset confirmation, settings and Arcade return remain available. A single objective chip replaces the large original heading/hint cluster. Detailed modules and events stay in a scrollable panel with a persistent close control.

Cached seeded stars/nebula haze, a clearer ringed planet, station solar wings and relay, scanner range, objective glyphs and analytic delivery/discovery effects enrich the original moon scene. Every expansion remains non-solid decoration; original placement and routes continue to govern facilities. `card-art.svg` is prepared for later integration and used locally in the menu/favicon; the shared Arcade artwork remains untouched.

Touch controls preserve drag and pinch. Buttons are at least44px high, phone speed controls are44px wide, and the cinematic action collapses to a labelled icon so the narrow phone footer stays in two rows. The five tested layouts have no document overflow or offscreen mission panel. Reduced motion is seeded from the OS preference for a fresh colony, can be changed in Settings and survives saves. It removes decorative timing/cinematic motion while retaining useful state feedback.

The original synthesized cue is retained, with no context created before an input gesture. Mute is retained; oscillators disconnect after use, and pause/hidden states suspend audio. No external audio files or autoplay ambience were introduced.

## Save compatibility and review fixes

The key remains `outpost-orbit-v1`, saveVersion1. A validated decoder retains valid old colonies, resources, facilities, tasks, discoveries and relationships, then adds optional frontier metadata. Campaign progress is normalized, upgrade levels bounded, known sites kept and events resumed without duplicate supply rewards. Malformed saves start safely; the raw value is retained under `outpost-orbit-v1-recovery`. Blocked storage still permits play. Reset touches only this game's save and retains mute/motion preferences.

Independent review found and verified fixes for three issues: malformed node sets could break navigation, a new100-building validation cap would reject valid older colonies, and original births can briefly initialize needs above100 before the next simulation clamp. Required nodes now validate with defensive navigation; the arbitrary building cap is removed; birth-tick needs are accepted then clamped to100. The reviewer independently reran all12 frontier tests with no remaining findings.

Browser testing also caught and resolved a completion-panel transition, discovery-reward record ordering across reload, and a320px footer overlap. Cinematic camera motion now stops while paused. Menu reset cancellation and completion reloads are covered.

## Test evidence

- Baseline root suite:180 passed before implementation.
- Final combined regression suite: **418 passed,0 failed**, including12 new frontier tests. This covers original movement, mission requirements/rewards, actual deliveries, atomic module purchases/caps, each module's functional effect, deterministic events/relief, navigation, legacy saves, malformed records, large colonies, birth-tick saves and complete campaigns.
- **100/100 seeded campaigns completed**, using actual simulation steps, legal facility placement, purchases and mission claims. No added resources or forced discovery/completion flags. A scripted planner uses dense valid construction sites and buys modules promptly:179–317 active seconds, median233,95th percentile277. These results establish reachability under that strategy; they do not establish every human play style's balance or completion time.
- Real Chrome browser suite:1440×900 keyboard,768×1024 touch,390×844 touch,320×740 touch/OS reduced motion and844×390 touch landscape. All passed menu/new game, native camera input/zoom, native habitat placement, accelerated real crew work, delivery, native Cargo purchase/mission claim, navigation focus, panel bounds, save/reload, mute/motion, pause, cancel/confirm reset and zero local404s/page errors.
- The desktop browser continued that same colony through all nine missions using simulation work and module/facility APIs, with native completion buttons, final screen and Continue exploring. This is accelerated automated progression, not a claimed manual playthrough.
- Lifecycle browser checks passed actual old-save load, paused cinematic camera, hidden-document fixture, reset-cancel-to-menu, gesture-gated audio/pause, malformed/blocked storage, and a completed-but-unacknowledged save. The visibility test simulates the document event; it is not a physical phone app-switch test.
- `node build.mjs` passes. Assets/imports remain relative, and changed entry/dependency URLs are versioned. No runtime package installation or framework is needed.

Commands:

```text
node --test games/outpost-orbit/tests/frontier.test.mjs tests/outpost-orbit-integration.test.mjs
node games/outpost-orbit/tests/progression.mjs
node games/outpost-orbit/tests/browser.cjs
node games/outpost-orbit/tests/lifecycle.cjs
node build.mjs
```

Browser commands use the existing local preview on port8428. `FORGE_PLAYWRIGHT` may override the bundled Playwright path. Full logs and detailed seeded results are in `test-results/outpost-orbit/`; a compact progression summary is committed alongside this report.

## Visual evidence and performance

Before/after images include the initial colony/build controls and the same completed colony loaded under original versus enhanced rendering. Files in `test-results/outpost-orbit/`:

- `before-play-{1440,390,844}.png`, `before-build-{1440,390,844}.png`
- `after-menu-{1440,768,390,320,844}.png`, `after-play-*`, `after-missions-*`
- `after-complete.png`, `after-station.png`
- `before-same-colony-{1440,390}.png`, `after-same-colony-{1440,390}.png`

The sky uses one cached canvas per viewport; DPR is capped at1.5. New transient effects contain at most one effect with10 analytic particles, one event is active at a time, logs remain bounded at80, original reveals at220, paths at1800 and population at24. Terrain decoration and scene objects are culled outside the viewport. There is no new physics loop, path search or unbounded particle allocation.

Paced desktop Canvas submission measurements are recorded in `test-results/outpost-orbit/lifecycle-report.json`: completed colony,1440×900,DPR1,20 warmups and120 measured renders. These are CPU-call timings, not GPU completion or physical Android FPS. Scheduling jitter remains visible in the recorded frame intervals; steady60FPS is not established. See the final recorded figures in PERFORMANCE-RESULTS.json.

## Limitations and readiness

Ready for a later explicit integration request. **No publication occurred.** Card wiring/launcher copy can be updated then; this branch intentionally leaves all shared systems alone.

Tested in installed Chrome with emulated mobile input; physical Android/iOS, Firefox and Safari are not verified. Storage is local to this browser/origin. No offline wall-clock simulation or cross-origin save transfer is added. Original monolith/egg arcs remain optional after the campaign. There is no piloted ship or orbital trajectory simulation because the original game has neither. The compact campaign is intentionally approachable; automated reachability and test timing do not establish long-term human balance.
