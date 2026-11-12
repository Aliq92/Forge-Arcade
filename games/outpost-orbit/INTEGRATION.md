# Frontier Station — Arcade integration

The user authorized integration and publication after standalone commit `32799e6`. This supersedes the development-only status in VERIFICATION.md and UPGRADE-PLAN.md.

The existing Outpost Orbit entry remains in Simulations and Featured. Its description now introduces the nine-mission campaign and upgrades; the registration URL is versioned. The prepared station illustration is wired as the SVG fallback; the existing pixel-art WebP remains primary. Native launch, same-origin save key, pause/settings and Arcade return are preserved. ELEMENTAL remains hidden behind its footer flask.

Before publication: rerun the automated suite, the launcher integration browser check and static build. After GitHub Pages deploys, repeat the launcher and full five-layout gameplay browser checks against the public site and compare delivered runtime files with the committed source.

Run `node games/outpost-orbit/tests/integration.cjs` on the local preview at port8428. Set `FORGE_URL=https://aliq92.github.io/Forge-Arcade/` for public checks; the same variable is supported by `tests/browser.cjs` in this game. Reports/screenshots are saved under the ignored `test-results/outpost-orbit/` directory. See VERIFICATION.md for mechanics, original test coverage and physical-device limits.
