# CODEX BUILD — AXIOM
## The Physics of Everything
### Interactive Physics Knowledge & Experimentation Platform
### Forge Arcade — New Science Platform

You are a senior scientific software engineer, physics educator, numerical simulation specialist, interactive visualization designer, and frontend architect.

**Repository:** https://github.com/aliq92/Forge-Arcade

**New platform:** AXIOM — The Physics of Everything

**Suggested directory:** `games/axiom/`

**Replaces:** The previously proposed PHYSICA project.

## PRIMARY MISSION

Build a comprehensive, scientifically responsible, interactive physics learning platform.

AXIOM is NOT a game.

It is a virtual physics institute where users can study important laws of nature, investigate scientific theories, run experiments, manipulate mathematical variables, compare predictions, and explore unsolved questions.

The experience must be engaging through discovery and interaction rather than scores, enemies, or arcade challenges.

**Core philosophy: Don't just read physics. Experiment with it.**

---

# PHASE 1 — REPOSITORY INSPECTION

Before implementation:

1. Inspect Forge Arcade's repository.
2. Locate any existing PHYSICA implementation or partial files.
3. Inspect ELEMENTAL's design and educational structure.
4. Identify the actual game registration architecture.
5. Review existing scientific simulation utilities.
6. Identify reusable components.
7. Inspect testing infrastructure.
8. Review deployment configuration.

AXIOM replaces PHYSICA as the proposed physics platform.

If PHYSICA already contains useful working modules, evaluate them for reuse rather than deleting them blindly.

Preserve ELEMENTAL and unrelated Forge Arcade applications.

Use a separate development branch.

**Do not deploy automatically.**

---

# PHASE 2 — PLATFORM ARCHITECTURE

## 1. Technology

Prefer:

- TypeScript or well-structured vanilla JavaScript.
- HTML5 Canvas 2D.
- WebGL for genuinely useful three-dimensional demonstrations.
- CSS3.
- Web Workers for expensive computations.
- requestAnimationFrame.
- Local persistence.
- Mathematical rendering with a bundled, lightweight library where justified.

Use the existing repository tooling where practical.

Avoid unnecessary frameworks and remote runtime dependencies.

The platform should work as a static website.

Suggested structure:

```text
games/axiom/
├── index.html
├── src/
│   ├── app/
│   │   ├── navigation/
│   │   ├── dashboard/
│   │   ├── search/
│   │   └── settings/
│   ├── physics/
│   │   ├── classical/
│   │   ├── thermodynamics/
│   │   ├── electromagnetism/
│   │   ├── optics/
│   │   ├── relativity/
│   │   ├── quantum/
│   │   ├── particle/
│   │   ├── cosmology/
│   │   └── speculative/
│   ├── simulations/
│   ├── visualizations/
│   ├── lessons/
│   ├── equations/
│   ├── experiments/
│   ├── references/
│   ├── storage/
│   └── ui/
├── tests/
├── README.md
└── package.json
```

Adapt this structure to the inspected repository.

Separate scientific models, educational content, and graphics.

---

# PHASE 3 — MAIN DASHBOARD

Create a beautiful interactive scientific dashboard.

## Header

**AXIOM**

*The Physics of Everything*

Subtitle:

"Explore the laws, forces, and mysteries of the universe."

## Main Sections

1. Physics Library
2. Interactive Laboratories
3. Theory Explorer
4. Equation Explorer
5. Universe Simulator
6. Scientific Discoveries
7. My Research Notebook

Provide global search across all topics.

Allow browsing by subject, scientific status, mathematical difficulty, and prerequisites.

---

# PHASE 4 — COMPLETE PHYSICS LIBRARY

Organize the curriculum into ten major disciplines.

Each discipline should have multiple lessons, demonstrations, equations, and scientific references.

## DISCIPLINE 01 — CLASSICAL MECHANICS

Cover:

- Newton's three laws of motion.
- Universal gravitation.
- Conservation of energy.
- Conservation of momentum.
- Conservation of angular momentum.
- Work and power.
- Kinematics.
- Projectile motion.
- Friction.
- Circular motion.
- Torque.
- Rotational dynamics.
- Oscillations.
- Kepler's laws.
- Lagrangian mechanics.
- Hamiltonian mechanics.
- Classical chaos.

Interactive experiments should include:

- Force and acceleration.
- Projectile trajectory.
- Pendulums.
- Collisions.
- Rotating systems.
- Planetary orbits.
- Double pendulum chaos.

## DISCIPLINE 02 — THERMODYNAMICS

Cover:

- Zeroth law.
- First law.
- Second law.
- Third law.
- Temperature.
- Heat transfer.
- Entropy.
- Internal energy.
- Ideal gas law.
- Heat engines.
- Carnot cycle.
- Statistical mechanics.
- Boltzmann distribution.
- Phase transitions.
- Thermal equilibrium.

Interactive demonstrations:

- Gas particles in a container.
- Pressure versus volume.
- Heat transfer.
- Heat engine cycles.
- Entropy and microstates.
- Phase-change diagrams.

## DISCIPLINE 03 — ELECTROMAGNETISM

Cover:

- Electric charge.
- Coulomb's law.
- Electric fields.
- Electric potential.
- Gauss's law.
- Current and resistance.
- Ohm's law.
- Kirchhoff's laws.
- Magnetic fields.
- Lorentz force.
- Faraday's law.
- Lenz's law.
- Ampère-Maxwell law.
- Maxwell's equations.
- Electromagnetic induction.
- Electromagnetic waves.
- Circuit transients.

Interactive demonstrations:

- Electric-field visualizer.
- Magnetic-field visualizer.
- Charge movement.
- Virtual circuit laboratory.
- Electromagnetic induction.
- Capacitor charging.
- RLC oscillations.

Use scientifically simplified and safe virtual models.

## DISCIPLINE 04 — WAVES AND OPTICS

Cover:

- Wave equation.
- Superposition.
- Interference.
- Diffraction.
- Reflection.
- Refraction.
- Snell's law.
- Doppler effect.
- Resonance.
- Standing waves.
- Polarization.
- Geometrical optics.
- Wave optics.
- Double-slit interference.

Interactive demonstrations:

- Wave generator.
- Two-source interference.
- Double-slit diffraction.
- Lens simulator.
- Prism dispersion.
- Standing waves.
- Doppler visualization.

## DISCIPLINE 05 — SPECIAL RELATIVITY

Cover:

- Einstein's postulates.
- Invariance of light speed.
- Relativity of simultaneity.
- Lorentz transformations.
- Time dilation.
- Length contraction.
- Spacetime intervals.
- Relativistic momentum.
- Relativistic energy.
- Mass-energy equivalence.
- Twin paradox.
- Minkowski diagrams.

Interactive demonstrations:

- Relativistic spacecraft.
- Moving clocks.
- Spacetime diagrams.
- Twin paradox worldlines.
- Relativistic velocity addition.

Use actual relativity equations.

Do not represent time dilation as an arbitrary visual slowdown.

## DISCIPLINE 06 — GENERAL RELATIVITY

Cover:

- Equivalence principle.
- Curved spacetime.
- Geodesics.
- Gravitational time dilation.
- Gravitational redshift.
- Light bending.
- Gravitational lensing.
- Black holes.
- Event horizons.
- Schwarzschild geometry.
- Gravitational waves.
- Einstein field equations.

Interactive demonstrations:

- Spacetime geodesic explorer.
- Gravitational lensing.
- Black-hole photon paths.
- Gravitational time dilation.
- Gravitational-wave strain visualization.

Distinguish exact solutions from simplified approximations.

Explain that a rubber-sheet analogy does not fully represent four-dimensional spacetime curvature.

## DISCIPLINE 07 — QUANTUM MECHANICS

Cover:

- Wave-particle duality.
- Planck's quantum hypothesis.
- Photon energy.
- Schrödinger equation.
- Wavefunctions.
- Probability amplitudes.
- Born rule.
- Superposition.
- Uncertainty principle.
- Quantum tunnelling.
- Quantum harmonic oscillator.
- Particle in a box.
- Spin.
- Measurement.
- Entanglement.
- Quantum interference.
- Pauli exclusion principle.
- Quantum statistics.

Interactive demonstrations:

- Wavefunction evolution.
- Particle-in-a-box eigenstates.
- Quantum tunnelling.
- Double-slit probability distribution.
- Spin measurement.
- Entangled-state correlations.

Never describe quantum measurement as conscious thought creating reality.

Keep interpretations distinct from experimentally established predictions.

## DISCIPLINE 08 — PARTICLE PHYSICS

Cover:

- Standard Model.
- Quarks.
- Leptons.
- Gauge bosons.
- Higgs field.
- Higgs boson.
- Strong interaction.
- Weak interaction.
- Electromagnetic interaction.
- Quantum fields.
- Antimatter.
- Particle decay.
- Neutrino oscillations.
- Symmetries.
- Conservation laws.
- Particle accelerators.

Interactive demonstrations:

- Standard Model particle explorer.
- Particle interaction diagrams.
- Simplified scattering kinematics.
- Particle decay visualization.
- Higgs potential analogy.
- Virtual detector event viewer.

Clearly distinguish measured particles from hypothetical ones.

## DISCIPLINE 09 — COSMOLOGY AND ASTROPHYSICS

Cover:

- Big Bang cosmology.
- Expansion of the universe.
- Hubble-Lemaître law.
- Friedmann equations.
- Cosmic microwave background.
- Structure formation.
- Stellar evolution.
- Neutron stars.
- Black holes.
- Dark matter evidence.
- Dark energy.
- Inflationary models.
- Cosmic horizons.
- Cosmological constant.
- Fate of the universe.

Interactive demonstrations:

- Expanding universe.
- Redshift explorer.
- Stellar life cycles.
- Gravitational lensing.
- Galaxy rotation curves.
- Cosmic expansion models.

Do not claim that dark matter's particle identity or the physical origin of dark energy is established.

## DISCIPLINE 10 — FRONTIERS OF THEORETICAL PHYSICS

Cover:

- String theory.
- Superstring theory.
- M-theory.
- Extra spatial dimensions.
- Compactification.
- Branes.
- String vibration modes.
- Supersymmetry.
- Quantum gravity.
- Loop quantum gravity.
- Holographic principle.
- AdS/CFT correspondence.
- Black-hole information problem.
- Grand unified theories.
- Emergent spacetime.
- Selected quantum-gravity research programmes.

### Important

This section must clearly separate:

- Established mathematics.
- Internal theoretical consistency.
- Physical predictions.
- Experimental evidence.
- Open research questions.
- Speculative hypotheses.

Do not present string theory as experimentally verified.

Do not claim that M-theory is a completed, established theory of everything.

---

# PHASE 5 — STRING THEORY EXPLORER

Create a dedicated interactive environment called:

**THE STRING THEORY EXPLORER**

It should be one of AXIOM's most visually interesting sections.

## Module A — Strings and Vibrations

Visualize idealized vibrating strings.

Allow users to change:

- Mode number.
- Frequency.
- Amplitude.
- Tension.
- Boundary conditions.

Show standing-wave patterns.

Explain that a classical vibrating string is only an analogy, not a full quantum string-theory simulation.

## Module B — Open and Closed Strings

Provide educational visualizations of:

- Open strings.
- Closed strings.
- Vibrational modes.
- Conceptual interactions.

Clearly label the diagrams as mathematical or artistic representations.

## Module C — Extra Dimensions

Create an interactive conceptual visualization of compactified dimensions.

Include:

- Ordinary spatial dimensions.
- Simplified compactification examples.
- Adjustable compactification size.
- Clear scale explanations.

Do not claim the user can directly observe actual extra dimensions.

## Module D — Branes

Visualize simplified brane concepts.

Explore:

- Dimensionality.
- Strings with endpoints on branes.
- Bulk versus brane.

Describe which features are conceptual rather than experimentally demonstrated.

## Module E — Theory Comparison

Compare:

- General relativity.
- Quantum field theory.
- String theory.
- Loop quantum gravity.

Display:

- Scientific goals.
- Mathematical frameworks.
- Evidence status.
- Known difficulties.
- Open questions.

Avoid false equivalence between established physics and speculative proposals.

## Module F — What Remains Unknown?

Include:

- Why experimental confirmation is difficult.
- The problem of quantum gravity.
- Challenges in deriving testable predictions.
- The role of mathematical research.
- What future experiments might constrain.

Show a prominent **UNCONFIRMED PHYSICAL FRAMEWORK** label where appropriate.

---

# PHASE 6 — INTERACTIVE EXPERIMENT ENGINE

Every supported law or theory should offer suitable interaction.

Provide three experiment categories.

## Category A — Quantitative Simulation

For well-established models with appropriate numerical implementations.

Examples:

- Newtonian mechanics.
- Ideal gas laws.
- DC resistive circuits.
- Classical waves.
- Two-body orbital mechanics.

Use validated numerical methods and measured outputs.

## Category B — Analytical Visualization

For concepts where exact equations can be evaluated and plotted.

Examples:

- Lorentz transformations.
- Relativistic time dilation.
- Quantum energy levels.
- Schwarzschild gravitational redshift outside its valid domain restrictions.
- Cosmological expansion under explicitly chosen models.

Calculate values from actual equations.

## Category C — Conceptual Model

For theories or phenomena that cannot be faithfully simulated at the chosen level of complexity.

Examples:

- String theory.
- M-theory.
- Selected quantum-gravity proposals.
- Conceptual representations of higher dimensions.

Clearly label these as educational models.

Never invent numerical predictions.

---

# PHASE 7 — UNIVERSAL EXPERIMENT INTERFACE

Every experiment should contain:

1. Experiment title.
2. Physics question.
3. Interactive visualization.
4. Adjustable variables.
5. Relevant equations.
6. Real-time measurements.
7. Graphs.
8. Explanation.
9. Assumptions and limitations.
10. Scientific references.

### Controls

Include:

- Start.
- Pause.
- Reset.
- Single Step, when applicable.
- Simulation speed.
- Variable sliders.
- Numerical inputs.
- Preset configurations.
- Save Experiment.
- Compare Results.

Use SI units by default.

Allow scientifically useful unit conversions.

---

# PHASE 8 — EQUATION EXPLORER

Create a dedicated interactive mathematical library.

Users should be able to select an equation and explore its variables.

Examples:

**Newton's Second Law**

F = ma

**Universal Gravitation**

F = Gm₁m₂/r²

**Mass-Energy Equivalence**

E = mc²

**Schrödinger Equation**

iℏ ∂ψ/∂t = Ĥψ

**Einstein Field Equations**

Gμν + Λgμν = (8πG/c⁴)Tμν

**Boltzmann Entropy**

S = kB ln Ω

**Maxwell's Equations**

Include all four equations in suitable differential and integral forms.

### Equation features

- Symbol definitions.
- SI units.
- Variable dependencies.
- Editable parameters when meaningful.
- Graphs.
- Example calculations.
- Derivation walkthroughs.
- Assumptions.
- Validity limits.

Do not force every advanced equation into an oversimplified numerical calculator.

For tensor or operator equations, provide guided explanations and carefully selected solvable examples.

---

# PHASE 9 — PHYSICS KNOWLEDGE GRAPH

Create an interactive map connecting scientific ideas.

Examples:

Newtonian Gravity → Kepler's Laws → Orbital Mechanics

Classical Electromagnetism → Maxwell's Equations → Electromagnetic Waves

Special Relativity → Spacetime → General Relativity

Quantum Mechanics → Quantum Field Theory → Standard Model

General Relativity + Quantum Theory → Quantum Gravity Research

Allow users to click concepts and explore connections.

Show prerequisites and suggested learning paths.

Make complex subjects approachable without hiding their mathematical requirements.

---

# PHASE 10 — SCIENTIFIC NOTEBOOK

Create a personal research notebook.

Allow users to:

- Save experiment configurations.
- Record observations.
- Add personal notes.
- Store graphs.
- Compare experiment results.
- Bookmark equations.
- Track completed lessons.

Support local persistence.

Optional JSON export/import.

Do not require accounts or cloud storage.

Avoid arbitrary gamification.

Learning progress should be about understanding, not accumulating points.

---

# PHASE 11 — GUIDED LEARNING

Create three learning levels.

### LEVEL 1 — INTUITIVE

Explain ideas visually with minimal mathematics.

### LEVEL 2 — MATHEMATICAL

Introduce equations, worked examples, and simple derivations.

### LEVEL 3 — ADVANCED

Explore deeper mathematical frameworks, assumptions, approximations, and selected derivations.

Users can change levels at any time.

Advanced mode must remain mathematically honest.

Do not pretend that difficult graduate-level subjects can be fully derived from elementary arithmetic.

---

# PHASE 12 — EXPLAIN WHAT HAPPENS

For every quantitative experiment, include an explanation panel.

When the user changes a variable, explain the relevant physical effect.

Example:

Increasing the mass of an object while keeping applied force constant reduces its acceleration.

The explanation must be grounded in the actual mathematical model.

For theoretical visualizations, explain what the visualization illustrates and what it cannot establish.

Avoid generic AI-generated claims presented as scientific facts.

Use deterministic, content-reviewed explanations where possible.

---

# PHASE 13 — SCIENTIFIC REFERENCES

Create a reference system for every major lesson.

Prefer authoritative scientific and educational sources, including:

- CERN
- NASA
- ESA
- NIST
- OpenStax
- MIT OpenCourseWare
- Max Planck institutes
- Peer-reviewed physics literature
- Recognized university physics resources

Show:

- Source title.
- Institution or author.
- Publication or update date where known.
- Link.
- Subject relevance.

Avoid unsupported scientific claims.

For disputed or developing subjects, show the state of evidence and the date of the source.

All remote references should be ordinary optional links, not required to load the platform.

---

# PHASE 14 — VISUAL DESIGN

AXIOM should feel like a modern scientific observatory combined with an interactive research institute.

### Design style

- Deep navy backgrounds.
- Clean scientific typography.
- Subtle geometric grids.
- Soft cyan highlights.
- Elegant graphs.
- Glowing particles where meaningful.
- Smooth transitions.
- Distinctive subject colours.
- Minimal interface clutter.

Use high-quality 2D and selective 3D visualization.

Do not build decorative simulations that disguise scientific inaccuracies.

### Main navigation

- Home
- Physics Library
- Laboratories
- Theory Explorer
- Equations
- Notebook
- Settings

Ensure the interface works on desktop and mobile.

---

# PHASE 15 — PERFORMANCE

Requirements:

- Smooth interactive simulations.
- Responsive sliders.
- Bounded particle counts.
- Efficient physics updates.
- Web Workers for computationally intensive tasks where appropriate.
- Adaptive rendering quality.
- DevicePixelRatio limits.
- Reduced-motion support.
- Bounded graph history.

Numerical correctness takes priority over decorative rendering.

Display warnings when parameters exceed the reliable domain of a model.

---

# PHASE 16 — TESTING

## Scientific Validation

Create numerical tests for supported models.

Examples:

- Newtonian motion against analytical solutions.
- Energy and momentum conservation.
- Orbital trajectories.
- Ideal gas law.
- Wave propagation relationships.
- Electrical circuit calculations.
- Relativistic time dilation.
- Quantum energy levels.
- Numerical stability.
- Conservation laws.

Use explicit tolerances.

Document integration methods and known limitations.

## Educational Content Validation

Check that:

- Every implemented law has a correct definition.
- Equations use consistent units.
- Symbols are defined.
- Scientific assumptions are stated.
- Explanations match the implemented model.
- Theories are classified accurately.
- Unconfirmed theories are not labelled established fact.
- Citations resolve to real sources.

## Interface Testing

Test:

- Dashboard navigation.
- Search.
- Subject selection.
- Experiment selection.
- Parameter controls.
- Graph rendering.
- Equation Explorer.
- String Theory Explorer.
- Notebook.
- Save and load.
- Mobile touch controls.
- Browser resizing.
- Keyboard accessibility.

Run available browser automation.

Fix observed defects.

Report testing limitations honestly.

---

# PHASE 17 — IMPLEMENTATION STRATEGY

This is a large educational platform.

Do not attempt hundreds of superficial demonstrations.

Prioritize a reliable foundation with depth.

## MILESTONE 1 — FOUNDATION

Implement:

- Complete platform shell.
- Main dashboard.
- Navigation.
- Search.
- Learning levels.
- Scientific reference architecture.
- Equation rendering.
- Notebook foundation.
- Reusable simulation framework.

## MILESTONE 2 — ESTABLISHED PHYSICS

Implement substantive interactive modules for:

- Classical mechanics.
- Thermodynamics.
- Electromagnetism.
- Waves and optics.

Ensure the simulations are tested.

## MILESTONE 3 — MODERN PHYSICS

Implement:

- Special relativity.
- Carefully scoped general relativity demonstrations.
- Quantum mechanics.
- Particle physics.

Ensure mathematical and conceptual correctness.

## MILESTONE 4 — THE UNIVERSE

Implement:

- Cosmology.
- Astrophysics.
- Black-hole visualizations.
- Cosmic expansion experiments.

## MILESTONE 5 — THEORETICAL FRONTIERS

Implement:

- String Theory Explorer.
- Extra-dimension visualization.
- Brane concepts.
- Quantum gravity comparisons.
- Open research questions.

Use clear evidence-status labels.

## MILESTONE 6 — VALIDATION AND POLISH

Complete:

- Cross-module links.
- Scientific citations.
- Numerical tests.
- Educational content reviews.
- Accessibility.
- Mobile optimization.
- Browser QA.
- Documentation.
- Integration preparation.

Finish each milestone with a working, testable result.

Do not describe unfinished placeholders as functional modules.

---

# PHASE 18 — FORGE ARCADE INTEGRATION

AXIOM replaces PHYSICA as the physics learning platform.

Suggested registration:

**Title:** AXIOM

**Subtitle:** The Physics of Everything

**Category:** Science / Education

**Description:** Explore the fundamental laws and theories of physics through interactive laboratories, mathematical visualizations, and scientific experiments.

**Path:** `games/axiom/index.html`

Use the repository's actual registration architecture.

If PHYSICA already exists, inspect its implementation and migration requirements before changing or removing anything.

Preserve all unrelated games and the existing ELEMENTAL chemistry platform.

Prepare a professional AXIOM game card with:

- Orbital trajectories.
- Spacetime geometry.
- Waveforms.
- Quantum probability patterns.
- A subtle mathematical grid.

Do not modify the rest of Forge Arcade unnecessarily.

---

# PHASE 19 — ACCEPTANCE CRITERIA

AXIOM is ready for release when:

1. All ten subject areas have structured, meaningful educational coverage.
2. Major laws and theories are correctly explained.
3. A substantial library of working interactive demonstrations exists.
4. The laboratory interface supports variable manipulation.
5. Relevant equations and numerical outputs are correct.
6. Graphs display actual mathematical or simulation data.
7. The Theory Explorer clearly distinguishes established and speculative science.
8. String Theory Explorer is interactive and scientifically honest.
9. The physics knowledge graph works.
10. Learning levels provide appropriate depth.
11. The notebook can save and restore work.
12. Scientific citations are available.
13. Desktop interaction works.
14. Mobile interaction works.
15. Automated scientific tests pass.
16. Browser QA finds no critical defects.
17. Forge Arcade integration is prepared.

Do not claim comprehensive implementation if only some modules have been delivered.

---

# PHASE 20 — FINAL DELIVERABLES

Provide:

1. Complete AXIOM platform source code.
2. Physics curriculum.
3. Interactive laboratory framework.
4. Scientific equation engine.
5. Interactive visualizations.
6. String Theory Explorer.
7. Physics knowledge graph.
8. Scientific notebook.
9. Search and navigation.
10. Learning levels.
11. Scientific reference library.
12. Automated tests.
13. Numerical validation results.
14. Browser QA report.
15. Mobile testing results.
16. Performance findings.
17. Documentation.
18. Known limitations.
19. Forge Arcade integration patch.
20. Deployment readiness report.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep all implementation changes on a development branch until explicitly authorized.

---

# FINAL DIRECTIVE

AXIOM must be more than a physics encyclopedia.

It must be a place where the user can:

- Understand Newton's laws through actual motion.
- Explore Einstein's relativity through spacetime diagrams.
- Observe quantum behavior through probability models.
- Investigate gravity through orbital experiments.
- Study the mathematics of electromagnetic fields.
- Explore the theoretical ideas behind string theory.
- Compare established physics with unsolved scientific questions.

Do not invent science to make the platform more entertaining.

Make genuine physics interesting through interaction.

**Scientific accuracy first. Exploration second. Visual polish throughout.**

**AXIOM — THE PHYSICS OF EVERYTHING.**