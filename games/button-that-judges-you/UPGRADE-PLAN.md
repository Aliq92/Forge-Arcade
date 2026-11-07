# Judgment Chamber implementation plan

Implement the user's Fix #07 brief as a local update only. No publication, gallery/card-system edits, dependencies or unrelated game changes.

Analysis: original single HTML document has five stages at 5/15/30/50 presses, stage-specific messages and placards, first-press line, sincere follow-up, employee ID, decoy at40, and administrative/random gags. No original storage, reset or audio exists. Preserve all original message banks/placards and decoy counting. Reinterpret intense flash/long input locks as restrained wall notices and short visuals, per the new brief. Maintain exact stage thresholds; keep counters truthful.

Architecture: content.js preserves legacy data and adds120 new judgments (20 per requested category). judgment.js is a seeded pure controller: 180ms accepted-press debounce, central weighted events/cooldowns, seven small achievements, milestone confetti, safe delayed follow-up cancellation and versioned persistence without temporary events. room.js handles the procedural 2.5D room and bounded confetti pool. chamber.js owns DOM, one input registration and RAF, optional gesture-unlocked audio, visibility-safe pause, preferences and confirmed reset. chamber.css creates the crimson physical button/pedestal, readable speech area and responsive overlay/menu. No framework or remote assets.

Visual design: charcoal/plum aged walls and a perspective floor, ceiling fixture/light cone, restrained fog/shadows and amber symbols. The glossy elliptical crimson cap sits in a metallic ring on a mechanical pedestal; press depth is immediate. UI is minimal: count, stage, judgment, sound/motion and Reset. Existing museum placards move into optional field notes. Mobile landscape puts speech and pedestal side by side. Calm mode removes movement, uses sparse stationary confetti and retains readable event cues. No sharp flashes or full-screen blockers.

Events: ten requested surprises plus original museum gags, all centrally configured. One room event at a time, brief durations and monotonic simulation-time cooldowns. Presses still register during events. A new accepted press cancels old delayed judgment follow-ups. Milestones10/25/50/100 celebrate; an undiscovered Golden Button is guaranteed by50 to avoid grinding. Confetti max320 pooled objects, reduced mode max36. Golden/rare judgments trigger confetti and discoveries. Temporary effects are never loaded from saves.

Storage: new isolated key forge.judgment-chamber.v1 (original has no progress to migrate). Save count, achievement IDs, employee ID, sound/effects preferences and seeded RNG state. Validate loaded data; corrupt/blocked storage never breaks interaction or overwrites invalid data silently. Reset asks confirmation before clearing statistics and discoveries; Cancel changes nothing. Reset removes transient effects and applies explicit fresh defaults while keeping audio/motion preferences.

- [x] Baseline full tests and screenshots; inspect all original source and preserve fixture.
- [x] RED/GREEN content/controller tests: thresholds, first/decoy press, no duplicate acceptance, nonrepeating seeded judgments, weighted events/cooldowns, golden/milestones, achievements, delayed-message cancellation, storage/reset/hidden-state behavior.
- [x] Confetti pooling/reduced-motion/cleanup tests; at least1000 simulated accepted presses with valid counts, bounded particles and usable button.
- [x] Implement room, button, menu, readable judgments, legacy field notes/decoy, safe events, optional audio, persistence and confirmed reset.
- [x] Browser desktop/tablet/portrait/landscape: entry, mouse/keyboard/touch, seeded rare/event fixtures, confetti, discoveries, reload/save, reset confirm/cancel, visibility, touch target bounds, screenshots and performance measurements.
- [x] Independent review, full regression/build, updated card visual inside game only, exact verification report and limitations. Do not deploy.

Review focus: keyboard repeat/native-click duplication, stale delayed messages after new press/reset, event cleanup while rapid pressing, visibility/audio pause, resize during button escape, fake-button hit areas, blocked/corrupt storage, reset confirmation, mobile speech/pedestal overlap, pool capacity and long-session stability.
