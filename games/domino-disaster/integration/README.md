# Active Forge Arcade integration

Integration was explicitly authorized on14 November2026. Root domino-disaster-register.js is now loaded after neon-forge-register.js and before game-summaries.js. This nested registration and integration.patch preserve the original preparation; do not load/apply them a second time.

The inspected registry uses `GAMES.push`, `category:'Games'` and `featured:true`; the visible counts filter hidden entries. The prepared `domino-disaster-register.js` follows `neon-forge-register.js`. The shared thumbnail function uses `CARD_THUMBNAILS` and `PIXEL_CARD_IDS`, a 16:9 picture and existing aligned card body layout.

Applied integration:

1. Copy this registration file to root `domino-disaster-register.js`; load it in root index.html immediately after neon-forge-register.js and before game-summaries.js.
2. Add `'domino-disaster'` to both sets in root card-thumbnails.js.
3. Copy `../assets/card.svg` to root assets/thumbnails/domino-disaster.svg and `../assets/card.webp` to assets/thumbnails/pixel/domino-disaster.webp. The fallback is640×360 and the lossless pixel image960×540. No custom card CSS is needed.
4. Update the existing pixel artwork manifest/report if required by the gallery checks. Preserve all other entries and ELEMENTAL's hidden flask access.
5. Run game tests, gallery integrity/browser tests and Games/Featured/filter/alignment checks. Confirm exactly one new entry, relative navigation and desktop/mobile card alignment, then publish only with authorization.

The text-only `integration.patch` records the original registry/index/thumbnail changes. Artwork copying includes a binary WebP. The active gallery has40 registered /39 visible entries, with ELEMENTAL still hidden. Runtime assets are all local; no additional dependencies, custom card sizing or deployment settings are needed. See ../INTEGRATION.md for executed integration checks.
