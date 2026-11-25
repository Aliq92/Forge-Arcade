# Fix #29 — The Living Ocean

The original Survey curtain opened for four seconds in every eight. Its rectangular collision stopped the probe while closed, but players could swim around it. Habitat discovery was a proximity trigger that recorded the location and awarded 15 points. The Fix #17 baseline passed 15 model/integration checks and a Chrome route through all four regions. Baseline screenshots are in `test-results/impossible-reef-fix29/before-*.png`.

The existing Canvas renderer, probe controls, four regions, 32 treasure IDs and values, wildlife and Garden remain the foundation. New vegetation and habitat scenery belong to Survey. The Garden continues to show player-planted vegetation.

- **Sunlit Garden:** Stay near the Bloom Gate to enter the coral chamber, then recover both coral fragments. The restored garden unlocks a clownfish. Follow the bubble vent route for Bubble Journey.
- **Kelp Forest:** Find the striped pearl, then return to the Pearl Gate. Clear debris and recover an egg to restore the Kelp Passage and unlock a seahorse. Follow the Pearl Trail in order.
- **Crystal Depths:** Swim with the current through both markers, then enter the Current Gate. Activate a vent and recover the crystal coral. A jellyfish joins the probe after restoration. Current Rider offers a separate optional route.
- **Twilight Sanctuary:** Swim to the three glowing organisms in order to open the Resonance Gate. Escort the hatchling to the habitat center and recover the egg to restore the observatory and unlock a sea turtle.

Rock chambers enclose the rare pearls. Coral retracts when the passage becomes traversable, and open gates stay open after leaving, restarting or reloading. Restoring each habitat adds 20 points once, with colour, plants, fish and bubbles returning as tasks are completed. Companions follow without collision against the player. Restoration tasks and creatures are stylized for gameplay.

Survey now stores version 2 separately. Version 1 discoveries, treasure scores, wildlife, badges, seed and visual quality migrate. Previously discovered chambers remain accessible. Legacy Survey data is retained and the separate Garden save keeps its existing format.

Changed runtime files: `ocean.js` for gates, restoration, routes, companions and save migration, `ocean-renderer.js` for Survey scenery and animation, and `index.html`, `script.js` and `styles.css` for guidance and the mobile Journal. Test updates cover engine, browser and Arcade entry compatibility.

- **19 automated model/entry checks passed.** Covers collisions, gate activation and passage, 32 treasures, optional routes, partial restoration reload, one-time rewards and version 1 migration.
- **Local Chrome gameplay passed.** Pointer and keyboard input, all four gates/restorations/companions, 32 treasures, progress reload, Garden tending and hybrids, Journal, pause/restart and four viewport sizes. Main routes use real pointer destinations followed by accelerated normal simulation steps.
- **Local mobile Chrome checks passed.** Emulated touch planting and swimming, swipe scrolling in Journal, portrait and narrow landscape, resizing, reduced motion, paused clock, image export, unavailable storage and legacy migration. All 14 plantable species remain available, with no automatic vegetation in an empty Garden.
- **Rendering samples.** In 360-frame headless Chrome samples, average Survey draw time was 3.25 ms at 1440×900 and 2.17 ms at 390×844. On the 390×844 profile with 4× CPU throttling and low quality it was 12.53 ms. Low quality reduced decorative Survey plants from 27 to 14 and drawn ambient animals from 58 to 29. These are short desktop-host measurements, including mobile emulation. They do not establish physical phone performance or long-term memory behaviour.

Screenshots and reports are in `test-results/impossible-reef-fix29/`, including `restored-0.png` through `restored-3.png` from the gameplay run. Physical mobile devices and non-Chrome browsers were not tested. The update is on a local development branch pending publication approval.
