# The Last Lighthouse — executed verification

Standalone verified locally on 7 November 2026; subsequently integrated into the local arcade at the user's request. No remote commit or deployment has been performed for this game. The prior Hollow Signal source remains unchanged.

## Automated checks

`node --test tests/*.test.mjs`: **172 passed, 0 failed** across the arcade, Hollow Signal and The Last Lighthouse. Lighthouse contributes **24 simulation tests** and **2 standalone/isolation integration tests**. `node build.mjs` completed successfully.

Covered simulation behavior: clockwise/counterclockwise and shortest-arc rotation, cone edges and range, eight-unit drain/fourteen-unit recharge, automatic shutdown and eighteen-unit hysteresis, manual relighting, illumination, retained/decaying confidence, distinct ship handling, storm/current influence, ordinary and swept collisions, exact collision-radius tangents, ordinary and swept harbor entry, corridor spawn safety, manageable population, victory, game over, pause, exact seeded restart, fixed-step reproducibility, invalid/oversized time input, warnings and efficiency bounds.

## Gameplay balance

`node tests/the-last-lighthouse-balance.cjs` passed **7 scenarios**. Its keeper policy reads ship positions, confidence, warning and beam/energy indicators. It rotates and toggles the real beam, obeying the same energy, steering, currents and collision rules as play. It does not teleport ships, set confidence, set counters or bypass hazards.

| Scenario | Result | Simulated time | Losses |
| --- | --- | --- | --- |
| Seed 71024 | 12 rescued | 516.60 s | 0 |
| Seed 1 | 12 rescued | 528.55 s | 0 |
| Seed 42 | 12 rescued | 532.82 s | 0 |
| Seed 2026 | 12 rescued | 529.83 s | 0 |
| Seed 99173 | 12 rescued | 527.13 s | 0 |
| Four simultaneous corridor entries | 12 rescued | 411.60 s | 0 |
| Decisions only once per second | 12 rescued | 516.43 s | 0 |

Normal watches took **about 8:37–8:53 simulated minutes**, within the intended 8–12-minute range. The stress fixture deliberately introduces four ordinary ships together, so its total spawn schedule differs from normal play. Normal tested watches reached two simultaneous vessels; the engine caps the population at four.

Normal winning policies used about **128 seconds of active light** over the full watch without an exhaustion event. This demonstrates an achievable resource budget. Human aiming, prioritization and unnecessary beam use can lower efficiency; the policy's near-100% useful-light score is not a human performance claim. One-second decisions also won, so success does not require frame-precise input.

Unguided tests across five seeds showed no losses within fifteen seconds of spawning; the earliest observed was about **19.95 seconds**. Tested natural hazard encounters provided about **13.97–14.4 seconds** between the first warning and loss. Unguided play naturally reaches the three-loss ending.

## Browser checks

`node tests/the-last-lighthouse-browser.cjs`: **passed** using installed Chrome through Playwright, with no observed console/page errors or failed assets.

- Main menu, How to Play, Start, all three vessel classes, guidance/confidence, storm progression and readable Canvas captures.
- Actual A/D and arrow keys, mouse drag, Space toggle, touch drag and large lamp button.
- Complete pause-state equality, dialog focus trapping, repeated pause/resume, background auto-pause, explicit resume and exact seeded restart.
- Regression verified: paused wall time no longer advances simulation on the first resumed frame.
- Gesture-created optional audio, suspend/resume, persisted preference without autoplay, and blocked-storage fallback.
- Winning policy through actual UI-owned simulation inputs: **12 rescues, 0 losses, 516.67 simulated seconds**. Natural three-loss game over, victory replay and loss retry also passed.
- Full ocean arena and primary controls fit **1440×1000**, **390×844**, **320×740**, and **844×390**. Primary buttons are at least 44×44 CSS pixels. There is no horizontal document overflow; short portrait screens can scroll lower explanatory text while the arena, counters, gauges and primary controls remain visible.
- Reduced-motion support and direct `file://` play with the browser offline.

Menu, ship-class, high-storm, victory, failure, portrait and landscape screenshots were inspected. The landscape layout and half-pixel control clipping were corrected and the complete browser suite rerun successfully. The renderer caps DPR at two, caches static chart geometry, and bounds arrival/loss effects. Gameplay uses a single recurring UI animation loop and fixed simulation substeps.

Raw evidence in the checkout: `test-results/the-last-lighthouse/browser-report.json`, `balance.jsonl`, `full-suite.log`, and screenshots.

## Practical limits

Browser touch emulation was used; physical phones, speakers and sustained mid-range-device frame rate have not been measured. Successful times above are simulated strategy results, not human playtesting. Downloaded files work offline; no service worker installs a remotely visited page for later offline access. Sound preferences are local to the browser/origin and fall back gracefully if storage is blocked. The native Back to Forge Arcade link assumes the original repository folder structure.

## Integration status

The gallery has **36 entries**, including The Last Lighthouse in Games and Featured. The root registration loads once, before summaries; archive and featured cards use the detailed pixel-art lighthouse scene with the original SVG fallback. All previous 35 entries are retained. The thumbnail regeneration tool also retains the newly added artwork. Hollow Signal remains separately prepared and unregistered. Publication was approved; public verification follows the deployment.

After the gallery artwork update, the full **176/176** Node suite and static production build passed. Browser integration checks passed on desktop and mobile: Games and Featured membership, launch from archive and Featured cards, start, beam toggle, pause/resume, and native return to all 36 entries. Evidence: `test-results/browser-report.json`. The earlier standalone evidence above remains applicable because the game runtime is unchanged.
