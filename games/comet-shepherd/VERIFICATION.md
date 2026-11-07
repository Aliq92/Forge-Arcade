# Comet Shepherd verification — 7 November 2026

## Scope

Inspected all existing game modules, HTML, CSS and hosting configuration before editing. Changes stay under games/comet-shepherd/; its dedicated tests are also inside that directory. The pre-existing unrelated gallery test modification and unpublished Hollow Signal work remain untouched. Arcade cards, home page, other games and deployment settings are unchanged. No commit, push or deployment was performed for this upgrade.

## Executed results

- Full repository plus new game suite: **198 tests passed, 0 failed** (`node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs`).
- Static production build passed (`node build.mjs`); whitespace/diff checks passed.
- Prediction versus identical actual dynamic flight: **0 world-unit maximum error** at every returned sample for short, medium and long horizons (118, 181 and 253 samples).
- Prediction versus the complete gameplay update, including held up steering, diagonal steering, braking and a pending affordable correction: **0 maximum sampled position error**. Different control assumptions are tested separately.
- Independent numerical check: maximum position difference **0.018485654688044143 world units** over six seconds across three near-planet scenarios versus an eight-times-finer 1/960 s reference; tolerance **0.1 world units**. This measures numerical accuracy rather than just reuse of the same function.
- Sixty-second softened orbit energy drift passed a relative tolerance of 0.00001. Motion, energy, heat, time and collections agree at 30, 60 and 144 rendered frames per second within 0.0000001 world units; held diagonal controls also agree.
- Reachability: a policy choosing nudges/braking every 0.25 seconds completed **25/25** combinations of five seeds and sectors **1, 2, 4, 7 and 10**. Completion took **14.77–21.11 simulated seconds**, with 8 gems and 100 ice in every run. The first sector intentionally also supports a coast-through teaching route. These are simulated strategies, not human playtest timings.
- Gem type values total exactly 90 for one of each type; swept pickup cannot collect a gem twice. Deterministic positions, unique IDs and full moving-hazard-envelope clearance passed. Optional chicken awards +150 once per encounter, does not add gems, and is unnecessary for completion.
- Restart restores sector entry health/energy, positions, pickups, score and prior upgrades; it clears discarded encounter history, warnings, burst feedback and inputs. Pause freezes actual simulation. Gate exploration and the ten-sector milestone/endless transition remain covered.
- Browser playtest passed at **1440×900, 768×1024, 390×844, 320×740 and 844×390**. Keyboard nudges/brake, mouse drag/preview, real emulated touch hold/release and drag, mobile Burst, no page scrolling, pause/resume, sector retry, eight-gem completion, next-sector upgrade, chicken bonus, and arcade return all passed. Menus, reduced-motion setting, seeded challenge entry and best-run screen also passed. No page/console errors or horizontal overflow were recorded. Screenshots were visually reviewed; mobile objective/preview and control overlap were corrected.

## Fixes found while testing and reviewing

The old forecast froze planets and used a larger Euler step. Live orbital movement, input cooldowns and resources also depended on rendering frequency. Both flight paths now use one fixed model. Corrections now spend only available energy and their preview shows that exact impulse. Cancelled/unrelated pointers no longer fire thrust. A mobile synthetic click could be suppressed after a canvas drag; flight actions now fire on touch contact and deduplicate the later click. A fresh review found encounter history surviving sector retry; the new regression passes after clearing it. Collision forecasts now honor the same invulnerability window as actual collision handling.

## Evidence and practical limits

Raw local evidence: `test-results/comet-full-suite.log`, `test-results/comet-balance.log`, `test-results/comet-shepherd/browser-report.json` and screenshots in the same folder. Tests use real simulation/controller code; accelerated objective progression runs it faster than wall time. The chicken collision test deliberately puts the chicken at the comet to exercise bonus delivery; it does not prove a human can routinely catch a naturally roaming chicken.

Touch uses browser emulation. Physical phones, sustained mid-range-device performance, subjective control feel and speaker output have not been measured. Prediction is conditional on held controls remaining unchanged, stops at the first collision, and does not predict a post-impact bounce. Particle storage remains capped at 1,600; trajectory steps are bounded. Long wall-clock gaps are clamped and background visibility pauses gameplay, so time intentionally does not catch up after a tab switch. Sector retries preserve earlier sectors in the current run; there is no new cross-session save system.

Assessment: local verification passed and publication to Forge Arcade was subsequently authorized. Public checks run against the deployed release, including entry from its existing arcade card and return to the gallery; the local report is test-results/comet-shepherd/public-browser-report.json.
