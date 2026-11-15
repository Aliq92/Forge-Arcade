# AXIOM validation — 15 November 2026

## Automated science and integration

`node --test games/axiom/tests/*.test.mjs`: **159 passed, 0 failed**, including 43 model subtests. Checks include analytical/numerical references, quantum normalization, conservation and invariants, singularities, joint parameter domains, graph resolution, loitering cosmology, presets/units/source links, copied-source hashes, notebook validation and independent-axis versus spatial rendering. Earlier PHYSICA baseline: **68 passed**. Established, modern and curriculum tasks received independent scientific reviews; all eight reported P2 findings were corrected and scoped re-reviewed.

Reported accuracy includes orbit relative energy error 3.98×10⁻¹³ over a period; pendulum period error 1.90×10⁻¹⁰ s; RLC energy-plus-heat error 6.77×10⁻¹⁰ J; Lorentz interval relative difference 3.56×10⁻¹⁶; electron 1 nm ground state 0.3760301621 eV; evolving quantum normalization error 1.56×10⁻¹⁵; photon deflection versus independent quadrature difference 4.93×10⁻¹¹ rad; and the loitering scale-factor regression relative difference 7.56×10⁻¹². See the science reports for exact configurations, domains and tolerances. These selected results are not universal error guarantees.

The final-review fix wave added malicious entry/note ID rejection, qualified very-low-mass stellar evolution, and confined preview-root regressions. The reference register now contains 27 primary sources.

## Browser coverage

`tests/browser.cjs` passed all 43 model pages, main routes, run/step/pause, freeze/navigation lifecycle, notebook save/reload and notes, invalid equation feedback, String Explorer modules, particle search and responsive layouts at 1440×1000, 768×1024, 390×844, 320×740 and 844×390. No horizontal document overflow, uncaught page errors or external runtime requests were observed.

`tests/final-regressions.cjs`: **9 checks passed**, covering keyboard skip-to-main focus without route/session loss; 4× watch speed, actual simulated time and clock readout after Reset, parameter edits and presets; malicious note/observation imports with unchanged saved work; valid JSON roundtrip, graph inspection, compare and restore; qualified low-mass stellar UI and primary source link; escaped notebook attributes even if validation is bypassed in memory; and no uncaught page errors. These focused Chrome checks were rerun after the final changes.

`tests/browser-extra.cjs`: **12 checks passed**. It covers 150 lesson views (50×3 levels), all 44 equations, exact library/laboratory filter results, seven conversion families including Celsius offsets, frozen curves while physical state evolves, keyboard controls, visible quantum/barrier diagrams, compatible/incompatible graph comparisons, restore/reload, blocked localStorage and session-only save, rendering preference persistence, and unchanged seeded ELEMENTAL/PHYSICA keys. Trusted Chrome CDP input exercised touch drag, two-finger pinch, Fit and Single step at 390×844 with device pixel ratio 3.

`tests/integration-browser.cjs` passed the proposed registration in HTTP responses without editing any root file. AXIOM's card/image/body dimensions match its sibling at 1440 and 390 pixels; both thumbnail formats load and the card opens AXIOM. External gallery services were blocked in this isolated test; it does not verify the visitor counter service. The index patch passes `git apply --check`.

Screenshots were visually inspected for desktop dashboard, mobile lab/controls, independent quantum/barrier axes, and the aligned proposed gallery card. Results and images live under repository `test-results/axiom/` (ignored generated artifacts). Rerunnable scripts remain with the source.

## Local production build

The controller reported `node build.mjs` exited 0 and produced `dist`. A targeted headless-Chrome check of the built native `/games/axiom/` URL passed all 43 model registry imports, quantum Single step, no page errors and the relative Arcade link. After the final fix wave, the controller rebuilt successfully and repeated the built native URL check: all 43 model imports, actual quantum Single step, preserved 4× speed after Reset, skip-link focus with the laboratory route preserved, and no page errors passed. It verifies local output only; the public site has not been verified or changed.

## Performance and limits

`tests/performance.cjs` measured ten synchronous step/scene/graph samples for each of 43 models in headless installed Chrome, desktop 1440×1000, device pixel ratio 2. Maximum model mean in this run: **0.63 ms**. This excludes initialization/navigation and does not establish sustained frame rate or performance on phones. Canvas DPR stayed at or below 1.5; low quality is capped at 1. History remained exactly 600 samples after 3,000 steps. Sessions cap catch-up at 256 physical steps/frame; the UI reduces graph redraw frequency when appropriate.

The validation is Chrome desktop plus CDP mobile emulation, not physical-device or cross-browser certification. Screen-reader behavior and prolonged low-memory-device use require further testing. The build contains no runtime CDN dependencies, user accounts, backend, telemetry or multiplayer state.

## Final approval — 16 November 2026

The scoped final re-review approved all four P2 fixes and the preview correction, with no fix-induced blocker. Final acceptance: 159/159 Node tests, 9/9 focused final Chrome checks, prior full desktop/mobile interaction checks, and successful post-fix local production build/smoke. Publication remains pending explicit approval.

## Hidden footer integration — 16 November 2026

User approved publication through a footer symbol. AXIOM is now registered hidden/non-featured and opens via an accessible 44px atom beside the chemistry flask. Visible counts remain 39; both laboratories are absent from every card filter. Added a mobile Arcade return link so touch users can navigate back. Latest published Lantern Vale, Judgment Chamber and APOGEE changes were merged before integration.

Fresh validation: all 182 tracked root tests and 159 AXIOM tests pass. Actual footer integration browser checks pass at 1440×1000, 390×844 and 320×740: all filters exclude AXIOM, keyboard/touch entry works, physical Single step advances time, notebook save works, return works, chemistry still opens all 118 elements, no page errors. Public verification follows publication.
