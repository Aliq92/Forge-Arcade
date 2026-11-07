# Comet Shepherd upgrade plan

## Inspection and decisions

Existing game: native ES modules and Canvas, procedural seeded solar systems, moving planets/moons, asteroid belts and solar flares, ice/heat/energy, drag impulses, horizontal keyboard nudges, emergency burst, camera follow, trajectory assistance, resource magnetism, gravity-assist/Flow rewards, seeded challenges, gates, upgrades, ten-system milestone, settings/best-run storage. The helmeted chicken roams, turns and respawns; its collision currently gives confetti but no score.

Physics currently mixes fixed comet steps with frame-based planet movement, cooldowns and collection. Prediction uses a different step size and static planets. Correction preview and actual minimum impulse disagree, correction energy can be overspent, touch cancellation fires an impulse, and reset/pause retain pending input/time.

Use the existing sector/gate/upgrade flow. Eight gems complete a sector and present the existing upgrade choice immediately; the gate remains an alternate exit after eight gems if the player elects to explore. Earlier gate contact explains the objective. Keep all other systems. A sector retry restores its entry snapshot (prior sectors and upgrades retained). Gem values: cyan 10, amber 30, violet 50; chicken optional +150 with a longer respawn interval. Keep legacy resource and skill scoring separate.

Generate a deterministic safe outward teaching route beyond the outermost planet/belt. Place primary gems on the simulated coast path from the actual spawn. The first sector teaches the forecast by allowing coasting; later sectors increase tangential entry speed and offset amber gems by up to 34 world units, requiring corrections. Validate clearance against the complete moving-hazard envelope. Optional violet gems sit 95 world units alongside the lane. A next-gem marker and minimap provide direction. Existing inner-system exploration remains available. No dependency is added.

## Execution

- [x] Write/run failing tests for softened gravity, shared velocity-Verlet flight with dynamic bodies, prediction sample agreement, frame-rate consistency and swept collision.
- [x] Implement the shared fixed-step flight model and bounded prediction; move all gameplay state to the 120 Hz loop. Preserve rendering/camera outside it.
- [x] Write/run failing tests for deterministic safe routes, unique swept pickups and 10/30/50 scoring; implement gems and sector state/checkpoint lifecycle.
- [x] Add gem rendering, objective/reward UI and optional chicken scoring; preserve gates/upgrades/milestone and existing scoring.
- [x] Add four-direction nudges and braking, mobile hold controls, exact correction preview and safe pointer cancellation/state resets. Test controls, pause/restart/progression.
- [x] Run simulation reachability policies, trajectory error measurements, existing regressions, desktop/mobile browser playtests and screenshots. Fix observed issues and document results/limits.

## Constraints and verification focus

Only this game and dedicated tests/support files change. Preserve unrelated dirty work. No deployment. Use the same step/model for prediction and motion; input assumptions are coast/current held controls plus any affordable pending drag impulse. Never silently vary physics precision by graphics quality. Test long frames, background pause, stale pointers, low energy, high-speed crossing, sector retries, and at least five seeded routes across early/later sectors. Physical-phone performance and human difficulty remain explicit limitations.

Ruling: The detailed supplied brief authorizes implementation choices; proceed locally without another approval gate. Completion gives a fast choice of next sector or continued exploration, preserving gate travel while making gem collection sufficient for progression.

Review: a fresh reviewer identified stale gravity-assist history on sector retry. A failing regression reproduced it; retry now clears encounter history, burst feedback, warnings and queued input. Full gameplay-versus-prediction tests cover held steering, braking and pending corrections. Final executed evidence is recorded in VERIFICATION.md.
