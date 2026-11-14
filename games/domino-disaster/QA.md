# Execution report ·14 November2026

## Automated

`node --test games/domino-disaster/tests/*.test.mjs`: **59 tests passed,0 failed** in the final recorded run. Covers gravity/contact/SAT/angular momentum/rolling/tunnelling/rest, single-use and physical gadget activation, malformed imported data,120-gadget finite-state stress, editor transactions/history/locks/inventory/connections, persistence failures including a throwing localStorage getter, deterministic all-speed/restart behavior and detached sampled replay.

All12 reference builds pass real Editor placement validation and run to success twice with identical snapshots, required mechanisms and three stars through Game. Every incomplete initial build fails. Alternative placements shifted+3px succeed for all ten placement puzzles; puzzles6/7 use connection edits. Removing Marble Mayhem's functional ramp prevents completion. Simulation never reads the solution array. See PUZZLES.md for actual reference placements.

## Browser

Executed `tests/browser.cjs` using local headless installed Chrome/Playwright. **Passed**,12/12 campaign wins through palette/tabletop/inspector/connection controls, all3stars, no page errors. Tested pause/resume, progression and stars after reload, recorded replay/seek, Edit Setup, Sandbox placement/undo/redo, named save/load, export/import, resizing and overflow checks.

Screenshots inspected at1440×900 desktop,390×844 portrait,844×390 landscape and375×667 small portrait. A touch-enabled mobile context verified tap placement, rotation, deletion, touch drag repositioning, two-finger pinch zoom and menu return. Fixed issues found during QA: tool rotation before placement, repeated-tool selection, mobile placement panel obstruction, touch compatibility-click retargeting during panel expansion, fractional range-slider validation, saved-layout ID collisions, blocked-storage startup, keyboard placement and touch menu return.

Evidence remains under ignored `test-results/domino-disaster/`: unit-results.txt,browser-results.json, menu/build/sandbox/mobile/final-victory screenshots and browser-performance.json. These are test artifacts, not deployed files.

## Measured performance

Local Windows,Node22.19.0,headless Chrome1440×900. Host load affects timing. The dedicated rendered stress page uses72 dominoes, one floor, high effects and2× scheduling. Every domino actually tipped; the mechanism settled after15.817 simulated seconds.

| Measurement | Observed |
|---|---:|
| Rendered frames |475 |
| Overall headless frame rate |22.10FPS |
| Physics step mean /95th percentile |2.61 /4.70ms |
| Draw mean /95th percentile |3.11 /5.50ms |
| Maximum active bodies / candidate pairs |72 /294 |
| Replay samples / serialized record |239 /8,625,639bytes |
| JS heap before / after (unforced GC) |1.58 /26.15MB |

The stress frame rate is below60FPS; no smooth-phone claim is made. The fixed simulation stays stable and slows scheduling rather than enlarging the physics timestep. Lower effects or smaller builds are appropriate on slower hardware. Heap growth includes simulation and recorded snapshots; it is not evidence of a leak or a steady-state heap measurement. Records are replaced when retrying. Particle/event/frame caps bound long-session growth.

An additional complete Node72-domino Game run measured6.70ms mean/13.39ms95th percentile per1/60-second advance (two fixed steps plus recording),239 replay frames and8,625,999serialized bytes. PHYSICS.md contains separate fixed-step and maximum-cap stability measurements.

Touch placement, dragging and pinch inputs produced expected state changes in browser tests. One measured touch pointerdown-to-next-animation-frame interval was8.60ms in the emulated390×844 Chrome context; this is an event-to-frame observation, not a physical touchscreen/end-to-end latency guarantee. Physical phones, Safari/Firefox, and longer heap profiling remain unverified.

## Readiness

Independent reviews covered physics/content and the root editor/state/storage/input/UI flow; substantive findings were fixed and checked. `git apply --check games/domino-disaster/integration/integration.patch` passed. Prepared artwork is640×360SVG and960×540losslessWebP. Runtime files are self-contained under the game folder, with a relative Arcade-return link and no external runtime libraries.

The standalone build was completed without publishing. The user subsequently authorized Forge Arcade integration and publication on14 November2026; current gallery wiring and integration verification are documented in INTEGRATION.md. The prepared patch is retained as history and should not be applied again.
