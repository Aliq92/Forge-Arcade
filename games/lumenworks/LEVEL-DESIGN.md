# Lumenworks authored campaign

All thirteen reference action lists live in `levels.js` as `LEVELS[n].solution`. They are executable data, in the exact order needed for a clean first attempt. The original eight boards retain their layouts and references. `tests/levels.test.mjs` applies every action through the real directed-network validation/allocation functions, checks every intermediate allocation for warnings, and advances timed checks in quarter-second intervals. It also replays every exact action through `Game.act`, including stability checks, and verifies three actual stars.

| Level | Essential demand / generation | Routing decision | Three-star cables | Stability |
| --- | --- | --- | --- | --- |
| First Light | 6 / 6 PU | Three 2-PU houses; one source-to-house cable each | 3 | Immediate |
| The Riverside | 6 / 6 PU | Required house, apartments and hall; leave optional 4-PU shop dark | 3 | Immediate |
| Wake the Market | 9 / 9 PU | Market 4 + hall 1 through 5-PU hub; shop 2 + house 2 through 4-PU hub | 6 | Immediate |
| The Broken Line | 6 / 6 PU | Damaged feeder stays; route generator → Hill Relay → Old Town Hub around canal | 6, including broken feeder | Immediate |
| Battery Night | 10 / 6 PU | Generator and battery feed 10-PU hub; battery supplies 4 PU from 40 EU | 5 | 8 seconds, consumes 32 EU; 8 EU remain |
| The Tram Returns | 12 / 12 PU | Homes 4 + 2 use one 6-PU hub; depot uses the other; optional 5-PU factory waits | 5 | 4 seconds |
| Citywide Balance | 15 / 15 PU | East 8-PU generator supplies 4 + 4; west 7-PU generator feeds closed switch and 3 + 2 + 2 | 8 | 5 seconds |
| The Grand Illumination | 25 / 22 PU | North 12 PU behind a switch; south detour supplies 10 PU plus battery 3 PU | 13, including broken feeder | 8 seconds, consumes 24 of 30 EU |
| Harbor Lights | 12 / 12 PU | Combine two 6-PU pier sources in a 12-PU exchange before branching to 5 + 4 + 3; optional gift shop waits | 5 | 5 seconds |
| Hilltop Relay | 14 / 14 PU | Route through two gates to terraces rated 8 and 6 PU; divide demand as 5 + 3 and 4 + 2 | 9, including broken feeder | 6 seconds |
| Glasshouse Quarter | 10 / 8 PU | Upper hub uses 6 PU; lower hub combines remaining 2 generator PU and 2 reserve PU for demand 3 + 1 | 7 | 6 seconds, consumes 12 of 20 EU |
| Night Shift | 16 / 16 PU | Open the initially closed optional-workshop gate; separate factory 6, tram 6 and homes 2 + 2 across three hubs | 9, including two fixed workshop cables | 5 seconds |
| Festival of Lights | 22 / 18 PU | North splits into hubs rated 6 and 4; southern detour and gate deliver 8 PU plus 4 reserve PU to a 12-PU hub | 12, including broken feeder | 8 seconds, consumes 32 of 40 EU |

The original Grand Illumination contains every recognizable building style: house, apartment, market, shop, tram depot, factory and public hall. The five added districts extend source aggregation, asymmetric terrace routing, finite reserve placement, isolation of a preconnected optional load, and a combined festival finale. Optional loads and alternative hub assignments provide meaningful capacity choices without adding mandatory resource grinding. Restricted gardens and canal basins reject straight segments that cross their world-axis rectangles, including their boundaries.

## Planning and finite energy

Planning never consumes battery charge. Support mode is a source, charge mode a generator-fed sink, and off mode is inactive. Battery references connect both supplies and activate Support before attaching demand; this avoids a temporary insufficient-supply warning that would otherwise lose an optional star. Downstream-first construction is also safe in nonbattery levels because disconnected and damaged branches do not create overload warnings.

Only the explicit stability check advances active simulation time. The core battery puzzle has two seconds of reserve beyond its required eight-second hold. The Grand Illumination and Festival of Lights have the same two-second margin. Glasshouse Quarter leaves four seconds of reserve after its six-second hold. Both new reserve puzzles start with finite stored energy and require no charge-then-support phase. Batteries eventually empty; no reference relies on unlimited energy or passive recharge.

The damaged feeders are immutable landmarks: they carry zero flow and prevent replacing the same source/destination link. Their existing cable count is deliberately included in both the allowed limit and the three-star budget. Night Shift also retains two fixed, healthy workshop cables: opening Workshop Gate isolates that optional branch before essential demand is connected. Leaving it closed creates a constrained-demand warning once all required loads are attached. All reference actions use the normal Cable, Switch or Battery controls. The reference solutions do not depend on a debug bypass.

## Sandbox

`createSandbox()` returns a fresh 12×10 layout with one 32-PU generator, one 24-PU substation and one unconnected 2-PU house. No objectives, mandatory check or campaign unlock is attached. Cable rating is 16 PU; placement remains bounded to 48 nodes and 96 cables. Newly placed batteries are created empty by the game controller and require deliberate generator charging before support. This preserves the campaign's finite-capacity model while allowing free experimentation.

## Verification

Run `node --test games/lumenworks/tests/levels.test.mjs` from the repository root. The 19 checks cover ordered campaign metadata, valid bounds and references, all thirteen completion paths and cable budgets, direct Game action replay and available tools, zero historical warnings, bounded capacities, stability holds, battery conservation/depletion, damaged cables, restricted shortcuts, optional-demand isolation and independent sandbox data.
