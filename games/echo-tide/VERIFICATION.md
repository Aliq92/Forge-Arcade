# ECHO TIDE — The Deepwater Surge Update

Branch `codex/echo-tide-deepwater-surge`, based on published main `e247e8c`. **Local development only. No integration, merge, push or deployment.** Homepage, all other games, shared cards, category filters and deployment settings are unchanged. The two supporting Echo Tide tests were updated for the added local stylesheet/versioned script and the local threat-detection range. Pre-existing unrelated work remains unstaged.

## 1. Existing game analysis

The original game is a dependency-free classic JavaScript IIFE with World, Simulation, Input, Renderer, AudioSystem, UI and Game classes. Canvas2D renders a dark6000×4800 ocean. The fixed seed4139 generates158 rock colliders with polygon art, four current regions, five ruins, three beacons, three elliptical shadow patrols, a safe harbor and a sanctuary. The default original rock geometry is preserved exactly; added channels are appended.

Original controls are omnidirectional WASD/arrows/joystick, Space/SONAR to pulse, P/Escape to pause, R to restart and M/C to chart. Movement interpolates toward an84-unit/s target, with a facing angle following velocity. Sonar expands to320 units over1.2s, persists3s and recharges in1s. Each pulse adds18 disturbance; quiet recovery is1.8/s after2s. At disturbance above65, shadows can threaten the three hull points after a3s warning. Rock collision deflects without hull damage; lit beacons offer shelter and restore one hull point. All three beacons unlock the sanctuary. Original menu, chart, loss/retry, victory statistics and procedural optional audio are retained. There was no propulsion burst, echo interference, siltfall or persistent run save.

Original sources are in `tests/fixtures/original/`. Baseline root tests:180 passed. The existing full Echo Tide browser suite passed against the untouched game, including its complete movement route, collision, loss/victory, keyboard and multitouch checks.

## 2. Burst and handling

Space remains sonar. **Shift or B** activates burst; the new touch BURST action works simultaneously with joystick and SONAR. Keyboard activation of a focused ability button uses the native button click without also firing Space sonar.

Burst lasts0.6s with a2.2× normal target, a4s cooldown measured from activation and a12-point disturbance increase. Direction is captured from the current facing angle; a small steering contribution allows corrections. Acceleration uses exponential velocity interpolation with response9/s during burst. Normal response rises from4.5 to5.8/s; above cruise speed, recovery uses3.8/s. Facing responds at9/s instead of7/s. No teleport, abrupt velocity reset or fuel currency is introduced. Existing currents continue to add their velocity, so actual ground speed depends on local water motion.

The compact recharge meter and text distinguish BURST ACTIVE, RECHARGING with seconds and BURST READY. The touch action shows its remaining cooldown. Readiness adds a subtle steady glow and an optional gentle cue. Holding a key does not retrigger through keyboard repeat; a new press is required after recharge.

Burst uses the existing disturbance meter. Movement adds a low0.35/s contribution while steering, while quiet recovery still wins once the latest pulse/burst is more than2s old. Repeated noisy actions can awaken shadows. Beacons and harbor remain safe counterplay.

## 3. Collision and navigation challenges

Simulation updates subdivide to at most1/120s, including direct test calls up to0.5s. At expected burst/current speeds, steps stay far smaller than the vessel diameter. A static200-unit terrain index restricts collision queries to nearby rocks. Five pushout passes and the original last-clear-position fallback remain. Tests drive burst into a thin wall of3-unit-radius colliders and verify separation without tunnelling; boundary constraints also pass.

- **Narrow passages:** two optional straight channels add28 rocks around1250/2680 and3600/1950. Both ends and outside bypasses remain open. Tests cross a channel without burst or hull damage.
- **Currents:** the existing four regions retain their strength model. Proximity arrows appear before/within meaningful influence even without sonar; discovery records their direction on the chart. Maximum current remains weaker than normal propulsion, and the tests steer against the strongest local current. Their force ramps from zero at the boundary.
- **Echo shadows:** two late-map regions reduce outgoing pulse radius to72% when emitted inside and echo persistence on objects inside to55%. Nearby rock contact visibility, chart memory, objective bearings and beacon shapes remain. Dotted boundaries, hatching and text distinguish the regions without relying only on color.
- **Siltfall routes:** two selected regions activate only after at least one beacon. A4s warning precedes5s of slowed water, followed by a35s cooldown. Marked circles, countdowns and falling sediment explain the hazard. Normal propulsion target drops to65%; burst retains85% of its target. These areas never add solid blocking terrain and have outer bypasses, so they cannot seal the player in.
- **Threats:** reuse the three existing patrols. Disturbance above65 can arm a shadow within700 units when the vessel is initially more than230 units away. A full3s warning precedes pursuit/contact danger. Pursuit speed58 is below normal vessel speed84; quiet, safe water or distance breaks pursuit, after which a shadow returns smoothly to its patrol. No extra enemies are spawned.

Geography leaves the harbor quiet, introduces channels/currents on the way outward and combines interference, silt and disturbance-sensitive patrols farther away. Main objectives remain three beacons followed by the sanctuary. Quiet beacon arrivals, current crossings and evasions are optional run accomplishments shown at victory; none gates completion.

## 4. Visuals, UI, audio and accessibility

The original cyan/gold vessel and dark sonar atmosphere remain. Small rear fins, a directional cyan engine trail,18 brief directional particles and a fading pressure ring give burst feedback. Existing sonar rings and object silhouettes stay primary. The sea gradient is cached per viewport; terrain, effects and motes retain culling. New hazard labels, current arrows and chart markings make unseen forces readable.

The menu uses **“Listen to the deep. Move through the unknown.”** Controls explain the preserved Space binding and the disturbance tradeoff. Beacon/hull/navigation, pause/restart/chart, all existing end screens and the native Arcade return remain. Touch abilities are separate reachable circles; key actions are at least44px. Narrow320px play hides the redundant in-game brand to keep three44px header actions and beacon progress clear. The menu remains scrollable on short viewports. Chart layering was corrected after screenshot review so burst status cannot obscure the chart.

Reduced motion reads the OS preference and can be toggled in Pause. It removes decorative contour/mote/current motion, moving debris and particle travel rendering, the burst pressure ring and rapid hull shimmer; a short steady jet and essential sonar/range information remain. No screen shake or aggressive flash is added. Paused simulation, effects, cooldown and threats freeze.

Original opt-in tones/ambient bed remain. Burst, recharge and warning cues are quiet additions. No AudioContext is created at startup. Pause/mute stops tracked tones and suspends audio; ended voices disconnect. Restart clears old tones. No remote assets or persistence are introduced.

## 5. Automated and challenge results

**430 tests passed,0 failed** in the combined repository/game regression command. This includes12 new Echo Tide tests covering activation, facing, duration, cooldown/recharge, smooth recovery, pulse binding mechanics, disturbance/decay, bounded collision,30/60/120Hz consistency, echo shadows, silt warning/clearing, pursuit/safe water, bounded particles/reset, turning/current countersteering, no-burst narrow passage, original terrain preservation and complete voyages.

All three beacons and sanctuary are connected across **100 terrain seeds**, using a conservative disk-clearance path planner. **42/42 full voyages across21 seeds** completed by actual simulated steering, with all challenges enabled and no player-position, hull or beacon injection. Each seed was traversed once without burst and once with burst. No-burst times205.69–206.82s; burst times171.53–174.58s. The planner knows the map and uses careful bearings/12s pulse spacing; these establish tested reachability and useful burst speed, not human first-play balance or a guarantee for every route. The game still uses its original fixed seed by default; alternate seeds are test coverage.

`CHALLENGE-RESULTS.json` contains the compact summary; complete per-voyage records are in `test-results/echo-tide/challenge-report.json`.

## 6. Browser results

- Existing full browser regression passed: boot, movement/sonar, chart, pause, complete movement-to-sanctuary route, collision/invulnerability, failure/retry, reset, synthetic and real multitouch, audio unlock and focus loss. The old test's shadow-arm fixture now uses350-unit proximity rather than a1000-unit distance, matching the intentional700-unit reaction limit.
- New browser suite passed1440×900 keyboard and768×1024,390×844,320×568 and844×390 touch layouts. It uses real simultaneous three-finger joystick/SONAR/BURST, real Shift/B input, native module-free controls, pause snapshots, recharge, motion toggle, chart and restart. No console/page errors were recorded.
- Current, echo-shadow, silt-warning and channel visuals/input were checked with targeted position fixtures; these are explicitly separate from complete-voyage evidence.
- The desktop browser additionally completed a voyage by actual movement with native Game transition to victory: three beacons,36 bursts,3 hull remaining, about173 simulated seconds. No position/hull/goal flags were injected during that voyage.
- Lifecycle checks passed native keyboard activation of the focused BURST button without a sonar conflict, immediate audio pause/voice cleanup, blur clearing held input, a hidden-document fixture, current-direction chart drawing and renderer state purity. The visibility fixture does not establish physical-device app-switch behavior.

Screenshots are under `test-results/echo-tide/`: original `before/`, legacy regression `after/`, five `surge-menu-*`/`surge-burst-*` captures, challenge captures, `surge-chart.png` and `surge-victory.png`. These were visually inspected, including narrow-phone and short-landscape layouts. Detailed reports/logs are retained there.

Commands:

```text
node --test games/echo-tide/tests/*.test.cjs tests/echo-tide-integration.test.mjs
node games/echo-tide/tests/challenges.cjs
node games/echo-tide/tests/browser.cjs
node games/echo-tide/tests/lifecycle.cjs
node build.mjs
```

New browser runners use the local preview at port8428 and the installed Chrome. `FORGE_PLAYWRIGHT` can override the bundled package path. The original root browser runner uses NODE_PATH, CHROMIUM_PATH, ECHO_URL and ECHO_ARTIFACTS as documented in README.

## 7. Performance, review and readiness

The single original RAF loop remains. New particles share the existing180 cap; one pressure ring, two echo regions, two silt regions, three shadows and a bounded two-pulse reveal workload keep additions small. Terrain index/reveal geometry is built once per run. Cached background allocation changes only on resize. DPR is capped at1.5; no external runtime libraries or heavy simulation are added.

`PERFORMANCE-RESULTS.json` records local before/after renderer measurements at1440×900 and390×844, DPR1:20 warmups,120 actual RAF draws,180-particle stress fixture, revealed terrain, sonar and a frozen burst. Timings measure Canvas CPU submission, not GPU completion or physical Android FPS. Renderer purity checks confirm drawing does not change simulation state. The additional features cost some CPU on the desktop sample; no universal performance improvement or hardware60FPS guarantee is claimed.

Independent read-only review found no collision, cooldown, disturbance, pursuit or touch blockers. Its one minor chart-feedback inconsistency was fixed by adding discovered current direction arrows/echo-shadow boundaries; browser canvas instrumentation and screenshot review verified it.

The static production build passes, with all runtime paths relative and entry assets versioned. Ready for a later explicit integration/publication request. **This branch has not been deployed.**

Known limits: tested in installed Chrome with emulated phone/tablet input; physical Android/iPhone, Safari/WebKit and Firefox remain unverified. Human first-play balance and physical-device performance are not established. The existing nonpersistent run model is preserved. Siltfall is a warned temporary slowdown, not a collapsing solid wall; alternate routes stay open. Essential sonar expansion remains visible in reduced motion because it communicates range.
