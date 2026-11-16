# Fix 23 inspection and implementation record

## Before edits (16 November 2026)
- Inspected index.html, lab.css, lab.js, materials.js, particles.js, experiment.js and renderer.js, existing tests and fixture, app.js gallery registration and navigation conventions.
- Existing game combines a 200×120 material grid with a separate bounded light-particle pool and six free-particle/field tools. Old experiment slot is forge.particle-lab.experiment.v1.
- Baseline: node --test games/particle-lab/tests/*.test.cjs passed 22/22. Headless installed Chrome loaded the actual page, title Particle Lab · Particle Renaissance, displaying Select / Particles / Attractor / Repulsor / Vortex / Rebirth well.
- Reuse: Particle Lab identity, dark laboratory palette, direct page route, Arcade return link, pointer capture and responsive canvas approach. Replace physics, renderer, controls, storage and obsolete tests because they encode the removed gameplay.
- Gallery remains registered in app.js; no root gallery edit is required. Its existing generic forces/motion blurb is outside this scoped change.

## Architecture
- Fixed 96×64 cellular grid, registry-defined materials, per-cell temperatures, deterministic 30 Hz simulation with bounded catch-up. Grid dimensions are independent of display size. Phase changes preserve one occupied cell; combustion explicitly consumes fuel into temporary fire/smoke.
- Shared legal editing/action API for challenge UI and reproducible solution tests. Locked fixtures, limited palettes and budgets prevent painting an objective's output directly. Completion is measured after actual simulation.
- Sandbox snapshot is separate from challenge session and progress. New versioned keys preserve legacy slots unchanged. Import validates before replacement; failed storage never closes the current experiment.
- Editing undo is sandbox-only: challenge retries restore fixture, action budget and objective history atomically.

## Coordination
- Engine implementation: physics agent, materials.js and physics tests only.
- Challenge design: levels agent, challenges.js and challenge replay tests only.
- Controller: UI, renderer, storage, browser QA and integration.
- No publication, push, merge or deployment is authorized.
