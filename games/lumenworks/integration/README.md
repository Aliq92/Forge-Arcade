# Arcade integration reference

The user approved integration after the standalone build and thirteen-district expansion. The active registration is `/lumenworks-register.js`, loaded before `game-summaries.js` in root `index.html`.

The root `card-thumbnails.js` selects `/assets/thumbnails/pixel/lumenworks.webp` with `/assets/thumbnails/lumenworks.svg` fallback. This uses the same picture element, 16:9 image frame, typography, spacing and navigation as the other games. The prepared one-off `lumenworks-card.css` is deliberately unused: it would bypass the established shared pixel-art pipeline.

The shared gallery stylesheet lets card bodies fill their grid rows so Play links align. Visible counts exclude hidden ELEMENTAL; its footer flask remains available. No runtime framework, iframe, new route or deployment setting was added. See ../INTEGRATION.md for validation and limits.
