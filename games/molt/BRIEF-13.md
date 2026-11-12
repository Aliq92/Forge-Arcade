# CODEX — FIX #13: MOLT
## The Colourful Creatures Update

You are a senior indie game developer, character designer, and gameplay engineer working inside the existing **Forge Arcade** repository.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target:** `games/molt/`

Your mission is to redesign MOLT's creatures and refine its gameplay into a colourful, charming, intuitive survival experience.

This is an improvement to the existing game, NOT a complete rebuild.

**Core vision: Simple creatures. Beautiful colours. Satisfying survival.**

## 1. INSPECT FIRST

Before modifying anything:

- Inspect the current MOLT source files.
- Review the original and updated creature designs, if available.
- Understand movement, eating, growth, molting, predators, and progression.
- Identify which improvements from FIX #05 have already been implemented.
- Check desktop and mobile controls.
- Run existing tests.

Preserve working gameplay and environmental improvements.

Do not modify unrelated Forge Arcade games.

## 2. RESTORE SIMPLE CREATURE DESIGNS

The current creature design may have become unnecessarily complicated.

Return to simpler, recognizable shapes.

### Main creature

Design a small, colourful organism using:

- Rounded body.
- Clean silhouette.
- Two expressive eyes.
- Small antennae or fins.
- Minimal decorative details.
- Soft colour gradients.

The creature must remain immediately recognizable even at small sizes.

Avoid excessive limbs, armor, textures, or complicated anatomy.

### Design philosophy

**Less detail. More personality.**

The creature should feel like an appealing miniature living organism rather than an overly elaborate fantasy monster.

## 3. COLOURFUL CREATURE SYSTEM

Introduce vibrant, cohesive colours.

Suggested palette:

- Turquoise.
- Mint green.
- Soft coral.
- Lavender.
- Golden yellow.
- Sky blue.
- Warm pink.

### Colour variation

Allow different creatures to display:

- Distinct body colours.
- Simple patterns.
- Subtle gradient variations.
- Small glowing accents.

Keep visual differences meaningful.

The player, predators, and neutral organisms must remain distinguishable.

### Growth stages

Use the existing growth-stage system.

Make each stage visually distinct through:

- Gradual body-size changes.
- Colour evolution.
- Small silhouette differences.
- Simple pattern development.

Avoid introducing new growth stages unless necessary.

## 4. CHARMING ANIMATIONS

Improve movement presentation using:

- Gentle body wobble.
- Soft squash and stretch.
- Subtle eye movement.
- Smooth directional turning.
- Small movement trails.
- Playful idle motion.

### Eating

When the creature eats:

- Show a small bounce.
- Trigger a colourful particle burst.
- Provide immediate growth feedback.

### Molting

Keep molting visually special but simple.

Suggested sequence:

1. Creature pauses briefly.
2. A soft glow appears.
3. Its old shell separates.
4. The creature emerges with refreshed colours.
5. A small celebratory particle burst appears.

Make the sequence short and satisfying.

Do not interrupt gameplay for unnecessarily long animations.

## 5. IMPROVE GAMEPLAY ENJOYMENT

The game should be interesting to play, not merely attractive.

Inspect the current gameplay loop:

**Move → Eat → Grow → Molt → Survive**

Identify where progression feels slow, repetitive, or unclear.

Improve:

- Food distribution.
- Growth feedback.
- Predator readability.
- Movement responsiveness.
- Molting rewards.
- Progress clarity.

Do not introduce excessive complexity.

### Gameplay pacing

Ensure players can experience meaningful progress early in a run.

Avoid long periods where nothing interesting happens.

### Risk and reward

Introduce small, meaningful decisions using existing mechanics.

Examples:

- Pursue a valuable food cluster near a predator.
- Choose a safer path with fewer nutrients.
- Time molting around environmental danger.

Do not add unrelated survival meters.

## 6. FOOD AND REWARDS

Make food attractive and easy to identify.

Use:

- Bright nutrient particles.
- Small organic food clusters.
- Gentle glow.
- Clear collection animations.

If existing food types have different values, preserve those values.

Make valuable food visually distinguishable from ordinary food.

## 7. PREDATOR REDESIGN

Simplify predator appearances too.

Use:

- Clear rounded or angular silhouettes.
- Distinct colours.
- Readable eyes.
- Smooth movement.
- Subtle warning cues.

Predators should look interesting without becoming visually confusing.

Avoid unnecessary frightening imagery.

Preserve existing enemy AI unless balancing improvements are needed.

## 8. ENVIRONMENT

Preserve successful environmental improvements from FIX #05, if present.

The world should remain:

- Colourful.
- Organic.
- Calm but active.
- Readable.
- Visually cohesive.

Use restrained environmental details such as:

- Floating spores.
- Soft plants.
- Gentle lighting.
- Organic terrain patterns.
- Subtle background movement.

Do not let decoration obscure food, the player, or predators.

## 9. CONTROLS

Preserve existing control bindings where possible.

Improve movement responsiveness.

### Desktop

- Smooth keyboard control.
- Accurate directional movement.
- Responsive special actions.
- Reliable pause and restart.

### Mobile

- Responsive touch movement.
- Clear control zones.
- No accidental page scrolling.
- Readable HUD.

### Movement feel

The creature should feel light and responsive while maintaining its organic swimming or crawling personality.

Do not change collision geometry merely for animation purposes.

## 10. VISUAL FEEDBACK

Add small satisfying effects for:

- Eating.
- Growth.
- Molting.
- Escaping danger.
- Reaching milestones.
- Completing a run.

Use colourful particles, gentle glows, and brief animations.

Avoid excessive fullscreen effects that hide threats.

Respect reduced-motion preferences.

## 11. USER INTERFACE

Keep the interface clean.

Display:

- Growth progress.
- Current molt stage.
- Health or survival status, if existing.
- Pause.
- Restart.
- Simple objective guidance.

### Main menu

Title:

**MOLT**

Subtitle:

"Eat. Grow. Transform."

Show the redesigned colourful creature prominently.

### Results screen

Show existing available progress metrics.

Provide an immediate Retry button.

## 12. AUDIO

Preserve existing audio.

Where useful, add subtle procedural sounds for:

- Eating.
- Growth.
- Molting.
- Predator warnings.
- Milestone celebrations.

Never autoplay audio before user interaction.

Provide a sound toggle.

## 13. PERFORMANCE

Target smooth gameplay on desktop and mid-range Android devices.

Use:

- Efficient Canvas rendering.
- Lightweight procedural character shapes.
- Bounded particles.
- Reusable gradients.
- DevicePixelRatio caps.
- Delta-time animation.
- Viewport culling.

Avoid expensive blur filters and excessive effects.

## 14. COMPATIBILITY WITH FIX #05

FIX #13 supersedes FIX #05's creature direction.

### Preserve from FIX #05

- Improved environmental visuals.
- Smooth animation systems.
- Performance improvements.
- Existing gameplay fixes.
- Useful interface enhancements.

### Replace or simplify

- Overly detailed creature anatomy.
- Complicated body decorations.
- Excessive visual effects.
- Any creature design that reduces clarity.

If FIX #05 has not been implemented, apply only the improvements relevant to the current game.

Do not assume that FIX #05 already exists.

## 15. AUTOMATED TESTING

Create or update tests covering:

1. Player movement.
2. Food collection.
3. Growth progression.
4. Molting.
5. Predator targeting.
6. Collision consistency.
7. Restart.
8. Pause.
9. Growth-stage visuals.
10. Particle-effect cleanup.
11. Desktop input.
12. Mobile input.

### Gameplay validation

Verify:

- The player can reliably collect food.
- Growth progression is achievable.
- Molting occurs correctly.
- Predators are avoidable.
- Existing gameplay objectives remain reachable.
- New animations do not alter collisions.
- No visual effects block important gameplay.

Do not claim tests passed unless executed.

## 16. BROWSER TESTING

Where browser automation is available, test:

- Game loading.
- Main menu.
- Movement.
- Eating.
- Growth.
- Molting.
- Predator encounters.
- Game over.
- Restart.
- Mobile layout.
- Touch controls.

Inspect screenshots and console logs.

Fix observed defects.

If browser testing is unavailable, state the limitation.

## 17. FORGE ARCADE INTEGRATION

Preserve:

- Main arcade homepage.
- Other games.
- Game cards.
- Navigation.
- Category filters.
- Deployment configuration.

Only modify MOLT and directly necessary supporting assets.

Use relative file paths.

Do not automatically publish.

## 18. ACCEPTANCE CRITERIA

The upgrade is complete when:

- Creatures are simpler and more colourful.
- The player creature has a recognizable silhouette.
- Growth stages remain distinctive.
- Eating feels satisfying.
- Molting is visually rewarding.
- Predator appearances are readable.
- Environments remain attractive.
- Controls are responsive.
- Gameplay feels more engaging.
- Original mechanics remain intact.
- Desktop and mobile work.
- Automated tests pass.
- No critical regressions remain.

## 19. FINAL DELIVERABLES

Provide:

1. Analysis of existing MOLT.
2. Updated creature designs.
3. Gameplay improvements.
4. Updated source files.
5. Before-and-after screenshots, if available.
6. Automated test results.
7. Browser testing results.
8. Performance findings.
9. Known limitations.
10. Deployment readiness assessment.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep work on a separate development branch until approved.

## FINAL DIRECTION

Make MOLT colourful, simple, charming, and fun.

The player should enjoy watching the creatures, collecting food, and discovering new growth stages.

Preserve the original spirit of the game.

**Less complexity. More life. More fun.**