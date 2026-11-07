# Comet Shepherd — gem-route upgrade

Local preview: http://127.0.0.1:8428/games/comet-shepherd/

The existing native Canvas game now has an eight-gem objective per sector, exact 10/30/50 gem values, immediate pickup feedback and a completion choice. Continue to the existing upgrade selection, or explore and leave through the unlocked gate. The chicken retains its helmet, roaming movement, flap animation and confetti; it awards an optional +150 and returns after 18 seconds. It is never required for progression.

Controls: drag anywhere to preview an affordable correction, release to apply it. Arrows or W/A/D nudge; S/B brakes; Space bursts in the last deliberate aim direction; E toggles the forecast; C toggles cinematic HUD mode; Escape pauses. Touch screens have holdable direction/brake controls and immediate Preview/Burst buttons. Pause offers Retry Sector, restoring the entry checkpoint while retaining earlier-sector earnings and upgrades.

The first lane is intentionally forgiving: coast through the cyan/amber teaching route while watching the forecast. Later lanes increase tangential entry speed and amber offsets. Violet triangles offer optional precision challenges. All essential gems lie outside moving planet/moon/asteroid envelopes. Existing inner-system resources, gravity-assist rewards, flares, heat, camera, upgrades, seeded challenges, settings, best-run record, milestone and arcade return link remain.

Physics: softened Newtonian vector gravity, shared velocity-Verlet flight at 1/120 s, fixed orbital movement/cooldowns/collection, and swept collision tests. A frame can contribute at most 0.05 seconds. Prediction clones dynamic bodies and uses the same flight step, current held controls, affordable pending impulse, energy/cooldown rules and collision grace. It covers at most 12 seconds / 1,440 steps; graphics settings change horizon rather than physics accuracy. Red markers end the forecast at the first predicted collision. Input changes after the forecast naturally change the resulting path.

Run simulation/regression checks from the repository root:

```
node --test tests/*.test.mjs games/comet-shepherd/tests/*.test.mjs
```

Browser checks require the configured Playwright/Chrome environment and a local static server on port 8428:

```
node games/comet-shepherd/tests/browser.cjs
```

See VERIFICATION.md for actual results and limitations. This upgrade is included in the user-approved Forge Arcade release. The browser suite can verify the public arcade by setting FORGE_ARCADE_URL to https://aliq92.github.io/Forge-Arcade/.
