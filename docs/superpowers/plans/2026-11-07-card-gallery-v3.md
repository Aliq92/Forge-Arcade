# Card Gallery V3 Implementation Plan

**Goal:** Illustrate all 35 active experiences and verify the public gallery.
**Architecture:** Local SVG images inside existing decorative card art; additive stylesheet after V2. No game runtime changes.
**Tech Stack:** Static HTML, CSS, JavaScript, SVG, Node tests and Playwright.
**Spec:** ../specs/2026-11-07-card-gallery-v3-design.md

## Constraints and review focus
Preserve V2 card styles, all registrations and navigation. Cover archive and featured cards, repeated filtering, narrow screens, reduced motion, asset loading and relative GitHub Pages paths. Unknown future games retain the existing fallback artwork.

## Tasks
- [x] Add a failing integration check for unique local illustrations on every registered card.
- [x] Create gameplay-specific SVG scenes and a small thumbnail manifest; integrate in both card templates and add scoped image styling.
- [x] Run gallery tests, existing integration suite and static build. Exercise desktop/mobile filters, keyboard navigation, links, game boot and reduced motion in Chromium; inspect screenshots.
- [ ] Review diff, commit and publish to existing main branch. Wait for Pages deployment and repeat public gallery/asset checks.

## Verification record
132/132 Node tests passed; static build passed. Browser checks passed at 1440, 768, 390 and 320px: all filters, thumbnail decoding, no text overlap or horizontal document overflow, keyboard tabs, reduced motion and all 35 game entry links. Echo Tide desktop movement and sonar, mobile sonar, pause/resume and return navigation passed. Screenshots inspected for desktop, mobile and every thumbnail. Original game sources and V2 stylesheet unchanged.

Review found no actionable issues. Mobile image/text overlap was reproduced by a failing browser assertion and corrected by stacking illustrated cards on narrow screens. All SVGs total 137,833 bytes before compression. Windows checkout line endings were normalized for the existing byte-hash test; no game content changes are included.
