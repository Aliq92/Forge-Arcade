# CODEX — FIX #16: ECHO TIDE
## The Deepwater Surge Update

You are a senior indie browser-game developer, gameplay engineer, and technical artist working inside the existing Forge Arcade repository.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target game:** `games/echo-tide/`

Your mission is to improve ECHO TIDE by adding a responsive ship burst ability, introducing meaningful new navigation challenges, refining movement, and enhancing underwater visual feedback.

This is an upgrade to the existing game, NOT a complete rebuild.

**Core vision: Use sonar to discover the unknown, then use burst propulsion to escape danger.**

---

## 1. INSPECT BEFORE MODIFYING

Before implementing anything:

- Inspect the actual ECHO TIDE source files.
- Confirm its directory and rendering architecture.
- Understand the current ship controls.
- Review sonar pulse mechanics.
- Identify disturbance, detection, or threat systems.
- Inspect terrain generation and collision detection.
- Review beacon collection and sanctuary objectives.
- Identify existing difficulty and progression systems.
- Review desktop and mobile controls.
- Run available tests.

Preserve working features.

Do not assume that previous improvements have already been implemented.

Do not modify unrelated Forge Arcade games.

## 2. NEW SHIP BURST ABILITY

Implement a temporary propulsion burst that gives the ship a short acceleration boost.

### Controls

Desktop:

- SPACE — Activate burst.
- SHIFT — Alternative burst key, if available.

Mobile:

- Dedicated BURST button.

Respect existing key bindings. If SPACE or SHIFT already performs another function, choose a nonconflicting binding and display it in the controls.

### Burst behavior

When activated:

- Ship accelerates rapidly in its current facing direction.
- A short engine trail appears.
- Water particles scatter behind the ship.
- Ship movement becomes temporarily faster.
- Normal movement resumes smoothly afterward.

### Suggested initial tuning

- Burst duration: 0.6 seconds.
- Burst speed multiplier: 2.2× normal maximum speed.
- Cooldown: 4 seconds.
- Brief activation feedback.
- No abrupt velocity reset.

Treat these as starting values, not fixed requirements.

Tune against the existing movement physics.

### Important

Burst should feel powerful but controllable.

Avoid instant teleportation or erratic acceleration.

Do not let burst bypass terrain collisions.

## 3. BURST ENERGY AND COOLDOWN

Implement a clear cooldown indicator.

Suggested interface:

**BURST READY**

After activation:

**RECHARGING — 3.2s**

### Visual indicator

Use a compact radial or horizontal recharge meter.

### Feedback

When burst becomes available:

- Show a subtle glow.
- Play a gentle ready sound.
- Highlight the burst button briefly.

Do not introduce a separate complicated fuel system unless the game already uses one.

Cooldown should encourage thoughtful timing without excessive waiting.

## 4. BURST VISUAL EFFECTS

Make burst activation satisfying.

Include:

- Bright propulsion trail.
- Short expanding water-pressure ring.
- Directional particles.
- Subtle ship glow.
- Brief speed-line effects.
- Underwater turbulence.

Use the game's existing colour palette.

Suggested effects:

- Cyan propulsion glow.
- Pale blue particles.
- Soft turquoise pressure ring.

Avoid excessive flashes or screen shake.

Respect reduced-motion preferences.

## 5. BURST AND SONAR INTERACTION

Connect the new ability to ECHO TIDE's signature sonar mechanic.

### Core interaction

Burst propulsion generates underwater disturbance.

This means burst can help the player escape immediate danger but may attract attention.

### Suggested rules

- Normal movement creates low disturbance.
- Sonar pulses generate a noticeable disturbance spike.
- Burst generates a moderate temporary disturbance increase.
- Disturbance gradually decreases when the player moves quietly.

### Gameplay consequence

Players must decide:

**Use burst now to escape, or remain quiet to avoid attracting threats?**

Make this relationship easy to understand.

If the existing game already contains a disturbance system, extend it rather than creating a duplicate.

## 6. IMPROVE SHIP HANDLING

Review and refine the existing movement system.

Improve:

- Acceleration.
- Deceleration.
- Turning responsiveness.
- Momentum.
- Wall collision handling.
- Burst recovery.
- Frame-rate consistency.

### Movement goal

The ship should feel like a small underwater vessel.

It should have a sense of mass without feeling sluggish.

Avoid excessive sliding or unpredictable steering.

### Collision safety

At higher burst speeds, implement appropriate collision handling to prevent tunnelling through thin obstacles.

Use swept collision detection or sufficiently bounded substeps where necessary.

## 7. ADD MEANINGFUL NAVIGATION CHALLENGES

Introduce additional challenges that complement sonar exploration.

Avoid turning the game into a generic racing game.

### Challenge A — NARROW PASSAGES

Create tight underwater routes.

Players must navigate using careful sonar readings.

Burst may be useful on straight sections but risky near corners.

### Challenge B — MOVING CURRENTS

Introduce localized currents.

Currents influence ship movement.

Use subtle particles to indicate direction once the area has been revealed.

Avoid unfair invisible forces.

### Challenge C — ECHO SHADOWS

Introduce regions that distort or weaken sonar visibility.

Players must interpret incomplete information.

Provide readable feedback so the mechanic feels like a puzzle rather than random blindness.

### Challenge D — PATROLLING THREATS

Where compatible with existing enemy systems, introduce simple moving threats.

Threats react to disturbance.

Players can avoid them by moving quietly or use burst to escape.

### Challenge E — COLLAPSING ROUTES

Introduce selected environmental passages that temporarily become dangerous or inaccessible.

Use clear warnings and enough reaction time.

Never generate an unavoidable trap.

## 8. DIFFICULTY PROGRESSION

Introduce challenges gradually.

### EARLY GAME

Teach:

- Ship movement.
- Sonar.
- Burst propulsion.
- Cooldown.

### MID GAME

Introduce:

- Narrow passages.
- Moving currents.
- More complex beacon locations.

### LATE GAME

Combine:

- Disturbance-sensitive threats.
- Sonar interference.
- Current navigation.
- Strategic burst timing.

Avoid overwhelming the player early.

Maintain the game's original atmosphere.

## 9. PRESERVE ORIGINAL OBJECTIVES

The established ECHO TIDE gameplay involves:

- Exploring a dark underwater environment.
- Using sonar to reveal surroundings.
- Collecting three beacons.
- Reaching the sanctuary.

Preserve these goals if they match the current implementation.

Do not replace the beacon objective with unrelated missions.

### Optional challenge objectives

Introduce small optional rewards such as:

- Complete a sector without triggering high disturbance.
- Discover hidden underwater landmarks.
- Escape a pursuing threat using burst.
- Navigate a current-heavy passage.

Optional challenges should reward skill without blocking main progression.

## 10. SONAR VISUAL IMPROVEMENTS

Improve sonar readability and presentation.

### Pulse effects

- Smooth expanding circular wave.
- Clear terrain reveal.
- Gentle fading echoes.
- Subtle object highlights.
- Directional feedback.

### Important

Sonar must remain the main navigation tool.

Do not make the environment so bright that sonar becomes unnecessary.

### Accessibility

Ensure important objects can be distinguished through shape and contrast, not colour alone.

## 11. UNDERWATER ENVIRONMENT POLISH

Improve the existing atmosphere using:

- Dark ocean gradients.
- Distant terrain silhouettes.
- Floating particles.
- Gentle underwater currents.
- Subtle marine-life silhouettes.
- Soft bioluminescent accents.

Keep visual effects restrained.

ECHO TIDE should remain mysterious and atmospheric.

Do not turn the game into a brightly illuminated reef simulator.

## 12. NEW CHALLENGE INDICATORS

Introduce clear warning indicators for:

- Nearby hazards.
- Dangerous currents.
- Elevated disturbance.
- Threat detection.
- Burst cooldown.

Use simple, readable visuals.

Avoid cluttering the screen.

## 13. GAMEPLAY FEEDBACK

Add satisfying effects for:

- Beacon collection.
- Burst activation.
- Burst recharge.
- Successful threat evasion.
- Reaching new areas.
- Sanctuary arrival.
- Completing optional challenges.

Use brief animations and restrained particles.

Avoid long interruptions.

## 14. MAIN MENU AND HUD

Improve the existing UI where necessary.

### Main menu

Title:

**ECHO TIDE**

Subtitle:

"Listen to the deep. Move through the unknown."

Preserve existing options.

### In-game HUD

Display:

- Beacon progress.
- Burst status.
- Disturbance level, if present.
- Relevant objective guidance.
- Pause.
- Restart.

Keep the screen uncluttered.

## 15. AUDIO DESIGN

Preserve existing audio.

Where useful, add:

- Subtle underwater ambience.
- Sonar ping.
- Burst propulsion.
- Current movement.
- Beacon collection.
- Threat warning.
- Sanctuary completion.

Audio must enhance navigation without becoming overwhelming.

Never autoplay before user interaction.

Provide a mute toggle.

## 16. DESKTOP CONTROLS

Preserve existing controls.

Ensure:

- Responsive steering.
- Smooth movement.
- Reliable sonar activation.
- Dedicated burst input.
- Pause and restart.
- Clearly documented controls.

Avoid conflicting keyboard bindings.

## 17. MOBILE CONTROLS

Support Android and iPhone browsers.

Include:

- Responsive steering controls.
- Sonar button.
- Burst button.
- Pause.
- Restart.

### Layout

Make burst easily reachable without blocking important gameplay.

Prevent accidental page scrolling.

Support landscape play and a usable portrait layout where feasible.

## 18. PERFORMANCE OPTIMIZATION

Target smooth gameplay on desktop and mid-range Android devices.

Use:

- Efficient Canvas or existing renderer.
- Bounded particle counts.
- Reusable effects.
- Delta-time movement.
- Viewport culling.
- DevicePixelRatio caps.
- Efficient sonar calculations.
- Limited active threats.

Avoid excessive sonar geometry calculations each frame.

Maintain responsive controls during burst and sonar effects.

## 19. ACCESSIBILITY

Implement:

- Readable status indicators.
- Reduced-motion support.
- Clear control instructions.
- Colour-independent hazard cues.
- Optional sound.
- Predictable movement feedback.

Avoid aggressive screen shake and flashing.

## 20. GAMEPLAY BALANCING

Test the new burst ability against existing level geometry.

Ensure:

- Burst cannot pass through walls.
- Burst does not trivialize challenges.
- Cooldown is reasonable.
- Players have time to react to hazards.
- Threats remain avoidable.
- Currents do not make navigation uncontrollable.
- Sonar interference remains understandable.

### Important

Burst should create interesting decisions, not become a mandatory button pressed every few seconds.

## 21. AUTOMATED TESTING

Create or update tests covering:

1. Game startup.
2. Ship movement.
3. Turning.
4. Burst activation.
5. Burst duration.
6. Burst cooldown.
7. Burst availability after recharge.
8. Velocity recovery.
9. Collision at burst speed.
10. Sonar activation.
11. Disturbance generation.
12. Disturbance decay.
13. Threat detection.
14. Current influence.
15. Beacon collection.
16. Sanctuary completion.
17. Pause and restart.
18. Desktop input.
19. Mobile input.
20. Reduced-motion behavior.

### Challenge validation

Verify:

- All required beacons remain reachable.
- The sanctuary remains accessible.
- New hazards have counterplay.
- Players cannot become permanently trapped.
- Burst is useful but not required for every situation.
- Original gameplay progression remains achievable.

Use seeded tests where procedural generation is involved.

## 22. BROWSER TESTING

Where browser automation is available, test:

- Main menu.
- Start Game.
- Ship steering.
- Sonar activation.
- Burst propulsion.
- Cooldown.
- Narrow passage navigation.
- Moving currents.
- Sonar interference.
- Threat evasion.
- Beacon collection.
- Sanctuary completion.
- Pause and restart.
- Mobile controls.
- Landscape and portrait layouts.

Inspect console errors and rendering issues.

Fix observed defects.

Do not claim successful testing without executing it.

## 23. VISUAL VALIDATION

Capture before-and-after screenshots where possible.

Compare:

- Ship appearance.
- Burst propulsion effects.
- Sonar visuals.
- Underwater atmosphere.
- Hazard readability.
- Beacon visibility.
- HUD presentation.
- Overall visual cohesion.

Ensure the upgraded game retains its recognizable ECHO TIDE identity.

## 24. FORGE ARCADE INTEGRATION

Preserve:

- Forge Arcade homepage.
- All other games.
- Existing game cards.
- Navigation.
- Category filters.
- Deployment configuration.

Only modify ECHO TIDE and directly necessary supporting assets.

Use relative file paths.

Do not alter the shared arcade card system without approval.

## 25. ACCEPTANCE CRITERIA

The upgrade is complete when:

- Ship burst works reliably.
- Burst provides satisfying acceleration.
- Cooldown is clear.
- Burst interacts with disturbance.
- Ship handling feels smoother.
- Additional navigation challenges exist.
- New hazards have clear counterplay.
- Original sonar mechanics remain central.
- Beacon and sanctuary objectives remain functional.
- Desktop and mobile controls work.
- Automated tests pass.
- No critical regressions remain.

## 26. FINAL DELIVERABLES

Provide:

1. Existing game analysis.
2. Burst system implementation.
3. Movement improvements.
4. New challenge mechanics.
5. Updated visual effects.
6. Updated source files.
7. Before-and-after screenshots, if possible.
8. Automated test results.
9. Browser testing results.
10. Performance findings.
11. Known limitations.
12. Deployment readiness assessment.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep changes on a separate development branch until explicitly authorized.

## FINAL DIRECTION

Make ECHO TIDE more exciting without sacrificing its mysterious underwater atmosphere.

Sonar reveals danger.

Movement requires skill.

Burst provides an escape.

New challenges reward careful navigation.

Preserve the original game's identity.

**Inspect first. Improve carefully. Test thoroughly.**