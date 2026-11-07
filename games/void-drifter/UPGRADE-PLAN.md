# Void Drifter recovery upgrade

Inspection: classic scripts, one RAF loop, streamed seeded chunks, drift/turn/thrust/reverse/boost, fuel, rechargeable energy, hull, regenerating upgrade shields, pickup magnet, salvage cargo, station repair/refuel/upgrades, distance rewards, four modes, events/signals, saved best distance/settings/achievements. Hull destruction is the only formal loss; fuel starvation causes practical immobility through heavy drag. There is no win screen or run save.

Decisions: reuse energy rather than add a meter. Keep normal flight controls; zero-fuel thrust becomes weak, energy-limited emergency thrust with a 55-unit propulsion ceiling while preserving existing momentum. Solar recharge and a modest onboard energy-to-fuel reserve ensure recovery without relying on random drops. Fuel canisters, stations and mystery cargo remain additional choices. Fuel-tank upgrades gain efficiency; boost upgrades gain energy capacity; hull upgrades improve repair yield without changing existing upgrade keys or saved data.

Add a seeded survival director for bounded periodic mystery cargo, safe emergency canisters and one optional mission at a time. Validate both supply positions and approach corridors against current hazards. Rewards: full fuel, fuel/energy supply, timed collision shield, salvage, repair. Use a shuffled reward bag with uncommon full refuels and useful fallbacks. Reuse pickups, station rewards, beacons, sound and the 500-particle pool. Add restrained confetti, text and edge glow; respect reduced motion. Preserve inner systems, all modes, navigation, cards and deployment settings.

Execution:
- [x] Capture baseline operational-starvation and full-world survival scenarios; run existing tests.
- [x] Write failing tests, then implement weak emergency thrust, reserve synthesis, forgiving energy recharge and compatible upgrades.
- [x] Write failing tests, then implement seeded mystery cargo, exactly-once rewards, safe reachable spawns and missions.
- [x] Integrate with the existing game and renderer using fixed 1/60 s simulation updates and existing controls/UI, with pause/restart reset coverage.
- [x] Exercise before/after repeatable scenarios, full regression suite, desktop/mobile browser inputs, rewards, missions and screenshots; fix observed issues.
- [x] Complete a fresh code review and document executed evidence/limitations. Keep changes local; no publication.

Verification focus: zero fuel and zero energy, ion-cloud starvation, high inherited speed, held boost exploits, capped cargo/full-health rewards, supply danger overlap, repeated pickups, restart determinism, paused timers, legacy storage, all existing upgrade keys and modes. Separate actual hull survival from the baseline fuel-immobility endpoint; never describe an idle safe ship as formally dead.

Final review: the reviewer found reduced-motion reward text could persist without CSS animation. A failing regression reproduced it; text now expires explicitly. Added RED-to-GREEN regressions for touch ownership after pause and throttled retry searches in blocked corridors. Twenty Void Drifter tests pass; the complete repository suite passes 218 tests. Final measured results and browser evidence are in VERIFICATION.md.
