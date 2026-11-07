# ELEMENTAL v0.1 verification — 8 November 2026

Standalone milestone complete locally. Following the standalone checks, the user requested placement beside Beat Foundry. Elemental is now locally registered under Experiments, with its prepared artwork. Publication was subsequently authorized by the user on 8 November 2026.

## Automated checks

- **19 Elemental pure tests passed**, zero failures. Checks cover 118 unique symbols/Z/table positions and correct CIAAW weight notation; known H/C/O/Na numbers; all 118 neutral configuration electron sums; isotope integer relationships/stability; Na⁺/Mg²⁺/Ca²⁺/Cl⁻/O²⁻ electron counts; unsupported transition ions; Hund box occupancy; Hill/empirical formulas; every reference graph’s electron accounting/formal charges; bad/duplicate/self endpoints and H overbonding; warnings for unfamiliar charged graphs; formula-versus-graph identity; fully renamed atom recognition; undo/reset; non-finite count rejection; twelve scientific challenge outcomes and sequential/corrupt/blocked saves; Lr/Mt corrections; reference bond lengths, water angle, tetrahedral methane, pyramidal ammonia and planar/linear features.
- **298 repository tests passed**, zero failures. Baseline was 279. Command: `node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs`.
- `node build.mjs` passed. The static output includes local scientific JSON and pinned Three.js modules.
- Original scientific snapshots and vendor integrity are recorded in manifests; npm package SHA-512 and bundled module SHA-256 were checked. Runtime scientific state is validated independently of the visual scene.

## Browser QA

Chrome/Playwright at **1440×1000, 768×1024, 390×844, 320×740, 844×390**:

- 118 tiles; name search; classification filter; comparison; missing-data trend styling.
- Atom element/isotope selection, Cl-37 with Cl⁻ electron count, orbital boxes.
- Actual atom-add/select/connect actions building H₂; bond order changes that become invalid; removal, deletion and undo; reference loading.
- **WebGL/Three.js available on all five runs**, real pointer drag rotation, zoom/reset and viewport resizing; narrow page overflow checks passed.
- All **12 challenges completed through UI controls** on desktop; progress survived reload. Molecular challenge solutions used the reference-loading learning aid; separate H₂ editing exercised construction from empty atoms. This is not a claim that a human built every reference from scratch.
- Simulated graphics context loss using `WEBGL_lose_context` entered SVG fallback, then restored Three.js. Synthetic persisted `pagehide/pageshow` exercised cached-page pause/resume without destroying the renderer. Actual back-forward cache eligibility was not asserted.
- Separate context with WebGL unavailable and localStorage access blocked retained the editor/scientific panels and supported water validation via SVG.
- **Zero page/console errors and zero external runtime requests** in the passing suite. Source pages linked in the documentation are opened only when requested; all chemistry/runtime data is local.

Representative periodic, atom, molecule and fallback screenshots were inspected. Corrected duplicated SVG ghosts beneath WebGL, a narrow-screen automation gesture that required scrolling the view into the viewport, dense long weight labels, and comparison wrapping. Renderer uses bounded shared geometry/materials, capped DPR 2, one active scene frame loop and cleanup; physical-device profiling was not performed.

Evidence: `test-results/elemental/browser-report.json`, screenshots in the same directory, `test-results/elemental-full-tests.log`. Test scripts are in `games/elemental/tests/`.

## Independent review and discrepancies

Fresh review identified the old lawrencium configuration, calculated configurations labelled reference, and cached-page renderer destruction. Corrections and regression tests were added. Follow-up review ran all 19 pure tests and reported no remaining P1/P2 issue. Additional regressions cover unverified challenge nuclei and NaN bookkeeping.

Scientific disagreement/approximation notes are visible in the lab and detailed in README: NIST Lr override, theoretical heavy configurations, O₂ triplet versus Lewis drawing, NH₃ versus Hill H₃N, standard-weight ranges versus bracketed isotope numbers, and schematic layouts versus reference geometry. Numerical source conditions/uncertainties are retained or explicitly unavailable, never interpolated.

## Limits and readiness

Ready for review and separately approved integration. Supported chemistry is deliberately limited to nine reference connectivities; consistent unfamiliar graphs receive warnings. No energy minimization, reactions, stability prediction, quantum dynamics, transition-metal coordination or future milestones. Natural abundances are omitted; unknown data is labelled. Common ions are modelled by validated main-group electron counts/configurations, not claims about every free ion’s stability.

Touch viewport tests use desktop Chrome software WebGL emulation. Physical Android/iOS performance, accessibility with screen readers and subjective learning outcomes have not been measured. Progress saves are same-origin and best-effort; molecular workspaces are in-memory and reset on a full reload. Source qualification and uncertainty coverage are limited to what the referenced snapshots supply. The prepared artwork/registration and integration instructions do not alter the existing public arcade.


