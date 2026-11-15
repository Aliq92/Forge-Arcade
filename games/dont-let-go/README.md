# DON'T LET GO — FIX #23: The Quiet Highlands

Development branch: `codex/fix-23-living-world`. No deployment or remote push.
Only this game's directory changes. [FIX22.md](FIX22.md) preserves the prior
implementation report; its environment and old performance findings are historical.

## Inspection and art direction

The inspected baseline is `f0a3a9d`. This is a Three.js forward-flight game,
not a platformer: hold Space/mouse/touch to sustain flight, steer the camera
inside x ±6.4 / y ±4.6, thread gates and collect cubes. The recognizable ship
is attached to the smoothed camera. Release ends flight. Six existing timed
sectors increase speed; twelve FIX #22 challenges add targets, energy-front
hazards, medals and optional precision rewards. These features were present
and are retained, including all challenge IDs and both save keys.

The prior scenery was a suspended city with facade towers, transit lanes,
reactors, billboards, rotating portals and flashing lightning. Its decorative
objects were collision-independent, but the busy technology and space effects
competed with the gate/cube silhouettes. There are no external artwork assets:
Three.js is vendored, and the scenery is procedural.

**Natural highlands** gives the fast, continuous flight a calm, legible setting.
A broad valley points toward the next gate. Faceted ridges, pines, a river,
small waterfalls and distant birds establish scale without introducing false
platforms or obstacles. The muted teal/stone palette leaves cyan gates, amber
collectibles and red challenge hazards visually dominant. Terrain inside the
central corridor is more than 30 units below flight; the river is 55 units below.

## Implementation

- `environment.js`: replaces the city with three periodic terrain layers,
  reusable terrain geometry, baked directional facet lighting, instanced pines,
  four falls, a river ribbon, distant birds and a cached atmospheric sky.
- Depth comes from progressively muted ridge colours and camera-displacement
  parallax factors of 0.12 / 0.30 / 0.60. Two tiles per layer share geometry;
  matching end heights prevent cracks at recycling boundaries.
- Geometry, normals and lighting colours are generated once. Each frame moves
  layer roots; tree matrices update only when camera travel or motion mode changes.
  There are 11 decorative draw objects, versus the city's 23. Counts are bounded.
- Birds drift slowly; falls have restrained opacity movement. No lightning,
  rotating portals, energy halos or decorative city structures remain. Sky clouds
  are intentionally static. Reduced motion freezes ambient movement and optional
  decorative forward parallax; essential flight and steering continue.
- Four sky palettes represent morning, clear afternoon, muted evening and blue
  hour. Existing sector milestones select them in endless flight; authored
  challenge mood values select them in missions. No new stages were introduced.
- `index.html`: uses the environment, hides old space backdrops, gives the ship
  warm upper-left light, and updates menu/tier/sector presentation labels. Timings,
  speeds, steering, collision radii, scoring, hazard rules and mission data are
  unchanged. Original mission titles/briefings remain for familiarity.
- Low detail limits pines to 40 and hides falls/birds. Existing DPR caps, automatic
  slow-frame fallback, Motion/Detail controls and CSS motion reduction remain.
- Existing audio is preserved: the quiet ship hum and gameplay cues are opt-in,
  with the same Sound/mute control. No new sound assets or autoplay were added.
- No new DOM layers intercept input. HUD, navigation, responsive layouts,
  restart, pause, challenge selection and save formats remain intact.

## Reproducible verification

From the repository root, serve with `python3 -m http.server 4173`, then run:

```sh
node games/dont-let-go/tests/challenges.test.cjs
node games/dont-let-go/tests/environment.test.cjs
node games/dont-let-go/tests/playtest.cjs
node games/dont-let-go/tests/live-browser.cjs
node games/dont-let-go/tests/performance.cjs
node --test tests/*.test.mjs
node build.mjs
git diff --check
```

Browser scripts require Playwright and Chromium; set `CHROMIUM_PATH` and
`DLG_URL` if necessary. Test hooks are injected into served responses only.
No debug hooks ship. Run browser scripts sequentially for timing comparisons.
New evidence is in [qa/fix23](qa/fix23/); previous evidence is retained separately.

Baseline: the existing challenge/environment tests, 30 browser checks and all
32 root regression entries passed before modification. Baseline screenshots
were captured with the existing deterministic browser harness.

Final executed checks: **16/16 challenge tests, 9/9 environment tests,
31/31 deterministic browser checks and 32/32 root regression entries pass**.
The production build and `git diff --check` pass. Continuous browser QA passes
on desktop and emulated mobile with no console, JavaScript, request or HTTP
errors. All twelve missions complete and replay without duplicate rewards.
The 150-second endless run crosses all original sectors with unchanged
environment geometry identities. Wide-screen sky coverage has an additional
unit regression and refreshed live landscape screenshots. Deterministic mission completions use real pointer
handlers and actual scoring/collision code, without assigning camera position,
scores or medals. Continuous-render QA separately exercises real mouse and CDP
touch input, audio/mute, portrait/landscape, resize and repeated course selection.

## Visual evidence

| View | FIX #22 | FIX #23 |
| --- | --- | --- |
| Menu | [Before](qa/fix23/before-desktop.png) | [After](qa/fix23/after-desktop.png) |
| Flight | [Before, retained FIX #22 capture](qa/fix23/before-flight.png) | [After](qa/fix23/after-flight.png) |
| Portrait briefing | [Before](qa/fix23/before-portrait.png) | [After](qa/fix23/mobile-portrait.png) |

Also inspect [touch flight](qa/fix23/live-mobile-flight.png),
[landscape](qa/fix23/live-mobile-landscape.png),
[hazard warning](qa/fix23/storm-warning.png), and
[reduced motion](qa/fix23/reduced-motion.png).

## Performance findings

Controlled sequential flight runs at 1440×900, seeded randomness, 1.5 seconds
warmup and a 5-second sample window; full samples in
[flight-performance.json](qa/fix23/flight-performance.json):

| Version | Draw calls | DPR | Median frame | p95 frame |
| --- | ---: | ---: | ---: | ---: |
| FIX #22 high | 42 | 1 | 116.7 ms | 333.3 ms |
| Highlands high | 25 | 1 | 100.0 ms | 200.0 ms |
| Highlands low | 23 | 0.75 | 83.2 ms | 150.0 ms |

High-detail draw calls decrease about 40%; median frame time decreases about
14% in this short software-rendered sample. Terrain raises rendered triangles
from approximately 10,330 to 15,044, while eliminating many separate effects.
Repeated final-mission selection holds at 26 geometries / 2 textures on desktop
and mobile emulation. This is bounded resource use, not an exhaustive memory
profile. Results are machine-dependent and the small timing sample is not a
statistical hardware-performance guarantee.

## Limitations and release assessment

This environment uses Chromium SwiftShader software WebGL, not a hardware GPU.
Measurements are diagnostic and cannot establish 60 FPS on desktop or Android.
Physical mid-range Android, iOS/Safari, GPU coverage and human visual/difficulty
review remain release checks. The retained quality controller is the fallback,
not evidence of a hardware performance guarantee.

The art is deliberately faceted and restrained. Cloud banks are cached rather
than animated; waterfalls use subtle luminance variation rather than fluid
simulation. Palette changes occur at existing progression boundaries. Existing
space-effect objects remain allocated but hidden to keep this patch out of the
original simulation; a separate cleanup could remove their unused update work.

Ready for code and visual review; not deployed. Recorded automated checks pass. Approval to deploy
has not been requested or assumed. All other Forge Arcade games, cards, shared
styles and deployment configuration remain unchanged.
