# CODEX BUILD — PHYSICA
## The Interactive Physics Laboratory
### Forge Arcade — Complete Implementation Specification

You are a senior physics simulation engineer, educational game developer, scientific visualization specialist, and frontend architect.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target directory:** `games/physica/`

**Companion game:** ELEMENTAL — Chemistry Laboratory

Your mission is to design, implement, test, and prepare PHYSICA, a complete interactive physics laboratory featuring four experimental disciplines, sixteen guided experiments, twelve scientific challenges, live measurements, interactive graphs, educational explanations, and a creative sandbox.

This is a complete game implementation task, not a request for a prototype or mockup.

**Core philosophy: Change a variable. Observe the result. Understand the physics.**

---

# PHASE 1 — REPOSITORY INSPECTION

## 1. Inspect Existing Forge Arcade

Before modifying anything:

- Inspect the repository architecture.
- Find and inspect ELEMENTAL.
- Identify ELEMENTAL's visual language, navigation, teaching style, and experiment structure.
- Review existing game registration and navigation.
- Examine shared styling and interface conventions.
- Identify current build and testing tools.

Use ELEMENTAL as the experience and design reference.

Do not assume its exact architecture or feature set until inspected.

PHYSICA must remain an independent game.

Preserve ELEMENTAL and every other existing game.

Create a separate development branch where supported.

Do not deploy automatically.

## 2. Technical Requirements

Use:

- HTML5 Canvas 2D.
- Vanilla JavaScript.
- CSS3.
- requestAnimationFrame.
- Web Audio API for optional procedural sound.
- localStorage for progress and saved experiments.

No external frameworks, remote APIs, CDNs, or backend dependencies.

Suggested directory structure:

```text
games/physica/
├── index.html
├── style.css
├── main.js
├── app.js
├── core/
│   ├── simulation.js
│   ├── units.js
│   ├── integrators.js
│   ├── measurements.js
│   └── storage.js
├── labs/
│   ├── gravity.js
│   ├── motion.js
│   ├── waves.js
│   └── electricity.js
├── ui/
│   ├── controls.js
│   ├── renderer.js
│   ├── graphs.js
│   └── tutorials.js
├── content/
│   ├── experiments.js
│   ├── challenges.js
│   └── explanations.js
├── tests/
│   ├── gravity.test.js
│   ├── motion.test.js
│   ├── waves.test.js
│   ├── circuits.test.js
│   └── integration.test.js
└── README.md
```

Adapt this structure to the repository's conventions if appropriate.

Separate mathematical simulation from rendering and interface handling.

Use a consistent numerical timebase.

Keep physical calculations independent of frame rate.

---

# PHASE 2 — PRODUCT DESIGN

## 3. Core Experience

PHYSICA is a collection of interactive scientific laboratories.

Players can:

1. Select a laboratory.
2. Choose a guided experiment or Free Experiment Mode.
3. Adjust physical variables.
4. Start, pause, reset, or step through the simulation.
5. Observe motion and physical interactions.
6. Measure results.
7. Inspect live graphs.
8. Read explanations of observed behavior.
9. Complete scientific challenges.
10. Save and revisit experiment configurations.

The simulation must react immediately and predictably to user inputs.

## 4. Scientific Integrity

Prioritize mathematical correctness.

Use SI units wherever meaningful.

State when models are idealized.

Distinguish:

- Physical quantities.
- Simulation parameters.
- Rendering scale.
- Numerical approximations.

Avoid presenting arbitrary game rules as established physics.

Each laboratory must document its governing equations, assumptions, and limitations.

Use validated numerical methods appropriate to each simulation.

---

# PHASE 3 — GLOBAL USER INTERFACE

## 5. Laboratory Dashboard

Create a polished scientific dashboard.

Title:

**PHYSICA**

Subtitle:

"The Interactive Physics Laboratory"

Display four laboratory cards:

1. GRAVITY & ORBITS
2. MOTION & FORCES
3. WAVES & OSCILLATIONS
4. ELECTRICITY & CIRCUITS

Each card includes:

- Animated preview.
- Short description.
- Number of experiments.
- Challenge progress.
- Enter Lab button.

Use a dark scientific interface with vibrant experiment colours.

## 6. Visual Identity

Recommended palette:

- Background: Deep navy.
- Primary accents: Cyan.
- Gravity: Violet.
- Motion: Orange.
- Waves: Teal.
- Electricity: Yellow.
- Data visualization: High-contrast scientific colours.

Use glowing vectors, clean diagrams, subtle grid lines, and readable labels.

Avoid excessive visual effects that obscure measurements.

## 7. Shared Laboratory Interface

Every lab should include:

- Experiment viewport.
- Adjustable parameter panel.
- Measurement panel.
- Graph panel.
- Start.
- Pause.
- Reset.
- Single Step.
- Simulation speed.
- Tutorial.
- Experiment selector.

Display relevant units beside every numeric parameter.

Provide sensible minimums, maximums, and increments.

Prevent invalid input values.

---

# PHASE 4 — GRAVITY & ORBITAL LAB

## 8. Gravity Simulation

Implement a two-dimensional Newtonian gravity sandbox.

Allow players to create celestial bodies and observe their interactions.

Supported bodies:

- Stars.
- Planets.
- Moons.
- Asteroids.

Their physics must depend on physical parameters, not object labels.

Each body contains:

- Mass.
- Position.
- Velocity.
- Radius for rendering and collisions.
- Colour.
- Optional trail.

### Governing equation

Newton's universal gravitation:

F = G(m₁m₂)/r²

Vector accelerations must be calculated using the correct direction and distance.

Handle numerical singularities safely.

Use gravitational softening only when explicitly justified and documented.

## 9. Orbital Integration

Implement velocity Verlet or another suitable symplectic integrator.

Avoid naive variable-frame Euler integration for orbital mechanics.

Use fixed timesteps and bounded simulation steps.

Display:

- Orbital paths.
- Velocity vectors.
- Acceleration vectors.
- Center of mass.
- Optional predicted trajectories.

### Measurement tools

Include:

- Position.
- Velocity.
- Acceleration.
- Kinetic energy.
- Gravitational potential energy.
- Total mechanical energy.
- Angular momentum.

Provide energy-drift diagnostics.

### Collision behavior

Define a consistent collision model.

For example, optionally merge colliding bodies while conserving linear momentum.

Clearly indicate when a collision model is approximate.

## 10. Gravity Experiments

Implement four guided experiments.

**G1 — Falling Objects**

Study gravitational acceleration.

Compare motion using different gravitational strengths.

**G2 — Circular Orbits**

Adjust initial tangential velocity and observe orbit formation.

**G3 — Elliptical Orbits**

Explore how orbital speed changes with distance.

**G4 — Three-Body Interaction**

Observe a simplified three-body gravitational system.

Demonstrate sensitivity to initial conditions.

Include reliable presets.

---

# PHASE 5 — MOTION & FORCES LAB

## 11. Motion Simulation

Implement an interactive two-dimensional mechanics environment.

Support:

- Mass.
- Velocity.
- Acceleration.
- Gravity.
- Friction.
- Applied force.
- Air resistance where appropriate.

Use Newton's second law:

F = ma

Show the net-force vector and resultant acceleration.

## 12. Physics Objects

Support:

- Blocks.
- Balls.
- Inclined planes.
- Surfaces with adjustable friction.
- Simple collision boundaries.

### Force visualization

Display:

- Weight.
- Normal force.
- Friction.
- Applied force.
- Net force.

Keep arrows correctly scaled and labelled.

Distinguish force vectors from velocity vectors.

## 13. Collision Models

Support idealized elastic and inelastic collisions.

Use conservation of momentum.

For elastic collisions, kinetic energy should also be conserved within numerical tolerance.

For inelastic collisions, account for the reduction in mechanical kinetic energy.

Do not claim total energy disappears.

## 14. Motion Experiments

**M1 — Projectile Motion**

Change initial speed and angle.

Measure range, flight time, and maximum height.

Compare against ideal analytical solutions.

**M2 — Friction & Inclined Planes**

Change inclination and friction coefficient.

Observe sliding conditions and acceleration.

**M3 — Newton's Second Law**

Apply different forces to different masses.

Observe acceleration.

**M4 — Collisions & Momentum**

Experiment with collisions of different masses and restitution values.

Measure momentum before and after.

---

# PHASE 6 — WAVES & OSCILLATIONS LAB

## 15. Wave Simulation

Implement an interactive wave visualization system.

Support:

- Amplitude.
- Frequency.
- Wavelength.
- Wave speed.
- Phase.
- Damping where applicable.

Use the wave relationship:

v = fλ

Display the equation and current values.

## 16. Oscillator Systems

Implement:

- Simple pendulum.
- Mass-spring oscillator.
- Traveling transverse waves.
- Standing waves.

### Pendulum

Use the nonlinear equation of motion for finite angles.

Provide the small-angle approximation as an educational comparison.

### Spring

Use Hooke's law:

F = -kx

Model damping separately.

### Wave visuals

Display:

- Displacement.
- Phase.
- Energy indicators where meaningful.
- Wave propagation.

## 17. Wave Experiments

**W1 — Simple Pendulum**

Change length, gravity, and starting angle.

Measure oscillation period.

**W2 — Spring Oscillator**

Change mass, stiffness, and damping.

Observe oscillations and energy exchange.

**W3 — Wave Properties**

Change frequency, amplitude, and wavelength.

Study propagation.

**W4 — Standing Waves**

Observe nodes, antinodes, and resonance modes.

Use an explicitly defined boundary-condition model.

---

# PHASE 7 — ELECTRICITY & CIRCUITS LAB

## 18. Virtual Circuit Builder

Create a safe, interactive low-voltage circuit sandbox.

Players can assemble virtual circuits using:

- DC voltage sources.
- Resistors.
- Lamps.
- Switches.
- Wires.
- Ammeters.
- Voltmeters.

This is an educational circuit model, not a real electrical operating simulator.

Never provide instructions for working on energized infrastructure.

## 19. Circuit Simulation

Implement a consistent DC resistive circuit solver.

Use:

- Ohm's law.
- Kirchhoff's current law.
- Kirchhoff's voltage law.
- Nodal analysis or modified nodal analysis.

Support:

- Series circuits.
- Parallel circuits.
- Combined circuits.
- Open switches.
- Properly instrumented measurement connections.

### Electrical measurements

Display:

- Voltage (V).
- Current (A).
- Resistance (Ω).
- Power (W).

Use:

V = IR

P = VI

### Meter behavior

Voltmeters measure potential difference between two nodes.

Ammeters measure branch current.

Use suitable ideal meter models.

Do not silently treat meters as generic decorative readouts.

## 20. Electrical Safety and Numerical Stability

Reject or safely resolve invalid configurations, including:

- Conflicting ideal voltage constraints.
- Singular floating networks.
- Shorted ideal sources.
- Invalid component values.
- Numerical instability.

Display understandable simulation warnings.

Do not freeze the browser.

If lamps use a simplified fixed-resistance model, identify that simplification.

## 21. Electricity Experiments

**E1 — Ohm's Law**

Change voltage and resistance.

Measure current.

**E2 — Series Circuits**

Study voltage division and current continuity.

**E3 — Parallel Circuits**

Study current division and equivalent resistance.

**E4 — Electrical Power**

Investigate how voltage, current, and resistance affect power.

Provide ready-to-use circuit layouts.

---

# PHASE 8 — SIXTEEN EXPERIMENTS

## 22. Guided Experiment Structure

Every guided experiment must contain:

1. Title.
2. Learning objective.
3. Initial setup.
4. Adjustable parameters.
5. Prediction question.
6. Run Experiment action.
7. Measurements.
8. Graphs.
9. Explanation.
10. Reset Experiment.

Provide a clear distinction between expected theoretical outcomes and measured simulated outcomes.

Avoid requiring players to memorize formulas before experimenting.

Allow free exploration after completing a guided experiment.

---

# PHASE 9 — TWELVE SCIENTIFIC CHALLENGES

## 23. Challenge Structure

Implement three challenges per laboratory.

Each challenge includes:

- Objective.
- Available tools.
- Initial conditions.
- Success criteria.
- Feedback.
- Optional hint.

Use actual simulation state to evaluate success.

Do not reward simply clicking the correct button.

## 24. Gravity Challenges

**C1 — Stable Orbit**

Create a body that remains within a specified orbital distance range for a defined duration.

**C2 — Escape Velocity**

Launch an object with enough velocity to escape a specified gravitational field.

**C3 — Orbital Transfer**

Adjust velocity to reach a target orbital region.

Use clearly defined tolerances.

## 25. Motion Challenges

**C4 — Target Landing**

Launch a projectile into a target region.

**C5 — Friction Control**

Choose surface parameters to stop a moving object within a target zone.

**C6 — Momentum Match**

Configure a collision that produces a specified final velocity.

## 26. Wave Challenges

**C7 — Pendulum Timing**

Adjust pendulum length to achieve a target period.

**C8 — Spring Tuning**

Adjust mass and stiffness to achieve a target oscillation frequency.

**C9 — Resonance Match**

Configure a standing-wave system to produce the requested resonance mode.

## 27. Electricity Challenges

**C10 — Current Target**

Build a circuit that produces a target branch current.

**C11 — Voltage Divider**

Choose resistor values to obtain a target output voltage.

**C12 — Power Balance**

Build a circuit that delivers a specified power level to a load within tolerance.

### Challenge Validation

Check results numerically.

Require stable solutions when appropriate.

Prevent invalid configurations from satisfying objectives.

---

# PHASE 10 — DATA VISUALIZATION

## 28. Live Graphing System

Create reusable scientific graph components.

Supported graph types:

- Time-series line graphs.
- Position-versus-time.
- Velocity-versus-time.
- Acceleration-versus-time.
- Force-versus-displacement.
- Energy-versus-time.
- Voltage-versus-current.
- Wave displacement.

### Graph features

Provide:

- Clearly labelled axes.
- SI units.
- Zoom or scaling controls.
- Pause graph updates.
- Reset graph.
- Data sampling.
- Optional theoretical reference curves.

Keep graph history bounded for performance.

## 29. Measurement Accuracy

Use numerical precision suitable for each laboratory.

Avoid false precision.

Show physical quantities using appropriate units and significant figures.

Separate display rounding from internal calculations.

Provide scientific notation for very large or small values.

---

# PHASE 11 — FORMULAS AND EXPLANATIONS

## 30. Interactive Formula Panel

Each experiment should show its governing equations.

Examples:

Gravity:
F = Gm₁m₂/r²

Motion:
F = ma

Kinetic Energy:
KE = ½mv²

Pendulum Approximation:
T ≈ 2π√(L/g)

Waves:
v = fλ

Electricity:
V = IR

Electrical Power:
P = VI

### Formula behavior

Display current variable values.

Update calculated results when parameters change.

Explain assumptions behind each formula.

For instance, the simple pendulum period approximation is accurate mainly for small oscillation angles.

Do not silently apply approximations beyond their stated validity.

---

# PHASE 12 — FREE EXPERIMENT MODE

## 31. Scientific Sandbox

Each laboratory must have a Free Experiment Mode.

Players can:

- Create or remove appropriate objects.
- Modify physical variables.
- Test original configurations.
- Pause and resume.
- Reset.
- Save experiments.
- Load experiments.
- Inspect measurements.
- Compare outcomes.

### Sandbox design

Allow creativity while retaining numerical stability.

Set reasonable object and component limits.

Provide a warning for unsupported configurations.

---

# PHASE 13 — TUTORIAL SYSTEM

## 32. Interactive Tutorials

Create a short tutorial for each laboratory.

Teach:

- How to adjust parameters.
- How to run simulations.
- How to read graphs.
- How to interpret vectors and measurements.
- How to reset experiments.
- How to complete challenges.

Use short, contextual instructions.

Make tutorials skippable.

## 33. Educational Feedback

When a user changes a parameter, provide helpful observations.

Example:

"Increasing mass while keeping force constant reduces acceleration."

Generate these explanations from actual relationships and simulation state.

Avoid inventing explanations inconsistent with the current experiment.

---

# PHASE 14 — SAVE SYSTEM

## 34. Persistent Progress

Use localStorage to save:

- Completed experiments.
- Challenge results.
- Laboratory preferences.
- Saved sandbox configurations.
- Tutorial progress.
- Sound settings.

Use versioned schemas.

Validate imported or loaded data.

Handle unavailable storage gracefully.

Do not interfere with ELEMENTAL save data.

---

# PHASE 15 — DESKTOP AND MOBILE

## 35. Desktop Controls

Support:

- Mouse selection.
- Dragging objects.
- Keyboard shortcuts.
- Parameter sliders.
- Numeric inputs.
- Zoom and pan.
- Start and pause.
- Single-step simulation.
- Reset.

Provide clear hover and selection feedback.

## 36. Mobile Controls

Support Android and iPhone browsers.

Implement:

- Touch dragging.
- Large sliders.
- Touch-friendly buttons.
- Responsive diagrams.
- Collapsible control panels.
- Graph scrolling.
- Portrait and landscape layouts.

Avoid accidental scrolling during canvas manipulation.

Ensure controls remain practical on smaller devices.

---

# PHASE 16 — PERFORMANCE

## 37. Optimization

Target smooth operation on desktop and mid-range Android devices.

Use:

- Fixed simulation timesteps.
- Appropriate numerical integrators.
- Bounded history buffers.
- Viewport-aware rendering.
- DevicePixelRatio caps.
- Object count limits.
- Efficient circuit matrix calculations.
- Reusable graphics resources.
- Adaptive rendering quality.

### Simulation reliability

The numerical timestep must be chosen according to model stability and accuracy, not just visual smoothness.

For fast oscillations or close gravitational encounters, apply suitable warnings, substeps, or timestep constraints.

Do not silently produce misleading results.

---

# PHASE 17 — AUTOMATED TESTING

## 38. Gravity Tests

Verify:

- Newtonian gravitational forces.
- Two-body symmetry.
- Circular orbit stability.
- Elliptical orbit behavior.
- Center-of-mass conservation.
- Energy drift within documented tolerances.
- Escape conditions.
- Collision behavior.
- Deterministic simulation.

## 39. Motion Tests

Verify:

- Newton's second law.
- Projectile trajectories.
- Friction behavior.
- Inclined-plane motion.
- Momentum conservation.
- Collision restitution.
- Energy accounting.
- Reset behavior.

## 40. Wave Tests

Verify:

- Pendulum small-angle behavior.
- Pendulum nonlinear motion.
- Spring oscillation period.
- Damping behavior.
- Wave relationship v = fλ.
- Standing-wave resonance.
- Energy behavior where modeled.

## 41. Electricity Tests

Verify:

- Ohm's law.
- Series resistance.
- Parallel resistance.
- Kirchhoff's laws.
- Voltage division.
- Current division.
- Power calculations.
- Open circuits.
- Invalid configurations.
- Meter behavior.
- Numerical solver stability.

## 42. Challenge Tests

Validate all twelve challenges.

Each challenge must have:

- A demonstrably achievable solution.
- Correct success detection.
- Correct failure or incomplete feedback.
- A working reset.
- Appropriate numerical tolerances.

Create deterministic reference solutions.

Do not claim challenges are complete merely because their UI exists.

---

# PHASE 18 — BROWSER TESTING

## 43. Functional QA

Where browser automation is available, test:

- Application startup.
- Laboratory selection.
- All sixteen experiments.
- All twelve challenges.
- Parameter adjustment.
- Simulation controls.
- Graph updates.
- Formula updates.
- Sandbox Mode.
- Save and load.
- Tutorial navigation.
- Desktop interaction.
- Mobile touch.
- Portrait and landscape layouts.
- Browser resizing.

Inspect console errors.

Fix observed defects.

Report unavailable tests explicitly.

## 44. Scientific Validation

Compare simulated results against analytical solutions where available.

Examples:

- Projectile range without drag.
- Circular orbital velocity.
- Simple harmonic oscillator period.
- Small-angle pendulum period.
- Series and parallel circuit calculations.

State test tolerances.

Report maximum observed errors for representative cases.

Do not invent accuracy measurements.

---

# PHASE 19 — FORGE ARCADE INTEGRATION

## 45. Game Registration

Prepare a Forge Arcade game entry using the repository's actual registration format.

Suggested metadata:

**Title:** PHYSICA

**Subtitle:** The Interactive Physics Laboratory

**Category:** Simulation / Educational

**Description:** Experiment with gravity, motion, waves, and electricity in four interactive scientific laboratories.

**Path:** `games/physica/index.html`

Inspect the existing registry before editing.

## 46. Game Card

Prepare a distinctive thumbnail featuring:

- Orbiting celestial bodies.
- A projectile trajectory.
- An animated wave.
- A glowing electrical circuit.
- A clean scientific interface.

Use the established Forge Arcade card style.

Do not redesign unrelated cards.

## 47. Companion Identity

Where appropriate, visually connect PHYSICA with ELEMENTAL.

Use consistent:

- Navigation.
- Typography.
- Experiment structure.
- Progress display.
- Scientific terminology.
- Challenge presentation.

Preserve each game's independent identity.

Do not modify ELEMENTAL without a specific technical need.

## 48. Integration Safety

Preserve:

- Forge Arcade homepage.
- All existing games.
- Game cards.
- Filters.
- Navigation.
- Shared assets.
- Deployment configuration.

Use relative file paths.

Avoid external runtime dependencies.

**Do not deploy automatically.**

---

# PHASE 20 — ACCEPTANCE CRITERIA

PHYSICA is complete when:

- Four fully functional laboratories exist.
- Gravity simulations use a validated numerical method.
- Motion and collision experiments behave consistently.
- Wave and oscillator simulations are mathematically coherent.
- The circuit builder solves supported DC networks correctly.
- Sixteen guided experiments are functional.
- Twelve challenges have verified solutions.
- Scientific measurements show appropriate SI units.
- Graphs display actual simulation data.
- Formula panels explain governing relationships.
- Free Experiment Mode works for every lab.
- Progress and saved experiments persist.
- Tutorials are usable.
- Desktop controls function.
- Mobile touch controls function.
- Automated tests pass.
- Scientific validation results are documented.
- Browser testing reveals no critical defects.
- Forge Arcade integration is prepared.

---

# PHASE 21 — FINAL DELIVERABLES

Provide:

1. Complete playable PHYSICA application.
2. Four interactive laboratories.
3. Sixteen guided experiments.
4. Twelve scientific challenges.
5. Gravity simulation engine.
6. Motion and collision simulation.
7. Waves and oscillation simulation.
8. DC electrical circuit solver.
9. Scientific graphing system.
10. Interactive formula panels.
11. Measurement system with units.
12. Free Experiment Mode.
13. Tutorials.
14. Save and load functionality.
15. Desktop and mobile controls.
16. Automated testing suite.
17. Scientific validation report.
18. Browser QA results.
19. Performance findings.
20. Screenshots, if available.
21. README and user instructions.
22. Known limitations.
23. Forge Arcade integration changes or prepared patch.
24. Deployment readiness report.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep changes on a separate development branch until explicitly approved.

---

# FINAL DIRECTION

PHYSICA must feel like a genuine interactive scientific laboratory.

The user should be able to manipulate physical variables and observe meaningful results.

Gravity should produce believable orbits.

Forces should produce measurable acceleration.

Waves should respond predictably to frequency and amplitude.

Circuits should obey supported electrical laws.

Graphs and equations should explain the behavior rather than merely decorate the interface.

Build a laboratory that encourages experimentation, curiosity, and scientific understanding.

**Inspect first. Implement completely. Validate mathematically. Test thoroughly.**