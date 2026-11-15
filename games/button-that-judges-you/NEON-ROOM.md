# FIX #20 — The Repeat Offender neon room

Implemented on `fix/20-neon-joker-room`. No deployment or remote push.
The user's follow-up replaces the proposed jester with a repeating geometric sigil.

## Existing room and preserved behavior

FIX #07 is present. The original room uses a Canvas 2D background cached on resize,
muted colour-changing side walls, perspective floor lines, a crooked ceiling light,
haze and small wall ornaments. DOM elements supply the red button, pedestal,
judgment text, dialogs and controls. The existing controller owns one animation
loop, visibility pause, local records, synthesized audio, effect preferences and
pooled confetti. Six judgment categories and 27 special events already exist.

The judgment content, event selection, button interaction and audio implementation
are preserved. The floor, panels and wall colours extend the existing chamber.
Only files inside this game's directory changed. Shared navigation, homepage,
other games and deployment configuration are untouched.

## Visual implementation

- Original inline SVG: seven repeated geometric sigils inside a hexagonal frame.
  SVG `use` reuses one small shape. No downloaded art or runtime dependency.
- “THE REPEAT OFFENDER / ONE PRESS. NO REFUNDS.” wall sign.
- Registered CSS colour property interpolates purple, cyan, pink, green, orange
  and blue over ten seconds. Gentle five-second brightness breathing.
- Ceiling, wall and floor edge LED strips; two slow segmented equalizer panels.
- Cached wall inlays and a subtle two-tone perspective floor.
- Existing frame state controls short press lighting and six category hues:
  sarcastic violet, compliment orange, absurd cyan, mysterious blue,
  fourthwall pink and rare gold. Existing rare/golden/celebration/disco events
  sustain coordinated light emphasis and clear it when the event expires.
- Decorative elements ignore pointer input and sit behind the gameplay layer.
- Portrait places the sign above the judgment; landscape reserves a separate
  region. Text backing protects judgment contrast.
- Calm effects and OS reduced motion disable decorative animation. OS preference
  takes priority over saved effects, including live changes. Dialogs and hidden
  pages pause the décor; no additional timers or animation loops were introduced.
- Existing opt-in sound, quiet hum, mute control and rare cues are retained.

## Executed validation

Baseline: all three existing Node test files passed before changes.
Final: 17 individual Node tests passed using:

```sh
node --test --test-isolation=none games/button-that-judges-you/tests/*.test.cjs
```

With a static server at port 8428 and Playwright available:

```sh
CHROMIUM_PATH=/usr/bin/chromium node games/button-that-judges-you/tests/browser.cjs
CHROMIUM_PATH=/usr/bin/chromium node games/button-that-judges-you/tests/walls-browser.cjs
CHROMIUM_PATH=/usr/bin/chromium node games/button-that-judges-you/tests/neon-browser.cjs
```

All three browser scripts passed. Existing scripts now accept `CHROMIUM_PATH`
instead of requiring a Windows Chrome installation; output directories are
created automatically. `FORGE_PLAYWRIGHT` can specify an installed module path.

Gameplay regressions: five viewports, mouse/touch/keyboard presses, debounce,
golden events, confetti, reset/cancel, decoy, saved progress, discoveries, mute,
visibility pause and single pending animation loop. Wall regression: both side
walls change on every press and reset restores their initial colour.

Neon checks: 1440×900, 768×1024, 390×844, 320×740, 390×667, 844×390 and 667×375.
Verified sign visibility, touch input, no sign/button/text overlap (including the
longest judgment), all six category responses, all 27 event hooks, palette stops
and interpolation, LED animations, reduced motion, saved preferences, dialog
pause, resize and cleanup. No page or console errors were reported.

Visual QA found sign/speech overlap at desktop and landscape and a small
sign/button overlap at 667×375; responsive spacing and sign sizes were corrected
and the complete neon suite passed afterward. Final desktop and portrait
screenshots were visually inspected.

`node --check chamber.js` and `git diff --check` also passed.

## Performance and limits

Final headless Chromium gameplay samples measured mean JavaScript frame work of
0.66–3.00 ms and p95 of 1.0–6.4 ms across five layouts during capped confetti.
Exactly one pending game animation frame, at most 320 confetti pieces, and DPR
at most 1.5 were verified. These are controller timing samples, not complete GPU
frame times or a physical Android benchmark. CSS uses two bounded sign shadow
passes; there is no full-screen animated blur. Cached Canvas decoration adds no
per-frame procedural painting.

Physical Android, Safari and Firefox were not tested. Smooth registered-colour
interpolation targets current browsers supporting CSS `@property` (older browsers
may step between colour stops). Extreme viewport sizes outside the tested set
have no browser QA claim. No new audio assets were needed.

## Review artifacts and readiness

Before/after screenshots and JSON reports are in
`/workspace/artifacts/neon-joker/` in this workspace. `before-1440.png`,
`before-390.png`, `before-844.png` show the original FIX #07 room;
`after-1440.png`, `after-390.png`, `after-320.png`, `after-844.png` and
`after-667.png` show the repeating sigil room. Reports are `browser-report.json`,
`neon-report.json` and `walls-local-report.json`.

Ready for code review and a deployment decision after any desired physical-device
checks. Remains on its separate local development branch; nothing was deployed.
