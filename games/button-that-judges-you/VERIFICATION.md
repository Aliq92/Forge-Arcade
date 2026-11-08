# Fix #07 — The Judgment Chamber

Verified build, 8 November 2026. The user subsequently authorized integration and publication to Forge Arcade. Only The Button That Judges You is changed. The arcade homepage, other games, gallery cards/thumbnails, categories and deployment settings remain unchanged.

## Existing game and retained behavior

The original single HTML document was a museum exhibit with a circular button, 49 stage-specific judgments, a first-press line, a sincere two-line gag, five changing placards, administrative surprises and a decoy. It had no saved progress, reset control or audio. Original source is retained in `tests/fixtures/original.html`.

The five original stage thresholds remain exact: Mild Curiosity through press 5, Concern through 15, Investigation through 30, Containment through 50, and Full Nonsense thereafter. Every original judgment and placard is preserved in `content.js` and checked against the fixture. First press still reads “You pressed it. Bold start.” The decoy still appears at 40 presses and counts as another accepted press. Its original “That was, in fact, the button” response remains.

Original incidental gags are reinterpreted as safe chamber reactions: changing size, a playful escape, audit/incident/intercom/threat notices, do-not-press lettering, a tiny break, closing time and pointless recalibration. Threat-level variants and museum announcements are retained; one announcement about the visitor being agitated is replaced by a neutral joke about encouraging other exhibits. The original bright flashes, false displayed count and 1.25–2-second input locks are deliberately replaced by restrained wall displays and nonblocking effects. The counter always shows actual accepted presses. The sincere follow-up is canceled if another press arrives, avoiding the original stale-timer overwrite problem.

## Visual and interaction improvements

The room uses charcoal/plum aged walls, perspective floor seams, small amber symbols, a ceiling fixture with a fading light cone, restrained drifting fog and shifting shadows. A large glossy crimson cap, metallic ring, visible press depth, mechanical pedestal, plaque and bolts give the central button a physical identity. Pressing creates immediate depth and a subtle floor pulse. Typography is expressive and readable; mobile landscape places the judgment beside the pedestal. No horror imagery, sharp flashes or jump scares are used.

The menu uses the requested title and subtitle, “It has opinions. Unfortunately.”, with an Enter the Chamber button. Count, sound, Calm effects and confirmed Reset are in the header. Museum placards and seven discoveries sit in optional Chamber notes. Unfound discoveries are unnamed. Interface targets are at least 44px, and judgments remain clear of the main button at all tested sizes. Arcade return links are available from both menu and chamber.

Mouse and touch use the native button click as the single activation path. Pointer Events supply immediate press-depth feedback. Enter/Space are handled once when the main button or chamber is focused; held keys do not repeat, and native keyboard clicks are prevented from doubling the count. A 180ms debounce rejects accidental double activation. Events never disable the main button or force the player to wait through their animation.

Calm effects initially follow the operating system's reduced-motion choice. They remove escape/resize movement, idle animation, rotating/falling confetti and decorative motion. Essential press depth remains immediate. Lighting changes are slow and restrained; Disco becomes a static tint. Sparse celebratory paper stays stationary and fades.

## Source files

| File | Responsibility |
|---|---|
| `index.html` | Menu, physical button, minimal HUD, notes and reset-confirmation dialogs |
| `chamber.css` | 2.5D button/pedestal, responsive layout, styling and motion preferences |
| `content.js` | 120 new judgments, original messages/placards and discovery definitions |
| `judgment.js` | Seeded selection, stages, events/cooldowns, accepted presses, achievements and records |
| `effects.js` | Bounded, reusable full-screen confetti pool with separate visual randomness |
| `room.js` | Cached procedural chamber and gentle room reactions |
| `chamber.js` | Single input/RAF lifecycle, DOM synchronization, optional audio and persistence |
| `card-art.svg` | Standalone 1200×675 chamber/button illustration, not connected to the gallery |
| `tests/` | Core, content, confetti and long-session tests, browser QA and original fixture |

The implementation remains native Canvas, CSS and JavaScript with relative assets and no external dependencies or network services.

## Judgment and surprise systems

There are **120 original new messages**, 20 in each requested category: Sarcastic, Compliment, Absurd, Mysterious, Fourth-wall and Rare. They join the 49 original stage judgments and the original first/sincere lines. Humor teases the interaction and fictional administration. Selection excludes the previous visible judgment across the whole accepted press, including when an event replaces an interim selection.

`judgment.js` contains all category weights and all **27 event definitions**, each with weight, duration, cooldown, stage gate and minimum press count. Its seeded LCG permits deterministic reproduction in tests. The UI starts with a fresh random seed; the current generator state is persisted with the record. Cosmetic confetti uses its own generator and cannot perturb the judgment/event sequence.

Regular event selection rolls at `0.30 + stage × 0.04` when no event is active and the global cooldown allows it. An eligible weighted event is selected after that roll. Per-event cooldowns run for 8–30 simulated seconds; immediate repetition of the same event is excluded. The global event gap is 1.1 seconds. One room event exists at a time. Milestones and special rare approvals may replace it; all replacement/expiry state is centrally owned instead of accumulating timers.

| Signature event | Duration | Reaction |
|---|---:|---|
| Confetti | 2.8s | Paper shower, floor pulse and warm room wash |
| Lights out | 1.5s | Gentle dimming; judgment and button remain visible |
| Disco | 3.5s | Slow colour wash and Chaos Authorized discovery |
| Multiplication | 2.2s | Decorative fake buttons; they never intercept input |
| Escape | 1.2s | A bounded sideways movement, then return |
| Reverse judgment | 1.8s | The button makes fun of its own very limited job |
| Mystery gift | 2.4s | A small present and harmless delayed reveal |
| Golden Button | 3.6s | Golden cap, rare approval, discovery and confetti |
| Suspicious silence | 1.4s | Ellipsis, then an absurd line after 0.65s |
| Room celebration | 3.4s | Larger confetti shower and rare approval |

Other events retain the museum's administrative personality. The original sincere follow-up remains available from 60 presses. Delayed gift/silence/sincere text is canceled by a new accepted press or Reset. No event exceeds 3.6 seconds, and presses continue during it.

Presses 10, 25, 50 and 100 celebrate. If Golden Touch has not been found naturally by press 50, that milestone uses Golden Button, avoiding an excessive search for this secret. Later golden events can still occur through weighted selection.

## Confetti and discoveries

Confetti has **320 preallocated reusable pieces**. Bursts distribute paper across the viewport and around the pedestal, using several shapes, sizes, colours and gentle rotations. Typical bursts request 160 pieces, rare/golden 220, and celebrations 280; overlapping requests share the same 320-object cap. Pieces expire after 3.5–4.3 seconds or leaving the screen. Effects resize with the viewport, never block input, and clear on Reset. Calm mode requests at most 18 stationary pieces per burst and caps the total at 36, fading after 1.4 seconds.

Seven local discoveries: First Judgment (one press), Persistent Human (25), Professional Button Presser (100), The Room Likes You (rare positive approval), Chaos Authorized (Disco), Golden Touch, and the original Persistent For No Reason (50). Each unlocks once, with short combined notifications. No discovery is required to continue playing.

Optional Web Audio provides a gentle mechanical click, low hum, lighting cue and soft celebration/rare tones. Sound starts off for new visitors; no AudioContext is created before a user gesture. It respects mute and hidden/dialog states. The browser test muted hardware output while exercising the Web Audio path; real speaker comfort was not measured.

## Saved progress and reset

The isolated key is `forge.judgment-chamber.v1`. The original game had no save to migrate. Records contain only version, accepted press total, discovery IDs, fictional employee ID, sound/effects preferences and RNG state. Temporary events, confetti, pending follow-ups, DOM states and animation timers are not saved.

Records are validated before use. An unreadable record is preserved and protected from automatic overwrite while the player can keep playing. Unavailable/full storage produces a status message without breaking the chamber. Reset opens a confirmation dialog; Cancel changes nothing. Confirm clears counters/discoveries/temporary effects and replaces the local record, preserving sound and motion preferences. Other games' storage is untouched.

## Automated and browser verification

**351 tests passed, zero failures**: existing 334 checks plus 17 game tests. The production build succeeded.

```powershell
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs games/void-drifter/tests/*.test.cjs games/echo-runner/tests/*.test.mjs games/echo-miner/tests/*.test.mjs games/elemental/tests/*.test.mjs games/molt/tests/*.test.cjs games/particle-lab/tests/*.test.cjs games/button-that-judges-you/tests/*.test.cjs
node build.mjs
```

Tests cover original content/stages/decoy, first press, debounce and count, reproducible/nonrepeating selection, weighted eligibility/cooldowns, Golden Button, milestone confetti, discoveries, stale follow-up cancellation, event cleanup, pause, record validation and round-trip, protected/blocked storage, confirmed reset and pooled/reduced effects. A regression explicitly covers seed 660's milestone-message repeat and 100 other seeds.

The recorded long-session run used seed 7707 and **1,000 accepted presses** over 200 simulated seconds. It exercised **25 of 27 configured event types**, unlocked all seven discoveries, retained a valid reloadable record, reached but never exceeded **320 confetti pieces**, and ended with zero pieces/no active event after expiry. The next press was accepted. Core tests also compare identical 1,000-press seeded runs.

Chrome browser QA passed **1440×900, 768×1024, 390×844, 320×740 and 844×390**, including real mouse/keyboard and emulated touch, entering, first press, held-key suppression, double-click debounce, Golden Button/full-screen paper, pressing during surprises, decoy counting, notes/discoveries, save/reload, mute, Reset Cancel/Confirm and active-event cleanup. The desktop pass explicitly exercised all ten signature events. Separate browser contexts verified blocked storage and protected corrupt records. Long judgments were checked for overlap/overflow; screenshots were inspected on desktop and phones. Console/page errors: **0**.

The visibility branch was tested with dispatched events and a synthetic hidden value: RAF and simulation froze, then resumed with reset frame timing. This does not establish real OS/browser background lifecycle behavior on phones. The 390px layout used a 2× display scale and verified a 1.5× Canvas DPR cap. The 320px layout began with OS reduced motion enabled. One game RAF chain remained throughout.

Rerun `node games/button-that-judges-you/tests/browser.cjs` with this repository served on `http://127.0.0.1:8428/` and `FORGE_PLAYWRIGHT` pointing to an installed Playwright module.

Independent review found two defects: a rare milestone could repeat the previous visible judgment, and resetting during Golden Button could leave its CSS styling behind. Both were reproduced by regression checks, fixed and reviewed again. No blocking issues remained in the final read-only review.

## Performance measurements

The original Fix #07 Chrome frame-work samples used **320 confetti pieces with full effects**, over 1.7 seconds after clearing samples. These measure JavaScript work, Canvas submission and DOM synchronization; they are not GPU completion times or displayed FPS.

| Viewport | Mean frame work | 95th percentile |
|---|---:|---:|
| 1440×900 | 1.00ms | 1.90ms |
| 768×1024 | 0.98ms | 1.80ms |
| 390×844, DPR 1.5 cap | 1.05ms | 2.00ms |
| 320×740 | 0.95ms | 1.80ms |
| 844×390 | 0.86ms | 1.50ms |

The room texture/gradients are cached, confetti is bounded/reused, effects use elapsed time, and no expensive full-screen blur is used. CSS handles button depth and simple transforms. Hidden tabs cancel the RAF chain and silence ambient audio; dialogs pause room time. There are no per-event timer chains or repeated input registrations.

## Evidence, limitations and readiness

- [Before desktop](../../test-results/judgment/before-1440.png) · [After chamber](../../test-results/judgment/after-room-1440.png)
- [Menu](../../test-results/judgment/after-menu-1440.png) · [Golden Button](../../test-results/judgment/after-golden-1440.png)
- [Phone portrait](../../test-results/judgment/after-golden-390.png) · [320px calm view](../../test-results/judgment/after-room-320.png) · [Landscape](../../test-results/judgment/after-room-844.png)
- [Disco](../../test-results/judgment/event-disco.png) · [Multiplication](../../test-results/judgment/event-multiply.png) · [Notes](../../test-results/judgment/after-notes-390.png)
- [Prepared SVG card](card-art.svg) · [Card preview](../../test-results/judgment/card-preview.png)
- [Browser report](../../test-results/judgment/browser-report.json) · [Long-session record](../../test-results/judgment/long-session.json) · [Test output](../../test-results/judgment/full-tests.log)

Evidence lives locally in ignored `test-results/judgment/`.

Physical Android/iPhone, Safari, assistive-technology behavior, real background-tab transitions, prolonged thermal/battery effects and speaker levels remain unmeasured. Mobile checks use desktop Chrome emulation. Performance varies with hardware/load. The save is browser-local and has no cloud synchronization; simultaneous open game tabs can overwrite each other's latest records. There is no guarantee that all rare outcomes appear in a short session; Golden Touch has the explicit 50-press fallback. The brief's optional haptics were not added. The prepared card remains unwired, preserving the existing gallery.

Integration and publication were authorized after local verification and review. This report records the tested source; public deployment is confirmed separately against its GitHub revision.

## Side-wall colour follow-up

Both perspective side walls change to a different muted colour on every accepted press, including the decoy. Eight colours cycle without consecutive repetition, with a 0.32-second fade; Calm effects use a stationary colour change. Colours derive from the saved press count, so reloading preserves the current colour without consuming judgment/event randomness. Reset restores the original neutral wall colour. Only the side-wall polygons are tinted. The room asset version is 7.1 to refresh cached clients.

Two added tests verify colour changes, transition settling, unchanged-count behavior, reset and isolation from game randomness. A dedicated browser check verified actual left/right Canvas pixel changes from real mouse/touch input at 1440×900, 390×844, 320×740 (Calm) and 844×390, with zero page errors. See local walls-local-report.json and walls-public-report.json in test-results/judgment after deployment verification. The previous performance table describes the original Fix #07 benchmark; the colour-only follow-up did not rerun that full benchmark.
