# Echo Miner Fix #04 Implementation Plan

> Execute natively in this session using the existing Canvas/ES module architecture; finish with fresh independent review. The supplied Fix #04 brief defines the authorized work. No merge or publication.

**Goal:** Make caves understandable through recorded discovery and a resource scanner, with fair seeded tremors that preserve the atmospheric sonar/Hunter loop.

**Architecture:** Keep cave generation, player physics, Hunter AI, sound scoring and v1 records. Add `exploration.mjs` for typed-array discovery and scanner state; `tremor.mjs` for seeded scheduling and validated temporary collision grids; `map.mjs` for cached map geometry and markers. Integrate through existing run updates and the single animation loop. No dependencies.

**Choices:** The compact map automatically fits all known terrain, lift, player and discoveries; the expanded map is a fixed whole-cave overview. Ruling after screenshot inspection: replace the initially proposed whole-cave compact scale with auto-framing (minimum 24 tiles), because early discoveries were too small on phones. Keep the lift and all discovered routes in view so it still guides extraction. Scanner is silent to the Hunter and this is stated in the UI, preserving sonar's existing risk. Hidden-passage hints identify real, uncharted narrow passages rather than adding disconnected secret rooms or modifying generation. Tremor debris temporarily blocks movement without adding a health meter; no damage on falling dust. Original tiles are never changed. Only candidates retaining connectivity of every other floor tile can activate, with additional player/Hunter/lift/crystal clearance and revalidation after warning. Sparse maps may have a dust-only tremor if no fair obstruction exists.

**Controls:** Preserve WASD/arrows, Shift, Space and Escape. Add M (compact visibility), Tab (expanded map, suspends all simulation), C (scanner), R (restart from paused screen only). Touch keeps drag movement, sonar and sprint, adds SCAN and map controls. Map Close, Escape or Tab returns to the exact previous simulation mode; visibility loss safely pauses. Saved best times/hauls/settings stay on `echoMiner.v1`; map state lasts the current expedition, not across reloads, matching the existing no-run-save design.

**Review focus:** Warning candidates occupied before activation; map/pause pointer releases; no undiscovered Hunter live tracking; map cache invalidation across restart; timing and old save compatibility.

- [x] Baseline: inspect every source, run existing integration/regression tests. Existing Canvas rendering reviewed from source; browser screenshots captured during the upgrade.
- [x] Write failing exploration tests: near/sonar discovery, persistence, fog markers, coordinates, scanner exact 400 radius / 15-second cooldown / five-second highlights, narrow-passage hints, scanner silence.
- [x] Implement exploration and scanner; run tests green, integrate with `createRun`/`updateRun` without replacing sonar.
- [x] Write failing tremor tests: deterministic 90–150 second scheduling, warning/active/recovery, collision and recovery, protected actors/objectives, connectivity across many seeds/difficulties, tutorial suppression.
- [x] Implement tremors using temporary grids and connectivity validation; integrate movement and Hunter pathfinding with the same transient grid.
- [x] Add cached fog map, scanner direction cues, warning/debris/atmosphere art, responsive UI and safe map/pause/restart controls. Test input edges and run lifecycle.
- [x] Playtest desktop/tablet/narrow portrait/landscape, inspect screenshots of maps/scanner/tremors, exercise sonar/creature/pause/restart/records, check console and fix observed problems.
- [x] Run repository regression/build, independent review and fixes; document exact checks, reachability sample size, tuning and limitations. Keep local and unpublished.

