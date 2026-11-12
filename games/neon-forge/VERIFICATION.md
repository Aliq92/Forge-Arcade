## Subsequent Arcade integration

The user has now requested publication in Forge Arcade. This supersedes the historical local-only boundary below. INTEGRATION.md records the new shared registration/artwork wiring and deployment validation; current gameplay remains the continuous Endless revision.

# Current release — continuous Endless and colour bursts

The user superseded the original campaign/unlock design: one immediately available Endless run, automatic rising levels, a modest bounded challenge increase and richer colour feedback. The original brief remains historical; ENDLESS-PLAN.md defines the revised behavior.

**Latest checks:65 Neon Forge tests /315 combined tests passed, zero failures.** The65 include natural automatic transitions, paused intermission, explicit completed-level records, recurring bosses10/20/30/40+ with capped health, preservation of held rotation, late maintenance choices,late-level pressure bounds, renderer purity and320/80/0particles plus8/3/0shockwaves. Actual seeded mouse and finite-speed keyboard policies complete through level21; a keyboard policy reaches level61 at capped pressure. A100ms observation policy also clears boss20. These are normal control/advance APIs with no health, score or level edits; tested policies took zero damage.

Browser report: test-results/neon-forge/browser-endless.json. One Start and no unlock button/Continue dialog; native Perfect, keyboard rotation/held-Enter guard and pause; automatic1→2; intermission paused/resumed without losing its timer; automatic play through21 with bosses10and20 and upgrade selection every3; no forced win; saved highest-cleared20 and legacy score retained through reload; actual failure/Retry; native touch aim/strike, reduced effects, pause/settings and orientation changes at390×844,320×568,844×390. Zero runtime/resource errors. Browser long-run time is accelerated through the real Game APIs; native input checks run in real time.

New screenshots inspected: colour-perfect.png, endless-menu.png, endless-upgrade.png, endless-level21.png and endless-touch-390/320/844.png. Bursts stay behind threats; level palette changes reuse one cache; reduced motion clears rings/fragments. Precision geometry and normal shield rules are unchanged.

Latest six-case integrated maximum-effects benchmark is PERFORMANCE.json:1440×900/DPR1.5, stage5, boss8 or normal16 threats, particles320/80/0, measured maximum shockwaves8/3/0. Draw median/p95 ms: boss high1.7/3.3, low1.1/2.6, reduced1.1/1.6; normal high1.7/3.4, low1.4/7.9, reduced0.9/1.3. Median/p95 frame intervals respectively12.5/17.3,11.5/17.5,10.2/17.2,12.7/18.6,13.4/22.3,7.4/9.5ms. Native keydown-to-next-draw samples5.0–15.8ms (one each). Cache rebuilds during steady samples0. Short retained heaps roughly2.47–2.59MB; counts fluctuate with transient HUD nodes and do not prove long-term memory stability. Synthetic fixtures deliberately replenish bounded effects; they are not evidence of human play or physical-device FPS. Maximum recorded interval66.5ms shows scheduling outliers. All six cases passed with no browser/network errors.

Independent review found no actionable runtime defect and resolved every literal DOM reference. Legacy saves preserve old scores/preferences while allowing immediate play. The original six-case campaign measurements and acceptance narrative below describe the initial release, not the current product flow or latest timings. See README.md for current controls/rules.

**Still local-only and unpublished.** The existing static build succeeds. No homepage, registry, shared stylesheet or other game changed. Physical phone/Safari/Firefox/controller checks remain outside available verification.

---

# Initial release verification (historical)

Verified locally on13 November2026 MYT. Development branch `codex/neon-forge`, based on published Forge Arcade main `c66aa9d71d57783254af3f9d935c2f7756b9e4cc`. The supplied build brief is preserved as BRIEF.md.

## Complete standalone scope

Playable central robot aiming/striking; four geometric target types; exact radial/angular collision and Perfect timing; capped combos, scores, shields and invulnerability; ten authored waves and truthful summaries; six functional upgrades; three-phase Forge Heart; victory and guarded Endless unlock; bounded seeded Endless with periodic choices; local records/settings; native menus, pause, Retry and Arcade return. Five performance-driven arena stages, cached geometry, pooled effects, quality/reduced-motion settings and opt-in procedural audio are implemented.

Prepared pixel-art WebP, correctly framed gallery SVG fallback and actual-format registration are under this game's own folder. No live registry, homepage, shared CSS, other game or deployment configuration changed. No merge, push, deployment or publication was performed.

## Automated evidence

**54 Neon Forge tests pass**, plus the existing180 root checks and70 Lumenworks checks: **304 combined, zero failures**. This does not claim every other nested game's independent suite was rerun.

- Combat: normalized aiming and finite-speed rotation; edge-trigger strikes/recovery; exact arc/reach and100ms nominal Perfect band; one registration per target/attack; hit score and capped multiplier; shell durability; fair splitting with deferred alive-cap children; escape removal/invulnerability; whiffs, gameover, reset and pause.
- Actual effects: bounded nonrecursive Chain; Pulse heal/cap; Time Bend duration/rate/cooldown without slowing input; Wide Arc geometry; delayed half-damage Echo preserving original direction and respecting inactive states; Keeper consumption/refresh; reset/accuracy/ID behavior; late-Endless maintenance transition reward.
- Content: all ten valid distinct wave definitions and finite reaction windows;240 deterministic Endless schedules with bounded speed/count; all486 permanent-upgrade level combinations and valid three-choice maintenance fallback.
- Seeded no-bypass play: actual aim/rotation/strike APIs complete all ten waves and all boss phases for seeds1/42/987, both mouse policy and3.5rad/s keyboard policy; every wave falls within25–60s under those policies. A100ms-observation keyboard policy also wins. Endless keyboard policy clears15 waves. These are automated feasibility tests, not human difficulty or enjoyment studies.
- Persistence/input/audio/render: malformed/blocked saves, own-key isolation, guarded unlock and nondecreasing records; mouse/touch/keyboard mapping, held-key suppression, capture cancellation and editable-control guards; opt-in audio/volume/8voice cap/pause/API failure; projection/protected bounds, frozen-model render purity, five distinct cached stages, exact wedge/boss display and320/80/0 effect bounds.
- Prepared integration: runtime assets/imports resolve locally; correct Games metadata and visible-only counts;960×540 lossless pixel artwork;640×360 SVG fallback; live registration remains absent.

## Browser playthrough

Installed Chrome157, Playwright, local HTTP server. Raw report `test-results/neon-forge/browser.json` records zero page/resource errors.

| Check | Observed result |
| --- | --- |
| Menu and start | Start available; Endless initially locked |
| Native desktop combat | Mouse aim + actual click scores a Perfect; native D rotation changes facing |
| Native keyboard lifecycle | Escape pauses/resumes; paused model/queued effects stay frozen; focused STRIKE holding/repeating Enter cannot autoattack |
| All ten waves | Complete actual Game-policy playthrough inside the browser, with normal aim/strike/advance; no score/shield/wave/victory edits |
| Summaries / upgrades | Actual DOM Continue and upgrade-card selection; three choices at3/5/7/9; active time frozen during selection |
| Forge Heart | Phase2/3 screenshots, real vulnerability damage and guarded victory; all phases observed |
| Victory | Result/rank/records, Endless unlock, decorative particles expire while combat time remains frozen; Replay/Endless immediately available |
| Endless | Reload retains unlock; three actual generated waves completed, periodic upgrade selected, wave4 reached; separate highest-completed-wave record3 |
| Failure / Retry | Unattended real simulation loses shields and ends; explicit Retry restores wave1, three shields, zero score and no prior upgrades |
| Touch | Native tap/drag aim does not attack; dedicated STRIKE hits real target at390×844,320×568,844×390 |
| Mobile menus/settings | Pause, opt-in sound/volume, low quality/reduced motion, Resume; preferences persist across reload |
| Resize | Each touch layout resized to opposite orientation; no horizontal page overflow; Strike remains at least44×44 |

The long browser run accelerates active simulation through the same Game APIs to exercise every wave, while real UI controls perform starts, summaries, choices, Retry, settings and mode transitions. Separate native combat checks use real-time mouse/keyboard/touch. No claim is made that an unassisted human campaign was played or that physical phones were tested.

Screenshots inspected: menu-desktop.png, first-perfect.png, upgrades.png, boss-phase2.png, boss-phase3.png, victory.png, endless.png, touch-390.png, touch-320.png, touch-844.png under ignored test-results/neon-forge. The arena and center remain clear of persistent HUD, including short landscape. Shapes, cracked shells, child markers and core state supplement colour. Pixel card artwork is prepared locally and is not a screenshot of the live Canvas renderer.

## Measured maximum-load performance

`PERFORMANCE.json` is the final independent rerun of the permanent harness. Six integrated-main-loop scenarios:1440×900 CSS pixels, requested DPR2 capped1.5, visual stage5, real core/input/DOM, boss active cap8 or Endless cap16, and continuously replenished pooled effects at320 high /80 low /0 reduced.120 measured frames after30 warm-up frames per scenario. These are explicit synthetic stress fixtures, separate from gameplay-completion evidence. Shields stayed at the ordinary3 during samples; no health bypass was used.

| Fixture | Effects | Draw median / p95 | Frame interval median / p95 |
| --- | --- | --- | --- |
| Boss | High |1.9 /3.3ms |12.1 /17.6ms |
| Boss | Low |1.3 /2.7ms |10.8 /16.1ms |
| Boss | Reduced |1.1 /1.7ms |9.5 /15.2ms |
| Endless | High |1.5 /3.1ms |11.9 /16.9ms |
| Endless | Low |1.0 /2.0ms |10.2 /16.2ms |
| Endless | Reduced |0.9 /1.8ms |8.8 /13.8ms |

Native Space reached an accepted visible attack in5.4–14.0ms across six individual keydown-to-next-completed-draw samples. This excludes keyboard hardware, audio, GPU presentation and display latency. Maximum observed interval was102.2ms in one reduced-Endless sample; median/p95 were much lower. Browser scheduling/automation can create outliers and headless scheduling can exceed physical refresh rates.

No arena cache rebuild occurred during steady samples. Three forced-GC samples per scenario retained about2.44–2.53MB JS heap; final-minus-first increases ranged3.6–43.7KB. Document count stayed1 and listeners83; DOM counts varied286–298 as transient HUD elements changed. This short observation is not a leak proof or a long-session/thermal test. Canvas backing memory is additional browser-managed storage.

No browser/network errors occurred. Desktop headless measurements do **not** establish physical Android/iPhone frame rates. Physical devices, Safari, Firefox and controller mapping were unavailable or outside this build; no controller support is claimed.

## Review fixes and build readiness

Observed and fixed with tests: Splinter child overflow, a same-step escaped target overwriting boss victory, chain budgets being spent on primary victims, redundant Keeper maintenance rewards, frozen victory effects, and focused Enter autorepeat. Secondary labels are bounded and vertically separated. Independent final runtime review found no remaining concrete defect.

The existing static production build succeeds; all runtime files are relative/offline-local and the new game's tests are excluded by the existing build filter. README explains controls/rules, persistence, limits and reproducible commands. `integration/README.md` describes future shared card/registry changes using the existing aligned pixel pipeline. Unrelated local changes remain untouched.

**Ready for a separate Forge Arcade integration request. Not published.**
