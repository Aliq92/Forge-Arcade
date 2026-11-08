# CODEX — FIX #10: MANDELBROT EXPLORER
## The Infinite Fractal Update

You are a senior browser-game developer, mathematical visualization engineer, and creative technical artist working inside the existing **Forge Arcade** repository.

**Repository:** https://github.com/aliq92/Forge-Arcade

**Target game:** `games/mandelbrot-explorer/`

Your mission is to significantly improve the visual quality, rendering precision, colour systems, navigation, and performance of **MANDELBROT EXPLORER**.

This is an enhancement of an existing game, **NOT a complete rebuild**.

The finished experience should feel like exploring an infinite mathematical universe.

**Core direction: Beautiful mathematics, accurate fractals, effortless exploration.**

---

## 1. INSPECT BEFORE MODIFYING

Before writing code:

- Inspect all existing Mandelbrot Explorer source files.
- Identify the rendering system: Canvas 2D, WebGL, shaders, or another approach.
- Understand the current Mandelbrot iteration algorithm.
- Review zooming, panning, coordinate mapping, colour calculations, and input controls.
- Identify existing presets, bookmarks, and saved locations.
- Inspect desktop and mobile compatibility.
- Run existing tests where available.
- Identify performance bottlenecks.

Preserve all working features.

Do not modify unrelated Forge Arcade games.

Avoid unnecessary rewrites or dependencies.

## 2. FRACTAL RENDERING OVERHAUL

Improve the sharpness, detail, and mathematical reliability of the Mandelbrot set.

Use the standard recurrence:

z₀ = 0

zₙ₊₁ = zₙ² + c

A point belongs to the Mandelbrot set when its orbit remains bounded as the iteration count increases.

For finite computation, implement an escape-time approximation using an appropriate escape radius.

### Rendering improvements

Introduce:

- Higher-quality fractal edges.
- Smooth colour transitions.
- Reduced pixelation.
- Better detail at higher zoom levels.
- Adaptive iteration limits.
- Improved anti-aliasing where practical.

### Adaptive iterations

Increase the maximum iteration count as the user zooms deeper.

Avoid unnecessarily high iteration counts when viewing the full set.

Use sensible upper bounds for performance.

Make the current iteration limit visible in an optional information panel.

### Numerical precision

Understand the limitations of JavaScript floating-point calculations and GPU shader precision.

At deep zoom levels, ordinary floating-point precision becomes insufficient.

Do not falsely claim unlimited zoom accuracy.

If implementing perturbation or arbitrary-precision calculations, validate them against reference results.

Otherwise, clearly indicate the reliable zoom limit.

Never display numerical artifacts as genuine mathematical detail.

## 3. VIBRANT COLOUR SYSTEM

Introduce several beautiful, customizable colour palettes.

### Suggested palettes

**NEBULA**
- Deep violet.
- Magenta.
- Electric cyan.
- Midnight blue.

**SOLAR FLARE**
- Amber.
- Coral.
- Crimson.
- Golden yellow.

**EMERALD DREAM**
- Emerald green.
- Turquoise.
- Mint.
- Deep teal.

**COSMIC ICE**
- Pale blue.
- White.
- Indigo.
- Cyan.

**PRISM**
- A broad spectrum of vibrant colours.

**MONOCHROME**
- Black, white, and carefully controlled grayscale.

### Smooth colouring

Implement continuous escape-time colouring.

For escaped points, use an appropriate smooth iteration estimate such as:

μ = n + 1 − log₂(log₂|zₙ|)

Ensure the formula is only evaluated when its logarithm arguments are valid.

Normalize colours consistently.

Avoid hard colour banding.

### Interior colouring

Points that do not escape within the current iteration limit must be labelled as numerically unescaped, not mathematically proven members of the Mandelbrot set.

Use a visually coherent interior colour.

## 4. COLOUR CYCLING

Add an optional animated colour-cycling feature.

Allow users to:

- Enable or disable colour cycling.
- Adjust colour cycling speed.
- Change palette.
- Freeze colours at any moment.

Colour cycling must only alter visual presentation.

It must not change the underlying fractal coordinates or iteration data.

Where possible, reuse cached escape-time information instead of recalculating the entire fractal.

Respect reduced-motion preferences.

## 5. SMOOTH ZOOMING

Redesign or improve zoom interactions.

### Desktop controls

Support:

- Mouse wheel to zoom.
- Click-and-drag to pan.
- Double-click to zoom in.
- Keyboard zoom shortcuts.
- Reset view.

### Mobile controls

Support:

- Pinch-to-zoom.
- Touch dragging to pan.
- Double-tap to zoom in.
- Reset view button.

### Zoom behavior

Zoom toward the pointer or gesture focal point.

The mathematical coordinate beneath the pointer should remain stationary during zoom.

Use precise screen-to-complex-plane coordinate mapping.

Prevent accidental jumps in the viewport.

### Smooth transitions

Implement short, fluid zoom animations.

Ensure the display stays responsive during rendering.

Do not allow animations to accumulate or conflict with newer inputs.

## 6. PROGRESSIVE RENDERING

Large fractal computations must not freeze the interface.

Implement progressive rendering.

Possible approach:

1. Display a low-resolution preview immediately.
2. Refine the visible fractal progressively.
3. Increase detail once movement stops.
4. Cancel obsolete rendering tasks when the user changes the viewport.

Use Web Workers, requestIdleCallback, or chunked rendering where appropriate.

Avoid blocking the main thread with large synchronous loops.

### Important

Every render job must have an identifiable generation number or cancellation mechanism.

Old jobs must not overwrite newer viewport results.

## 7. VISUAL ATMOSPHERE

Improve the overall presentation without obscuring the mathematics.

Introduce:

- Elegant dark interface.
- Soft background gradients.
- Refined controls.
- Subtle ambient glow.
- Smooth panel transitions.
- High-quality typography.
- Minimal visual clutter.

Avoid decorative particles covering the fractal image.

The fractal itself should remain the central artwork.

## 8. EXPLORATION TOOLS

Make exploration more enjoyable.

### Coordinate display

Provide an optional information panel containing:

- Current complex-plane center.
- Zoom factor or visible complex-plane width.
- Maximum iterations.
- Current palette.
- Rendering status.

Use appropriate numerical formatting.

Avoid presenting false decimal precision.

### Bookmarks

Allow users to save favourite fractal locations.

Save:

- Center coordinates.
- Zoom level.
- Palette.
- Iteration settings.

Use localStorage where practical.

Validate bookmarks before restoring them.

### Discovery locations

Provide a small selection of interesting mathematical viewpoints, such as:

- Full Mandelbrot set.
- Seahorse Valley.
- Elephant Valley.
- Spiral regions.
- Mini-Mandelbrot formations.

Use verified coordinates and describe them as navigation bookmarks, not fictional gameplay levels.

Do not add unrelated game mechanics.

## 9. OPTIONAL JULIA SET VIEW

Only implement this if the existing architecture supports it cleanly.

Allow players to select a complex parameter and inspect its associated Julia set.

Clearly distinguish Mandelbrot and Julia iteration rules.

Do not prioritize this optional feature over rendering performance and mathematical accuracy.

## 10. RENDERING PERFORMANCE

Target responsive desktop and mobile exploration.

### Optimization techniques

Evaluate:

- WebGL fragment shaders.
- Efficient Canvas rendering.
- Web Workers.
- OffscreenCanvas.
- Tile-based progressive refinement.
- Resolution scaling.
- Cached iteration buffers.
- Adaptive iteration limits.

Choose the simplest architecture that measurably improves performance.

Avoid adding WebGL or workers merely because they sound advanced.

### Performance controls

Provide:

- Quality setting.
- Maximum iteration setting.
- Reduced-effects option.

Automatically choose conservative defaults on slower devices.

Handle browser resize and visibility changes correctly.

## 11. USER INTERFACE

Create a polished exploration dashboard.

### Title

**MANDELBROT EXPLORER**

Subtitle:

"An infinite universe inside a simple equation."

### Interface elements

Include:

- Palette selector.
- Zoom controls.
- Reset view.
- Coordinates.
- Iteration count.
- Bookmark control.
- Colour cycling toggle.
- Settings panel.
- Help/controls panel.

Keep the interface minimal.

On mobile, use collapsible panels.

Avoid covering too much of the fractal.

## 12. ACCESSIBILITY

Support:

- Keyboard navigation.
- Mouse controls.
- Touch gestures.
- Visible focus indicators.
- Readable typography.
- Reduced-motion preferences.
- High-contrast interface options.

Do not rely on colour alone for important information.

Ensure touch controls have adequate target sizes.

## 13. MATHEMATICAL TESTING

Create automated tests covering:

1. Complex coordinate mapping.
2. Mandelbrot recurrence.
3. Known interior points.
4. Known escaping points.
5. Escape-time calculation.
6. Smooth colouring.
7. Zoom focal-point preservation.
8. Pan coordinate consistency.
9. Adaptive iteration selection.
10. Bookmark serialization.
11. Palette switching.
12. Colour cycling.
13. Progressive rendering cancellation.
14. Resize handling.

### Reference points

Validate known cases:

- c = 0 is inside the Mandelbrot set.
- c = −1 is inside.
- c = 1 escapes.
- c = 2 escapes.
- c = −2 lies on the real-axis boundary.

Distinguish provable membership from finite-iteration nonescape.

### Numerical accuracy

Compare computed escape iterations against a trusted reference implementation.

Measure discrepancies at different zoom depths.

Document the precision limits of the selected rendering method.

Do not fabricate test results.

## 14. BROWSER TESTING

Where browser automation is available, test:

- Initial page loading.
- Fractal rendering.
- Mouse wheel zoom.
- Pointer-centered zoom.
- Panning.
- Touch pinch zoom.
- Mobile dragging.
- Palette switching.
- Colour cycling.
- Bookmark saving.
- Bookmark loading.
- Reset view.
- Browser resizing.
- Reduced-motion behavior.

Check for JavaScript errors.

Fix observed defects before delivery.

If browser testing is unavailable, state that limitation.

## 15. VISUAL VALIDATION

Compare before-and-after fractal screenshots.

Verify:

- Sharper boundaries.
- Smoother gradients.
- Improved colour contrast.
- Reduced pixelation.
- No incorrect rendering seams.
- No stale tiles after zooming.
- Clear interface readability.

Test at multiple zoom depths.

Do not sacrifice mathematical correctness for visual effects.

## 16. PRESERVE EXISTING FUNCTIONALITY

Maintain:

- Existing fractal exploration.
- Current working controls.
- Existing palettes where practical.
- Existing bookmarks or saved settings.
- Current navigation behavior.
- Main Forge Arcade integration.

If existing controls conflict with improvements, preserve familiar shortcuts or document necessary changes.

Avoid unnecessary gameplay changes.

## 17. FORGE ARCADE INTEGRATION

Only modify Mandelbrot Explorer and directly necessary supporting assets.

Preserve:

- Main Forge Arcade homepage.
- Other games.
- Card gallery.
- Category filters.
- Navigation.
- Deployment configuration.

Use relative file paths.

Prepare improved card artwork if appropriate, but do not alter shared arcade files without approval.

## 18. ACCEPTANCE CRITERIA

The upgrade is complete when:

- Fractals render more clearly.
- Smooth colouring is implemented correctly.
- Multiple vibrant palettes are available.
- Zooming and panning feel responsive.
- Pointer-centered zoom works.
- Progressive rendering prevents unnecessary interface freezes.
- Obsolete render jobs are cancelled.
- Bookmark saving works.
- Desktop and mobile controls function.
- Numerical precision limits are documented.
- Existing functionality remains intact.
- Automated tests pass.
- No critical rendering defects remain.

## 19. FINAL DELIVERABLES

Provide:

1. Existing implementation analysis.
2. Summary of graphics and rendering improvements.
3. Updated source files.
4. Colour palette documentation.
5. Mathematical validation results.
6. Performance measurements.
7. Before-and-after screenshots, if available.
8. Automated test results.
9. Browser testing results.
10. Known limitations.
11. Deployment readiness assessment.

**DO NOT DEPLOY AUTOMATICALLY.**

Use a development branch where practical.

Do not merge into the live arcade without explicit approval.

## FINAL DIRECTION

Make Mandelbrot Explorer a beautiful, scientifically correct mathematical art experience.

Sharper fractals.

Richer colours.

Precise navigation.

Smooth exploration.

Stable performance.

The mathematics must always remain accurate within the declared numerical limits.

**Inspect first. Improve carefully. Test thoroughly.**