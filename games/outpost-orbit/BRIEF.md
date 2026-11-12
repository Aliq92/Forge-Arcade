# CODEX — FIX #15: OUTPOST ORBIT
## The Frontier Station Update

You are a senior indie browser-game developer, systems designer, and gameplay engineer working inside the existing Forge Arcade repository.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target game:** `games/outpost-orbit/`

Your mission is to transform Outpost Orbit into a more engaging and purposeful space game by improving its objectives, resource systems, exploration, progression, visual feedback, and overall gameplay experience.

This is an enhancement of the existing game, NOT a complete rebuild.

**Core vision: Every orbit should accomplish something. Every upgrade should matter.**

---

## 1. INSPECT BEFORE MODIFYING

Before implementing changes:

- Inspect all existing Outpost Orbit files.
- Confirm the actual game directory and rendering architecture.
- Understand the current gameplay loop.
- Identify existing orbital mechanics, station components, ships, resources, objectives, and progression systems.
- Review existing controls, collisions, win/loss conditions, and saved progress.
- Identify strengths worth preserving and weaknesses that make gameplay repetitive.
- Run existing tests.

Do not assume that features described below already exist.

Preserve functional systems and avoid unnecessary rewrites.

Do not modify unrelated Forge Arcade games.

## 2. ESTABLISH A CLEAR GAMEPLAY PURPOSE

The game currently needs stronger objectives and more meaningful player decisions.

Build a coherent gameplay loop around the existing mechanics.

Suggested loop:

**Explore → Collect → Deliver → Upgrade → Expand → Complete Missions**

Adapt this loop to the existing game rather than forcing unrelated mechanics into it.

### Main objective

Develop a small orbital outpost into a fully operational frontier station.

The player should always have a clear understanding of:

- What they are trying to accomplish.
- Why it matters.
- What rewards they will receive.
- What they can unlock next.

Avoid leaving the player wandering without direction.

## 3. MISSION SYSTEM

Implement a compact mission system with clear objectives and rewards.

### Mission categories

**RESOURCE DELIVERY**
- Gather a required amount of a resource.
- Return it to the outpost.
- Receive credits or upgrade materials.

**ORBITAL SURVEY**
- Explore designated areas.
- Scan objects or discover anomalies.
- Return collected survey data.

**STATION SUPPORT**
- Deliver materials needed for station maintenance or construction.
- Restore damaged or depleted station systems.

**EXPLORATION**
- Reach a new orbital region.
- Discover a satellite, asteroid cluster, or unusual phenomenon.

**FRONTIER MILESTONE**
- Complete major objectives that expand the station's capabilities.

### Mission design

Start with simple, achievable missions.

Gradually introduce more complex objectives.

Maintain a clear active mission tracker.

Avoid excessive mission text.

## 4. PROGRESSION STRUCTURE

Introduce three meaningful progression stages.

### STAGE 1 — SURVIVAL OUTPOST

The player begins with a basic station and limited capabilities.

Objectives:

- Learn movement.
- Collect initial resources.
- Complete simple deliveries.
- Unlock the first upgrade.

### STAGE 2 — ORBITAL EXPANSION

The player improves station systems.

Objectives:

- Explore farther.
- Collect valuable materials.
- Complete varied missions.
- Upgrade equipment.
- Manage additional challenges.

### STAGE 3 — FRONTIER STATION

The outpost becomes a capable orbital facility.

Objectives:

- Complete advanced missions.
- Explore distant regions.
- Manage environmental threats.
- Finish a final station milestone.

### Completion

Give the player a satisfying completion screen when the frontier station is fully operational.

Include a final progress summary and the option to continue exploring.

Do not require endless grinding to finish the main objective.

## 5. RESOURCE MANAGEMENT

Improve resource collection and usefulness.

First inspect existing resources and currencies.

Reuse existing systems where possible.

Suggested resources:

**ORE**
- Used for construction and structural upgrades.

**ENERGY**
- Powers station systems and selected equipment.

**RESEARCH DATA**
- Earned through exploration and scanning.

**CREDITS**
- Used for equipment and operational upgrades.

### Resource balance

Resources must have meaningful uses.

Avoid adding currencies solely for complexity.

Ensure the player always has a practical way to recover from shortages.

Prevent unwinnable states caused by insufficient resources.

## 6. OUTPOST UPGRADE SYSTEM

Introduce a small set of useful upgrades.

### CARGO MODULE

Increases carrying capacity.

### ENGINE MODULE

Improves movement efficiency or responsiveness.

### SCANNER ARRAY

Extends the detection range for resources and anomalies.

### ENERGY SYSTEM

Improves energy capacity or recovery.

### STATION EXPANSION

Visually and functionally upgrades the outpost.

### Upgrade rules

Every upgrade must create a noticeable gameplay improvement.

Display:

- Upgrade name.
- Current level.
- Cost.
- Gameplay benefit.
- Maximum level.

Avoid unnecessary upgrade trees.

Use balanced costs.

## 7. EXPLORATION AND DISCOVERIES

Make exploration rewarding.

Introduce discoverable objects appropriate to the existing world.

Possible discoveries:

- Asteroid fields.
- Abandoned satellites.
- Resource-rich debris.
- Unusual signals.
- Hidden supply caches.
- Orbital anomalies.

### Discovery behavior

Discoveries should reward the player with:

- Resources.
- Research data.
- Mission progress.
- New locations.
- Occasional special events.

Do not make exploration depend exclusively on random rewards.

Provide meaningful reasons to revisit previously explored regions.

## 8. RANDOM SPACE EVENTS

Introduce occasional events to make each run feel different.

Examples:

**SOLAR DISTURBANCE**
- Temporarily affects energy recovery.

**DEBRIS FIELD**
- Requires careful navigation.

**SUPPLY SIGNAL**
- Reveals a valuable opportunity.

**STATION MALFUNCTION**
- Creates a short repair objective.

**RARE ANOMALY**
- Offers additional research rewards.

### Event balancing

Events must:

- Occur at reasonable intervals.
- Have clear warnings.
- Be understandable.
- Offer counterplay or recovery.
- Avoid unfair unavoidable failure.

Keep visual effects comfortable.

## 9. IMPROVE ORBITAL GAMEPLAY

Inspect the existing movement and orbital physics before changing them.

If orbital movement is central to the game:

- Preserve its original physics model.
- Improve movement feedback.
- Refine navigation assistance.
- Make orbital paths more understandable.
- Provide clear velocity or direction indicators where appropriate.
- Add gentle trajectory prediction if technically feasible.

Do not replace orbital mechanics with ordinary arcade movement unless the existing game already uses it.

### Controls

Maintain responsive ship or station controls.

Avoid abrupt movement, excessive drift, or confusing acceleration.

Any automatic stabilization feature should be clearly described and balanced.

## 10. NAVIGATION AND WAYPOINTS

Add navigation assistance to support objectives.

Include:

- Active mission markers.
- Directional indicators.
- Distance information.
- Clear station location.
- Discovery indicators.

If the world is large, consider a compact radar or minimap.

Do not automatically navigate the player to objectives.

Navigation should assist exploration rather than eliminate it.

## 11. SPACE ENVIRONMENT VISUALS

Improve the overall space presentation.

Introduce:

- Rich starfields.
- Soft nebula backgrounds.
- Planetary atmospheric glow.
- More attractive asteroid formations.
- Subtle orbital trails.
- Distant celestial objects.
- Better engine particles.
- Clear resource effects.

### Outpost appearance

Make the station visually evolve as it is upgraded.

Examples:

- New solar panels.
- Expanded docking modules.
- Additional antennas.
- Improved lighting.
- Larger structural segments.

Use lightweight procedural graphics.

Ensure the outpost remains recognizable.

## 12. DOCKING AND DELIVERY

If the existing game supports docking or returning to the outpost, improve the experience.

### Docking feedback

Provide:

- Clear docking range.
- Visual alignment guidance.
- Responsive arrival detection.
- Satisfying delivery confirmation.

### Delivery feedback

When resources are delivered:

- Update inventory correctly.
- Show rewards.
- Advance mission progress.
- Display available upgrades.

Avoid unnecessary waiting animations.

If docking does not exist, implement only the smallest compatible delivery interaction required by the gameplay loop.

## 13. USER INTERFACE

Refresh the HUD without making it complicated.

### Main menu

Title:

**OUTPOST ORBIT**

Subtitle:

"Build humanity's next frontier."

Preserve existing menu functions.

### In-game HUD

Display:

- Active objective.
- Resource inventory.
- Station progress.
- Relevant ship status.
- Upgrade access.
- Pause.
- Restart or return to menu.

Keep the game world visually dominant.

### Mission tracker

Show:

- Mission title.
- Short objective.
- Progress.
- Reward.

Use concise labels.

## 14. GAMEPLAY FEEDBACK

Add satisfying feedback for:

- Resource collection.
- Successful docking.
- Mission completion.
- Upgrades.
- Discoveries.
- Station expansion.
- Major milestones.

Use:

- Small particle effects.
- Subtle animation.
- Brief status notifications.
- Appropriate sound effects.

Avoid excessive confetti during routine actions.

Reserve larger celebrations for major milestones.

## 15. AUDIO DESIGN

Preserve existing audio systems.

Where appropriate, add:

- Gentle space ambience.
- Engine feedback.
- Collection sounds.
- Docking confirmation.
- Scanner pulses.
- Upgrade sounds.
- Mission completion cues.

Never autoplay audio before user interaction.

Provide a mute toggle.

## 16. DESKTOP AND MOBILE CONTROLS

Preserve existing controls wherever possible.

### Desktop

- Responsive keyboard movement.
- Mouse interaction where supported.
- Easy mission selection.
- Accessible upgrade panels.
- Reliable pause and restart.

### Mobile

- Clear touch controls.
- Readable objective tracker.
- Large interface targets.
- Responsive menus.
- Portrait and landscape support where feasible.

Prevent unintended page scrolling during active gameplay.

## 17. PERFORMANCE OPTIMIZATION

Target smooth gameplay on desktop and mid-range Android devices.

Use:

- Efficient rendering.
- Bounded particles.
- Cached background elements.
- Object pooling where useful.
- Delta-time movement.
- Viewport culling.
- DevicePixelRatio caps.
- Efficient collision queries.

Avoid unnecessary heavy simulation systems.

Keep progression and mission updates efficient.

## 18. SAVE AND CONTINUE

If the existing game supports persistent progress, preserve it.

Where practical, store:

- Mission progress.
- Resources.
- Purchased upgrades.
- Discovered locations.
- Station stage.
- Preferences.

Use localStorage for standalone browser persistence if compatible.

Validate saved data before loading.

Provide a fresh-start option.

Avoid corrupting older save formats.

## 19. PREVENT REPETITIVE GAMEPLAY

Evaluate whether the player has meaningful choices.

Improve pacing through:

- Short early missions.
- Varied mission categories.
- Gradual exploration expansion.
- Visible station growth.
- Useful upgrades.
- Occasional discoveries.
- New challenges.

Do not rely on simply increasing required resource quantities.

The game should become more interesting as the player progresses.

## 20. AUTOMATED TESTING

Create or update tests covering:

1. Game startup.
2. Existing movement.
3. Orbital mechanics.
4. Mission generation.
5. Mission completion.
6. Resource collection.
7. Resource delivery.
8. Upgrade purchases.
9. Station progression.
10. Discovery rewards.
11. Random event behavior.
12. Navigation markers.
13. Save compatibility.
14. Pause.
15. Restart.
16. Victory condition.
17. Desktop input.
18. Mobile input.

### Progression validation

Simulate or test a complete progression path from the starting outpost to the final station milestone.

Verify that:

- All required missions are achievable.
- Resources remain obtainable.
- Upgrades have functional effects.
- Progress cannot become permanently blocked.
- The final objective can be completed.

Do not claim the game is balanced without testing.

## 21. BROWSER TESTING

Where browser automation is available, test:

- Main menu.
- New game.
- Movement and navigation.
- Resource collection.
- Mission completion.
- Docking and delivery.
- Upgrade purchasing.
- Station expansion.
- Exploration discoveries.
- Space events.
- Save and reload.
- Pause and restart.
- Final completion.
- Desktop layout.
- Mobile touch controls.

Check for console errors.

Fix observed defects.

If browser automation is unavailable, state that limitation.

## 22. VISUAL VALIDATION

Capture before-and-after screenshots where possible.

Compare:

- Outpost appearance.
- Space environment.
- HUD readability.
- Navigation indicators.
- Mission presentation.
- Upgrade effects.
- Discovery feedback.
- Overall visual cohesion.

Ensure the improved game remains recognizable as Outpost Orbit.

## 23. FORGE ARCADE INTEGRATION

Preserve:

- Forge Arcade homepage.
- All other games.
- Existing game cards.
- Navigation.
- Category filters.
- Deployment configuration.

Only modify Outpost Orbit and directly necessary supporting assets.

Use relative file paths.

Prepare updated card artwork featuring the expanded orbital station.

Do not modify the shared card system without approval.

## 24. ACCEPTANCE CRITERIA

The upgrade is complete when:

- Players have clear objectives.
- Missions provide meaningful progression.
- Resource collection has practical value.
- Outpost upgrades affect gameplay.
- Exploration offers useful discoveries.
- Space events create interesting challenges.
- Navigation remains understandable.
- The station visibly develops.
- A complete progression path exists.
- Original mechanics remain functional.
- Desktop and mobile controls work.
- Automated tests pass.
- No critical regressions remain.

## 25. FINAL DELIVERABLES

Provide:

1. Existing game analysis.
2. Gameplay progression design.
3. Mission system.
4. Resource and upgrade systems.
5. Exploration improvements.
6. Updated visual presentation.
7. Updated source files.
8. Before-and-after screenshots, if possible.
9. Automated test results.
10. Full progression test results.
11. Browser testing results.
12. Performance findings.
13. Known limitations.
14. Deployment readiness assessment.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep changes on a separate development branch until explicitly authorized.

## FINAL DIRECTION

Make Outpost Orbit purposeful, rewarding, and enjoyable.

Every mission should have a reason.

Every upgrade should improve something meaningful.

Every discovery should encourage further exploration.

The station should visibly grow through the player's actions.

Preserve the original game's identity.

**Inspect first. Improve carefully. Test thoroughly.**