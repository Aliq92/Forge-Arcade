# FIX #21 — APOGEE: Beyond the Limit

Development branch: `fix-21-apogee-beyond-the-limit`. No deployment or remote push performed.

## Existing game inspection

The actual game is `games/apogee/`, a static HTML/CSS build with nine original classic JavaScript scripts. Its artwork, rocket, particles, clouds, stars, and anomaly orbs are drawn procedurally on Canvas 2D; no external game assets or engine are required.

APOGEE is a staged rocket timing and altitude game. Tap, Space, or Enter separates a burning stage. Remaining fuel determines EARLY, GOOD, GREAT, or PERFECT timing; late separations give stronger thrust, credits, and chains. Waiting until fuel expires destroys the rocket. Once the final stage coasts above 600 KM, A/D, arrows, or holding/dragging touch controls lateral steering. Existing orbs cut momentum by 22%, knock the rocket sideways, and have a collision cooldown. Apogee ends the flight.

The original garage has engine, fuel, and stack upgrades; altitude milestones; ranks/XP; three daily contracts; liveries and exhaust cosmetics. `apogee_save` holds career data. The original game has no authored levels or selectable trials; its career hazards are random. The pre-change APOGEE integration test passed. The original build had no pause menu or in-flight retry; both are now available.

## Twelve new trials

All base objectives are mandatory together. Every trial forbids burnout. A trial ends immediately when its goals are met; players need not wait through an irrelevant coast. Every row earns its own named, equippable insignia. Optional missions add a permanent gold distinction to that insignia and do not gate tiers.

| Tier | Trial / category | Base objective and limits | Optional mission |
| --- | --- | --- | --- |
| Discovery | Teal Ignition / Precision | Make one PERFECT separation | No EARLY separations |
| Discovery | Quiet Corridor / Survival | Coast for 10 seconds through alternating gates; at most 2 impacts | No impacts |
| Discovery | Sideband Survey / Exploration | Recover 2 survey signals on opposite sides; at most 2 impacts | No impacts |
| Discovery | Clean Handoff / Mastery | Make 2 GREAT or PERFECT handoffs; no EARLY separations | Make both PERFECT |
| Adaptation | Teal Relay / Precision | Make 3 PERFECT separations; no EARLY separations | Build a chain of 3 |
| Adaptation | Pulse Watch / Survival | Coast 16 seconds and pass 2 gates; at most 1 impact | No impacts |
| Adaptation | Split Spectrum / Exploration | Recover 3 alternating signals and pass a moving gate; at most 1 impact | No impacts |
| Adaptation | Thin Margin / Mastery | Make 2 PERFECT separations and reach 160 KM; no EARLY separations | Build a chain of 2 |
| Mastery | Unbroken Signal / Precision | Build a chain of 4 PERFECTs; no EARLY separations | Make 4 PERFECTs at 7% fuel or less; numeric fuel readout provided |
| Mastery | Storm Passage / Survival | Coast 22 seconds and pass 3 moving gates with no impacts | Also recover 4 survey signals |
| Mastery | Far Side Atlas / Exploration | Recover 4 alternating signals and coast 18 seconds; at most 1 impact | No impacts |
| Mastery | Beyond the Limit / Mastery | Launch, make 4 PERFECTs, reach a chain of 3, then recover 2 signals and coast 12 seconds in deep space; no EARLY separations, at most 1 impact | No impacts |

Discovery is available immediately. Clear any three Discovery trials to open Adaptation; clear any three Adaptation trials to open Mastery. Players can skip one difficult trial in each tier. The selection screen shows tier, category, objectives, locked/completed state, best successful time, insignia, and optional mission status. Selecting a trial focuses its launch briefing, including all limits and the optional mission.

## Scenarios, obstacles, and fairness

Launch trials use the same fixed loaner: engine level 8, fuel level 3, stack level 5 (seven physical stages, six possible handoffs). Coast trials deploy the final capsule at 600 KM with velocity 6500 world units/second. These are explicit training scenarios using the existing physics and steering, and do not require career purchases. Loaner levels never replace saved upgrade levels. Trial flights neither earn career currency nor advance daily contracts, milestones, XP, or career altitude.

Anomaly gates begin every five seconds after a two-second opening interval. Each gate warns in amber for two seconds, then becomes active in red for two seconds. The outlined gap remains open throughout. Pulse patterns alternate gap sides; sweep patterns move the gap continuously at a bounded speed. Collision includes the rocket's existing 16-pixel safety radius and calls the existing impact response. A gate inflicts at most one impact and only counts as passed if crossed without an impact. There are at most five scheduled gates, not an unbounded hazard list.

Survey rings appear at deep-space seconds 2, 6, 10, and 14, alternating sides. Each remains available for 3.5 seconds, with a one-second preview. Collection uses the real lateral position. Players can collect before a gate activates or wait for it to expire; all combined routes have been completed by the reference pilot. Trials replace random career orbs with these predictable patterns. Career flight continues to use its existing orb system.

Trial steering speed scales on wide screens to keep normalized lane travel feasible; career steering is unchanged. Gates and signals remain generous on mobile. Early trials permit mistakes, later trials combine goals and tighter impact budgets. No base objective changes the existing PERFECT window. The tighter 7% timing condition is optional.

## Rewards, persistence, controls, and feedback

Each clear grants a uniquely colored rocket insignia, selectable in the trials hangar. An optional mission adds a gold ring to the equipped insignia and a star to its entry. Successful time is minimized across retries, while clears and optional stars are permanent. Completion has brief confetti and the existing success audio, with immediate Retry, Next Challenge, and Selection actions. There is no new currency.

The flight tracker shows the name, objective counters, impacts, and limits. Rings mark signal availability, collected signals produce particles and a cue, and gate warnings sound once each. Failure states explain EARLY separation, burnout, impact limits, missed objectives at apogee, or the 100-second attempt window.

Pause/Resume: P or Escape, or the 44-pixel HUD button. Retry: R or the retry button. Pause also occurs on blur or tab hiding and freezes simulation, objectives, and gate timing. The pause menu offers restart, challenge selection, and garage. Space/Enter and pointer controls remain available, with button/select focus protected from gameplay input. Starting or resuming releases menu focus so subsequent Space inputs work. Touch menus scroll internally; the page stays fixed. Mobile portrait and landscape use the same controls. Reduced-motion CSS disables interface animations.

A full restart resets stages, fuel, velocity, steering, effects, elapsed time, gate hits/warnings, signal collection, impact counters, and zone text. A run identifier prevents an old explosion timeout from ending a restarted attempt.

Trial progress uses its own versioned key, `apogee_trials_v1`, with bounded, validated records for the twelve known IDs. Missing, malformed, incompatible, or invalid data falls back safely. Storage failure is reported in the selection screen. Career saves remain under `apogee_save`; restarting a career retains separately earned trial insignia. No unrelated game storage is touched.

Audio still requires interaction. QA found and fixed the original engine mute path, which previously checked the muted flag before silencing an existing oscillator. Stopping an engine now always silences its gain without creating a new AudioContext.

## Source and integration

- `js/10-trials-core.js`: definitions, objectives, optional conditions, progression, rewards, persistence validation, deterministic gate/signal schedules; also importable by Node tests.
- `js/11-trials.js`: selection, briefings, runtime tracking, insignia, feedback, pause/retry, and result navigation.
- `index.html`, `styles.css`: integrated screens, tracker, responsive controls, accessibility, and cache revisions.
- Existing scripts `01`, `03`, `04`, `05`, `06`, `08`, and `09`: narrow hooks into existing controls, physics, collisions, render, and lifecycle.
- `tests/trials.test.cjs`, `tests/browser.cjs`: rule tests and real-browser validation.
- Root `tests/apogee-integration.test.mjs`: updated expected script count from nine to eleven.

No homepage, game card, category filter, shared styling, deployment configuration, or unrelated game source changed. All game script and stylesheet links remain relative. There is one APOGEE build.

## Executed validation

Commands from the repository root:

```sh
node games/apogee/tests/trials.test.cjs
node --test tests/*.test.mjs
python3 -m http.server 8765 --bind 127.0.0.1
node games/apogee/tests/browser.cjs
```

The browser script requires Playwright and Chromium; both were available in the task environment. `APOGEE_BASE_URL` can override the local URL. The original screenshot is optionally regenerated when an original APOGEE checkout is available under `/tmp/games/apogee`; its absence does not block the suite.

- 17 trial rule tests pass: all configurations and objectives, completion/failure conditions, rewards/best times, optional distinction, tier access, gate timing/motion/gap bounds, and save validation.
- All 32 root regression test files pass, including APOGEE and the arcade integration checks.
- The original in-game `selfTest()` passes.
- Chromium: all twelve full reference playthroughs complete, including all optional missions, at 1280×800 / 60 Hz, 390×844 / 30 Hz simulation, and 2560×1440 / 60 Hz. This is 36 verified physics paths. The reference pilot waits for normal fuel thresholds, calls normal separation, and steers through existing acceleration/velocity updates; it does not inject progress or altitude during a run.
- Browser checks cover startup, selection/briefing, locked tiers, objective updates, EARLY and burnout failures, hazard impacts, completion/rewards, retries, stale explosion timers, save/reload, malformed storage, career-save isolation, pause/resume, desktop keyboard input, held touch steering, touch separation, portrait/landscape, actual requestAnimationFrame gameplay, and engine mute. No observed JavaScript page errors or captured console errors.
- `git diff --check` passes.

`qa/playthroughs.json` records each path's completion time, objectives, impacts, optional result, and peak particle count. Reference times are approximately 3.4–10 seconds in Discovery, 7.5–16 seconds in Adaptation, and 13.7–31.2 seconds in Mastery. These are successful reference routes, not estimates of first-time player completion rates. The non-monotonic times are intentional: complexity grows through combined objectives rather than longer waiting. Tested paths complete without impacts. Particle counts remain below 250 on these paths, within the existing bounded particle system. New gate/signal updates use constant-sized schedules; DPR remains capped at 2.

## Visual evidence and limitations

Screenshots in `qa/`:

- `baseline-career-desktop.png` and `career-flight-desktop.png`: original and expanded career gameplay.
- `garage-desktop.png`: preserved garage with trial entry.
- `trials-desktop.png`, `trials-mobile.png`: selection layout.
- `anomaly-gate-desktop.png`, `flight-mobile.png`, `flight-landscape.png`: obstacle presentation and responsive telemetry.
- `completion-desktop.png`, `rewards-desktop.png`: completion, saved results, and reward status.

Screenshots were inspected; new panels follow APOGEE's existing dark/teal/amber palette. The landscape layout moves altitude aside and removes secondary career statistics to keep the steering lane visible.

No physical Android/iOS hardware, Safari/Firefox run, human casual-player study, or hardware frame-rate benchmark was available. Thirty-Hz simulation proves a completion path at that timestep; it is not a measured Android rendering rate. Audio activation/mute and cue code were exercised; subjective speaker/headphone mix quality was not assessed. Existing lower-level tests for unrelated games were not exhaustively run beyond the root regression suite.

The static build is ready for code review and staging validation. Before a public release, perform physical Android/iOS and casual-player balancing passes. No known critical defect remains in the exercised paths. Deployment has not been performed and remains subject to explicit authorization.
