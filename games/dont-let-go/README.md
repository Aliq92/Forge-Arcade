# DON'T LET GO — FIX #22: The Heroic Multiverse

Implemented on `codex/fix-22-heroic-multiverse`. No deployment or remote push.
Only this game's directory changes. The Forge Arcade homepage, card, shared
styles, navigation and deployment configuration are untouched.

## Existing game analysis

The original `index.html` was a self-contained Three.js r128 flight game,
loading its library from a CDN. Hold Space, mouse or touch to fly; release ends
the signal. Pointer movement or WASD/arrows steer a smoothed camera inside
x ±6.4 / y ±4.6. The ship banks with steering. Six timed sectors gradually
increase speed from 16 to 60, with milestones at 0/18/42/70/104/146 seconds.

Two recycled gates score within radius 6 and award perfects within radius 1.6.
Missing a gate resets combo; it does not kill the player. Three pooled energy
cubes use a swept ship collision with radius 1.5. Cubes are collectibles, not
hazards. There were no finite levels, challenge menu, pause or audio. The
existing record is `dlg_best_time`. No game-specific tests existed; the 32
root regression test entries passed before modification.

Those movement constants, speed progression, scoring radii, cube collision
formula and hold/release mechanic remain. Original free flight stays the
default mode. Its record uses the same save key; challenge runs do not replace
that record. Challenge medals use the separate `dlg_hero_medals_v1` key.
Restart returns to hold-to-start; focus loss now safely pauses.

## Visual direction and source files

**Aegis City** is an original suspended metropolis: enormous blue towers,
illuminated facades, roof antennas, floating reactor assemblies, holographic
signs and elevated light lanes. Three instanced building layers move at
0.12/0.35/0.75 of flight displacement. The cached sky has atmospheric cloud
banks, warm horizon light and four palettes: Heroic Dawn, Neon Metropolis,
Stormfront and Cosmic Breach. Geometric portals have nested rotating rings,
a translucent energy halo and orbiting marks. Aircraft, storms and portal
rotation are decorative and never enter collision queries.

- `index.html`: preserved original flight simulation, mission adapter, UI,
  pause/restart, guarded storage, audio and adaptive detail.
- `challenges.js`: twelve authored routes, integrated sector-distance formula,
  event timing, completion rules, save validation and idempotent rewards.
- `environment.js`: independent procedural city, cached sky/facade textures,
  parallax, reactors, signs, portals, aircraft and distant lightning.
- `vendor/three.min.js`: the same Three.js r128, now served locally. MIT license
  in `vendor/THREE-LICENSE.txt`; downloaded from cdnjs. SHA-256:
  `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2`.
- `tests/`: deterministic rules tests and reproducible browser QA scripts.
- `qa/`: screenshots, test output and performance evidence.

All art and synthesized audio are authored procedurally. No franchise assets,
characters, logos, recognizable vehicles, or unlicensed audio are included.

## Twelve playable challenges

Every mission starts at time 0, position (0,0,0), with no collected objects and
combo 1. Its first target arrives at 5 seconds. Hold throughout, collect the
listed gate/cube targets, and survive until the duration expires. Targets are
placed using the integral of the original speed curve. All missions remain
selectable; optional badges never gate progress.

| Tier | Challenge | Duration | Success: gates / cubes | Problem to solve |
|---|---|---:|---:|---|
| Hero Training | First Light | 18s | 3 / 0 | Hold and follow broad introductory gates |
| Hero Training | Skyline Weave | 23s | 4 / 0 | Alternate left/right alignment |
| Hero Training | Reactor Spark | 23s | 2 / 2 | Align the actual ship with cubes between gates |
| Hero Training | Cloud Ladder | 23s | 4 / 0 | Climb and descend |
| City Under Siege | Evacuation Lane | 26s | 3 / 1 | Return to the left safe lane for an energy front |
| City Under Siege | Reactor Relay | 28s | 2 / 3 | Alternate cube precision and gate timing |
| City Under Siege | Storm Crossing | 31s | 3 / 1 | Switch between two safe lanes |
| City Under Siege | Highline Rescue | 33s | 3 / 2 | Control altitude and return to centre for a front |
| Multiverse Crisis | Breach Run | 36s | 2 / 2 | Alternate three front lanes and cube alignment |
| Multiverse Crisis | Prism Ascent | 33s | 4 / 2 | Fly a rising/descending helix with upper cubes |
| Multiverse Crisis | Last Skybridge | 41s | 3 / 2 | Combine altitude, three fronts and precision |
| Multiverse Crisis | The World Holds | 46s | 4 / 2 | Complete the final breach relay |

Completing a mission awards one persistent medal and its tier crest. Threading
two perfect gates also earns an optional Precision badge. Replays can improve
the badge, but never duplicate medals. Completion has a short bounded energy
burst, clear message and optional audio cue; there is no currency.

## Environmental events and controls

Challenge-only energy fronts are red interference walls with a four-unit open
lane outlined in cyan. The HUD names LEFT / CENTRE / RIGHT four seconds before
arrival and counts down. Steering into that lane is the counterplay; altitude
never blocks passage. Hazard checks occur at the wall plane and use the same
safe-lane rule every time. Release, a front collision, or reaching the route
end without all targets fails a mission. Free flight has no new hazards.

Distant aircraft, reactor installations, portals and soft storm lightning
remain background events. There is no teleportation or gravity modification.

- Flight: hold Space, mouse or touch; steer with pointer movement or WASD/arrows.
- Pause: P / Escape or the Pause button; holding the flight area or Space resumes.
- Restart: R or Restart; hold again to launch.
- Sound: off at startup; opt in using Sound. Includes a quiet reactor ambience,
  cube cue, front warning and completion tone. The button also mutes audio.
- Motion: follows OS reduced-motion preference; the button can force reduction.
  Reduced mode freezes portal/aircraft motion, removes lightning, bursts,
  streaks and haze, suppresses camera banking and disables CSS transitions.
  Essential forward flight and steering continue.
- Detail: automatic slow-frame fallback, with manual low/high selection.
- Multi-touch tracks the flight finger; a secondary button touch cannot release
  it accidentally. Gameplay prevents scrolling; the mission picker scrolls.

## Verification

Run a local server from the repository root:

```sh
python3 -m http.server 4173
node games/dont-let-go/tests/challenges.test.cjs
node games/dont-let-go/tests/playtest.cjs
node games/dont-let-go/tests/live-browser.cjs
node --test tests/*.test.mjs
node build.mjs
```

Browser scripts require Playwright and Chromium (`CHROMIUM_PATH` can override
`/usr/bin/chromium`; `DLG_URL` can override the local URL). They inject test
access only into their served responses. No test hooks, auto-steering or
completion shortcuts ship in the production HTML.

Results:

- **16/16 rules tests pass.** Every course validates starting targets, reachable
  coordinates, keyboard-rate feasibility, objectives, warning lead time,
  success/failure and one-time rewards. Also tests speed integration, corrupt
  saves, hazard boundaries and warning phases. See `qa/unit-results.txt`.
- **27/27 deterministic browser checks pass.** Every mission is completed and
  replayed using pointermove input through the real input handlers and actual
  collision/scoring code, with no camera or score assignment. Covers original
  hold/release, gate scoring, swept cube collision, arrows/WASD, warning and
  hazard failure, incomplete targets, rewards/reload, legacy saves, blocked
  storage, pause/resume/restart, focus loss, pointer cancellation, secondary
  touch, reduced motion, decorative isolation, portrait, landscape, resizing
  and mission-menu scrolling. No page exceptions. See `qa/browser-results.json`.
- **Live browser smoke passes** with continuous rendering, real mouse events,
  CDP touch start/move/end, opt-in audio/mute, responsive layouts and repeated
  mission selection. No page exceptions. See `qa/performance.json`.
- **32/32 existing root regression entries pass**, before and after the change.
  See `qa/root-regressions.txt`.
- **Static production build succeeds** and includes all relative game scripts
  and the local vendor library. `git diff --check` passes.

The browser completion harness advances simulation at deterministic 60 Hz and
suppresses intermediate rendering; screenshots render real scenes. The live
browser script separately tests continuous rendering and real device events.
These are complementary checks, not evidence of human difficulty balance.

## Visual evidence

| Before | After |
|---|---|
| [Original menu](qa/before-desktop.png) | [Aegis City menu](qa/after-desktop.png) |
| [Original flight](qa/before-flight.png) | [City flight](qa/after-flight.png) |

Additional captures: [challenge picker](qa/after-challenges.png),
[energy-front warning](qa/storm-warning.png),
[final mission completion](qa/complete-12.png),
[portrait menu](qa/mobile-portrait.png),
[real touch flight](qa/live-mobile-flight.png),
[landscape](qa/live-mobile-landscape.png),
[mobile mission picker](qa/mobile-challenges.png), and
[reduced motion](qa/reduced-motion.png).

Review confirmed that gates retain a bright cyan/amber outline, the flight
corridor stays unobstructed by architecture, the portals sit above/to the side
of the action, and essential HUD elements fit in portrait and landscape.

## Performance and readiness

Sky and facades are cached canvas textures; tower layers and roof antennas use
instancing and shared geometry. City counts are fixed, aircraft are bounded,
particles have at most four concurrent bursts (24 shards on small screens,
48 on desktop), and bursts dispose their GPU resources. Course geometry is
disposed on replacement. DPR is capped at 1.6 mobile / 2 desktop, falling to 1
in low detail. Sustained slow frames reduce detail automatically; reduced
motion removes optional effects. There is no per-frame full-screen filter,
bloom, dynamic shadow map, external asset request or unbounded particle list.

Final low-detail samples: 55 draw calls / 9,304 triangles on desktop and 53
draw calls / 8,272 triangles in portrait, at DPR 1. The software renderer
measured median frames of 150 ms desktop and 50 ms portrait (p95 299.9 /
99.9 ms). These are slow and are not a 60 FPS result. Full measurements are
recorded in `qa/performance.json`.
Repeated course selections show stable geometry and texture counts. The
software renderer used here has slow frame times and does **not** establish
smooth desktop or mid-range Android performance. A hardware GPU / physical
Android pass is still required before approving production performance.

Ready for code review and deployment preparation; **not deployed**. Functional
and build checks pass with no critical regressions observed. Remaining release
validation: physical Android and iOS/Safari input/audio/performance, broader
GPU coverage and human difficulty tuning. Graphics context loss pauses with a
reload instruction. Saves are local to the browser. All three tiers are open;
medal progression and optional precision, rather than access locks, provide
progression without altering the original endless mode.
