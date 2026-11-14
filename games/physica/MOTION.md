# Motion & Forces: model and validation

The module is independent ES JavaScript with no imports or runtime dependencies. Four guided descriptors M1–M4 and the five modes implement the shared API. Reset means constructing a new model from `.config`. Configurations are detached from live state. `normalizeConfig` rejects unknown modes/fields, unsafe or duplicate IDs, nonfinite numbers, unsupported ranges, and more than twelve Free bodies. Empty Free scenes are valid.

## Coordinates, quantities, and integration

All physical quantities use SI. World x points right and y points up. Angle controls use degrees and are converted internally. The timestep is fixed at 1/240 physical second; `.clockRate = 1`. `step()` only accepts that fixed timestep. State measurements are never rounded internally. No frame timing enters the force equations.

Projectile and horizontal-force motion solve the constant-drive, linear-drag equation exactly over each step. The exponential integrator uses `expm1` plus small-argument series so extremely small positive drag approaches zero drag without cancellation or division overflow. Air drag is the idealized law **F = −b v**, where b is in kg/s. This is not a universal aerodynamic model.

Projectile touchdown uses a bounded root solve of the actual within-step vertical trajectory, interpolating the last physical step rather than reporting a below-ground sample. Its measured peak is found from the within-step zero of actual vertical velocity. `range` and `flightTime` remain null until touchdown; `maxHeight` is the highest position reached so far. `.theory` contains separate vacuum range, flight time, and maximum height only when g > 0 and drag = 0. There is no fabricated vacuum comparison with drag. The projectile is a translational point; its visible radius does not alter the landing height. At terminal impact velocity is the incoming velocity: no ground bounce or impact-energy loss is modeled. Weight/drag vectors at that terminal sample refer to the incoming flight, not a supported resting body.

Inclined-plane distance s is **positive downhill**, so world position is `(s cos θ, −s sin θ)`. Applied force is parallel to the plane, positive downhill. The normal is mg cos θ. At rest friction balances the drive if its magnitude is within μsN. Otherwise μkN opposes actual sliding. Each constant-acceleration interval is integrated exactly; a stop within a step splits that step at zero velocity. Static holding or downhill restart is then reevaluated for the remainder, so friction cannot spuriously reverse velocity. μk > μs is rejected for this particular Coulomb model. The plane is infinite; it is not a finite ramp with an undisclosed end collision. Gravitational potential has an arbitrary zero at s = 0 and may become negative. With applied force, mechanical energy need not be conserved: applied work is FΔs.

The horizontal-force lab uses a frictionless support: normal balances weight, applied horizontal force and air drag determine acceleration. Acceleration and net-force scalar measurements are magnitudes; the correctly signed components are available in body `ax/ay` and state force vectors. Force arrows are N, separate from body velocities in m/s. Force vectors in `.state.forces` refer to the first body, identified by `bodyId`.

## Contacts and energy accounting

The guided collision is an isolated one-dimensional pair starting at x = −2 m and +2 m with contact radii 0.35 m. Velocities change only at the actual calculated contact time. The normal impulse uses restitution e in [0,1], conserves linear momentum, and has no tangential friction, spin, or boundary impulses. For e = 0 the bodies have the same post-contact velocity and remain adjacent. Configurations moving apart do not collide. `.theory.v1/v2` are conditional post-contact formulas; they do not prove contact occurred. Use `.state.collisionOccurred` for that event.

`dissipatedEnergy` records translational mechanical energy converted by drag, sliding friction, and inelastic contact. It represents unmodeled heat/deformation/sound, not disappearance of total energy. Guided elastic contact conserves kinetic energy; guided inelastic contact satisfies KE + converted energy = initial KE. `momentumError` is an absolute horizontal pair-momentum change in kg·m/s and is null outside the isolated guided collision.

Free Mode configuration accepts `g, drag, restitution, width, height, bodies`. Each body accepts `id, type, mass, x, y, vx, vy, radius, color`; type is `ball` or `block`. Both shapes use circular collision envelopes. Blocks do not have face contact, torque, spin, or rotational energy. This deliberate translation-only approximation is displayed in a warning, not presented as rigid-block mechanics. Config position bounds use the enclosure and radius; colors are six-digit hex strings. Up to twelve bodies may be added/removed by rebuilding from configuration. Every body exposes smooth gravity/drag `ax/ay`; these do not include instantaneous contact impulses. Scalar kinematic measurements refer to the first body; energy and horizontal momentum sum all bodies.

Free contacts use bounded sequential normal impulses, mass-weighted overlap correction, and substeps limiting ordinary travel to a fraction of the minimum diameter (maximum 64 microsteps). Fixed walls exchange momentum with the enclosure, so total body momentum is not conserved across wall contact. Arbitrary overlapping or simultaneous contacts are approximate; initial overlaps receive an additional warning. Bounds are enforced after pair correction. Penetration correction and discrete wall timing can change gravitational potential; `.measure().numericalEnergyError` explicitly reports **KE + PE + converted energy − initial mechanical energy** in J. This Free-only residual is not relabeled heat. Dense piles and impact forces are not precision scientific results. For clean elastic collision conservation measurements use M4, or isolated separated Free contacts with g = 0. No constraint solver or static stacking claim is made.

Guided trajectories stop with a warning if position magnitude exceeds 10⁶ m or speed exceeds 10⁵ m/s. They remain finite. Free spatial bounds are the configured box. Unsupported configuration errors are understandable, rather than silently clamped physical inputs.

## Automated validation: 15 November 2026

Command: `node --test games/physica/tests/motion.test.mjs` — **15 tests pass**. The tests check trajectories and touchdown, actual peak height, drag dissipation, static threshold, kinetic direction and stopping without reversal, inclined vector sums, F/m, exact linear drag, arbitrarily small drag, actual delayed collision, unequal masses, e = 0/.4/1, energy conversion, Free add/remove and both shapes, oblique vector momentum and KE, crowded finite enclosure behavior, detached snapshots/reset, malformed data rejection, and C4–C6.

The reproducible analytical sweep spans launch speeds 1/10/50/100 m/s, angles 5/30/45/85°, launch heights 0/20 m; collision masses 0.05/1/100 kg and restitution 0/.2/1. Maximum observed absolute errors on Node 22.19.0:

| Comparison | Maximum observed absolute error |
| --- | ---: |
| Vacuum range | 6.321 × 10⁻¹¹ m |
| Vacuum flight time | 1.084 × 10⁻¹² s |
| Vacuum maximum height | 1.507 × 10⁻¹¹ m |
| Guided pair momentum | 1.137 × 10⁻¹³ kg·m/s |
| Guided pair KE + converted-energy budget | 5.685 × 10⁻¹⁴ J |

These are measured floating-point errors for those fixtures, not blanket guarantees over arbitrary contacts or all possible runs. Test expectations derive independently from governing equations, not `.theory` values.

Actual motion challenge references:

| Challenge | Setup | Observed state |
| --- | --- | --- |
| C4 | speed 10 m/s, angle 45°, g 9.81 m/s², no drag, y₀ = 0 | landed; range 10.1936799184505 m; flight time 1.44160403911630 s; maximum height 2.54841997961265 m |
| C5 | θ = 0°, v₀ = 5 m/s, μk = .255, μs = .3 | stopped; distance 4.99690192080911 m; final speed 0 |
| C6 | equal 1 kg masses, u₁ = 3 m/s, u₂ = 0, e = 1 | actual contact at 1.1 s; v₁ = 0; v₂ = 3 m/s; momentum change 0 |

The full lab test suite also passed at the time of validation (61 tests in the final worker checkpoint, including integration and challenge checks added concurrently). UI/browser interaction is owned and checked by the coordinating agent; it is not established by these model tests.

## Scientific references

Equations and explanations are original concise descriptions checked against the publisher's textbook, accessed 15 November 2026:

- [OpenStax University Physics, 4.3 Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion): independent components, uniform-gravity trajectories, differing launch/landing height.
- [OpenStax University Physics, 6.2 Friction](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction): static force range and sliding friction direction.
- [OpenStax University Physics, 9.4 Types of Collisions](https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions): isolated momentum conservation and elastic/inelastic kinetic-energy distinction.
