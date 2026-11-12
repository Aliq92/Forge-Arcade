# Neon Forge complete build plan

Spec: BRIEF.md. Binding implementation contract: API.md. Work on codex/neon-forge from published mainc66aa9d, preserve unrelated dirty files. Explicit vanilla Canvas2D and fixed simulation; standalone game only, no publication or live registry edit.

Visual direction: dark industrial circular chamber, cyan centered robot and luminous attack wedge, four strong geometric threat silhouettes, violet/pink/orange accents; performance unlocks increasingly elaborate background rings. Compact DOM edgeHUD and dialogs protect arena; broad touch Strike control. No mockup image supplied.

- [x] Deterministic combat, four targettypes, shield/combo/perfect scoring, boss and state machine, adversarial/seeded playability tests.
- [x] Ten paced authored wave schedules, capped fair Endless generator, six bounded functional upgrades, systematic combination tests.
- [x] Pure reactive arena renderer, pooled effects, projection/input geometry, bounded quality/reducedmotion and local thumbnail.
- [x] Root UI/input/audio/storage: fullmenu, wave summaries, upgrade cards, gameover/retry, victory/Endless records, native desktop/touch and keyboard.
- [x] Integration QA: all10waves/boss/victory/Endless inbrowser, damage/failure/restart/pause/menus, native touchportrait/landscape/resize, saves/settings/errors.
- [x] Independent reviews, measured high-intensity/boss/Endless performance, screenshots, README and prepared registration, final local commit. No deploy.

Coordination: coreagent owns game.js/player.js/targets.js/combat+boss tests. Contentagent owns waves.js/upgrades.js/content tests. Rendereragent owns renderer.js/assets/renderer tests. Root owns API/plan, allotherfiles and integration. Agents do not edit another domain, branch, stage, commit or publish. Shared API exact names settle boundaries; record adjustments here.

Ruling: boss begins atperimeter but telegraphs an in-range exposed core — a shortrange strike must actually reach it. Bosswindows caphits toensurephaseprogression. Splinterchildren spawn outward toallowfreshreaction; secondaryeffects never recursivelyspawnattacks. Fairtimeline and cooldown are validated by actual no-bypass policy runs, not visual inspection. Hysteresis uses best-combo stageunlocks so minorcombofluctuations neverflicker arena stages. Six upgradecaps plusclearlydescribed maintenance choices keep indefiniteEndless offeringsvalid.

Final ledger:54 game tests,304 combined tests; all10waves/boss/victory and3Endlesswaves completed inbrowser withnormalGameAPIs/realUI, native desktopPerfect/keyboardrotation/holdguard andtouch390/320/844 verified. Review defects fixed: childcap, terminalguard, chainbudget, maintenance reward, victoryclock andEnterautorepeat. Six stage5performancecases passed; results/limits inVERIFICATION.md andPERFORMANCE.json. Pixel-art960×540 card and640×360 SVGfallbackprepared; no sharedArcadewiringorpublication.

Milestone ruling: use explicit upgrade schedule3/5/7/9 from Phase6; this takes precedence over the earlier wave5-first-milestone narrative line. No milestone is skipped.
