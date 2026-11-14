# Electricity model and validation

This is a virtual steady DC resistive laboratory. Voltage sources are ideal;
resistors and lamps have a fixed positive resistance. Lamp temperature,
nonlinear light output, AC, capacitance, inductance and switching transients
are outside the model. A lamp illustration is not a calibrated light meter.
The reference node is a mathematical voltage reference.

## Equations and solution

The implementation stamps each resistor conductance into the nodal matrix.
Every voltage source, wire, closed switch and ammeter contributes an additional
branch-current unknown and an exact terminal-voltage constraint. The matrix is
`[G B; Bᵀ 0] [v; j] = [0; u]`. The bounded dense system uses Gaussian
elimination with scaled partial pivoting, not a solver requiring a positive
diagonal. No epsilon resistance or fabricated leakage path is inserted.

An ideal voltmeter has zero current and reads `Va − Vb`; an ideal ammeter is
a zero-volt branch and reads its own solved current, positive from `a` to `b`.
All branch currents follow that orientation, and branch power is
`(Va − Vb) Iab`. Negative source power denotes delivery. Open switches carry
zero current. KCL residual is the maximum absolute net outgoing node current;
KVL residual is the maximum ideal voltage-constraint error; power residual is
the absolute sum of all signed branch powers. Node-potential differences
automatically satisfy loop voltage sums.

Primary reference: [DPsim, Nodal Analysis](https://dpsim.fein-aachen.org/docs/concepts/nodal-analysis/),
especially conductance stamping and the voltage-source extension; consulted
15 November 2026. Equations are implemented locally without third-party code.

## Public interface and limits

`createModel(mode, params)` supports `ohm`, `series`, `parallel`, `power` and
`free`. Guided schemas/defaults are exported in `PARAMETERS`; four complete
guided descriptors are exported in `EXPERIMENTS`. Free accepts `{circuit}`.
`normalizeConfig` and `validateCircuit` return diagnostics for malformed plain
data. `createModel` throws an understandable error for malformed configuration;
a well-formed circuit whose physics is indeterminate becomes `valid: false`.
`solveCircuit` returns the same invalid diagnostics without throwing for
ordinary malformed circuit data.

The circuit contains explicit `ground`, `nodes:[{id,x,y}]` and
`components:[{id,type,a,b,value?,closed?,x?,y?}]`. There are at most 12 nodes
and 24 components. Diagram coordinates x 0–10, y 0–6 have no physical effect.
Each source permits 0–24 V; resistance permits 0.1–1,000,000 Ω. IDs are short,
unique alphanumeric/underscore/hyphen strings, excluding prototype names.
Invalid terminal references, unsupported fields/types, nonfinite values,
excessive lists and nonplain objects are rejected before matrix allocation.

An ideal-constraint graph detects conflicting/shorted sources before solving.
Redundant ideal loops are rejected with an explanation because their individual
branch currents are not uniquely measurable. This includes parallel duplicate
sources and ideal wire loops, even when their node voltages are consistent.
Floating subnetworks, including nodes attached only by voltmeters/open switches,
are rejected rather than silently anchored. A singular/unstable pivot or an
unacceptably large physical residual also invalidates the solution. Invalid
results expose no fabricated node/branch values; model electrical measurements
are null and time does not advance.

Results contain node voltages, signed branch currents/powers, meter readouts
and residuals. The summary voltage/current/resistance refer to the first source;
net source power includes every source, and load power sums every resistor/lamp.
Use branch-specific results to study multiple-source networks. Summary
resistance is `V/I`; it is null when current is zero, including an open switch
or zero-voltage setup. For guided modes the independent theoretical equivalent
resistance remains available in `model.theory`.

The model solves once on construction. A configuration edit creates a fresh
model; rendering and clock steps do not solve or mutate the initial config.
`dt=0.05 s`, `clockRate=1` simply timestamp observations of a static solution;
they do not imply simulated electrical transients. `snapshot()` deep copies
the renderer state.

## Validation results

Command: `node --test games/physica/tests/electricity.test.mjs`.
All 13 tests passed on Node 22.19.0. Coverage includes ideal meter loading and
orientation, voltage division, current division, mixed networks, multiple
sources, wires/lamps, grounded open switches, shorts/conflicts/redundancy,
floating networks, malformed/bounded input, deep snapshots and maximum circuit
size. The matrix needs at most 35 unknowns (11 node voltages + 24 ideal branches;
actual independent-constraint count is smaller).

| Actual model reference | Simulated result | Analytical result |
| --- | --- | --- |
| C10: Ohm, 6 V, 100 Ω | 0.06 A | 0.06 A |
| C11: series, 12 V, 200 Ω + 100 Ω | 4 V bottom resistor | 4 V |
| C12: lamp, 9 V, 81 Ω | 1 W | 1 W |
| E3: parallel, 12 V, 100 Ω and 200 Ω | 0.18 A total; 0.12/0.06 A branches | same |

Reference models stepped 12 times to 0.6 s remain valid, supporting the root
challenge stability requirement of at least 0.5 s. A deterministic 20-case
Ohm sweep used R = 0.1, 1, 100, 1000, 1e6 Ω and V = 0, 0.001, 6, 24 V.
Maximum absolute current error was 0 A in this sweep; maximum absolute load
power error was 1.1102230246251565e-16 W. Across the four default experiments,
maximum KCL residual was 6.938893903907228e-18 A, maximum KVL residual 0 V,
and maximum power residual 2.220446049250313e-16 W. These observed samples do
not claim zero floating-point error for every permitted topology. Tests allow
1e-10 absolute errors ordinarily, 1e-9 A / 1e-8 W for wide-scale sweep cases.

The full in-progress PHYSICA suite was also run; at that snapshot the only
three failures were other-owner gravity contact/ellipse/merger tests, reported
to the root coordinator. Browser rendering and builder interaction validation
belong to root integration; this report establishes model behavior only.
