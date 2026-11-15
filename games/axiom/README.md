# AXIOM — The Physics of Everything

A standalone, static physics institute: 10 disciplines, 50 lessons at three reading levels, 43 substantive laboratories, 44 equations (29 scalar calculators), 17 Standard Model particle entries, 14 theory comparisons, 78 knowledge links and 27 primary references.

The user approved integration on 16 November 2026 as a hidden physics institute. Open AXIOM with the atom symbol in the Forge Arcade footer, beside ELEMENTAL’s flask. AXIOM is excluded from every card collection, featured list and visible experience count. ELEMENTAL and archived PHYSICA remain unchanged.

## Preview and verification

From the repository root:

```powershell
node games/axiom/tests/preview.cjs
# Open http://127.0.0.1:8460/games/axiom/
node --test games/axiom/tests/*.test.mjs
node games/axiom/tests/browser.cjs
node games/axiom/tests/browser-extra.cjs
node games/axiom/tests/final-regressions.cjs
node games/axiom/tests/integration-browser.cjs
node games/axiom/tests/performance.cjs
```

Node tests use built-in modules. Browser scripts use the installed Codex Playwright package and Windows Chrome at the explicit paths inside the scripts; adjust those paths on another computer. No package installation or remote runtime service is needed. Serve over HTTP; module scripts do not reliably run from `file://`.

## Investigating

Choose a discipline or laboratory from Home. Library filters use evidence status, subject, mathematical depth and prerequisites marked read. Laboratory depth/prerequisite filters select models linked to matching lessons. Search spans lessons and topic definitions, laboratories, equations, particles and theoretical frameworks. Scientific References is available from Home.

Laboratories provide validated parameters, unit conversions, presets, Start/Pause/Reset/Single step, observation speed, measurements, actual time traces or calculated profiles, frozen graphs, explanations, governing equations, assumptions and primary references. Static analytical/conceptual diagrams disable time controls. On the visualization, drag to pan, pinch/wheel or use buttons to zoom; Fit restores the display. Space toggles play, S steps, R resets when the canvas has focus. Display zoom never changes physical parameters. Profile diagrams explicitly use independent axes when the coordinates represent different quantities; spatial geometry retains equal coordinate scales.

The Theory Explorer includes strings/vibrations, open/closed boundaries, compactification, branes, theory comparison and unresolved questions. Classical vibration and projected geometry are explicitly distinguished from unconfirmed fundamental string theories. The Universe section links the selected cosmological, stellar and gravitational models; it is not a general cosmological simulation engine.

## Notebook and data

AXIOM writes only `axiom.notebook.v1`. Save initial model configurations, current readings, actual selected graph samples, observations, notes, equation bookmarks and lessons marked read. Restore starts a fresh trial rather than resuming a serialized numerical integrator. Compare two or three observations only when model, graph kind, axis names and units match. Saved curves retain their original sample ranges.

Limits: 30 observations, 40 notes, 600 points per graph, 2 MB imports, bounded validation cache. Export JSON from Notebook to keep a portable backup. Imports validate scientific domains, schema versions and sizes, merge identities, reject conflicting records, and preserve existing work. Blocked storage allows current-session work and export; unreadable/future-version storage is preserved until an explicit valid import. Removing browser data removes local notebooks unless exported.

Optional PHYSICA import reads compatible initial configurations from `physica.progress.v1` only after clicking its button. Unsupported/free-form setups are skipped. Live simulation state and challenges are not transferred; the original key is never written. ELEMENTAL keys are never accessed by the app. Four PHYSICA pure model copies are byte-identical to their archived sources, with adapters isolated inside AXIOM.

## Architecture and scientific scope

- `src/physics`: strict SI schemas, constants, independent model packs, registry and bounded model state.
- `src/content`: original three-level lessons, equation definitions/calculators, particle/theory/history data and primary sources.
- `src/app`: scientific session clock and semantic DOM routing.
- `src/ui`: Canvas scene/plot rendering; display conversions and formatting.
- `src/storage`: versioned, bounded local notebook.
- `integration`: proposed gallery registration and index patch; `assets`: aligned pixel artwork.

`API.md` documents the model contract. `ESTABLISHED-SCIENCE.md`, `MODERN-SCIENCE.md` and `CONTENT-SCIENCE.md` document equations, numerical validation, references and model domains. `QA.md` records browser and performance results. `DEPLOYMENT-READINESS.md` gives the exact remaining publication steps.

## Known limits

These are representative educational models, not complete research solvers. Ideal-gas/Carnot laws, Coulomb friction, simple circuits, thin lenses, acoustic Doppler, Schwarzschild exterior, thin weak lensing, linearized gravitational waves, a nonrelativistic infinite well, rectangular barriers, two-flavour neutrinos, selected FLRW cosmologies and a chosen spherical rotation profile each have explicit domains. Domain violations are rejected or explained, and unavailable outputs use null rather than fabricated numbers. Numerical chaos prevents exact long-term double-pendulum predictions.

Neutrino profiles use a labelled local window if a full-baseline plot would alias. Unresolved above-barrier tunneling resonances use a labelled exact lower envelope, not fake sampled peaks. Photon deflection is a finite-boundary null-geodesic calculation with capture/iteration limits. Stellar life paths are schematic; very small red dwarfs have a qualified predicted far-future blue-dwarf path without a giant stage, and intermediate low-mass paths remain open. Display bins are not exact transition masses. Lifetime estimates are restricted to 0.5–2 solar masses. Quantum-gravity diagrams do not predict unobserved dimensions, particles or forces. Operator/tensor equations use guided derivations and selected solvable cases rather than pretending to solve arbitrary field equations.

Browser validation uses installed Chrome and mobile/touch emulation. Physical phones, Safari, Firefox and assistive screen readers have not been tested. Graph drawing and model clocks are bounded; slow devices can advance more slowly in wall time instead of enlarging numerical steps. Source links require internet; the platform's own assets and calculations do not. There is no service worker guaranteeing a first-time offline load.
