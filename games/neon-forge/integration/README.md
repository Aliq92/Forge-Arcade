# Active Forge Arcade integration

The user requested integration after approving the continuous Endless and colour-burst update. Root `neon-forge-register.js` is loaded after `app.js` and before `game-summaries.js`. This nested registration is a reference copy, not a second loaded entry.

The gallery uses `assets/thumbnails/pixel/neon-forge.webp` (lossless960×540) with `assets/thumbnails/neon-forge.svg` (640×360 frame) fallback. They are copies of this game's prepared card assets, and both thumbnail sets/manifest include the new ID. Shared picture elements,16:9 frames, padding, typography and aligned card bodies are unchanged. No game-specific stylesheet or custom card sizing is used.

There are39 registered entries /38 visible entries; ELEMENTAL remains hidden behind its footer flask. Native links open `games/neon-forge/index.html` at the GitHub Pages project path and Arcade return is relative. No new route, iframe, framework or deployment setting is needed.

The current game starts one unlocked Endless run, automatically rises through levels, offers upgrades every3 and recurring bosses every10. It does not expose the original campaign or unlock gate. See ../INTEGRATION.md for validation and publication evidence.
