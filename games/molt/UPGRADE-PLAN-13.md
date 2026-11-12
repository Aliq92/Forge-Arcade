# MOLT Fix #13 — Colourful Creatures

Spec: BRIEF-13.md. Build locally on codex/molt-colourful-creatures; do not merge, push or publish. Scope only games/molt/. FIX #05 is implemented: classic Canvas document, MoltPresentation, preserved original physics/AI, twelve appearances for start + eleven thresholds, cached pool/flora/spores, pooled particles, 1.7s molt freeze, pause/restart/lineage, touch joystick and saved presentation preferences.

Approach: keep the existing environment/animation/effect architecture. Replace complicated shell anatomy with one round gradient body, two readable eyes, one pair of small fins/antennae and at most a few dots/one stripe. Turquoise/mint/coral/lavender/gold/sky/pink palettes map to existing twelve forms/names. Friendly coral teardrop predators use rounded silhouettes and two eyes; packs have one band rather than spikes. Prey stays mint; neutral stays lavender. Maintain actual circle radii and all size/food danger ratios.

Pacing call: relocate four of the existing six opening algae into a short nearby feeding trail aimed toward the clearest space. Do not add food, mass, immunity, different rewards or gameplay random calls. All subsequent random spawns/AI, rates, thresholds and lineage stay intact. Show a concise contextual cue (seeds +6, small creatures bigger rewards, coral danger), a friendly first-molt prompt and refreshed color feedback. The existing 1.7s molt freeze already fits the requested short sequence; retain it. Capture an actual steering strategy through the opening food to prove progress is possible.

Review focus: animated shape changes never enter collision; same core RNG progression despite relocated starting food; distinct roles at small sizes; stage visuals remain color/silhouette based rather than extra limbs; pause/touch cleanup and single RAF survive transitions; mobile HUD/guidance do not cover the creature or controls; reduced motion suppresses bounce/trails.

- [x] Capture Fix #05 menu/play and large creature/stage sheet; run 13 existing tests.
- [x] Write failing simplified-shape/palette/food-pacing tests; preserve original/fix05 fixtures and core compatibility coverage.
- [x] Replace player/NPC drawing, stage palettes, eating/molt feedback and menu art; retain backdrop and resource caps.
- [x] Add nearby food trail + contextual guidance; verify early progress by real simulated movement, compare unchanged movement/AI/collision/rules against original given matching world fixtures.
- [x] Run all repository tests, five native/touch browser layouts, all molts, death/retry/lineage, pause/restart, reduced motion and bounded-effect/performance checks. Review screenshots and obtain independent review.
- [x] Refresh prepared unwired card source/PNG; report exact results, intentional pacing change and limitations; build and local commit only.

Execution ledger: 390 regression tests pass (18 MOLT). Original opening fixtures deliberately aligned for core comparison; separate test proves the changed distribution retains count/phases/NPC RNG. Five seeded steering runs reach first molt in0.60–0.82s with NPCs active; five real keyboard/touch browser runs reach it in0.87–0.99s without state editing. Full browser suite passes all11 desktop molts and first molt elsewhere, death/retry/lineage/pause/restart/mute/reduced motion, zero console errors and one RAF. Independent review found no P1/P2; one minor CSS override ordering issue fixed. Card regenerated from new renderer, unwired. No publish.

Rulings: early opening-food placement is the only intentional balance/layout change; keep all rewards, quantities, RNG consumption, collision radii and later AI/spawn rules. Preserve the original1.7s molt freeze. Do not claim full eleven-stage natural playthrough from threshold fixtures. Keep Fix05 report as historical and link to new verification. Existing audio randomness and small-screen high-mass crowding remain documented limitations.
