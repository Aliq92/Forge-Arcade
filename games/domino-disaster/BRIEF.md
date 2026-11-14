# CODEX BUILD — DOMINO DISASTER
## One Push. Total Chaos.
### Forge Arcade — Complete Implementation

You are a senior indie browser-game developer, physics simulation engineer, puzzle designer, and technical artist.

**Repository:** https://github.com/aliq92/Forge-Arcade
**Target directory:** `games/domino-disaster/`

Your assignment is to implement a complete, polished, playable browser game called **DOMINO DISASTER**.

Build twelve handcrafted puzzles, a reusable chain-reaction physics system, eight gadgets, a level editor, Sandbox Mode, and satisfying replay functionality.

Implement, test, debug, and prepare the game for Forge Arcade integration.

Do not deliver only a mockup, a static animation, or a simplified demonstration.

**Core vision: Build an ingenious mechanical chain reaction, trigger it once, and watch your creation come alive.**

---

# PHASE 1 — REPOSITORY INSPECTION

## 1. Inspect Before Modifying

Before writing code:

- Inspect the existing Forge Arcade repository.
- Identify the current game structure and registration system.
- Review homepage architecture, shared styles, game cards and navigation.
- Identify existing physics-based games and reusable utilities.
- Inspect testing infrastructure.
- Confirm that DOMINO DISASTER does not already exist.

Preserve existing functionality.

Do not modify unrelated games.

Create a separate development branch if the environment supports it.

Do not automatically publish or deploy.

---

# PHASE 2 — GAME DESIGN

## 2. Core Concept

DOMINO DISASTER is a colourful, toy-like, side-view physics puzzle game presented as a miniature mechanical tabletop.

Players arrange mechanical objects to deliver a chain reaction from a starting trigger to a finish trigger.

### Primary gameplay loop

**Inspect → Build → Test → Observe → Adjust → Succeed**

Players should:

1. Study a partially constructed mechanism.
2. Select and place available gadgets.
3. Adjust gadget positions and orientations.
4. Trigger the starting mechanism.
5. Watch the reaction unfold.
6. Identify where it fails.
7. Return to editing.
8. Make adjustments.
9. Complete the sequence.

The fun comes from experimentation and satisfying cause-and-effect.

## 3. Core Design Principles

Prioritize:

- Reliable physics.
- Clear cause-and-effect.
- Readable object movement.
- Fast retries.
- Creative problem-solving.
- Visually satisfying reactions.
- Multiple valid solutions where practical.

The game must not depend on memorizing one hidden solution.

A player should understand why a chain reaction succeeded or failed.

---

# PHASE 3 — TECHNOLOGY

## 4. Implementation Stack

Use:

- HTML5 Canvas 2D.
- Vanilla JavaScript.
- CSS3.
- requestAnimationFrame.
- Web Audio API for procedural sound.
- localStorage for progress and sandbox layouts.
- A deterministic fixed-step physics simulation.

Avoid external frameworks, CDNs and backend services.

Suggested structure:

```text
games/domino-disaster/
├── index.html
├── style.css
├── main.js
├── game.js
├── physics.js
├── objects.js
├── gadgets.js
├── levels.js
├── editor.js
├── renderer.js
├── input.js
├── audio.js
├── storage.js
├── tests/
│   ├── physics.test.js
│   ├── gadgets.test.js
│   ├── levels.test.js
│   └── editor.test.js
└── README.md
```

Adapt filenames to the repository's existing conventions.

Separate simulation logic from rendering and interface code.

## 5. Coordinate System

Use a consistent two-dimensional world coordinate system.

Render the scene in a playful side-view with optional pseudo-isometric decorative details.

Physics must operate in a true 2D simulation plane.

Do not confuse decorative depth with collision geometry.

Scale the viewport independently of simulation coordinates.

---

# PHASE 4 — PHYSICS ENGINE

## 6. Deterministic Physics

Implement a lightweight custom 2D physics engine suitable for:

- Rectangular rigid bodies.
- Circular bodies.
- Static terrain.
- Dynamic collisions.
- Rotating dominoes.
- Simple mechanical constraints.
- Triggers and sensors.

Use a fixed simulation timestep, preferably 1/120 second if performance permits.

Cap accumulated simulation time to prevent large physics jumps.

### Determinism

Given identical initial conditions, gadget settings and input actions, the simulation must produce the same results.

Avoid using unseeded randomness inside physics updates.

Use stable object ordering and collision resolution.

Do not base physics results on rendering frame rate.

## 7. Rigid Body Properties

Each physical object should support relevant properties:

- Position.
- Rotation.
- Linear velocity.
- Angular velocity.
- Mass.
- Inertia.
- Collision shape.
- Friction.
- Restitution.
- Static or dynamic status.
- Active state.

Use physically coherent approximations.

Avoid presenting the simulation as an engineering-grade physics solver.

## 8. Collision Detection

Support:

- Circle-versus-circle.
- Circle-versus-rectangle.
- Rectangle-versus-rectangle.
- Rotated rectangles.
- Static boundaries.

Use SAT or another reliable method for rotated convex shapes.

Prevent tunnelling for fast-moving marbles and launched objects through suitable substeps or continuous collision techniques.

## 9. Collision Response

Implement:

- Contact normals.
- Penetration correction.
- Linear impulses.
- Angular impulses.
- Friction.
- Restitution.
- Stable resting contacts.

Prevent:

- Exploding stacks.
- Excessive jitter.
- Objects sinking through the ground.
- Uncontrolled angular velocity.
- Energy gain from repeated collision correction.

Use sensible speed and angular-velocity limits as stability safeguards.

## 10. Gravity

Apply consistent downward gravity to dynamic objects.

Provide a tunable fictional gravity constant.

Allow low-gravity Sandbox experiments if practical.

Gravity changes must update the actual simulation.

Do not simply alter animation speed.

---

# PHASE 5 — EIGHT PLACEABLE GADGETS

## 11. Gadget 1 — DOMINO

The signature game object.

Properties:

- Tall, narrow rectangular body.
- Stable upright starting position.
- Rotates naturally when pushed.
- Transfers momentum to neighbouring dominoes.

Support different colours and orientations.

The domino should respond to actual contacts rather than scripted neighbour activation.

## 12. Gadget 2 — MARBLE

A circular rolling object.

Properties:

- Gravity-driven movement.
- Friction.
- Rolling interaction.
- Momentum transfer.
- Collision with ramps and dominoes.

Offer several visual styles.

Do not implement rolling as a purely decorative animation.

## 13. Gadget 3 — RAMP

A fixed inclined surface.

Purpose:

- Redirect marbles.
- Change rolling speed.
- Guide objects into other gadgets.

Allow rotation within sensible limits.

Ensure collisions work across the full ramp surface.

## 14. Gadget 4 — SPRING LAUNCHER

Stores a predefined amount of energy.

When triggered by physical contact or a compatible signal:

- Compress briefly.
- Launch an object.
- Reset or remain used according to level rules.

### Rules

- Use a documented impulse strength.
- Respect maximum launch speed.
- Avoid repeated triggering while continuously contacted.
- Provide a clear recharge or single-use state.

## 15. Gadget 5 — GEAR RELAY

A rotating mechanical element.

Support linked gears through a simplified explicit mechanical coupling rule.

### Behavior

- Contact or input activates rotation.
- Linked gears rotate in opposite directions where appropriate.
- Output rotation can trigger another mechanism.

Gear interaction must be deterministic.

Do not claim physically accurate tooth-to-tooth contact if a simplified coupling system is used.

Provide clear connection indicators.

## 16. Gadget 6 — SEESAW

A pivoting platform.

Features:

- Rotates around a fixed center pivot.
- Responds to falling objects.
- Transfers motion to objects on the opposite side.
- Has bounded rotation.

Use stable rotational constraints.

## 17. Gadget 7 — TRIGGER SWITCH

A mechanical activation surface.

Triggers when:

- A specified object physically contacts it.
- A configured contact condition is satisfied.

Can activate connected mechanisms such as launchers, gates or gear relays.

Provide a clear active state.

Avoid repeatedly firing every simulation tick.

## 18. Gadget 8 — FINISH TRIGGER

The final goal.

The chain is successful only when the finish trigger receives the required physical interaction.

Possible conditions:

- A marble enters a goal zone.
- A falling domino activates a switch.
- A mechanism strikes a target.

Make the required interaction visible.

The finish trigger must not activate simply because enough time has elapsed.

---

# PHASE 6 — BUILD MODE

## 19. Placement System

Allow players to place gadgets on a tabletop grid.

### Controls

Desktop:

- Click gadget in toolbar.
- Move cursor to position.
- Click to place.
- Drag to reposition.
- Rotate using keyboard or UI controls.

Mobile:

- Tap gadget.
- Drag into the playfield.
- Use rotation buttons.
- Release to place.

### Placement feedback

Show:

- Ghost preview.
- Valid placement highlight.
- Invalid placement warning.
- Rotation preview.
- Gadget count.

Reject overlaps that produce unstable starting states.

Allow contact arrangements needed for domino chains.

## 20. Build Constraints

Each puzzle provides a limited inventory of gadgets.

Examples:

- Five dominoes.
- One ramp.
- One marble.
- One spring launcher.

The puzzle may already include fixed objects.

Players must complete the chain using the provided inventory.

### Restrictions

Support:

- Fixed objects.
- Editable objects.
- Forbidden placement zones.
- Object-count limits.
- Rotation limits where necessary.

Clearly distinguish fixed objects from editable ones.

## 21. Editing Tools

Implement:

- Select.
- Move.
- Rotate.
- Delete.
- Undo.
- Redo.
- Reset Puzzle.

Undo and redo must preserve exact object properties.

Do not allow editing during active simulation.

Provide an explicit way to return to Build Mode.

---

# PHASE 7 — SIMULATION MODE

## 22. The Big Red Button

Place a prominent trigger button in the interface.

Label:

**PUSH!**

When pressed:

1. Freeze editing.
2. Capture the initial setup.
3. Start the deterministic simulation.
4. Activate the starting mechanism.
5. Run physics.
6. Detect finish conditions.
7. Present success or failure feedback.

### Important

The player should initiate the entire sequence with a single action.

No mid-run gadget repositioning.

## 23. Simulation Controls

Provide:

- Start.
- Pause.
- Resume.
- Restart Simulation.
- Return to Build Mode.
- Slow Motion.

### Speed options

Support:

- 0.25×
- 0.5×
- 1×
- 2×

Simulation speed must alter the number or scheduling of fixed physics steps, not the physics equations themselves.

Slow-motion playback should not change the result of the chain reaction.

## 24. Failure Detection

Detect when a chain has failed.

Examples:

- All objects settle without reaching the finish.
- A required marble falls outside the play area.
- The mechanism becomes inactive.
- A reasonable simulation-time limit is reached.

### Feedback

Display:

**CHAIN STOPPED**

Offer:

- Retry.
- Edit Setup.
- Replay.

Avoid unnecessary penalties.

Do not delete the player's build when a test fails.

---

# PHASE 8 — REPLAY SYSTEM

## 25. Deterministic Replay

Record:

- Initial object configuration.
- Gadget settings.
- Random seed.
- Simulation version.
- Trigger timing.

Given no mid-run inputs, the system should reproduce the same simulation from these values.

For frame-accurate rewind and scrubbing, record periodic state snapshots plus intermediate states as needed.

Do not claim that a starting configuration alone provides instant arbitrary-time rewind.

## 26. Replay Controls

Provide:

- Play.
- Pause.
- Slow Motion.
- Restart.
- Timeline Scrubber, if state recording is implemented.

### Replay Features

Allow players to observe:

- First collision.
- Successful gadget transitions.
- Where the sequence stopped.
- Final trigger activation.

Make debugging the chain enjoyable.

## 27. Failure Highlight

When a chain stops, visually highlight the last meaningful interaction.

Example:

**The marble stopped before reaching the launcher.**

Generate such feedback from actual simulation events.

Do not invent explanations.

---

# PHASE 9 — TWELVE HANDCRAFTED LEVELS

## 28. Level Progression

Create twelve complete puzzles.

Every level must have:

- Name.
- Starting objects.
- Fixed geometry.
- Available gadgets.
- Restrictions.
- Finish trigger.
- Verified solution.

### LEVEL 1 — FIRST FALL

Teach basic domino placement.

Connect a short interrupted domino chain.

### LEVEL 2 — THE GAP

Use a marble to bridge a missing domino section.

### LEVEL 3 — ROLLING START

Introduce ramps.

Guide a marble into a domino chain.

### LEVEL 4 — SPRING FEVER

Introduce spring launchers.

Use a launcher to move the reaction across a gap.

### LEVEL 5 — TIPPING POINT

Introduce a seesaw.

Transfer energy through a pivoting platform.

### LEVEL 6 — GEAR UP

Introduce gear relays.

Use rotational movement to activate the next mechanism.

### LEVEL 7 — DOUBLE TROUBLE

Combine two separate reaction paths.

Both must activate required switches.

### LEVEL 8 — THE LONG WAY ROUND

Build an indirect path around placement obstacles.

### LEVEL 9 — MARBLE MAYHEM

Combine ramps, marbles and multiple launchers.

### LEVEL 10 — THE CLOCKWORK ROOM

Use gears, triggers and seesaws in a coordinated sequence.

### LEVEL 11 — CASCADE CITY

Create a large interconnected chain reaction with several stages.

### LEVEL 12 — TOTAL DOMINO DISASTER

Final challenge combining all major gadget types.

Complete a spectacular multi-stage mechanism.

## 29. Level Solvability

For every level:

- Create a reference placement solution.
- Simulate it using the real physics engine.
- Verify finish trigger activation.
- Check against inventory limits.
- Verify stability across repeated runs.

Do not claim a level is solvable without running its reference solution.

### Multiple Solutions

Allow alternative valid arrangements.

Do not require exact hidden coordinates if a physically valid alternative works.

---

# PHASE 10 — SCORING

## 30. Three-Star System

Award stars based on meaningful performance.

Suggested rules:

One star:
- Finish the puzzle.

Two stars:
- Finish with a reduced gadget count or satisfy a secondary objective.

Three stars:
- Complete using an efficient arrangement or optional challenge condition.

Avoid relying heavily on real-time reaction speed.

This is a construction puzzle.

## 31. Rewards

After completion, show:

- Stars.
- Gadgets used.
- Chain duration.
- Number of triggered objects.
- Best performance.

Save best results.

Provide Next Level and Replay buttons.

---

# PHASE 11 — SANDBOX MODE

## 32. Free-Build Workshop

Create an unrestricted creative workspace.

Players can:

- Place dominoes.
- Add marbles.
- Build ramps.
- Position launchers.
- Connect gears.
- Add seesaws.
- Configure switches.
- Position finish triggers.

Allow larger constructions within safe performance limits.

### Sandbox Features

Implement:

- Unlimited retries.
- Undo and redo.
- Camera pan.
- Zoom.
- Simulation speed.
- Pause.
- Reset.
- Save layout.
- Load layout.

Use sensible upper limits for active objects.

## 33. Saving Creations

Store creations in localStorage.

Allow named layouts.

Persist:

- Object type.
- Position.
- Rotation.
- Gadget settings.
- Connections.
- Level boundaries.
- Simulation parameters.

Validate saved data.

Handle storage errors gracefully.

Provide export/import as JSON if feasible.

Do not use untrusted imported data as executable code.

---

# PHASE 12 — VISUAL DESIGN

## 34. Art Direction

Create a vibrant miniature toy-workshop aesthetic.

The game should resemble a colourful mechanical tabletop.

Use:

- Bright dominoes.
- Rounded wooden platforms.
- Metallic gears.
- Glossy marbles.
- Playful springs.
- Warm lighting.
- Clean shadows.
- Soft background details.

### Palette

- Turquoise.
- Golden yellow.
- Coral pink.
- Lavender.
- Mint green.
- Warm orange.
- Deep navy backgrounds.

Avoid visually noisy decorations.

## 35. Gadget Animations

Make every physical interaction satisfying.

Examples:

- Domino wobble before falling.
- Marble rotation.
- Spring compression.
- Gear rotation.
- Seesaw rocking.
- Trigger activation.
- Small impact particles.

Animations must reflect actual simulation state.

Do not fake successful chain progression.

## 36. Celebration Effects

When the finish trigger activates:

- Release colourful particles.
- Illuminate the tabletop.
- Show a satisfying completion animation.
- Play a short original victory sound.

Keep celebrations brief.

Respect reduced-motion preferences.

---

# PHASE 13 — USER INTERFACE

## 37. Main Menu

Title:

**DOMINO DISASTER**

Subtitle:

"One Push. Total Chaos."

Buttons:

- Play.
- Level Select.
- Sandbox.
- How to Play.
- Settings.

## 38. Game Interface

Display:

- Level title.
- Available gadgets.
- Gadget inventory.
- Current mode.
- Trigger button.
- Undo.
- Redo.
- Reset.
- Pause.
- Simulation speed.

Keep the playfield dominant.

## 39. Tutorial

Teach through short playable interactions.

Explain:

- Placing dominoes.
- Rotating objects.
- Testing a chain.
- Returning to Build Mode.
- Using gadgets.
- Understanding failures.

Avoid long instructional screens.

---

# PHASE 14 — AUDIO

## 40. Sound Effects

Use original procedural sounds through Web Audio API.

Include:

- Domino impacts.
- Marble rolling.
- Spring launch.
- Gear activation.
- Mechanical triggers.
- Puzzle success.
- Failure feedback.

Keep sounds playful and gentle.

Never autoplay before user interaction.

Provide mute and volume controls.

Avoid excessive overlapping sounds during large chain reactions.

---

# PHASE 15 — ACCESSIBILITY AND INPUT

## 41. Desktop Controls

Support:

- Mouse selection.
- Drag and drop.
- Keyboard rotation.
- Delete.
- Undo and redo shortcuts.
- Zoom.
- Camera pan.
- Simulation start.
- Pause.
- Reset.

Show keyboard shortcuts in the interface.

## 42. Mobile Controls

Support Android and iPhone browsers.

Implement:

- Touch placement.
- Dragging.
- Rotation buttons.
- Large trigger button.
- Pinch zoom, if practical.
- Camera panning.
- Responsive toolbar.
- Portrait and landscape support.

Prevent accidental page scrolling.

## 43. Accessibility

Provide:

- Readable interface labels.
- High-contrast object outlines.
- Clear selected states.
- Reduced-motion support.
- Keyboard navigation.
- Adjustable audio.
- Colour-independent status indicators.

Make precise placement manageable on mobile.

---

# PHASE 16 — PERFORMANCE

## 44. Optimization

Target smooth gameplay on desktop and mid-range Android devices.

Use:

- Fixed-step simulation.
- Broad-phase collision filtering.
- Spatial partitioning where beneficial.
- Sleeping inactive bodies.
- Efficient collision resolution.
- Bounded particles.
- Cached artwork.
- DevicePixelRatio caps.
- Simulation-step limits.

### Object counts

Choose and document a realistic object-count limit.

Allow Sandbox Mode to support reasonably large arrangements without freezing the browser.

Prioritize stable physics over extreme object counts.

## 45. Performance Validation

Measure:

- Frame rate.
- Physics step duration.
- Active rigid-body count.
- Collision-pair count.
- Memory behavior.
- Replay memory use.
- Mobile input responsiveness.

Test large domino cascades.

Report actual measurements.

Do not invent performance results.

---

# PHASE 17 — AUTOMATED TESTING

## 46. Physics Tests

Create tests covering:

1. Gravity.
2. Static collisions.
3. Circle collisions.
4. Rotated rectangle collisions.
5. Contact stability.
6. Domino tipping.
7. Angular momentum transfer.
8. Marble rolling.
9. Ramp collisions.
10. Spring launcher impulses.
11. Gear coupling.
12. Seesaw constraints.
13. Trigger activation.
14. Finish trigger detection.
15. High-speed collision handling.
16. Resting stability.
17. Simulation determinism.
18. Pause and resume.
19. Restart.
20. Simulation-speed independence.

## 47. Gadget Tests

Verify:

- Each gadget responds to valid interactions.
- Invalid activation is rejected.
- Single-use gadgets do not retrigger incorrectly.
- Constraints remain stable.
- Gadget state resets correctly.
- Object removal does not leave broken references.

## 48. Editor Tests

Verify:

- Placement.
- Rotation.
- Movement.
- Deletion.
- Validity checks.
- Inventory limits.
- Undo.
- Redo.
- Reset.
- Save.
- Load.
- Import validation.

## 49. Level Tests

Test all twelve handcrafted levels.

For each level:

- Validate data.
- Load the starting arrangement.
- Apply the reference solution.
- Run the actual simulation.
- Verify the finish condition.
- Repeat to confirm determinism.
- Check scoring.

Do not substitute scripted success events for the actual physical result.

---

# PHASE 18 — BROWSER QA

## 50. Browser Testing

Where browser automation is available, test:

- Main menu.
- Level selection.
- Gadget placement.
- Rotation.
- Dragging.
- Undo and redo.
- Starting simulation.
- Domino collisions.
- Marble movement.
- Springs and gears.
- Failure detection.
- Retry.
- Slow motion.
- Replay.
- Level victory.
- Sandbox editing.
- Save and load.
- Mobile touch controls.
- Portrait and landscape.
- Browser resizing.

Inspect console errors.

Fix observed defects.

Do not claim tests passed unless executed.

## 51. Full Completion Test

Complete all twelve puzzles using their verified reference solutions.

Confirm:

- Progression unlocks correctly.
- Stars are awarded correctly.
- Save data persists.
- No puzzle becomes permanently blocked.
- Restart is reliable.
- Final victory triggers once.

---

# PHASE 19 — FORGE ARCADE INTEGRATION

## 52. Game Registration

After standalone implementation and testing, prepare the appropriate Forge Arcade registration changes.

Suggested metadata:

**Title:** DOMINO DISASTER

**Category:** Puzzle / Physics

**Description:** Build colourful mechanical chain reactions using dominoes, marbles, ramps, gears and springs. One push starts the chaos.

**Path:** `games/domino-disaster/index.html`

Inspect the actual registration format.

Do not assume a particular structure.

## 53. Game Card

Prepare card artwork featuring:

- Bright dominoes.
- A rolling marble.
- A spring launcher.
- Colourful mechanical gadgets.
- A spectacular chain reaction.

Reuse existing Forge Arcade card styling.

Do not redesign unrelated cards.

## 54. Integration Safety

Preserve:

- All existing games.
- Homepage.
- Game cards.
- Filters.
- Navigation.
- Shared styles.
- Deployment configuration.

Use relative file paths.

Do not deploy automatically.

Do not merge into the live branch without explicit approval.

---

# PHASE 20 — ACCEPTANCE CRITERIA

DOMINO DISASTER is complete when:

- Players can build mechanical chain reactions.
- Dominoes fall through actual collision physics.
- Marbles roll and collide.
- Ramps guide objects.
- Spring launchers function.
- Gear relays function.
- Seesaws respond to weight.
- Switches activate correctly.
- Finish triggers detect real interactions.
- Build Mode supports placement and editing.
- The big red button starts the simulation.
- Failed chains can be adjusted and retried immediately.
- Slow motion works.
- Deterministic replay works.
- Twelve complete puzzles exist.
- Every puzzle has a verified solution.
- Three-star scoring functions.
- Sandbox Mode is playable.
- Save and load work.
- Desktop and mobile controls work.
- Automated tests pass.
- Browser testing reveals no critical defects.
- Forge Arcade integration is prepared.

---

# PHASE 21 — FINAL DELIVERABLES

Provide:

1. Complete playable DOMINO DISASTER game.
2. Full source code.
3. Deterministic 2D physics engine.
4. Eight functioning gadgets.
5. Twelve handcrafted puzzles.
6. Verified puzzle solutions.
7. Build Mode editor.
8. Sandbox Mode.
9. Replay and slow motion.
10. Scoring and progression.
11. Save and load functionality.
12. Desktop and mobile controls.
13. Automated test suite.
14. Test execution results.
15. Browser QA results.
16. Performance measurements.
17. Screenshots, if available.
18. README and gameplay instructions.
19. Known limitations.
20. Forge Arcade integration patch.
21. Deployment readiness report.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep changes on a separate development branch until explicitly authorized.

---

# FINAL DIRECTION

DOMINO DISASTER must feel playful, creative, and satisfying.

A falling domino should genuinely knock another domino over.

A marble should transfer momentum.

A spring should launch objects.

Gears and seesaws should produce understandable chain reactions.

The player should be able to watch a failed sequence, understand the problem, modify the construction, and succeed.

The spectacle should emerge from the simulation rather than a scripted animation.

**Inspect first. Build completely. Test thoroughly.**
