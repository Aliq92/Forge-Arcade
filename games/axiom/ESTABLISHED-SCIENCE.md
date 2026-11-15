# Established physics laboratories: scientific implementation and validation

All 24 IDs in `API.md` are implemented by `src/physics/established.mjs`. This module exports `EXPERIMENTS`, `createModel(id, params={})` and nonthrowing `validate(id, params={})`. Physics modules have no DOM, renderer, random-number or external-network dependency. SI is used for numerical readings; the copied launch/release controls explicitly retain degrees. Dimensionless readings use `1`.

The scientific status describes the selected model in its stated domain. Ideal gas, rigid bodies, point charges and ideal circuit elements are idealizations of established laws, not complete material models. Phase heating, Fraunhofer diffraction, paraxial thin lenses and educational Cauchy dispersion are explicitly marked `approximation`.

## Runtime contract

Every factory validates the plain input object, allowed keys, finite ranges, integer controls and relevant coupled constraints. Invalid inputs throw a descriptive error; `validate` converts it to `{ok:false,config:null,errors:[...]}`. No invalid physical values are silently clamped. A source singularity or infinity is represented by unavailable (`null`) readings with an explanation.

Models expose independent JSON snapshots, numeric/null measurements and unit metadata, actual scene primitives, and profiles evaluated from the same selected physical parameters. Static analytical models have `dynamic:false`; calling their step validates the step but does not advance physical time. Their graphs are parameter/position curves, never fabricated time histories. Dynamic models use fixed physical increments independent of display rate. Profiles have at most 401 points, visual particle ensembles at most 80 markers. Marker-size, direction normalization and schematic coordinate qualifications are included in captions.

The public step domain rejects nonfinite/nonpositive or excessive steps. Exact-copy wrappers use their original step restriction: at most the configured step, with copied motion requiring its exact step. Shared models allow up to four base increments by the universal contract. The app normally supplies the base increment; changing playback speed must only change how many base increments run.

## Model coverage and limits

| ID | Implementation and quantities | Working domain / excluded physics |
| --- | --- | --- |
| force | Exact constant-drive/linear-drag propagation; position, velocity, net acceleration, kinetic energy and dissipated energy | Horizontal point translation on frictionless support; weight balanced; no quadratic drag |
| projectile | Exact constant-gravity/linear-drag propagation with bisection ground/apex events; range, flight time, maximum height and motion | Flat ground, uniform gravity, no wind/spin; point-center landing. Independent profile uses stable small-drag exponential series |
| collisions | Event-located 1D restitution impulse; both velocities, momentum, energy conversion | Isolated smooth pair; no spin/deformation dynamics; separated or nonclosing bodies need not collide |
| orbits | Barycentric Newtonian two-body velocity Verlet, bounded close-approach substeps; energy, angular momentum, separation and drift | Point forces outside spherical contact; stop/merge control; no GR/atmosphere/tides. Merge spin/internal energy unresolved and mechanical jumps reported separately |
| pendulum | Copied nonlinear RK4 angular equation, crossing-measured period and energy | Point bob, rigid massless rod, optional angular damping; small-angle period is a reference only |
| rotation | Exact constant torque: θ=ω₀t+τt²/(2I), L=Iω, work=τΔθ and power=τω | Constant rigid-body inertia, no bearing loss; illustrative rotor radius does not infer mass distribution |
| double-pendulum | Standard coupled point-mass Lagrange equations, RK4, second release perturbed in lower angle; physical end-point separation and energy drift | Massless rigid rods, uniform gravity, undamped. Default 1/480 s; further bounded by √(L/g). Time cap 600 s. Sensitivity does not establish chaos for every release; long-time individual paths are numerical predictions |
| ideal-gas | PV=nRT, U=3nRT/2, N=nNA, helium-model vrms=√(3RT/M), selected-temperature isotherm | Dilute equilibrium classical monatomic ideal gas. Fixed illustrative helium molar mass 0.004002602 kg/mol; no simulated molecular collisions; marker count is not N |
| heat-transfer | Exact two-lump exponential thermal exchange; both temperatures, total C₁T₁+C₂T₂, entropy change and signed heat rate | Constant positive capacities/conductance, well mixed bodies, isolated pair. Energy uses a common arbitrary reference; constant-C extrapolation is not a third-law material model |
| carnot | Four actual ideal-gas PV branches with γ=5/3; Qh, Qc, work and efficiency | Requires Tc<Th; reversible quasistatic ideal reservoirs. Profile’s enclosed area approximates exact work at finite plotting resolution |
| microstates | Stable logarithmic binomial multiplicity, kB ln Ω, Ω/2ᴺ and probability distribution | Distinguishable independent classical particles, two equal compartments, 1≤N≤500, 0≤k≤N; no factorial overflow |
| phase-change | Continuous piecewise sensible/latent heating of water from 253.15 K; temperature, melt/vapor fractions | Approximately 1 atm; constant approximate cp(ice/liquid/steam)=2100/4186/2010 J/(kg K), Lf=334000 and Lv=2256000 J/kg. Specific energy limited to 4 MJ/kg; no pressure variation/supercooling/critical model |
| electric-field | Coulomb vector field and infinity-referenced potential, direction grid and signed line profile | Isolated stationary vacuum point charge; r<0.05 m excluded without artificial softening. Inside mask readings are null. Grid arrows show direction only |
| lorentz | Exact uniform-B orbit/straight-line limit; force components, kinetic energy, force·velocity and radius | Nonrelativistic test charge, no electric field/radiation/self-field/collisions. Macro-scale default is an ideal test particle. Profile spans one orbit or at most 20 s. Zero/unrepresentably large curvature radius unavailable |
| dc-circuit | Copied modified nodal solver, real series/parallel preset topology, source/load power, meter readings and KCL/KVL/power residuals | Ideal DC source, wires and meters; positive linear resistances, optional open switch. No free arbitrary-layout editor; no temperature-dependent lamps |
| rc-circuit | Exact charging/discharging exponential from selected initial voltage; charge, current, stored energy and RC | Ideal fixed R/C/source; no leakage or parasitic L. Positive initial capacitor voltage may exceed source, giving negative charging current |
| rlc-circuit | RK4 q/i/resistor-heat system, damping/frequency-bounded step, energy+heat residual; analytic under/critical/overdamped profile | Isolated linear series discharge from charged C; q̇=i fixes signed current convention. No drive/nonlinear components |
| induction | Exact N-turn coil flux/linkage and −d(NΦ)/dt emf; coil normal and plane follow actual angle | Constant externally maintained rotation in uniform B; oriented positive emf. No invented load current/torque |
| traveling-wave | Exact nondispersive traveling string or fixed-end standing normal mode; actual displacement, fλ, μv² tension, energy density and mean power | Ideal linear transverse string, no damping. Standing maximum antinode amplitude A, zero mean net power; probe must be on displayed interval |
| double-slit | Normalized cos² interference times sinc² finite-width diffraction envelope; actual screen angle/path difference | Equal coherent scalar slits, width≤separation, d²/(λL)≤0.2 far-field qualification; no Fresnel near field or polarization |
| snell | Signed refraction, TIR, critical angle and unpolarized lossless Fresnel reflectance/transmittance | Positive real homogeneous dielectric indices; planar interface. TIR gives no propagating transmitted angle, null rather than clamped |
| thin-lens | Signed image distance/magnification, paraxial principal rays and dashed virtual backward extensions | Real object, ideal thin lens, |f|≥0.01 m. Object at front focus gives image-at-infinity null. Large/distant rays may leave the display bounds; no aberration/diffraction |
| dispersion | Cauchy n(λ), phase velocity and prism minimum deviation | 400–700 nm only; n=1.5046+0.00420/λµm² is an illustrative crown-glass model, **not a precision catalog fit**. Each wavelength’s own minimum-deviation incidence is assumed |
| doppler | Exact classical collinear acoustic fobs=f(c+vo)/(c−vs), forward/backward crest spacing | Stationary nondispersive medium, strictly |vs|<c and |vo|<c; positive velocities point toward the other party. Not a relativistic light model |

## Reuse evaluation and provenance

The four independent PHYSICA files were copied into AXIOM before adaptation. They have no cross-game imports and remain byte-identical to `games/physica/labs/` at validation time. Original modules were not edited. Runtime imports remain wholly within AXIOM.

* `motion.js`: reused unchanged for force, projectile and collision stepping, exact drag propagation and contact event localization. AXIOM adds validated descriptors, generic scenes/profiles and universal snapshots.
* `gravity.js`: reused unchanged for barycentric orbit dynamics and residuals. AXIOM adds a correctly oriented relative Kepler conic; nonelliptical limits show a separately labelled potential curve rather than a false closed orbit.
* `waves.js`: reused unchanged for nonlinear pendulum dynamics and measured periods. The new combined traveling/standing laboratory instead uses analytical normal modes: no copied driven-resonator state is relabelled as an undriven mode.
* `electricity.js`: reused unchanged as the actual modified-nodal DC solver, including source/meter topology and residual checks. AXIOM adds `layout` and schematic/Ohm-relation views and preserves open-switch behavior.

Compatible legacy metadata is supplied for force/projectile/collision, elliptical-orbit, pendulum and series DC configurations. Old wave/free-builder configurations do not have unchanged schema mappings and must be skipped by migration. No legacy save keys are read or written by these physics modules.

SHA-256 identities measured on 2026-11-15:

| File | SHA-256 |
| --- | --- |
| motion.js | e5bc15d2972c4dabae97e3fc6bcd101a9cc8d1b98c4ab10a5a80658ea387ca3f |
| gravity.js | 7aa5f3970cfd02e31312457a7a56b125e3c7c333d04ff2572b4f3040c5258523 |
| waves.js | 56a4871978a4020a66575f79b65900c131c725da7d706199922fb1eb5a3b60ad |
| electricity.js | c0ee1f74a0c98a4879dc2e92395a16f3881f788680306d7f63991835bcfcb73c |

## Numerical validation measured on 2026-11-15

Initial implementation tests first failed because the 24-model pack was absent. Subsequent targeted failing regressions exposed and corrected cancellation in the independent tiny-drag trajectory profile, an initially reversed elliptical apocenter reference, an unbounded negligible-field profile, absent open-switch support and virtual-ray labeling. Tests use independent closed-form numbers/relations, invariants, entropy direction and boundary inputs, not mocked physics.

`node --test games/axiom/tests/established.test.mjs`: **62 passed, 0 failed** after round-one scoped review. Covers all defaults/presets, scenes and profiles, unit metadata, detached snapshots, every numerical control’s single-parameter min/max boundaries, coupled-domain rejection, invalid/nonfinite objects, static time behavior, exact-copy identity and step restrictions. This is a model-level suite, not browser acceptance testing.

`node --test games/physica/tests/*.test.mjs`: **68 passed, 0 failed**. The old scientific/session suite remains intact. A whole-AXIOM run at this stage had 83 passed and one absent-curriculum import failure while the independent content worker was still writing its files; the root integration pass owns the final whole-platform result.

Measured default-step errors below use double precision and the specific scenarios listed. They are observed errors, not universal guarantees for all parameter combinations:

| Reference / scenario | Measured error |
| --- | --- |
| Constant 4 N, mass 2 kg, rest, x(2 s)=4 m | absolute 2.98×10⁻¹⁴ m |
| Vacuum projectile 20 m/s at 45°, g=9.81: range 400/g | absolute 3.27×10⁻¹³ m |
| Same projectile analytic flight time | absolute 5.06×10⁻¹⁴ s |
| Default circular two-body orbit, one period, max energy relative drift | 3.98×10⁻¹³ |
| Same orbit, max angular momentum relative drift | 8.66×10⁻¹⁵ |
| Same orbit, max relative radius deviation | 6.23×10⁻⁷ |
| 5° pendulum, measured periods over 20 s vs elliptic-series correction through θ⁴ | absolute 1.90×10⁻¹⁰ s |
| Default double pendulum, max relative energy drift over 10 s | 3.71×10⁻⁷ |
| Same sensitive pendulum, θ₁ difference at 10 s when step is halved | 1.03×10⁻⁴ rad; sensitivity amplifies phase error, so energy preservation alone does not certify an individual long-time path |
| Two-lump heat exchange after 100 s, total-energy residual | absolute 1.16×10⁻¹⁰ J |
| Default Carnot plotted PV trapezoid area vs exact work | relative 2.50×10⁻⁵ (plot discretization, not engine solver error) |
| RC after 1 s, 10 V source and RC=1 s | absolute 8.88×10⁻¹⁵ V |
| RLC R=2 Ω, L=1 H, C=0.01 F, V₀=10 V after 1 s vs independent damped solution | absolute 1.88×10⁻¹⁰ C |
| Same RLC, stored energy + heat residual | absolute 6.77×10⁻¹⁰ J |
| Default DC series KCL / KVL / power residuals | 6.94×10⁻¹⁸ A / 0 V / 5.55×10⁻¹⁷ W |

Additional assertions cover equal-mass elastic velocity exchange; torque work-energy and angular impulse; ideal-gas inverse-volume scaling; binomial C(4,2)=6 and symmetry; latent melting fraction; Coulomb 1/r potential/1/r² field and source exclusion; magnetic-force perpendicularity; critical/overdamped RLC and timestep convergence; induction sign; standing-wave nodes; double-slit envelope zero; normal refraction/TIR; virtual/infinite lens images; blue/red dispersion order; subsonic Doppler and boundary rejection.

## Primary educational sources

The source registry links these materials; no external requests are required at runtime. Explanations are original summaries of the named models rather than copied textbook passages.

* [OpenStax University Physics, Volume 1](https://openstax.org/details/books/university-physics-volume-1): Newtonian motion, collisions, torque, oscillation, waves and gravity. [Satellite Orbits and Energy](https://openstax.org/books/university-physics-volume-1/pages/13-4-satellite-orbits-and-energy) specifically supports orbit energy/speed/period references.
* [OpenStax University Physics, Volume 2](https://openstax.org/details/books/university-physics-volume-2): thermal/statistical physics, fields and circuits. [Carnot Cycle](https://openstax.org/books/university-physics-volume-2/pages/4-5-the-carnot-cycle), [RLC Series Circuits](https://openstax.org/books/university-physics-volume-2/pages/14-6-rlc-series-circuits), [Heat Transfer, Specific Heat, and Calorimetry](https://openstax.org/books/university-physics-volume-2/pages/1-4-heat-transfer-specific-heat-and-calorimetry) and [Phase Changes](https://openstax.org/books/university-physics-volume-2/pages/1-5-phase-changes) were directly checked during implementation.
* [OpenStax University Physics, Volume 3](https://openstax.org/details/books/university-physics-volume-3): geometric/wave optics, refraction, lens and interference domains.
* [NIST CODATA constants](https://physics.nist.gov/cuu/Constants/): constants supplied by the shared module; G and ε₀ are measured values, not exact defining constants. R is derived from exact kB and NA.
* [SCHOTT Optical Glass](https://www.schott.com/en-gb/products/optical-glass-p1000267): context for real optical-glass dispersion/data sheets. It does **not** validate the illustrative Cauchy coefficients above. Material selection and precision optical design require an actual manufacturer dispersion dataset/Sellmeier model.

Remaining limits are the model domains above, finite plotting resolution, numerical sensitivity in chaotic motion, and pending whole-app/browser review by the integrator. There is no arbitrary free circuit/force builder or molecular dynamics model presented as completed physics.

## Round-one scoped review corrections

Three visual-physics defects were reproduced by new failing regressions before correction:

* Radial/unbound orbit configurations retain their separate specific-potential profile with axes m and J/kg. The metre-valued scene now overlays only a spatial m-versus-m conic. Its conditional caption explicitly identifies the separate potential graph rather than calling it a spatial Kepler reference. Regression cases include zero launch speed, exactly √2 circular speed, 2.5 circular speed and a bounded elliptical control.
* A positive thin-lens focal distance inside the graph domain is inserted as an explicit `(do=f, di=null)` gap. No finite graph edge crosses the singularity, including when f lies between the original sample coordinates. Regressions check four focal distances (including a nonsample value), each finite branch’s lens equation, and the nonsingular negative-focal-length case. The default sample sequence now includes `(.09955,−22.1222…), (.1,null), (.1095,1.15263…)`.
* The prism triangle now has base half-width `2 tan(A/2)` for its height of 2 display units, giving the selected apex angle. The selected-wavelength ray enters and exits the actual faces, with equal internal refraction angles A/2 and wavelength-dependent external incidence. Independent geometric tests reconstruct the apex, face contact, both Snell relations, equal internal angles and total minimum deviation from the emitted primitives across three apex angles and two wavelengths. Largest measured apex-angle error was 2.22×10⁻¹⁶ rad and minimum-deviation error 1.36×10⁻¹⁵ rad.

Fresh round-one results: established **62/62**, original PHYSICA **68/68**. The concurrent whole-AXIOM suite was **99/100**; the single failure remained `content.test.mjs` importing the not-yet-written `src/content/curriculum.mjs`. No UI/shared, reused-source, modern-model or content files were modified for these fixes. Exact red/green commands and outputs are recorded in `test-results/axiom/established-fix-report.md` at the repository root.
