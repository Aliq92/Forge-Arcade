# CODEX BUILD — LUMENWORKS
## The City That Wakes
### Forge Arcade — Complete Game Implementation

You are a senior indie game developer, electrical-network simulation designer, UI/UX engineer, and technical artist working inside the existing **Forge Arcade** repository.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target folder:** `games/lumenworks/`

Your mission is to design, implement, test, and prepare **LUMENWORKS — The City That Wakes**, a complete standalone browser puzzle game.

Do not deliver a prototype, static mockup, or incomplete gameplay demonstration.

The final result must be playable, visually polished, responsive, and technically reliable.

**Core vision: Restore electricity to a sleeping miniature city. Every connection brings the world back to life.**

---

# PHASE 1 — REPOSITORY INSPECTION

## 1. Inspect Before Modifying

Inspect the existing Forge Arcade repository.

Identify:

- Repository structure.
- Existing game directories.
- Homepage architecture.
- Game registration system.
- Shared styling.
- Navigation conventions.
- Existing build scripts.
- Testing infrastructure.
- Deployment configuration.

Follow the repository's established conventions wherever practical.

Do not modify unrelated games.

Do not overwrite existing LUMENWORKS files without reviewing them first.

Create a development branch for the new game.

Do not deploy automatically.

---

# PHASE 2 — GAME CONCEPT

## 2. Core Gameplay

LUMENWORKS is a cozy electrical-network puzzle game set in a miniature nighttime city.

A fictional city's power network is offline.

The player restores electricity by connecting electrical components.

Players must:

1. Identify available generators.
2. Connect cables between compatible nodes.
3. Route electricity through substations.
4. Activate or isolate network branches.
5. Manage simplified capacity limits.
6. Use batteries to support suitable loads.
7. Restore electricity to buildings.
8. Complete district objectives.

Every powered building illuminates.

Restored areas gradually animate with:

- Window lights.
- Streetlamps.
- Moving trams.
- Small environmental details.
- Glowing electrical lines.

The city should become more beautiful as progress increases.

## 3. Gameplay Philosophy

Prioritize:

- Easy-to-understand interactions.
- Clear electrical connections.
- Interesting network decisions.
- Relaxing visual presentation.
- Satisfying feedback.
- Short but meaningful puzzles.

The game should be accessible to players without electrical engineering knowledge.

Avoid implementing actual high-voltage operational procedures.

Use a fictional, abstracted power-network model designed exclusively for entertainment.

---

# PHASE 3 — TECHNICAL ARCHITECTURE

## 4. Recommended Technology

Use:

- HTML5 Canvas 2D.
- Vanilla JavaScript.
- CSS3.
- requestAnimationFrame.
- Web Audio API for optional procedural sounds.
- localStorage for save progress and preferences.

Avoid frameworks and external CDN dependencies.

Do not require an internet connection to play after the game assets are loaded.

Suggested file structure:

```text
games/lumenworks/
├── index.html
├── style.css
├── main.js
├── game.js
├── levels.js
├── network.js
├── renderer.js
├── input.js
├── audio.js
├── storage.js
├── assets/
├── tests/
│   ├── network.test.js
│   ├── levels.test.js
│   └── gameplay.test.js
└── README.md
```

Adapt filenames to repository conventions where appropriate.

Separate simulation, rendering, input, and UI state.

Use seeded randomness for decorative procedural elements.

Use fixed or bounded simulation timesteps where appropriate.

---

# PHASE 4 — ELECTRICAL NETWORK SYSTEM

## 5. Graph-Based Network Model

Implement the electrical network as a graph.

### Nodes

Each component is a node containing:

- Unique identifier.
- Node type.
- Position.
- Capacity or demand, if applicable.
- Current status.
- Connections.
- Relevant gameplay properties.

### Edges

Cables form graph edges.

Each cable should contain:

- Unique identifier.
- Source node.
- Destination node.
- Capacity.
- Enabled or disabled status.
- Damaged status.
- Optional routing geometry.

All gameplay calculations must use the network graph.

Do not calculate power delivery from decorative cable animations.

## 6. Electrical Components

Implement five primary components.

### GENERATOR

Produces available electrical capacity.

Example:

Generator A — 16 fictional power units.

Generators have a fixed capacity per puzzle.

### SUBSTATION

Routes incoming power to connected downstream branches.

Substations have a maximum throughput.

They do not create electricity.

### CABLE

Connects compatible nodes.

Cables have limited capacity.

Cable placement must obey level restrictions.

### SWITCH

Enables or disables an existing circuit connection.

Switching should update the network immediately.

### BATTERY

Stores energy and supports a limited amount of demand.

Batteries must use bounded charge, discharge rates, and energy capacity.

They cannot provide unlimited electricity.

## 7. Simplified Power Simulation

Use an understandable, deterministic fictional power-flow model.

Do not present the system as a physically accurate AC grid simulator.

### Key rules

- Generators provide limited total power.
- Buildings require fixed amounts of power.
- Substations and cables have throughput limits.
- Open switches interrupt connections.
- Damaged cables cannot transmit power.
- Disconnected buildings remain unpowered.
- Batteries may supply power within defined energy and discharge limits.
- Generated and stored energy must be accounted for consistently.

### Allocation algorithm

Implement an explicit, deterministic load-allocation system.

Use a documented priority order when power is insufficient.

Never power buildings simply because they are graph-reachable if upstream capacity is inadequate.

For small networks, use a suitable capacity-constrained flow algorithm or another well-defined allocation approach that correctly handles shared bottlenecks and multiple supply paths.

Prevent energy duplication in cycles.

Recalculate the network when components change.

### Units

Use fictional power units consistently.

If a time-dependent battery system is implemented, distinguish power capacity from stored energy.

For example:

- Generator output: power units.
- Battery discharge: power units per simulation interval.
- Battery storage: energy units.

Never confuse instantaneous capacity with cumulative battery energy.

## 8. Overload Mechanics

Overloads create a puzzle challenge.

A cable or substation exceeds its rated capacity when its allocated flow is greater than its permitted capacity.

Display a clear warning.

### Overload behavior

Use a consistent rule:

- An overloaded branch is unsafe and fails the no-overload objective.
- It must not magically transmit unlimited usable power.
- Excess demand must remain unserved, or the branch must enter a clearly defined simulated trip state.

Choose and document one deterministic behavior.

### Visual feedback

Use:

- Amber warning indicators.
- Red cable highlights.
- Small warning icons.
- Clear load-versus-capacity information.

Avoid aggressive flashes.

### Safety note

Do not implement real-world electrical switching instructions, protection settings, or field operating sequences.

---

# PHASE 5 — PLAYER INTERACTION

## 9. Cable Tool

Players select the Cable tool and draw connections between nodes.

### Desktop

Click a valid starting node.

Drag toward another compatible node.

Release to attempt a connection.

### Mobile

Touch a node.

Drag to a valid destination.

Release to connect.

### Validation

Reject:

- Invalid component pairs.
- Duplicate links where prohibited.
- Connections through restricted areas.
- Connections exceeding placement limits.
- Connections conflicting with level rules.

### Visual feedback

Valid connections glow cyan.

Invalid connections display a subtle red warning.

Provide a short explanation when a connection fails.

## 10. Switch Tool

Select a switch or switchable branch.

Toggle its state.

Power flows should update immediately.

Use visible open and closed states.

Allow undo when supported.

## 11. Battery Tool

Players can place or activate batteries where the level permits.

Battery mechanics must be explained clearly.

Display:

- Stored energy.
- Maximum storage.
- Discharge availability.
- Current operating mode.

### Battery balancing

Use batteries for:

- Temporary load support.
- Planned demand peaks.
- Limited emergency supply.

Do not let batteries bypass every puzzle.

## 12. Inspection Tool

Click or tap a component to inspect its information.

Examples:

Generator:
- Output capacity.
- Current allocated load.
- Remaining headroom.

Substation:
- Maximum throughput.
- Current load.
- Connected branches.

Building:
- Required power.
- Powered status.
- District.
- Objective relevance.

Cable:
- Capacity.
- Current flow.
- Enabled status.
- Damage status.

Use compact contextual tooltips rather than large panels.

## 13. Undo and Reset

Implement:

- Undo.
- Reset Level.
- Pause.
- Resume.
- Return to Level Select.

Undo should work for supported player actions such as cable placement, removal, and switch changes.

Reset must restore the level's original deterministic state.

---

# PHASE 6 — CITY PRESENTATION

## 14. Visual Art Direction

Use the gameplay mockup supplied in the conversation as the primary visual reference.

Create an elegant isometric or pseudo-isometric miniature nighttime city.

### Palette

- Deep navy night sky.
- Warm amber windows.
- Cyan electrical cables.
- Turquoise electrical equipment.
- Golden streetlights.
- Soft green active indicators.
- Muted red warning effects.

The overall atmosphere should feel warm, cozy, and visually detailed.

## 15. City Buildings

Implement several recognizable building types:

- Small houses.
- Apartment blocks.
- Markets.
- Shops.
- Tram depots.
- Factories.
- Public buildings.

### Powered buildings

Show:

- Illuminated windows.
- Warm entrance lighting.
- Small environmental animation.
- Subtle glow.

### Unpowered buildings

Show:

- Dark windows.
- Muted colours.
- Limited environmental activity.

The difference must be immediately visible.

## 16. Isometric Rendering

Use a consistent coordinate system.

Prefer a 2D isometric projection that can render efficiently in Canvas.

Provide utilities for:

- World-to-screen projection.
- Screen-to-world interaction.
- Depth ordering.
- Node placement.
- Cable routing.
- Camera transforms.

### Rendering order

Ensure correct layering for:

- Terrain.
- Roads.
- Cables.
- Buildings.
- Electrical equipment.
- Decorative objects.
- Particles.
- UI overlays.

Interactive elements must remain easy to click.

## 17. Animated Power Flow

When cables carry power, show small animated energy pulses.

Use:

- Cyan moving particles.
- Directional flow cues.
- Subtle line glow.
- Distinctive inactive cable appearance.

Power animations must reflect the actual network state.

Do not show flow along disconnected, open, or damaged cables.

Reduce animation intensity when reduced-motion mode is enabled.

## 18. Living City Details

As districts become powered, gradually activate decorations.

Examples:

- Streetlamps illuminate.
- Market stalls glow.
- Tiny trams start moving.
- Window lights appear.
- Decorative signs illuminate.
- Small vehicles travel along streets.

These effects are cosmetic.

Do not simulate complex citizen AI.

Keep decorative entities bounded.

---

# PHASE 7 — LEVEL DESIGN

## 19. Eight Handcrafted Levels

Build eight complete puzzles.

Each level must introduce or combine meaningful network mechanics.

### LEVEL 1 — First Light

Teach cable connections.

Objective: Restore electricity to three houses.

### LEVEL 2 — The Riverside

Introduce limited generator capacity.

Objective: Power the riverside district.

### LEVEL 3 — Wake the Market

Introduce substations and basic load balancing.

Objective: Power the market while avoiding overload.

### LEVEL 4 — The Broken Line

Introduce damaged cables and rerouting.

Objective: Restore an isolated district.

### LEVEL 5 — Battery Night

Introduce battery support.

Objective: Maintain power during a limited supply period.

### LEVEL 6 — The Tram Returns

Introduce competing district loads.

Objective: Restore the tram depot while keeping residential buildings powered.

### LEVEL 7 — Citywide Balance

Combine multiple generators, substations, switches, and capacity constraints.

Objective: Stabilize several districts simultaneously.

### LEVEL 8 — The Grand Illumination

Final challenge combining learned mechanics.

Objective: Restore the entire miniature city.

Celebrate with a complete city-lighting sequence.

## 20. Level Data

Store levels as structured data rather than hardcoding individual gameplay logic.

Suggested structure:

```js
{
  id: 3,
  title: "Wake the Market",
  generators: [],
  substations: [],
  buildings: [],
  switches: [],
  batteries: [],
  cables: [],
  obstacles: [],
  objectives: [],
  constraints: {}
}
```

Validate all level definitions on startup.

## 21. Level Solvability

Every level must be provably solvable.

Create a scripted reference solution or deterministic test for each handcrafted puzzle.

Test the reference solution using the actual network simulation.

Verify that:

- Required buildings become powered.
- Capacity limits are respected.
- Battery constraints are respected.
- Completion objectives trigger.
- Required cables and controls are available.

Do not claim a level is solvable based only on visual inspection.

---

# PHASE 8 — OBJECTIVES AND PROGRESSION

## 22. Objective System

Display objectives clearly.

Examples:

- Power 8 buildings.
- Restore the market.
- Avoid overloaded branches.
- Restore the tram line.
- Use no more than 6 cables.
- Maintain stable supply for 30 simulated seconds.

Use objective-specific indicators.

## 23. Star Ratings

Award up to three stars per level.

Suggested criteria:

- One star: Complete the essential objective.
- Two stars: Complete without overload failures.
- Three stars: Complete efficiently within a level-specific cable or resource budget.

Avoid using speed as the primary scoring factor.

This should be a relaxing strategy game, not a reaction-time challenge.

Ensure star criteria are achievable.

## 24. Progression

Unlock levels sequentially.

Save:

- Unlocked levels.
- Best star ratings.
- Completed objectives.
- Settings.

Allow replaying completed levels.

Do not block progress permanently because of optional star requirements.

---

# PHASE 9 — SANDBOX MODE

## 25. Free City Builder

Implement a Sandbox mode independent of level progression.

Players can create a miniature power network freely.

Provide:

- Generators.
- Buildings.
- Substations.
- Cables.
- Switches.
- Batteries.

Allow component placement and removal.

### Sandbox goals

No mandatory objectives.

No time limits.

No game-over state.

The player can experiment with network layouts.

### Simulation rules

Keep the same coherent power-allocation model.

Allow generous resources, but preserve network capacities.

Provide a clear optional unlimited-capacity setting if desired.

### Save system

Allow saving and loading one or more sandbox layouts locally.

Validate loaded data.

Protect against malformed saves.

Provide an easy reset.

---

# PHASE 10 — UI/UX

## 26. Main Menu

Display:

**LUMENWORKS**

*The City That Wakes*

Buttons:

- Play
- Level Select
- Sandbox
- How to Play
- Settings

Use a small animated nighttime city backdrop.

## 27. In-Game HUD

Create a compact interface inspired by the mockup.

### Top Bar

Show:

- Level name.
- Star progress.
- Buildings powered.
- Current objective.

### Right Panel

Show:

- Grid status.
- District status.
- Power overview.
- Active objectives.
- Context-sensitive hints.

### Bottom Toolbar

Include:

- Cable.
- Switch.
- Battery.
- Inspect.
- Undo.
- Reset.
- Pause.

Only show tools available in the current level.

### Mobile layout

Collapse side panels into accessible buttons or drawers.

Prioritize the city viewport.

## 28. Clear Visual States

Use distinct styles for:

- Powered.
- Unpowered.
- Overloaded.
- Damaged.
- Selected.
- Eligible connection.
- Invalid connection.

Never rely on colour alone.

Use icons, labels, or line patterns where appropriate.

## 29. Tutorial

Provide an interactive introductory tutorial.

Teach:

1. Selecting the cable tool.
2. Connecting nodes.
3. Understanding powered buildings.
4. Reading generator capacity.
5. Avoiding overloads.
6. Using switches.
7. Managing batteries.

Keep instructions short.

Use contextual hints rather than long text screens.

---

# PHASE 11 — AUDIO

## 30. Sound Design

Use lightweight procedural audio through Web Audio API.

Include:

- Cable connection.
- Switch toggle.
- Building activation.
- Substation activation.
- Overload warning.
- Objective completion.
- Level victory.
- City completion.

Add subtle optional ambient city sounds.

Never autoplay audio before user interaction.

Provide:

- Mute toggle.
- Volume control.
- Sound preference persistence.

Avoid harsh alarms.

---

# PHASE 12 — RESPONSIVENESS AND ACCESSIBILITY

## 31. Desktop

Support:

- Mouse interaction.
- Keyboard shortcuts.
- Responsive camera panning.
- Zoom controls where appropriate.
- Tool selection.
- Undo.
- Pause.
- Reset.

Avoid conflicting shortcuts.

## 32. Mobile

Support Android and iPhone browsers.

Provide:

- Touch cable dragging.
- Reliable node selection.
- Touch-friendly tool buttons.
- Pinch zoom where practical.
- Pan controls.
- Collapsible information panels.
- Landscape and portrait layouts.

Prevent accidental page scrolling during game interactions.

Do not make small electrical nodes impossible to select.

## 33. Accessibility

Implement:

- High-contrast component states.
- Keyboard focus indicators.
- Reduced-motion support.
- Legible text.
- Icons alongside colours.
- Adjustable effects quality.
- Clear error messages.

Do not use flickering power effects that could cause discomfort.

---

# PHASE 13 — PERFORMANCE

## 34. Rendering Optimization

Target smooth gameplay on desktop and mid-range Android devices.

Use:

- requestAnimationFrame.
- DevicePixelRatio caps.
- Cached static scene layers.
- Dirty-region rendering where practical.
- Bounded particles.
- Efficient hit testing.
- Reusable rendering primitives.
- Object pooling where useful.

Avoid redrawing expensive static city details unnecessarily.

## 35. Network Calculation

Recalculate network allocation only when:

- A cable changes.
- A switch changes.
- A component changes.
- Battery state changes.
- A timed level event requires recalculation.

Do not run a full graph algorithm on every rendering frame without need.

Keep simulation and animation independent.

---

# PHASE 14 — SAVE AND DATA VALIDATION

## 36. Persistent Progress

Use localStorage.

Persist:

- Level completion.
- Best stars.
- Unlocked content.
- Preferences.
- Sandbox layouts.

Use versioned save data.

Handle:

- Missing storage.
- Malformed JSON.
- Old save versions.
- Invalid component references.
- Unknown node types.
- Duplicate IDs.

Avoid deleting unrelated Forge Arcade storage.

---

# PHASE 15 — TESTING

## 37. Automated Unit Tests

Implement tests covering:

1. Node creation.
2. Cable creation.
3. Connection validation.
4. Graph reachability.
5. Open switches.
6. Damaged cables.
7. Generator capacity.
8. Substation capacity.
9. Cable capacity.
10. Shared network bottlenecks.
11. Multiple supply sources.
12. Network cycles.
13. Demand allocation.
14. Overload handling.
15. Battery charging.
16. Battery discharging.
17. Battery depletion.
18. No energy duplication.
19. Building power state.
20. Objective completion.
21. Star scoring.
22. Undo.
23. Reset.
24. Save and load.
25. Sandbox placement.
26. Invalid save recovery.

Test multiple network topologies.

## 38. Level Tests

Create deterministic tests for all eight levels.

Each level requires:

- Valid node references.
- Valid map bounds.
- Valid component capacities.
- A verified completion path.
- Correct objective detection.
- Reachable success state.

Use the actual game simulation to verify solutions.

## 39. Browser Tests

Where browser automation is available, test:

- Loading the game.
- Main menu.
- Tutorial.
- Cable dragging.
- Invalid connections.
- Switch toggles.
- Battery usage.
- Overload warnings.
- Completing each level.
- Star ratings.
- Level unlocking.
- Sandbox building.
- Saving and loading.
- Undo and reset.
- Pause and resume.
- Desktop resizing.
- Mobile touch controls.
- Portrait and landscape.

Inspect console errors.

Fix observed defects before delivery.

Do not claim tests passed without running them.

## 40. Performance Testing

Measure:

- Frame rate.
- Rendering responsiveness.
- Network recalculation cost.
- Memory usage trends.
- Particle count.
- Mobile input latency.

Test a fully illuminated city and a larger sandbox layout.

Report actual measurements rather than invented numbers.

---

# PHASE 16 — VISUAL QUALITY ASSURANCE

## 41. Compare Against the Mockup

Use the supplied LUMENWORKS visual concept as the art-direction reference.

Aim to reproduce:

- Miniature nighttime city.
- Warm illuminated buildings.
- Cyan electrical cables.
- Compact power substations.
- Clear warning overlays.
- Attractive interface panels.
- Satisfying lighting transitions.

Treat the mockup as conceptual artwork, not authoritative electrical simulation data or a requirement to copy every label literally.

Use the actual simulation to populate interface values.

## 42. Visual Validation

Capture screenshots where possible.

Verify:

- Buildings are recognizable.
- Lit areas feel warm and alive.
- Cables remain readable.
- Electrical components are easy to select.
- Warning states are clear.
- The UI does not cover important interactions.
- Mobile presentation remains usable.

---

# PHASE 17 — FORGE ARCADE INTEGRATION

## 43. Game Registration

After the standalone game is implemented and tested, prepare the necessary Forge Arcade registration changes.

Suggested metadata:

**Title:** LUMENWORKS

**Subtitle:** The City That Wakes

**Category:** Puzzle / Strategy

**Description:** Restore power to a sleeping miniature city by connecting generators, substations, switches, and batteries.

**Path:** `games/lumenworks/index.html`

Inspect the actual game registry format before modifying it.

Use the existing card and category conventions.

## 44. Game Card

Prepare a distinctive visual thumbnail showing:

- A dark miniature city.
- A glowing power station.
- Cyan cables.
- Warm illuminated buildings.

Reuse existing Forge Arcade card styling.

Do not redesign the shared game-card system.

## 45. Integration Safety

Preserve:

- Existing game registrations.
- Homepage layout.
- Game filters.
- Navigation.
- All existing playable games.
- Shared styling.
- Deployment configuration.

Use relative asset paths.

Do not introduce external dependencies.

Do not automatically deploy or publish.

---

# PHASE 18 — ACCEPTANCE CRITERIA

The build is complete only when:

- LUMENWORKS loads reliably.
- Players can draw valid cables.
- Invalid cable placements are rejected.
- The network simulation respects capacities.
- Switches interrupt and restore power.
- Batteries operate within finite energy limits.
- Overloads are detected consistently.
- Buildings visibly illuminate when powered.
- All eight handcrafted levels are playable.
- Each level has a verified solution.
- Missions and objectives function.
- Star ratings work.
- Level progress saves.
- Sandbox Mode is functional.
- Sandbox layouts can be saved and loaded.
- Desktop mouse controls work.
- Mobile touch controls work.
- Audio can be muted.
- The city has polished lighting and animations.
- Automated tests pass.
- Browser testing reveals no critical defects.
- The game is ready for Forge Arcade integration.

---

# PHASE 19 — FINAL DELIVERABLES

Provide:

1. Complete playable LUMENWORKS game.
2. Source files in `games/lumenworks/`.
3. Eight handcrafted levels.
4. Fully implemented network simulation.
5. Functional cable, switch, battery, and inspection tools.
6. Animated miniature city.
7. Objective and star systems.
8. Sandbox Mode.
9. Save and load functionality.
10. Desktop and mobile controls.
11. Automated tests.
12. Verified solutions for all eight levels.
13. Browser testing results.
14. Performance findings.
15. Screenshots, if available.
16. README and control instructions.
17. Known limitations.
18. Forge Arcade integration changes or prepared patch.
19. Deployment readiness report.

**Do not deploy automatically.**

Keep the work on a separate development branch.

Do not merge into the live arcade without explicit approval.

---

# FINAL DIRECTION

Build a game that is as satisfying to watch as it is to solve.

The player starts with darkness.

They connect a generator.

One building illuminates.

Then another.

Streetlights return.

The market awakens.

The tram begins moving.

Eventually, the entire city shines.

**LUMENWORKS should make every successful connection feel meaningful.**

Build the complete game.

Test every puzzle.

Preserve Forge Arcade.

Deliver a polished, playable result.