# Physics and mechanism notes

World coordinates use pixels, y down and clockwise radians. `Simulation.step()` advances exactly 1/120 second; rendering and playback speed never enter physical equations. Identical initial data and trigger produce identical numeric body snapshots in the same JavaScript runtime. Cross-engine bit-for-bit floating-point identity is not guaranteed.

## Solver

`PhysicsWorld` integrates gravity and solves real contacts between circles and oriented rectangles. Rectangle contacts use separating axes, intersected polygons and a two-point face manifold; circle contacts use closest points in rectangle-local coordinates. The sequential solver applies linear and angular normal impulses, Coulomb friction and low restitution. Position correction is separate from velocity. Every fixed step uses 2–24 adaptive substeps, targeting no more than 3 pixels of motion per substep. The supported speed limit is 1200 pixels/second, and angular speed is limited to 16 radians/second. This provides marble collision protection for the supported catalog geometry without a swept analytical time-of-impact solver.

Sleeping requires low linear and angular speed for 0.6 seconds and objects wake on physical impact or explicit impulse. The broad phase uses conservative bounding radii and stable pair ordering. Pivot bodies have zero inverse linear mass, retain angular inertia, remain exactly at their anchor, and clamp rotation to ±0.55 radians. Locked is solely an editor restriction; locked dominoes and marbles remain dynamic.

This is a lightweight toy solver. Dense piles can jitter and do not guarantee engineering-grade stacking. Very close domino spacing may absorb the starting impulse without a successful cascade: reaction success depends on actual spacing, support and contact, not an activation script.

## Eight gadgets

- Domino: 14×56, mass1. Default start is a horizontal impulse50 near its top. Physical rotation marks a tipped domino.
- Marble: radius10, mass1.5; friction generates actual angular rolling motion.
- Ramp: 100×10 fixed rotated rectangle, angle within ±1.35.
- Spring: fixed axis-aligned34×18 housing; saved angle controls the visible launch direction. Moving physical contact or a visible switch/gear connection starts 0.1 second compression. One shot adds150–650 pixels/second (default300) to the closest physical object in the front launch zone. That zone uses the object's center projected along the launch direction0..52+bodyRadius, and perpendicular distance≤18+bodyRadius. A body behind the housing cannot steal the loaded cargo's impulse. No target means an empty discharge and a truthful event, never a successful activation. The housing does not rotate when its launch arrow rotates.
- Gear: fixed collidable radius22 housing with an explicit deterministic relay, rather than simulated teeth. Contact/manual input rotates through1.25 radians at3 radians/second. At0.8 radians, one output activates connected spring/gears; linked gears turn opposite directions. Activity terminates.
- Seesaw: 120×10 body constrained to its fixed center; actual load/contact angular motion is required for activation.
- Switch: 28×10 nonblocking contact sensor, latched once. A valid moving body must physically enter; its accept setting filters marble/domino/any. Outputs follow visible links.
- Finish: 30×44 contact sensor with the same body filter. Signals and elapsed time cannot activate it. All required objective IDs must activate before success.

Sensors and gadgets must not positively overlap starting objects by more than0.4 pixels; exact resting contact is legal. There is no special spring-overlap placement exemption: place cargo just in front of the housing and inside its visible launch zone.

Snapshots copy all body/gadget state, activated IDs, status and last meaningful interaction. Terminal notifications remain in the event queue while preserving that interaction for failure highlighting. Event queues are bounded256. The physics never reads the level solution.

## Measured local stress checks

Executed in Node22.19.0 on this Windows workspace on14 November2026. These are local CPU measurements, not browser FPS or phone results. Each run simulated1800 fixed steps (15 simulated seconds), with72 dominoes plus one static2400-pixel-wide floor and one initial top impulse50:

| Spacing | Dominoes tipped | Mean step |95th percentile | Maximum step | Maximum broad-phase candidate pairs | Maximum contacts across substeps |
|---|---:|---:|---:|---:|---:|---:|
|26px |72/72 |4.12ms |8.34ms |30.78ms |426 |187 |
|30px |72/72 |4.05ms |6.46ms |14.02ms |294 |188 |

Peak awake body count was72. An additional100-domino dense22-pixel-spacing run remained stable but did not cascade (0 tipped after15 seconds), illustrating why tightly packed constructions need adjustment. That run measured3.14ms mean and7.09ms95th percentile. The application caps layouts at120 gadgets and16 platforms; practical mobile budgets can be lower and require device testing.

## Verification

The physics and gadget test files exercise upright resting support, rotated SAT, angular domino momentum transfer, circle impacts, rolling friction, high-speed thin-ramp collision, pinned seesaw load response, speed safeguards, physical finish/type filters, one-shot springs, linked switches/gears, deterministic detached snapshots, highlight preservation and hostile/malformed imported data. The content suite separately runs all twelve reference builds through the real editor and simulation, twice, and checks required mechanisms and efficient scoring.

Sandbox exception: an escaped auxiliary marble no longer immediately stops the workshop; ongoing mechanisms can finish. Escaped balls remain bounded by the normal Sandbox time limit (maximum60 seconds). Puzzle lost-marble behavior is unchanged. A regression exercises an escaped ball alongside an active launch and confirms eventual timeout.

The added maximum-cap stress regression uses120 dominoes plus one floor for300 fixed steps and asserts finite state, floor support and bounded velocities. A separate local run measured5.00ms mean,16.90ms95th percentile and31.31ms maximum per step, with718 maximum broad-phase candidate pairs. This is a deliberately dense stability case, not a promised cascade or mobile frame rate.
