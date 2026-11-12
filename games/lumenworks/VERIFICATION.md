# LUMENWORKS verification and readiness

Verified locally on 13 November 2026 MYT. Branch: `codex/lumenworks-city-that-wakes`, based on published Arcade main `8fca8a4e06c440276633dd2820a4c67fb89ea856`.

## Thirteen-district expansion — latest verification

- **70 game tests and 180 existing root tests pass (250 combined)** after the expansion.
- All13 districts completed through normal browser UI for three stars, including the new isolation switch and finite reserve holds. Original eight board definitions are unchanged.
- Legacy eight-star-array saves preserve progress/settings/sandbox and unlock district9. District13 completion leads to Sandbox; district8 now advances to9.
- Exact named connection hints, repeated advice without edits, camera-framed FROM/TO ports, real connection and next-step refresh passed at1440×900,390×844 and320×568. Asking leaves board, energy, history and stars unchanged. No runtime errors.
- Pure tests also complete every district using hints alone, repair optional wrong-route and isolated-cable states, and refuse an insufficient battery hold. Independent review checked195 edited layouts and found no actionable issues.
- Screenshots: test-results/lumenworks/hint-1440.png, hint-390.png, hint-320.png; raw report hints-browser.json. Local-only build remains unmerged/unpublished.

The baseline evidence below documents the initial eight-district build. The table’s14-node fully lit scene is **original district8**, not the added district13. The expansion adds no continuous simulation calculations; hint previews run only on request.

## Automated checks (initial build)

- **56 Lumenworks tests pass**, covering allocator capacity/priority/residual rerouting/cycles, strict malformed data, geometry, finite battery charging/discharge/conservation, all eight solutions, actual Game action dispatch/stars/unlocks/reset/undo, progress validation and blocked storage, audio/ambient opt-in and bounded voices, projection/hits/render purity/caches, and pointer/pinch/cancel logic.
- **236 tests pass** in the combined existing root suite and Lumenworks suite, zero failures. This includes 180 existing root tests; it is not a claim that every nested game's independent suite was run.
- Independent min-cut enumeration checks 120 varied cyclic layouts. An 80-step mixed battery test checks cumulative EU conservation.
- Every authored reference produces zero warnings at every edit and hold, completes the real objectives, and awards three stars through the actual Game. Battery Night consumes 32/40 EU; the finale consumes 24/30 EU. Successful holds stop automatically.
- Static production copy build succeeds. Runtime uses relative assets with no external requests, framework, backend or new deployment configuration.

## Browser playthroughs

Chrome 157 on this Windows host, Playwright, local HTTP server:

| Check | Observed result |
| --- | --- |
| Desktop 1440×900 | Native cable drag lights the actual building; Undo restores it |
| Districts 1–8 | Complete UI playthrough via accessible connector/component controls and real-time stability checks; three stars each |
| Progress / replay | Reload retains eight three-star results; all eight district buttons unlocked |
| Touch layouts | 390×844, 320×568, 844×390: native two-port touch connection; no page overflow; mobile drawer opens/closes |
| Touch battery district | Real Support mode, stability timer and completion; opening menu freezes reserve energy |
| Touch sandbox | Place an empty battery, inspect/remove it, then Undo restores it |
| Touch cable gesture | Native CDP touch drag creates the real cable; duplicate via keyboard connector rejected without extra edge |
| Keyboard | Component action focus survives periodic refresh; native Space activates focused Pause/Resume |
| Save / load | Save city, start empty city, reload saved components |
| Settings | Sound, volume, reduced motion and quality persist through reload; ambient engine additionally unit-tested |
| Unavailable storage | Game remains playable; Save displays failure rather than false success |
| Runtime / resources | Browser playthrough and benchmark report zero page/runtime or game HTTP failures |

Screenshots were inspected for menu composition, illuminated final city, mobile legibility, HUD obstruction and tool placement. The mobile Notebook control was moved away from the power status and its drawer kept clear of the bottom controls. A transient toast can overlap instructional text; it does not intercept input. Small city views provide pan/zoom and the notebook alternative.

The main playthrough uses real DOM controls for every solution; it never writes simulation state. Performance fixtures deliberately install a solved board to measure rendering separately. Mobile progression is seeded only for the independent battery interaction test; persistence/unlocks are verified by the full desktop campaign.

## Performance

`PERFORMANCE.json` retains the final independently rerun raw benchmark: 180 sampled frames per case after 15 warm-up frames, 1440×900 CSS pixels at DPR 1.5. CPU draw submission and actual integrated frame intervals are measured separately.

| Scene | Detail | Median / p95 draw | Median frame interval |
| --- | --- | --- | --- |
| Fully lit original district8, 14 nodes / 13 cables | High | 1.9 / 2.8 ms | 9.1 ms |
| Same scene | Low + reduced motion | 1.4 / 2.0 ms | 9.9 ms |
| Fully lit Sandbox, 48 nodes / 47 cables | High | 2.9 / 4.1 ms | 16.9 ms |
| Same scene | Low + reduced motion | 2.2 / 3.4 ms | 11.9 ms |

An initial large-city slowdown was fixed by replacing blurred cable shadows with inexpensive layered strokes and caching stationary facades/windows/equipment. Terrain and city caches are each bounded to one current layer; flow/served/mode/energy changes invalidate the appropriate city appearance. Trams and factory steam stay bounded dynamic overlays. DPR is capped at 1.5. Reduced motion suppresses moving pulses/vehicles/celebration; low detail reduces effects. Allocation runs on edits or active battery changes, not every render frame.

Final large low-detail sample retained about 2.83 MB JS heap after forced GC and 408 DOM nodes, matching its pre-sample DOM count. Canvas backing stores are additional browser-managed memory. The test is short and does not establish a long-duration memory guarantee.

Headless Chrome can schedule frames faster than a physical display. These are this host's measurements, **not physical Android/iPhone FPS**, Safari compatibility evidence or a sustained device thermal test. Full 96-cable worst-case Sandbox raster performance was not benchmarked; the documented stress scene contains 47 active cables. Low detail remains available for slower devices.

## Review and resulting fixes

Independent read-only review found and the build corrected: planning overloads omitted from historical scoring, worse replays erasing objective flags, missing reference wait dispatch, periodic refresh destroying focused action buttons, false successful-save messages, modal audio lifecycle problems, ambiguous generator/battery totals, missing required-building indicators, native Space suppression and seconds/milliseconds animation mismatch. Regressions are covered by the final tests/playthroughs.

## Initial standalone deployment boundary (historical)

Complete standalone runtime and prepared registration/card artwork are present. No live launcher, shared card system, other game, deployment workflow or project settings were changed. Unrelated pre-existing work remains untouched. `integration/README.md` describes the concrete future integration steps; ELEMENTAL's hidden entry remains unaffected.

**Not merged, pushed, deployed or published.** The build brief explicitly withholds those actions. Ready for a separate, explicit Forge Arcade integration request. Physical mobile and non-Chrome browser checks remain the material verification limits described above.

## Subsequent integration authorization

The user has now explicitly requested Forge Arcade integration, aligned cards and pixel art. This supersedes the initial standalone publication boundary. The shared launcher wiring, six-layout alignment checks, new artwork and publication verification are recorded in INTEGRATION.md.
