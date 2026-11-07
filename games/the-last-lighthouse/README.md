# The Last Lighthouse

One light. Twelve lives to guide home.

Guide fishing boats, sailing vessels, and cargo ships toward the harbor. Your beam helps illuminated vessels correct their heading; its limited energy makes deliberate sweeps and recharge breaks essential. Rescue **12 ships** to win. Lose **3 ships** to reefs, rocks, or the ocean boundary and the watch ends.

## Play

Open `games/the-last-lighthouse/index.html` in a modern browser. All runtime scripts, styling, and artwork are local, with no external dependencies or account. A static server also works: from the repository root run `python -m http.server 8000`, then open `http://localhost:8000/games/the-last-lighthouse/`.

For a persistent private preview, run `node tests/the-last-lighthouse-preview.cjs` and open `http://127.0.0.1:8428/games/the-last-lighthouse/`. This serves only on your computer. It does not publish the game or replace the separate Hollow Signal preview.

| Action | Desktop | Touch |
| --- | --- | --- |
| Rotate counterclockwise | A / Left Arrow | Drag to aim |
| Rotate clockwise | D / Right Arrow | Drag to aim |
| Aim directly | Drag on the ocean | Drag on the ocean |
| Toggle beam | Space / beam button | Large beam button |
| Pause / resume | P / Escape / pause controls | Pause / resume buttons |
| Restart | R / restart option | Restart option |

When energy is exhausted the beam switches off. At least 18 units must recover before the lamp unlocks; it stays off until you choose to relight it. Ships retain some guidance after the light moves away. Watch the warning indicators, energy meter, and storm intensity; choose the ship that needs your attention most urgently. A lit beam drains 8 units per second; a resting lamp recovers 14. The 38-degree cone turns at up to 115 degrees per second, including when you drag to a new bearing.

The view stays fixed and scales for portrait or landscape. Important information has symbols and text as well as color, and decorative motion respects reduced-motion preferences. Sound is optional; enable it with the sound toggle. It creates quiet procedural sea, wind, machinery, and event cues after interaction. Pause suspends ambience as well as gameplay.

## Local settings and structure

The UI stores the sound preference under `forge-arcade:the-last-lighthouse:v1`, with guarded access so blocked storage does not prevent play. Runs do not require saved progress. Restart begins the same seeded simulation again; the simulation is separate from drawing and audio.

Runtime files: `index.html`, `style.css`, `game.js`, `simulation.js`, `rendering.js`, `audio.js`, and `thumbnail.svg`. Classic scripts support direct file opening and static hosting. Downloaded local files work without network access; the initial visit to a hosted URL still needs access to its host.

The design target is an 8–12 minute successful watch. Automated keeper strategies have been timed in simulation; human completion time remains unmeasured. Consult `VERIFICATION.md` for balance evidence and practical limits.

## Developer checks

From the repository root:

```text
node --test tests/the-last-lighthouse-*.test.mjs
node tests/the-last-lighthouse-balance.cjs
node tests/the-last-lighthouse-browser.cjs
```

Use the shell's glob expansion where needed, or pass the matching test paths explicitly. The balance harness demonstrates a deterministic winning strategy and checks the energy budget. The browser harness serves local files and requires the configured Playwright/Chrome test environment; player files have no such dependency. Executed results are recorded in `VERIFICATION.md`.

Central gameplay tuning lives in `simulation.js` under `CONFIG`, `SHIP_TYPES`, and `WORLD`. Simulation uses fixed 1/60-second steps and seeded generation. Pause freezes all gameplay, including spawn clocks and energy; restart restores the original seed. The renderer reads simulation state, caches its chart, and keeps effects bounded. The UI owns one recurring animation loop and pauses the watch when hidden or unfocused.

`audio.js` exposes `LastLighthouseAudio.Audio`. Constructing it creates no audio context. The UI calls `wake()` only following a user gesture, `sleep()` when pausing or backgrounding, and `dispose()` for cleanup. `setIntensity(storm, beamOn)` accepts a storm value from zero to one and updates existing ambient nodes. Every important sound must also have visual feedback.

The arcade registers this game in **Games** and **Featured**, using the root `the-last-lighthouse-register.js` and its pixel-art thumbnail. The `arcade-registration.js` inside this folder is an unused reference copy. `INTEGRATION.md` records the integration and publication checks. This integration is included in the approved public release.
