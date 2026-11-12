# CODEX BUILD — NEON FORGE
## One Arena. Endless Combos.
### Forge Arcade — Complete Implementation

You are a senior indie game developer, arcade gameplay designer, graphics engineer, and quality-assurance specialist.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target folder:** `games/neon-forge/`

Build NEON FORGE as a complete standalone browser game with ten handcrafted waves, responsive precision combat, escalating difficulty, reactive arena visuals, upgrades, boss encounters, and Endless Mode.

Implement the playable game, test it, resolve observed issues, and prepare it for Forge Arcade integration.

Do not deliver a static mockup, technical demonstration, or incomplete prototype.

**Core principle: Every successful hit should feel powerful. Every combo should make the arena come alive.**

---

# PHASE 1 — INSPECT AND PLAN

## 1. Repository Inspection

Before changing code:

- Inspect the existing Forge Arcade project.
- Identify its game-directory conventions.
- Locate the main game registry.
- Review the homepage and game-card architecture.
- Identify shared styles and navigation patterns.
- Inspect testing and build tools.
- Check whether a game named NEON FORGE already exists.

Do not duplicate existing games or overwrite working files.

Preserve all unrelated games.

Create a separate development branch where supported.

## 2. Technology

Use:

- HTML5 Canvas 2D.
- Vanilla JavaScript.
- CSS3.
- requestAnimationFrame.
- Web Audio API.
- localStorage.
- Seeded random number generation.

Avoid external frameworks, CDNs, servers, and unnecessary dependencies.

Suggested structure:

```text
games/neon-forge/
├── index.html
├── style.css
├── main.js
├── game.js
├── player.js
├── targets.js
├── waves.js
├── upgrades.js
├── renderer.js
├── audio.js
├── input.js
├── storage.js
├── tests/
│   ├── combat.test.js
│   ├── waves.test.js
│   └── upgrades.test.js
└── README.md
```

Adapt the architecture to established repository conventions when appropriate.

Separate gameplay logic from rendering.

Use deterministic simulation timing for combat and collision validation.

---

# PHASE 2 — CORE GAMEPLAY

## 3. The Arena

Create a single-screen circular arena.

The player controls a small glowing robot positioned at its center.

Targets approach from the arena's outer boundary.

The player must rotate toward approaching targets and strike them before they reach the center.

The arena should feel like a futuristic training chamber.

### Starting appearance

Initially, display:

- Dark futuristic background.
- Circular combat zone.
- Subtle radial markings.
- Small glowing robot.
- Minimal neon highlights.

The arena should become more elaborate as the player performs well.

## 4. Core Gameplay Loop

The primary loop is:

**Observe → Aim → Strike → Build Combo → Earn Energy → Upgrade → Survive**

Each wave introduces new target patterns.

Successfully striking targets earns points and combo energy.

Missing targets or allowing them to reach the player causes damage or consumes shields.

After selected waves, offer upgrade choices.

Complete wave ten to win.

Unlock Endless Mode after completing the main challenge.

## 5. Player Robot

Design a compact, recognizable robot.

Appearance:

- Circular or rounded body.
- Cyan energy core.
- Directional emitter.
- Small animated details.
- Subtle idle motion.
- Bright but restrained glow.

Keep the silhouette simple.

The player should always know which direction the robot is facing.

### Movement

The robot remains fixed at the arena center.

The player controls its facing direction and attack timing.

Do not introduce free movement unless testing reveals a compelling gameplay benefit and the existing design remains recognizable.

---

# PHASE 3 — COMBAT SYSTEM

## 6. Aiming

### Desktop

- Mouse position determines facing direction.
- Mouse click activates strike.
- SPACE provides keyboard strike.
- Optional A/D or arrow keys rotate the robot for keyboard-only play.

### Mobile

Implement touch-friendly aiming.

Preferred design:

- Drag around the arena to rotate.
- Dedicated large STRIKE button.
- Optional tap-to-aim support.

Avoid requiring extremely precise gestures on small screens.

### Controller Support

If practical, support:

- Left or right stick aiming.
- Primary button to strike.
- Pause button.

Do not sacrifice mouse or touch responsiveness for controller support.

## 7. Energy Strike

The player emits a short-range directional energy pulse.

### Strike properties

- Defined angular attack arc.
- Defined radial reach.
- Short active duration.
- Small recovery period.
- Immediate visual and audio feedback.

An individual strike should register each eligible target at most once.

Use deterministic collision checks.

### Initial tuning

Suggested values:

- Strike arc: approximately 50 degrees.
- Strike active duration: 100 milliseconds.
- Recovery: 220 milliseconds.
- Perfect timing window: approximately 100 milliseconds.

Tune all values through actual playtesting.

Avoid allowing players to hold the button and automatically succeed.

### Precision

A strike must only register when the target is within the active attack region.

Do not award hits based solely on visual proximity.

## 8. Perfect Hit Mechanic

Create a narrow ideal hit region around the player.

When an approaching target enters this region, the player can perform a Perfect Hit.

### Normal hit

- Destroys or damages the target.
- Awards base points.
- Maintains combo.

### Perfect Hit

- Awards bonus points.
- Increases combo energy.
- Triggers a distinctive visual effect.
- Produces a satisfying sound.

### Feedback

Display:

**PERFECT!**

Use a brief radial energy flash.

Avoid excessive fullscreen flashing.

## 9. Combo System

Successful consecutive hits build a combo.

Examples:

- 5 hits: Combo ×2.
- 10 hits: Combo ×3.
- 20 hits: Combo ×4.
- 35 hits: Combo ×5.

Use a defined maximum multiplier.

### Combo reset

A missed target or player damage resets the combo, subject to shield and upgrade rules.

### Feedback

Show:

- Current combo.
- Score multiplier.
- Best combo.
- Current score.

Make combo feedback visible without dominating the screen.

## 10. Player Health

Start with three shield segments.

A target reaching the center causes one shield segment of damage.

### Damage behavior

- Brief invulnerability after damage.
- Clear shield-loss feedback.
- No repeated damage from the same target.
- Remove or resolve the offending target.
- End the run when all shields are lost.

Provide an immediate Retry option.

Do not restart automatically without player input.

---

# PHASE 4 — TARGET TYPES

## 11. Four Distinct Target Types

Implement four target categories.

### TYPE 1 — SPARK

Appearance:

Small cyan triangle.

Behavior:

- Approaches in a straight line.
- Slow initial speed.
- One hit to destroy.

Purpose:

Introduces aiming and timing.

### TYPE 2 — DRIFTER

Appearance:

Purple diamond.

Behavior:

- Approaches with gentle lateral movement.
- Changes its angle slightly while moving.
- One hit to destroy.

Purpose:

Tests tracking and anticipation.

### TYPE 3 — BULWARK

Appearance:

Orange hexagon.

Behavior:

- Requires two hits.
- First hit visibly cracks its shell.
- Second hit destroys it.

Purpose:

Tests repeated timing and prioritization.

### TYPE 4 — SPLINTER

Appearance:

Pink square.

Behavior:

- On destruction, divides into two smaller targets.
- Children must be handled before reaching the center.
- Spawn offsets must be readable and fair.

Purpose:

Introduces controlled chaos.

### Design rules

Every target must have:

- Distinct silhouette.
- Distinct colour.
- Understandable behavior.
- Clear hit feedback.
- Predictable collision rules.

Never rely solely on colour to communicate target type.

---

# PHASE 5 — WAVE SYSTEM

## 12. Ten Handcrafted Waves

Build ten distinct, fully playable waves.

Each wave must have:

- Name.
- Target composition.
- Spawn pattern.
- Difficulty parameters.
- Completion condition.
- Maximum target count.

### WAVE 1 — FIRST SPARK

Teach aiming and striking.

Use slow Spark targets.

### WAVE 2 — DOUBLE BEAT

Introduce two simultaneous approach lanes.

Encourage switching aim direction.

### WAVE 3 — THE DRIFTERS

Introduce moving Drifter targets.

### WAVE 4 — BREAK THE SHELL

Introduce Bulwark targets.

Teach the two-hit mechanic.

### WAVE 5 — PRISM STORM

Combine Sparks, Drifters, and Bulwarks.

Introduce the first upgrade milestone.

### WAVE 6 — SPLINTER FIELD

Introduce Splinter targets.

Require players to manage their smaller fragments.

### WAVE 7 — CROSSCURRENT

Create alternating approach patterns.

Combine different target speeds.

### WAVE 8 — CHAIN REACTION

Reward careful timing and combo management.

Introduce denser but readable target sequences.

### WAVE 9 — THE OVERLOAD

Combine every target type.

Increase difficulty while preserving manageable reaction windows.

### WAVE 10 — THE FORGE HEART

Final boss encounter.

Combine precision strikes with clearly telegraphed attack phases.

Defeat the boss to complete the game.

## 13. Wave Pacing

Each wave should take approximately 25–60 seconds.

Difficulty should increase through:

- Target composition.
- Approach patterns.
- Timing variation.
- Target durability.
- Tactical prioritization.

Do not simply increase speed indefinitely.

### Spawn fairness

Avoid impossible simultaneous target arrangements.

Use constraints to ensure the player can respond with the available controls and attack cooldown.

Allow short rest periods between intense sequences.

## 14. Wave Completion

A wave ends when:

- All scheduled targets have spawned.
- All remaining targets have been resolved.
- Any wave-specific objective has been completed.

Display:

- Wave score.
- Accuracy.
- Perfect Hits.
- Maximum combo.
- Bonus points.

Provide a short transition before the next wave.

---

# PHASE 6 — UPGRADES

## 15. Upgrade Selection

After waves 3, 5, 7, and 9, present three random upgrade choices.

Let the player select one.

Pause gameplay while selecting.

Upgrade choices should have clear descriptions.

Prevent invalid or duplicate choices where inappropriate.

## 16. Six Upgrades

Implement six meaningful abilities.

### CHAIN LIGHTNING

Successful strikes may damage another nearby eligible target.

Limit chain distance and number of chained targets.

### PULSE SHIELD

Provides one additional shield charge.

Enforce a sensible maximum health limit.

### TIME BEND

Temporarily slows approaching targets after a Perfect Hit.

Provide cooldown or activation limits.

### WIDE ARC

Slightly increases strike angle.

Do not make aiming unnecessary.

### ENERGY ECHO

A Perfect Hit generates a weaker secondary pulse after a short delay.

Secondary attacks must respect collision rules.

### COMBO KEEPER

Protects the current combo against one qualifying mistake.

Refresh or stack protection only within defined limits.

## 17. Upgrade Balancing

Ensure:

- Every upgrade changes gameplay noticeably.
- Upgrades cannot cause infinite automatic attacks.
- Damage and shield limits remain consistent.
- Upgrade effects are visible.
- Upgrades cannot make the game unwinnable.
- Repeated upgrades follow documented stacking rules.

Test combinations systematically.

---

# PHASE 7 — BOSS ENCOUNTER

## 18. THE FORGE HEART

Create a visually impressive final boss positioned along the arena's perimeter or as a special incoming entity.

Appearance:

- Large geometric mechanical core.
- Pulsating energy rings.
- Rotating armor segments.
- Bright central weak point.

### Boss phases

**PHASE 1 — CORE EXPOSURE**

The boss periodically exposes a vulnerable area.

The player must strike during the opening.

**PHASE 2 — TARGET SWARM**

The boss releases manageable groups of ordinary targets.

The player must clear them.

**PHASE 3 — FINAL SURGE**

The boss alternates between vulnerable windows and faster target patterns.

Defeat it with precise strikes.

### Fairness

Give clear visual warnings.

Avoid unavoidable damage.

Keep the boss compatible with upgrades.

Do not allow continuous damage from a single button press.

### Victory

When defeated:

- The arena reaches full illumination.
- A colourful geometric celebration plays.
- The player sees their final score.
- Endless Mode unlocks.

Keep the victory animation brief and skippable.

---

# PHASE 8 — REACTIVE ARENA

## 19. Arena Evolution

This is NEON FORGE's signature visual system.

The arena transforms based on player performance.

### STAGE 1 — DORMANT

- Dark background.
- Minimal glowing geometry.
- Small energy trails.

### STAGE 2 — AWAKENED

Triggered by moderate combo performance.

- Additional glowing rings.
- Brighter radial markings.
- More colourful particles.

### STAGE 3 — RESONANT

Triggered by sustained successful play.

- Animated geometric patterns.
- Reactive light pulses.
- Stronger energy trails.
- Subtle rhythmic motion.

### STAGE 4 — OVERDRIVE

Triggered by exceptional combo performance.

- Rich neon colours.
- Complex but readable geometry.
- Layered light effects.
- Dynamic energy patterns.

### STAGE 5 — ASCENDANT

Reached during exceptional late-game performance or final victory.

- Fully illuminated arena.
- Elaborate energy structures.
- Spectacular but controlled particles.
- Distinctive visual identity.

## 20. Arena Evolution Rules

Separate visual evolution from combat mechanics.

Arena transformations must not change hitboxes.

They must not obscure targets.

Use smoothing or hysteresis to prevent rapid oscillation between stages when combo levels fluctuate.

### Performance

Provide quality settings.

Reduce decorative elements on slower devices.

Maintain contrast between gameplay targets and background effects.

---

# PHASE 9 — VISUAL EFFECTS

## 21. Particle System

Implement a lightweight pooled particle system.

Use particles for:

- Normal strikes.
- Perfect Hits.
- Target destruction.
- Combo milestones.
- Upgrade activation.
- Boss damage.
- Victory.

Cap particle counts.

Avoid uncontrolled allocations.

## 22. Motion and Feedback

Implement:

- Short directional strike arcs.
- Smooth target movement.
- Small impact reactions.
- Subtle screen feedback.
- Energy trails.
- Combo pulses.
- Boss phase indicators.

Respect reduced-motion preferences.

Avoid aggressive screen shake.

## 23. Colour Palette

Suggested palette:

- Background: #080B18
- Cyan: #22D3EE
- Electric blue: #3B82F6
- Violet: #A855F7
- Pink: #F472B6
- Orange: #FB923C
- Yellow: #FACC15

Use colours consistently.

Keep UI readable.

---

# PHASE 10 — AUDIO AND RHYTHM

## 24. Procedural Audio

Use Web Audio API to generate lightweight original sound effects.

Include:

- Strike.
- Perfect Hit.
- Combo milestone.
- Target destruction.
- Shield damage.
- Upgrade selection.
- Boss phase transition.
- Victory.

Do not autoplay audio.

Provide mute and volume controls.

## 25. Reactive Rhythm

Make audio and lighting react to gameplay performance.

Examples:

- Increasing combo produces richer sound feedback.
- Perfect Hits trigger short musical accents.
- Arena effects pulse gently with an original rhythm.
- Boss phases change the soundscape.

Do not require players to follow copyrighted songs or external music.

### Important

The game is a rhythm-influenced precision arcade game, not a strict music-sync game.

Combat timing must remain reliable even when audio is disabled.

Never base hit registration on audio playback latency.

---

# PHASE 11 — INTERFACE

## 26. Main Menu

Display:

**NEON FORGE**

*One Arena. Endless Combos.*

Buttons:

- Start Run.
- Endless Mode, when unlocked.
- How to Play.
- High Scores.
- Settings.

Use an animated geometric background.

## 27. In-Game HUD

Display:

- Current wave.
- Score.
- Combo.
- Shield segments.
- Upgrade indicators.
- Pause.

Place the combo indicator prominently.

Keep essential information outside the central combat area.

## 28. Upgrade Screen

Between eligible waves:

Display three cards.

Each card shows:

- Upgrade icon.
- Name.
- Short description.
- Gameplay benefit.

Use clear keyboard and touch selection.

## 29. Game Over Screen

Display:

- Final score.
- Wave reached.
- Maximum combo.
- Accuracy.
- Perfect Hits.

Buttons:

- Retry.
- Main Menu.

Retries should be immediate.

## 30. Victory Screen

Display:

**FORGE COMPLETE**

Show:

- Final score.
- Rank.
- Best combo.
- Perfect Hit count.
- Endless Mode unlocked.

Provide Replay and Endless Mode options.

---

# PHASE 12 — ENDLESS MODE

## 31. Endless Mode Rules

Unlock after completing wave ten.

Endless Mode should:

- Generate continuously escalating waves.
- Combine existing target patterns.
- Introduce reasonable difficulty scaling.
- Offer periodic upgrade selections.
- Track survival duration and score.
- Save best records.

### Difficulty balancing

Increase challenge through combinations and spacing, not unlimited speed.

Keep all target types readable.

Avoid impossible spawn schedules.

## 32. High Scores

Persist locally:

- Best campaign score.
- Best Endless Mode score.
- Highest completed Endless wave.
- Best combo.
- Most Perfect Hits.

Handle corrupted storage safely.

---

# PHASE 13 — INPUT AND ACCESSIBILITY

## 33. Desktop Controls

Implement:

- Mouse aiming.
- Left click to strike.
- SPACE to strike.
- A/D or arrow keys for rotational control.
- ESC to pause.

Optional:

- Controller support.

Ensure mouse and keyboard controls do not conflict.

## 34. Mobile Controls

Implement:

- Touch aiming.
- Dedicated STRIKE button.
- Large pause button.
- Responsive HUD.
- Landscape optimization.
- Usable portrait presentation.

Avoid accidentally striking when interacting with menus.

Prevent scrolling during active game gestures.

## 35. Accessibility

Support:

- Reduced motion.
- Clear target silhouettes.
- High-contrast indicators.
- Adjustable effect quality.
- Audio mute.
- Keyboard navigation.
- Clear focus states.

Do not rely exclusively on colours to identify threats.

Avoid rapid fullscreen flashes.

---

# PHASE 14 — SAVE SYSTEM

## 36. Persistent Data

Use localStorage for:

- High scores.
- Endless Mode unlock.
- Sound preferences.
- Visual quality preferences.
- Reduced-motion preference.
- Control preferences, if implemented.

Use versioned save data.

Handle missing or invalid storage gracefully.

Do not modify unrelated Forge Arcade save keys.

---

# PHASE 15 — TESTING

## 37. Automated Combat Tests

Create tests for:

1. Player rotation.
2. Mouse aiming.
3. Keyboard aiming.
4. Strike activation.
5. Strike cooldown.
6. Strike arc collisions.
7. Strike reach.
8. Perfect Hit detection.
9. Target destruction.
10. Bulwark durability.
11. Splinter division.
12. Combo progression.
13. Combo reset.
14. Score calculation.
15. Shield damage.
16. Damage invulnerability.
17. Game over.
18. Pause and resume.
19. Restart.

## 38. Upgrade Tests

Verify:

- Chain Lightning limits.
- Pulse Shield maximums.
- Time Bend duration and cooldown.
- Wide Arc geometry.
- Energy Echo collision behavior.
- Combo Keeper consumption.
- Upgrade stacking.
- Upgrade reset between runs.

## 39. Wave Tests

Test all ten waves.

Verify:

- Correct target counts.
- Valid spawn timings.
- Distinct wave patterns.
- Achievable wave completion.
- Correct upgrade milestones.
- No impossible overlap patterns.
- Reliable boss progression.
- Correct campaign victory.

Use seeded simulation tests where appropriate.

## 40. Boss Tests

Verify:

- Boss phase transitions.
- Vulnerability windows.
- Damage registration.
- Invulnerable states.
- Target spawning.
- Boss defeat.
- Victory trigger.

Prevent duplicate victory events.

## 41. Endless Mode Tests

Verify:

- Unlock conditions.
- Procedural wave generation.
- Difficulty bounds.
- Upgrade intervals.
- Game-over handling.
- High-score persistence.

## 42. Browser Testing

Where browser automation is available, test:

- Main menu.
- Start Run.
- Mouse aiming.
- Keyboard aiming.
- Striking.
- Perfect Hits.
- Combo scoring.
- Damage and shields.
- Upgrade selection.
- Every wave.
- Final boss.
- Victory.
- Endless Mode.
- Pause.
- Restart.
- High scores.
- Mobile touch controls.
- Portrait and landscape layouts.
- Browser resizing.

Check for console errors.

Fix observed bugs.

Do not claim tests passed unless executed.

---

# PHASE 16 — PERFORMANCE

## 43. Optimization

Target smooth gameplay on desktop and mid-range Android devices.

Use:

- requestAnimationFrame.
- Fixed or bounded simulation timestep.
- DevicePixelRatio caps.
- Particle pooling.
- Cached visual effects.
- Efficient target collision checks.
- Limited active target counts.
- Reduced-effect rendering modes.

Avoid unnecessary per-frame allocations.

## 44. Performance Validation

Measure:

- Frame rate.
- Input responsiveness.
- Target collision stability.
- Particle counts.
- Memory behavior.
- Boss encounter performance.
- Endless Mode performance.

Test the game during maximum visual intensity.

Report measured results.

Do not invent performance claims.

---

# PHASE 17 — FORGE ARCADE INTEGRATION

## 45. Registration

Prepare an entry using the repository's actual game-registration format.

Suggested metadata:

**Title:** NEON FORGE

**Category:** Arcade / Action

**Description:** Aim, strike, and chain perfect hits inside an evolving neon arena. Survive ten waves, defeat the Forge Heart, and unlock Endless Mode.

**Path:** `games/neon-forge/index.html`

Inspect the existing game registry before editing.

## 46. Game Card

Create a distinctive thumbnail featuring:

- Cyan robot at the arena center.
- Incoming geometric targets.
- Neon circular patterns.
- Bright energy trails.
- Dark futuristic background.

Use established Forge Arcade card styling.

Do not redesign unrelated cards.

## 47. Integration Safety

Preserve:

- Homepage.
- Existing game registrations.
- Other games.
- Navigation.
- Filters.
- Shared styling.
- Deployment configuration.

Use relative asset paths.

Avoid unnecessary dependencies.

Do not deploy or publish automatically.

---

# PHASE 18 — ACCEPTANCE CRITERIA

The game is complete when:

- A playable robot can aim and strike.
- Four target types work.
- Perfect Hit detection is consistent.
- Combos and scoring function correctly.
- All ten waves are playable.
- Six upgrades are implemented.
- Upgrade selection works.
- The arena evolves visually.
- The final boss is functional.
- Victory unlocks Endless Mode.
- Endless Mode generates playable waves.
- High scores persist.
- Desktop controls work.
- Mobile controls work.
- Audio can be muted.
- The game remains responsive under heavy effects.
- Automated tests pass.
- Browser testing reveals no critical defects.
- Forge Arcade integration is prepared.

---

# PHASE 19 — FINAL DELIVERABLES

Provide:

1. Complete NEON FORGE game.
2. Source code under `games/neon-forge/`.
3. Ten handcrafted waves.
4. Four target types.
5. Combat and Perfect Hit systems.
6. Combo scoring.
7. Six functional upgrades.
8. Reactive arena evolution.
9. Final boss encounter.
10. Endless Mode.
11. High-score persistence.
12. Desktop and mobile controls.
13. Automated tests.
14. Browser testing results.
15. Performance measurements.
16. Screenshots, if available.
17. README.
18. Known limitations.
19. Forge Arcade integration patch or prepared changes.
20. Deployment readiness report.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep work on a separate development branch until explicitly authorized.

---

# FINAL DIRECTION

NEON FORGE should be fast, colourful, responsive, and genuinely entertaining.

Every hit should provide immediate satisfaction.

Every combo should build excitement.

Every wave should introduce a meaningful challenge.

Every upgrade should change how the player approaches combat.

The arena should transform from a quiet chamber into a spectacular neon machine.

Prioritize **gameplay feel, readable combat, fair challenge, and reliable execution** over unnecessary visual complexity.

**Inspect first. Build completely. Test thoroughly.**