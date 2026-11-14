# Gravity model and scientific validation

The gravity module is an independent, deterministic SI Newtonian N-body model. It has no rendering, wall-clock or game-registry dependencies. Four guided experiments cover inverse-square surface fall, circular orbits, elliptical orbits and a hierarchical three-body configuration. Free mode accepts 1–12 user bodies. Body type is only presentation: changing a planet label to a star does not change acceleration.

## Equations and numerical method

For every pair, acceleration is accumulated symmetrically as `a_i += G*gFactor*m_j*(r_j-r_i)/|r_j-r_i|³`, and the opposite force is applied to the other body. `G = 6.67430e-11 m³ kg⁻¹ s⁻²`, using the [NIST 2022 CODATA recommended value](https://physics.nist.gov/cuu/pdf/wall_2022.pdf). The spherical source radius is 6,371,000 m, the [NASA Earth fact sheet volumetric mean radius](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html). This is an ideal spherical planet; changing its mass does not automatically change its radius.

Velocity Verlet uses a half velocity kick, full position drift, recalculated acceleration and final half kick. [LAMMPS documents this Verlet sequence](https://docs.lammps.org/Developer_flow.html). There is no gravitational softening. Potential energy is the consistent pair sum `−Σ G*gFactor*m_i*m_j/r_ij`; kinetic energy is the inertial-frame sum `Σ m_i*v_i²/2`. Angular momentum is the signed z component about the coordinate origin. The center of mass and both linear momentum components are live measurements.

The normal outer step is 0.02 physical seconds for fall and 5 physical seconds for orbit/free modes. The scheduling clock rate is 1 physical second per real second for fall and 1,000 for orbit/free. Playback speed changes scheduling, never the force law. A caller may use a smaller positive step for convergence testing. The supplied outer step is never enlarged.

Close encounters refine to at most `0.02*sqrt(r³/[G*gFactor*(m_i+m_j)])` seconds and limit relative travel to one tenth of the larger of contact radius and surface gap. This is an accuracy heuristic, not a universal error guarantee. A fixed outer step with unchanged substep size retains the usual Verlet properties; encounter-dependent subdivision need not be globally symplectic. The maximum is 256 substeps per outer call. If that budget, minimum working step or finite working bounds would be exceeded, the entire outer step is rolled back, `valid` becomes false and an understandable warning asks for changed initial conditions. No browser-blocking unbounded integration is attempted.

For a surface crossing the drift is bisected to contact before finishing the velocity kick. Merging disabled means contact terminates the trial without simulating a rebound or interior gravity. Merging enabled combines mass, center-of-mass position, linear momentum and geometric volume (`R³ = R1³ + R2³`). Cascading contacts are accounted as one discontinuity, preventing undefined intermediate coincident-center potentials. Exact coincident centers in initial input are rejected.

## Energy accounting and limits

Merging is an explicitly approximate perfectly inelastic contact model. `mergeKineticLoss` records the accumulated kinetic energy converted by merges. `mergeEnergyChange` records the **signed** total mechanical energy jump, after minus before, including the point-mass potential change. It can be positive: removing the pair potential and ignoring self-binding energy is not a physical model of planetary formation. `mergeAngularMomentumChange` records the signed orbital angular momentum change; unresolved internal spin would carry the difference. Neither angular momentum about the origin nor point-particle mechanical energy is falsely claimed conserved through mergers.

`energyDrift = (E − E_initial − mergeEnergyChange)/|E_initial|`. An exactly zero initial mechanical energy uses initial `KE + |PE|` as the scale, or 1 J for a motionless isolated body. This separates integration error from contact discontinuities. Nearly parabolic trajectories can have a large relative diagnostic because the initial total energy is small.

Free configuration bodies require `id,name,type,mass,x,y,vx,vy,radius,color`. Derived `ax,ay` are never editable. IDs are safe and unique; color is `#rrggbb`. Bounds: mass 1…1e32 kg, radius 1…1e12 m, position components ±1e13 m, velocity components ±1e8 m/s. Initial center separations below 1 micrometer are rejected to avoid finite-input overflow in the unsoftened inverse-square field. Initial configuration bounds are input limits, not a claim that all extreme combinations are resolvable or physically Newtonian. During evolution, positions above 1e15 m or speeds above 1e9 m/s pause with rollback. This is a numerical working-range guard; no relativistic validity is implied. Up to 12 bodies keeps pair work bounded to 66 interactions per acceleration calculation.

Bodies are spherical only for contact and otherwise point masses. Two spatial dimensions, no atmosphere, tides, relativity, oblateness, extended-mass interiors, spin or self-gravity energy are modeled. Initial noncoincident overlaps immediately contact or merge; their bookkeeping is approximate. A three-body preset illustrates mutual perturbation and supports controlled nearby-state comparisons; it does not claim universal chaos or accurate long-term solar-system ephemerides.

## Measurements and theoretical comparisons

`radius`, `speed`, `radialVelocity` and `specificEnergy` refer to the **first two surviving bodies**, not distance from a stationary screen origin. The source recoils. Presets subtract the complete system center-of-mass position and velocity. Relative specific orbital energy uses `μ = G*gFactor*(m0+m1)`. Satellite `acceleration` is the actual inertial acceleration of body 1, including the third body when present. If only one body survives these pair measurements are null. Energy and momentum still measure the whole system.

The separate `theory` dictionary supplies initial `circularSpeed = sqrt(μ/r)`, `escapeSpeed = sqrt(2μ/r)`, `initialG = G*gFactor*m0/r²` and `orbitalPeriod = 2πsqrt(a³/μ)` for bound osculating two-body motion. This period is an initial two-body reference, especially in three-body mode, rather than a fabricated measured period. The two-body relations follow [OpenStax orbital speed, energy and period derivations](https://openstax.org/books/university-physics-volume-1/pages/13-4-satellite-orbits-and-energy), extended to the recoiling relative coordinate with the combined mass. Free fall is real inverse-square attraction; its initial 1,000 m release height is the object's center height above the planet surface, so its 1 m contact radius gives 999 m of center travel.

## Actual validation results

Command: `node --experimental-default-type=module --test games/physica/tests/gravity.test.mjs` under Node 22.19.0, 15 November 2026. All 12 tests passed. Tests were written and observed failing before implementation. Discrete apsis comparisons include sampling error; the tolerance was set to 3e-6 after separating this from the energy diagnostic, whose denominator was corrected to the initial total energy definition. These figures describe representative presets, not all possible user configurations.

| Test and duration | Maximum observed error | Test limit |
| --- | ---: | ---: |
| Default circular orbit, 10 analytical periods, dt 5 s: relative separation | 6.22795443e-7 | 7e-7 |
| Same orbit: relative total energy | 4.00429654e-13 | 3e-12 |
| Same orbit: relative angular momentum | 3.81916721e-14 | 2e-13 |
| Same orbit: COM distance from origin | 6.08530121e-27 m | 1e-20 m |
| Default ellipse, one period, dt 5 s: relative sampled pericenter error | 2.43211487e-6 | 3e-6 |
| Same ellipse: relative energy | 2.65542438e-6 | 6e-6 |
| Ellipse at dt 2.5 s: relative sampled pericenter error | 6.61686028e-7 | smaller than coarse |
| Ellipse at dt 2.5 s: relative energy | 6.63861014e-7 | less than 30% of coarse |
| Default fall to contact: speed versus inverse-square energy relation | 2.17610250e-8 m/s | 1e-6 m/s |
| Default fall to contact: relative energy | 4.85960002e-14 | 1e-12 |
| Three-body preset, 10,000 s: relative energy | 1.20613145e-14 | 1e-5 final error |
| Three-body preset, 10,000 s: COM distance | 1.64393451e-9 m | 1e-8 m final distance |
| Three-body preset, 10,000 s: relative angular momentum | 5.77315973e-15 | reported diagnostic |

Fall contact occurs at 14.2659073523 s, separation 6,371,001.000000001 m, relative speed 140.061503235 m/s. The ellipse energy error shrinks by approximately four when dt halves, consistent with the second-order integrator. Repeat three-body runs have byte-identical snapshots within the same JavaScript runtime. Independent tests check inverse-square forces, pair force symmetry, type-label independence, detached snapshots/configs, invalid input rejection, merger mass/momentum/volume/energy, high-speed contact without tunneling, multi-body merge cascades, isolated-body ballistic motion and numerical-budget rollback with finite state.

## Challenge reference solutions

Use circular mode with default mass, separation, gravity and the indicated tangential speed factor. The application owns success evaluation from actual measured state; these configurations only verify achievability.

| Challenge | Configuration | Observed result |
| --- | --- | --- |
| C1 stable orbit | velocityFactor 1 | At 6,000 s maximum relative separation deviation 2.39944208e-7, far below ±5%. |
| C2 escape | velocityFactor 1.6 | At 3,590 s separation 28,000,314.8216 m, ratio 1.400015741; outward radial velocity 3,687.96880 m/s; positive specific energy 5,580,253.31903 J/kg. |
| C3 transfer | velocityFactor 1.1 | Maximum radius over 25,000 s is 1.53164633081 times initial radius, inside 1.45–1.55. Specific energy remains negative. Analytical apocenter ratio is 1.21/0.79 = 1.53164556962. |

The stable reference has negative specific energy and never reaches the escape region. Escape has positive specific energy and cannot satisfy a bound transfer. A circular factor 1 orbit never reaches the transfer target. User settings are not used as a hidden completion key.

At this checkpoint the complete then-present PHYSICA test suite also passed: 45/45 tests with `node --experimental-default-type=module --test games/physica/tests/*.test.mjs`. Other lab owners may add tests after this checkpoint. No browser testing, shared Arcade changes, Git actions or deployment were performed by the gravity worker.
