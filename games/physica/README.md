# PHYSICA · The Interactive Physics Laboratory

Four independent scientific laboratories built with Canvas2D, native HTML, CSS and JavaScript. No framework, network service, backend, downloaded fonts or external runtime dependency. Companion to ELEMENTAL; its files and saved data are untouched.

## Play locally

From the repository root, run `node games/physica/tests/preview.cjs`, then open <http://127.0.0.1:8445/games/physica/>. Serve over HTTP; ES modules are not intended to run through `file://`. Once loaded, the application needs no network requests. It does not install an offline service worker.

Choose a laboratory, then a guided experiment, challenge, or Free Experiment Mode. All activities are available immediately. Make a prediction, change SI parameters, run, pause, take one numerical step, and inspect measured data alongside the governing equations. Parameter edits restart the trial; Reset keeps the current configuration, while Restore initial preset restores the activity defaults.

| Laboratory | Guided experiments |
|---|---|
| Gravity & Orbits | Free fall, circular orbit, elliptical orbit, three-body motion |
| Motion & Forces | Projectile, frictional incline, force and acceleration, collisions |
| Waves & Oscillations | Pendulum, spring, traveling wave, driven standing wave |
| Electricity & Circuits | Ohm's law, series divider, parallel resistors, lamp power |

Twelve challenges evaluate actual model states, including sustained orbits, projectile landing, stopped distance, contact impulses, measured oscillation periods, driven resonance and valid circuit readings. Challenge givens remain fixed. Guided experiments are marked **observed** after running; this is an exploration record, not a knowledge assessment.

## Controls and notebook

- Mouse/touch: drag a body or editable initial condition while paused; drag empty space to pan; wheel or pinch to zoom. Fit view resets the camera. Numeric fields remain available for precise editing.
- Focus the simulation canvas: Space runs/pauses, S takes one step, R resets. Native buttons and fields support keyboard navigation.
- Free modes: add/remove/edit bodies, compare independent oscillators, or construct a DC circuit. Circuit pins define electrical connections; visual placement does not. Enable the wire tool and select two junctions to join them.
- Graph axes use actual samples and SI units. Freeze holds the displayed data while the model continues. Clear removes recorded data. Wave profiles are spatial fields; IV points represent distinct measured DC trials, which may use different resistances. Dashed curves are explicitly theoretical references.
- Save/load setup stores up to eight named **initial configurations**, not running states or graph history. Export/import provides validated version-1 JSON. Names are displayed as text.
- Progress, tutorials and settings use only `physica.progress.v1` in local storage. Storage failure leaves the lab playable and reports that saves failed. Export before clearing browser data.
- Sound starts disabled and requires a user gesture. Low quality reduces rendering work, not numerical accuracy. Reduced-motion mode suppresses decorative dashboard animation.

## Limits and scientific scope

At most 12 gravity/motion bodies, eight independent oscillators, 12 circuit junctions and 24 components; graph history 600 samples, trails 240 points per body. Scientific assumptions, theoretical quantities and model warnings are visible in each lab. Numerical values retain precision internally; display values are rounded.

Gravity is Newtonian with finite spherical contact/merging, not relativistic. Free-motion blocks use circular contact envelopes and translational dynamics, without rotation. Waves use ideal oscillator equations, an analytical traveling field, or one driven linear string mode; they do not solve a general string PDE. DC uses ideal sources, resistors, fixed-resistance lamps, switches, wires and meters; no AC or reactive components. See [SCIENCE.md](SCIENCE.md), [GRAVITY.md](GRAVITY.md), [MOTION.md](MOTION.md), [WAVES.md](WAVES.md), and [ELECTRICITY.md](ELECTRICITY.md).

## Verify

Run from the repository root:

```powershell
node --test games/physica/tests/*.test.mjs
node games/physica/tests/accuracy.mjs
node games/physica/tests/browser.cjs
node games/physica/tests/advanced-browser.cjs
node games/physica/tests/experience-browser.cjs
node games/physica/tests/performance.cjs
```

Browser scripts currently locate this workstation's bundled Playwright and installed Chrome by absolute path. Update those two test-only paths on another machine; production files have no such dependency. Browser outputs go to ignored `test-results/physica/`. See [QA.md](QA.md) for measured results and limits.

## Integration status

Removed from Forge Arcade's launcher and registry at the user's request on 15 November 2026. The footer atom symbol and active registration were removed; ELEMENTAL's flask is unchanged. Standalone PHYSICA source, artwork and direct game files are retained. [integration/README.md](integration/README.md) records the removal; there is no active Arcade entry.
