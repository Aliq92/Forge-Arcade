# Scientific validation report · 15 November 2026

SI model values are independent of screen coordinates. Graph samples come from model measurements. Analytical references, derived quantities and actual measurements are labelled separately. No random motion drives any lab. Fixed physical steps and bounded scheduling separate watch speed from integration accuracy.

| System | Method and evidence | Scope |
|---|---|---|
| Gravity | Pairwise Newtonian forces; velocity Verlet with bounded adaptive substeps and contact refinement. C1 circular reference maximum relative radius error 2.40×10⁻⁷ over 6000 s. Equal-mass binary review: relative energy error 2.78×10⁻⁸ over 50000 s. | Finite spherical bodies, no softening or relativity. Mergers track energy/spin discontinuities; mechanical energy is not conserved across inelastic merging. |
| Motion | Exact constant-gravity/linear-drag guided trajectories, friction transitions, contact impulses; actual landing interpolation. Default no-drag projectile range error <6.4×10⁻¹¹ m, flight-time error <1.1×10⁻¹² s. | Free 2D contacts are approximate translational circular envelopes, including blocks; no rotational dynamics. |
| Waves | RK4 nonlinear pendulum, linear spring and driven normal mode; independent elliptic-integral reference and energy/work checks. Maximum pendulum relative period error 1.37×10⁻⁹ in the documented 30 s angle sweep. | Traveling field is analytical. Standing string is one linear mode, normalized modal mass 1 kg. Large-amplitude string behavior is outside physical scope. |
| DC circuits | Modified nodal analysis with ideal voltage constraints and scaled pivoting. Guided presets: KCL residual ≤6.94×10⁻¹⁸ A, KVL 0 V, power residual ≤2.22×10⁻¹⁶ W. Review sweep of 2200 resistor networks: KCL ≤3.35×10⁻¹⁴ A and power ≤2.27×10⁻¹³ W. | Ideal DC only; fixed-R lamps. Floating, contradictory, shorted or indeterminate ideal-source networks report errors, never invented readings. |

These results are measured examples, not guarantees for every input or duration. Detailed setups, equations, reference values and limitations are in [GRAVITY.md](GRAVITY.md), [MOTION.md](MOTION.md), [WAVES.md](WAVES.md), and [ELECTRICITY.md](ELECTRICITY.md). Run the numerical tests and `tests/accuracy.mjs` for reproducible checks; additional independent model review sweeps are recorded in the model documents.

## Challenge validation

The automated session suite runs an achievable reference solution and a wrong setup for each challenge. Actual numerical states and hold durations decide success; all configurations must remain valid. Fixed givens are enforced by both UI and numerical predicates. Reset replaces state and history. No selected button, text answer or saved progress flag can substitute for a running scientific result.

References include circular speed/orbit radius and bound/unbound energy (C1–C3), measured landing range and stopped distance and contact momentum (C4–C6), measured period/frequency and sustained driven response (C7–C9), and valid solved currents, divider voltage and lamp power (C10–C12). Free modes do not silently award guided challenges.

## Time, graphs and data

Physical Δt is displayed. Orbital trials explicitly schedule 1000 simulated seconds per real second at 1×; ordinary trials use 1:1 clocks. Watch speeds 0.25×–4× alter scheduling only. At excessive load, bounded catch-up slows the wall-clock pace rather than skipping physics. Hidden tabs pause.

Time-series history is limited to 600 samples; older samples roll off. Wave sampling adapts to the fastest configured/normal-mode frequency, retaining approximately 12 or more points per fastest cycle after fixed-step rounding and a roughly 30-second window for slow oscillations. Profiles contain 201 spatial samples and IV plots up to 100 valid trial points. Freeze snapshots the displayed data while model evolution continues. Viewport enlargement of tiny gravity bodies, force and velocity arrow scales, and circuit layout units are labelled. Readings can be unavailable before a complete measured cycle or after an invalid circuit; the UI displays an em dash rather than a false zero.

## Primary references

- [LAMMPS timestep flow](https://docs.lammps.org/stable/Developer_flow.html): velocity-Verlet integration structure.
- [OpenStax pendulums](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums): nonlinear pendulum and small-angle limits.
- [DPsim modified nodal analysis](https://dpsim.fein-aachen.org/docs/concepts/nodal-analysis/): nodal equations and ideal voltage-source constraints.

Additional primary references appear in the individual model documents. No reference website is a runtime dependency.
