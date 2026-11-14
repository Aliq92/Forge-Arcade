# Impossible Reef Living Ocean implementation plan

**Goal:** Expand the existing coral garden with optional surveying/discoveries and a much richer living environment, preserving its original six species, growth/nurture/crossbreeding, Zen/autogrow, image export and v1 saves. No deployment.

**Architecture:** Keep the existing classic script and species renderers. Add a pure deterministic ocean module for optional Survey mode (small research probe), seeded regional flora/life/treasures, currents, vents, gate collisions, discovery/challenge rewards and validated journal persistence. Add a cached renderer for eight decorative organism silhouettes, regional water/depth/light, schooling fish/jellies/crabs, and survey cues. Hook these into the original loop without changing garden interaction rules.

**Spec:** FIX17-BRIEF.md. Branch codex/impossible-reef-fix17 from published main9612853. Only games/impossible-reef changes; no shared cards/registry/config changes.

## Inspection / rulings

The actual game is a single-screen generative garden, not an adventure platformer. It has no existing player, terrain collisions, enemies, levels, loss condition or win gate. Its objective is planting/tending and discovering hybrid/rare coral forms. Current state has six drawable species and five ambient creature types, background rays/snow, randomly drifting current angle and localStorage impossible_reef_save_v1. No FIX12-specific gameplay implementation/test is evidenced beyond the existing build; nurture animation is present.

Ruling: Preserve Garden mode as default; introduce optional Survey probe with tap-destination and WASD/arrows, only that probe responds to bounded currents/vents/gates. Four named regions are unlocked environmental themes of the same garden, not imposed progression levels. Exploration never damages/removes coral or blocks breeding. Corals/sea fans/anemones are labeled reef animals; stylized glow explicitly fictional. Original organisms stay in pixel coordinates, with normalized saved viewport conversion on resize/load to avoid losing existing gardens.

Ruling: Treasures are seeded reachable positions in a bounded1000×650 survey plane with no enclosing impassable geometry. Each region has8 treasures, including1 rare pearl, and1 optional hidden habitat. Gates are harmless timed curtains in optional passages, have open4s/closed4s timing and can be bypassed; no enemies/health/grinding. Currents and vent speeds stay below probe thrust, all cues match vectors, clean collection is optional. Existing clearing clears planted reef only; survey restart preserves discoveries; explicit journal reset is separate.

- [x] Capture seeded original before screenshots and baseline integration test.
- [x] Write failing pure tests for seed/distribution/reachability, motion/current/vent/gate counterplay, collection/rewards/secrets/challenges, pause/restart, safe persistence and flora/life caps; implement model.
- [x] Implement cached eight-type decoration and bounded seeded reactive marine life; verify distinct silhouettes, world limits and reduced-motion/low-quality behavior.
- [x] Hook original garden/persistence/input/audio; add compact Survey/Garden, region, journal/help/settings/pause controls and native Arcade return. Preserve all existing controls and no audio before interaction.
- [x] Run original/new tests, full garden/breeding/save compatibility and all four Survey-region playthroughs with real controls; mobile portrait/landscape, pause/restart/reduced motion/quality, screenshots and measured dense scene performance.
- [x] Fresh whole-branch review, fix findings, report results/limitations and commit only this game's files locally. Do not merge/push/deploy.

Review focus: old-save malformed data, mobileHUD blocking tap targets, hidden collectibles behind UI, pause freezing all clocks, garden clicks never being hijacked by Survey controls, repeated collect/reload reward duplication, audio opt-in even when old save sound=true, resize preserving object positions, bounded rendering caches/particles and no decoration collisions.
