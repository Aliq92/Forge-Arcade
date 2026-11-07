# Forge Arcade card artwork

The selected collection style is **detailed professional pixel art**. `card-prompts.json` contains 36 self-contained generation prompts, ordered exactly like the current active registry: the base entries in `app.js`, followed by registrations actually loaded by the root `index.html`. The Last Lighthouse is included; the separately prepared Hollow Signal is not active and is excluded.

Each prompt preserves the game's central action and its own accent palette. Shared direction: crisp hand-placed pixel clusters, hard edges, approximately 48 carefully selected colors per scene, layered parallax depth, atmospheric pixel lighting and dithering. Images should resemble 480×270 artwork scaled cleanly, with no antialiasing, smooth 3D, photographic rendering, text, logos, UI, borders, or watermarks. Subjects and essential action stay within the central 80% for responsive cropping.

All 36 scenes were generated with the integrated image generator and installed under `assets/thumbnails/pixel/`. Each local PNG source was resized with nearest-neighbor sampling to 480×270, enlarged exactly 2×, and encoded as lossless 960×540 WebP. The archive, Featured cards, and ant-colony spotlight now use this collection locally. Original SVG artwork remains available as fallback.

To reinstall available source records, run `node tests/install-pixel-card-art.cjs --require-all`. Source records and the installation report are kept in the ignored `test-results/card-art/` folder. Original generated PNG files remain in the generator's local output folder. The unused cinematic trial is retained only as an ignored draft.

Validation completed: all **176 Node tests passed**, the static build passed, and desktop/mobile browser checks passed at 1440, 768, 390, and 320 pixels. All 36 artwork files decoded at 960×540; all five category filters, keyboard navigation, reduced motion, game links, and Lighthouse launch/return from archive and Featured cards passed. No page errors or horizontal overflow were recorded. Gallery screenshots and the complete artwork contact sheet were reviewed. Browser evidence: `test-results/browser-report.json` and `test-results/thumbnail-contact-sheet.png`.

This collection is included in the approved Forge Arcade release alongside The Last Lighthouse. Deployment is verified against the public gallery after publication.
