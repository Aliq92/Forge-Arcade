# Particle Renaissance implementation plan

Goal: Extend the existing falling-material sandbox with a luminous free-particle workspace and Rainbow Rebirth Wells, preserving all eight existing brushes and chemistry rules. Follow the user-supplied Fix #06 brief. Local build only; no presets, homepage/card changes, new dependencies or publication.

Design decision: The inspected game has a 200x120 cellular material simulation, not continuous particles or existing gravity wells. Retain it as the Materials layer, with exactly its original sand/liquid/fire/smoke/acid/wood rules. New light particles coexist above it; attractor/repulsor/vortex/rebirth fields affect light particles only. Stone and wood also provide obstacles for light particles; there are no particle-particle collisions. Explain both layers in the UI. This avoids silently replacing or retuning the existing chemistry.

Files: index.html for the dashboard, lab.css for responsive UI, materials.js for extracted unchanged cellular rules, particles.js for deterministic fixed-step continuous dynamics and persistence, lab.js for input/rendering/lifecycle/save integration. Native Canvas/DOM, classic scripts, no dependencies.

Visual: dark navy laboratory with fine grid, cyan/violet/amber/pink/turquoise particles, cached halo sprites, short motion trails, restrained field diagrams. Compact header, horizontal accessible tool strip, collapsed Creative controls drawer. The empty canvas remains an open sandbox; explicit Add particles and placement gestures are the starting actions. No automatic scene presets.

Physics: 120Hz fixed particle steps; original material logic at 60Hz. Bounded dt catchup, capped acceleration/speed and softened centers. 1500 pooled light particles, eight fields, 64 queued particles per well. A queue-full well leaves particles active. Every absorption retains the same particle/mass; delay then release at that same well, outside its 9px core with outward velocity and 0.8s global immunity. Deleting a queued well safely returns its particles. Clear empties both layers/fields; Reset restores empty startup defaults. Pausing freezes queues, effects and both layers. Hidden tabs stop RAF and safely pause.

Saving: one versioned localStorage experiment with material cells/lifetimes, active and queued light particles, field positions/parameters, speed and visual settings. Validate everything before applying; invalid/unavailable storage produces one status message without destroying the current scene. No particle histories. Resize/load scale continuous positions to the current canvas while material grid stays fixed.

- [x] Baseline tests and desktop/mobile screenshots; original fixture and every existing source inspected.
- [x] RED then GREEN: spawn/pool bounds, movement, all force signs/directions/center stability, queue delay/hue/mass/conservation/repeated cycles, overflow/multiple/deleted wells, save validation and speed/pause/reset/frame-rate invariance.
- [x] Extract material engine and verify seeded original parity including brushes, liquids, fire/acid/wood and smoke.
- [x] Build renderer and dashboard: material brushes, spawn/select/drag/delete fields, contextual sliders, particle count/speed, save/load, clear/reset, effects/mute, shortcuts, input cleanup, resize/visibility.
- [x] Desktop/mobile portrait/landscape browser QA through real pointer/touch/sliders, screenshots, error capture and bounded performance measurements.
- [x] Independent review, full regressions/build, report exact outcomes and known limits. No merge/deploy.

Review focus: deleting a full well; lowering count while particles are queued; malformed save atomicity; overlapping wells; hidden-tab time jumps; touch pointer cancellation; resize during dragging; UI controls stealing simulation gestures; legacy material compatibility and no duplicate RAF.
