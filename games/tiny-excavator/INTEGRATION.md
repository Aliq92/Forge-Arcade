# Treasure Beneath — Arcade integration

The user authorized integration and publication on 12 November 2026, after standalone commit `077be9a`. This supersedes the development-only status recorded in VERIFICATION.md.

The existing Tiny Excavator entry remains one of 37 Arcade experiences, in Games and Featured. Its description now introduces nine minerals and the journal; the registration URL is versioned for the update. The prepared illustration is wired as the SVG fallback, while the user's existing pixel-art WebP stays the primary gallery artwork. Links retain the native game document and pause-menu return to Arcade. No other game or deployment setting changes.

Verification before publication:

- 405 automated tests passed, including legacy-save and original-gameplay comparisons, plus the 500-seed mineral audit.
- Five real-Chrome desktop and emulated-touch layouts passed the full gameplay suite with no browser errors.
- The integration browser check passed archive/featured entry points, All/Games/Featured filters, pixel artwork, new expedition, journal, saved continuation and return navigation at 1440×900 and 390×844. No page errors or homepage overflow.
- `node build.mjs` passed.

Run `node games/tiny-excavator/tests/integration.cjs` against the local preview on port 8428. Set `FORGE_URL=https://aliq92.github.io/Forge-Arcade/` to repeat against the public site. Reports and screenshots are written to the ignored `test-results/tiny-excavator/` directory.

Phone coverage is browser emulation; physical-device performance is not established. See VERIFICATION.md for detailed mechanics and test limits.
