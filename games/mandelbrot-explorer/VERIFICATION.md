# Mandelbrot Explorer — Infinite Fractal verification

Prepared 8 November 2026 on `codex/mandelbrot-infinite-fractal`. This report records the tested development build. The user subsequently authorized Forge Arcade integration and publication. Public verification is recorded separately against the deployed revision.

## Existing implementation

The original game consists of a static HTML document, one compiled JavaScript bundle and a stylesheet. It uses WebGL2, double-single shader arithmetic, an interpolated camera and invalidation-driven rendering. Mouse click/wheel/drag, touch drag/pinch/double-tap, keyboard shortcuts, iteration adjustment, random dives, six named destinations, five palettes, bookmark save/restore/rename/delete and the relative Arcade link already existed.

The original camera could reach half-height 8e-15, beyond a defensible GPU precision claim. Its HUD converted CPU draw-submission time to an apparent FPS value; that did not measure GPU/display FPS. Settled views already stopped requesting animation frames and mobile resolution already had a conservative budget. These useful behaviors are preserved.

Original files are retained under `tests/fixtures/original/`. Existing bookmark key: `mandelbrot-explorer:bookmarks:v1`. There was no existing saved-settings key.

## Implemented improvements and source layout

- Retained the original camera, input classes, destination coordinates and bookmark UI in `assets/index-324e7ec1.js`, with focused fixes and a corrected z0=0 shader iteration counter. Application orchestration moved to the readable `assets/explorer.js`.
- `assets/fractal-core.js`: pure mapping, guarded continuous escape colouring, adaptive iteration selection, palette definitions, preference normalization and bookmark validation.
- `assets/precision.js`: fixed double-double recurrence for final pixels. `assets/refine-worker.js` computes bounded batches in a cancellable background worker. If workers cannot start, the same calculation runs in small main-thread chunks.
- `assets/renderer.js`: approximate GPU navigation preview, generation-based cancellation, packed escape/smooth cache, background refinement upload and inexpensive cached palette presentation. An incomplete refinement is never mixed into the final displayed cache. New navigation terminates obsolete workers; late messages are rejected by job identity/generation.
- `assets/infinite.css` and the existing HTML: dark, restrained panels, optional information, collapsible settings/help/places/palettes, visible focus and touch targets. No decorative particles cover the fractal. Title and subtitle match the brief.
- Preserved all familiar controls. Corrected pointer-centred zoom during interrupted animations, final camera snap/cache synchronization and the initial small drag displacement. Editing bookmark names no longer triggers exploration shortcuts. Reset/Main Set now fit the entire set on portrait viewports.
- Added persistent quality, iteration ceiling, reduced-motion, high-contrast, cycle speed and colour-position controls. Cycling/freeze reuse the same escape data and leave coordinates unchanged. Cycling starts off and is disabled in reduced motion. Hidden views stop animation, cancel pending refinement and clear gestures.
- Kept relative assets/navigation, the shared homepage, gallery, card art, other games and deployment configuration. Only Mandelbrot source and its directly necessary repository test were changed. Optional Julia mode and replacement gallery artwork were not needed.

## Palettes and saved preferences

| Palette | Treatment |
| --- | --- |
| Nebula | Violet/magenta and cyan, with an unclipped cosine envelope |
| Solar Flare | Amber, coral, crimson and gold |
| Emerald Dream | Emerald, mint and turquoise |
| Cosmic Ice | Pale blue, white and indigo |
| Prism | Broad spectrum |
| Monochrome | Equal-channel grayscale |
| Classic / Ember / Ocean / Spectrum | Original palette IDs and coefficients retained |

Modern palettes and phase/cycle speed can be changed without repeating the recurrence. CPU palette helpers and shader presentation use the same cosine parameters. Monochrome was refined to strict grayscale.

New preferences use `mandelbrot-explorer:settings:v1`. Existing bookmarks retain their original key/fields; new bookmarks additionally record iteration ceiling and multiplier. Names are rendered as text; rename/delete remain available. Restores reject nonfinite/invalid values, unknown palette IDs and unreasonable ranges. Supported bookmark centres extend to ±1e6, including valid locations outside the initial set. Legacy views deeper than the supported limit remain stored and open with a visible clamp notice. Storage failures are caught; an unsuccessful save is reported honestly.

## Mathematical validation

Both preview and final recurrence start at z0=0 and use an escape radius of16 (squared magnitude256). Radius16 allows smooth exterior colouring beyond the radius2 mathematical escape criterion. For escaped points, μ = n+1−log2(log2|z|); logarithms are evaluated only with valid escaped magnitudes. Dark pixels are described as finite-iteration nonescape, not a membership proof. c=0 and c=−1 have known bounded orbits; c=−2 is on the real-axis boundary; c=1,2 and1+i escape with the tested radius16 iteration counts.

An initial GPU probe found material deep-zoom discrepancies in the inherited double-single path. Therefore that path is now explicitly labelled an **approximate preview**. It is not presented as final accurate detail. Final pixels use fixed double-double arithmetic in JavaScript, independent of GPU float optimization.

`tests/reference.cjs` implements a separate96-bit fixed-point BigInt recurrence, without production arithmetic helpers or analytic shortcuts. Input Float64 values are converted from their exact IEEE754 bits, not rounded decimal strings. Tests compare production recurrence against this independent reference; browser tests additionally read the actual completed RGBA cache back from the GPU and compare its numerical bytes.

| Half-height | Iteration limit | Production/reference test points | Completed-cache readback points | Escape/count mismatches |
| --- | ---: | ---: | ---: | ---: |
| 1.5 | 300 | 192 | 192 | 0 |
| .02 | 600 | 192 | 192 | 0 |
| 1e-5 | 1800 | 192 | 192 | 0 |
| 1e-8 | 3000 | 192 | 192 | 0 |

RGBA8 stores the escape iteration in two bytes (65535 is the nonescape sentinel), and μ in two bytes at1/16 increments with an offset. Measured smooth-value error was at most0.031114, below the expected1/32 rounding bound. Colours are interpolated after decoding, preventing packed iteration values or the nonescape sentinel from being blended numerically.

**Declared limit:** half-height≥1e-8, up to150 million× relative to the original1.5 half-height. Coordinates/navigation remain Float64; recurrence is fixed double-double, not arbitrary precision or validated unlimited zoom. This sample-based numerical validation is not a proof of every boundary pixel or set membership. Finite iteration limits, finite raster sampling and chaotic boundary sensitivity remain relevant. The UI explains the limit and unresolved boundaries.

Reference context: the standard recurrence and finite escape approximation are described by [Mandelbrot Explorer technical information](https://www.mandel.org.uk/help/2.5/mandel/techinfo). Error-compensated arithmetic is discussed in [Shewchuk's numerical robustness research](https://www.cs.cmu.edu/~quake/robust.html). GPU cache/readback behavior follows the [WebGL2 specification](https://registry.khronos.org/webgl/specs/2.0.0/). These references do not certify this implementation; the numerical results above come from the actual tests.

## Automated results

**385 repository tests passed, zero failed** (baseline369). This includes14 Mandelbrot pure/renderer tests and8 shipped-application performance/lifecycle tests. Coverage includes recurrence, known cases, safe smoothing, mapping, focal zoom, pan, adaptive iterations, all palette IDs, cycling invariance, settings, bookmark validation/serialization, precision clamp, portrait framing, generation cancellation, cache recolour, preview-only navigation, resize, visibility and settled RAF sleep.

Review identified the final snapped-camera/cache mismatch; a failing regression reproduced it, then passed after correction. Narrow-phone testing exposed the drag-threshold displacement issue; it was likewise reproduced and corrected. Independent review rechecked the main lifecycle/cache fixes and found no remaining concrete P1/P2 issue.

```powershell
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs games/molt/tests/*.test.cjs games/particle-lab/tests/*.test.cjs games/button-that-judges-you/tests/*.test.cjs games/ripple-run/tests/*.test.cjs games/mandelbrot-explorer/tests/*.test.cjs
```

Focused checks: `node --test tests/mandelbrot-performance.test.mjs games/mandelbrot-explorer/tests/*.test.cjs`.

The static production build (`node build.mjs`) succeeds. Whitespace validation (`git diff --check`) reports no errors. No runtime dependencies or external assets were added.

## Browser results

Installed Chrome with Playwright. Local URL: `http://127.0.0.1:8428/games/mandelbrot-explorer/`. The committed browser test is `tests/browser.cjs` in this game; set `FORGE_PLAYWRIGHT` if Playwright is not on the module path. It uses the installed Windows Chrome path.

Passed1440×900 desktop,768×1024 tablet,390×844 phone at emulatedDPR2,320×740 with initial OS reduced motion, and844×390 landscape. Tests exercise actual mouse wheel/drag/double-click, pointer-centred interrupted zoom, real CDP touch pinch/drag/double-tap, all six modern palettes, cycling/freeze without recurrence, save/restore/rename/delete and keyboard isolation, reset, settings, optional information/help, persistence across reload, desktop resize, visibility and absence of horizontal overflow. **Zero page or console errors.**

Additional browser checks passed for malformed saves, denied storage, old deep bookmarks and old Ocean palette, unavailable Worker fallback, real WebGL context loss/restoration, and rapid cancellation followed by exact cache/camera agreement. The committed `tests/lifecycle.cjs` also pins restoration of a deep bookmark named Main Set, preventing collision with the discovery preset. Phone tests use emulation rather than physical hardware. Hidden-tab checks dispatch visibility events rather than testing OS process suspension.

Local evidence: [browser-report.json](../../test-results/mandelbrot/browser-report.json), [lifecycle-report.json](../../test-results/mandelbrot/lifecycle-report.json), [full-tests.log](../../test-results/mandelbrot/full-tests.log). Evidence is generated in ignored `test-results/mandelbrot/`.

## Performance findings

The first completed view took approximately0.5–1.8 seconds in the five-layout run. Typical latest-frame CPU processing was around1ms or less; exact values are in the browser report. These are observations on this computer, not Android hardware results or measured display FPS. Settled views sleep; navigation uses previews; colour cycling submits a palette pass without recomputing fractal iterations.

A separate High-quality test measured:

| View | Preview submission | Completed High refinement | Main-thread heartbeat p95 |
| --- | ---: | ---: | ---: |
| Desktop Seahorse Valley | ~18ms | ~4.2s | ~17ms |
| Desktop1e-8,2000iterations | ~7ms | ~24.9s | ~17ms |
| Phone-emulated Valley | ~19ms | ~3.4s | ~18ms |
| Phone-emulated1e-8,2000iterations | ~15ms | ~21.3s | ~17ms |

The heartbeat is a16ms timer measuring main-thread responsiveness, not FPS. Deep High-quality refinement can take **tens of seconds**; navigation remains available and cancels obsolete work. Economy/Balanced use smaller budgets. This is the cost of replacing unreliable deep GPU detail with validated higher-precision calculation, and should be considered before any release. Exact samples: [quality-report.json](../../test-results/mandelbrot/quality-report.json).

Workers produce batches of1024 pixels; fallback uses256. Display density is capped at2 desktop/1.25 coarse, with conservative pixel budgets. Deep Balanced detail is capped350k desktop/180k coarse; High permits700k. High can supersample shallow views up to1.4× linear resolution within its budget. Cached palette interpolation provides smooth preview scaling and supersample downsampling. Higher iteration counts resolve more finite boundary detail at additional cost.

## Before and after screenshots

Desktop Main Set and Valley captures use the same original location coordinates. Phone reset framing deliberately changes to show the whole set. High images demonstrate the optional supersampled mode.

| View | Before | After |
| --- | --- | --- |
| Desktop menu | [Before](../../test-results/mandelbrot/before-menu-1440.png) | [After](../../test-results/mandelbrot/after-menu-1440.png) |
| Desktop set | [Before](../../test-results/mandelbrot/before-full-1440.png) | [After](../../test-results/mandelbrot/after-full-1440.png) |
| Phone set | [Before](../../test-results/mandelbrot/before-full-390.png) | [After](../../test-results/mandelbrot/after-full-390.png) |
| Desktop Valley | [Before](../../test-results/mandelbrot/before-valley-1440.png) | [High](../../test-results/mandelbrot/after-valley-high-1440.png) |
| Phone Valley | [Before](../../test-results/mandelbrot/before-valley-390.png) | [High](../../test-results/mandelbrot/after-valley-high-390.png) |
| Landscape menu | [Before](../../test-results/mandelbrot/before-menu-844.png) | [After](../../test-results/mandelbrot/after-menu-844.png) |

Palettes: [Nebula](../../test-results/mandelbrot/palette-nebula.png), [Solar Flare](../../test-results/mandelbrot/palette-solar.png), [Emerald Dream](../../test-results/mandelbrot/palette-emerald.png), [Cosmic Ice](../../test-results/mandelbrot/palette-ice.png), [Prism](../../test-results/mandelbrot/palette-prism.png), [Monochrome](../../test-results/mandelbrot/palette-monochrome.png).

## Limitations and readiness

Ready for integration following explicit user authorization. Physical Android/iOS, Safari/Firefox, assistive technology and prolonged thermal/battery performance were not available for verification. WebGL2 is still required and has a readable unsupported-browser message. Workers improve responsiveness but do not make expensive deep calculations instantaneous. Approximate previews must be distinguished from completed detail. No arbitrary-precision or Julia mode is claimed. Bookmarks/preferences are local to the browser origin and are not cloud-synchronized.

The existing Forge Arcade route and shared gallery remain intact. The user authorized publication after reviewing the completed update; verify the published source and Arcade launch/return after deployment.
