# ELEMENTAL v0.2 validation · 15 November 2026

## Baseline and scope

Baseline `a3b9f3c`: original 19 pure ELEMENTAL tests passed, followed by its five-layout browser suite, before implementation. Changes are restricted to `games/elemental/` and the v0.2 implementation plan. Existing unrelated gallery test edits and unfinished Hollow Signal work were preserved. Root gallery/registrations, hidden shortcuts, PHYSICA and deployment configuration were not edited.

## Pure scientific and persistence checks

**50 tests passed**, zero failures: the original 19 plus reaction/discovery/storage coverage. Checks include immutable centralized identities, all nine original reference molecules, proper neutral-element versus ionic/isotope conversion, duplicate discovery sources, independent keys and active state, conservative legacy migration, protection from automatic overwrite of unreadable/newer discovery records, bounded finite stocks, schema/prototype/special-number rejection, actual result/config binding, normalized journal deduplication, capped journal/setups, supported and unsupported trial persistence, and all eleven guided outcomes.

Engine checks cover independently balanced reaction definitions, atom/charge/mass conservation, stoichiometric limiting/excess material and spectators, molecular versus ionic dissolution, miscible/immiscible physical mixtures, finite NaCl saturation/recovery, phases, gas formation, analytical pH, precipitation versus dilution and unsupported extra substances/conditions. No result or prediction is derived from animation state.

`node games/elemental/tests/reaction-accuracy.mjs` ran 33 supported trials, scaling each guided preparation by 0.5, 1 and 2 within stock bounds:

| Check | Observed result |
|---|---:|
| Maximum absolute mass residual | 7.11×10⁻¹⁵ g |
| Maximum elemental residual | 5.97×10⁻¹³ mmol |
| Maximum charge residual | 0 mmol charge |
| Ideal neutralization pH | 12.522878745284245 |
| Error against independent strong-excess pH approximation | 3.91×10⁻¹² |
| Final precipitating free-ion product | 8.70000000000035×10⁻⁹ |
| Relative deviation from specified Ksp | 4.02×10⁻¹⁴ |

These are numerical consistency results for the declared models and fixtures, not physical laboratory accuracy or real-solution yields. Chemical/model sources and qualifications are in REACTION-SCIENCE.md.

## Browser QA

Chrome/Playwright on Windows:

- `v02-workflow.cjs`: neutral H/O selection → catalogue records → searchable/filtered import of H₂/O₂ forms → activated virtual synthesis → H₂O product → reverse catalogue visibility. Verified independent atomic state and molecular construction across reaction work, duplicate-run protection, all eleven guided results/completions, unsupported journals, setup export/import, malformed setup rejection, refresh persistence, legacy migration without old-key modification, and blocked-storage playability. Five viewport layouts, zero page errors, zero external runtime requests.
- `v02-interaction.cjs`: real inventory drag/drop; over-stock input rejected; actual product rotation and zoom; unsupported atomic sodium conversion explained; zero liquid-volume reading after pure-water vaporization; true emulated mobile taps; reduced-motion canvas pixels remain unchanged; Reset preserves journal. Zero page errors.
- Original `browser.cjs`, with only the new Atomic entrance step added: 118 tiles, periodic search/classification/trends/comparison, isotope and ion controls, molecular editing and invalid bond detection, undo/reset, reference loading, 3D rotation/zoom, all twelve Atomic challenges, progress reload, context loss/recovery, cached-page lifecycle and SVG fallback with blocked storage. Five layouts passed, zero page/console errors and zero external runtime requests. Original Atomic chemistry/data fixtures remain unchanged.

Layouts: 1440×1000, 768×1024, 390×844, 320×740 and 844×390, plus resizing from the original suite. No horizontal document overflow in the tested states. Menu, reaction outcome, mobile controls and gas/vapor stage screenshots were inspected. Artifacts are in ignored `test-results/elemental-v02/`, with Atomic regression artifacts in its `atomic-regression/` directory.

## Performance and bounds

One browser sample of 1000 pure reaction calculations across guided cases measured median below the browser's displayed timer resolution, p95 about **0.10ms**, maximum **0.90ms**; sampled JS heap about **6.00MB**. These short figures are environment-specific, not sustained FPS or a memory-leak proof. Reaction drawing uses DPR ≤1.5, at most 22 gas markers and 28 solid markers; the molecular SVG contains at most the selected reference graph. Reaction animation stops outside its active mode and in hidden tabs. Product inspection redraws on changes rather than running a second animation loop. Reduced motion freezes decorative simulation illustration.

## Review findings addressed

Scoped scientific review found that pure ice/vapor retained the starting liquid-volume reading. Added regression assertions and corrected phase-only volume to zero; gas-only synthesis derives its small liquid-product volume from the declared water-density approximation. The vessel now reflects final liquid presence instead of retaining the initial liquid after vaporization.

Scoped storage review found that valid unsupported condition settings could not be journaled and old challenge completion fabricated a C-12 isotope. Storage schema and scientific support are now distinct; valid unmodeled trials persist. Migration grants only proven generic carbon/ion identities, not guessed isotope choices. Result/config binding and automatic migration protection received additional regression coverage. Save feedback distinguishes session-only results from successful persistent saves.

Final whole-branch review found one visual defect: unsupported outcomes removed prepared solid/gas markers despite an unchanged ledger. The renderer now uses unchanged valid ledgers and prepared states, while gating reaction effects to supported outcomes. Four focused model-to-Canvas regression tests cover unsupported solids/gases, real dissolution and phase endpoints. The scoped re-review approved the correction with no new findings. Final pure suite: 50/50; complete workflow and interaction browser suites passed again after the fix.

## Limits and deployment readiness

Physical Android/iOS devices, Safari/Firefox and assistive technologies were not tested. Touch is emulated in desktop Chrome. No service-worker/offline-installation or public deployment was attempted. Atomic workspaces keep their existing in-memory reload behavior; Reaction preparation is separately persistent. The model intentionally omits real kinetics, general mixtures and most equilibria. Reagent colours and animation rates are illustrative; pressure and measured reaction temperature are unavailable.

Static relative production assets are ready for the existing hosting setup after explicit integration/publication approval. The hidden ELEMENTAL path remains unchanged and no second game card or separate Reaction Lab registration exists. **Publication explicitly approved on 15 November 2026 through the existing hidden flask.**

## Approved hidden integration

After the standalone review, the user requested integration while retaining symbol-only access. The existing ELEMENTAL registration remains hidden:true/featured:false and is updated to describe both laboratories. The flask keeps its native game path with a v0.2 cache query; the entry module, Atomic callback module and styles also use versioned URLs so previously cached v0.1 assets are not reused. The physics atom shortcut remains intact; all filters retain 39 visible entries (41 registered, two hidden). The newer visitor-counter commit from main was merged and preserved.

Publication checks: 52 scientific/hidden-registration tests passed. The footer integration browser test now enters both Atomic and Reaction Lab, runs a neutralization, records its journal entry and returns to the Arcade at desktop/mobile widths. No separate Reaction Lab registration exists.
