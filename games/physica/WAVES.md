# Waves model and validation

The pendulum integrates θ̈ = −(g/L)sinθ − γθ̇ using RK4. Its energy is ½mL²θ̇² + mgL(1−cosθ). The displayed 2π√(L/g) is a **small-angle theoretical reference**, not the measured period. Same-direction zero crossings interpolate the actual trajectory; periods remain unavailable until sufficient crossings exist. Release angles span −120° to 120°.

The spring integrates mẍ + bẋ + kx = 0. Damping is kg/s, while pendulum angular damping is s⁻¹. Mechanical energy and accumulated dissipative work are separate; the latter uses trapezoidal quadrature, not fabricated energy conservation.

Traveling waves evaluate the prescribed analytical field A sin(2πx/λ − 2πft + φ). Frequency and wavelength are independent controls, so changing their product changes the chosen medium speed v=fλ. Energy density ½μω²A² is J/m and average flux v times this density is W. This is an infinite ideal linear string field, not a numerical PDE or a boundary simulation.

Standing waves integrate one driven damped modal coordinate q̈+bq̇+ωₙ²q=F₀cos(ωdt)/M, M=1 kg, with y=q sin(nπx/L). The 201-point spatial profile fixes both endpoints and exposes internal sign-change nodes. Measurements report actual recent-cycle amplitude: the minimum of the last three complete cycles. C9 fixes initial displacement to zero and requires three cycles, preventing a large initial transient from passing a resonance challenge. The theoretical steady-state amplitude is separate from measured transient amplitude.

The string model is linear. Large displacement relative to wavelength/length is a mathematical extrapolation outside small-slope string physics. It omits mode coupling, nonlinear tension and material limits. The independent free-mode oscillators do not exchange energy.

The fixed step is at most 1/240 s and at least 80 steps per fastest spring or driven-mode cycle. Free oscillators subdivide their outer step as needed. Render speed, camera, graph settings and watch speed do not modify the equations.

## Reproduce

`node games/physica/tests/accuracy.mjs` independently evaluates the complete elliptic integral with 4096-panel Simpson quadrature and compares 30-second nonlinear pendulum trials. Tested angles: 2°, 10°, 45°, 90°, 120°. Maximum relative period error was **1.37×10⁻⁹**, and endpoint energy error **4.94×10⁻¹⁰**. These are results for these parameter sets and duration, not universal error bounds.

For an undamped 1 kg, 20 N/m spring over 30 s, relative period error was **5.40×10⁻¹⁰** and endpoint relative energy error **4.19×10⁻⁹**. With 1 kg/s damping over 8 s, |E+Q−E₀| was **1.97×10⁻⁸ J**. A third string mode driven at 3 Hz for 12 s measured **2.9999687 Hz**, recent amplitude **0.1184133 m**, and |E+Q−E₀−Wdrive| **5.67×10⁻⁶ J**. Work integration contributes to that residual.

Unit tests additionally cover fixed-end nodes, resonance versus off-resonant drive, null inputs, maximum spring frequency, free Cartesian coordinates and malformed/imported data. All numerical/model and challenge review findings were resolved before final verification.

Primary reference: [OpenStax University Physics, pendulums](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums). The implementation uses the stated equations, not copied textbook text or code.
