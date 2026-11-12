# Lumenworks — complete build plan

**Goal:** Complete eight cozy network puzzles and a persistent sandbox with a coherent finite-energy graph model.
**Spec:** BRIEF.md. **Contract:** API.md. **Stack:** Canvas2D, vanilla ES modules/CSS, procedural audio, localStorage, Node and Playwright. No external runtime dependencies. Branch based on published main8fca8a4. No existing Lumenworks files were present.

## Constraints and decisions

- Preserve all Arcade files/games/deployment; only add this game and an unwired registration/thumbnail preparation. Do not publish or merge.
- No visual mockup is attached. Use the explicit written palette, isometric city, amber windows and cyan equipment as art direction.
- Directed cables with arrows; generators/building roles and explicit allowed links keep interaction understandable. Capacity-constrained residual flow, not reachability, drives every illuminated building. Use deterministic priority and load shedding, with constrained-demand warnings.
- Battery power PU is separate from stored energy EU. Exclusive support/charge/off modes, finite rates, source/throughput accounting and no battery-energy multiplication. Planning is untimed; stability checks advance bounded active time only.
- Eight authored levels teach cables, capacity, substations, damage/reroute, finite battery support, competing loads/tram, multiple sources/switches, and citywide combination. Reference actions must actually solve each level with3-star feasibility.
- Sandbox independent of unlocks; all five electrical components plus seven building styles, placement/removal, save/load and reset. Apply same graph model and bounded layout limits.
- Compact DOM HUD/right drawer/toolbelt, keyboard alternatives, native pointer dragging, camera/pinch,44px controls, reduced motion, quality, persisted opt-in sound/volume. City stays primary.

## Work domains

- [x] Network implementation + pure topology/battery/capacity tests (network.js, tests/network.test.mjs).
- [x] Eight data-driven levels + verified reference solutions (levels.js, tests/levels.test.mjs).
- [x] Isometric city renderer + thumbnail + geometry/purity checks (renderer.js, assets/).
- [x] Root game state/progression/undo/storage/audio/input/UI and tests.
- [x] Cross-domain review and browser testing of every level, desktop/native touch, sandbox, saves, overlays and errors.
- [x] Fully lit/large-sandbox performance measurements, screenshots, docs/integration preparation and final local commit. No deployment.

## Coordination / preflight

| Producer / consumer | Interface or file overlap | Ruling |
| --- | --- | --- |
| Network / levels | Board schema and reference simulation | API.md is authority; level agent owns data only, can run tests when core arrives. |
| Network / root Game | allocate/advance/validation | Pure allocation, bounded-energy advancement; root owns objectives and action history. |
| Levels / root Game | reference actions, objectives and stars | Root applies the same action shapes; timed wait executes actual battery simulation. |
| Renderer / input/UI | projection/hit-test/draw options | API.md exact methods; renderer owns only renderer.js/assets, root owns input/main/style. |
| All domains | filesystem / commits | Disjoint source ownership; agents do not change branches or stage other work. Root performs final integration/local commit. |
| Every task | Tests versus implementation | Meaningful behavior and solution tests required; independent review checks conservation and reachability. |

## Ledger

- Inspected launcher app.js/GAMES, per-game registration, local native-document navigation, shared styles and build.mjs. Existing37 entries/36 visible; ELEMENTAL remains secret. No runtime framework/package manager needed. Existing production copy excludes tests directories.
- Ruling: use test-results/lumenworks as the ignored coordination/evidence workspace on this Windows host and keep authoritative plan/spec under the game's folder. Parallel domains have explicit disjoint ownership and shared API.md, avoiding implementation races.
- No real electrical procedures are included. The model is a fictional allocation puzzle. Main menu will label that briefly without interrupting play.

- Final verification: 56 game tests and 180 existing root tests pass (236 combined); all eight districts solved through the browser UI for three stars; native touch layouts and battery/sandbox interactions passed. Independent review findings were corrected, including historical warning scoring, saved objectives, stable keyboard focus, truthful save errors and modal audio.
- Large-city raster slowdown fixed with layered cable glow and cached facades; independent final 48-node high-detail median draw 2.9ms / p95 4.1ms. Evidence and limits: VERIFICATION.md and PERFORMANCE.json.
- Runtime, prepared registration/artwork and documentation are complete; no live wiring, merge, push or deployment.
