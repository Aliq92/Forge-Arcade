# Forge Arcade integration

The Last Lighthouse is integrated into Forge Arcade as the 36th experience, under **Games** and **Featured**. `the-last-lighthouse-register.js` at the repository root is loaded once before summaries; the gallery uses `assets/thumbnails/pixel/the-last-lighthouse.webp` with `assets/thumbnails/the-last-lighthouse.svg` as fallback. The game still launches as its native standalone page. Existing games, links, gallery styling and filters are preserved. Hollow Signal remains separately prepared and unregistered.

The user approved publishing this integration to Forge Arcade. The registration inside this game folder remains an unused reference copy. Archive and Featured cards select the new detailed pixel-art scene, with the original SVG retained as fallback.

## Integration procedure and publication checks

1. Validate standalone gameplay, deterministic winning strategies, energy balance, keyboard/mouse/touch controls, pause/restart, blocked settings storage, direct-file loading, and responsive layouts. Record actual results.
2. Copy `games/the-last-lighthouse/arcade-registration.js` to the repository root as `the-last-lighthouse-register.js`. It follows the current classic `GAMES.push(...)` and count/featured/filter refresh convention; do not load it from the standalone game.
3. Add `<script src="the-last-lighthouse-register.js"></script>` to the root `index.html`, after `app.js` and existing registration scripts, before `game-summaries.js`. Preserve all other scripts. The id resolves through existing card rendering to the relative URL `games/the-last-lighthouse/index.html`.
4. Copy `games/the-last-lighthouse/thumbnail.svg` to `assets/thumbnails/the-last-lighthouse.svg`. Add only `'the-last-lighthouse'` to `CARD_THUMBNAILS` in `card-thumbnails.js`, retaining all existing entries and gallery styling.
5. Count the active registry immediately before integration. The inspected gallery baseline was 35; Hollow Signal is separately prepared and may change that baseline if approved first. Add exactly one active game and one distinct thumbnail for this integration. Update explicit expected counts in `tests/card-gallery-v3.test.mjs` and `tests/card-gallery-browser.cjs` to the actual baseline plus one; preserve coverage and uniqueness checks.
6. Run the standalone checks from `README.md`, then `node --test tests/card-gallery-v3.test.mjs` and `node tests/card-gallery-browser.cjs`. Confirm counts agree, every old card and destination still works, the lighthouse thumbnail decodes in archive and featured views, filters work, and mobile pages have no horizontal document overflow.
7. Review the final change, publish the approved release, and verify the public gallery and native game return link.

The original SVG has a `0 0 640 360` viewBox and contains only local vector artwork. The registration marks the game as a featured member of **Games**, with keyboard and touch support and no persistent run-save requirement.
