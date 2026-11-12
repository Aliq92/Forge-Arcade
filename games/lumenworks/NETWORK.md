# Fictional network rules

`network.js` exports only `validateNetwork`, `connectionError`, `allocate`, and `advanceBatteries`. It has no rendering, timing, storage, DOM, or randomness dependencies.

Power is measured in PU. One PU used for one active simulation second consumes one EU. `allocate(board)` previews the current configuration without advancing time. `allocate(board, seconds)` also respects energy available and storage room over that interval; it still does not mutate anything. `advanceBatteries(board, seconds)` requires a finite interval greater than zero and no longer than 60 seconds, returns that allocation, and changes only battery `energy`. The game uses much smaller active steps. Planning and paused time do not consume energy.

## Buildings and capacities

Every substation and switch is split into an input and output vertex joined by its rated throughput. Sources and directed cables also have capacities. An open switch, disabled cable, or damaged cable transmits nothing.

Buildings are considered in ascending numerical priority (default 0), then ASCII ID order. Each demand is all-or-nothing. Edmonds–Karp residual augmentation may reroute earlier accepted flows without decreasing their served demands. Failed partial attempts restore the entire previous allocation before trying the next building. Sorting nodes and edges makes the result independent of array order. Multiple sources, multiple paths, and cycles never create power.

Hard limits withhold demand rather than transmitting above a rating. A disconnected building is simply unpowered. If an active directed source-to-building route exists but capacity cannot satisfy that building, the failed residual network's minimum cut identifies constrained sources, routers, or cables. Warning text reports the attempted building demand, additional available supply, and actual final flow versus the constrained rating. A warning's `requested` field is that building's demand, not an imaginary above-rating usable cable flow. Feasible parallel routes produce no warning. Battery support with an empty store remains a structurally connected source with zero available output, so an attempted unsupported load receives a capacity warning.

## Batteries

Batteries are exclusive terminals:

- `support`: output is at most `dischargeRate` and, for positive intervals, `energy / seconds`.
- `charge`: input is at most `chargeRate` and, for positive intervals, remaining storage divided by seconds.
- `off`: no input or output.

They are not pass-through routers. Valid input and output cables may remain attached in every mode; `connectionError` does not reject an otherwise valid cable because of the battery's current mode. Allocation disables incompatible paths.

After all buildings are allocated, a separate residual-capacity network charges batteries in ID order. It uses only unused generator output and remaining forward cable/router throughput. It cannot reroute or reduce building flows, use a support battery as its source, or transfer battery energy to another battery. Generator arcs are considered before battery arcs on equal-length building paths; shortest residual path length otherwise determines source choice. The model does not promise globally minimal battery consumption.

For every result:

`generatorUsed + batteryUsed = totalServed + chargePower`

`batteryDelta[id] = (chargePower - dischargePower) × seconds`

`totalSupply` is available generator-plus-support-battery power; it is not actual consumption. `nodes[id].flow` is actual output for generators, throughput for routers, served demand for buildings, and active charge or discharge power for batteries. `powered` means positive actual usable flow. `capacity` is the rating for generators/routers, current available mode-specific rate for batteries, and zero for buildings, whose requirement is in `demand`.

## Layout validation

The graph accepts at most 48 nodes and 96 edges, finite bounded numeric data, unique safe IDs, known component types, valid references, in-bounds coordinates, exclusive battery modes, valid objectives, and well-formed geometry. Optional metadata remains optional. New cables obey direction, self-link, duplicate, allowed-link, length, and cable-budget restrictions. Restricted rectangles include their boundary; a straight cable touching one is rejected. Existing edges are validated against the same geometry and link restrictions. Battery mode changes do not invalidate a save.

Run the adversarial domain checks with:

`node --test games/lumenworks/tests/network.test.mjs`

Tests include independent enumeration of every cut in 120 varied cyclic layouts, deterministic priority, residual rerouting, shared bottlenecks, partial rollback, interruptions, battery depletion and room limits, and cumulative power/energy conservation.
