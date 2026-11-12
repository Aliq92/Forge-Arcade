# CODEX — FIX #14: TINY EXCAVATOR
## The Treasure Beneath Update

You are a senior indie game developer, 2D graphics engineer, technical artist, and gameplay designer working inside the existing Forge Arcade repository.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target game:** `games/tiny-excavator/`

Your mission is to significantly improve Tiny Excavator's appearance, excavator mechanics, underground graphics, mineral variety, and reward feedback.

This is an improvement to the existing game, NOT a complete rebuild.

**Core vision: A charming miniature excavator discovering valuable treasures beneath the earth.**

---

## 1. INSPECT THE EXISTING GAME

Before modifying anything:

- Inspect the repository and locate Tiny Excavator.
- Confirm its actual folder and rendering architecture.
- Understand its current digging mechanics.
- Review movement, excavator controls, terrain generation, collisions, progression, and objectives.
- Identify the existing mineral system.
- Check desktop and mobile controls.
- Run available tests.

Preserve working functionality.

Do not modify unrelated Forge Arcade games.

If the existing folder differs from the suggested target, use the actual folder.

## 2. EXCAVATOR VISUAL REDESIGN

Make the excavator more detailed, recognizable, and enjoyable to operate.

### Machine appearance

Include:

- Compact excavator body.
- Clearly visible cabin.
- Animated tracks or wheels, matching the existing vehicle design.
- Articulated boom.
- Hydraulic arm.
- Recognizable digging bucket.
- Cabin windows.
- Small working lights.
- Subtle mechanical details.

### Art direction

Use a clean, colourful miniature-machine aesthetic.

Avoid photorealistic graphics that conflict with the existing game's visual style.

The excavator should look like a polished toy-sized construction machine.

### Colour

Suggested palette:

- Construction yellow.
- Warm orange accents.
- Dark graphite tracks.
- Metallic grey hydraulics.
- Soft blue cabin glass.

Use subtle gradients and highlights to create depth.

## 3. BETTER EXCAVATOR ANIMATION

Improve machine movement and digging feedback.

### Hydraulic arm

Where supported by the existing mechanics, animate:

- Boom lifting.
- Arm extension.
- Bucket rotation.
- Digging.
- Returning to the resting position.

Use connected joints with consistent pivot points.

### Tracks

Animate track motion while the excavator moves.

### Digging

Add:

- Small soil particles.
- Falling dirt.
- Subtle bucket shake.
- Ground disturbance.
- Gentle machine recoil.

Keep movement responsive.

Do not make the digging animation delay player actions unnecessarily.

### Collision accuracy

Visual upgrades must match the machine's actual collision boundaries.

Avoid introducing decorative components that create confusing collisions.

## 4. UNDERGROUND WORLD REDESIGN

Make the terrain more visually appealing.

### Soil layers

Create recognizable geological layers using:

- Rich brown topsoil.
- Warm clay.
- Dark earth.
- Rocky strata.
- Mineral-rich deposits.
- Deep stone formations.

### Visual variation

Introduce:

- Small embedded stones.
- Soil texture variation.
- Rock cracks.
- Layer transitions.
- Occasional glowing mineral clusters.
- Subtle underground shadows.

Avoid repetitive tile patterns.

Use seeded variation where procedural generation already exists.

### Important

Preserve existing digging rules.

Decorative terrain must not change collision or excavation difficulty unless intentionally included in the game's mechanics.

## 5. ADD VALUABLE MINERAL ORES

Expand the existing mineral system with rare, exciting discoveries.

First inspect existing minerals to prevent duplicates.

Use the following as suggested additions.

| Mineral | Rarity | Suggested Value |
|---|---|---|
| Copper | Common | 10 |
| Iron | Common | 15 |
| Silver | Uncommon | 35 |
| Gold | Rare | 80 |
| Platinum | Rare | 120 |
| Emerald | Epic | 180 |
| Ruby | Epic | 220 |
| Diamond | Legendary | 400 |

Treat these values as **fictional in-game credits**, not real-world market prices.

Balance values against the game's existing economy.

### Geological representation

Represent copper, iron, silver, gold, and platinum as ore deposits.

Represent emeralds, rubies, and diamonds as gemstones embedded in suitable rock formations.

Avoid presenting all gems as metallic ores.

## 6. MINERAL RARITY SYSTEM

Implement a clear rarity system:

- Common
- Uncommon
- Rare
- Epic
- Legendary

### Distribution

Common minerals should be readily available.

Rare discoveries should feel rewarding but achievable.

Legendary discoveries should be uncommon without requiring excessive grinding.

### Depth progression

Where compatible with existing mechanics, gradually introduce more valuable deposits at deeper levels.

Do not make rare minerals exclusively dependent on extreme depth.

### Fairness

Use controlled procedural generation.

Do not create long stretches where the player receives no meaningful rewards.

## 7. BEAUTIFUL MINERAL VISUALS

Every mineral should have a distinctive appearance.

### Gold

Warm yellow metallic deposits with gentle highlights.

### Platinum

Cool silver-white formations with a subtle blue tint.

### Emerald

Bright green crystalline formations.

### Ruby

Rich red faceted crystals.

### Diamond

Pale cyan-white gemstones with crisp angular highlights.

### Visual clarity

Make minerals identifiable through both colour and shape.

Use distinct silhouettes for accessibility.

Do not depend exclusively on colour.

## 8. SATISFYING MINERAL DISCOVERY

Improve feedback when collecting valuable minerals.

### Common minerals

Small collection particles and a subtle sound.

### Rare minerals

Brighter effects and a short reward notification.

### Epic minerals

Distinctive glow, particles, and a more noticeable discovery message.

### Legendary minerals

A satisfying but brief celebration featuring:

- Golden sparkles.
- Soft screen highlight.
- Clear mineral name.
- Credit reward.
- A short celebratory sound.

Avoid excessive flashing or long gameplay interruptions.

## 9. IMPROVE THE MINING LOOP

Inspect the current gameplay loop.

Enhance it without unnecessarily replacing existing mechanics.

The experience should feel like:

**Dig → Discover → Collect → Earn → Improve → Explore Deeper**

### Gameplay improvements

- Make mining actions responsive.
- Improve collection feedback.
- Provide clear progress indicators.
- Reward deeper exploration.
- Introduce meaningful decisions between ordinary and valuable deposits.

If the game already has upgrades, improve their presentation and balancing.

Do not create a large new upgrade system without justification.

## 10. OPTIONAL EXCAVATOR UPGRADES

If compatible with the existing game, implement or refine a small upgrade system.

Suggested upgrades:

**BUCKET CAPACITY**
- Collect more material per digging cycle.

**HYDRAULIC SPEED**
- Improve digging responsiveness.

**TRACK PERFORMANCE**
- Improve movement where terrain conditions permit.

**MINERAL SCANNER**
- Reveal nearby valuable deposits within a limited radius.

**WORK LIGHTS**
- Improve visibility in darker underground areas.

### Balance

Upgrades should feel useful without eliminating gameplay challenges.

Preserve existing progression and currency systems.

Do not introduce microtransactions or real-money purchases.

## 11. MINERAL COLLECTION TRACKING

Improve the existing collection interface.

Display:

- Total credits.
- Minerals collected.
- Current depth.
- Excavator capacity, if relevant.
- Active upgrades, if supported.

### Discovery journal

If appropriate, introduce a compact mineral collection journal.

Show:

- Discovered minerals.
- Rarity.
- Best finds.
- Total collected.

Keep the interface simple and lightweight.

## 12. VISUAL EFFECTS

Improve:

- Digging particles.
- Falling dirt.
- Rock breaking.
- Mineral collection.
- Excavator lights.
- Underground ambience.
- Depth transitions.

Use subtle camera feedback for larger discoveries.

Respect reduced-motion preferences.

Avoid overwhelming the player with particles.

## 13. MAIN MENU AND HUD

Improve the game's visual presentation.

### Main menu

Title:

**TINY EXCAVATOR**

Subtitle:

"Dig deeper. Discover more."

Feature the redesigned excavator prominently.

Preserve existing menu functions.

### In-game HUD

Keep essential information readable.

Include existing gameplay indicators and any new mineral collection information.

Avoid covering the excavator or active digging area.

## 14. AUDIO POLISH

Preserve working audio.

Where appropriate, improve:

- Excavator engine.
- Hydraulic movement.
- Digging.
- Soil collection.
- Rock breaking.
- Mineral discovery.
- Upgrade purchases.

Use subtle procedural audio where practical.

Never autoplay audio before user interaction.

Provide a mute toggle.

## 15. DESKTOP AND MOBILE

Preserve existing controls.

### Desktop

- Responsive movement.
- Accurate digging controls.
- Clear keyboard instructions.
- Reliable pause and restart.

### Mobile

- Large touch controls.
- Easy digging interaction.
- Responsive HUD.
- Portrait and landscape support where feasible.
- No unintended page scrolling during gameplay.

The excavator must remain easy to control on smaller screens.

## 16. PERFORMANCE OPTIMIZATION

Target smooth gameplay on desktop and mid-range Android devices.

Use:

- Reusable drawing primitives.
- Cached terrain textures.
- Efficient particle pooling.
- Bounded effects.
- Viewport culling.
- DevicePixelRatio caps.
- Delta-time animation.
- Efficient mineral lookup.

Avoid recreating expensive gradients or geometry unnecessarily every frame.

Keep gameplay smooth during large excavation sequences.

## 17. PRESERVE EXISTING MECHANICS

Do not unintentionally change:

- Existing terrain generation.
- Excavator movement.
- Digging mechanics.
- Collision detection.
- Existing mineral values.
- Existing objectives.
- Win/loss conditions.
- Difficulty settings.
- Save data.
- Restart behavior.

When extending the mineral economy, migrate existing saved data safely if needed.

Document any intentional gameplay changes.

## 18. AUTOMATED TESTING

Create or update tests covering:

1. Game startup.
2. Excavator movement.
3. Hydraulic arm animation.
4. Digging.
5. Terrain removal.
6. Collision detection.
7. Mineral spawning.
8. Mineral rarity.
9. Collection rewards.
10. Credit calculations.
11. Depth-based distribution.
12. Upgrade purchases, if supported.
13. Save-data compatibility.
14. Pause.
15. Restart.
16. Particle cleanup.
17. Desktop controls.
18. Mobile controls.

### Procedural validation

Run seeded tests to verify:

- Valuable minerals can actually spawn.
- Rare minerals are meaningfully less common than ordinary deposits.
- Mineral deposits do not appear in invalid terrain.
- Collection rewards match configured values.
- Procedural generation remains reproducible.

## 19. BROWSER TESTING

Where browser automation is available, test:

- Main menu.
- Excavator visuals.
- Movement.
- Digging.
- Mineral collection.
- Rare discoveries.
- Credit rewards.
- Progression.
- Upgrades.
- Pause and restart.
- Mobile touch controls.
- Portrait and landscape layouts.
- Browser resizing.

Inspect console errors.

Fix observed defects.

Do not claim tests passed without executing them.

## 20. VISUAL VALIDATION

Capture before-and-after screenshots where possible.

Compare:

- Excavator appearance.
- Hydraulic animation.
- Soil textures.
- Underground depth.
- Mineral visual clarity.
- Collection effects.
- HUD readability.
- Overall visual cohesion.

Ensure the improved game still feels like Tiny Excavator.

## 21. FORGE ARCADE INTEGRATION

Preserve:

- Forge Arcade homepage.
- Other games.
- Existing game cards.
- Navigation.
- Category filters.
- Deployment configuration.

Modify only Tiny Excavator and directly necessary supporting files.

Use relative asset paths.

Prepare an updated game-card illustration featuring the redesigned excavator and colourful underground minerals.

Do not modify the shared arcade card system without approval.

## 22. ACCEPTANCE CRITERIA

The upgrade is complete when:

- The excavator has a noticeably improved appearance.
- Hydraulic movement looks convincing.
- Digging feedback feels satisfying.
- Underground terrain is visually richer.
- Valuable minerals and gemstones are implemented.
- Minerals have distinct visual identities.
- Rare discoveries produce rewarding feedback.
- Progression remains enjoyable.
- Existing mechanics remain intact.
- Desktop and mobile controls work.
- Automated tests pass.
- No critical gameplay regressions remain.

## 23. FINAL DELIVERABLES

Provide:

1. Existing game analysis.
2. Updated excavator design.
3. Improved animation system.
4. Updated terrain graphics.
5. Expanded mineral system.
6. Mineral rarity and reward balancing.
7. Updated source files.
8. Before-and-after screenshots, if possible.
9. Automated test results.
10. Browser testing results.
11. Performance findings.
12. Known limitations.
13. Deployment readiness assessment.

**DO NOT DEPLOY AUTOMATICALLY.**

Keep changes on a separate development branch until explicitly authorized.

## FINAL DIRECTION

Make Tiny Excavator visually appealing and satisfying to play.

The excavator should look charming and mechanically convincing.

Digging should feel responsive.

Discovering rare minerals should be exciting.

The underground world should invite exploration.

**Inspect first. Improve carefully. Test thoroughly.**