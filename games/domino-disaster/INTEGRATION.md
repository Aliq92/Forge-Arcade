# Domino Disaster · Forge Arcade integration

The native game is registered once as Games / Featured, with Puzzle / Physics metadata and keyboard/touch support. Root domino-disaster-register.js loads before game-summaries.js. The relative native route is games/domino-disaster/index.html, and the game returns to ../../index.html.

The gallery uses the existing cardHTML/featuredCardHTML functions, shared16:9 picture frames and aligned flex card bodies. The lossless960×540pixel WebP and640×360SVG fallback are byte-identical copies of the game's prepared assets. Both thumbnail sets and artwork/card-prompts.json include the new ID. No custom card CSS or changes to other game artwork were introduced.

There are40 registered experiences /39 visible entries. ELEMENTAL remains hidden behind its existing chemistry flask. Shared gallery filters and existing navigation are preserved.

## Local validation ·14 November2026

- 362 combined automated tests passed,0 failures, covering root game/gallery checks plus Domino Disaster, Lumenworks and Neon Forge suites. Unrelated unfinished Hollow Signal files were excluded.
- Existing gallery browser regression passed desktop/tablet/phone filters and pixel-image decoding, keyboard navigation, reduced motion, Echo Tide and Last Lighthouse gameplay/return flows.
- Dedicated Domino gallery checks passed6 viewports:1440×1000,1024×768,768×1024,390×844,375×667 and844×390. All5 filters, native archive/featured links, no overflow, existing Play-label alignment, correct pixel WebP decoding and Arcade return were verified. No page errors.
- The full game browser check exercises all12 puzzles through real UI controls,3stars per puzzle, saved progression, failure/retry, replay and mobile touch placement/drag/rotate/delete/pinch. See QA.md for standalone performance and limitations.

## Publication

Integration and publication are authorized by the user's14 November2026 request. Publish the reviewed tracked tree to main with an expected-head check, then verify the Pages run, public assets and gallery/game browser flows. No deployment settings need modification. This document describes the validated publication candidate; the final user reply reports observed live-site completion.
