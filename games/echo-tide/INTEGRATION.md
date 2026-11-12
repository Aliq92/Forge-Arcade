# Deepwater Surge — Arcade integration

The user explicitly authorized integration/publication after standalone commit `d7f4268`. This supersedes the development-only status in VERIFICATION.md, README.md and UPGRADE-PLAN.md.

Echo Tide retains its existing Games/Featured entry and pixel-art thumbnail. Its description now introduces burst propulsion; the registration URL is versioned. Space remains sonar, Shift/B is burst, and native touch buttons, pause/restart and Arcade return remain inside the original game document. ELEMENTAL stays hidden behind the footer flask. No other game's runtime or shared card implementation changes.

Prepublication checks passed:430 regression tests, the native desktop/mobile launcher checks, the existing launcher/production-build browser runner, full gallery filters/navigation and the static build. After deployment, verify live runtime content against the committed source and run both launcher and five-layout gameplay checks on the public site.

`node games/echo-tide/tests/integration.cjs` tests the local preview on port8428. `FORGE_URL=https://aliq92.github.io/Forge-Arcade/` targets the public site; the game's `tests/browser.cjs` accepts the same variable. Reports and screenshots are retained under ignored `test-results/echo-tide/`. Detailed standalone evidence and hardware limits are in VERIFICATION.md.
