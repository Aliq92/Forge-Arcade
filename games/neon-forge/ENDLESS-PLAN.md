# Endless flow + colour burst update

User steering supersedes the original campaign/unlock requirement: one instantly available Endless run, automatically rising levels, a modest difficulty increase and richer colourful hit feedback. Keep precision combat/controls stable, no live Arcade publication.

## Binding update contract

- Game is now always mode=endless, default unlocked, with no campaign victory gate. Legacy constructor mode values may normalize toendless. `getWave(number,mode,seed)` provides the same Endless progression regardless old mode; exported authoredWAVES may remain as boss/template/reference data, not a product mode.
- States ready/playing/intermission/paused/upgrade/gameover. Clearing a level grants its summary/bonus, sets `completedLevels` to that level, and enters0.9s intermission. `advance()` steps playing and intermission. Intermission advances run time but no threats/attacks; after0.9s automatically begin next level, or show3 upgrade choices after every third level. No Continue button. `nextWave()` can remain an internal compatibility helper for intermission. `chooseUpgrade()` starts the next level. Pause/resume must preserve intermission and its remaining timer; reset clears all progress. Aim/held rotation may persist across automatic intermission; pause/upgrade still clear input.
- Every tenth level is a recurring Forge Heart. Defeat grants `bossDefeat`, clears remaining arena threats and enters normal intermission, not victory. Boss HP12 atlevel10,14 at20,16 at30,18 thereafter. HP phase thresholds use two-thirds/one-third maxHP. All remain reachable at radius104 during the telegraphed window; max3hits/window. Normal level generation has gradual bounded density and speed (start~50, cap78), two-lane bursts only, minimum beat~2.0s; no indefinitely increasing speed. Keep active caps16 regular /8 boss and finite children queue.
- `completedLevels` is explicit and updates only after actual completion. HUD says LEVEL N; no /10, campaign gate, separate Endless button or forced win. Main menu has one Start. High scores show best run / highest completed level; legacy save key/data stays readable and old score fields are preserved. New run records use modeendless. Do not reset saved settings.
- Root frame accepts intermission as live transition, without opening dialogs or clearing held rotation. Show a short nonblocking LEVEL N banner and summary; upgrades retain deliberate paused selection. End/retry/pause/settings continue normally.
- Renderer visual-only changes: multi-hue hit fragments, larger Perfect/combo/boss bursts, bounded expanding shockwaves and richer evolving arena accents. Effects behind targets, no full-screen rapid flashes. Preserve320/80/0 particle caps and add at most8/3/0 shockwaves high/low/reduced; no collision changes. `level` and `bossDefeat` event types accepted. Snapshot/caches depend on slow-changing level tint, not per-frame recomputation. API Renderer remains unchanged.

## Domains / checklist

- [x] Core owner: game.js/waves.js and combat/boss/simulation/wave/upgrade-effect/transition test adaptations; owns these only.
- [x] Visual owner: renderer.js and renderer tests only; presentation can't mutate gameplay.
- [x] Root: main/index/style/storage/input/audio and their tests, browser/performance harness adaptation, records migration, docs and final local commit.
- [x] Verify automatic1→2, upgrades3→4, recurring bosses10→11/20→21, pause/intermission, seeded late-level challenge feasibility, native desktop/touch and bounded maximum colour effects. Independent review and no publication.

Final evidence:65 game /315 combined tests; native browsercontrols and automatic progressionthrough21 withbosses10/20, records/legacy migration andtouch390/320/844 passed. Sixmaximumcolour benchmarks passed withboundedparticles/rings. Independentreview foundnoactionableissues. No publication.
