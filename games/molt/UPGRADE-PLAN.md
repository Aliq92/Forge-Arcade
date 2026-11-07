# Molt Fix #05 — Living World

The supplied brief authorizes a local visual update, not publication. Keep the classic Canvas document and original simulation. Existing rules: 96px/s player, 68px/s NPC base, 16 NPCs, radius=9+sqrt(mass)*1.55, algae +6, edible NPC +r*2.15, hunger/starvation, size ratios, six mutations, eleven thresholds (40…2500), 1.7-second frozen molt, second wind, inherited trait and viewport arena. No camera/world scrolling, extra stages, food rules or meters.

Design: a warm-amber/teal soft-bodied 'lantern nymph', attentive eyes, antennae, fins, patterned shell. Twelve visual forms correspond exactly to the starting state and eleven existing molt thresholds, independent of mutation count. Edible organisms retain mint, neutral lavender and predators coral; pack hunters gain striped/segmented silhouettes. Algae keep their +6 rule but gain a distinct luminous seed shape. Molt visuals split an old shell, ease the new silhouette and leave a fading husk; preserve the original 1.7-second simulation pause rather than retune balance.

Architecture: add a presentation-only classic-script module with seeded decorative geometry, cached background, bounded pools and visual timers. The existing inline simulation delegates rendering/effect events. One RAF controls menu/play/molt/dead/pause; all decorative time uses elapsed dt. Pause resets held inputs and freezes simulation/effects; visibility loss pauses safely. Add restart-generation without erasing lineage, and retain the existing next-generation action. Existing collision circle, configurations, spawn and steering calculations stay unchanged.

- [x] Read all original source; preserve fixture; capture baseline desktop/mobile screenshots and run baseline tests.
- [x] RED→GREEN VM tests for original movement, eating, decay, thresholds, traits, AI/packs, collisions, second wind and lineage. Compare deterministic original/new simulation traces.
- [x] Presentation pool/cleanup tests, stage mappings, visual RNG isolation; build creature and NPC art, layered habitat, nutrient effects and shell separation.
- [x] Refine menu/HUD/result display, add safe pause/restart/motion settings and one RAF, retain touch/keyboard responsiveness. Correct 'Peak mass' label to actual end mass (no peak metric exists).
- [x] Browser QA desktop/tablet/portrait/landscape: movement/touch, controlled eating/molt/traits, threats/death/retry, pause/visibility, mute, reduced motion and bounded effects. Inspect before/after and measure desktop draw/frame costs.
- [x] Fresh independent review, full regressions/build, updated-creature card source (unwired), exact verification/limitations report. Do not modify arcade/cards/other games or deploy.

Review focus: no visual deformation used in collision; no new game-RNG consumption; original molt freeze and AI semantics; paused input cleanup; one RAF after repeated retries; small-screen HUD overlap; viewport resizing and large-mass forms; animation cleanup after reset and death. Original camera is fixed and centered on the visible arena; introducing follow/zoom would change playfield framing, so keep it fixed.

