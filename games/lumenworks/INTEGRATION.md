# Forge Arcade integration — Lumenworks

The user approved integration and requested pixel-art cards aligned with the other games. This supersedes the original standalone brief's publication boundary for this integration.

The native Games and Featured cards open the complete thirteen-district game and Sandbox. The Hint button identifies exact FROM/TO connections and control steps. Existing eight-district saves retain their stars and unlock the expansion. Arcade return uses the existing relative native link.

## Artwork and alignment

- Built-in image generation produced a new detailed pixel-art city cover: warm windows, cyan generator/substation cables, reserve battery, market, civic hall and tram. Prompt direction is recorded in `artwork/card-prompts.json`; no text or UI is baked into the illustration.
- Final asset: `assets/thumbnails/pixel/lumenworks.webp`, lossless 960×540, 325,048 bytes. Prepared on the same 480×270 pixel grid and nearest-neighbour 2× normalization as the other cards. The original game-local SVG remains unchanged; the gallery has its own correctly framed 640×360 SVG fallback.
- Both thumbnail manifests use the shared picture markup. There is no special Lumenworks card size, margin, font or layout override.
- The shared `.card-body, .f-card-body` rule fills stretched grid cells, aligning same-row Play links; image frames do not shrink. Padding, artwork ratio, body top, card bottom and typography match neighboring cards.
- Cache versions for the thumbnail registry and changed gallery stylesheet were advanced. The original 37 illustrations remain unchanged. Registration/count tests now cover 38 total / 37 visible entries; ELEMENTAL remains hidden behind its flask.

## Verification

250 combined automated checks passed, including all thirteen three-star solutions and hint tests. All38 artwork assets pass lossless format, dimensions, distinctness, SVG fallback and manifest/registry consistency checks.

Local browser results:

- Full gallery: all five filters at1440×1000,768×1024,390×844 and320×740; all thumbnails decode, all37 visible game links respond, no overflow/runtime errors, Echo Tide/Lighthouse launch and return preserved.
- Lumenworks-specific alignment at1440×1000,1024×768,768×1024,390×844,320×740 and844×390: shared width/style, 16:9 art, matching same-row art/body/card/Play positions; Games/Featured/All filters; launch from archive and Featured; actual Hint interaction; native return. No page errors.
- ELEMENTAL remains absent from all five filters at1440/390/320, and its footer flask launches and returns successfully.
- Independent review found no actionable integration defects. Screenshots inspected at desktop and phone sizes. Physical mobile devices and non-Chrome browsers remain untested.

Reproduce with `node --test tests/*.test.mjs games/lumenworks/tests/*.test.mjs`, `node tests/lumenworks-gallery.browser.cjs`, and the existing gallery/secret-lab browser scripts. Set `FORGE_URL` to test a public GitHub Pages project URL. Reports and screenshots are in ignored `test-results/lumenworks/` and `test-results/`.

The existing static build is used. Publication uses the current main as its parent and a lease on that exact head, excluding unrelated local work. After deployment, verify the public asset, both cards, game/hint/return, gallery layout, and Pages run before reporting live success.
