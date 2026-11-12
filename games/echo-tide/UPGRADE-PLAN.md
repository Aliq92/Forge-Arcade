# Deepwater Surge implementation plan

**Goal:** Add a controllable propulsion burst and readable navigation challenges to the existing sonar voyage.
**Architecture:** Preserve the classic dependency-free IIFE, World / Simulation / Input / Renderer / AudioSystem / UI / Game boundaries, native page and original beacon/sanctuary loop. Extend current systems rather than replacing them. Keep all runtime changes inside this game.
**Spec:** BRIEF.md. Implement locally on a separate branch. No merge, push, deployment or shared-card changes.

## Design

- Space remains sonar. Shift or B activates burst; touch gets a separate44px-or-larger BURST button beside SONAR. The original joystick supports simultaneous fingers.
- Initial burst tuning:0.6s,2.2× the84-unit/s normal target,4s cooldown from activation. Accelerate toward the captured facing direction, retain lateral steering, and recover through velocity interpolation rather than a reset. No fuel currency. Add12 disturbance versus sonar18; quiet recovery uses the latest noisy action.
- Preserve the6000×4800 map, three beacons, sanctuary, three-hull loss, forgiving rock deflection, safe harbor/beacons and three shadow patrols. Add two short optional narrow channels with outer bypasses, maintain four current regions, add two echo-shadow regions and two warned siltfall areas. Siltfalls temporarily slow navigation but never create a sealed solid trap.
- Currents always show nearby directional cues before meaningful influence. Echo shadows shorten distant echo persistence/range but retain close-range collision readability, chart memory and clear labels. Existing patrols gain bounded pursuit after a full warning; they remain slower than normal vessel speed and retreat to patrol when quiet/safe. No new enemies.
- Introduce challenge geography outside the harbor. Siltfalls begin only after a beacon is collected; all remain optional/bypassable. Small optional accomplishments (quiet beacons/current crossings/evasions) never gate completion.
- Retain dark cyan ocean, sonar and beacon shapes. Add bounded directional wake, pressure ring, engine glow and reduced-motion-safe feedback. Reuse the180-particle cap, cull effects and cap DPR at1.5. Add a static background cache and spatial terrain collision index if measurements support it.
- Keep original menu/pause/chart/end/retry/audio functions. Use the requested subtitle and document every binding. Show burst readiness/countdown plus a compact local hazard label. Native keyboard/touch activation and focus handling must work.
- No persistent run save exists; preserve that behavior. Reset all burst/hazard/challenge state. Keep sound opt-in and existing ambient bed; disconnect finished tones and silence paused scenes promptly.

## Tasks

- [x] Preserve original fixtures, read all runtime files, baseline existing tests and screenshots.
- [x] Red/green tests for burst activation/duration/cooldown/recovery, disturbance, collision, challenge state, seeded reachability and complete no-burst route.
- [x] Extend World/Simulation with bounded physics stepping, burst, current cues, echo shadows, siltfall warnings and existing-threat pursuit.
- [x] Extend input, HUD, touch layout, menu guidance, effects, reduced motion and audio cues.
- [x] Execute full movement-to-beacon/sanctuary routes with and without burst, existing browser regression and new desktop/multitouch layouts; compare screenshots and measure performance.
- [x] Independent read-only review; fix findings, document evidence and limitations; commit only authorized files locally. Do not deploy.

## Review focus

Space binding conflict; terrain tunnelling at boosted speed; held-key repeat/cooldown; pause/hidden time; multitouch joystick plus two abilities; hazard warnings before effects; no traps; original objective completion; rendering must not mutate physics.

## Ledger

- Inspected five original game files. World uses deterministic seed4139,160-ish circular terrain collisions with polygon art, four invisible-at-first currents, three fixed elliptical shadow patrols, five ruins,3 beacons and sanctuary. No burst or echo-shadow/siltfall mechanics exists. Movement is omnidirectional target-velocity interpolation with facing tracking velocity. Space already emits sonar.
- Baseline root tests:180 pass. Existing game browser suite is being run against the untouched original; original sources preserved under tests/fixtures/original/.
- Ruling: no conflicting Space reassignment. Shift/B is the dedicated burst input. Siltfall makes a route temporarily slow/dangerous rather than sealing it; this satisfies the brief without risking generated traps.
- Completed:430 combined tests pass,100-seed connectivity and42/42 actual-movement voyages across21 seeds. No-burst205.69–206.82s versus burst171.53–174.58s under an omniscient scripted route; not a human balance claim. New five-layout browser suite and original gameplay browser regression pass. Browser voyage173s,36 bursts,3 hull, all3 beacons.
- Review: no collision/cooldown/pursuit/touch blockers; the minor missing-chart-direction feedback was fixed with drawn current arrows/echo boundaries and checked through canvas instrumentation and screenshot review. Screenshot review also corrected chart layering/contrast on phones.
- Performance: final local180-particle stress measurements averaged0.69ms desktop /0.70ms phone viewport, p95 1.0ms, DPR1,120 actual RAF samples. CPU submission only; no physical Android FPS claim. Detailed comparisons and hardware limitations are in VERIFICATION.md and PERFORMANCE-RESULTS.json.
- Collision-test ruling: a single tiny circle can legitimately be skirted by deflection, so the no-tunnelling regression uses a thin continuous row of3-unit colliders and verifies separation every step.
