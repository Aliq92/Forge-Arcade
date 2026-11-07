# Particle Lab — Fix #06: Particle Renaissance

Verified build, 8 November 2026. The user subsequently authorized integration and publication to Forge Arcade. The Forge Arcade homepage, cards, thumbnails, categories, other games and deployment configuration are unchanged.

## Existing game analysis

The original `index.html` contained a 200×120 cellular falling-material sandbox. It provided Sand, Water, Oil, Stone, Wood, Fire, Acid and Erase brushes, interpolated drawing, brush radii 1–8, Pause and Clear. Smoke appeared through fire reactions. Sand/liquid density, wood/oil ignition, water extinguishing fire, smoke lifetime/open-top escape and acid dissolution were already implemented. There were **no existing gravity wells, attractors, repulsors or vortices**.

The old simulation advanced once per display frame, so simulation speed varied with refresh rate. Rendering used a stretched low-resolution pixel buffer, with no continuous particle layer or save/load. The bottom toolbar scrolled horizontally and used non-button elements; short landscape targets shrank below 44px. The page depended on remote fonts.

The update preserves the original material rules in `materials.js`. A separate luminous tracer layer supplies the requested force tools and rebirth cycle. Fields affect **light particles**, not sand/liquid chemistry; this distinction is stated in the interface. Stone and wood also act as barriers for tracers, using swept cell checks to prevent high-speed tunnelling through thin walls. Liquids do not block tracers. No particle-to-particle collision model has been added.

Seeded comparison against `tests/fixtures/original.html` verifies exact material cell and lifetime agreement over 240 ticks, including all original brush types and multiple reacting materials. Materials now advance at 60 fixed steps per simulated second; original behavior at 60Hz is retained while refresh-rate dependence is removed.

## Improvements and source

The laboratory has a navy gradient, a fine grid, cyan/violet/pink/amber/turquoise tracers, cached luminous halos, short motion trails and restrained field diagrams. Materials retain identifiable appearances with a refreshed palette. A compact toolbar exposes all six tracer tools on a 320px phone. Settings sit in a collapsible drawer rather than covering the canvas permanently. Reduced effects follow the operating system's reduced-motion preference initially and can be changed manually. Sound defaults off and uses procedural Web Audio only after interaction.

| File | Responsibility |
|---|---|
| `index.html` | Laboratory layout, accessible buttons/sliders, field notes and relative arcade navigation |
| `lab.css` | Desktop/mobile/landscape layout, theme, touch targets and controls drawer |
| `materials.js` | Original cellular rules and brush interpolation; persistence and tracer barrier query |
| `particles.js` | Pooled tracer dynamics, fields, fixed timestep, queue ownership and validated state |
| `experiment.js` | Versioned bounded save/load and storage error handling |
| `renderer.js` | Cached backdrop/halos, batched trails and particle cores, material buffer and field graphics |
| `lab.js` | Mouse/touch/keyboard input, sliders, lifecycle, audio and dashboard integration |
| `tests/` | Original fixture, automated physics/material/persistence/collision tests and browser QA |

There are no new dependencies, remote fonts, automatic presets or levels. Startup remains an empty creative workspace. “Add 300” explicitly adds a uniformly scattered particle cloud; it does not load an experiment preset. Existing gallery artwork is retained.

## Rainbow Rebirth Well

The interface explicitly identifies this as a **creative fantasy transformation, not a scientific physical phenomenon**.

1. A softened inward force plus a tangential component makes nearby tracers spiral toward the well.
2. Entering its 9px core removes that particle from the active array and places the **same pooled object** in that well's queue.
3. An inward glow marks absorption. After the default 0.35 simulated seconds, the particle receives a rainbow hue and selected saturation.
4. It emerges 19px from the **same well's current centre**, with the selected outward velocity. A pulse, trails and a bright core mark release.
5. A global 0.8-second immunity prevents immediate recapture, including by overlapping wells. Particles can return for later cycles.

Defaults: strength 650, influence radius 190px, burst speed 190px/s and colour intensity 90%. Sliders control strength, radius, transformation speed, burst force and colour intensity. Field centres stay at least 24px inside the workspace. Moving an occupied well changes its release origin. Deleting it returns queued particles safely instead of discarding them.

Each well holds at most 64 particles; a full queue leaves additional particles active. Active and queued particles share the same total limit of 1,500 pooled objects. All eight allowed fields can be rebirth wells. Every absorption/release retains particle identity and mass; no automatic cloning or emitter runs in the background. Explicit drawing, count changes, Clear and Reset are intentional additions/removals by the user. Original material reactions may still consume or transform material cells independently.

## Creative Mode controls

| Action | Control |
|---|---|
| Draw materials | Choose a bottom material brush, then drag; brush radius in Controls |
| Add tracers | Particles tool and drag, or Add 300 / count slider in Controls |
| Attract / repel / swirl | Choose Attractor, Repulsor or Vortex, then tap the canvas |
| Rainbow cycle | Add light particles, choose Rebirth well, then tap the canvas |
| Select / reposition | Select tool, then tap or drag a field's centre |
| Tune a field | Select it and open Controls; sliders also configure the next field when none is selected |
| Delete | Delete selected field button, Delete or Backspace |
| Pause / resume | Header button or Space outside form controls |
| Speed | 0.25×–2× slider; affects both simulation layers and transformation delays |
| Save / load | Controls → Save locally / Load saved |
| Clear | Empty particles, queues, fields and material cells; retain control settings and saved experiment |
| Reset | Restore empty startup state and default controls; retain saved experiment |
| Effects / audio | Luminous halos & motion trails checkbox / Sound toggle |
| Shortcuts | S select, P particles, A attractor, R repulsor, V vortex, B rebirth; Esc closes Controls |

Saving uses one browser-local slot, `forge.particle-lab.experiment.v1`, with a 1MB serialized-size bound. It records material cells/lifetimes, active and queued tracer state, field positions/parameters, timing phase, speed and current UI settings. It stores no frame histories. Loading validates the complete experiment before replacing the current scene. Corrupt, missing, unavailable or full storage produces a status message and leaves the current scene intact. Positions scale on resize/load while the original material grid remains 200×120.

## Automated verification

**334 tests passed, zero failures:** the existing 312 checks plus 22 Particle Lab checks.

```powershell
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs games/molt/tests/*.test.cjs games/particle-lab/tests/*.test.cjs
node build.mjs
```

The production build succeeded. Tests cover spawning/pooling, movement/boundaries, attractor/repulsor force signs and radii, both vortex directions and centre stability, rebirth attraction/absorption/delay/hue/release/immunity, queue overflow, mass/count conservation, deletion, moving and resizing occupied wells, multiple interacting wells, malformed save validation, blocked storage, pause/reset/speed, original tool compatibility and thin material barriers.

Seeded fixed-step comparison produces identical particle states for a two-second experiment driven at 30Hz and 144Hz render schedules. Simulation runs at 120Hz; material callbacks run at 60Hz. Acceleration is capped at 1,000px/s², velocity at 500px/s, with 12px force softening. Catchup is bounded to 0.1 real seconds per call and 24 physics steps, preventing large hidden-tab/time jumps from causing unstable bursts.

A recorded seed-7, 30-second experiment retained **80 particles**, with **131 absorptions and 131 releases**, zero queued at the end, and all remaining 1,420 pool slots free. Another automated 30-second experiment used eight interacting wells and retained 300 unique particles and exactly 300 units of mass, with more than 300 releases. Queue overflow/deletion/count reduction tests exercise the full 64-particle queues separately.

An independent read-only review checked the final queue, collision, persistence, rendering and lifecycle changes, reran all 22 Particle Lab tests, and found no blocking P1/P2 issues.

## Browser verification

Chrome passed all five layouts: **1440×900, 768×1024, 390×844, 320×740 and 844×390**. The 390px layout used a 2× display scale to verify the 1.5× Canvas DPR cap; the 320px layout initially requested reduced motion.

The browser suite exercised real mouse input or emulated touch: all material brushes and erasing; placing, selecting, moving and deleting fields; strength/radius sliders; vortex direction; rebirth transformation/burst/intensity controls; speed; drawing tracers; observing absorption/release; count conservation; pause freezing; save, Clear and Load; corrupt-save rejection without scene changes; sound/effects toggles; reset; resize with occupied wells; no horizontal page overflow; and one game RAF chain. The hidden/visible lifecycle branch was verified using dispatched visibility events and a synthetic `document.hidden` value, including cancellation of frames and paused return.

Browser page/console errors: **0**. Canvas screenshots were visually reviewed on desktop, portrait and landscape. No automatic public-site testing or deployment was performed.

To rerun, serve this repository at `http://127.0.0.1:8428/`, set `FORGE_PLAYWRIGHT` to the installed Playwright module, then run `node games/particle-lab/tests/browser.cjs`.

## Measured performance

Final Chrome measurements used **1,500 tracers and eight fields with full effects**, for 2.5 seconds per layout after clearing timing samples. Values measure JavaScript frame work, including physics, Canvas submission and periodic UI work. They are not GPU completion times or displayed FPS.

| Layout | Mean frame work | 95th percentile | Tracers at end | Queued at end |
|---|---:|---:|---:|---:|
| 1440×900 | 2.94 ms | 4.40 ms | 1500 | 27 |
| 768×1024 | 4.19 ms | 12.60 ms | 1500 | 29 |
| 390×844, DPR capped at 1.5 | 2.91 ms | 4.20 ms | 1500 | 46 |
| 320×740 | 2.41 ms | 3.40 ms | 1500 | 128 |
| 844×390 | 2.57 ms | 3.80 ms | 1500 | 117 |

The pool remains capped at 1,500 and all queues at 64 each. The final run used 29 cached halo sprites and one game RAF chain at every size. Same-colour geometry is batched; positions and object pools are reused. The backdrop and halo gradients are cached, with no full-screen blur in the simulation. Hidden tabs stop RAF entirely and return paused. Idle paused scenes redraw only when needed. Reduced effects remove halos, trails and rotating field decoration while retaining readable cores and field markers.

## Evidence and limitations

- [Before desktop](../../test-results/particle-lab/before-1440.png) · [After desktop](../../test-results/particle-lab/after-rainbow-1440.png)
- [Before portrait](../../test-results/particle-lab/before-390.png) · [After portrait](../../test-results/particle-lab/after-rainbow-390.png)
- [320px reduced-effects view](../../test-results/particle-lab/after-rainbow-320.png) · [Landscape](../../test-results/particle-lab/after-rainbow-844.png)
- [Creative controls](../../test-results/particle-lab/after-controls-1440.png) · [Materials](../../test-results/particle-lab/after-materials-1440.png)
- [Browser results and measurements](../../test-results/particle-lab/browser-report.json) · [Cycle record](../../test-results/particle-lab/cycle-report.json) · [Full test output](../../test-results/particle-lab/full-tests.log)

Evidence files are local under `test-results/particle-lab/`, which is ignored by Git.

Desktop Chrome mobile emulation does not establish performance or compatibility on physical mid-range Android, iOS or Safari. Long-term thermal/battery use, GPU frame pacing, real background-tab lifecycle behavior and multi-window storage contention remain unmeasured. Max-density timings vary with host load. The local slot has no cloud synchronization or multiple-save library. Force fields act only on the new tracer layer; tracers interact with stone/wood barriers but do not collide with each other or exchange heat with materials. These are deliberate boundaries of this update, stated in the interface and documentation.

Integration and publication were authorized after local verification and review. This report records the tested source; public deployment is confirmed separately against its GitHub revision. No gallery replacement was made.
