# Impossible Reef · Fix17: The Living Ocean Expansion

Impossible Reef remains a peaceful generative coral garden. Its original six species, planting, nurturing, removal, natural growth, nearby mature-species crossbreeding, hybrid/rare forms, auto-grow, Zen mode, ambient sound and PNG export are retained. The repository version inspected contained these systems and no swimmer, enemies, collision terrain, levels or win/loss condition. No separate FIX12 implementation was assumed.

## New optional exploration

The planting palette now also offers eight additional choices: Seaweed, Kelp, Seagrass, Red Algae, Sea Fan, Soft Coral, Sea Anemone and fictional Glow Sprout. Together with the six originals, there are14 plantable species. Each can grow, be selected/nurtured/removed, participate in crossbreeding and persist in the existing garden save. The palette scrolls on smaller screens, with the selected species named in the status line. Sea fans, soft corals and anemones remain classified as reef animals.

Choose **Survey** to pilot a small golden research probe. Use WASD/arrows or tap a destination; **Garden** returns to the original planting controls. All four regions are immediately available environmental themes of the same garden: Sunlit Garden, Kelp Forest, Crystal Depths and Twilight Sanctuary. Each offers different treasure routes and a hidden habitat; changing regions does not clear planted coral.

There are32 persistent treasures: four pearls per region, including one ring-marked rare pearl, plus an ancient shell, crystal, relic fragment and starfish token. Contact within22 world units collects a treasure exactly once. Base discovery points are5/8/10/12/8 for pearl/shell/crystal/relic/starfish, with15 extra for a rare pearl. Discovering a hidden habitat awards15 points. The journal records collection, habitats, wildlife observations, regional completion, optional challenges and5/12/24-treasure milestone badges. Points/badges never gate the original species or breeding and do not require spending/grinding.

Visible chevrons mark a bounded horizontal current (27 units/s); probe thrust is150 units/s and can counter it. Bubble vents lift at36 units/s for two seconds per six-second cycle. A harmless coral curtain opens for four seconds, then closes for four; its visible countdown provides warning. Wait, swim above/below it, or take another path. Brushing the curtain affects only the optional clean-discovery challenge. No enemies, health loss or new forced difficulty were added. Pause freezes growth, probe, wildlife, current/gate clocks, ambient events and mood cycling. Restart Survey resets the probe while preserving discoveries and the garden.

## Living reef and rendering

Automatic background vegetation has been removed at the user's request. Only organisms planted in the garden are drawn; all14 planting choices remain available. Kelp has broad leaves and branching stems, fans delicate cached branching, anemones rounded bases and tentacles. Coral, sea fans and anemones are reef animals; glowing flora is fictional. Water, lighting, marine life and optional Survey features remain available.

Fifty-eight seeded background animals include seven six-fish schools, five jellyfish, six crabs and five rays. Schools have gentle cohesion and flee the nearby Survey probe. Their movement is bounded/wrapped; they create no new enemies. Regional depth gradients, layered reef terraces, light rays, moving caustic strokes, plankton, currents and reactive swaying add atmosphere. Original planted coral renders above decorative flora and has a small warm marker at its base in Garden mode. Selected coral keeps its original inspection and nurture feedback.

Vegetation graphics are cached by type/tint, at most24 sprites, cleared when a region changes. Low quality halves drawn decorations and animals while retaining all eight silhouette types. Reduced motion removes new vegetation sway, ray movement and discovery bursts; it retains clear mechanical timing and probe control. Canvas DPR is capped at1.5. Ocean effects cap120, event queue24, original garden bursts120, original ambient creatures32 and snow70. Bounds/culling skip offscreen flora/life.

## Saves, controls and accessibility

Original gardens still use `impossible_reef_save_v1`. Valid old records load with the same six species, seed, growth, hybrid/rare properties and preferences. Invalid records are skipped safely; garden size remains70. New saves add viewport dimensions so resizing/loading on another viewport preserves normalized positions. The separate `impossible_reef_ocean_v1` key stores optional discoveries and quality. Points are recomputed from recognized discovery IDs; repeated collection/reload cannot duplicate rewards. Blocked/corrupt storage does not stop play. A saved sound preference never starts audio until a user gesture.

Use the top controls for Survey/Garden, region selection, journal, pause and help/quality. Original lower controls retain their mouse/touch bindings. Survey takes keyboard focus automatically; P pauses/resumes when the playfield has focus. Native menu controls remain keyboard accessible, discoveries are announced with a status region, touch buttons are compact and the landscape toolbar uses two rows on narrow screens. The help menu includes a relative return to Forge Arcade. Screenshot export still saves the visible canvas as impossible-reef.png.

## Preview and verification

From the repository root run `node games/impossible-reef/tests/preview.cjs`, then open http://127.0.0.1:8444/games/impossible-reef/. No framework, runtime package, CDN, backend or additional downloaded asset is needed. The three original game files remain; ocean.js is the pure model and ocean-renderer.js is its independent cached renderer.

Run `node --test tests/impossible-reef-integration.test.mjs games/impossible-reef/tests/*.test.mjs`. Browser checks are tests/browser.cjs and tests/advanced-browser.cjs; dense-scene measurements are tests/performance.cjs. Browser scripts use the locally bundled Playwright and installed Chrome paths; adjust those paths on another machine. See FIX17-QA.md for actual execution results, before/after evidence and limitations.

**Integration authorized on14 November2026:** this update uses the existing Impossible Reef registration and card. Homepage, shared styles, all cards, other games and deployment settings are preserved. The final version offers14 planting choices and does not draw automatic background vegetation. Versioned local script/style references refresh cached clients. The original no-deployment brief is retained as history; publication now follows the user's explicit integration request.
