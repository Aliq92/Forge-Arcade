# FORGE ARCADE — FIX #22
## GRAVITY GARDEN: EXPANDED GRAVITY WELL SYSTEM

### ROLE
You are a senior browser-game developer specializing in interactive physics simulations, game feel, and responsive UI.

**Repository:** https://github.com/aliq92/Forge-Arcade  
**Game:** Gravity Garden

Your task is to upgrade the existing Gravity Garden game with a diverse, visually engaging gravity well system.

**Do not rebuild the game from scratch.** Inspect the existing implementation and preserve its core identity, working mechanics, progression, and visual style.

---

## 1. PRE-IMPLEMENTATION INSPECTION

Before editing:

1. Locate Gravity Garden in the repository.
2. Identify its current gravity simulation, object entities, input controls, rendering pipeline, and state management.
3. Document existing well types, force calculations, and gameplay rules.
4. Check whether any proposed well type already exists. Extend it instead of creating duplicates.
5. Determine the safest architecture for introducing multiple well behaviors.

Follow existing project conventions.

Do not modify unrelated games.

---

## 2. ADD SEVEN GRAVITY WELL TYPES

### A. ATTRACTOR WELL
**Behavior:** Pulls nearby objects toward its center.

Requirements:
- Smooth distance-based attraction.
- Adjustable strength and influence radius.
- Softened force near the center to prevent numerical instability.
- Stronger visual glow as objects approach.
- Clear inward particle-flow effects.

### B. REPULSOR WELL
**Behavior:** Pushes nearby objects outward.

Requirements:
- Adjustable repulsion force and radius.
- Smooth acceleration away from the center.
- Visible outward-moving energy rings.
- Avoid unstable velocity spikes at close distances.
- Allow combinations with attractors to create interesting motion.

### C. VORTEX WELL
**Behavior:** Produces swirling movement.

Requirements:
- Apply tangential force around the center.
- Provide adjustable rotation direction, clockwise or counterclockwise.
- Combine a controlled inward attraction with tangential acceleration.
- Display rotating particle spirals.
- Prevent unlimited velocity buildup.

### D. PULSE WELL
**Behavior:** Alternates between attraction and repulsion.

Requirements:
- Configurable pulse frequency.
- Adjustable attraction and repulsion strengths.
- Animated expanding and contracting rings.
- Clearly distinguish attraction and repulsion phases.
- Support deterministic timing based on simulation time.

### E. ORBIT WELL
**Behavior:** Encourages objects to maintain stable circular paths around its center.

Requirements:
- Adjustable preferred orbital radius.
- Apply controlled radial correction toward the target orbit.
- Apply tangential guidance toward an appropriate orbital speed.
- Support clockwise and counterclockwise orbit direction.
- Avoid instantly snapping objects onto the orbit.
- Show a subtle orbital guide ring.

This is an assisted orbit mechanic, not a claim of perfectly realistic gravitational dynamics.

### F. CHAOS WELL
**Behavior:** Produces unusual, changing gravitational disturbances.

Requirements:
- Time-varying force direction and intensity.
- Visually communicate instability.
- Use seeded or deterministic pseudo-random behavior where practical.
- Keep disturbances bounded.
- Prevent excessive acceleration, broken trajectories, or simulation crashes.

Chaos should be interesting, not an excuse for broken physics.

### G. BINARY WELL
**Behavior:** Two linked gravity centers create complex trajectories.

Requirements:
- A single placement action creates two connected centers.
- Adjustable distance between centers.
- Adjustable combined strength.
- Optional rotation of the pair around a shared midpoint.
- Show a subtle connecting energy link.
- Support moving or removing the binary pair as one object.
- Avoid treating the second center as an unrelated well.

Both centers should contribute independently to the final force field.

---

## 3. UNIFIED PHYSICS ENGINE

Implement a clean force-system architecture.

Every well should expose consistent properties where applicable:

- Unique ID
- Type
- Position
- Strength
- Influence radius
- Enabled state
- Type-specific parameters

Each well should calculate its contribution to the acceleration of nearby objects.

**Physics requirements:**

- Use delta-time-aware simulation updates.
- Prefer fixed simulation steps or a stable capped timestep.
- Accumulate contributions from all active wells before updating objects.
- Apply reasonable force and velocity limits.
- Use force softening near singularities.
- Guard against NaN, Infinity, and invalid coordinates.
- Preserve existing collision, boundary, and gameplay rules.
- Ensure enabling several wells together does not break the game.

Avoid frame-rate-dependent outcomes.

---

## 4. GRAVITY WELL SELECTION PANEL

Introduce an intuitive well-selection interface.

Include:

- Seven clearly labeled well types.
- Distinct icons or symbols for each type.
- Currently selected well indicator.
- Short description of the selected behavior.
- Strength control.
- Radius control.
- Type-specific controls where appropriate.
- Delete or clear-well options.

For desktop, provide mouse-based placement and selection.

For mobile, support touch placement without accidental page scrolling or unwanted gestures.

Do not let the control panel cover essential gameplay.

---

## 5. VISUAL IDENTITY

Make every well visually recognizable.

| Well | Suggested Appearance |
|---|---|
| Attractor | Deep blue inward glow |
| Repulsor | Red-orange outward rings |
| Vortex | Purple rotating spiral |
| Pulse | Cyan and magenta alternating waves |
| Orbit | Emerald circular guide |
| Chaos | Shifting multicolour distortion |
| Binary | Two gold energy cores joined by a luminous arc |

Add smooth animations, particle trails, glow, and subtle field effects.

Keep the graphics readable and performant. Visual effects must not overwhelm the simulation.

Respect reduced-motion preferences where practical.

---

## 6. INTERACTIVE EXPERIMENTATION

Players should be able to:

1. Place different wells in the same garden.
2. Observe combined gravitational effects.
3. Select existing wells and adjust their parameters.
4. Move or reposition wells if the existing game supports dragging or editing.
5. Remove individual wells.
6. Pause and resume the simulation if compatible with the current game.
7. Reset the simulation without leaving the game.

Preserve all existing gameplay objectives.

If Gravity Garden includes levels, challenges, unlocks, or progression, integrate the new well types without making established levels unsolvable or trivial.

Do not introduce a new progression system unless necessary.

---

## 7. PERFORMANCE AND RELIABILITY

Optimize for desktop and mobile browsers.

Requirements:

- Smooth simulation under typical gameplay loads.
- Minimize unnecessary allocations inside the animation loop.
- Use spatial filtering or equivalent optimization if particle counts warrant it.
- Cap expensive particle effects.
- Prevent memory leaks and animation-loop duplication.
- Handle browser resizing and device pixel ratios.
- Ensure pause, restart, and cleanup behave correctly.

---

## 8. TESTING

Run the project locally and test actual gameplay.

Verify:

- All seven well types can be created and selected.
- Strength adjustments change behavior.
- Radius adjustments change influence.
- Vortex direction changes correctly.
- Pulse timing remains stable.
- Orbit guidance works without teleporting objects.
- Chaos forces remain bounded.
- Binary wells behave as linked pairs.
- Multiple wells combine correctly.
- Removing wells cleans up their effects.
- Existing gameplay remains functional.
- Controls work on desktop and touch devices.
- No uncaught runtime errors occur.

Add or update automated tests where the repository supports them.

Test force calculations separately from visual rendering wherever possible.

---

## 9. ACCEPTANCE CRITERIA

The upgrade is complete when:

- Gravity Garden contains seven functional gravity well types.
- Each type has meaningfully different behavior.
- Players can select, place, adjust, and remove wells.
- Multiple well types interact through a stable simulation.
- Visual effects clearly communicate well behavior.
- Existing gameplay and progress remain intact.
- Desktop and mobile interaction works.
- Relevant tests pass.

---

## 10. DELIVERY INSTRUCTIONS

After implementation:

1. Summarize changed files.
2. Explain the seven well behaviors.
3. Report testing performed and results.
4. Identify any compatibility issues or limitations.
5. Provide a concise list of remaining issues, if any.

**Important constraints:**

- Do not modify unrelated Forge Arcade games.
- Do not remove existing Gravity Garden features without justification.
- Do not silently overwrite player progress.
- Do not deploy, publish, merge, or push changes to the live site without explicit authorization.
- If a new feature conflicts with existing architecture, explain the conflict and implement the smallest safe solution.

**Final objective:** Transform Gravity Garden into a richer, more creative gravity playground where players can experiment with seven distinctive types of wells and discover complex interactions through intuitive controls and smooth, stable physics.