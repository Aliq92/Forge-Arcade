# AXIOM modern-physics model report

Scoped implementation and numerical review: 15 November 2026. All fifteen required models are implemented in `src/physics/modern.mjs` and its focused modules. They use the shared SI constants and schema validation, return numeric/null measurements with units, and expose genuine analytical/ODE profiles and generic scene geometry. No model imports a renderer, DOM, network service, or another experience.

## Model scope and methods

| Laboratory | Implemented mathematics | Explicit scope |
| --- | --- | --- |
| `relativity` | Collinear Lorentz transformation; interval in both frames; γ; moving-clock time; simultaneous length contraction; Einstein velocity addition; two-leg twin proper time | Flat spacetime, instantaneous ideal turnaround. The Minkowski plot uses horizontal x and vertical ct, both in metres. No acceleration dynamics or light-travel image delays. |
| `schwarzschild-clocks` | rₛ = 2GM/c², lapse √(1−rₛ/r), stationary-clock proper times, gravitational frequency ratio and redshift | Nonrotating, uncharged spherical exterior. Both clocks are supported at r > rₛ, never freely falling or stationary inside the horizon. |
| `photon-path` | Equatorial null equation u″+u=3u²/2, u=rₛ/r; initial slope from u′²+u²−u³=(rₛ/b)²; RK4 in azimuth | Static trajectory calculation, not a clock animation. Starts at R/rₛ=max(1000,100b/rₛ); capture terminates at horizon. Deflection compares finite-boundary Cartesian coordinate tangents. Areal-coordinate projection is not proper-distance geometry. Near-critical trajectories unresolved after approximately 8π report neither escape nor capture. |
| `lensing` | Point-lens Einstein angle, both roots of β=θ−θE²/θ, total magnification | Weak, thin, small-angle lens with Euclidean static distances, Dₗₛ=Dₛ−Dₗ. Not a cosmological distance solver. Perfect alignment gives a ring and unavailable point-source magnification, rather than an infinite numeric output. |
| `gravitational-wave` | Linear plane plus polarization, h₊=h₀sin(2πft), δLx=+Lh₊/2, δLy=−Lh₊/2 | Free masses, long-wavelength approximation Lf/c≤0.01, no binary merger waveform or detector noise. Scene-only gain is declared; actual strain and displacement remain unscaled. |
| `particle-box` | Normalized two-eigenstate infinite-well superposition with exact Schrödinger phases, energies, energy variance, position expectation and numerical probability integral | Distinct integer modes 1–8, nonrelativistic energies ≤1% of rest energy, no collapse or decoherence. Integrals use 401 spatial samples; evolution is unitary analytical phase evolution. |
| `tunneling` | Exact rectangular-barrier flux transmission above/below the barrier, stable sinc/sinhc threshold and log-domain opaque limit | One-dimensional stationary scattering, equal exterior potential and mass, no absorption. E=V uses the continuous limit; extreme probabilities can underflow to zero. If resonance spacing/linewidth cannot be resolved, the profile explicitly switches to the exact above-barrier lower envelope with upper bound 1, never an averaged or aliased T curve. Selected T/R stay exact. |
| `spin` | Pure-state Bloch vector, r·n, Born probabilities and expectation ℏ(r·n)/2 | Ideal spin-½ analyzer, not a literal spinning sphere. Scene is an explicitly labelled x–z projection; the omitted y component is reported numerically. |
| `entanglement` | Singlet E(a,b)=−cos(a−b), all four joint probabilities, local marginals and four-setting CHSH | Spin analyzer angles, not photon polarization angles. Ideal expectations, no invented trials. Local marginals remain 1/2 and no signaling interpretation is offered. |
| `particle-decay` | N₀exp(−λt), λ=ln2/t½, survival, expected decayed population, activity and mean lifetime | User-selected lifetime; no named-isotope claim. Fractional populations are expectations, never fake observations or individual particle histories. |
| `neutrino` | Two-flavour vacuum sin²(2θ)sin²[Δm²c³L/(4ℏE)], survival and oscillation length | Δm² input explicitly uses eV²/c⁴ and is converted internally; other inputs SI. Profiles span at most eight periods over 401 points; long baselines use a labelled cropped window containing the selected baseline. Omits matter effects, three flavours, CP violation and decoherence. No absolute masses inferred. |
| `scattering` | Factored Källén two-body momentum, unequal-mass final energies, individual and total momentum components, speeds and free trajectories | Synthetic final-state centre-of-momentum kinematics. Selected direction has no cross-section or event probability. No real detector response or reaction-specific quantum-number prediction. Below-threshold configurations reject. |
| `expansion` | FLRW matter/radiation/Λ/curvature Friedmann equation; fixed outer physical-time steps with bounded error-controlled RK4 substeps; independent adaptive age quadrature | Illustrative chosen defaults, not latest measured parameters. Ωk closes the density sum. Valid expanding histories checked at polynomial extrema; pure de Sitter finite-Big-Bang age and forbidden/turnaround branches reject. The final partial outer step stops at a=4 and the age-integral physical boundary time. |
| `rotation-curve` | Spherical Hernquist enclosed baryon mass and integrated pseudo-isothermal halo, v²=GM(<r)/r | Explicit profiles, not observed points or a galaxy fit. The halo is phenomenological, not a particle identity. Infinite total mass of the untruncated halo is stated; only a finite radius range is displayed. |
| `redshift` | λobs=(1+z)λemit, energy/frequency ratios, emission scale factor | Cosmological expansion only. No high-z special-relativistic velocity inference. The scene uses wavelength-correct sinusoids with arbitrary labelled amplitudes, not a measured spectrum. |

## Physical clocks and bounded computation

The dynamic models advance in actual physical seconds. Display speed changes scheduling, not equations. Default dynamic graph observables change with the simulated state: twin proper time, stationary proper time, GW strain, quantum mean position, expected undecayed population, scattering radius and cosmic scale factor. The table describes outer scheduler steps; expansion additionally refines those steps internally and shortens its final step to the physical terminal time.

| Model | Fixed physical step | Physical seconds per real second at 1× |
| --- | --- | --- |
| Relativity | 1/120 s | 1 |
| Schwarzschild clocks | 0.01 s | 1 |
| Plane GW | 1/(240f) s | 1/f |
| Quantum box | Tbeat/240 | Tbeat |
| Decay | t½/240 | t½ |
| Scattering | Rdetector/(240c) | Rdetector/c |
| Expansion | 1/[2400 H(ainitial)] | 0.1/H(ainitial) |

All remaining models are static analytical controls. Photon integration uses Δφ=0.0005 rad with at most about 50,266 internal steps, retains at most 401 curve points and reports first-integral error. Every profile and scene curve is capped at 401 points. The largest marker ensemble is the 32-mass GW ring. No accumulated unbounded particle histories exist. Cosmic-age integration uses a= x² to regularize the Big-Bang endpoint, adaptive Simpson refinement, a depth/evaluation budget and explicit failure if a branch cannot be resolved. A relative roundoff floor prevents recursion on subtraction noise near a loitering solution.

Expansion dynamics bound each trial internal step by 1/[128 max(H(a), H(4))]. For the admitted nonnegative matter/radiation/Λ components, any positive stationary point of H is a minimum, so these endpoints bound H on the remaining interval. One RK4 step is compared with two half steps; the error estimate must be ≤10⁻¹² times the scale factor. Accepted values use Richardson correction, with an explicit 32,768-attempt budget. Thus a very small initial H near loitering cannot cause a giant unrefined integration step when H subsequently grows.

## Numerical validation

Command: `node --test --test-reporter=spec games/axiom/tests/modern.test.mjs`.

After review round 1: **28 modern tests pass, zero fail**, including all defaults/presets, invariants, independent analytical references, domain guards, unknown/malformed inputs, scene/profile finiteness, graph observables, static-clock protection, lens-pole masking, resolution-aware oscillatory profiles, loitering dynamics and independent snapshots. A parameter-endpoint sweep evaluates 110 accepted boundary configurations after 500 steps each; 12 configurations reject for explanatory cross-parameter physical-domain reasons.

The following are measured results from the implemented code, not just tolerance targets:

| Check | Measured result/error |
| --- | --- |
| Lorentz interval, β=−0.9, t=1 s, x=3c s | Relative difference 3.56×10⁻¹⁶ |
| Photon b/rₛ=5 finite-radius deflection | 0.5903957874978971 rad; independent transformed first-integral quadrature 0.5903957874486377 rad; absolute difference 4.93×10⁻¹¹ rad |
| Photon first-integral error, b/rₛ=5 | 5.98×10⁻¹⁵ |
| Photon near-capture b/rₛ=2 | Horizon termination; maximum first-integral residual 8.52×10⁻⁹, including interpolated terminal boundary |
| Photon b/rₛ=100 | 0.0202999659515237 rad, versus first-order weak-field 2rₛ/b=0.02 rad; ~1.5% includes higher-order physical bending and finite-boundary definition, not a claimed integrator error |
| Critical photon b/rₛ=3√3/2 | Neither capture nor escape within the azimuth budget, explicit warning, unavailable deflection |
| Electron 1 nm well ground state | 0.376030162104873 eV |
| Box normalization over 1000 evolving steps | Maximum absolute integrated-probability error 1.56×10⁻¹⁵ |
| Barrier E=V=1 eV, width 1 nm | T=0.132245209188035; exact threshold reference matches at reported precision |
| Neutrino default probability | 0.999817087995054; absolute difference 1.30×10⁻¹² from conventional coefficient 1.266932679 with km/GeV units |
| Flat matter age and 400-step scale factor | Age matches at reported precision; scale-factor relative difference 1.78×10⁻¹⁵ from analytical a(t) after error-controlled stepping |
| Flat matter+Λ present age | Relative difference 1.81×10⁻¹³ from the independent asinh expression |
| Narrow loitering case Ωm=.3, ΩΛ=1.71346, Ωr=0 | Relative age difference 6.48×10⁻¹² against an independent 200,000-interval quadrature. This regression exposed a 0.56% fixed-grid error before adaptive refinement was added. |
| Loitering departure from a=.444 over 12 original outer steps | a=0.9987026534626444 versus independent 240,000-step RK4 reference 0.9987026534701919; relative difference 7.56×10⁻¹² (formerly 0.355% error) |
| Same model terminal a=4 | Stops exactly at a=4 after a partial 16th outer step; model age 3.7020477079547674×10¹⁸ s versus independent 400,000-panel reference 3.702047707934094×10¹⁸ s, relative difference 5.59×10⁻¹² |
| Default COM energy sum | Zero difference at reported precision |
| Default ultra-relativistic COM mass-shell subtraction | Relative residual 2.99×10⁻⁸; subtracting E²−p²c² is ill-conditioned at this energy, while directly computed energies/momenta remain finite and conserved |

Additional tests check exact half-life, decay step-size independence, barrier continuity from both sides and free/opaque limits, zero-mixing/zero-baseline neutrinos, singlet no-signaling marginals, CHSH 2√2, lens root equations and mass scaling, radiation/Milne ages, finite centre/Kepler/halo limits and redshift energy scaling.

Broader verification after review round 1: `node --test --test-reporter=spec games/axiom/tests/*.test.mjs` passed **108/108** and `node --test --test-reporter=spec tests/*.test.mjs` passed **182/182**. Earlier combined runs exposed in-progress curriculum failures; the owning worker resolved them before the successful rerun. Root integration owns subsequent acceptance and browser QA. This report does not claim browser or physical-device validation. The detailed red/green record is in `test-results/axiom/modern-fix-report.md` at repository root.

## Sources and evidence distinctions

Descriptors use the shared reference registry IDs. Underlying primary/educational sources include:

- [OpenStax University Physics Volume 3](https://openstax.org/details/books/university-physics-volume-3): special relativity, quantum wells/barriers and decay.
- [MIT Schwarzschild notes](https://ocw.mit.edu/courses/8-033-relativity-fall-2006/5dae4a0c2d69b367951ddea5e17a2cea_schwarzschild.pdf): null orbits and stationary lapse; PDF revision 29 November 2005 in the archived Fall 2006 course.
- [MIT cosmology notes](https://ocw.mit.edu/courses/8-033-relativity-fall-2006/52dec2023ebdb26536a9db6f7d3256d3_cosmology.pdf): Friedmann components, expansion redshift and age integral; revision 14 November 2006.
- [Particle Data Group 2024 review](https://pdg.lbl.gov/2024/reviews/contents_sports.html): neutrino conventions and relativistic two-body kinematics, with edition-qualified context.
- [LIGO scientific education](https://www.ligo.caltech.edu/page/what-are-gw): gravitational-wave strain and detector interpretation. Here h₊ is the metric polarization: a single perpendicular arm changes by ±Lh₊/2; the differential two-arm change is Lh₊.
- [Hernquist 1990, ApJ 356:359–364](https://adsabs.harvard.edu/pdf/1990ApJ...356..359H): the explicit spherical baryonic profile. Halo mass follows direct integration of the density declared in the model.

Established frameworks are distinguished from the chosen idealizations. Weak lensing geometry, linearized GW, two-flavour oscillation and the rotation profile are marked approximations. Cosmological defaults and decay lifetimes are selected examples. No module generates predictions for an unknown dark-matter species, unmeasured neutrino mass, unconfirmed force or speculative particle.
