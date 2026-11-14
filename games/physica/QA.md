# PHYSICA QA · 15 November 2026

## Functional and scientific checks

68 Node tests passed with zero failures: four physical models, finite values, strict setup validation, independent reference calculations, energy/momentum/circuit balances, actual measured periods, all 16 presets, all 12 correct and wrong challenge scenarios, immutable challenge givens, fixed-step speed independence, capped history/trails and isolated persistence. `tests/accuracy.mjs` passed its independent pendulum/spring/work-balance assertions. Detailed numerical results are in SCIENCE.md and the individual model documents.

Chrome 157.0.8103.51, headless Windows, bundled Playwright:

- `tests/browser.cjs`: all 16 experiment observation flows and all 12 challenge solutions; four free builders; pause/single-step; graph recording freeze; save/export/import/load; progress reload and ELEMENTAL storage sentinel unchanged; five viewport sizes; zero page errors. Long physical runs are accelerated using the same fixed-step session engine after setting controls through the DOM.
- `tests/advanced-browser.cjs`: slider changes refresh actual models and theory immediately; frozen spatial graph pixels stay identical while physical time advances; actual mouse body dragging; safe setup names; resistor editing and real two-pin wire connections; voltmeter readings; rejected ideal-ammeter short; separate component/node selection namespaces; low-quality DPR; emulated touch dragging and two-finger pinch; four narrow/landscape viewports; denied local-storage getter; zero page errors.
- `tests/experience-browser.cjs`: all four tutorials finish and persist; sound remains uninitialized on load even when previously enabled and unlocks only after Run; real animation-frame cadence; final lab screenshots.

Viewports covered: 1440×1000, 390×844, 844×390, 320×740, 768×1024, 568×320. No horizontal document overflow was detected. Narrow screens use a scrollable lab/navigation strip and stacked panels. Desktop, standing-wave and mobile circuit screenshots were visually inspected. Circuit diagrams are schematic: densely arranged labels/components can require zoom or exact property fields.

Outputs are reproducible in ignored `test-results/physica/`: browser-report.json, advanced-report.json, experience-report.json, accuracy.json, performance.json and screenshots. Tests use installed workstation paths only in test scripts.

## Performance findings

`tests/performance.cjs` executes 360 synthetic 1/60-second ticks per case, timing real update, viewport draw and graph draw separately. Free modes were stressed at 12 gravity bodies, 12 motion bodies and eight oscillators. DC used the 11-component default free circuit; its solver is recalculated on editing, not every frame. Circuit numerical tests separately cover supported networks and validation. Low rendering quality was used; Chrome CPU throttling is an approximation, not a physical phone test.

| Case | Update p95 ms | Viewport draw p95 ms | Graph draw p95 ms |
|---|---:|---:|---:|
| Gravity · normal CPU | 0.50 | 0.40 | 0.20 |
| Motion · normal CPU | 0.40 | 0.30 | 0.20 |
| Waves · normal CPU | 0.70 | 0.20 | 0.10 |
| Circuits · normal CPU | <0.10 | 0.30 | 0.20 |
| Gravity · 4× CPU throttle | 3.70 | 5.20 | 1.90 |
| Motion · 4× CPU throttle | 1.20 | 4.10 | 1.60 |
| Waves · 4× CPU throttle | 2.20 | 0.90 | 0.50 |
| Circuits · 4× CPU throttle | 0.10 | 1.00 | 0.60 |

Individual stalls occurred, including a 60.1 ms throttled circuit draw in the latest run (84.4 ms motion draw in an earlier run); these short measurements do not guarantee sustained 60 FPS. Unthrottled guided-lab live requestAnimationFrame samples lasted about 1.1 s each: median interval 6.9–7.0 ms and p95 7.0–7.2 ms on this high-refresh environment. The headless cadence is not a display/physical-device benchmark.

Sampled JS heap ranged about 3.5–6.3 MB across stress cases. This is a snapshot, not a heap-leak proof. All stress models remained valid; history and trail assertions passed. Separate long-step unit tests verify history ≤600 and trails ≤240. Eight saved layouts and validated import limits bound persisted configuration size. Low quality caps DPR at 1, decimates trails and draws graphs on alternate frames; simulation equations and steps remain unchanged. An excessive workload slows catch-up rather than increasing numerical Δt.

## Review and regression findings

Independent model reviews approved gravity, motion, waves and DC. Whole-application review identified stale theory on slider input, profile graphs moving after Freeze, overly broad body highlighting and challenge-given bypasses. These were fixed and their cases verified; the final scoped reviewer approved with no new actionable findings. Explicit-null free-motion/wave imports and free-pendulum Cartesian coordinates were also corrected during model review.

No root/gallery/ELEMENTAL files or other games were changed. The pre-existing dirty gallery browser test and unfinished Hollow Signal files were preserved. There is no automatic deployment; integration is prepared as a separate patch.

## Limits of this verification

Physical iOS/Android hardware, Safari, Firefox and assistive technology were not tested. Touch events and responsive layouts were emulated in Chrome. Network/offline cache installation, public deployment and the active gallery were not exercised because the brief prohibits automatic publication. The runtime needs an HTTP server for module loading; it makes no external network requests. Numerical results are scoped to documented models, inputs and durations, not laboratory-grade measurement equipment.

## Approved hidden integration · 15 November 2026

The user explicitly authorized integration and publication after the standalone build. PHYSICA now uses hidden:true/featured:false and a footer atom beside the unchanged ELEMENTAL flask. The gallery retains 39 visible entries (41 registered, two hidden). Dedicated desktop/mobile integration checks passed at three widths, including native launch, physical stepping, return, chemistry access and keyboard focus. PHYSICA plus ELEMENTAL numerical/integration unit tests: 70 passed, zero failed. The obsolete visible-card patch was removed. Physical phones and non-Chrome browsers remain untested.
